
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.json({ service: 'Terrava API', status: 'ok' }));
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

let initializationPromise;

const initialize = () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
    // Load database/models and route modules inside the startup guard. This
    // keeps Vercel's health endpoint available and turns startup failures into
    // useful runtime logs instead of a generic FUNCTION_INVOCATION_FAILED.
    const db = require('./models');
    const { start: startOverdueCron } = require('./jobs/overdueCron');

    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/listings', require('./routes/listings'));
    app.use('/api/inquiries', require('./routes/inquiries'));
    app.use('/api/transactions', require('./routes/transactions'));
    app.use('/api/favorites', require('./routes/favorites'));
    app.use('/api/admin', require('./routes/admin'));
    app.use('/api/blockchain', require('./routes/blockchain'));
    app.use('/api/notifications', require('./routes/notifications'));
    app.use('/api/installments', require('./routes/installments'));

    // Vercel runs this file inside short-lived serverless functions. Running
    // schema synchronization and column migrations during every cold start
    // can exceed the function window and make even health checks fail. Keep
    // migrations available for local development, and only opt into them on
    // Vercel explicitly after reviewing the database migration plan.
    const shouldRunMigrations = !process.env.VERCEL || process.env.RUN_DB_MIGRATIONS === 'true';

    if (!shouldRunMigrations) {
      console.log('Skipping database migrations in Vercel runtime');
    } else {
      await db.sequelize.sync();
      console.log('Database synced');

      // Manually add missing columns (safer than alter: true on SQLite)
      const tableInfo = await db.sequelize.getQueryInterface().describeTable('users');
      const columnsToAdd = [
        ['branch', { type: db.Sequelize.STRING(100), allowNull: true }],
        ['occupation', { type: db.Sequelize.STRING(150), allowNull: true }],
        ['spouse_first_name', { type: db.Sequelize.STRING(100), allowNull: true }],
        ['spouse_middle_name', { type: db.Sequelize.STRING(100), allowNull: true }],
        ['spouse_last_name', { type: db.Sequelize.STRING(100), allowNull: true }],
        ['spouse_extension_name', { type: db.Sequelize.STRING(20), allowNull: true }],
        ['spouse_email', { type: db.Sequelize.STRING(255), allowNull: true }],
        ['spouse_phone', { type: db.Sequelize.STRING(50), allowNull: true }],
        ['spouse_occupation', { type: db.Sequelize.STRING(150), allowNull: true }],
        ['photo_url', { type: db.Sequelize.STRING(255), allowNull: true }],
        ['archived', { type: db.Sequelize.BOOLEAN, allowNull: false, defaultValue: false }]
      ];
      for (const [column, options] of columnsToAdd) {
        if (!tableInfo[column]) {
          await db.sequelize.getQueryInterface().addColumn('users', column, options);
          console.log(`Added ${column} column to users table`);
        }
      }

      // Manually add missing columns to land_listings for the expanded listing form
      const listingTableInfo = await db.sequelize.getQueryInterface().describeTable('land_listings');
      const listingColumnsToAdd = [
        ['zoning_classification', { type: db.Sequelize.STRING(100), allowNull: true }],
        ['land_title_status', { type: db.Sequelize.STRING(100), allowNull: true }],
        ['total_contract_price', { type: db.Sequelize.DECIMAL(18, 2), allowNull: true }],
        ['reservation_fee', { type: db.Sequelize.DECIMAL(18, 2), allowNull: true }],
        ['minimum_down_payment_pct', { type: db.Sequelize.STRING(10), allowNull: true }],
        ['cash_term_enabled', { type: db.Sequelize.BOOLEAN, defaultValue: false }],
        ['cash_term_discount_pct', { type: db.Sequelize.DECIMAL(5, 2), allowNull: true }],
        ['in_house_financing_enabled', { type: db.Sequelize.BOOLEAN, defaultValue: false }],
        ['in_house_max_term_years', { type: db.Sequelize.INTEGER, allowNull: true }],
        ['in_house_interest_rate_pct', { type: db.Sequelize.DECIMAL(5, 2), allowNull: true }],
        ['bank_government_loan_enabled', { type: db.Sequelize.BOOLEAN, defaultValue: false }],
        ['penalty_rate_pct', { type: db.Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 5.00 }],
        ['monthly_payment_amount', { type: db.Sequelize.DECIMAL(18, 2), allowNull: true }],
        ['terrain_topography', { type: db.Sequelize.STRING(100), allowNull: true }],
        ['lot_configuration', { type: db.Sequelize.STRING(100), allowNull: true }],
        ['utilities', { type: db.Sequelize.JSONB, defaultValue: {} }],
        ['lot_block_number', { type: db.Sequelize.STRING(100), allowNull: true }],
        ['photo_geotags', { type: db.Sequelize.JSONB, defaultValue: [] }],
        ['archived', { type: db.Sequelize.BOOLEAN, allowNull: false, defaultValue: false }]
      ];
      for (const [column, options] of listingColumnsToAdd) {
        if (!listingTableInfo[column]) {
          await db.sequelize.getQueryInterface().addColumn('land_listings', column, options);
          console.log(`Added ${column} column to land_listings table`);
        }
      }

      // Add transaction_data column to blocks if missing (blockchain snapshot fix)
      const blockTableInfo = await db.sequelize.getQueryInterface().describeTable('blocks');
      if (!blockTableInfo.transaction_data) {
        await db.sequelize.getQueryInterface().addColumn('blocks', 'transaction_data', {
          type: db.Sequelize.TEXT,
          allowNull: true
        });
        console.log('Added transaction_data column to blocks table');
      }

      // Ensure the default demo seller is assigned to Main Tagum branch
      const demoSeller = await db.User.findOne({ where: { email: 'seller@terra.com', role: 'seller' } });
      if (demoSeller && !demoSeller.branch) {
        await demoSeller.update({ branch: 'Main Tagum' });
        console.log('Assigned demo seller to Main Tagum branch');
      }
    }

    // Vercel invokes the exported Express app as a serverless function and
    // must not keep a persistent listener open. Local development still uses
    // the normal `npm start` listener.
      if (!process.env.VERCEL) {
        app.listen(PORT, () => {
          console.log(`Server running on http://localhost:${PORT}`);
          startOverdueCron();
        });
      }
    })();
  }

  return initializationPromise;
};

// Vercel can invoke the exported function before an async startup routine has
// finished. Await initialization at the request boundary so API routes are
// mounted before login and other requests are handled.
if (process.env.VERCEL) {
  module.exports = async (req, res) => {
    try {
      await initialize();
      return app(req, res);
    } catch (error) {
      console.error('Unable to initialize server:', error);
      return res.status(503).json({ error: 'Terrava backend initialization failed' });
    }
  };
} else {
  module.exports = app;
  initialize().catch((error) => {
    console.error('Unable to start server:', error);
    process.exitCode = 1;
  });
}

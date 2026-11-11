# Terrava deployment plan

This project is designed to run with the React/Vite client on Vercel, the
Express API on Render, and the existing Supabase PostgreSQL database.

## Render backend

Configure the Render service with:

- Root directory: `server`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/health`
- `NODE_ENV=production`
- `RUN_DB_MIGRATIONS=false`

Add the values from `server/.env.example` as Render environment variables.
Never commit `server/.env`, database passwords, service-role keys, TextBee
keys, SMTP passwords, or blockchain private keys.

Use the same Supabase `DATABASE_URL` as the current system. This preserves the
existing records; deploying the backend does not reset or migrate the data.

Set `FRONTEND_URL` to the production Vercel frontend URL. Set `CORS_ORIGINS`
to a comma-separated list only when additional preview URLs are needed.

Supabase Storage should be configured with a public `terrava-uploads` bucket
and the backend-only `SUPABASE_SERVICE_ROLE_KEY`. The backend now uses that
storage on both Render and Vercel when configured, while local development can
still use `server/uploads` when storage variables are absent.

## Vercel frontend

Keep the existing Vercel frontend project separate. Set:

```text
VITE_API_URL=https://<your-render-service>.onrender.com/api
```

Vite injects this value during the frontend build. Do not put any backend
secret, Supabase service-role key, database URL, Ethereum private key, or
TextBee key in a `VITE_` variable.

## Safe rollout

1. Deploy Render while the current Vercel setup remains active.
2. Test `/api/health`, login, registration/OTP, listings, photo upload,
   notifications, payments, GIS data, and blockchain endpoints.
3. Set the Vercel frontend `VITE_API_URL` to Render and redeploy the frontend.
4. Keep the previous Vercel deployment available until production testing is
   complete.

Do not enable automatic Sequelize schema synchronization or run seed scripts
in Render. Any schema change must be reviewed and run as a controlled,
backward-compatible maintenance step.

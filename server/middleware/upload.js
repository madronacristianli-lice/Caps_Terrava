const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Vercel's deployed filesystem is read-only except for /tmp. Keep the
// persistent local uploads directory for development, but use the writable
// temporary directory in serverless functions.
const uploadDir = process.env.VERCEL
  ? path.join('/tmp', 'terrava-uploads')
  : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

exports.upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

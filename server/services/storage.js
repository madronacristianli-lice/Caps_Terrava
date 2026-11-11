const fs = require('fs/promises');
const path = require('path');

const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'terrava-uploads';

const hasPersistentStorage = Boolean(supabaseUrl && serviceKey);

const localUploadUrl = (file) => `/uploads/${file.filename}`;
let bucketSetupPromise;

async function ensureBucket() {
  if (!bucketSetupPromise) {
    bucketSetupPromise = (async () => {
      const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: bucket, name: bucket, public: true })
      });

      // A 409 means another request already created it.
      if (!response.ok && response.status !== 409) {
        const details = await response.text();
        throw new Error(`Supabase Storage bucket setup failed (${response.status}): ${details.slice(0, 180)}`);
      }
    })();
  }
  return bucketSetupPromise;
}

async function uploadToPersistentStorage(file, folder) {
  await ensureBucket();
  const bytes = await fs.readFile(file.path);
  const safeName = path.basename(file.filename);
  const objectPath = `${folder}/${safeName}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': file.mimetype || 'application/octet-stream',
      'Cache-Control': '31536000',
      'x-upsert': 'true'
    },
    body: bytes
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase Storage upload failed (${response.status}): ${details.slice(0, 180)}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

async function persistUploadedFile(file, folder) {
  if (!file) return null;

  // Use Supabase Storage whenever it is configured. This is required for
  // serverless Vercel functions and for Render instances, where local files
  // are not a safe long-term source for listing/profile photos. Local
  // development remains unchanged when the storage variables are absent.
  if (hasPersistentStorage) return uploadToPersistentStorage(file, folder);
  return localUploadUrl(file);
}

async function persistUploadedFiles(files, folder) {
  if (!Array.isArray(files) || files.length === 0) return [];
  return Promise.all(files.map((file) => persistUploadedFile(file, folder)));
}

// Used by the one-time migration command for photos that were saved before
// Vercel uploads were moved to persistent storage.
async function uploadLocalFileToPersistentStorage(filePath, filename, mimetype, folder = 'listings') {
  if (!hasPersistentStorage) {
    throw new Error('Persistent photo storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY before migrating photos.');
  }
  return uploadToPersistentStorage({ path: filePath, filename, mimetype }, folder);
}

async function removeStoredFile(photoUrl) {
  if (!photoUrl || !hasPersistentStorage) return;
  const prefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
  if (!photoUrl.startsWith(prefix)) return;
  const objectPath = photoUrl.slice(prefix.length);
  await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  }).catch((error) => console.warn('Failed to delete stored photo:', error.message));
}

module.exports = {
  hasPersistentStorage,
  localUploadUrl,
  persistUploadedFile,
  persistUploadedFiles,
  uploadLocalFileToPersistentStorage,
  removeStoredFile
};

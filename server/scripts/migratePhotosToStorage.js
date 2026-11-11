require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs/promises');
const path = require('path');
const db = require('../models');
const { uploadLocalFileToPersistentStorage } = require('../services/storage');

const uploadDir = path.join(__dirname, '..', 'uploads');
const cache = new Map();

const isLegacyUpload = (value) => typeof value === 'string' && value.startsWith('/uploads/');

async function migratePhotoUrl(url, folder) {
  if (!isLegacyUpload(url)) return url;
  if (cache.has(url)) return cache.get(url);

  const filename = path.basename(decodeURIComponent(url));
  const filePath = path.join(uploadDir, filename);
  try {
    await fs.access(filePath);
  } catch {
    console.warn(`Skipped missing local photo: ${filename}`);
    return url;
  }

  const mimetype = filename.toLowerCase().endsWith('.png') ? 'image/png'
    : filename.toLowerCase().endsWith('.webp') ? 'image/webp'
      : 'image/jpeg';
  const migratedUrl = await uploadLocalFileToPersistentStorage(filePath, filename, mimetype, folder);
  cache.set(url, migratedUrl);
  return migratedUrl;
}

async function migrateListings() {
  const listings = await db.LandListing.findAll({ attributes: ['id', 'photos', 'photo_geotags'] });
  let changed = 0;

  for (const listing of listings) {
    const photos = Array.isArray(listing.photos) ? listing.photos : [];
    const geotags = Array.isArray(listing.photo_geotags) ? listing.photo_geotags : [];
    const migratedPhotos = await Promise.all(photos.map((url) => migratePhotoUrl(url, 'listings')));
    const migratedGeotags = await Promise.all(geotags.map(async (tag) => ({
      ...tag,
      url: await migratePhotoUrl(tag?.url, 'listings')
    })));

    if (JSON.stringify(migratedPhotos) !== JSON.stringify(photos)
      || JSON.stringify(migratedGeotags) !== JSON.stringify(geotags)) {
      await listing.update({ photos: migratedPhotos, photo_geotags: migratedGeotags });
      changed += 1;
    }
  }

  return { total: listings.length, changed };
}

async function migrateProfiles() {
  const users = await db.User.findAll({ attributes: ['id', 'photo_url'] });
  let changed = 0;

  for (const user of users) {
    if (!isLegacyUpload(user.photo_url)) continue;
    const migratedUrl = await migratePhotoUrl(user.photo_url, 'profiles');
    if (migratedUrl !== user.photo_url) {
      await user.update({ photo_url: migratedUrl });
      changed += 1;
    }
  }

  return { total: users.length, changed };
}

(async () => {
  try {
    const listings = await migrateListings();
    const profiles = await migrateProfiles();
    console.log(`Photo migration complete. Listings changed: ${listings.changed}/${listings.total}; profiles changed: ${profiles.changed}/${profiles.total}.`);
  } catch (error) {
    console.error(`Photo migration failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close().catch(() => {});
  }
})();

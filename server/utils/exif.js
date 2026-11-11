const exifr = require('exifr');
const path = require('path');

/**
 * Extract GPS coordinates from image EXIF metadata.
 * @param {string} filePath - Absolute path to the image file.
 * @returns {Promise<{lat: number, lng: number, source: string}|null>}
 */
async function extractGps(filePath) {
  try {
    const gps = await exifr.gps(filePath);
    if (
      gps &&
      typeof gps.latitude === 'number' &&
      typeof gps.longitude === 'number' &&
      Number.isFinite(gps.latitude) &&
      Number.isFinite(gps.longitude)
    ) {
      return { lat: gps.latitude, lng: gps.longitude, source: 'exif' };
    }
  } catch (err) {
    // EXIF may be missing or malformed; ignore silently.
    console.warn('EXIF GPS extraction failed:', err.message);
  }
  return null;
}

/**
 * Build photo geotag records from uploaded multer files.
 * @param {Array<import('multer').File>} files
 * @param {Array<string>} urls
 * @returns {Promise<Array<{url: string, lat: number, lng: number, source: string}>>}
 */
async function buildPhotoGeotags(files, urls = []) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const tags = [];
  for (const [index, file] of files.entries()) {
    const coords = await extractGps(file.path);
    if (coords) {
      tags.push({
        url: urls[index] || `/uploads/${file.filename}`,
        lat: coords.lat,
        lng: coords.lng,
        source: coords.source
      });
    }
  }
  return tags;
}

module.exports = { extractGps, buildPhotoGeotags };

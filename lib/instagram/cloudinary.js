'use strict';
const { v2: cloudinary } = require('cloudinary');

// The Graph API only accepts a public image_url, never a raw buffer, so the
// generated JPEG is uploaded to the Cloudinary account the covers already use,
// under its own instagram-posts/ folder.
const FOLDER = 'instagram-posts';

// Credentials are read per call so the feature follows the same "no redeploy
// needed" rule as the rest of the config (docs/instagram-autopost-spec.md, §3).
function configure() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('missing Cloudinary credentials');
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

function uploadImage(buffer, bookId) {
  configure();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, public_id: `book-${bookId}-${Date.now()}`, resource_type: 'image', format: 'jpg' },
      (error, result) => {
        if (error) {
          reject(new Error(error.message || 'Cloudinary upload failed'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadImage, FOLDER };

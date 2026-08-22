'use strict';
const fs = require('fs/promises');
const path = require('path');

// In dry-run the generated JPEG is written to ./tmp instead of being uploaded,
// so the result can be reviewed by eye without touching Cloudinary or Meta.
const PREVIEW_DIR = path.join(process.cwd(), 'tmp');

async function savePreview(buffer, bookId) {
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(PREVIEW_DIR, `ig-preview-${bookId}-${timestamp}.jpg`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

module.exports = { savePreview, PREVIEW_DIR };

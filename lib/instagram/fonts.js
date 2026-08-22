'use strict';
const fs = require('fs');
const path = require('path');
const { GlobalFonts } = require('@napi-rs/canvas');
const logger = require('./logger');

// Fonts are resolved once per process. Any .ttf/.otf dropped into assets/fonts/
// is registered and wins over the system fonts, so swapping in the brand faces
// later is a drop-in change with no code edit.
const FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');

// Generic, widely available faces: the brand fonts are not bundled yet, so the
// image falls back to whatever the host provides (macOS locally, DejaVu/
// Liberation on the Heroku stack).
const SERIF_PREFERENCE = ['Fraunces', 'Georgia', 'Times New Roman', 'DejaVu Serif', 'Liberation Serif', 'Noto Serif', 'serif'];
const SANS_PREFERENCE = ['Source Sans 3', 'Helvetica Neue', 'Helvetica', 'Arial', 'DejaVu Sans', 'Liberation Sans', 'Noto Sans', 'sans-serif'];

let resolved = null;

function registerBundledFonts() {
  if (!fs.existsSync(FONTS_DIR)) {
    return;
  }
  fs.readdirSync(FONTS_DIR)
    .filter((file) => /\.(ttf|otf)$/i.test(file))
    .forEach((file) => GlobalFonts.registerFromPath(path.join(FONTS_DIR, file)));
}

function pick(preference, available) {
  return preference.find((family) => available.has(family)) || preference[preference.length - 1];
}

function getFonts() {
  if (resolved) {
    return resolved;
  }
  registerBundledFonts();
  const available = new Set(GlobalFonts.families.map((font) => font.family));
  resolved = {
    serif: pick(SERIF_PREFERENCE, available),
    sans: pick(SANS_PREFERENCE, available),
  };
  logger.debug('fonts resolved', resolved);
  return resolved;
}

module.exports = { getFonts };

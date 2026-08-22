'use strict';

// Spanish display labels for the genre badge. Books store the 3-letter code
// (utils/constants/genres.js); the English `name` is accepted too because older
// documents were saved with it.
const LABELS = {
  ADV: 'aventura', BIO: 'biografía', CIF: 'ciencia ficción', CRI: 'crimen',
  ERO: 'erótica', FAN: 'fantasía', FCH: 'infantil', JUV: 'juvenil',
  HIF: 'ficción histórica', HUM: 'humor', POE: 'poesía', POL: 'policial',
  PSD: 'drama psicológico', ROM: 'romántica', SUS: 'suspense',
  TER: 'terror', THR: 'thriller',
};

const BY_NAME = {
  adventure: 'ADV', biography: 'BIO', cienceFiction: 'CIF', crime: 'CRI',
  erotica: 'ERO', fantasy: 'FAN', forChildren: 'FCH', juvenile: 'JUV',
  historicalFiction: 'HIF', humor: 'HUM', poetry: 'POE', policial: 'POL',
  psychologicalDrama: 'PSD', romantic: 'ROM', suspense: 'SUS',
  terror: 'TER', thriller: 'THR',
};

function genreLabel(genre) {
  if (!genre) {
    return '';
  }
  const code = LABELS[genre] ? genre : BY_NAME[genre];
  return LABELS[code] || String(genre);
}

module.exports = { genreLabel };

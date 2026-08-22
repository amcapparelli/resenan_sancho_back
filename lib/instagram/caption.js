'use strict';

const SYNOPSIS_MAX_LENGTH = 200;

// The stored format values come from the frontend form ('papel', 'epub'…).
// Only the ones that read badly in lowercase get a display label; anything
// unknown is shown as stored so a new format never breaks the caption.
const FORMAT_LABELS = {
  epub: 'ePub',
  mobi: 'Mobi',
  pdf: 'PDF',
};

function formatLabel(format) {
  const key = String(format).trim().toLowerCase();
  return FORMAT_LABELS[key] || String(format).trim();
}

// Natural Spanish enumeration: 'X', 'X y Y', 'X, Y y Z'.
function joinFormats(formats = []) {
  const labels = formats.map(formatLabel).filter(Boolean);
  if (labels.length === 0) {
    return '';
  }
  if (labels.length === 1) {
    return labels[0];
  }
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

// Cuts to ~200 characters on a word boundary. The feed only shows ~125
// characters before "ver más", so a full 2000-char synopsis would be a wall of
// text (docs/instagram-autopost-spec.md, section 8).
function synopsisExcerpt(synopsis = '') {
  const clean = String(synopsis).replace(/\s+/g, ' ').trim();
  if (clean.length <= SYNOPSIS_MAX_LENGTH) {
    return clean;
  }
  const cut = clean.slice(0, SYNOPSIS_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, '');
}

// No hashtags: deliberate product decision, do not add any.
function buildCaption(book) {
  const heading = book.author
    ? `📚 Nuevo libro disponible para reseñar: ${book.title}, de ${book.author}.`
    : `📚 Nuevo libro disponible para reseñar: ${book.title}.`;

  const formats = joinFormats(book.formats);
  const excerpt = synopsisExcerpt(book.synopsis);
  const truncated = excerpt.length < String(book.synopsis || '').replace(/\s+/g, ' ').trim().length;

  const blocks = [heading];
  if (formats) {
    blocks.push(`Disponible en ${formats}.`);
  }
  if (excerpt) {
    blocks.push(truncated ? `${excerpt}…` : excerpt);
  }
  blocks.push('Pide tu ejemplar gratuito desde el enlace en nuestra bio.');

  return blocks.join('\n\n');
}

module.exports = { buildCaption, joinFormats, synopsisExcerpt };

'use strict';
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { getFonts } = require('./fonts');
const { genreLabel } = require('./genreLabels');

const WIDTH = 1080;
const HEIGHT = 1350;
const JPEG_QUALITY = 90;

const INK = '#3D3A35';
const CREAM = '#FBF1D8';
const MUSTARD = '#F2B705';
const CHIP_BACKGROUND = 'rgba(251,241,216,0.1)';
const CHIP_BORDER = 'rgba(251,241,216,0.28)';

const COVER_WIDTH = Math.round(WIDTH * 0.47);          // ≈ 508 px
const COVER_HEIGHT = Math.round(COVER_WIDTH * 4 / 3);  // 3:4 ratio
const COVER_RADIUS = 36;
const COVER_TOP = 150;

const STARS_TOP = 78;
const STAR_RADIUS = 22;
const STAR_GAP = 26;

const TITLE_SIZE = 56;
const TITLE_LINE_HEIGHT = 68;
const AUTHOR_SIZE = 36;
const CHIP_TEXT_SIZE = 24;
const CHIP_HEIGHT = 52;
const CHIP_PADDING = 26;
const CHIP_GAP = 14;

const BOTTOM_MARGIN = 60;
const COVER_FETCH_TIMEOUT_MS = 10000;

// Downloads the Cloudinary cover. A failure here aborts the whole publication:
// posting a branded image without the real cover is worse than not posting.
async function fetchCover(coverUrl) {
  const response = await fetch(coverUrl, { signal: AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`cover download failed with status ${response.status}`);
  }
  return loadImage(Buffer.from(await response.arrayBuffer()));
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

// Stroke-only 5-point star: deliberately not filled, so the row never reads as
// a real rating given by Reseñan Sancho.
function starPath(ctx, cx, cy, outerRadius) {
  const innerRadius = outerRadius * 0.42;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

function drawStars(ctx) {
  const step = STAR_RADIUS * 2 + STAR_GAP;
  const firstX = WIDTH / 2 - (step * 4) / 2;
  ctx.strokeStyle = MUSTARD;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  for (let i = 0; i < 5; i += 1) {
    starPath(ctx, firstX + step * i, STARS_TOP + STAR_RADIUS, STAR_RADIUS);
    ctx.stroke();
  }
}

// Draws the cover cropped like CSS object-fit: cover inside a rounded rect.
function drawCover(ctx, cover) {
  const x = (WIDTH - COVER_WIDTH) / 2;
  const scale = Math.max(COVER_WIDTH / cover.width, COVER_HEIGHT / cover.height);
  const drawWidth = cover.width * scale;
  const drawHeight = cover.height * scale;

  ctx.save();
  roundedRectPath(ctx, x, COVER_TOP, COVER_WIDTH, COVER_HEIGHT, COVER_RADIUS);
  ctx.clip();
  ctx.drawImage(
    cover,
    x + (COVER_WIDTH - drawWidth) / 2,
    COVER_TOP + (COVER_HEIGHT - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
  ctx.restore();

  return COVER_TOP + COVER_HEIGHT;
}

// Word-wraps by measuring the real text width; never breaks mid-word.
function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) {
    lines.push(current);
  }
  return lines;
}

function drawChip(ctx, label, x, y, width) {
  ctx.fillStyle = CHIP_BACKGROUND;
  roundedRectPath(ctx, x, y, width, CHIP_HEIGHT, CHIP_HEIGHT / 2);
  ctx.fill();
  ctx.strokeStyle = CHIP_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + CHIP_HEIGHT / 2 + 1);
}

// Lays out chips in centered rows, wrapping when a row would overflow.
function layoutChips(ctx, labels, fonts) {
  ctx.font = `600 ${CHIP_TEXT_SIZE}px "${fonts.sans}"`;
  const maxRowWidth = WIDTH - 120;
  const chips = labels.map((label) => ({
    label,
    width: ctx.measureText(label).width + CHIP_PADDING * 2,
  }));

  const rows = [];
  let row = [];
  let rowWidth = 0;
  chips.forEach((chip) => {
    const nextWidth = rowWidth ? rowWidth + CHIP_GAP + chip.width : chip.width;
    if (row.length && nextWidth > maxRowWidth) {
      rows.push({ chips: row, width: rowWidth });
      row = [chip];
      rowWidth = chip.width;
    } else {
      row.push(chip);
      rowWidth = nextWidth;
    }
  });
  if (row.length) {
    rows.push({ chips: row, width: rowWidth });
  }

  return { rows, height: rows.length * (CHIP_HEIGHT + CHIP_GAP) };
}

function drawChips(ctx, { rows }, top, fonts) {
  ctx.font = `600 ${CHIP_TEXT_SIZE}px "${fonts.sans}"`;
  let y = top;
  rows.forEach(({ chips: rowChips, width }) => {
    let x = (WIDTH - width) / 2;
    rowChips.forEach((chip) => {
      drawChip(ctx, chip.label, x, y, chip.width);
      x += chip.width + CHIP_GAP;
    });
    y += CHIP_HEIGHT + CHIP_GAP;
  });
  return y;
}

// Longer titles get a smaller face so the block below the cover always fits in
// the canvas instead of running off the bottom edge.
function fitTitle(ctx, title, fonts, availableHeight, fixedHeight) {
  const sizes = [TITLE_SIZE, 50, 44, 38];
  let chosen = null;
  sizes.forEach((size) => {
    if (chosen) {
      return;
    }
    ctx.font = `600 ${size}px "${fonts.serif}"`;
    const lines = wrapText(ctx, title, WIDTH - 160);
    const lineHeight = Math.round(size * (TITLE_LINE_HEIGHT / TITLE_SIZE));
    if (fixedHeight + lines.length * lineHeight <= availableHeight) {
      chosen = { size, lines, lineHeight };
    }
  });
  if (!chosen) {
    const size = sizes[sizes.length - 1];
    ctx.font = `600 ${size}px "${fonts.serif}"`;
    chosen = {
      size,
      lines: wrapText(ctx, title, WIDTH - 160),
      lineHeight: Math.round(size * (TITLE_LINE_HEIGHT / TITLE_SIZE)),
    };
  }
  return chosen;
}

// Renders the 1080x1350 branded image and returns a JPEG buffer. Instagram
// rejects PNG/WebP in feed posts.
async function renderBookImage(book) {
  const fonts = getFonts();
  const cover = await fetchCover(book.cover);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawStars(ctx);
  let cursor = drawCover(ctx, cover) + 46;

  const genre = genreLabel(book.genre);
  if (genre) {
    const genreChips = layoutChips(ctx, [genre.toUpperCase()], fonts);
    cursor = drawChips(ctx, genreChips, cursor, fonts) + 18;
  }

  const formats = (book.formats || []).map((format) => String(format).toUpperCase());
  const formatChips = formats.length ? layoutChips(ctx, formats, fonts) : { rows: [], height: 0 };
  const authorHeight = book.author ? 14 + AUTHOR_SIZE + 30 : 0;
  const title = fitTitle(ctx, book.title, fonts, HEIGHT - BOTTOM_MARGIN - cursor, authorHeight + formatChips.height);

  ctx.font = `600 ${title.size}px "${fonts.serif}"`;
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  title.lines.forEach((line) => {
    ctx.fillText(line, WIDTH / 2, cursor);
    cursor += title.lineHeight;
  });

  if (book.author) {
    cursor += 14;
    ctx.font = `${AUTHOR_SIZE}px "${fonts.sans}"`;
    ctx.fillStyle = MUSTARD;
    ctx.fillText(`por ${book.author}`, WIDTH / 2, cursor);
    cursor += AUTHOR_SIZE + 30;
  }

  if (formats.length) {
    drawChips(ctx, formatChips, cursor, fonts);
  }

  return canvas.encode('jpeg', JPEG_QUALITY);
}

module.exports = { renderBookImage, wrapText, WIDTH, HEIGHT };

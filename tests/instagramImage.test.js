const { createCanvas } = require('@napi-rs/canvas');
const { renderBookImage, wrapText } = require('../lib/instagram/image');

const book = {
  id: 'b1',
  title: 'El nombre del viento',
  author: 'Patrick Rothfuss',
  genre: 'FAN',
  cover: 'https://res.cloudinary.com/demo/image/upload/cover.jpg',
  formats: ['papel', 'epub'],
};

const jpegResponse = async () => {
  const canvas = createCanvas(60, 80);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#123456';
  ctx.fillRect(0, 0, 60, 80);
  const buffer = await canvas.encode('jpeg', 80);
  return { ok: true, status: 200, arrayBuffer: async () => buffer };
};

describe('wrapText', () => {
  // Fixed-width fake context: real font metrics depend on the fonts installed
  // on the host (they changed when GitHub moved ubuntu-latest to 26.04), so the
  // algorithm is tested against deterministic widths instead.
  const CHAR_WIDTH = 10;
  const fakeCtx = { measureText: (text) => ({ width: text.length * CHAR_WIDTH }) };

  test('breaks by words, never mid-word, keeping every line within maxWidth', () => {
    const text = 'una frase bastante larga que no cabe entera en una sola linea del lienzo';

    const lines = wrapText(fakeCtx, text, 200);

    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((line) => expect(fakeCtx.measureText(line).width).toBeLessThanOrEqual(200));
    expect(lines.join(' ')).toBe(text);
  });

  test('puts a word wider than maxWidth on its own line instead of splitting it', () => {
    const lines = wrapText(fakeCtx, 'un supercalifragilistico titulo', 100);

    expect(lines).toEqual(['un', 'supercalifragilistico', 'titulo']);
  });

  test('returns no lines for empty text', () => {
    expect(wrapText(fakeCtx, '', 100)).toEqual([]);
    expect(wrapText(fakeCtx, undefined, 100)).toEqual([]);
  });
});

describe('renderBookImage', () => {
  afterEach(() => {
    delete global.fetch;
  });

  test('returns a JPEG buffer of the Instagram feed size', async () => {
    global.fetch = jest.fn(jpegResponse);

    const buffer = await renderBookImage(book);

    expect(buffer.slice(0, 2)).toEqual(Buffer.from([0xff, 0xd8])); // JPEG magic number
    expect(global.fetch).toHaveBeenCalledWith(book.cover, expect.any(Object));
  });

  test('rejects when the cover cannot be downloaded, so nothing gets published', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(renderBookImage(book)).rejects.toThrow(/cover download failed with status 404/);
  });
});

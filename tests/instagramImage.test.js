const { createCanvas } = require('@napi-rs/canvas');
const { renderBookImage, wrapText, WIDTH, HEIGHT } = require('../lib/instagram/image');

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
  test('breaks by words, never mid-word', () => {
    const ctx = createCanvas(WIDTH, HEIGHT).getContext('2d');
    ctx.font = '600 56px Georgia';

    const lines = wrapText(ctx, 'una frase bastante larga que no cabe entera en una sola linea del lienzo', 400);

    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((line) => expect(ctx.measureText(line).width).toBeLessThanOrEqual(400));
    expect(lines.join(' ')).toBe('una frase bastante larga que no cabe entera en una sola linea del lienzo');
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

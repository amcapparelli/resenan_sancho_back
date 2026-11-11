// Uses the REAL reviewer schema (no DB connection needed): Mongoose strict
// mode silently drops fields that are not in the schema, so a channel missing
// from the schema would never persist even if the route forwarded it.
const Reviewer = require('../models/reviewer');

describe('reviewer schema — canales TikTok y Podcast', () => {
  test('conserva tiktok y podcast con nombre + URL', () => {
    const reviewer = new Reviewer({
      author: '507f1f77bcf86cd799439011',
      tiktok: { name: '@ana', url: 'https://www.tiktok.com/@ana' },
      podcast: { name: 'Libros y café', url: 'https://open.spotify.com/show/abc' },
    });

    expect(reviewer.validateSync()).toBeUndefined();
    const doc = reviewer.toObject();
    expect(doc.tiktok).toEqual({ name: '@ana', url: 'https://www.tiktok.com/@ana' });
    expect(doc.podcast).toEqual({ name: 'Libros y café', url: 'https://open.spotify.com/show/abc' });
  });

  test('un reseñador existente sin los campos nuevos sigue siendo válido', () => {
    const reviewer = new Reviewer({
      author: '507f1f77bcf86cd799439011',
      blog: { name: 'Mi blog', url: 'https://blog.example.com' },
    });

    expect(reviewer.validateSync()).toBeUndefined();
  });

  test('no valida el formato de URL (igual que el resto de canales)', () => {
    const reviewer = new Reviewer({
      author: '507f1f77bcf86cd799439011',
      tiktok: { name: '@ana', url: 'no-es-una-url' },
    });

    expect(reviewer.validateSync()).toBeUndefined();
    expect(reviewer.tiktok.url).toBe('no-es-una-url');
  });
});

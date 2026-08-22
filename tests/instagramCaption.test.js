const { buildCaption, joinFormats, synopsisExcerpt } = require('../lib/instagram/caption');

describe('joinFormats', () => {
  test('returns a single format as is', () => {
    expect(joinFormats(['papel'])).toBe('papel');
  });

  test('joins two formats with "y"', () => {
    expect(joinFormats(['papel', 'epub'])).toBe('papel y ePub');
  });

  test('joins three or more with commas and a final "y"', () => {
    expect(joinFormats(['papel', 'epub', 'pdf'])).toBe('papel, ePub y PDF');
  });

  test('returns an empty string when there are no formats', () => {
    expect(joinFormats([])).toBe('');
  });
});

describe('synopsisExcerpt', () => {
  test('keeps a short synopsis untouched', () => {
    expect(synopsisExcerpt('Una sinopsis corta.')).toBe('Una sinopsis corta.');
  });

  test('cuts on a word boundary under the 200 character limit', () => {
    const synopsis = `${'palabra '.repeat(40)}final`;
    const excerpt = synopsisExcerpt(synopsis);

    expect(excerpt.length).toBeLessThanOrEqual(200);
    expect(excerpt.endsWith('palabra')).toBe(true);
    expect(synopsis.startsWith(excerpt)).toBe(true);
  });

  test('collapses whitespace and line breaks', () => {
    expect(synopsisExcerpt('Una   sinopsis\n con saltos')).toBe('Una sinopsis con saltos');
  });
});

describe('buildCaption', () => {
  const book = {
    title: 'El nombre del viento',
    author: 'Patrick Rothfuss',
    formats: ['papel', 'epub'],
    synopsis: 'He robado princesas a reyes agónicos.',
  };

  test('follows the approved template', () => {
    expect(buildCaption(book)).toBe(
      '📚 Nuevo libro disponible para reseñar: El nombre del viento, de Patrick Rothfuss.\n\n' +
      'Disponible en papel y ePub.\n\n' +
      'He robado princesas a reyes agónicos.\n\n' +
      'Pide tu ejemplar gratuito desde el enlace en nuestra bio.'
    );
  });

  test('adds the ellipsis only when the synopsis was truncated', () => {
    const long = buildCaption({ ...book, synopsis: 'palabra '.repeat(60) });

    expect(long).toContain('…');
    expect(buildCaption(book)).not.toContain('…');
  });

  test('never adds hashtags', () => {
    expect(buildCaption(book)).not.toContain('#');
  });

  test('omits the author and the formats line when they are missing', () => {
    const caption = buildCaption({ ...book, author: null, formats: [] });

    expect(caption).toContain('reseñar: El nombre del viento.');
    expect(caption).not.toContain('Disponible en');
  });
});

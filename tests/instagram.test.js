jest.mock('../models/book', () => require('./helpers/modelMock').makeModelMock(['findOne']));

const { publishToInstagram, buildBookData } = require('../lib/instagram');

const bookDoc = (overrides = {}) => ({
  _id: 'b1',
  title: 'El libro',
  genre: 'ROM',
  synopsis: 'Una sinopsis',
  cover: 'https://res.cloudinary.com/demo/image/upload/cover.jpg',
  formats: ['papel', 'epub'],
  author: { name: 'Ana', lastName: 'García' },
  instagramPostedAt: null,
  ...overrides,
});

describe('publishToInstagram', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.SOCIAL_AUTOPOST_ENABLED = 'true';
    process.env.IG_DRY_RUN = 'true';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  test('does nothing when the feature flag is off', async () => {
    process.env.SOCIAL_AUTOPOST_ENABLED = 'false';
    const book = bookDoc({ populate: jest.fn() });

    await publishToInstagram(book);

    expect(book.populate).not.toHaveBeenCalled();
  });

  test('does nothing when the book was already posted', async () => {
    const book = bookDoc({ instagramPostedAt: new Date(), populate: jest.fn() });

    await publishToInstagram(book);

    expect(book.populate).not.toHaveBeenCalled();
  });

  test('swallows and logs any error instead of rejecting', async () => {
    const book = bookDoc({ populate: jest.fn().mockRejectedValue(new Error('boom')) });

    await expect(publishToInstagram(book)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      '[instagram-autopost]',
      'error',
      expect.objectContaining({ step: 'publish', bookId: 'b1', message: 'boom' })
    );
  });

  test('flag reads process.env at call time, not at import time', async () => {
    const book = bookDoc({ populate: jest.fn().mockResolvedValue(bookDoc()) });

    process.env.SOCIAL_AUTOPOST_ENABLED = 'false';
    await publishToInstagram(book);
    expect(book.populate).not.toHaveBeenCalled();

    process.env.SOCIAL_AUTOPOST_ENABLED = 'true';
    await publishToInstagram(book);
    expect(book.populate).toHaveBeenCalled();
  });
});

describe('buildBookData', () => {
  test('flattens the document and joins the author display name', async () => {
    const populated = bookDoc();
    const data = await buildBookData(bookDoc({ populate: jest.fn().mockResolvedValue(populated) }));

    expect(data).toEqual({
      id: 'b1',
      title: 'El libro',
      author: 'Ana García',
      genre: 'ROM',
      synopsis: 'Una sinopsis',
      cover: 'https://res.cloudinary.com/demo/image/upload/cover.jpg',
      formats: ['papel', 'epub'],
    });
  });

  test('leaves the author null when it could not be populated', async () => {
    const populated = bookDoc({ author: 'u1' });
    const data = await buildBookData(bookDoc({ author: 'u1', populate: jest.fn().mockResolvedValue(populated) }));

    expect(data.author).toBeNull();
  });
});

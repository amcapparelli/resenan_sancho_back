jest.mock('../models/book', () => require('./helpers/modelMock').makeModelMock(['findOne', 'updateOne']));
jest.mock('../lib/instagram/image', () => ({ renderBookImage: jest.fn().mockResolvedValue(Buffer.from('jpeg')) }));
jest.mock('../lib/instagram/cloudinary', () => ({ uploadImage: jest.fn().mockResolvedValue('https://res.cloudinary.com/demo/instagram-posts/b1.jpg') }));
jest.mock('../lib/instagram/graphApi', () => ({
  createMediaContainer: jest.fn().mockResolvedValue('container-1'),
  waitForContainer: jest.fn().mockResolvedValue(undefined),
  publishContainer: jest.fn().mockResolvedValue('media-9'),
}));
jest.mock('../lib/instagram/preview', () => ({ savePreview: jest.fn().mockResolvedValue('/tmp/ig-preview-b1.jpg') }));

const { publishToInstagram, buildBookData } = require('../lib/instagram');
const { renderBookImage } = require('../lib/instagram/image');
const { savePreview } = require('../lib/instagram/preview');
const { uploadImage } = require('../lib/instagram/cloudinary');
const graphApi = require('../lib/instagram/graphApi');
const Book = require('../models/book');

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

  test('in dry run it renders and saves the preview without marking the book as posted', async () => {
    process.env.IG_BUSINESS_ACCOUNT_ID = '17841405744435526';
    const book = bookDoc({ populate: jest.fn().mockResolvedValue(bookDoc()), save: jest.fn() });

    await publishToInstagram(book);

    expect(renderBookImage).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1', title: 'El libro' }));
    expect(savePreview).toHaveBeenCalledWith(expect.any(Buffer), 'b1');
    expect(book.instagramPostedAt).toBeNull();
    expect(book.save).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      '[instagram-autopost]',
      'dry run, nothing published',
      expect.objectContaining({
        bookId: 'b1',
        previewPath: '/tmp/ig-preview-b1.jpg',
        igUserId: '17841405744435526',
        caption: expect.stringContaining('Nuevo libro disponible para reseñar'),
      })
    );
  });

  test('aborts the publication when the cover cannot be downloaded', async () => {
    renderBookImage.mockRejectedValueOnce(new Error('cover download failed with status 404'));
    const book = bookDoc({ populate: jest.fn().mockResolvedValue(bookDoc()) });

    await expect(publishToInstagram(book)).resolves.toBeUndefined();

    expect(savePreview).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      '[instagram-autopost]',
      'error',
      expect.objectContaining({ bookId: 'b1', message: 'cover download failed with status 404' })
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

describe('publishToInstagram in real mode', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.SOCIAL_AUTOPOST_ENABLED = 'true';
    process.env.IG_DRY_RUN = 'false';
    process.env.IG_PAGE_ACCESS_TOKEN = 'secret-token';
    process.env.IG_BUSINESS_ACCOUNT_ID = 'ig-1';
    Book.updateOne.mockResolvedValue({ acknowledged: true });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  test('uploads, creates the container, waits, publishes and marks the book', async () => {
    const book = bookDoc({ populate: jest.fn().mockResolvedValue(bookDoc()) });

    await publishToInstagram(book);

    expect(savePreview).not.toHaveBeenCalled();
    expect(uploadImage).toHaveBeenCalledWith(expect.any(Buffer), 'b1');
    expect(graphApi.createMediaContainer).toHaveBeenCalledWith(expect.objectContaining({
      igUserId: 'ig-1',
      accessToken: 'secret-token',
      imageUrl: 'https://res.cloudinary.com/demo/instagram-posts/b1.jpg',
      caption: expect.stringContaining('El libro'),
    }));
    expect(graphApi.waitForContainer).toHaveBeenCalledWith(expect.objectContaining({ containerId: 'container-1' }));
    expect(graphApi.publishContainer).toHaveBeenCalledWith(expect.objectContaining({ containerId: 'container-1' }));
    expect(Book.updateOne).toHaveBeenCalledWith({ _id: 'b1' }, { instagramPostedAt: expect.any(Date) });
    expect(book.instagramPostedAt).toBeInstanceOf(Date);
  });

  test('does not mark the book when the publish call fails', async () => {
    graphApi.publishContainer.mockRejectedValueOnce(new Error('Graph API 400: Invalid OAuth token (code 190)'));
    const book = bookDoc({ populate: jest.fn().mockResolvedValue(bookDoc()) });

    await expect(publishToInstagram(book)).resolves.toBeUndefined();

    expect(Book.updateOne).not.toHaveBeenCalled();
    expect(book.instagramPostedAt).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      '[instagram-autopost]',
      'error',
      expect.objectContaining({ bookId: 'b1', message: expect.stringContaining('code 190') })
    );
  });

  test('never logs the access token', async () => {
    graphApi.createMediaContainer.mockRejectedValueOnce(new Error('boom'));
    const book = bookDoc({ populate: jest.fn().mockResolvedValue(bookDoc()) });

    await publishToInstagram(book);

    const logged = JSON.stringify(console.log.mock.calls) + JSON.stringify(console.error.mock.calls);
    expect(logged).not.toContain('secret-token');
  });

  test('aborts when the Instagram credentials are missing', async () => {
    delete process.env.IG_PAGE_ACCESS_TOKEN;
    const book = bookDoc({ populate: jest.fn().mockResolvedValue(bookDoc()) });

    await publishToInstagram(book);

    expect(uploadImage).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      '[instagram-autopost]',
      'error',
      expect.objectContaining({ message: expect.stringContaining('missing IG_PAGE_ACCESS_TOKEN') })
    );
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

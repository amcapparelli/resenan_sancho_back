
process.env.JWT_SECRET = 'test-secret';

jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));
jest.mock('../models/book', () => require('./helpers/modelMock').makeModelMock(['find', 'aggregate']));

const request = require('supertest');
const Book = require('../models/book');
const app = require('../app');
const { invalidateHomeHighlights } = require('../lib/homeHighlights');

// Book.find(...) is a chainable query in Mongoose; the mock mimics the chain and
// resolves on the terminal .lean() call.
const mockFind = (books) => {
  const query = {
    sort: jest.fn(() => query),
    limit: jest.fn(() => query),
    select: jest.fn(() => query),
    populate: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(books),
  };
  Book.find.mockReturnValue(query);
  return query;
};

const bookDoc = (overrides = {}) => ({
  _id: 'b1',
  title: 'La sombra del viento',
  genre: 'HIF',
  copies: 8,
  author: { name: 'Carlos', lastName: 'Zafón' },
  ...overrides,
});

describe('GET /home/highlights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateHomeHighlights();
    mockFind([bookDoc()]);
    Book.aggregate.mockResolvedValue([{ _id: 'HIF', totalLibros: 142 }]);
  });

  test('returns both blocks with a cachedAt timestamp', async () => {
    const res = await request(app).get('/home/highlights');

    expect(res.status).toBe(200);
    expect(res.type).toMatch(/json/);
    expect(res.body.featuredBooks).toEqual([{
      id: 'b1',
      title: 'La sombra del viento',
      author: 'Carlos Zafón',
      genre: 'HIF',
      copies: 8,
    }]);
    expect(res.body.topGenres).toEqual([{ code: 'HIF', totalLibros: 142 }]);
    expect(Date.parse(res.body.cachedAt)).not.toBeNaN();
  });

  test('only counts books with available copies, sorted by copies desc, limited to 4', async () => {
    const query = mockFind([bookDoc()]);

    await request(app).get('/home/highlights');

    expect(Book.find).toHaveBeenCalledWith({ copies: { $gt: 0 } });
    expect(query.sort).toHaveBeenCalledWith({ copies: -1, create_at: -1 });
    expect(query.limit).toHaveBeenCalledWith(4);
    expect(Book.aggregate).toHaveBeenCalledWith([
      { $match: { copies: { $gt: 0 } } },
      { $group: { _id: '$genre', totalLibros: { $sum: 1 } } },
      { $sort: { totalLibros: -1, _id: 1 } },
      { $limit: 3 },
    ]);
  });

  test('does not expose author internals beyond the display name', async () => {
    const query = mockFind([bookDoc()]);

    await request(app).get('/home/highlights');

    expect(query.select).toHaveBeenCalledWith('title genre copies');
    expect(query.populate).toHaveBeenCalledWith('author', 'name lastName');
  });

  test('tolerates a book whose author no longer exists', async () => {
    mockFind([bookDoc({ author: null })]);

    const res = await request(app).get('/home/highlights');

    expect(res.status).toBe(200);
    expect(res.body.featuredBooks[0].author).toBeNull();
  });

  test('serves the cached payload without hitting the db again', async () => {
    const first = await request(app).get('/home/highlights');
    const second = await request(app).get('/home/highlights');

    expect(Book.find).toHaveBeenCalledTimes(1);
    expect(Book.aggregate).toHaveBeenCalledTimes(1);
    expect(second.body).toEqual(first.body);
  });

  test('recomputes once the cache is invalidated', async () => {
    await request(app).get('/home/highlights');
    invalidateHomeHighlights();
    await request(app).get('/home/highlights');

    expect(Book.find).toHaveBeenCalledTimes(2);
  });

  test('responds 500 and caches nothing when a query fails', async () => {
    Book.aggregate.mockRejectedValue(new Error('mongo down'));

    const res = await request(app).get('/home/highlights');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'No se han podido cargar los destacados de la home' });

    // A later request must retry instead of serving a poisoned cache.
    Book.aggregate.mockResolvedValue([{ _id: 'POE', totalLibros: 5 }]);
    const retry = await request(app).get('/home/highlights');
    expect(retry.status).toBe(200);
    expect(retry.body.topGenres).toEqual([{ code: 'POE', totalLibros: 5 }]);
  });
});

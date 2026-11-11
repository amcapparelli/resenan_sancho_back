process.env.JWT_SECRET = 'test-secret';

// Block side effects at import time.
jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));
jest.mock('../models/reviewer', () => require('./helpers/modelMock').makeModelMock(['find', 'findOne', 'countDocuments']));

const request = require('supertest');
const Reviewer = require('../models/reviewer');
const app = require('../app');

const tiktokOnly = {
  _id: 'r1',
  author: { _id: 'u1', name: 'Ana' },
  genres: ['romantic'],
  formats: ['papel'],
  tiktok: { name: '@ana', url: 'https://www.tiktok.com/@ana' },
};

// Chainable stand-in for Reviewer.find().sort().limit().skip().populate().
const findChain = (result) => {
  const chain = {};
  ['sort', 'limit', 'skip'].forEach((m) => { chain[m] = jest.fn(() => chain); });
  chain.populate = jest.fn().mockResolvedValue(result);
  return chain;
};

describe('GET /reviewers — listado con canales nuevos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('un perfil con solo TikTok aparece en el listado con su canal', async () => {
    Reviewer.countDocuments.mockResolvedValue(1);
    Reviewer.find.mockReturnValue(findChain([tiktokOnly]));

    const res = await request(app).get('/reviewers?page=1');

    expect(res.body.totalElements).toBe(1);
    expect(res.body.reviewers[0].tiktok).toEqual(tiktokOnly.tiktok);
    // Ser reseñador no depende de qué canales tenga: el filtro no enumera canales.
    expect(Reviewer.find).toHaveBeenCalledWith({});
  });
});

describe('GET /reviewer/:id — ficha con canales nuevos', () => {
  test('devuelve tiktok y podcast al frontend', async () => {
    const profile = {
      ...tiktokOnly,
      podcast: { name: 'Libros y café', url: 'https://open.spotify.com/show/abc' },
    };
    Reviewer.findOne.mockResolvedValue(profile);

    const res = await request(app).get('/reviewer/u1');

    expect(res.body.reviewer.tiktok).toEqual(profile.tiktok);
    expect(res.body.reviewer.podcast).toEqual(profile.podcast);
  });
});

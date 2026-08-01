
process.env.JWT_SECRET = 'test-secret';

// Block side effects at import time.
jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));
jest.mock('../models/user', () => require('./helpers/modelMock').makeModelMock(['updateOne']));
jest.mock('../models/reviewer', () => require('./helpers/modelMock').makeModelMock(['findOne']));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Reviewer = require('../models/reviewer');
const app = require('../app');

const tokenFor = (user) => jwt.sign({ user }, process.env.JWT_SECRET);

const send = (country) => request(app)
  .post('/update')
  .set('access-token', tokenFor({ _id: 'u1' }))
  .send({ _id: 'u1', avatar: '', country, email: 'a@b.com', name: 'Ana', lastName: 'Perez' });

describe('POST /update — capa de compatibilidad de country (punto 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.updateOne.mockResolvedValue({});
    Reviewer.findOne.mockResolvedValue(null);
  });

  test('normaliza un nombre legacy ("Spain") a código ISO ("ES") antes de guardar', async () => {
    const res = await send('Spain');
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'u1' }, expect.objectContaining({ country: 'ES' }));
    expect(res.body.user.country).toBe('ES');
  });

  test('deja pasar un código ISO ya válido', async () => {
    await send('MX');
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'u1' }, expect.objectContaining({ country: 'MX' }));
  });

  test('guarda null para un valor vacío o no mapeable', async () => {
    await send('');
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'u1' }, expect.objectContaining({ country: null }));

    jest.clearAllMocks();
    User.updateOne.mockResolvedValue({});
    Reviewer.findOne.mockResolvedValue(null);
    await send('Narnia');
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'u1' }, expect.objectContaining({ country: null }));
  });

  test('rechaza si el _id no coincide con el del token', async () => {
    const res = await request(app)
      .post('/update')
      .set('access-token', tokenFor({ _id: 'otro' }))
      .send({ _id: 'u1', country: 'ES' });
    expect(res.body.message).toBe('noPermissions');
    expect(User.updateOne).not.toHaveBeenCalled();
  });
});

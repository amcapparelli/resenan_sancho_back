 
process.env.JWT_SECRET = 'test-secret';

jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));
jest.mock('../models/user', () => require('./helpers/modelMock').makeModelMock(['findOne', 'hashPassword']));
jest.mock('../models/book', () => require('./helpers/modelMock').makeModelMock(['findOne']));
jest.mock('../models/reviewer', () => require('./helpers/modelMock').makeModelMock(['findOne']));

const request = require('supertest');
const User = require('../models/user');
const app = require('../app');

describe('POST /register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'not-an-email', name: 'A', lastName: 'B', password: 'x' });

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no es válido/);
    expect(User.hashPassword).not.toHaveBeenCalled();
  });

  test('registers a new user when the email is valid', async () => {
    User.findOne.mockResolvedValue(null);
    User.hashPassword.mockResolvedValue('hashed-pw');

    const res = await request(app)
      .post('/register')
      .send({ email: 'new@user.com', name: 'New', lastName: 'User', password: 'secret' });

    expect(res.body.success).toBe(true);
    expect(User.hashPassword).toHaveBeenCalledWith('secret');
  });
});

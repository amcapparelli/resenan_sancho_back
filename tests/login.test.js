/* eslint-disable no-undef */
process.env.JWT_SECRET = 'test-secret';

// Block side effects at import time: no real DB connection, no real Stripe client.
jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('../models/user', () => require('./helpers/modelMock').makeModelMock(['findOne', 'updateOne']));
jest.mock('../models/reviewer', () => require('./helpers/modelMock').makeModelMock(['findOne']));

const request = require('supertest');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Reviewer = require('../models/reviewer');
const app = require('../app');

describe('POST /login', () => {
  beforeEach(() => jest.clearAllMocks());

  test('logs in a valid user, sets a token cookie, and strips the password', async () => {
    const userDoc = { _id: 'u1', email: 'a@b.com', name: 'A', password: 'hashed' };
    User.findOne.mockResolvedValue({ ...userDoc, _doc: userDoc });
    bcrypt.compare.mockResolvedValue(true);
    Reviewer.findOne.mockResolvedValue(null);

    const res = await request(app).post('/login').send({ email: 'a@b.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.password).toBeUndefined();

    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
  });

  test('rejects an incorrect password', async () => {
    const userDoc = { _id: 'u1', email: 'a@b.com', password: 'hashed' };
    User.findOne.mockResolvedValue({ ...userDoc, _doc: userDoc });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post('/login').send({ email: 'a@b.com', password: 'wrong' });

    expect(res.body.message).toBe('credenciales incorrectas');
    expect(res.body.success).toBeUndefined();
  });
});

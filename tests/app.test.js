/* eslint-disable no-undef */
process.env.JWT_SECRET = 'test-secret';

// app.js wires up Mongoose at require time; keep it from touching a real DB.
jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));

const request = require('supertest');
const app = require('../app');

describe('app bootstrap (Express 5)', () => {
  test('GET / returns a JSON status payload (no jade view)', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.type).toMatch(/json/);
    expect(res.body.status).toBe('ok');
  });

  // Regression: the error handler used to be declared with only 3 args
  // (err, req, res), so Express treated it as ordinary middleware and never
  // ran it on errors. A 404 forwarded by the catch-all would never reach it.
  // With the 4-arg handler it must respond with a JSON 404, not crash / render.
  test('unknown route returns a JSON 404 via the error handler', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.type).toMatch(/json/);
    expect(res.body.message).toMatch(/not found/i);
  });
});


process.env.JWT_SECRET = 'test-secret';

// app.js wires up Mongoose at require time; keep it from touching a real DB.
jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));

const request = require('supertest');
const app = require('../app');
const { version } = require('../package.json');

describe('GET /version', () => {
  test('returns the current backend version as JSON', async () => {
    const res = await request(app).get('/version');

    expect(res.status).toBe(200);
    expect(res.type).toMatch(/json/);
    expect(res.body).toEqual({ version });
  });
});

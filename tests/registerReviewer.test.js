/* eslint-disable no-undef */
process.env.JWT_SECRET = 'test-secret';
// registerReviewer builds the Mailchimp URL from these at module load.
process.env.MAIL_CHIMP_INSTANCE = 'us1';
process.env.LIST_UNIQUE_ID = 'list123';
process.env.MAIL_CHIMP_API_KEY = 'key123';

// Block side effects at import time.
jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));
jest.mock('../models/user', () => require('./helpers/modelMock').makeModelMock(['findOne']));
jest.mock('../models/reviewer', () => require('./helpers/modelMock').makeModelMock(['findOne', 'updateOne']));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Reviewer = require('../models/reviewer');
const app = require('../app');

const tokenFor = (user) => jwt.sign({ user }, process.env.JWT_SECRET);

// A valid Mailchimp member GET response (subscription status is a string).
const okMember = () => ({ ok: true, status: 200, json: async () => ({ status: 'subscribed' }) });
// Mailchimp "member not found" — note: `status` here is the numeric HTTP code.
const notFound = () => ({ ok: false, status: 404, json: async () => ({ status: 404, title: 'Resource Not Found' }) });

describe('PUT /registerReviewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    User.findOne.mockResolvedValue({ _id: 'u1', email: 'a@b.com', name: 'Ana', country: 'ES' });
    Reviewer.updateOne.mockResolvedValue({});
  });

  const body = { author: 'u1', genres: ['romantic'], formats: ['papel'], blog: '', booktube: '', bookstagram: '', goodreads: '', amazon: '', description: 'x' };

  test('updates the profile when the Mailchimp member exists', async () => {
    global.fetch.mockResolvedValueOnce(okMember())            // GET member
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }); // PUT upsert

    const res = await request(app)
      .put('/registerReviewer')
      .set('access-token', tokenFor({ _id: 'u1' }))
      .send(body);

    expect(res.body.success).toBe(true);
    // The PUT must carry the member's real subscription status string.
    const putCall = global.fetch.mock.calls[1];
    expect(JSON.parse(putCall[1].body).status).toBe('subscribed');
  });

  // Regression: with superagent a 404 GET threw and skipped the PUT. With fetch
  // (no throw on 404) the handler must NOT send the numeric HTTP code (404) as
  // the subscription status — it should bail out before the PUT.
  test('does not send a numeric status when the Mailchimp member is missing', async () => {
    global.fetch.mockResolvedValueOnce(notFound()); // GET member → 404

    const res = await request(app)
      .put('/registerReviewer')
      .set('access-token', tokenFor({ _id: 'u1' }))
      .send(body);

    // No PUT should be attempted after a failed lookup.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(res.body).toEqual({ success: false, message: 'no se pudo guardar los cambios' });
  });
});

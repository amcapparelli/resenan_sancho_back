 
process.env.JWT_SECRET = 'test-secret';

jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));
jest.mock('../models/user', () => require('./helpers/modelMock').makeModelMock(['findOne']));
jest.mock('../models/book', () => require('./helpers/modelMock').makeModelMock(['findOne', 'updateOne']));
jest.mock('../models/reviewer', () => require('./helpers/modelMock').makeModelMock(['findOne']));
jest.mock('../lib/email', () => ({
  transporter: { sendMail: jest.fn((template, cb) => cb(null)) },
  newBookTemplate: jest.fn(() => ({})),
}));
jest.mock('../lib/instagram/trigger', () => ({
  triggerInstagramPostIfEligible: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const Book = require('../models/book');
const User = require('../models/user');
const { triggerInstagramPostIfEligible } = require('../lib/instagram/trigger');
const app = require('../app');

const tokenFor = (user) => jwt.sign({ user }, process.env.JWT_SECRET);

describe('registerBook routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST /registerBook rejects a duplicate book', async () => {
    Book.findOne.mockResolvedValue({ _id: 'b1', title: 'Dup' });

    const res = await request(app).post('/registerBook').send({ title: 'Dup', author: 'u1' });

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/ya existe/);
  });

  test('PUT /registerBook/:id rejects when author is not the token owner', async () => {
    const token = tokenFor({ _id: 'owner1', email: 'o@b.com' });

    const res = await request(app)
      .put('/registerBook/b1')
      .set('access-token', token)
      .send({ author: 'someone-else', title: 'X' });

    expect(res.body.message).toMatch(/no tienes autorización/);
    expect(Book.updateOne).not.toHaveBeenCalled();
  });

  // The autopost now runs when copies are added, not when the book is created:
  // a brand new book has no copies yet, so it is not orderable.
  test('POST /registerBook does not trigger the Instagram autopost', async () => {
    Book.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue({ email: 'a@b.com', name: 'Ana' });

    const res = await request(app).post('/registerBook').send({ title: 'Nuevo', author: 'u1' });

    expect(res.body.success).toBe(true);
    expect(triggerInstagramPostIfEligible).not.toHaveBeenCalled();
  });

  test('PUT /registerBook/:id requires a token', async () => {
    const res = await request(app).put('/registerBook/b1').send({ author: 'owner1' });

    expect(res.body.message).toBe('authorizationFailed');
  });
});

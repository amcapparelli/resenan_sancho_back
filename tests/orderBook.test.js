
process.env.JWT_SECRET = 'test-secret';

jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));
jest.mock('../models/user', () => require('./helpers/modelMock').makeModelMock(['findOne', 'updateOne']));
jest.mock('../models/book', () => require('./helpers/modelMock').makeModelMock(['findOne', 'updateOne']));
jest.mock('../models/reviewer', () => require('./helpers/modelMock').makeModelMock(['findOne']));
jest.mock('../lib/email', () => ({
  transporter: { sendMail: jest.fn((tpl, cb) => cb(null)) },
  bookCopyRequestTemplate: jest.fn(() => ({}))
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Book = require('../models/book');
const app = require('../app');

const REVIEWER_ID = 'u1';
const tokenFor = (user) => jwt.sign({ user }, process.env.JWT_SECRET);
const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000);

// The route reads the reviewer's own user doc first, then the book's author doc.
const mockUsers = (reviewerDoc) => {
  User.findOne.mockImplementation(({ _id }) =>
    Promise.resolve(_id === REVIEWER_ID ? reviewerDoc : { email: 'author@b.com' })
  );
};

const orderRequest = () =>
  request(app)
    .post('/orderBook')
    .set('access-token', tokenFor({ _id: REVIEWER_ID, email: 'r@b.com' }))
    .send({ reviewer: REVIEWER_ID, book: 'b1', message: 'hola' });

describe('orderBook routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Book.findOne.mockResolvedValue({
      _id: 'b1',
      copies: 3,
      reviewersOrders: [],
      author: { equals: () => false }
    });
    Book.updateOne.mockResolvedValue({});
    User.updateOne.mockResolvedValue({});
  });

  test('blocks a second order inside the 24h cooldown', async () => {
    mockUsers({ _id: REVIEWER_ID, lastBookOrderAt: hoursAgo(2) });

    const res = await orderRequest();

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/debes esperar 22 horas/);
    expect(Book.updateOne).not.toHaveBeenCalled();
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  test('allows a new order once the cooldown has elapsed', async () => {
    mockUsers({ _id: REVIEWER_ID, lastBookOrderAt: hoursAgo(25) });

    const res = await orderRequest();

    expect(res.body.success).toBe(true);
    expect(Book.updateOne).toHaveBeenCalledTimes(1);
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: REVIEWER_ID },
      { lastBookOrderAt: expect.any(Date) }
    );
  });

  test('allows a first-ever order and stamps the order time', async () => {
    mockUsers({ _id: REVIEWER_ID });

    const res = await orderRequest();

    expect(res.body.success).toBe(true);
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: REVIEWER_ID },
      { lastBookOrderAt: expect.any(Date) }
    );
  });
});

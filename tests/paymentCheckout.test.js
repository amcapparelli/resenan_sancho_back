 
process.env.JWT_SECRET = 'test-secret';

jest.mock('../lib/connectMongoose', () => ({}));

// The Stripe client is built once at module load; expose its paymentIntents.create
// mock on the factory so tests can control it.
jest.mock('stripe', () => {
  const create = jest.fn();
  const factory = jest.fn(() => ({ paymentIntents: { create } }));
  factory.__create = create;
  return factory;
});
jest.mock('../models/user', () => require('./helpers/modelMock').makeModelMock(['findOne']));
jest.mock('../models/book', () => require('./helpers/modelMock').makeModelMock(['findOne', 'updateOne']));
jest.mock('../models/reviewer', () => require('./helpers/modelMock').makeModelMock(['findOne']));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const stripe = require('stripe');
const Book = require('../models/book');
const app = require('../app');

const tokenFor = (user) => jwt.sign({ user }, process.env.JWT_SECRET);

describe('POST /paymentCheckout', () => {
  beforeEach(() => jest.clearAllMocks());

  test('requires authentication', async () => {
    const res = await request(app).post('/paymentCheckout').send({});

    expect(res.body.message).toBe('authorizationFailed');
  });

  test('charges via Stripe and adds the promo copies to the book', async () => {
    const token = tokenFor({ _id: 'owner1', email: 'o@b.com' });
    stripe.__create.mockResolvedValue({ id: 'pi_1' });
    Book.findOne
      .mockResolvedValueOnce({ _id: 'b1', copies: 0, title: 'MyBook' }) // pre-charge lookup
      .mockResolvedValueOnce({ _id: 'b1', copies: 5, title: 'MyBook' }); // post-update lookup

    // promo id 2 => 5 copies, price 990
    const res = await request(app)
      .post('/paymentCheckout')
      .set('access-token', token)
      .send({ author: 'owner1', id: 'pm_card', chosenPromo: 2, bookId: 'b1' });

    expect(stripe.__create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 990,
        currency: 'EUR',
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
      })
    );
    expect(Book.updateOne).toHaveBeenCalledWith({ _id: 'b1' }, expect.objectContaining({ copies: 5 }));
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/5/);
  });

  test('rejects when the authenticated user is not the book author', async () => {
    const token = tokenFor({ _id: 'owner1', email: 'o@b.com' });

    const res = await request(app)
      .post('/paymentCheckout')
      .set('access-token', token)
      .send({ author: 'a-different-user', id: 'pm_card', chosenPromo: 2, bookId: 'b1' });

    expect(res.body.message).toMatch(/no tienes autorización/);
    expect(stripe.__create).not.toHaveBeenCalled();
  });
});

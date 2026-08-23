process.env.JWT_SECRET = 'test-secret';

jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('stripe', () => jest.fn(() => ({ paymentIntents: { create: jest.fn() } })));
jest.mock('../models/user', () => require('./helpers/modelMock').makeModelMock(['findOne']));
jest.mock('../models/book', () => require('./helpers/modelMock').makeModelMock(['findOne', 'updateOne']));
jest.mock('../models/reviewer', () => require('./helpers/modelMock').makeModelMock(['findOne']));
jest.mock('../lib/instagram/trigger', () => ({
  triggerInstagramPostIfEligible: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const Book = require('../models/book');
const { triggerInstagramPostIfEligible } = require('../lib/instagram/trigger');
const app = require('../app');

const tokenFor = (user) => jwt.sign({ user }, process.env.JWT_SECRET);

describe('PUT /promotions/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('adds the free promo copies and triggers the Instagram autopost', async () => {
    const token = tokenFor({ _id: 'owner1', email: 'o@b.com' });
    const updated = { _id: 'b1', copies: 2, title: 'MyBook' };
    Book.findOne
      .mockResolvedValueOnce({ _id: 'b1', copies: 0, title: 'MyBook', freePromoAvailable: true })
      .mockResolvedValueOnce(updated);

    // promo id 1 => 2 free copies
    const res = await request(app)
      .put('/promotions/b1')
      .set('access-token', token)
      .send({ author: 'owner1', chosenPromo: 1 });

    expect(Book.updateOne).toHaveBeenCalledWith({ _id: 'b1' }, expect.objectContaining({ copies: 2 }));
    expect(res.body.success).toBe(true);
    expect(triggerInstagramPostIfEligible).toHaveBeenCalledWith(updated);
  });

  test('does not trigger the autopost when no copies are added', async () => {
    const token = tokenFor({ _id: 'owner1', email: 'o@b.com' });
    Book.findOne.mockResolvedValueOnce({ _id: 'b1', copies: 0, freePromoAvailable: false });

    // promo id 1 => 2 copies, but the free promo was already used
    const res = await request(app)
      .put('/promotions/b1')
      .set('access-token', token)
      .send({ author: 'owner1', chosenPromo: 1 });

    expect(res.body.success).toBe(false);
    expect(Book.updateOne).not.toHaveBeenCalled();
    expect(triggerInstagramPostIfEligible).not.toHaveBeenCalled();
  });

  test('still responds with success when the Instagram autopost fails', async () => {
    const token = tokenFor({ _id: 'owner1', email: 'o@b.com' });
    Book.findOne
      .mockResolvedValueOnce({ _id: 'b1', copies: 0, title: 'MyBook', freePromoAvailable: true })
      .mockResolvedValueOnce({ _id: 'b1', copies: 2, title: 'MyBook' });
    triggerInstagramPostIfEligible.mockRejectedValueOnce(new Error('instagram down'));

    const res = await request(app)
      .put('/promotions/b1')
      .set('access-token', token)
      .send({ author: 'owner1', chosenPromo: 1 });

    expect(res.body.success).toBe(true);
  });
});

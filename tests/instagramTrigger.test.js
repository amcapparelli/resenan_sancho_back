jest.mock('../lib/connectMongoose', () => ({}));
jest.mock('../lib/instagram', () => ({ publishToInstagram: jest.fn().mockResolvedValue(undefined) }));

const { publishToInstagram } = require('../lib/instagram');
const { triggerInstagramPostIfEligible } = require('../lib/instagram/trigger');

describe('triggerInstagramPostIfEligible', () => {
  beforeEach(() => jest.clearAllMocks());

  test('publishes a book that has available copies', async () => {
    const book = { _id: 'b1', copies: 5 };

    await triggerInstagramPostIfEligible(book);

    expect(publishToInstagram).toHaveBeenCalledWith(book);
  });

  test('skips a book with no available copies', async () => {
    await triggerInstagramPostIfEligible({ _id: 'b1', copies: 0 });

    expect(publishToInstagram).not.toHaveBeenCalled();
  });

  test('skips when there is no book', async () => {
    await triggerInstagramPostIfEligible(null);
    await triggerInstagramPostIfEligible(undefined);

    expect(publishToInstagram).not.toHaveBeenCalled();
  });

  // The idempotency guard lives inside publishToInstagram, so the helper hands
  // over every copy addition and only the first one ends up publishing.
  test('delegates the already-posted check to publishToInstagram', async () => {
    const book = { _id: 'b1', copies: 5, instagramPostedAt: new Date() };

    await triggerInstagramPostIfEligible(book);

    expect(publishToInstagram).toHaveBeenCalledWith(book);
  });
});

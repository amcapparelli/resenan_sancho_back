'use strict';
const { publishToInstagram } = require('./index');
const logger = require('./logger');

// Single entry point for every flow that adds copies to a book: a book is
// announced on Instagram when it becomes orderable, not when it is created
// (docs/instagram-autopost-trigger-update-spec.md).
//
// The "already published" guard lives inside publishToInstagram, so calling
// this on every copy addition is safe: only the first one gets through.
// The copies check here is an extra defensive guard, so a flow that ends up
// leaving no available copies never announces the book.
async function triggerInstagramPostIfEligible(book) {
  if (!book || !(book.copies > 0)) {
    logger.debug('no available copies, skipping', { bookId: book && String(book._id) });
    return;
  }
  await publishToInstagram(book);
}

module.exports = { triggerInstagramPostIfEligible };

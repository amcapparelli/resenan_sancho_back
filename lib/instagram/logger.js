'use strict';

// Single place to prefix and shape the Instagram autopost logs. Never log the
// access token: only the step, the book and the error message.
const PREFIX = '[instagram-autopost]';

function info(message, context = {}) {
  console.log(PREFIX, message, context);
}

function debug(message, context = {}) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  console.log(PREFIX, message, context);
}

function error(step, bookId, err) {
  console.error(PREFIX, 'error', {
    step,
    bookId: String(bookId),
    message: err && err.message ? err.message : String(err),
  });
}

module.exports = { info, debug, error };

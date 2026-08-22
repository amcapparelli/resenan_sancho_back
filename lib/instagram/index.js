'use strict';
const { getConfig } = require('./config');
const logger = require('./logger');
const { buildCaption } = require('./caption');
const { renderBookImage } = require('./image');
const { savePreview } = require('./preview');

// Fire-and-forget publication of a freshly created book to the official
// Instagram account. Never throws and never blocks the request that triggered
// it: every failure is logged and swallowed, same principle already applied to
// Mailchimp and the email transporter.
async function publishToInstagram(book) {
  const { enabled, dryRun, businessAccountId } = getConfig();

  if (!enabled) {
    logger.debug('feature disabled, skipping', { bookId: book && String(book._id) });
    return;
  }

  if (!book) {
    logger.debug('no book given, skipping');
    return;
  }

  if (book.instagramPostedAt) {
    logger.debug('book already posted, skipping', {
      bookId: String(book._id),
      instagramPostedAt: book.instagramPostedAt,
    });
    return;
  }

  try {
    const bookData = await buildBookData(book);
    logger.info('publishing book', { bookId: bookData.id, dryRun });

    const caption = buildCaption(bookData);
    const image = await renderBookImage(bookData);

    if (dryRun) {
      const previewPath = await savePreview(image, bookData.id);
      // Nothing was really published, so instagramPostedAt stays untouched.
      logger.info('dry run, nothing published', {
        bookId: bookData.id,
        previewPath,
        igUserId: businessAccountId,
        caption,
      });
      return;
    }

    // Step 4 of docs/instagram-autopost-spec.md (Cloudinary upload and Graph API
    // calls) is wired in from here.
  } catch (error) {
    logger.error('publish', book._id, error);
  }
}

// Flattens the book into the plain data the caption and the image need, with
// the author resolved to a display name.
async function buildBookData(book) {
  const populated = typeof book.populate === 'function'
    ? await book.populate({ path: 'author', select: 'name lastName' })
    : book;
  const author = populated.author && populated.author.name
    ? `${populated.author.name} ${populated.author.lastName || ''}`.trim()
    : null;

  return {
    id: String(populated._id),
    title: populated.title,
    author,
    genre: populated.genre,
    synopsis: populated.synopsis,
    cover: populated.cover,
    formats: Array.isArray(populated.formats) ? populated.formats : [],
  };
}

module.exports = { publishToInstagram, buildBookData };

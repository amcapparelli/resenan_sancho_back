'use strict';
const { getConfig } = require('./config');
const logger = require('./logger');
const { buildCaption } = require('./caption');
const { renderBookImage } = require('./image');
const { savePreview } = require('./preview');
const { uploadImage } = require('./cloudinary');
const { createMediaContainer, waitForContainer, publishContainer } = require('./graphApi');
const Book = require('../../models/book');

// Fire-and-forget publication of a freshly created book to the official
// Instagram account. Never throws and never blocks the request that triggered
// it: every failure is logged and swallowed, same principle already applied to
// Mailchimp and the email transporter.
async function publishToInstagram(book) {
  const { enabled, dryRun, businessAccountId, accessToken } = getConfig();

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

    if (!accessToken || !businessAccountId) {
      throw new Error('missing IG_PAGE_ACCESS_TOKEN or IG_BUSINESS_ACCOUNT_ID');
    }

    const imageUrl = await uploadImage(image, bookData.id);
    const containerId = await createMediaContainer({
      igUserId: businessAccountId,
      accessToken,
      imageUrl,
      caption,
    });
    await waitForContainer({ containerId, accessToken });
    const mediaId = await publishContainer({ igUserId: businessAccountId, accessToken, containerId });

    // Marked only after a real publication, so a retry never duplicates a post.
    const postedAt = new Date();
    await Book.updateOne({ _id: bookData.id }, { instagramPostedAt: postedAt });
    book.instagramPostedAt = postedAt;

    logger.info('published', { bookId: bookData.id, mediaId });
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

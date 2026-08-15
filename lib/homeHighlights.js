'use strict';
const Book = require('../models/book');

const TTL_MS = 24 * 60 * 60 * 1000;
const FEATURED_BOOKS_LIMIT = 4;
const TOP_GENRES_LIMIT = 3;

// Both blocks only count books that still have copies to give away: a book with
// copies: 0 is not orderable, so it should not be featured nor inflate a genre.
const AVAILABLE = { copies: { $gt: 0 } };

// Single cache entry, shared by every visitor (the home blocks are the same for
// everyone). Valid while the app runs on a single dyno — see docs/home-highlights-spec.md.
let cache = { data: null, expiresAt: 0 };
// De-duplicates concurrent misses so a cold cache triggers one round of queries,
// not one per in-flight request.
let inFlight = null;

// Top books by available copies. The author is flattened to a display string:
// the card only needs a name, and this keeps the payload free of user internals.
async function getFeaturedBooks() {
  const books = await Book
    .find(AVAILABLE)
    .sort({ copies: -1, create_at: -1 })
    .limit(FEATURED_BOOKS_LIMIT)
    .select('title genre copies')
    .populate('author', 'name lastName')
    .lean();

  return books.map((book) => ({
    id: String(book._id),
    title: book.title,
    author: book.author ? `${book.author.name} ${book.author.lastName}`.trim() : null,
    genre: book.genre,
    copies: book.copies,
  }));
}

// Genres with the most available books. `code` is the internal 3-letter genre
// code (utils/constants/genres.js); the frontend translates it to the Spanish
// label and the slug with the bidirectional table it already owns.
async function getTopGenres() {
  const genres = await Book.aggregate([
    { $match: AVAILABLE },
    { $group: { _id: '$genre', totalBooks: { $sum: 1 } } },
    { $sort: { totalBooks: -1, _id: 1 } },
    { $limit: TOP_GENRES_LIMIT },
  ]);

  return genres.map((genre) => ({
    code: genre._id,
    totalBooks: genre.totalBooks,
  }));
}

async function buildHighlights() {
  const [featuredBooks, topGenres] = await Promise.all([
    getFeaturedBooks(),
    getTopGenres(),
  ]);

  return {
    featuredBooks,
    topGenres,
    cachedAt: new Date().toISOString(),
  };
}

async function getHomeHighlights() {
  if (cache.data && Date.now() < cache.expiresAt) {
    return cache.data;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = buildHighlights()
    .then((data) => {
      cache = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    })
    .finally(() => {
      // On failure nothing is cached, so the next request retries.
      inFlight = null;
    });

  return inFlight;
}

// Not used by the API in v1 (there is no active invalidation yet). Kept as the
// hook for the future case described in the spec — invalidating on a confirmed
// promotion payment — and used by the tests to start from a cold cache.
function invalidateHomeHighlights() {
  cache = { data: null, expiresAt: 0 };
}

module.exports = { getHomeHighlights, invalidateHomeHighlights };

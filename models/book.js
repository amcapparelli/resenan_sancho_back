const mongoose = require('mongoose');

var Schema = mongoose.Schema;

const BookSchema = Schema({
  title: {
    type: String,
    index: true,
    required: true,
  },
  author: {
    type: Schema.ObjectId,
    ref: 'user',
    required: true,
  },
  editorial: {
    type: String,
  },
  synopsis: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    required: true,
  },
  cover: {
    type: String,
    required: true,
  },
  pages: {
    type: Number,
    required: true,
  },
  datePublished: {
    type: Date,
    required: true,
  },
  formats: {
    type: Array,
    required: true,
  },
  create_at: {
    type: Date,
    default: Date.now
  },
  copies: {
    type: Number,
    default: 0
  },
  freePromoAvailable: {
    type: Boolean,
    default: true
  },
  reviewersOrders: [{
    type: Schema.ObjectId,
    ref: 'user'
  }],
});

// Serves the home "featured books" query: match copies > 0, sort by copies desc
// (create_at only breaks ties, so the sort stays deterministic).
BookSchema.index({ copies: -1, create_at: -1 });
// Serves the home "top genres" aggregate: match copies > 0 and group by genre
// straight from the index, without fetching the documents.
BookSchema.index({ copies: 1, genre: 1 });

module.exports = mongoose.model('book', BookSchema);
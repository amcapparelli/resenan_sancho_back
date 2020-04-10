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
  }
});

module.exports = mongoose.model('book', BookSchema);
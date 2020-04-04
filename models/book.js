const mongoose = require('mongoose');

var Schema = mongoose.Schema;

const BookSchema = Schema({
  title: {
    type: String,
    index: true,
  },
  author: {
    type: Schema.ObjectId,
    ref: 'user'
  },
  editorial: {
    type: String,
  },
  sinopsis: {
    type: String,
    required: true
  },
  genre: {
    type: String,
  },
  cover: {
    type: String,
  },
  pages: {
    type: Number,
  },
  datePublished: {
    type: Date,
  },
  formats: {
    type: Array,
  },
});

module.exports = mongoose.model('book', BookSchema);
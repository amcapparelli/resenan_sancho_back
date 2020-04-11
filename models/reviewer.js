const mongoose = require('mongoose');

var Schema = mongoose.Schema;

const ReviewerSchema = Schema({
  author: {
    type: Schema.ObjectId,
    ref: 'user',
    required: true,
  },
  descripción: {
    type: String,
  },
  genres: {
    type: [String],
  },
  blog: {
    url: String,
    name: String,
  },
  booktube: {
    url: String,
    name: String,
  },
  bookstagram: {
    url: String,
    name: String,
  },
  goodreads: {
    url: String,
    name: String,
  },
  amazon: {
    url: String,
    name: String,
  }
});

ReviewerSchema.index({ genres: 1 });
ReviewerSchema.index({ 'blog.name': 1 });
module.exports = mongoose.model('reviewer', ReviewerSchema);
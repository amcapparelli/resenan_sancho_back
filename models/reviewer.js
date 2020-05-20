const mongoose = require('mongoose');

var Schema = mongoose.Schema;

const ReviewerSchema = Schema({
  author: {
    type: Schema.ObjectId,
    ref: 'user',
    required: true,
  },
  description: {
    type: String,
  },
  genres: {
    type: [String],
  },
  formats: {
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
  },
  create_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
});

ReviewerSchema.index({
  'blog.name': 'text',
  'booktube.name': 'text',
  'bookstagram.name': 'text',
  'goodreads.name': 'text',
  'amazon.name': 'text',
});
ReviewerSchema.index({ genres: 1 });
ReviewerSchema.index({ 'blog.name': 1 });
module.exports = mongoose.model('reviewer', ReviewerSchema);
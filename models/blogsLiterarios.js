const mongoose = require('mongoose');

var Schema = mongoose.Schema;

const BlogLiterarioSchema = Schema({
  aventura: {
    type: Boolean,
  },
  biografias: {
    type: Boolean,
  },
  cienciaficcion: {
    type: Boolean,
  },
  descripcion: {
    type: String,
  },
  dramapsicologico: {
    type: Boolean,
  },
  email: {
    type: String,
    index: true,
    unique: true,
    required: true
  },
  erotica: {
    type: Boolean,
  },
  escritoresindie: {
    type: Boolean,
  },
  Facebook: {
    type: String
  },
  fantasia: {
    type: Boolean,
  },
  fechaalta: {
    type: String,
  },
  ficcionhistorica: {
    type: Boolean,
  },
  formatos: {
    type: Array,
  },
  Goodreads: {
    type: String,
  },
  humor: {
    type: Boolean,
  },
  Instagram: {
    type: String,
  },
  juvenil: {
    type: Boolean,
  },
  nombre: {
    type: String,
  },
  nombrecanal: {
    type: String,
  },
  nombrepersona: {
    type: String,
  },
  novelanegra: {
    type: Boolean,
  },
  paraniños: {
    type: Boolean,
  },
  poesia: {
    type: Boolean,
  },
  policial: {
    type: Boolean,
  },
  romantica: {
    type: Boolean,
  },
  suspense: {
    type: Boolean,
  },
  thriller: {
    type: Boolean,
  },
  Twitter: {
    type: String,
  },
  url: {
    type: String,
  },
  urlcanal: {
    type: String,
  },
});


module.exports = mongoose.model('blogs_literarios', BlogLiterarioSchema);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

var Schema = mongoose.Schema;

const UserSchema = Schema({
  // País como código ISO 3166-1 alpha-2 en mayúsculas (p.ej. "ES", "MX").
  // Validación de FORMATO, no de lista cerrada: no se acopla el schema al
  // catálogo de países (ISO 3166 añade/retira códigos). La traducción código →
  // nombre vive en utils/constants/countries.js. Ver docs/country-iso-migration-spec.md.
  country: {
    type: String,
    uppercase: true,
    match: /^[A-Z]{2}$/,
  },
  name: {
    type: String,
    index: true,
  },
  email: {
    type: String,
    index: true,
    unique: true,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  emailAuthorListStatus: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  avatar: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastBookOrderAt: Date
});

UserSchema.statics.hashPassword = (plainPassword) => {
  return bcrypt.hash(plainPassword, 14);
};

// Cascade-delete a user's books and reviewer profile. Mongoose 7 removed
// Document.prototype.remove(), so this is document middleware on deleteOne()
// (triggered by `userDoc.deleteOne()`), not the old 'remove' hook.
UserSchema.pre('deleteOne', { document: true, query: false }, async function () {
  await this.model('book').deleteMany({ author: this._id });
  await this.model('reviewer').deleteMany({ author: this._id });
});

module.exports = mongoose.model('user', UserSchema);

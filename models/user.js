const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

var Schema = mongoose.Schema;

const UserSchema = Schema({
  country: String,
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
  created_at: {
    type: Date,
    default: Date.now
  },
  avatar: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

UserSchema.statics.hashPassword = (plainPassword) => {
  return bcrypt.hash(plainPassword, 14);
};

module.exports = mongoose.model('user', UserSchema);
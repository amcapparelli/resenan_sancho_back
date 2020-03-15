const mongoose = require('mongoose');
var Schema = mongoose.Schema;

const UserSchema = Schema({
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
  }
});

module.exports = mongoose.model('user', UserSchema);
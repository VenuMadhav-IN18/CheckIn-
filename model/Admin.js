const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    maxlength: 20
  },
  email_id: {
    type: String,
    unique: true,
    required: true,
    maxlength: 100
  },
  password: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Admin', adminSchema);
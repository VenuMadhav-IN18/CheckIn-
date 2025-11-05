const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  site_name: {
    type: String,
    unique: true,
    required: true,
    maxlength: 150
  },
  location: {
    type: String,
    maxlength: 255
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Site', siteSchema);
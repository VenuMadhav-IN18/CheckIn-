const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  worker_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  checkin_time: {
    type: Date
  },
  checkout_time: {
    type: Date
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);
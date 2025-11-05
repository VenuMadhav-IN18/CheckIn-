const mongoose = require('mongoose');
const Counter = require('./Counter'); // import the counter model

const workerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  employee_code: {
    type: String,
    unique: true,
    required: true,
    maxlength: 20
  },
  mobile: {
    type: String,
    maxlength: 15
  },
  site: {
    type: String,
    required: true,
    maxlength: 50
  },
  role: {
    type: String,
    required: true,
    maxlength: 30
  },
  pin_hash: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Inactive'],
    default: 'Pending'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  code: {
    type: Number,
    default: null
  }
});

// ✅ Pre-save hook to auto-increment the code
workerSchema.pre('save', async function (next) {
  const worker = this;

  // Only assign code if it's a new document
  if (worker.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'worker_code' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true } // create if not exists
    );
    worker.code = counter.seq;
  }

  next();
});

module.exports = mongoose.model('Worker', workerSchema);

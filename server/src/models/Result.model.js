const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  extractedData: {
    type: mongoose.Schema.Types.Mixed
  },
  estimatedCostUsd: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Result', resultSchema);

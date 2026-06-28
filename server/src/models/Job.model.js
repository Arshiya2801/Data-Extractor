const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'success', 'partial', 'failed'],
    default: 'pending'
  },
  documentType: {
    type: String
  },
  schemaUsed: {
    type: mongoose.Schema.Types.Mixed
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  error: {
    type: String
  }
});

module.exports = mongoose.model('Job', jobSchema);

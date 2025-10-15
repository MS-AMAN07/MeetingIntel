const mongoose = require('mongoose');

const actionItemSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    default: 'TBD'
  },
  deadline: {
    type: String,
    default: 'TBD'
  }
});

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  transcript: {
    type: String,
    default: ''
  },
  summary: {
    type: String,
    default: ''
  },
  keyDecisions: [{
    type: String
  }],
  actionItems: [actionItemSchema],
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  processedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Meeting', meetingSchema);
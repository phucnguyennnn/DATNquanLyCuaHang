const mongoose = require('mongoose');

const transferLogSchema = new mongoose.Schema({
  batch: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true 
  },
  quantity: {
    type: Number,
    required: true
  },
  transferredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transferredAt: {
    type: Date,
    default: Date.now
  },
  notes: String
});

module.exports = mongoose.model('TransferLog', transferLogSchema);
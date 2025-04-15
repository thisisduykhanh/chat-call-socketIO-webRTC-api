// models/Call.js
const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  type: { type: String, enum: ['audio', 'video'], required: true },
  startedAt: { type: Date },
  endedAt: { type: Date },
  status: { type: String, enum: ['missed', 'completed', 'cancelled'], default: 'completed' }
}, { timestamps: true });

module.exports = mongoose.model('Call', callSchema);

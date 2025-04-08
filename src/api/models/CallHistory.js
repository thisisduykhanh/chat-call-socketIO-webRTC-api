const CallHistorySchema = new mongoose.Schema({
    caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    callee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
    type: { type: String, enum: ['audio', 'video'] },
    status: {
      type: String,
      enum: ['missed', 'declined', 'ended'],
      default: 'missed',
    },
  
    startedAt: Date,
    endedAt: Date,
    duration: Number, // tính bằng giây
  
    createdAt: { type: Date, default: Date.now },
  });
  

  CallHistorySchema.index({ caller: 1, callee: 1, createdAt: -1 });
  CallSchema.index({ conversationId: 1 });
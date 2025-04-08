const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'emoji'],
      default: 'text',
    },
  
    content: { type: String },       // nội dung text hoặc emoji
    fileUrl: { type: String },       // url file, ảnh, video...
    mimeType: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
  
    // ✅ Tin nhắn được quote (nếu có)
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
  
    timestamp: { type: Date, default: Date.now },
  });
  
  MessageSchema.index({ sender: 1, receiver: 1, timestamp: -1 });
  MessageSchema.index({ conversationId: 1, timestamp: -1 }); // xem lịch sử chat mới nhất

  MessageSchema.index({ replyTo: 1 }); // nếu có chức năng trả lời tin nhắn cụ thể

  // MessageSchema.index({ isPinned: 1 }); // nếu hay lọc tin nhắn đã ghim
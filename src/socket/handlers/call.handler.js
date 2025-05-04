const calls = new Map();
const MAX_PARTICIPANTS = 8;

module.exports = (socket, io) => {
    // Khởi tạo cuộc gọi
  socket.on('start-call', ({ conversationId }) => {
    if (!calls.has(conversationId)) {
      calls.set(conversationId, { initiator: socket.userId, participants: new Set([socket.userId]) });
      socket.to(conversationId).emit('call-incoming', {
        initiatorId: socket.userId,
        conversationId,
      });
      console.log(`${socket.userId} started call in ${conversationId}`);
    } else {
      socket.emit('call-error', { message: 'A call is already in progress in this conversation.' });
    }
  });

  // Chấp nhận cuộc gọi
  socket.on('accept-call', ({ conversationId, toUserId }) => {
    const call = calls.get(conversationId);
    if (!call) {
      socket.emit('call-error', { message: 'No active call in this conversation.' });
      return;
    }
    if (call.participants.size >= MAX_PARTICIPANTS) {
      socket.emit('call-error', { message: 'Call is full (max 8 participants).' });
      return;
    }
    call.participants.add(socket.userId);
    io.to(conversationId).emit('user-joined-call', { userId: socket.userId });
    socket.emit('call-accepted', { toUserId });
    console.log(`${socket.userId} accepted call in ${conversationId}`);
  });

  // Từ chối cuộc gọi
  socket.on('reject-call', ({ conversationId }) => {
    io.to(conversationId).emit('call-rejected', { userId: socket.userId });
    console.log(`${socket.userId} rejected call in ${conversationId}`);
  });

  // Gửi offer WebRTC
  socket.on('call-offer', ({ toUserId, offer }) => {
    socket.to(toUserId).emit('call-offer', {
      fromUserId: socket.userId,
      offer,
    });
  });

  // Gửi answer WebRTC
  socket.on('call-answer', ({ toUserId, answer }) => {
    socket.to(toUserId).emit('call-answer', {
      fromUserId: socket.userId,
      answer,
    });
  });

  // Gửi ICE candidate
  socket.on('ice-candidate', ({ toUserId, candidate }) => {
    socket.to(toUserId).emit('ice-candidate', {
      fromUserId: socket.userId,
      candidate,
    });
  });

};
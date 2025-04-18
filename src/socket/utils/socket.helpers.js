const emitToConversation = (io, socket, conversationId, msg) => {

    io.to(conversationId).emit("message:new", msg);
  
    // Gửi lại cho người gửi, phòng trường hợp họ chưa join room.
    socket.emit("message:new", {
        message: msg,
        status: "sent",
      });
  };
  
  module.exports = {
    emitToConversation,
  };
  
const emitToConversation = ({io, socket, conversationId, receiverId, msg}) => {

    // tin nhắn 1:1
    if (receiverId && conversationId) {
      io.to(receiverId).emit("message:new", msg);
      socket.emit("message:new", {
        message: msg,
        status: "sent",
      });
    }

    // tin nhắn nhóm
    io.to(conversationId).emit("message:new", msg);    
  };
  
  module.exports = {
    emitToConversation,
  };
  
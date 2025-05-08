const emitToConversation = ({
	io,
	socket,
	conversationId,
	receiverId,
	msg,
	tempId,
}) => {
	// tin nhắn 1:1
	if (receiverId && conversationId) {
		io.to(receiverId).emit("message:new", msg);
		socket.emit("message:new", {
			message: msg,
			tempId: tempId,
		});
	}

	// tin nhắn nhóm
	// io.to(conversationId).emit("message:new", msg);
	socket.emit("message:new", {
		message: msg,
		tempId: tempId,
	});
};

module.exports = {
	emitToConversation,
};

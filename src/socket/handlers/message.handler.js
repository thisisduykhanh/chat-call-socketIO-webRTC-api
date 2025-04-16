const messageService = require('@/services/message.service');
const reactionService = require('@/services/reaction.service');
const pinnedMessageService = require('@/services/pinned.service');
// const reactionService = require('@/services/reaction.service');

module.exports = (socket, io) => {
    socket.on('message:send', async (payload) => {
		try {
			const message = await messageService.createMessage({
				sender: socket.user.id,
				...payload,
			});

			io.to(payload.conversationId).emit('message:new', message);
		} catch (err) {
			console.error(err);
			socket.emit('error', 'Không thể gửi tin nhắn');
		}
	});

	// remove message
	socket.on('message:delete', async ({ messageId }) => {
		try {
			await messageService.deleteMessage(messageId, socket.user.id);
			io.emit('message:deleted', { messageId });
		} catch (err) {
			console.error(err);
			socket.emit('error', 'Không thể xóa tin nhắn');
		}
	});

    // reaction
    socket.on('message:reaction', async ({ messageId, reaction }) => {
        try {
            await reactionService.createReaction({ messageId, userId: socket.user.id, reaction });
            io.emit('message:reacted', { messageId, reaction });
        } catch (err) {
            console.error(err);
            socket.emit('error', 'Không thể thêm phản ứng');
        }
    });

    socket.on('message:unreaction', async ({ messageId, reaction }) => {
        try {
            await reactionService.deleteReaction({ messageId, userId: socket.user.id });
            io.emit('message:unreacted', { messageId, reaction });
        } catch (err) {
            console.error(err);
            socket.emit('error', 'Không thể bỏ phản ứng');
        }
    });

    socket.on('message:getreaction', async ({ messageId }) => {
        try {
            const reactions = await reactionService.getReactionsForMessage(messageId);
            socket.emit('message:reactions', { messageId, reactions });
        } catch (err) {
            console.error(err);
            socket.emit('error', 'Không thể lấy phản ứng');
        }
    });

	// Ghim tin nhắn
	socket.on('message:pin', async ({ messageId, conversationId }) => {
		try {
			await pinnedMessageService.pinMessage(messageId, socket.user.id);
			io.to(conversationId).emit('message:pinned', { messageId });
		} catch (err) {
			socket.emit('error', 'Không thể ghim tin nhắn');
		}
	});

    socket.on('message:unpin', async ({ messageId, conversationId }) => {
        try {
            await pinnedMessageService.unpinMessage({ messageId, conversationId });
            io.to(conversationId).emit('message:unpinned', { messageId });
        } catch (err) {
            socket.emit('error', 'Không thể bỏ ghim tin nhắn');
        }
    });

    socket.on('message:getpin', async ({ conversationId }) => {
        try {
            const pinnedMessages = await pinnedMessageService.getPinnedMessages(conversationId);
            socket.emit('pinnedMessages', pinnedMessages);
        } catch (err) {
            socket.emit('error', 'Không thể lấy tin nhắn đã ghim');
        }
    });

  };
  
const ConversationService = require("~/api/services/conversation.service");
const {
    sendMulticastNotification,
} = require("~/utils/sendPushNotification.util");

const MessageService = require("~/api/services/message.service");



function getOnlineUserIdsExceptSelf(io, selfUserId) {
    return io.fetchSockets().then(sockets => {
        return new Set(
            sockets
              .filter(s => s.user && s.user.id !== selfUserId)
              .map(s => s.user.id)
        );
    });
}


const emitToConversation = async ({ io, socket, msg, tempId }) => {
    const { receiver, conversation, sender } = msg;

    const roomSockets = io.sockets.adapter.rooms.get(
        conversation._id.toString()
    );

    let receivers = [];

    if (roomSockets?.size > 1) {
        receivers = Array.from(roomSockets)
            .map((socketId) => io.sockets.sockets.get(socketId))
            .filter((socket) => socket?.user?.id && socket.user.id !== sender._id.toString())
            .map((socket) => socket.user.id);
    
        if (receivers.length > 0) {
            const updateMessage = await MessageService.updateStatusWhenInConversation(
                receivers,
                msg._id,
                'seen'
            );
            msg.status = updateMessage.status;
            msg.seenBy = updateMessage.seenBy;
        }
    } else {

        console.log("roomSockets", roomSockets);
        const users = await ConversationService.getUsersInPrivateConversations(socket.user.id);
        const userIds = users.map(user => user._id.toString());

        console.log("userIds", userIds);

        // Lọc ra các socket đang kết nối
        const connectedUserIds = await getOnlineUserIdsExceptSelf(io, socket.user.id);

        
        const onlineUserIds = userIds.filter(userId => connectedUserIds.has(userId));

        console.log("onlineUserIds", onlineUserIds);

        if (onlineUserIds.length > 0) {
            const updateMessage = await MessageService.updateStatusWhenInConversation(
                onlineUserIds,
                msg._id,
                'delivered'
            );
            msg.status = updateMessage.status;
        }

    }

    // tin nhắn 1:1
    if (receiver._id && conversation._id) {
        io.to(receiver._id.toString()).emit("message:new", { message: msg });
        socket.emit("message:new", {
            message: msg,
            tempId: tempId,
        });

        if (msg.status !== "seen") {
            await sendMulticastNotification([receiver._id.toString()], {
                title: sender?.name || "",
                body: msg.content,
                type: "message",
                data: {
                    conversationId: conversation._id.toString(),
                    displayName: sender?.name || "",
                    avatarUrl: sender?.avatarUrl || "",
                },
            });
        }

        console.log("message:new 1:1" + receiver._id);
    } else {
        const participants = await ConversationService.getAllParticipants(
            conversation._id
        );

        for (const participant of participants) {
            const participantId = participant._id.toString();
            if (participantId !== socket.user.id) {
                io.to(participantId).emit("message:new", {
                    message: msg,
                });
                console.log(
                    `Sent message to participant ${participantId} in conversation ${conversation._id}`
                );
            }
        }

        if (msg.seenBy && msg.seenBy.length > 0) {
            const seenByIds = msg.seenBy.map((seen) => seen.user.toString());
            const unseenParticipants = participants.filter(
                (participant) => !seenByIds.includes(participant._id.toString())
            );
            await sendMulticastNotification(
                unseenParticipants.map((p) => p._id.toString()),
                {
                    title: sender?.name || "",
                    body: msg.content,
                    type: "message",
                    data: {
                        conversationId: conversation._id.toString(),
                        displayName: sender?.name || "",
                        avatarUrl: sender?.avatarUrl || "",
                    },
                }
            );
        }

        await sendMulticastNotification(
            participants.map((p) => p._id.toString()),
            {
                title: "New message",
                body: msg.content,
                type: "message",
                data: {
                    conversationId: conversation._id.toString(),
                    displayName: conversation?.name || "",
                    avatarUrl: conversation?.avatarUrl || "",
                },
            }
        );

        socket.emit("message:new", {
            message: msg,
            tempId: tempId,
        });

        console.log("message:new group");
    }

    // tin nhắn nhóm
};

module.exports = {
    emitToConversation,
};

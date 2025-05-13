const ConversationService = require("~/api/services/conversation.service");
const {
    sendMulticastNotification,
} = require("~/utils/sendPushNotification.util");


const emitToConversation = async ({
    io,
    socket,
    msg,
    tempId,
}) => {

    const { receiver, conversation, sender } = msg;

    

    // tin nhắn 1:1
    if (receiver._id && conversation._id) {
        io.to(receiver._id.toString()).emit("message:new", { message: msg });
        socket.emit("message:new", {
            message: msg,
            tempId: tempId,
        });

        await sendMulticastNotification(
            [receiver._id.toString()],
            {
                title: sender?.name || '',
                body: msg.content,
                type: "message",
                data: {
                    conversationId: conversation._id.toString(),
                    displayName: sender?.name || '',
                    avatarUrl: sender?.avatarUrl || '',
                },
            }
        );

        console.log("message:new 1:1" + receiver._id);
    } else {

         const participants =
                      await ConversationService.getAllParticipants(
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

      await sendMulticastNotification(
            participants.map((p) => p._id.toString()),
            {
                title: "New message",
                body: msg.content,
                type: "message",
                data: {
                    conversationId: conversation._id.toString(),
                    displayName: conversation?.name || '',
                    avatarUrl: conversation?.avatarUrl || '',
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

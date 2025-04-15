
const messageService = require("@/services/message.service");
const pinnedMessageService = require("@/services/pinned.service");
const reactionService = require('@/services/reaction.service'); 

module.exports = {

    /**
     * * @description Create a new message
     * * @param {Object} req - The request object
     * * @param {Object} res - The response object
     * * @param {Function} next - The next middleware function
     * * @returns {Object} - The created message object
     * * @throws {Error} - If an error occurs while creating the message
     **/

    sendMessage: async (req, res, next) => {
        try {
            const { conversationId, sender, receiver, type, content } =
                req.body;

            const newMessage = await messageService.createMessage({
                conversationId,
                sender,
                receiver,
                type,
                content,
            });

            return res.status(201).json(newMessage);

        } catch (error) {
            next(error);
        }
    },

    /**
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     * @returns {Object} - The retrieved messages
     * @throws {Error} - If an error occurs while retrieving messages
     */

    getMessages: async (req, res, next) => {
        try {
            const { conversationId } = req.params;

            const messages = await messageService.getMessages(conversationId);
            return res.status(200).json(messages);
        } catch (error) {
            next(error);
        }
    },


    deleteMessage: async (req, res, next) => {
        try {
            const { messageId } = req.params;
            const result = await messageService.deleteMessage(messageId);
            return res.status(200).json(result);
        } catch (error) {
            return next(error);
        }
    },


    // Pin a message
    pinMessage: async (req, res, next) => {
        try {
            const { messageId } = req.params;
            const { userId } = req.body;
            const result = await pinnedMessageService.pinMessage(messageId, userId);
            return res.status(200).json(result);
        } catch (error) {
            return next(error);
        }
    },


    unpinMessage: async (req, res, next) => {
        try {
            const { conversationId, messageId } = req.body;
            await pinnedMessageService.unpinMessage({ conversationId, messageId });

            res.status(200).json({ success: true, message: "Message unpinned successfully." });
        } catch (error) {
            next(error);
        }
    },

    getPinnedMessages: async (req, res, next) => {
        try {
            const { conversationId } = req.params;
            const pinnedMessages = await pinnedMessageService.getPinnedMessages(conversationId);
            res.status(200).json(pinnedMessages);
        } catch (error) {
            next(error);
        }
    },

    // Reaction to a message
    createReaction: async (req, res, next) => {
        try {
          const { messageId, type } = req.body;
          const userId = req.user.id;
    
          const newReaction = await reactionService.createReaction({
            messageId,
            userId,
            type,
          });
    
          return res.status(201).json(newReaction);
        } catch (error) {
          next(error);
        }
      },
    
      getReactionsForMessage: async (req, res, next) => {
        try {
          const { messageId } = req.params;
    
          const reactions = await reactionService.getReactionsForMessage(messageId);
    
          return res.status(200).json(reactions);
        } catch (error) {
          next(error);
        }
      },
    
      deleteReaction: async (req, res, next) => {
        try {
          const { messageId } = req.params;
          const userId = req.user.id;  // Giả sử bạn đã lưu user trong req.user
    
          const deletedReaction = await reactionService.deleteReaction({
            messageId,
            userId,
          });
    
          return res.status(200).json(deletedReaction);
        } catch (error) {
          next(error);
        }
      },
};

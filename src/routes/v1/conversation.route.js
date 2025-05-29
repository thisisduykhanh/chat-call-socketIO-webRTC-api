const express = require("express");
const { getConversations, pinConversation, unpinConversation } = require("@/controllers/conversation.controller");
const { verifyAccessToken } = require("@/middleware/auth.middleware");

const {
	getMessagesByConversationId,
	getMediaByConversationId,
	deleteMessages
} = require("@/controllers/message.controller");

const router = express.Router();

router.get("/", verifyAccessToken, getConversations);

router.get("/messages", verifyAccessToken, getMessagesByConversationId);

router.get("/media/:conversationId", verifyAccessToken, getMediaByConversationId);

router.put("/pin", verifyAccessToken, pinConversation);

router.delete("/messages", verifyAccessToken, deleteMessages);

module.exports = router;

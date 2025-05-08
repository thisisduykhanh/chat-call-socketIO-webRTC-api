const express = require("express");
const { getConversations } = require("@/controllers/conversation.controller");
const { verifyAccessToken } = require("@/middleware/auth.middleware");

const {
	getMessagesByConversationId,
} = require("@/controllers/message.controller");

const router = express.Router();

router.get("/", verifyAccessToken, getConversations);

router.get("/messages", verifyAccessToken, getMessagesByConversationId);

module.exports = router;

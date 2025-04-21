const express = require("express");
const {getConversations} = require("@/controllers/conversation.controller");
const { verifyAccessToken } = require("@/middleware/auth.middleware");

const router = express.Router();

router.get("/", verifyAccessToken, getConversations);

module.exports = router;
// Initiate the express router
const authRouter = require("./auth.route");
const conversationRouter = require("./conversation.route");
const searchRouter = require("./search.route");

const express = require("express");
const router = express.Router();

router.use("/users", authRouter);
router.use("/conversations", conversationRouter);

router.use("/search", searchRouter);

module.exports = router;

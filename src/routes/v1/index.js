// Initiate the express router
const authRouter = require("./auth.route");
const conversationRouter = require("./conversation.route");

const express = require("express");
const router = express.Router();

router.use("/users", authRouter);
router.use("/conversations", conversationRouter);


module.exports = router;

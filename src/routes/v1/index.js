// Initiate the express router
const authRouter = require("./auth.route");
const conversationRouter = require("./conversation.route");
const searchRouter = require("./search.route");
const { verifyAccessToken } = require("@/middleware/auth.middleware");
const { handleFileUpload } = require("~/api/middleware/upload.middeware");
const { handleMulterErrors } = require("@/middleware/multer");
const { generateSignedUrl } = require("~/api/middleware/download.middeware");

const callRouter = require("./call.route");
const express = require("express");
const router = express.Router();

router.use("/users", authRouter);
router.use("/conversations", conversationRouter);

router.use("/search", searchRouter);
router.use("/calls", callRouter);

router.post(
	"/upload",
	verifyAccessToken,
	handleMulterErrors("files"),
	handleFileUpload,
);

router.get("/download/:fileId", verifyAccessToken, generateSignedUrl);

module.exports = router;

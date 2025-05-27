// Initiate the express router
const authRouter = require("./auth.route");
const conversationRouter = require("./conversation.route");
const searchRouter = require("./search.route");
const { verifyAccessToken } = require("@/middleware/auth.middleware");
const { handleFileUpload } = require("~/api/middleware/upload.middeware");
const { handleMulterErrors } = require("@/middleware/multer");
const { generateSignedUrl } = require("~/api/middleware/download.middeware");

const settingsRouter = require("./settings.route");

const axios = require("axios");
const cheerio = require("cheerio");

const callRouter = require("./call.route");
const express = require("express");
const router = express.Router();

router.use("/users", authRouter);
router.use("/conversations", conversationRouter);

router.use("/search", searchRouter);
router.use("/calls", callRouter);

router.use("/settings", settingsRouter);

router.post(
	"/upload",
	verifyAccessToken,
	handleMulterErrors("files"),
	handleFileUpload,
);

router.get("/download/:fileId", verifyAccessToken, generateSignedUrl);

router.get("/generateLinkPreview", async (req, res) => {
  const { url } = req.query;
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') ||
                        $('meta[property="og:description"]').attr('content');
    const image = $('meta[property="og:image"]').attr('content');

    res.json({ title, description, image, url });
  } catch (err) {
    res.status(400).json({ error: 'Không lấy được thông tin link.' });
  }
});

module.exports = router;

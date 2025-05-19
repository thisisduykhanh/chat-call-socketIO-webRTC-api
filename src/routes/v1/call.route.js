
const express = require("express");
const { getCallsHistory } = require("@/controllers/call.controller");
const { verifyAccessToken } = require("@/middleware/auth.middleware");
const router = express.Router();

router.get("/", verifyAccessToken, getCallsHistory);

module.exports = router;
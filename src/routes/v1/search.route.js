const {searchUsers, searchMessages} = require('@/controllers/search.controller');
const { verifyAccessToken } = require("@/middleware/auth.middleware");

const express = require("express");
const router = express.Router();

router.get('/users', verifyAccessToken, searchUsers);


router.get('/messages', verifyAccessToken, searchMessages);

module.exports = router;
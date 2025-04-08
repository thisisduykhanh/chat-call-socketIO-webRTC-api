// Initiate the express router
const authRouter = require("./auth.route");

const express = require("express");
const router = express.Router();

router.use("/users", authRouter);

module.exports = router;

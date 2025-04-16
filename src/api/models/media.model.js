const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
  fileUrl: { type: String, required: true },
  mimeType: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
}, { _id: false });

module.exports = MediaSchema;
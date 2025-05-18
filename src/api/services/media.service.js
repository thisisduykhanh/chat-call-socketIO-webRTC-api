const Message = require("@/models/message.model");
const CreateError = require("http-errors");

class MediaService {
    async getFileKeyFromFileId(fileId) {

        console.log("File ID:", fileId);

        const message = await Message.findOne(
            { "media.fileId": fileId },
            { "media.$": 1 }
        );


        if (!message || !message.media || !message.media[0]) {
            throw new Error("File not found");
        }

        const fileKey = message.media[0].fileKey;

        if (!fileKey || message.media[0].storage !== "cloudflare") {
            throw new CreateError.NotFound("File key not found.");
        }
        return fileKey;
    }
}

module.exports = new MediaService();

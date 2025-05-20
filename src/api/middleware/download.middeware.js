const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3Client = require("~/config/cloudflare"); // bạn đã có sẵn
const CreateError = require("http-errors");
const MediaService = require("@/services/media.service");

async function generateSignedUrl(req, res, next) {
	try {
		const { fileId } = req.params;

		// Lấy thông tin file từ DB

		const fileKey = await MediaService.getFileKeyFromFileId(fileId);

		console.log("File key:", fileKey);

		const command = new GetObjectCommand({
			Bucket: process.env.R2_BUCKET_NAME,
			Key: fileKey,
		});

		const signedUrl = await getSignedUrl(s3Client, command, {
			expiresIn: 60 * 5, // 5 phút
		});

		return res.json({
			success: true,
			url: signedUrl,
			expiresIn: 300,
		});
	} catch (error) {
		console.error("Generate signed URL error:", error);
		next(new CreateError.InternalServerError("Failed to generate signed URL."));
	}
}

module.exports = {
	generateSignedUrl,
};

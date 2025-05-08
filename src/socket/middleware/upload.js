const cloudinary = require("~/config/cloudinary");
// const { uploadFileToFirebaseStorage } = require("~/utils/firebaseStorage.util");
const streamifier = require("streamifier");

async function handleFileUpload(files) {
	try {
		const uploadedFiles = await Promise.all(
			files.map(async (file) => {
				const fileType = file.mimetype.split("/")[0];

				if (fileType === "image" || fileType === "video") {
					// Upload ảnh/video lên Cloudinary
					return new Promise((resolve, reject) => {
						const uploadStream = cloudinary.uploader.upload_stream(
							{
								folder: "uploads",
								resource_type: "auto",
							},
							(error, result) => {
								if (error) reject(error);
								resolve({
									// type: "cloudinary",
									fileUrl: result.secure_url,
									fileName: result.original_filename,
									fileSize: result.bytes,
									mimeType: file.mimetype,
									// resource_type: result.resource_type,
								});
							},
						);
						streamifier.createReadStream(file.buffer).pipe(uploadStream);
					});
				}
			}),
		);

		return uploadedFiles;
	} catch (error) {
		throw new Error(`File upload failed: ${error.message}`);
	}
}

module.exports = { handleFileUpload };

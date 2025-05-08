const multer = require("multer");
const cloudinary = require("~/config/cloudinary");
const { uploadFileToFirebaseStorage } = require("~/utils/firebaseStorage.util");
// const path = require("node:path");
// const fs = require("node:fs");
require("dotenv").config();
const streamifier = require("streamifier");

// Lưu file trên Cloudinary

// Lưu file trên ổ đĩa
// const localStorage = multer.diskStorage({
// 	destination: (req, file, cb) => {
// 		let uploadPath = "uploads";
// 		const fileType = file.mimetype.split("/")[0];

// 		if (fileType === "image") uploadPath = path.join(uploadPath, "image");
// 		else if (fileType === "video") uploadPath = path.join(uploadPath, "video");
// 		else uploadPath = path.join(uploadPath, "document");

// 		fs.mkdirSync(uploadPath, { recursive: true });
// 		cb(null, uploadPath);
// 	},
// 	filename: (req, file, cb) => {
// 		const date = new Date();
// 		const formattedDate = date
// 			.toISOString()
// 			.slice(0, 10) // Extracts YYYY-MM-DD
// 			.split("-")
// 			.reverse()
// 			.join("-"); // Converts to DD-MM-YYYY

// 		const uniqueTimestamp = Date.now();

// 		cb(null, `${formattedDate}_${uniqueTimestamp}_${file.originalname}`);
// 	},
// });

const fileFilter = (req, file, cb) => {
	const allowedTypes = [
		"image/jpeg",
		"image/png",
		"video/mp4",
		"application/pdf",
		"application/msword",
		"application/vnd.ms-excel",
		"text/plain",
		"application/zip",
		"application/x-rar-compressed",
	];

	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		console.warn(
			`⚠️ File rejected: ${file.originalname} (Type: ${file.mimetype})`,
		);
		// cb(null, false);
		cb(new Error("File type not allowed"), false);
	}
};

// const uploadLocal = multer({ storage: localStorage, fileFilter });

// const uploadMiddleware = (req, res, next) => {
// 	uploadLocal.array("files", 5)(req, res, (err) => {
// 		if (err) {
// 			return res.status(400).json({ message: err.message });
// 		}
// 		if (!req.files || req.files.length === 0) {
// 		    return res.status(400).json({ message: 'No files uploaded or file type not allowed' });
// 		}
// 		next();
// 	});
// };

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
	fileFilter: fileFilter,
});

const uploadMiddleware = () => {
	return (req, res, next) => {
		upload.array("files", 5)(req, res, async (err) => {
			if (err) {
				return res.status(400).json({ message: err.message });
			}

			if (!req.files || req.files.length === 0) {
				return res
					.status(400)
					.json({ message: "No files uploaded or file type not allowed" });
			}

			try {
				const uploadResults = await Promise.all(
					req.files.map((file) => {
						const fileType = file.mimetype.split("/")[0];

						if (fileType === "image" || fileType === "video") {
							return new Promise((resolve, reject) => {
								const uploadStream = cloudinary.uploader.upload_stream(
									{
										folder: "uploads",
										resource_type: "auto",
									},
									(error, result) => {
										if (error) {
											reject(error);
										} else {
											resolve({
												type: "cloudinary",
												url: result.secure_url,
												resource_type: result.resource_type,
											});
										}
									},
								);
								streamifier.createReadStream(file.buffer).pipe(uploadStream);
							});
						}
						// Document file
						return uploadFileToFirebaseStorage(file);
					}),
				);

				req.uploadedFiles = uploadResults; // Gán vào req để dùng ở controller
				next();
			} catch (error) {
				console.error(error);
				return res.status(500).json({ message: error.message });
			}
		});
	};
};

module.exports = { uploadMiddleware };

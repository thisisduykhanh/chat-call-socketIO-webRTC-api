const multer = require("multer");
const { uploadFileToFirebaseStorage } = require("~/utils/firebaseStorage.util");
// const path = require("node:path");
// const fs = require("node:fs");
require("dotenv").config();
const CreateError = require("http-errors");

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

// File size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

// Allowed file types with their MIME types
const ALLOWED_FILE_TYPES = {
	image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
	video: ["video/mp4", "video/webm", "video/quicktime"],
	document: [
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	],
	spreadsheet: [
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	],
	text: ["text/plain", "text/csv"],
	archive: [
		"application/zip",
		"application/x-rar-compressed",
		"application/x-7z-compressed",
	],
};

const fileFilter = (req, file, cb) => {
	const allowedTypes = Object.values(ALLOWED_FILE_TYPES).flat();

	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new CreateError(400, `File type ${file.mimetype} not allowed`), false);
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
	limits: {
		fileSize: MAX_FILE_SIZE,
		files: MAX_FILES,
	},
	fileFilter: fileFilter,
});

const uploadMiddleware = () => {
	return (req, res) => {
		upload.array("files", MAX_FILES)(req, res, async (err) => {
			if (err instanceof multer.MulterError) {
				if (err.code === "LIMIT_FILE_SIZE") {
					return res.status(400).json({
						message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
					});
				}
				if (err.code === "LIMIT_FILE_COUNT") {
					return res.status(400).json({
						message: `Maximum ${MAX_FILES} files allowed`,
					});
				}
				return res.status(400).json({ message: err.message });
			}
			if (err) {
				return res.status(400).json({ message: err.message });
			}

			if (!req.files || req.files.length === 0) {
				return res.status(400).json({
					message: "No files uploaded or file type not allowed",
				});
			}
		});
	};
};

module.exports = uploadMiddleware;

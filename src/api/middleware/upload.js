const multer = require('multer');
// const cloudinary = require('cloudinary').v2;
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Cấu hình Cloudinary
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });

// Lưu file trên Cloudinary
// const cloudStorage = new CloudinaryStorage({
//     cloudinary,
//     params: {
//         folder: 'chat-media',
//         resource_type: 'auto'
//     }
// });

// Lưu file trên ổ đĩa
const localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'uploads';
        const fileType = file.mimetype.split('/')[0];

        if (fileType === 'image') uploadPath = path.join(uploadPath, 'image');
        else if (fileType === 'video')
            uploadPath = path.join(uploadPath, 'video');
        else uploadPath = path.join(uploadPath, 'document');

        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const date = new Date();
        const formattedDate = date
            .toISOString()
            .slice(0, 10) // Extracts YYYY-MM-DD
            .split('-')
            .reverse()
            .join('-'); // Converts to DD-MM-YYYY

        const uniqueTimestamp = Date.now();

        cb(null, `${formattedDate}_${uniqueTimestamp}_${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'video/mp4',
        'application/pdf',
        'application/msword',
        'application/vnd.ms-excel',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.warn(
            `⚠️ File rejected: ${file.originalname} (Type: ${file.mimetype})`,
        );
        // cb(null, false);
        cb(new Error('File type not allowed'), false);
    }
};
const uploadLocal = multer({ storage: localStorage, fileFilter });
// const uploadCloud = multer({ storage: cloudStorage, fileFilter });


const uploadMiddleware = (req, res, next) => {
    uploadLocal.array('files', 5)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        // if (!req.file) {
        //     return res.status(400).json({ message: 'No file uploaded or file type not allowed' });
        // }
        next();
    });

};


module.exports = { uploadMiddleware };

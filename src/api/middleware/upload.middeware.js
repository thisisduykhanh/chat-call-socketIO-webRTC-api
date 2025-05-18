const cloudinary = require("~/config/cloudinary");
const streamifier = require("streamifier");
const CreateError = require("http-errors");
const s3Client = require("~/config/cloudflare");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid');
const path = require("path");

// Supported MIME types for validation
const allowedMimeTypes = [
    "application/pdf", // PDF
    "application/vnd.ms-excel", // Excel (.xls)
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel (.xlsx)
    "text/csv", // CSV
    "text/tab-separated-values", // TSV
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
    "application/zip", // ZIP
    "audio/mpeg", // MP3
    "audio/mp4", // M4A (also covers audio/m4a)
];

async function handleFileUpload(req, res, next) {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            throw new CreateError.BadRequest("No files uploaded.");
        }

        const uploadedFiles = await Promise.all(
            files.map(async (file) => {
                const { mimetype, buffer, originalname, size } = file;

                const fileId = uuidv4();
                

                if (
                    !allowedMimeTypes.includes(mimetype) &&
                    !mimetype.startsWith("image/") &&
                    !mimetype.startsWith("video/")
                ) {
                    throw new CreateError.BadRequest(
                        `Unsupported file type: ${mimetype}`
                    );
                }

                if (
                    mimetype.startsWith("image/") ||
                    mimetype.startsWith("video/")
                ) {
                    // Upload to Cloudinary
                    return await uploadToCloudinary(buffer, mimetype, fileId);
                } else {
                    // Upload to Cloudflare R2
                    return await uploadToCloudflareR2(
                        buffer,
                        mimetype,
                        originalname,
                        size,
                        fileId
                    );
                }
            })
        );

        res.json({ success: true, files: uploadedFiles });
    } catch (error) {
        console.error("Upload error:", error);
        next(new CreateError.InternalServerError("File upload failed."));
    }
}

async function uploadToCloudinary(buffer, mimetype, fileId) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "uploads",
                resource_type: "auto",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    storage: "cloudinary",
                    fileId: fileId,
                    fileUrl: result.secure_url,
                    fileName: result.original_filename,
                    fileSize: result.bytes,
                    mimeType: mimetype,
                });
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

async function uploadToCloudflareR2(buffer, mimetype, originalname, size, fileId) {
    const timestamp = Date.now();
    const sanitizedFileName = originalname.replace(/\s+/g, "_");
    const fileKey = `uploads/${timestamp}_${sanitizedFileName}`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: buffer,
        ContentType: mimetype,
    });

    await s3Client.send(command);

    // const fileUrl = `${process.env.R2_PUBLIC_URL}/${fileKey}`;

    return {
        storage: "cloudflare",
        fileId: fileId,
        fileKey: fileKey,
        fileName: originalname,
        fileSize: size,
        mimeType: mimetype,
    };
}

module.exports = { handleFileUpload };

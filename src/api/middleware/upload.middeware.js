const cloudinary = require("~/config/cloudinary");
const streamifier = require("streamifier");
const sharp = require("sharp");
const { encode } = require("blurhash");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const CreateError = require("http-errors");
const s3Client = require("~/config/cloudflare");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { tmpdir } = require("os");
const fs = require("fs");

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
                    return await uploadToCloudinary(
                        buffer,
                        mimetype,
                        fileId,
                        originalname
                    );
                }
                // Upload to Cloudflare R2
                return await uploadToCloudflareR2(
                    buffer,
                    mimetype,
                    originalname,
                    size,
                    fileId
                );
            })
        );

        console.log("Uploaded files:", uploadedFiles);

        res.json({ success: true, files: uploadedFiles });
    } catch (error) {
        console.error("Upload error:", error);
        next(new CreateError.InternalServerError("File upload failed."));
    }
}
async function uploadToCloudinary(buffer, mimetype, fileId, originalname) {
    const isImage = mimetype.startsWith("image");
    const isVideo = mimetype.startsWith("video");

    // Tạo BlurHash (cho ảnh hoặc thumbnail video)
    let blurHash = null;
    if (isImage) {
        blurHash = await generateBlurHash(buffer);
    } else if (isVideo) {
        try {
            const thumbnailBuffer = await extractVideoThumbnail(buffer, fileId);
            blurHash = await generateBlurHash(thumbnailBuffer);

            console.log("Video thumbnail buffer size:", thumbnailBuffer.length);
            console.log("BlurHash for video thumbnail:", blurHash);
        } catch (error) {
            console.error("Error generating video thumbnail:", error);
        }
    }

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
                    fileName: originalname,
                    fileSize: result.bytes,
                    mimeType: mimetype,
                    blurHash: blurHash,
                });
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

async function uploadToCloudflareR2(
    buffer,
    mimetype,
    originalname,
    size,
    fileId
) {
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

async function generateBlurHash(buffer) {
    try {
        // Dùng sharp để lấy dữ liệu ảnh (width, height, pixels)
        const { data, info } = await sharp(buffer)
            .raw()
            .ensureAlpha()
            .toBuffer({ resolveWithObject: true });

        // Tạo BlurHash với componentX=4, componentY=3 (độ chi tiết trung bình)
        const blurHash = encode(
            new Uint8ClampedArray(data),
            info.width,
            info.height,
            4,
            3
        );
        return blurHash;
    } catch (error) {
        console.error("Error generating BlurHash:", error);
        return null; // Trả về null nếu lỗi
    }
}

function extractVideoThumbnail(videoBuffer, fileId) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(tmpdir(), `${fileId}-video.mp4`);
        const outputPath = path.join(tmpdir(), `${fileId}-thumbnail.jpg`);
        fs.writeFileSync(inputPath, videoBuffer);

        ffmpeg(inputPath)
            .screenshots({
                timestamps: ["00:00:01"],
                filename: path.basename(outputPath),
                folder: path.dirname(outputPath),
                size: "320x240",
            })
            .on("end", () => {
                const thumbnailBuffer = fs.readFileSync(outputPath);
                // Cleanup temp files
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(thumbnailBuffer);
            })
            .on("error", (err) => {
                console.error("FFmpeg error:", err);
                fs.unlinkSync(inputPath);
                reject(err);
            });
    });
}

module.exports = { handleFileUpload };

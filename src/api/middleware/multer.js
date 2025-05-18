const multer = require("multer");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

function handleMulterErrors(fieldName) {
    return (req, res, next) => {
        upload.array(fieldName)(req, res, (err) => {
            if (err) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    console.warn("[Multer] File too large:", err);
                    return res.status(413).json({
                        success: false,
                        message: "File too large. Maximum size is 100MB.",
                    });
                }

                console.error("[Multer] Upload error:", err);
                return res.status(400).json({
                    success: false,
                    message: err.message || "File upload error",
                });
            }

            next(); // không lỗi thì tiếp tục
        });
    };
}

module.exports = { handleMulterErrors };

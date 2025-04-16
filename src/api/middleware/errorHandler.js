module.exports = (err, req, res, next) => {
    console.error(`[Error]`, err.status, err.message);

    const status = err.status || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({
        status,
        message,
    });
};

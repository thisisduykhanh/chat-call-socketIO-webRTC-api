const { signRefreshToken, verifyToken } = require("~/api/auth/jwt");

const CreateError = require("http-errors");
const { setAsync, getAsync, delAsync } = require("~/config/redis");
const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

// Refresh token service
const createRefreshToken = async (payload) => {
    try {
        if (!payload.id) {
            return CreateError.BadRequest("User ID is required");
        }

        if (!payload.username) {
            return CreateError.BadRequest("User Name is required");
        }

        const refreshToken = signRefreshToken(payload);

        await delAsync(`refresh_token:${payload.id}`); // Xóa refresh token cũ nếu có

        await setAsync(
            `refresh_token:${payload.id}`,
            refreshToken,
            { EX: ONE_YEAR_IN_SECONDS }
        ); // Hết hạn sau 7 ngày

       
        return refreshToken;
    } catch (error) {
        return CreateError.InternalServerError(error.message);
    }
};

// Verify refresh token
const verifyAndRefreshToken = async (token) => {
    try {
        const decoded = verifyToken(token);

        const storedToken = await getAsync(`refresh_token:${decoded.id}`);

        if (!storedToken || storedToken !== token) {
            return {
                success: false,
                error: "Invalid or expired refresh token",
            };
        }

        return { success: true, decoded };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = {
    createRefreshToken,
    verifyAndRefreshToken,
};

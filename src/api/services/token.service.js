const { signRefreshToken, verifyToken } = require("~/api/auth/jwt");
const crypto = require("crypto");
const CreateError = require("http-errors");
const { setAsync, getAsync, delAsync } = require("~/config/redis");
const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

// Refresh token service
const createRefreshToken = async (payload) => {
    try {
        if(!payload.sessionId)
            payload.sessionId = crypto.randomUUID();
            
        if (!payload.id) {
            throw CreateError.BadRequest("User ID is required");
        }

        if (!payload.username) {
            throw CreateError.BadRequest("User Name is required");
        }

        // Cannot delete refresh token when user is logged in to much
        // await delAsync(`refresh_token:${payload.id}:${sessionId}`);

        const refreshToken = signRefreshToken(payload);

        await setAsync(
            `refresh_token:${payload.id}:${payload.sessionId}`,
            refreshToken,
             ONE_YEAR_IN_SECONDS 
        ); // Hết hạn sau 1 năm

       
        return {
            refreshToken,
            sessionId: payload.sessionId,
        };
    } catch (error) {
        throw CreateError.InternalServerError(error.message);
    }
};

// Verify refresh token
const verifyAndRefreshToken = async (token) => {
    try {
        const decoded = verifyToken(token);

        const storedToken = await getAsync(`refresh_token:${decoded.id}:${decoded.sessionId}`);

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

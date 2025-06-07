
const UserSettingsService = require("@/services/user.settings.service");

module.exports = (socket, io) => {
    socket.on('block:user', ({ blockedUserId }) => {
        io.to(blockedUserId).emit('user:blocked', { blockedUserId: socket.user.id });
    });

    socket.on('unblock:user', ({ unblockedUserId }) => {
        io.to(unblockedUserId).emit('user:unblocked', { unblockedUserId: socket.user.id });
    });
}

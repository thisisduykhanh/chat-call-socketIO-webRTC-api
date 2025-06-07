

module.exports = (socket, io) => {
    socket.on('block:user', ({ blockedUserId }) => {
        socket.to(blockedUserId).emit('user:blocked', { blockedUserId: socket.user.id });
    });

    socket.on('unblock:user', ({ unblockedUserId }) => {
        socket.to(unblockedUserId).emit('user:unblocked', { unblockedUserId: socket.user.id });
    });
}

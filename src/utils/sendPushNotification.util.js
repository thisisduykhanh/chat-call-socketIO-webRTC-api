const admin = require("~/config/firebase-admin");
const { getAsync, delAsync } = require("~/config/redis");


const sendMulticastNotification = async (toUserIds, message) => {
    try {
        const tokens = await Promise.all(
            toUserIds.map(async (id) => ({
                userId: id,
                token: await getAsync(`user:${id}:fcmToken`),
            }))
        );

        const validTokens = tokens.filter(t => t.token).map(t => t.token);
        const invalidUsers = tokens.filter(t => !t.token).map(t => t.userId);

        if (invalidUsers.length > 0) {
            console.log(`Users not registered for push notifications: ${invalidUsers.join(', ')}`);
        }

        if (validTokens.length === 0) {
            console.log('No valid tokens to send push notifications');
            return;
        }


        console.log(`Message: ${JSON.stringify(message)}`);        
        console.log(`Notifying ${toUserIds.length} users`);



        const isCall = message.type === 'call';

        const baseNotification  = {
            ...(isCall
                ? {} // Nếu là cuộc gọi thì không gửi notification
                : {
                    notification: {
                      title: message.title,
                      body: message.body,
                    },
                  }),
            data: {
                type: message.type,
                ...(message.data || {}),
            },
            android: {
                priority: 'high',
                ...(isCall
                    ? {}
                    : {
                        notification: {
                            sound: 'call_ringtone',
                            channelId: 'call_notifications',
                        },
                    }),
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'call_ringtone.wav',
                        'mutable-content': 1,
                    },
                },
            },
        };

        // Dùng sendEachForMulticast cho phiên bản mới
        const messages = validTokens.map(token => ({
            ...baseNotification ,
            token,
        }));

        const response = await admin.messaging().sendEach(messages);
        console.log(`Multicast push notification sent for ${message}`, {
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses: response.responses,
        });

        // Xử lý token không hợp lệ
        if (response.failureCount > 0) {
            response.responses.forEach(async (res, index) => {
                if (!res.success && res.error) {
                    const error = res.error;
                    if (error.code === 'messaging/invalid-registration-token' || 
                        error.code === 'messaging/registration-token-not-registered') {
                        const invalidUserId = tokens[index].userId;
                        await delAsync(`user:${invalidUserId}:fcmToken`);
                        console.log(`Removed invalid fcmToken for user ${invalidUserId}`);
                    }
                }
            });
        }
    } catch (error) {
        console.error(`Error sending multicast push notification for call ${message.callId}:`, error);
    }
};


module.exports = {

    sendMulticastNotification,
};
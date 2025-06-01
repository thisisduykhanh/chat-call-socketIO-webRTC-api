const admin = require("~/config/firebase-admin");
const { getAsync, delAsync } = require("~/config/redis");
// const apnProvider = require("~/config/apn.config");
// const apn = require("apn");

const sendFCMNotification = async ({ androidTokens, message, tokens }) => {
    try {
        const isCall = message.type === "call";

        const baseNotification = {
            ...(isCall
                ? {}
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
                priority: "high",
                ...(isCall
                    ? {}
                    : {
                          notification: {
                              sound: "call_ringtone",
                              channelId: "call_notifications",
                          },
                      }),
            },
        };

        // const messages = androidTokens.map((token) => ({
        //     ...baseNotification,
        //     token,
        // }));

		const multicastMessage = {
			tokens: androidTokens,
			...baseNotification
		}
		
		const response = await admin.messaging().sendEachForMulticast(multicastMessage);

        console.log(`Gửi thông báo FCM cho Android:`, {
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses: response.responses,
        });

        // Xử lý token không hợp lệ
        const invalidTokens = [];
        if (response.failureCount > 0) {
            response.responses.forEach((res, index) => {
                if (!res.success && res.error) {
                    const error = res.error;
                    if (
                        error.code === "messaging/invalid-registration-token" ||
                        error.code === "messaging/registration-token-not-registered"
                    ) {
                        const invalidUserId = tokens.find((t) => t.token === androidTokens[index])?.userId;
                        if (invalidUserId) {
                            invalidTokens.push({ userId: invalidUserId, token: androidTokens[index] });
                        }
                    }
                }
            });

            // Xóa token không hợp lệ
            await Promise.all(
                invalidTokens.map(async ({ userId }) => {
                    await delAsync(`user:${userId}:fcmToken`);
                    console.log(`Xóa token FCM không hợp lệ cho người dùng ${userId}`);
                })
            );
        }

        return { successCount: response.successCount, failureCount: response.failureCount, invalidTokens };
    } catch (error) {
        console.error(`Lỗi gửi thông báo FCM cho call ${message.callId || "unknown"}:`, error);
        return { successCount: 0, failureCount: androidTokens.length, invalidTokens: [] };
    }
};

// const sendVoIPNotification = async ({ iosTokens, message }) => {
//     try {
//         const isCall = message.type === "call";

//         const promises = iosTokens.map(async ({ userId, token }) => {
//             const notification = new apn.Notification();

//             if (isCall) {
//                 // VoIP notification cho cuộc gọi
//                 notification.pushType = "voip";
//                 notification.topic = process.env.APNS_VOIP_TOPIC || "com.yourapp.voip"; // Lấy từ biến môi trường
//                 notification.payload = {
//                     callerId: message.data?.callerId || "unknown",
//                     callId: message.callId || Date.now().toString(),
//                     type: "call",
//                 };
//             } else {
//                 // Thông báo thông thường
//                 notification.pushType = "alert";
//                 notification.topic = process.env.APNS_TOPIC || "com.yourapp"; // Lấy từ biến môi trường
//                 notification.alert = {
//                     title: message.title || "Thông báo mới",
//                     body: message.body || "Bạn có thông báo mới",
//                 };
//                 notification.badge = 1; // Thêm badge nếu cần
//                 notification.sound = "call_ringtone.wav";
//                 notification.mutableContent = 1;
//                 notification.payload = {
//                     type: message.type,
//                     ...message.data,
//                 };
//             }

//             notification.priority = 10;
//             notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Hết hạn sau 1 giờ

//             try {
//                 const result = await apnProvider.send(notification, token);
//                 if (result.failed.length > 0) {
//                     console.log(`Lỗi gửi APNS cho người dùng ${userId}:`, result.failed);
//                     if (
//                         result.failed[0].response?.reason === "BadDeviceToken" ||
//                         result.failed[0].response?.reason === "Unregistered"
//                     ) {
//                         await delAsync(`user:${userId}:fcmToken`);
//                         console.log(`Xóa token APNS không hợp lệ cho người dùng ${userId}`);
//                         return { userId, success: false };
//                     }
//                 } else {
//                     console.log(`Gửi thông báo APNS thành công cho người dùng ${userId}`);
//                     return { userId, success: true };
//                 }
//             } catch (error) {
//                 console.error(`Lỗi gửi APNS cho người dùng ${userId}:`, error);
//                 return { userId, success: false };
//             }
//         });

//         const results = await Promise.all(promises);
//         const successCount = results.filter((r) => r.success).length;
//         const failureCount = results.length - successCount;
//         const invalidTokens = results.filter((r) => !r.success).map((r) => ({ userId: r.userId }));

//         return { successCount, failureCount, invalidTokens };
//     } catch (error) {
//         console.error(`Lỗi gửi thông báo VoIP cho call ${message.callId || "unknown"}:`, error);
//         return { successCount: 0, failureCount: iosTokens.length, invalidTokens: iosTokens };
//     }
// };

const sendMulticastNotification = async (toUserIds, message) => {
    try {
        if (toUserIds.length === 0) {
            console.log("Không có người dùng để gửi thông báo");
            return { success: false, message: "No users to notify" };
        }

        // Lấy token và kiểm tra nền tảng (Android/iOS)
        const tokens = await Promise.all(
            toUserIds.map(async (id) => ({
                userId: id,
                token: await getAsync(`user:${id}:fcmToken`),
                platform: await getAsync(`user:${id}:platform`), // Lưu nền tảng (android/ios) trong Redis
            }))
        );

        const androidTokens = tokens
            .filter((t) => t.platform === "android" && t.token)
            .map((t) => t.token);
        const iosTokens = tokens
            .filter((t) => t.platform === "ios" && t.token)
            .map((t) => ({ userId: t.userId, token: t.token }));
        const invalidUsers = tokens
            .filter((t) => !t.token)
            .map((t) => t.userId);

        console.log(`Token Android: ${androidTokens.length}, Token iOS: ${iosTokens.length}, Người dùng không hợp lệ: ${invalidUsers}`);

        if (invalidUsers.length > 0) {
            console.log(`Người dùng không đăng ký thông báo: ${invalidUsers.join(", ")}`);
        }

        if (androidTokens.length === 0 && iosTokens.length === 0) {
            console.log("Không có token hợp lệ để gửi thông báo");
            return { success: false, message: "No valid tokens" };
        }

        const results = { android: null, ios: null };

        // Gửi thông báo cho iOS
        // if (iosTokens.length > 0) {
        //     results.ios = await sendVoIPNotification({ iosTokens, message });
        // }

        // Gửi thông báo cho Android
        if (androidTokens.length > 0) {
            results.android = await sendFCMNotification({ androidTokens, message, tokens });
        }

        // Tổng hợp kết quả
        const totalSuccess = (results.android?.successCount || 0) + (results.ios?.successCount || 0);
        const totalFailure = (results.android?.failureCount || 0) + (results.ios?.failureCount || 0);

        console.log(`Kết quả gửi thông báo: Thành công=${totalSuccess}, Thất bại=${totalFailure}`);

        return {
            success: totalSuccess > 0,
            message: `Gửi thông báo hoàn tất: ${totalSuccess} thành công, ${totalFailure} thất bại`,
            details: results,
        };
    } catch (error) {
        console.error(`Lỗi gửi thông báo multicast:`, error);
        return { success: false, message: "Lỗi hệ thống khi gửi thông báo", error };
    }
};

module.exports = {
    sendMulticastNotification,
};
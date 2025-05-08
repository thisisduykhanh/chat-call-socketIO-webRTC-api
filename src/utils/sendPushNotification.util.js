const admin = require("~/config/firebase-admin");
const { getAsync, delAsync } = require("~/config/redis");

const sendPushNotification = async (toUserId, message) => {
	try {
		const userToken = await getAsync(`user:${toUserId}:fcmToken`);
		if (userToken) {
			const response = await admin.messaging().send({
				token: userToken,
				notification: {
					title: message.title,
					body: message.body,
				},
			});
			console.log(`Push notification sent to user ${toUserId}: ${response}`);
		} else {
			console.log(`User ${toUserId} not registered for push notifications`);
		}
	} catch (error) {
		console.error(
			`Error sending push notification to user ${toUserId}:`,
			error,
		);
	}
};

const sendCallNotification = async (toUserId, message) => {
	try {
		const userToken = await getAsync(`user:${toUserId}:fcmToken`);
		if (!userToken) {
			console.log(`User ${toUserId} not registered for push notifications`);
			return;
		}

		const callData = {
			notification: {
				title: message.title,
				body: message.body,
			},
			data: {
				type: "call",
				call_id: message.callId,
				caller_name: message.callerName,
				caller_id: message.callerId,
				user_id: message.userId,
				conversation_id: message.conversationId,
				avatar_url: message.avatarUrl || "",
			},
			token: userToken,
			android: {
				priority: "high",
				notification: {
					sound: "call_ringtone",
					channelId: "call_notifications",
				},
			},
			apns: {
				payload: {
					aps: {
						sound: "call_ringtone.wav",
						"mutable-content": 1,
					},
				},
			},
		};

		const response = await admin.messaging().send(callData);
		console.log(
			`Push notification sent to user ${toUserId} for call ${message.callId}: ${response}`,
		);
	} catch (error) {
		console.error(
			`Error sending push notification to user ${toUserId} for call ${message.callId}:`,
			error,
		);
		if (
			error.code === "messaging/invalid-registration-token" ||
			error.code === "messaging/registration-token-not-registered"
		) {
			await delAsync(`user:${toUserId}:fcmToken`);
			console.log(`Removed invalid fcmToken for user ${toUserId}`);
		}
	}
};

const sendCallNotificationMulticast = async (toUserIds, message) => {
	try {
		const tokens = await Promise.all(
			toUserIds.map(async (id) => ({
				userId: id,
				token: await getAsync(`user:${id}:fcmToken`),
			})),
		);

		const validTokens = tokens.filter((t) => t.token).map((t) => t.token);
		const invalidUsers = tokens.filter((t) => !t.token).map((t) => t.userId);

		if (invalidUsers.length > 0) {
			console.log(
				`Users not registered for push notifications: ${invalidUsers.join(", ")}`,
			);
		}

		if (validTokens.length === 0) {
			console.log("No valid tokens to send push notifications");
			return;
		}

		const callData = {
			notification: {
				title: message.title,
				body: message.body,
			},
			data: {
				type: "call",
				call_id: message.callId,
				caller_name: message.callerName,
				caller_id: message.callerId,
				conversation_id: message.conversationId,
				avatar_url: message.avatarUrl || "",
			},
			android: {
				priority: "high",
				notification: {
					sound: "call_ringtone",
					channelId: "call_notifications",
				},
			},
			apns: {
				payload: {
					aps: {
						sound: "call_ringtone.wav",
						"mutable-content": 1,
					},
				},
			},
		};

		// Dùng sendEachForMulticast cho phiên bản mới
		const messages = validTokens.map((token) => ({
			...callData,
			token,
		}));

		const response = await admin.messaging().sendEach(messages);
		console.log(
			`Multicast push notification sent for call ${message.callId}:`,
			{
				successCount: response.successCount,
				failureCount: response.failureCount,
				responses: response.responses,
			},
		);

		// Xử lý token không hợp lệ
		if (response.failureCount > 0) {
			response.responses.forEach(async (res, index) => {
				if (!res.success && res.error) {
					const error = res.error;
					if (
						error.code === "messaging/invalid-registration-token" ||
						error.code === "messaging/registration-token-not-registered"
					) {
						const invalidUserId = tokens[index].userId;
						await delAsync(`user:${invalidUserId}:fcmToken`);
						console.log(`Removed invalid fcmToken for user ${invalidUserId}`);
					}
				}
			});
		}
	} catch (error) {
		console.error(
			`Error sending multicast push notification for call ${message.callId}:`,
			error,
		);
	}
};

module.exports = {
	sendPushNotification,
	sendCallNotification,

	sendCallNotificationMulticast,
};

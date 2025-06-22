const { faker } = require("@faker-js/faker");
const MessageService = require("../api/services/message.service");

const seedMessages = async () => {
    const userIds = [
        "685789fc68f7407430a16fa9",
        "685789fc68f7407430a16faf",
        "685789fc68f7407430a16fb5",
        "685789fc68f7407430a16fbb",
        "685789fc68f7407430a16fc1",
        "685789fd68f7407430a16fc7",
        "685789fd68f7407430a16fcd",
        "685789fd68f7407430a16fd3",
        "68499b98a83e914a3369185f",
        "684a57f2266ddb21cc5bef59", // duy khanh
        "684a5aae266ddb21cc5bef7e", // le khanh
        "685789fa68f7407430a16f75",
        "685789fb68f7407430a16f84",
        "685789fb68f7407430a16f8a",
        "685789fb68f7407430a16f91",
        "685789fb68f7407430a16f97",
        "685789fb68f7407430a16f9d",
    ];

    const mainUsers = [
        "684a57f2266ddb21cc5bef59", // A
        "684a5aae266ddb21cc5bef7e", // B
    ];

    const otherUsers = userIds.filter((id) => !mainUsers.includes(id));

    for (const mainUser of mainUsers) {
        for (const otherUser of otherUsers) {
            for (let i = 0; i < 10; i++) {
                // mainUser → otherUser
                await MessageService.createMessage({
                    senderId: mainUser,
                    receiverId: otherUser,
                    content: faker.lorem.sentence(),
                    createdAt: faker.date.between({ from: new Date('2025-04-01T00:00:00.000Z'), to: new Date() }),
                    type: "text",
                });

                // otherUser → mainUser
                await MessageService.createMessage({
                    senderId: otherUser,
                    receiverId: mainUser,
                    content: faker.lorem.sentence(),
                    createdAt: faker.date.between({ from: new Date('2025-04-01T00:00:00.000Z'), to: new Date() }),
                    type: "text",
                });
            }
        }
    }

    for (let i = 0; i < otherUsers.length; i++) {
        for (let j = i + 1; j < otherUsers.length; j++) {
            const userA = otherUsers[i];
            const userB = otherUsers[j];

            // 50% xác suất có tin nhắn từ A → B
            if (Math.random() < 0.5) {
                await MessageService.createMessage({
                    senderId: userA,
                    receiverId: userB,
                    content: faker.lorem.sentence(),
                    createdAt: faker.date.between({ from: new Date('2025-04-01T00:00:00.000Z'), to: new Date() }),

                    type: "text",
                });
            }

            // 50% xác suất có tin nhắn từ B → A
            if (Math.random() < 0.5) {
                await MessageService.createMessage({
                    senderId: userB,
                    receiverId: userA,
                    content: faker.lorem.sentence(),
                    createdAt: faker.date.between({ from: new Date('2025-04-01T00:00:00.000Z'), to: new Date() }),
                    type: "text",
                });
            }
        }
    }

    console.log("Seeded messages!");
};

module.exports = seedMessages;

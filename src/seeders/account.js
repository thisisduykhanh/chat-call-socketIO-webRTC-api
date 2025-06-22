const { faker } = require('@faker-js/faker');
const AuthService = require('@/services/auth.service');// Model mongoose của bạn


const seedUsers = async () => {
    for (let i = 0; i < 15; i++) {
        await AuthService.register({
            name: faker.person.fullName(), // faker.name.findName() đã bị đổi tên
            email: faker.internet.email(),
            password: faker.internet.password(),
        });
    }

    console.log("✅ Seeded 30 users!");
};

module.exports = seedUsers;
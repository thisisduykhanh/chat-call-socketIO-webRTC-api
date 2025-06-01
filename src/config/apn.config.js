
const apn = require("apn");
const apnProvider = new apn.Provider({
    token: {
        key: process.env.APNS_KEY_PATH,
        keyId: process.env.APNS_KEY_ID,
        teamId: process.env.APNS_TEAM_ID,
    },
    production: process.env.NODE_ENV === "production",
});

module.exports = apnProvider;
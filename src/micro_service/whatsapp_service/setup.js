const WBA =require("../../wba");
const result = require('dotenv').config();
if (result.error) {
    throw result.error
}
module.exports = WBA({
    admin_username:process.env.WB_API_ADMIN_USERNAME,
    admin_password:process.env.WB_API_ADMIN_PASSWORD,
    api_url:process.env.WB_API_URL,
})

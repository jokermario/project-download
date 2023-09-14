'use strict';
const result = require('dotenv').config();
if (result.error) {
    throw result.error
}
// replace the value below with the Telegram token you receive from @BotFather
// const token = '594442914:AAGddiEBcfu1cWY1TfvNIRJJgxvYF26VBcw';
const token = process.env.TELEGRAM_BOT_API_KEY;
// const token = process.env.TELEGRAM_DEBUG_BOT_API_KEY;
const  init = require("../../tba")
module.exports = init(token);

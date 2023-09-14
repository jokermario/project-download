"use strict"
let MessageNotification=require("../notification_service")

const token ="1188850355:AAGTlX2iRSKfw9IZBEhRmW7fqOeSCPlSUTM";
const chatId = "-1001456517197";
const messageNotification = new MessageNotification(token,chatId);
module.exports =messageNotification

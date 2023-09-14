'use strict';

const result = require('dotenv').config();
const $debug = require("./micro_service/reportError")
if (result.error) {
    throw result.error
}


const statUpWhatsAppStatus = require("./micro_service/whatsapp_service/sendvideo");
const startTelegramService = require("./micro_service/telegram_service/sendvideo");

statUpWhatsAppStatus()
    .then(() => {
        console.log("statUpWhatsAppStatus exited no error");
        $debug.sendMsg("statUpWhatsAppStatus exited no error")
    })
    .catch((e) => $debug.reportError("statUpWhatsAppStatus exited with error", e))
startTelegramService()
    .then(() => {
        console.log("startTelegramService exited no error");
        $debug.sendMsg("startTelegramService exited no error")
    })
    .catch((e) => $debug.reportError("startTelegramService exited with error", e))




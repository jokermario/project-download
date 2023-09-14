'use strict';

const result = require('dotenv').config();
const $debug = require("./micro_service/reportError")
if (result.error) {
    throw result.error
}


const statUpWhatsAppStatus = require("./micro_service/whatsapp_service/sendvideo");
const startTelegramService = require("./micro_service/telegram_service/sendvideo");
const startUpTwitter = require("./micro_service/twitter");

const ServiceCallback = require("./callback")

ServiceCallback()
    .then(() => {
        console.log("ServiceCallback exited no error");
        $debug.sendMsg("ServiceCallback exited no error")
    })
    .catch((e) => $debug.reportError("ServiceCallback exited with error", e))


statUpWhatsAppStatus()
    .then(() => {
        console.log("statUpWhatsAppStatus exited no error");
        $debug.sendMsg("statUpWhatsAppStatus exited no error")
    }).catch((e) => $debug.reportError("statUpWhatsAppStatus exited with error", e))

startTelegramService()
    .then(() => {
        console.log("startTelegramService exited no error");
        $debug.sendMsg("startTelegramService exited no error")
    }).catch((e) => $debug.reportError("startTelegramService exited with error", e))

startUpTwitter()
    .then(() => {
    console.log("startUpTwitter exited no error");
    $debug.sendMsg("startUpTwitter exited no error")
}).catch((e) => $debug.reportError("startUpTwitter exited with error", e))




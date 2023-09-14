'use strict'
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


// console.log("hate")

app.get("/", function (request, response) {
    response.send('Simple WhatsApp Webhook tester</br>There is no front-end');
    // console.log('Incoming webhook: gabe');
});

app.get("/list/me", function (request, response) {
    // response.send('Simple WhatsApp Webhook tester</br>There is no front-end,<br> see server.js for implementation!');
    response.json(app._router.stack)
    // console.log('Incoming webhook: gabe');
});

let listener = app.listen(process.env.PORT || 8087, function () {
    console.log('Your app is listening on port ' + listener.address().port);
});


const result = require('dotenv').config();
const $debug = require("./micro_service/reportError")
if (result.error) {
    throw result.error
}

//
// const {bot} = require("./micro_service/telegram_service/setup");
// let reply_markup ={remove_keyboard:true};
// bot.sendMessage(654630358,"hello",{reply_markup});
// return;
// let caption ='https://video.twimg.com/ext_tw_video/1361247947179106306/pu/vid/540x960/3lC5YAznJ7RdyYd1.mp4?tag=10'
// bot.sendVideo("@sendmethisvid",caption,{caption}).then(function (data) {
//     console.log(data);
//     let chat_id= data.chat.id;
//     let message_id=data.message_idg
//     console.log({chat_id,message_id})
// }).catch(reason => {
//     console.log(reason);
// });
// return
// let chat_id= -1001409996018;
// let message_id=27
//
// let file_id ='BAACAgQAAx0EVArU8gACAbpgLQzYBCTXpeRJZqAc5NT7KuY-5wACYgIAAqnRVFEc7hld9YlqIR4E'
//
// bot.copyMessage("289939806",'@sendmethisvid',message_id,).then(function (data) {
//     console.log(data);
//
// }).catch(reason => {
//     console.log(reason);
// });
//
// return

const startUpTwitter = require("./micro_service/twitter");


startUpTwitter()
    .then(() => {
        console.log("SMTV_PRO exited no error");
        $debug.sendMsg("SMTV_PRO exited no error")
    })
    .catch((e) => $debug.reportError("startUpTwitter exited with error", e))


// const TgBot = require('./micro_service/telegram_service/callback');
// const startTelegramService = require("./micro_service/telegram_service/sendvideo");
// const startTelegramUploadService = require("./micro_service/telegram_service/uploadVid");


// TgBot.startPolling();
// startTelegramService()
// startTelegramUploadService()

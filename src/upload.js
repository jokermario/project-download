'use strict'
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const result = require('dotenv').config();
const $debug = require("./micro_service/reportError")
if (result.error) {
    throw result.error
}


const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


app.get("/", function (request, response) {
    response.send('Simple WhatsApp Webhook tester</br>There is no front-end Upload');
});

app.get("/list/me", function (request, response) {
    response.json(app._router.stack)
});

let listener = app.listen(process.env.PORT || 8087, function () {
    console.log('Your app is listening on port ' + listener.address().port);
});




const startTelegramUploadService = require("./micro_service/telegram_service/uploadVid");

startTelegramUploadService()

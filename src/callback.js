
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const TgBot = require('./micro_service/telegram_service/callback');
const WaBot = require('./micro_service/whatsapp_service/callback');
const $debug = require("./micro_service/reportError")


module.exports=async function ServiceCallback() {
    const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
    app.use(cors());


// Configuring body parser middleware
//     app.use(bodyParser.urlencoded({extended: true}));
//     app.use(bodyParser.json());
    app.use(bodyParser.json({limit: '50mb'}));
    app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

    let url =process.env.WEBHOOK_URL;


// This informs the Telegram servers of the new webhook.
// Note: we do not need to pass in the cert, as it already provided
    let webhook_path = `telegram/bot${TgBot.token}`
// let webhook_path = `telegram/bot${TgBot.token.replace(/:/g,"_")}`



    app.get("/", function (request, response) {
        response.send('Simple WhatsApp Webhook tester</br>There is no front-end,<br> see server.js for implementation!');
        // console.log('Incoming webhook: gabe');
    });

    app.get("/list/me", function (request, response) {
        // response.send('Simple WhatsApp Webhook tester</br>There is no front-end,<br> see server.js for implementation!');
        response.json(app._router.stack)
        // console.log('Incoming webhook: gabe');
    });


    let tgPromise =TgBot.setWebHook(`${url}/${webhook_path}`,{max_connections:6,allowed_updates:["message"]}).then(function () {
// We are receiving updates at the route below!
        app.post(`/${webhook_path}`, (req, res) => {
            TgBot.processUpdate(req.body);
            res.sendStatus(200);
        });
        app.post(`//${webhook_path}}`, (req, res) => {
            TgBot.processUpdate(req.body);
            res.sendStatus(200);
        });

    });

    let waPromise = WaBot().then(callback => {
        app.post("/webhook", function (request, response) {
            callback.processUpdate(request.body)
            response.sendStatus(200);
        });
    });
    Promise.all([waPromise,tgPromise]).then(function () {
        let listener = app.listen(process.env.PORT || 8087, function () {
            console.log('Your app is listening on port ' + listener.address().port);
        });
        console.log("webHook  Service  exited no error");
        $debug.sendMsg("webHook  Service  exited no error")
    }).catch(function (reason) {

        $debug.reportError("webHook  Service exited with error", reason)
    })
}





const {bot, sendMsgProxy} = require("./setup");
const messageNotification = require("./messageNotification");
const $debug = require("../reportError")
const connection = require("../db");
const {escapeHtmlTag: escape, escapeMarkDown,formatTwitterTagWithMarkdown} = require("../../utils");
const {saveRequest} = require("../twitter_service/utils");

const textRegexpCallbacks = []

let admins = new Set([654630358])

function updateAdmins() {
    connection.query(`select telegram_user_id
                      from users
                      where role_id & 4`, function (error, results, fields) {
        admins = new Set([654630358])

        for (const result of results) {
            admins.add(result.telegram_user_id)
        }

    });
}

//update admin list every 1hr
setInterval(updateAdmins, 3600 * 1000)
setImmediate(updateAdmins)
const onText = (regexp, callback) => {
    textRegexpCallbacks.push({regexp, callback});
}

bot.on("message", function (msg, metadata) {

    let $payload = "undefined"
    if (metadata.type === "text") {
        for (let textRegexpCallback of textRegexpCallbacks) {
            const result = textRegexpCallback.regexp.exec(msg.text);
            if (result) {
                return textRegexpCallback.callback(msg, result)
            }
        }
        $payload = escape(msg.text)
    } else {
        try {
            $payload = escape(JSON.stringify(msg[metadata.type], null, 4))
        } catch (e) {

        }

    }

    let from = msg.from;
    let $msgText = `New Telegram Message Notification From \n` +
        `<a href="tg://user?id=${from.id}">${from.first_name} ${from.last_name} #u_${from.id}</a>` +
        "\n=========================\n" +
        `Time : ${new Date()}\n` +
        `Id: <b>${msg.message_id}</b>\n` +
        `From:  ${from.username ? "@" + from.username : `<a href="tg://user?id=${from.id}">#u_${from.id}</a>`}\n` +
        `Type: <b>${metadata.type.toUpperCase()}</b>\n` +
        `Payload: ${$payload}\n` +
        "—————————————————\n";
    messageNotification.sendMsg($msgText);
})

onText(/^\/(?:link|start)\s+(\w{10,67})$/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    if (msg.chat.type !== "private") {
        return;
    }

    const chatId = msg.chat.id;
    const $payload = match[1]; // the captured "whatever"
    let response = `pst. kindly try again later or contact us via dm on twitter\n https://twitter.com/${escapeMarkDown(process.env.TWITTER_BOT_USERNAME)}`;


    try {
        connection.query('select telegram_user_id from users  where access_token = ?', [$payload], function (error, results) {
            // Handle error after the release.
            if (error) {
                console.trace(error);
                $debug.reportError(error)

                // return res.send({response});


                // send back the matched "whatever" to the chat
                sendMsgProxy(chatId, response);
                // bot.sendMessage()
                // sendMsgProxy(from, response,true)


            } else if (!results.length) {
                response =
                    '*Invalid Access Token Provided*' +
                    "\n" +
                    `Visit [our page](${(process.env.WEBSITE_LINK)}) for ` +
                    "\n info on how to link up your account." +
                    // "\n" +
                    // 'and grab your access token, ' +
                    // "\n" +
                    // 'then linkup your account by using the /link command' +
                    // "\n"
                    // + 'eg /link _your-access-token_' +
                    "\n"
                // + 'Type /help to see all commands!'
                ;


                // return res.send({response});
                // sendMsgProxy(from, response,true)
                sendMsgProxy(chatId, response);
            } else if (results[0].telegram_user_id) {
                response = `*Account is already linked up*. ` +
                    `\nTo unlink account verification, ` +
                    `tweet _@SendMeThisVideo /d_ on twitter. ` +
                    `Or Click this link ` +
                    `[unlink account](https://twitter.com/intent/tweet?text=@SendMeThisVideo%20%2Fd) 
                       `;
                // console.log(results);
                // sendMsgProxy(from, response,true)
                // return res.send({response});
                sendMsgProxy(chatId, response);
            } else {

                connection.query('update users set telegram_user_id=? where access_token = ?', [chatId, $payload], function (error, results) {
                    // Handle error after the release.

                    // https://twitter.com/intent/tweet?text=@SendMeThisVideo%20%2Fd

                    if (error) {
                        console.trace(error); // not connected!
                        $debug.reportError(error)

                    } else if (results.changedRows) {
                        response =
                            '*Congratulations Your Account has been linked up*' +
                            "\n" +
                            `give it a try by replying to a video tweet with _@${escapeMarkDown(process.env.TWITTER_BOT_USERNAME)} /t_` +
                            "\n" +
                            'and have it in your PM asap.' +
                            "\n" +
                            `Visit [our page](${(process.env.WEBSITE_LINK)}) for more information. ` +
                            "\n" +
                            `Feel free to join our telegram group for complains or feature suggestion \n`
                            + `https://t.me/sendmethisvideo`;

                    } else {
                        response =
                            '*Your Account is already linked up*' +
                            "\n" +
                            `give it a try by replying to a video tweet with _${escapeMarkDown(process.env.TWITTER_BOT_USERNAME)} /w_` +
                            "\n" +
                            'and have the video it in your PM asap.' +
                            "\n" +
                            `Visit [our page](${(process.env.WEBSITE_LINK)}) for more information. ` +
                            "\n" +
                            `Feel free to join our telegram group for complains or feature suggestion \n`
                            + `https://t.me/sendmethisvideo`;
                    }


                    // response = `${access_token} -=> ${whatsapp_user_id}`;

                    // console.log([results, "wowggg", fields]);
                    // resolve(response);
                    // return res.send({response});
                    // sendMsgProxy(from, response,true)
                    sendMsgProxy(chatId, response);
                });

            }

        });

    } catch (e) {
        // sendMsgProxy(from, response)
        sendMsgProxy(chatId, response);


        $debug.reportError(e, e.message, e)

        console.trace(e)
    }


});
onText(/^\/?(?:help|start|hi|hello|yo)$/i, (msg) => {
    // 'msg' is the received Message from Telegram


    if (msg.chat.type !== "private") {
        return;
    }

    const chatId = msg.chat.id;
    let response = `Hi there!\n` +
        `Welcome to [${(process.env.TWITTER_BOT_USERNAME)}](https://twitter.com/${(process.env.TWITTER_BOT_USERNAME)}) telegram platform.\n` +
        `Visit [our page](${escapeMarkDown(process.env.WEBSITE_LINK)}) for ` +
        "info on how to link up your account. \n\n" +
        "For any issue contact us via dm on twitter\n" +
        `https://twitter.com/${escapeMarkDown(process.env.TWITTER_BOT_USERNAME)}` +
        "\n" +
        `Feel free to join our telegram group for complains or feature suggestion \n`
        + `https://t.me/sendmethisvideo`;


    sendMsgProxy(chatId, response);

});
onText(/video\.twimg\.com\/ext_tw_video\/\d*/, (msg) => {
    // 'msg' is the received Message from Telegram

    if (msg.chat.type !== "private") {
        return;
    }
    const response = `Hello.
We noticed you sent a video link to our automated telegram platform.
If your intentions is to get the video downloaded.

All you have to do is.

1. *Link up*: Visit https://www.sendmethisvideo.com and follow the instructions on how to link up your whatsapp or telegram. If you have already done so, you won't have to do it again.

2. *Request for a video* : tag any video tweet you would want on Twitter  with *@SendMeThisVideo /w*
Or *@SendMeThisVideo /t*
To have the video sent to your whatsapp or telegram account respectively if linked up.

You can also just tag the video tweet with
*@SendMeThisVideo* and the video will be sent to all your linked up platform.

kindly note that messages sent to this chat might not get a reply,
For any issue contact us via dm on twitter
https://twitter.com/${escapeMarkDown(process.env.TWITTER_BOT_USERNAME)}.
` +
        "\n" +
        `Feel free to join our telegram group for complains or feature suggestion \n`
        + `https://t.me/sendmethisvideo`;
    const chatId = msg.chat.id;

    sendMsgProxy(chatId, response);

});

onText(/^\/status twitter\.com\/.+\/status\/(\d*)/, (msg, match) => {
    // 'msg' is the received Message from Telegram


    if (!admins.has(msg.from.id)) {
        return;
    }

    connection.query(`select request_medium, request_status, sent_to_whatsapp, sent_to_telegram, twitter_video_url
                      from tweets
                               left join video_requests vr on tweets.twitter_tweet_id = vr.twitter_tweet_id
                      where reply_to = ?
                      limit 1`, [match[1]], function (error, results, fields) {
        // console.log({error, results, fields,ids});

        // if (error) {
        //     return;
        // }
        let form = {
            reply_to_message_id: msg.message_id,
            parse_mode: "MARKDOWN",
            allow_sending_without_reply: true
        }

        let text = "*Tweet Not Found*";
        if (results.length) {
            let row = results[0];
            text =
                `_Medium_: *${row.request_medium}*
_Status_: *${row.request_status}*
_Whatsapp_: *${row.sent_to_whatsapp || "NOT-LINKED"}*
_Telegram_: *${row.sent_to_telegram || "NOT-LINKED"}*        
_Video Url_: ${row.twitter_video_url || "NOT-AVAILABLE"}        
                 `;
        }
        bot.sendMessage(msg.chat.id, text, form)


        // let tweet_id=match[1];
        // let username=msg.from.id;
        // let medium_user_id= (results&&results.length) ? results[0].twitter_user_id : null;
        // let text=msg.text;
        // let reply_to=msg.message_id;


    });


});
onText(/^\/check/, (msg, match) => {
    // 'msg' is the received Message from Telegram


    let replyToMessage = msg.reply_to_message


    if (!admins.has(msg.from.id) || !replyToMessage) {
        return;
    }

    connection.query(`select *
                      from users
                      where telegram_user_id = ?
                      limit 1`, [replyToMessage.from.id], function (error, results, fields) {
        // console.log({error, results, fields,ids});

        // if (error) {
        //     return;
        // }
        let form = {
            reply_to_message_id: msg.message_id,
            parse_mode: "MARKDOWN",
            allow_sending_without_reply: true
        }

        let text = "*User Not Found*";
        if (results.length) {
            let row = results[0];
            text =
                `
_Telegram_: *${row.telegram_user_id ? "LINKED" : "NOT-LINKED"}*
_Whatsapp_: *${row.whatsapp_user_id ? "LINKED" : "NOT-LINKED"}*
_Preference_: *${row.preference}*
                 `;
        }
        bot.sendMessage(msg.chat.id, text, form)


        // let tweet_id=match[1];
        // let username=msg.from.id;
        // let medium_user_id= (results&&results.length) ? results[0].twitter_user_id : null;
        // let text=msg.text;
        // let reply_to=msg.message_id;


    });


});

onText(/^\/info (?:http:\/\/|https:\/\/)?(?:www\.)?(?:twitter\.com\/.+\/status\/)?(\d+)$/, (msg, match) => {
    // 'msg' is the received Message from Telegram


    if (!admins.has(msg.from.id)) {
        return;
    }

    connection.query(`select tweet_text
                      from tweets
                      where twitter_tweet_id = ?
                      limit 1`, [match[1]],  async function (error, results, fields) {

        try{
            let form = {
                reply_to_message_id: msg.message_id,
                parse_mode: "MARKDOWN",
                allow_sending_without_reply: true
            }
            let text = "*Tweet Not Found*";
            if (results.length) {
                let row = results[0];
                text =
                    `_Tweet Text_: ${formatTwitterTagWithMarkdown(escapeMarkDown(row.tweet_text))}\n
_Tweet Link_: https://twitter.com/i/${match[1]}       
                 `;
            }
            await bot.sendMessage(msg.chat.id, text, form)

        }catch (e) {
            $debug.reportError(e, e.message, e)

            console.trace(e)
        }
        // console.log({error, results, fields,ids});

        // if (error) {
        //     return;
        // }



        // let tweet_id=match[1];
        // let username=msg.from.id;
        // let medium_user_id= (results&&results.length) ? results[0].twitter_user_id : null;
        // let text=msg.text;
        // let reply_to=msg.message_id;


    });


});





// bot.on("video",function (msg) {
//     messageNotification.sendVideo(msg.video.file_id,msg.caption)
//     console.log(JSON.stringify(msg,null,4))
// })


// bot.startPolling();

// return;
onText(/twitter\.com\/.+\/status\/(\d*)/, (msg, match) => {
    // 'msg' is the received Message from Telegram

    // console.log(msg)
    if (msg.chat.type !== "private") {
        return;
    }

    connection.query("select twitter_user_id from users where telegram_user_id = ? limit 1", [msg.from.id], function (error, results, fields) {
        // console.log({error, results, fields,ids});

        // if (error) {
        //     return;
        // }


        let tweet_id = match[1];
        let username = msg.from.id;
        let medium_user_id = (results && results.length) ? results[0].twitter_user_id : null;
        let text = msg.text;
        let reply_to = msg.message_id;
        let request_medium = "TELEGRAM"


        saveRequest(username, tweet_id, medium_user_id, text, reply_to, request_medium);

    });


});

module.exports = bot;

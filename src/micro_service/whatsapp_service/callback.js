"use strict"
const W = require("./setup");
const connection = require("../db");
const messageNotification = require("./messageNotification")
const $debug = require("../reportError")
const {escapeHtmlTag} = require("../../utils")
const {saveRequest} = require("../twitter_service/utils");


const textRegexpCallbacks = []

const onText = (regexp, callback) => {
    textRegexpCallbacks.push({regexp, callback});
}

async function startUpWhatsAppServer() {

    return W.then(function (WBA) {

        const msgQ = [];
        const msgSetQ = new Set()
        const helper = function () {
            setTimeout(function () {
                if (msgQ.length) {
                    let [to, msg, web_view] = msgQ.shift()
                    WBA.sendTxtMsg(to, msg, web_view).then(function (response) {
                        msgSetQ.delete(to);
                        if (msgQ.length) {
                            // wait for 1 sec then execute
                            setTimeout(helper, 1000)
                            // helper()
                        }
                    }).catch(function (error) {
                        // console.log(error);
                        $debug.reportError(error)
                    });
                }
            }, 6000)
        }

        function sendMsgProxyWithQ(from, response, has_url = false) {
            return;

            if (!msgSetQ.has(from)) {
                msgQ.push([from, response, has_url])
                msgSetQ.add(from)
            }

            if (msgQ.length <= 1) {
                helper()
            }

        }

        function sendMsgProxy(from, response, has_url = false) {

            WBA.sendTxtMsg(from, response, has_url).then(function (response) {

            }).catch(function (error) {
                // console.log(error);
                $debug.reportError({error, response, from, has_url})

            });


        }


        const linkUpAccount = ($payload, from, timestamp) => {

            let response = `pst. kindly try again later or contact us via dm on twitter\n https://twitter.com/${process.env.TWITTER_BOT_USERNAME}`;
            try {
                connection.query('select whatsapp_user_id from users  where access_token = ?', [$payload], function (error, results) {
                    // Handle error after the release.
                    if (error) {
                        console.trace(error);
                        $debug.reportError(error)

                        // return res.send({response});
                        sendMsgProxy(from, response, true)


                    } else if (!results.length) {
                        response =
                            '*Invalid Access Token Provided*' +
                            "\n" +
                            `Visit [our page](${process.env.WEBSITE_LINK}) for ` +
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
                        sendMsgProxy(from, response, true)
                    } else if (results[0].whatsapp_user_id) {
                        response = `*Account is already linked up*. ` +
                            `\nTo unlink account verification, ` +
                            `tweet _@SendMeThisVideo /d_ on twitter. ` +
                            `Or Click this link ` +
                            `https://twitter.com/intent/tweet?text=@SendMeThisVideo%20%2Fd\n` +
                            "Note: Our Whatsapp service is now a premium service,\n" +
                            "you are now required to pay a subscription fee on your \n" +
                            "dashboard to have your video request processed.\n" +
                            "This is to enable us keep up with the cost of maintenance." +
                            "*Messages sent to this chat might not get a reply,\n" +
                            "This is an automated platform.*\n" +
                            "For any issues, contact support at\n" +
                            "https://wa.me/2348148459005 (+2348148459005)";
                        // console.log(results);
                        sendMsgProxy(from, response, true)
                        // return res.send({response});
                    } else {

                        connection.query('update users set whatsapp_user_id=?,replied_to_whatsapp_at=? where access_token = ?', [from, new Date(timestamp * 1000), $payload], function (error, results) {
                            // Handle error after the release.
                            // console.log([results, "wowggg", fields]);
                            // https://twitter.com/intent/tweet?text=@SendMeThisVideo%20%2Fd

                            if (error) {
                                console.trace(error); // not connected!
                                $debug.reportError(error)

                            } else if (results.changedRows) {
                                response =
                                    '*Congratulations Your Account has been linked up*' +
                                    "\n" +
                                    `give it a try by replying to a video tweet with _@${process.env.TWITTER_BOT_USERNAME} /w_` +
                                    "\n" +
                                    'and have it in your PM asap.' +
                                    "\n" +
                                    `Visit [our page](${process.env.WEBSITE_LINK}) for more information. \n ` +
                                    "Note: Our Whatsapp service is now a premium service,\n" +
                                    "you are now required to pay a subscription fee on your \n" +
                                    "dashboard to have your video request processed.\n" +
                                    "This is to enable us keep up with the cost of maintenance." +
                                    "*Messages sent to this chat might not get a reply,\n" +
                                    "This is an automated platform.*\n" +
                                    "For any issues, contact support at\n" +
                                    "https://wa.me/2348148459005 (+2348148459005)";

                            } else {
                                response =
                                    '*Your Account is already linked up*' +
                                    "\n" +
                                    `give it a try by replying to a video tweet with _${process.env.TWITTER_BOT_USERNAME} /w_` +
                                    "\n" +
                                    'and have the video it in your PM asap.' +
                                    "\n" +
                                    `Visit [our page](${process.env.WEBSITE_LINK}) for more information. \n` +
                                    "Note: Our Whatsapp service is now a premium service,\n" +
                                    "you are now required to pay a subscription fee on your \n" +
                                    "dashboard to have your video request processed.\n" +
                                    "This is to enable us keep up with the cost of maintenance." +
                                    "*Messages sent to this chat might not get a reply,\n" +
                                    "This is an automated platform.*\n" +
                                    "For any issues, contact support at\n" +
                                    "https://wa.me/2348148459005 (+2348148459005)";
                            }


                            // response = `${access_token} -=> ${whatsapp_user_id}`;

                            // console.log([results, "wowggg", fields]);
                            // resolve(response);
                            // return res.send({response});
                            sendMsgProxy(from, response, true)
                        });

                    }

                });

            } catch (e) {
                sendMsgProxy(from, response)
                $debug.reportError(e)

            }

        }

        onText(/^\/link\s+(\w{10,67})$/, function (msg, match) {
            if (msg.group_id) {
                return;
            }
            const $payload = match[1];
            linkUpAccount($payload, msg.from, msg.timestamp);
        })
        onText(/video\.twimg\.com\/ext_tw_video\/\d*/, function (msg, match) {
            if (msg.group_id) {
                return;
            }
            const $msg = `Hello.
We noticed you sent a video link to our automated whatsapp platform.
If your intentions is to get the video downloaded.

All you have to do is.

1. *Link up*: Visit https://www.sendmethisvideo.com and follow the instructions on how to link up your whatsapp or telegram. If you have already done so, you won't have to do it again.

2. *Request for a video* : tag any video tweet you would want on Twitter  with *@SendMeThisVideo /w*
Or *@SendMeThisVideo /t*
To have the video sent to your whatsapp or telegram account respectively if linked up.

You can also just tag the video tweet with
*@SendMeThisVideo* and the video will be sent to all your linked up platform.

kindly note that messages sent to this chat might not get a reply,
for any issues Contact support at
 https://wa.me/2348148459005 (+2348148459005).
`;
            sendMsgProxyWithQ(msg.from, $msg, true)
        })
        onText(/twitter\.com\/.+\/status\/(\d*)/, function (msg, match) {
            if (msg.group_id) {
                return;
            }


            connection.query(`select us.twitter_user_id
                              from users us
                                       join subscriptions s on us.twitter_user_id = s.twitter_user_id
                              where whatsapp_user_id = ?
                                and expires_at > ?
                              limit 1`, [msg.from, new Date()], function (error, results, fields) {
                // console.log({error, results, fields,ids});

                // if (error) {
                //     return;
                // }

                let tweet_id = match[1];
                let username = msg.from;
                let medium_user_id = (results && results.length) ? results[0].twitter_user_id : null;
                let text = msg.text.body;
                let reply_to = msg.id;
                let request_medium = "WHATSAPP"

                saveRequest(username, tweet_id, medium_user_id, text, reply_to, request_medium);
            });


        })

        const processWhatsAppMsg = (inbound_msg) => {

            if (!inbound_msg || !inbound_msg.messages || typeof inbound_msg.messages.length !== "number") {
                console.warn("invalid args supplied in processWhatsAppMsg"); // not connected!
                $debug.reportError(inbound_msg)
                return;
            }

            let messages = inbound_msg.messages;

            let from = [];
            let reply_to = true;
            let match = null;
            messages.forEach(function (msg) {

                if (msg.errors || !msg.from) {
                    reply_to = false;
                    return $debug.reportError(msg)
                } else if (msg.type === "text") {
                    for (let textRegexpCallback of textRegexpCallbacks) {
                        match = textRegexpCallback.regexp.exec(msg.text.body);
                        if (match) {
                            reply_to = false;
                            textRegexpCallback.callback(msg, match)
                            break;
                        }
                    }

                }
                from.push(msg.from)
            });

            const contacts = inbound_msg.contacts || [];
            // let e =  {
            //       "profile": {
            //       "name": "Cintrust De Senior"
            //   },
            //       "wa_id": "2349025860044"
            //   };

            let $msg = "New Message Notification From \n";
            for (const contact of contacts) {
                $msg += `<a href="https://wa.me/${contact.wa_id}">${contact.profile.name} [+${contact.wa_id}]</a>,\n`;
            }
            $msg += "\n" +
                "=========================\n";

            // let as= {
            //      "from": "2349025860044",
            //      "id": "ABGHI0kCWGAETwIQGk0PeJP3ky-BqPl_dmUTiQ",
            //      "text": {
            //      "body": "Hksdh"
            //  },
            //      "timestamp": "1589500626",
            //      "type": "text"
            //  }

            // let wsa=
            //     "Id : ABGHI0kCWGAETwIQGk0PeJP3ky-BqPl_dmUTiQ\n" +
            // "From : +2349025860044\n" +
            // "Type: Text\n" +
            // "Text : this is the text\n" +
            // "Time: 12:30am 1st May 2020"
            for (const message of messages) {

                $msg += `Id: <b>${message.id}</b>\n`;
                $msg += `Time : ${new Date(message.timestamp * 1000)}\n`;
                $msg += `From: ${message.from}\n`;
                $msg += `Type: <b>${message.type.toUpperCase()}</b> \n`;
                $msg += `Payload: ${escapeHtmlTag(JSON.stringify(message[message.type] || message['errors'], null, 2))}\n`;

            }

            $msg += "—————————————————\n";

            messageNotification.sendMsg($msg)

            connection.query(`update users
                              set replied_to_whatsapp_at = ?
                              where whatsapp_user_id in (?)`, [new Date(), from], function (error, results, fields) {
                // console.log({error, results, fields,from});


                if (!results.changedRows && reply_to) {
                    const $msg = `Hello.
Your whatsapp account is not yet linked up to any twitter account.

All you have to do is.

1. *Link up*: Visit https://www.sendmethisvideo.com and follow the instructions on how to link up your whatsapp or telegram. If you have already done so, you won't have to do it again.

2. *Request for a video* : tag any video tweet you would want on Twitter  with *@SendMeThisVideo /w*
Or *@SendMeThisVideo /t*
To have the video sent to your whatsapp or telegram account respectively if linked up.

You can also just tag the video tweet with
*@SendMeThisVideo* and the video will be sent to all your linked up platform.

*kindly note that messages sent to this chat might not get a reply,
This is an automated platform.*
For any issues Contact support at
 https://wa.me/2348148459005 (+2348148459005)
`;
                    from.forEach(function (value) {
                        sendMsgProxyWithQ(value, $msg, true)
                    })

                }
//                 else if(reply_to){
//                     const $msg = `Hello.
// We are currently undergoing maintenance on our WhatsApp channel.
// Please make use of our telegram channel,
// while we work to make our services better.
// You can also visit https://www.sendmethisvideo.com/{your twitter username)
// to see the list of your requested videos.
// Thank you for your understanding.
//
// We will retry processing your request once we are done.
//
// *kindly note that messages sent to this chat might not get a reply,
// This is an automated platform.*
// For any issues Contact support at
//  https://wa.me/2348148459005 (+2348148459005)
// `;
//                     from.forEach(function (value) {
//                         sendMsgProxyWithQ(value,$msg,true)
//                     })
//
//                 }

            });

        }

        const processWhatsAppNotification = (inbound_notification) => {


            if (inbound_notification.statuses && inbound_notification.statuses.length) {

                let ids = [];

                for (const notification of inbound_notification.statuses) {
                    //"Request for url https://video.twimg.com/ext_tw_video/1354791030978203650/pu/vid/640x800/HK6adsV_xqSqDt-Z.mp4?tag=12 failed with error: 404 (Not Found)"

                    if (notification["errors"] || notification.status === "failed") {

                        $debug.reportError(notification)
                        for (const error of notification.errors) {
                            if (error.code === 1014) {

                                let $msg = ""
                                let match = error.title.match(/Request for url (.*) failed .* (404 \(Not Found\)|403 \(Forbidden\))/);
                                if (match) {
                                    if (match[1].match(/video\.twimg\.com\/ext_tw_video\/\d*/)) {

                                        match = match[2] === "404 (Not Found)" ? "DELETED" : "FORBIDDEN"
                                        let sql = `update tweets
                                                   set sent_to_whatsapp =?
                                                   where whatsapp_message_id = ?`;

                                        connection.query(sql, [match, notification.id], function (error, results, fields) {
                                        });
                                    } else {

                                        $msg = `Hello the video you requested could not ` +
                                            `be sent to you because of one of the following \n` +
                                            `1. The video tweet has been deleted. \n ` +
                                            `2. The video tweet has restrictions on who is allowed to view it.\n\n` +
                                            `If you  think this is not so, contact our support at \n` +
                                            `https://wa.me/2348148459005 (+2348148459005)\n`
                                            + `with the *tweet link* if possible, for further investigation .\n` +
                                            `Kindly note messages sent to this chat might not get a  reply.`;
                                    }


                                } else {
                                    $msg = `Hello we encountered an error while sending your requested video.\n` +
                                        `Kindly contact our support at \n` +
                                        `https://wa.me/2348148459005 (+2348148459005)\n`
                                        + `with the *tweet link* if possible, for further investigation .\n` +
                                        +`We might try resending the video at a later time \n` +
                                        +`if situation allows it.\n` +
                                        `Kindly note messages sent to this chat might not get a  reply.`;
                                }


                                if ($msg) {
                                    ids.push(notification.id)
                                    sendMsgProxy(notification.recipient_id, $msg, true)
                                }


                            }

                        }

                    }
                }
                connection.query("update tweets set sent_to_whatsapp ='FAILED' where whatsapp_message_id in (?)", [ids], function (error, results, fields) {
                    // console.log({error, results, fields,ids});
                });

            }
            // console.log(inbound_notification);
        }


        const processUpdate = (update) => {
            if (update.contacts && update.messages) {
                processWhatsAppMsg(update)
            } else if (update.statuses) {
                processWhatsAppNotification(update)
            } else {
                $debug.reportError({update, message: "received unknown web-hook notification"});
            }
        };
        return {processUpdate};
    });
}

module.exports = startUpWhatsAppServer

const T = require("./setup");
const connection = require("../db");
const $debug = require("../reportError")
const Twit = require('twit');
const getVid = new Twit({
    consumer_key: process.env.GET_VID_CONSUMER_KEY,
    consumer_secret: process.env.GET_VID_CONSUMER_SECRET,
    access_token: process.env.GET_VID_ACCESS_TOKEN,
    access_token_secret: process.env.GET_VID_ACCESS_TOKEN_SECRET,
    timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL: true,     // optional - requires SSL certificates to be valid.
});

const {
    timeStamp,
    deleteUsers,
    deleteTweetsByTwtId,
    deleteTweets,
    getVideoSizeMbAsync,
    deleteVidReqByTwtId,
    // getVideoSizeMb
} = require("./utils")

let usr_preference = {
    telegram: 1 << 0,
    whatsapp: 1 << 1,
}

function updateTweetStatus($twtID, $sent_to_telegram, $sent_to_whatsapp) {

    let updated_at = (new Date())
    connection.query(`UPDATE tweets
                      SET request_status   = 'PROCESSED',
                          updated_at       = ?,
                          sent_to_telegram = ?,
                          sent_to_whatsapp = ?
                      WHERE id = ?`, [updated_at, $sent_to_telegram, $sent_to_whatsapp, $twtID], function (err, res, fie) {

        if (err) {
            throw err;
        }


    })

}

function addURLToVidRequest($twtID, $url, full_text, payload) {
    if (arguments.length < 4) {
        throw  ("invalid number of function parameter given to " + this.name);
    }
    let updated_at = (new Date())
    let sql = `UPDATE video_requests
               set twitter_video_url   = ?,
                   tweet_text          = ?,
                   twitter_payload     = ?,
                   updated_at          = ?,
                   twitter_video_status='ACTIVE'
               WHERE twitter_tweet_id = ?`

    connection.query(sql, [$url, full_text, JSON.stringify(payload, null, 4), updated_at, $twtID], function (err, res, fie) {
        if (err) {
            throw err;
        }

    });


}


function resetUsersPassword($user_ids) {
    if (!$user_ids || typeof $user_ids.length !== "number") {
        throw  ("invalid number of function parameter");
    }

    $user_ids.length && connection.query(`UPDATE users
                                          SET \`password\` = null
                                          WHERE twitter_user_id in (?) `, [$user_ids], function (err, res, fie) {

        if (err) {
            throw err;
        }


    })

}

function updateUsersLastRepliedTo($user_ids) {
    if (!$user_ids || typeof $user_ids.length !== "number") {
        throw  ("invalid number of function parameter");
    }

    let updated_at = (new Date())

    $user_ids.length && connection.query(`UPDATE users
                                          SET last_twt_reply_at = ?,
                                              updated_at        =?
                                          WHERE twitter_user_id in (?) `, [updated_at, updated_at, $user_ids], function (err, res, fie) {

        if (err) {
            throw err;
        }


    })

}

function updateBlackListedRequest($blackList) {
    if (!$blackList || typeof $blackList.length !== "number") {
        throw  ("invalid number of function parameter");
    }

    let updated_at = (new Date())

    $blackList.length && connection.query(`UPDATE video_requests
                                           SET black_listed = ?,
                                               updated_at   =?
                                           WHERE twitter_tweet_id in (?) `, [true, updated_at, $blackList], function (err, res, fie) {

        if (err) {
            throw err;
        }


    })

}

let time = 0;

function replyToInActiveWhatsAppUser($tagged_tweet_id, $twitter_username, request_medium) {


    const whatsapp_mgs = ["Hello", "Hi", "Hey", "Send video", "Pass my request",
        "My request", 'I am here',
        "I am ready now", "Start Processing", "Proceed", "Lets Go",
        "Ready To download"];
    const url = ` https://wa.me/${process.env.WB_API_PHONE_NO}?text=${encodeURI(whatsapp_mgs[Math.floor(Math.random() * whatsapp_mgs.length)])}`

    const first_mgs = ["Pst,", "Hello,", "Hi,", "Hey,", "Boss,"];
    const second_mgs = [
        "We need you to send us a text on our whatsapp contact to continue receiving video in your whatsapp dm for the next 24hrs.",
        "To continue receiving video on whatsapp for the next 24hrs you need to send a text to our whatsapp contact.",
        "You haven't sent a message to our whatsapp contact in the last 24hrs. Just send us a text.",
        "It's been more than 24hrs since your last message to us on whatsapp. Kindly send us a text.",
        "Just send us a text on whatsapp to keeping getting your request processed for the next 24hrs.",
        "We are ready to process your request. Send us a text on whatsapp to get your video.",];
    const last_mgs = ['A simple text would do.',
        "A simple hi would do.",
        "A simple hello would do."];
    const text = (
        ` ${url}  \n` +
        `${first_mgs[Math.floor(Math.random() * first_mgs.length)]} `
        + `${second_mgs[Math.floor(Math.random() * second_mgs.length)]}` +
        ` ${last_mgs[Math.floor(Math.random() * last_mgs.length)]} \n Click the link above.`
    );

    // console.log(text);


    // return replyToTweet($tagged_tweet_id, $twitter_username,
    //     `hello your video has been placed at `
    //     +`\n ${process.env.WEBSITE_LINK}/${$twitter_username} .\n\n\n`+
    //     " https://twitter.com/SendMeThisVideo/status/1299300052746240001")

    switch (request_medium) {
        case 'TWITTER_TIMELINE':
            return replyToTweet($tagged_tweet_id, $twitter_username, text)
        case 'TWITTER_DM':
        default:
            return false;
    }

}

function replyToNonLinkedUser($tagged_tweet_id, $twitter_username, $twitter_user_id) {

    const first_mgs = ['Pst', "Hello", "Yo", "Boss"];
    const second_mgs = ["I just saw that", "Your asked for me",
        "I've got that covered", "It's all done"];
    const last_mgs = ['You can check this',
        "You can find it at", "Just placed it at",
        "Check this out"];
    const text = `${first_mgs[Math.floor(Math.random() * first_mgs.length)]}. `
        + `${second_mgs[Math.floor(Math.random() * second_mgs.length)]}.` +
        ` ${last_mgs[Math.floor(Math.random() * last_mgs.length)]} \n`
        + `${process.env.WEBSITE_LINK}/dashboard/requests`;
        // + `${process.env.WEBSITE_LINK}/${$twitter_username}`;

    return replyToTweet($tagged_tweet_id, $twitter_username, text)
}

function replyToUnSubscribedUser($tagged_tweet_id, $twitter_username, $twitter_user_id) {

    const first_mgs = ['Pst', "Hello", "Yo", "Boss"];
    const second_mgs = ["Your video is ready", "Your request is good to go",
        "I've got that covered", "It's all done"];
    const last_mgs = ['You can manually download it at',
        "You can find it at", "Just placed it at",
        "To Download visit"];
    const text = `${first_mgs[Math.floor(Math.random() * first_mgs.length)]}. `
        + `${second_mgs[Math.floor(Math.random() * second_mgs.length)]}.` +
        ` ${last_mgs[Math.floor(Math.random() * last_mgs.length)]} \n`
        + `${process.env.WEBSITE_LINK}/${$twitter_username}\n\n`;

    return replyToTweet($tagged_tweet_id, $twitter_username, text)
}

function replyToBlackListedTweet($tagged_tweet_id, $twitter_username, $twitter_user_id) {
    const text = "This content has been deemed private, inappropriate or sensitive." +
        " As a result, your request will not be processed.";

    return replyToTweet($tagged_tweet_id, $twitter_username, text)
}

function replyToTweet($tagged_tweet_id, $twitter_username, text) {
    //391
    // console.log($tagged_tweet_id, $twitter_username, text);
    // return 1;
    // return false;
    if (
        $tagged_tweet_id && $twitter_username && text &&
        (((+new Date()) / 1000) > time)
    ) {


        T.post('statuses/update', {
            status: text,
            auto_populate_reply_metadata: true,
            in_reply_to_status_id: $tagged_tweet_id
        }, function (err, data, response) {
            // console.log(arguments);
            // console.log(JSON.stringify(arguments,null,2));

            if (err) {
                if (err.code === 185) {
                    //we hit daily limit
                    //add 30 minutes to time, to be used as time out
                    time = timeStamp() + (30 * 60)
                    $debug.reportError(JSON.stringify({err, data, response}, null, 4))

                } else {
                    $debug.reportError(err)
                }

                // console.trace(err);
                // $debug.reportError(JSON.stringify({err, data, response},null,3))

            } else if (data && (data = data['errors'])) {
                for (const err of data) {
                    if (err.message.includes("Rate limit exceeded")) {
                        time = +response.headers['x-rate-limit-reset'];
                        break;
                    }
                }
            } else {
                // console.log(JSON.stringify({data,headers: response.headers["x-rate-limit-remaining"],s:response.headers["x-rate-limit-reset"]},null,2));
            }
        });
        return true;
    } else {
        return false;
    }
}

async function videoQueueConsumer() {
    let start = +new Date();
    let delayInterval = 4 * 1000;


    connection.query(`SELECT twitter_tweet_id
                      FROM video_requests
                      WHERE twitter_video_url IS NULL
                      limit 100`,
        function (er, res, fid) {


            // console.log("wpw",er);
            if (er) {
                console.trace(er);
                $debug.reportError(er)

                throw (er); // not connected!
                // return;
            }


            if (!res.length) {

                setTimeout(videoQueueConsumer, delayInterval - (+new Date() - start))
                return;
            }

            let ids = [];

            res.forEach(function (item) {
                ids.push(item.twitter_tweet_id);
            });

            let ids_set = new Set(ids);

            getVid.post('statuses/lookup', {
                include_entities: true,
                id: ids.join(","),
                // trim_user: true,
                tweet_mode: "extended",// tells twitter API to return videos and stuff

            }, async function (err, data, response) {


                if (err || typeof data.length != "number") {
                    $debug.reportError(err || data)

                    console.trace(err || data);
                    setTimeout(videoQueueConsumer, 15 * 1000)


                    return;

                }


                for (const item of data) {
                    let media;

                    if (
                        (media = item.extended_entities)
                        && (media = media.media) && (["video", "animated_gif"].includes(media[0].type))
                    ) {

                        media = media[0].video_info.variants;

                        let max = -1;
                        let index = -1;

                        for (let g = 0; g < media.length; ++g) {
                            // let temp = media[g].bitrate || 0;
                            // if ((temp) >= max) {
                            //     max = temp;
                            //     index = g;
                            // }

                            try {
                                let temp = media[g].bitrate ? (await getVideoSizeMbAsync(media[g].url)) : 0;
                                // console.log(temp);
                                //makes sure the video we are sending is of max quality and less than 15 mb
                                if (temp >= max && temp <= 16) {
                                    max = temp;
                                    index = g;
                                }
                            } catch (e) {
                                console.trace(e);
                                $debug.reportError(e)
                            }
                        }

                        if (index !== -1) {
                            ids_set.delete(item.id_str)
                            const url = media[index].url;
                            const full_text = item.full_text;
                            const payload = item.extended_entities;

                            addURLToVidRequest(item.id_str, url, full_text, payload)

                        } else {
                            //todo send message to chat tell them their tweet video size is large
                            $debug.reportError({item, message: "video is too large"});
                            // twt_ids_trash.push(row.row_id);
                        }


                    }
                }


                let twt_ids_trash = Array.from(ids_set);


                deleteTweetsByTwtId(twt_ids_trash)
                deleteVidReqByTwtId(twt_ids_trash)

                if (res.length >= 100) {
                    setTimeout(videoQueueConsumer, 2000 - (+new Date() - start));
                } else {
                    setTimeout(videoQueueConsumer, delayInterval - (+new Date() - start))
                }


            });


        });

}

async function tweetsQueueConsumer() {
    let start = +new Date();
    let delayInterval = 3 * 1000;

    connection.query(`SELECT twt.twitter_tweet_id as twitter_tweet_id,
                             twt.tweet_text       as tweet_text,
                             twt.username         as twt_username,
                             twt.id               as twt_id,
                             twt.twitter_user_id  as twitter_user_id,
                             telegram_user_id,
                             last_twt_reply_at,
                             replied_to_whatsapp_at,
                             preference,
                             request_medium,
                             whatsapp_user_id,
                             expires_at,
                             black_listed,
                             reply_to
                      FROM tweets twt
                               left join users us on us.twitter_user_id = twt.twitter_user_id
                               left join video_requests vr on vr.twitter_tweet_id = twt.twitter_tweet_id
                               left join subscriptions sub on sub.twitter_user_id = twt.twitter_user_id
                      WHERE (twt.request_status IS NULL OR twt.request_status = 'PENDING')
                        AND (vr.twitter_video_url IS NOT NULL AND vr.twitter_video_url <> '')
                        AND request_medium in ('TWITTER_TIMELINE', 'TWITTER_DM')
                      limit 100`,
        function (er, res, fid) {
            // console.log(res);

            // console.log("wpw",er);
            if (er) {
                console.trace(er);
                $debug.reportError(er)

                setTimeout(tweetsQueueConsumer, 15 * 1000)
                // throw (er); // not connected!
                return;
            }

            if (!res.length) {
                setTimeout(tweetsQueueConsumer, delayInterval - (+new Date() - start))
                return;
            }
            // let bucket = {};
            let user_ids_reset = [];
            let user_ids_trash = [];
            let twt_ids_trash = [];
            const users_twt_replied_to = {};
            const users_replied_to = [];
            const blackList = [];
            res.forEach(function (item) {
                let $tweet_text = item.tweet_text.trim().replace(/.*@\w+\s*[\\\/]?/gi, '').toLocaleLowerCase();
                let $datum = {
                    sent_to_telegram: null,
                    reply_to: false,
                    twt_username: item.twt_username,
                    tagged_tweet_id: item.reply_to,
                    twitter_user_id: item.twitter_user_id,
                    sent_to_whatsapp: null,
                    row_id: item.twt_id
                };

                if ($tweet_text === "t") {
                    $datum.sent_to_telegram = "PENDING";

                    if (!item['telegram_user_id']) {
                        $datum.reply_to = "NON-LINKED-USER";
                    }

                } else if ($tweet_text === "w") {
                    $datum.sent_to_whatsapp = "PENDING";

                    if (!item['whatsapp_user_id']) {
                        $datum.reply_to = "NON-LINKED-USER";
                    }
                } else if ($tweet_text === "d") {
                    //delete request
                    twt_ids_trash.push(item.twt_id);
                    user_ids_trash.push(item.twitter_user_id);
                    return;
                } else if ($tweet_text === "r") {
                    //reset password request
                    twt_ids_trash.push(item.twt_id);
                    user_ids_reset.push(item.twitter_user_id);
                    return;
                } else if (['blacklist', 'block'].includes($tweet_text) &&
                    item.twt_username.toLowerCase().replace("@") === "sendmethisvideo") {
                    blackList.push(item.twitter_tweet_id)
                    twt_ids_trash.push(item.twt_id);
                    // $datum.black_listed = true;
                } else {
                    //if user did not use supported medium or command
                    //deduce where to send to from preference and if preferred channel is linked

                    if (item['whatsapp_user_id'] && (item.preference & usr_preference.whatsapp)) {
                        $datum.sent_to_whatsapp = "PENDING";
                    }

                    if (item['telegram_user_id'] && (item.preference & usr_preference.telegram)) {
                        $datum.sent_to_telegram = "PENDING";
                    }

                    //if the non-linked user made the request from twitter timeline and not from other places
                    if (item.request_medium === "TWITTER_TIMELINE" &&
                        (!item['telegram_user_id'])
                        &&
                        (!item['whatsapp_user_id'])
                    ) {
                        $datum.reply_to = "NON-LINKED-USER";
                    }
                }

                let window_period = new Date((timeStamp() - (3600 * 24)) * 1000);

                if (
                    $datum.sent_to_whatsapp &&
                    !$datum.reply_to
                    &&
                    (new Date(item.replied_to_whatsapp_at || "2021") < window_period)
                ) {


                    if (new Date(item.expires_at || "2021") > new Date()) {
                        $datum.reply_to = "IN-ACTIVE-WHATSAPP-USER";
                    } else {
                        $datum.reply_to = "UNSUBSCRIBED-WHATSAPP-USER";
                        $datum.sent_to_whatsapp = "UNSUBSCRIBED";
                    }
                }

                if (new Date(item.last_twt_reply_at || "2021") > window_period) {
                    $datum.reply_to = false;
                }


                updateTweetStatus(item.twt_id, $datum.sent_to_telegram, $datum.sent_to_whatsapp)
                if (item.black_listed && !users_twt_replied_to[$datum.twitter_user_id]) {

                    replyToBlackListedTweet($datum.tagged_tweet_id, $datum.twt_username) && users_replied_to.push($datum.twitter_user_id);

                } else if (($datum.reply_to === "NON-LINKED-USER") && !users_twt_replied_to[$datum.twitter_user_id]) {
                    users_twt_replied_to[$datum.twitter_user_id] = true;
                    replyToNonLinkedUser($datum.tagged_tweet_id, $datum.twt_username) && users_replied_to.push($datum.twitter_user_id);
                } else if (($datum.reply_to === "IN-ACTIVE-WHATSAPP-USER") && !users_twt_replied_to[$datum.twitter_user_id]) {
                    users_twt_replied_to[$datum.twitter_user_id] = true;
                    replyToInActiveWhatsAppUser($datum.tagged_tweet_id, $datum.twt_username, item.request_medium) && users_replied_to.push($datum.twitter_user_id);
                } else if (($datum.reply_to === "UNSUBSCRIBED-WHATSAPP-USER") && !users_twt_replied_to[$datum.twitter_user_id]) {
                    users_twt_replied_to[$datum.twitter_user_id] = true;
                    replyToUnSubscribedUser($datum.tagged_tweet_id, $datum.twt_username, item.request_medium) && users_replied_to.push($datum.twitter_user_id);
                }

            });

            updateUsersLastRepliedTo(users_replied_to)
            resetUsersPassword(user_ids_reset)
            deleteTweets(twt_ids_trash);
            deleteUsers(user_ids_trash);
            updateBlackListedRequest(blackList)

            if (res.length >= 100) {
                setTimeout(tweetsQueueConsumer, 2000 - (+new Date() - start));
            } else {
                setTimeout(tweetsQueueConsumer, delayInterval - (+new Date() - start))
            }

        });

}

function clearTwtPayload() {
    const expired = new Date();
    expired.setDate(expired.getDate() - 3);
    connection.query(`update video_requests
                      set twitter_payload =null
                      where created_at < ?`, [expired], function (er, res, fid) {

    })
}

async function runQueueConsumer() {
    videoQueueConsumer();
    tweetsQueueConsumer();

    setTimeout(clearTwtPayload, 3600 * 1000)

}


module.exports = runQueueConsumer;

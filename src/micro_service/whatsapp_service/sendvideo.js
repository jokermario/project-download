const W = require("./setup");
const connection = require("../db");
const $debug = require("../reportError")
const {timeStamp} = require("../../utils")
const Workers = require("../../workers")

const workers = new Workers();

function updateWATweetRq(twt_id, status, whatsapp_message_id) {

    return new Promise((resolve, reject) => {
        connection.query("update tweets set sent_to_whatsapp =?,request_status=?,whatsapp_message_id=? where id = ?", [status, 'PROCESSED', whatsapp_message_id, twt_id], function (errD, resD, fileD) {
            if (errD) {
                console.trace(errD);
                $debug.reportError(errD)

            }

            resolve(resD)
            // console.log(arguments,data);
        })
    })
}

function addTgUrlToVideoReq(tg_file_id, telegram_video_url) {

    return new Promise((resolve, reject) => {
        const sql = `update video_requests
                     set telegram_video_url =?,
                         updated_at=?
                     where telegram_file_id = ?`;
        connection.query(sql, [telegram_video_url, new Date(), tg_file_id],
            function (errD, resD, fileD) {
                if (errD) {
                    console.trace(errD);
                    $debug.reportError(errD)
                }

                resolve(errD || resD)
            })
    })
}

const processVidReqs = function (WBA) {
    let window_period = new Date((timeStamp() - (3600 * 24)) * 1000);
    const $sql = `select whatsapp_user_id,
                         vr.twitter_video_url as video_url,
                         twt.id               as twt_id,
                         telegram_file_id,
                         telegram_video_url,
                         twitter_video_status,
                         black_listed,
                         request_medium,
                         reply_to,
                         vr.updated_at        as link_validated_at
                  from users u
                           inner join tweets twt on twt.twitter_user_id = u.twitter_user_id
                           inner join video_requests vr on twt.twitter_tweet_id = vr.twitter_tweet_id
                           inner join subscriptions sub on sub.twitter_user_id = u.twitter_user_id
                  where whatsapp_user_id is not null
                    and (vr.twitter_video_url is not null OR telegram_file_id is not null)
                    and (sent_to_whatsapp = 'PENDING' OR
                         (request_medium = 'WHATSAPP' and sent_to_whatsapp is null))
                    AND replied_to_whatsapp_at > ?
                    AND expires_at > ?
                  group by whatsapp_user_id limit 5`;

    connection.query($sql, [window_period, new Date()], async function (error, rows, fields) {
        if (error) {
            setTimeout(processVidReqs, 15 * 1000, WBA);
            $debug.reportError(error)
            return console.trace(error);
        }
        // console.log(rows);

        let results = [];
        let cache = {}

        // console.log(rows);
        for (const row of rows) {

            let qry;
            try {
                const first_mgs = ['Pst', "Hello", "Yo", "Boss"];
                const second_mgs = ["Your video is ready", "Your request is good to go",
                    "I've got that covered", "It's all done"];
                const last_mgs = ['You can download it now',
                    "Here You Go ",
                    "click Download"];

                const caption = `${first_mgs[Math.floor(Math.random() * first_mgs.length)]}. `
                    + `${second_mgs[Math.floor(Math.random() * second_mgs.length)]}.` +
                    ` ${last_mgs[Math.floor(Math.random() * last_mgs.length)]} \n`
                let url = null;

                let res = null;
                if (row.black_listed) {
                    let $msg = "This content has been deemed private, inappropriate or sensitive." +
                        " As a result, your request will not be processed."
                    res = await WBA.sendTxtMsg(row.whatsapp_user_id, $msg, false);
                } else if (row.twitter_video_status === "ACTIVE") {
                    url = row.video_url
                } else if (row.telegram_file_id) {
                    //twitter link is no longer active
                    //try sending using telegram if we had stored any in db or cache
                    let _period = new Date((timeStamp() - 3600) * 1000);
                    let validated_at = new Date(row.link_validated_at || "2021")
                    if (cache[row.telegram_file_id] || row.telegram_video_url && (validated_at > _period)) {
                        //we still have a valid telegram link
                        url = cache[row.telegram_file_id] || row.telegram_video_url;
                    } else {
                        try {
                            //we dont have a valid telegram link fetching a new one
                            url = await workers.getNextWorker().getFileLink(row.telegram_file_id)
                            addTgUrlToVideoReq(row.telegram_file_id, url)
                            cache[row.telegram_file_id] = url;
                        } catch (e) {
                            $debug.reportError({e, row})
                        }
                    }

                }

                const filename = row.video_url.split("?")[0].split('/').reverse()[0]


                if (url) {
                    res = await WBA.sendDocMsgByUrl(row.whatsapp_user_id, url, filename, caption);
                } else if (!row.black_listed) {

                    let $msg = `Hello the video you requested could not ` +
                        `be sent to you because of one of the following \n` +
                        `1. The video tweet has been deleted. \n ` +
                        `2. The video tweet has restrictions on who is allowed to view it.\n\n` +
                        `Direct Link : ${row.video_url} \n` +
                        `If you  think this is not so, contact our support at \n` +
                        `https://wa.me/2348148459005 (+2348148459005)\n`
                        + `with the *tweet link* if possible, for further investigation .\n` +
                        `Kindly note messages sent to this chat might not get a  reply.`;
                    res = await WBA.sendTxtMsg(row.whatsapp_user_id, $msg, true);
                }

                if (res && res.messages && res.messages.length) {
                    qry = updateWATweetRq(row.twt_id, url ? "SUCCESS" : "FAILED", res.messages[0].id)
                } else {
                    qry = updateWATweetRq(row.twt_id, "FAILED", null)
                }
            } catch (e) {
                console.trace(e);
                $debug.reportError({e, row})
                qry = updateWATweetRq(row.twt_id, "FAILED", null)
            }

            results.push(qry)
        }


        if (results.length) {
            await Promise.all(results);
        }

        if (rows.length)
            setTimeout(processVidReqs, 2 * 1000, WBA);
        else {
            setTimeout(processVidReqs, 5 * 1000, WBA)
        }


    });

}

const startWhatsAppService = async () => {
    return W.then(function (WBA) {
        processVidReqs(WBA);
    });
}


module.exports = startWhatsAppService;

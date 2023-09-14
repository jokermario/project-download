const {bot, sendMsgProxy} = require("./setup");
const connection = require("../db");
const $debug = require("../reportError")
const {sleep, escapeMarkDown} = require("../../utils")

function unRegisterTgUser(tgUserIds) {
    connection.query(`update users
                      set telegram_user_id = null
                      where telegram_user_id in (?) `, [tgUserIds], async function (error, rows, fields) {

    });
}

function updateTgTweetRq(twt_id, status) {

    return new Promise((resolve, reject) => {
        connection.query("update tweets set sent_to_telegram =?,request_status=? where id = ?", [status, 'PROCESSED', twt_id], function (errD, resD, fileD) {
            if (errD) {
                console.trace(errD);
                $debug.reportError(errD)

            }

            resolve(resD)
            // console.log(arguments,data);
        })
    })
}

const processVid = function () {

    let limit = 20;
    let delay = 1000 / limit;
    const $sql = `select telegram_user_id,
                         twt.id               as twt_id,
                         vr.twitter_video_url as video_url,
                         telegram_group_id,
                         black_listed,
                         telegram_message_id,
                         twitter_video_status,
                         request_medium,
                         reply_to
                  from users u
                           inner join tweets twt on twt.twitter_user_id = u.twitter_user_id
                           inner join video_requests vr on twt.twitter_tweet_id = vr.twitter_tweet_id
                  where telegram_user_id is not null
                    and (vr.twitter_video_url is not null OR telegram_file_id is not null)
                    and (sent_to_telegram = 'PENDING' OR (request_medium = 'TELEGRAM' and sent_to_telegram is null))
                  group by telegram_user_id
                  limit ? `;
    // console.log($sql);
    connection.query($sql, [limit], async function (error, rows, fields) {
        if (error) {
            // reject(error); // not connected!
            // connection.release();
            setTimeout(processVid, 15 * 1000);
            $debug.reportError(error)

            return console.trace(error);

        }
        // console.log(rows);

        let results = [];

        let badUsers = [];
        const first_mgs = ['Pst', "Hello", "Yo", "Boss"];
        const second_mgs = ["Your video is ready", "Your request is good to go",
            "I've got that covered", "It's all done"];
        const last_mgs = ['You can download it now', "Here You Go", "click Download"];


        for (const row of rows) {

            const caption = `${first_mgs[Math.floor(Math.random() * first_mgs.length)]}. `
                + `${second_mgs[Math.floor(Math.random() * second_mgs.length)]}.` +
                ` ${last_mgs[Math.floor(Math.random() * last_mgs.length)]} \n` +
                `Feel free to join our support group  ` +
                `for feature suggestion or complains.\n` +
                `https://t.me/sendmethisvideo`
            const url = row.video_url;

            const $note = `Hello the video you requested could not ` +
                `be sent to you because of one of the following: \n` +
                `1. The video tweet has been deleted. \n ` +
                `2. The video tweet has restrictions on who is allowed to view it.\n\n` +
                `Direct video link: ${escapeMarkDown(url.replace(/\?.*/g, ""))} \n` +
                `contact our support at \n` +
                `https://t.me/sendmethisvideo`
                + ` \n if you have more enquiries.\n` +
                `Kindly note messages sent to this chat might not get a  reply.`;
            let $qry
            let form
            if (row.request_medium === "TELEGRAM") {
                form = {
                    reply_to_message_id: row.reply_to,
                    allow_sending_without_reply: true
                }
            } else {
                form = {};
            }
            try {


                // console.log(row,rows)
                if(row.black_listed){
                    let msg = "This content has been deemed private, inappropriate or sensitive." +
                        " As a result, your request will not be processed."
                    await bot.sendMessage(row.telegram_user_id, msg, form);

                    $qry = updateTgTweetRq(row.twt_id, "FAILED")
                } else if (row.telegram_group_id && row.telegram_message_id) {

                    form.caption = caption;
                    await bot.copyMessage(row.telegram_user_id, row.telegram_group_id, row.telegram_message_id, form);

                    $qry = updateTgTweetRq(row.twt_id, "SUCCESS")
                } else if (row.twitter_video_status === "ACTIVE") {
                    form.caption = caption;
                    await bot.sendVideo(row.telegram_user_id, url, form);

                    $qry = updateTgTweetRq(row.twt_id, "SUCCESS")
                } else {
                    await bot.sendMessage(row.telegram_user_id, $note, form);

                    $qry = updateTgTweetRq(row.twt_id, "FAILED")

                }

                results.push($qry);


            } catch (reason) {
                if (reason.code !== "ETELEGRAM") {
                    $debug.reportError({message: reason.message, row, code: reason.code, tag: "reason.code"})
                    $qry = updateTgTweetRq(row.twt_id, "FAILED")
                    results.push($qry);
                    continue;
                }


                if (reason.response.body.description.includes("wrong file identifier/HTTP URL")
                    || reason.response.body.description.includes("failed to get HTTP URL content")) {
                    try {

                        await bot.sendVideo(row.telegram_user_id, url.replace(/\?.*/g, ""), form);


                        $debug.reportError({
                            row,
                            tag: "appeared above",
                            "res": reason.response.body.description
                        })

                        $qry = updateTgTweetRq(row.twt_id, "SUCCESS")
                        results.push($qry);

                        continue;
                    } catch (e) {

                        $debug.reportError({message: e.message, row, tag: "appeared"})

                        try {
                            await bot.sendMessage(row.telegram_user_id, $note, form);
                        } catch (e_M) {
                            $debug.reportError({message: e_M.message, row, tag: "appeared_e_M"})
                        }

                    }

                } else if (
                    reason.response.body.description.includes("bot was blocked by the user")
                    || reason.response.body.description.includes("user is deactivated")) {

                    badUsers.push(row.telegram_user_id)
                } else {
                    sendMsgProxy(row.telegram_user_id, $note, form)
                    $debug.reportError({message: reason.message, row, tag: "final_err"})
                }
                $qry = updateTgTweetRq(row.twt_id, "FAILED")
                results.push($qry);

            }


            await sleep(delay);
        }
        // console.log(results);

        if (badUsers.length) {
            unRegisterTgUser(badUsers);
            badUsers = [];
        }
        if (results.length) {
            let ted = await Promise.all(results);
            // console.log(ted)
        }

        if (rows.length)
            setImmediate(processVid, 2000);
        else {
            setTimeout(processVid, 3 * 1000)
        }


    });

}


const startTelegramService = async () => {
    processVid();
}

module.exports = startTelegramService



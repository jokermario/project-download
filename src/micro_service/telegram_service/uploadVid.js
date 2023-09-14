'use strict';
const URL = require('url');
const path = require('path');
const mime = require('mime');
const request = require('request');
const qs = require('querystring');
const connection = require("../db");
const result = require('dotenv').config();
if (result.error) {
    throw result.error
}
const $debug = require("../reportError")
const {sleep, escapeMarkDown, formatTwitterTagWithMarkdown} = require("../../utils")
const Workers = require("../../workers")


function getFileData(data) {
    let telegram_group_id = data.chat.id;
    let telegram_message_id = data.message_id
    let telegram_file_id = null
    let telegram_file_type = 'unknown'
    if (data.video) {
        telegram_file_type = 'video';
        telegram_file_id = data.video.file_id
    } else if (data.animation) {
        telegram_file_type = 'animation';
        telegram_file_id = data.animation.file_id
    } else if (data.document) {
        telegram_file_type = 'document';
        telegram_file_id = data.document.file_id
    }

    return {
        telegram_group_id,
        telegram_file_id,
        telegram_file_type,
        telegram_message_id
    }

}

function uploadFile(token, video_url, chat_id, caption = "", parse_mode = "MARKDOWN") {
    return new Promise((resolve, reject) => {

        // url="https://video.twimg.com/ext_tw_video/1246174618190217217/pu/vid/400x400/e1C-OOpQj3ZinwVY.mp4?tag=10"

        let bot_id = token.match(/\d+/)[0] || "invalid_id"
        let file = request(video_url);

        // console.log("Uploading by File ", video_url)
        const filename = qs.unescape(URL.parse(path.basename(file.path)).pathname || "data.mp4");
        const contentType = mime.getType(filename) || 'application/octet-stream'
        const formData = {
            caption,
            disable_notification: "true",
            chat_id,
            parse_mode,
            video: {
                value: file,
                options: {
                    filename,
                    contentType,
                },
            },
        }

        let url = `https://api.telegram.org/bot${token}/sendVideo`
        const options = {
            url,
            qs: {},
            method: 'POST',
            formData
        };

        let upload = request(options, function (error, response, body) {

            if (error) {
                return reject({
                    bot_id,
                    error,
                    url
                });
            }

            let data;
            try {
                data = JSON.parse(body);
            } catch (err) {
                return reject({
                    message: `Error parsing response: ${body}`,
                    bot_id,
                    response,
                    err,
                    url
                });
            }

            if (data.ok) {
                data = data.result;
                resolve(getFileData(data))
            } else {
                return reject({
                    message: `upload failed`,
                    bot_id,
                    data,
                    url
                });
            }

        })

        file.on('response', function (response) {
            // console.log(response.statusCode) // 200
            // console.log(response.headers['content-type'])
            if (response.statusCode === 200) {
                return
            }

            file.abort()
            upload.abort()
            switch (response.statusCode) {

                case 404:
                    return resolve({twitter_video_status: "DELETED"})
                case 403:
                    return resolve({twitter_video_status: "FORBIDDEN"})
                default:
                    let twitter_status_code = response.statusCode,
                        content_type = response.headers['content-type']
                    return reject({
                        bot_id,
                        twitter_status_code,
                        content_type,
                        url
                    });
            }

        }).on('error', error => {
            $debug.reportError(error);
            file.abort()
            upload.abort()

            return reject({
                bot_id,
                error,
                url
            });
        })

    });


}

function updatedVideoReq(row_id, twitter_video_status, telegram_file_id, telegram_file_type, telegram_group_id, telegram_message_id) {

    if (arguments.length < 3) {
        throw new Error("invalid number of arguments")
    }

    let sql = `update video_requests
               set twitter_video_status= ?,
                   telegram_file_id    =?,
                   telegram_file_type  =?,
                   telegram_group_id   =?,
                   telegram_message_id =?
               where \`id\` = ? `;
    connection.query(sql, [twitter_video_status, telegram_file_id, telegram_file_type, telegram_group_id, telegram_message_id, row_id], async function (err, rows, fie) {
        if (err) {
            throw err;
        }
    });
}


let chat_id = "-1001441792155";
const workers = new Workers();


const request_per_minute = 20;

let delay = 60000 / request_per_minute;

let limit = 0;


let is_running = false;

async function run() {

    let sql = `select id, tweet_text, twitter_tweet_id, twitter_video_url
               from video_requests
               where telegram_file_id is null
                 and (twitter_video_url is not null and twitter_video_status = 'ACTIVE')
               limit ?`;
    connection.query(sql, [limit], async function (err, rows, fie) {
        if (err) {
            setTimeout(run, 15 * 1000)
            $debug.reportError(err);
            return console.trace(err);
        }

        let delayInterval = 5 * 1000;
        let startInterval = +new Date();
        let start, end
        const parse_mode = "MARKDOWN"
        for (const row of rows) {
            const caption =
                `----------------------------------
${formatTwitterTagWithMarkdown(escapeMarkDown(row.tweet_text || ""))} 
----------------------------------
link: https://twitter.com/i/status/${row.twitter_tweet_id}
`

            start = +new Date() + delay

            let result = {
                telegram_file_id: null,
                twitter_video_status: "UNKNOWN",
                telegram_group_id: null,
                telegram_file_type: null,
                telegram_message_id: null
            }
            try {
                let video = row.twitter_video_url;
                const worker = workers.getNextWorker();
                let res = await worker.sendVideo(chat_id, video, {caption, disable_notification: "true", parse_mode})
                    .then(function (data) {
                        return getFileData(data)
                    })
                    .catch(function (err) {
                        if (err.code !== 'ETELEGRAM') {
                            throw err
                        }

                        let data = err.response.body;

                        if (data.description.includes("wrong file identifier/HTTP URL")
                            || data.description.includes("failed to get HTTP URL content")) {
                            return uploadFile(worker.token, video, chat_id, caption, parse_mode)
                        }
                        data.video = video;
                        throw  data;

                    });
                Object.assign(result, res);
                if (result.telegram_file_id) {
                    result.twitter_video_status = "ACTIVE"
                }

            } catch (e) {
                if (e instanceof Error) {
                    let error = {
                        message: e.message,
                        stack: e.stack,
                    }
                    $debug.reportError({error});
                } else {
                    $debug.reportError(e);
                }

                // result = {
                //     telegram_file_id: null,
                //     twitter_video_status: "UNKNOWN"
                // }
            }

            updatedVideoReq(row.id, result.twitter_video_status, result.telegram_file_id,
                result.telegram_file_type, result.telegram_group_id, result.telegram_message_id);
            end = start - +new Date()
            // console.log(end)
            await sleep(end);
        }

        if (rows.length) {
            setTimeout(run, delayInterval)
        } else {
            setTimeout(run, delayInterval - (+new Date() - startInterval))
        }


    });

}

function setUp(...bot_tokens) {


    for (const bot_token of bot_tokens) {
        workers.addWorker(bot_token)
    }

    if (!workers.count()) {
        throw Error("no available bot tokens found")
    }

    delay /= workers.count();

    limit = request_per_minute * workers.count();

    delay = Math.max(delay, 1)
    limit = Math.min(limit, 60)

    if (!is_running) {
        is_running = true
        run();
        console.log("started running upload")

    }


}


module.exports = setUp


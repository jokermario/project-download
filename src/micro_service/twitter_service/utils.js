const connection = require("../db");
const $debug = require("../reportError")
const {sleep, timeStamp} = require("../../utils")
const request = require('request').defaults({encoding: null});


function deleteUsers($user_ids) {
    if (!$user_ids || typeof $user_ids.length !== "number") {
        throw  ("invalid number of functio parameter");
    }


    $user_ids.length && connection.query(`DELETE
                                          FROM users
                                          WHERE twitter_user_id in (?) `, [$user_ids], function (err, res, fie) {

        if (err) {
            throw err;
        }
        console.log({res, $user_ids});


    })

}


function deleteVidReqByTwtId($twt_post_ids) {
    if (!$twt_post_ids || typeof $twt_post_ids.length !== "number" && $twt_post_ids.length) {
        throw  ("invalid number of function parameter");
    }

    // console.log($twt_ids);
    // return;
    let swp = `DELETE
               FROM video_requests
               WHERE twitter_tweet_id in (?) `;
    // console.log(swp,$twt_ids);
    $twt_post_ids.length && connection.query(swp, [$twt_post_ids], function (err, res, fie) {

        if (err) {
            throw err;
        }

        // console.log({err,res,fie,swp});


    })

}

function deleteTweetsByTwtId($twt_post_ids) {
    if (!$twt_post_ids || typeof $twt_post_ids.length !== "number" && $twt_post_ids.length) {
        throw  ("invalid number of function parameter");
    }

    // console.log($twt_ids);
    // return;
    let swp = `DELETE
               FROM tweets
               WHERE twitter_tweet_id in (?) `;
    // console.log(swp,$twt_ids);
    $twt_post_ids.length && connection.query(swp, [$twt_post_ids], function (err, res, fie) {

        if (err) {
            throw err;
        }

        // console.log({err,res,fie,swp});


    })

}

function deleteTweets($twt_ids) {
    if (!$twt_ids || typeof $twt_ids.length !== "number" && $twt_ids.length) {
        throw  ("invalid number of function parameter");
    }

    // console.log($twt_ids);
    // return;
    let swp = `DELETE
               FROM tweets
               WHERE \`id\` in (?) `;
    // console.log(swp,$twt_ids);
    $twt_ids.length && connection.query(swp, [$twt_ids], function (err, res, fie) {

        if (err) {
            throw err;
        }

        // console.log({err,res,fie,swp});


    })

}

async function getVideoSizeMbAsync(options) {
    return new Promise((resolve, reject) => {
        getVideoSizeMb(options, resolve);
    });
}

function getVideoSizeMb(options, cb) {

    if ('string' === typeof options) {
        options = {
            uri: options
        }
    }
    options = options || {};

    options.method = 'HEAD';
    options.followAllRedirects = true;
    options.followOriginalHttpMethod = true;

    request(options, function (err, res, body) {
        if (err) {
            // console.trace(err);
            return cb(Infinity);
        }
        const code = res.statusCode;
        if (code >= 400) {
            cb(Infinity);
            // return console.trace(new Error('Received invalid status code: ' + code))
        }

        var len = res.headers['content-length'];
        if (!len) {
            cb(Infinity);
            // return console.trace(new Error('Unable to determine file size'))
        }
        len = +len;
        if (len !== len) {
            cb(Infinity);
            // return console.trace(new Error('Invalid Content-Length received'))
        }

        cb((+res.headers['content-length']) / (1024 * 1024))
    })
}


let request_queue = [];
let request_vid_queue = [];

function processTweet(tweet) {
    let reply_to = tweet.in_reply_to_status_id_str ? tweet.in_reply_to_status_id_str : tweet.quoted_status_id_str;
    let userId = tweet.user.id_str;
    let userName = tweet.user.screen_name;
    let text = tweet.text;
    let twt_id = tweet.id_str;

    // console.log({userName, reply_to, userId, text,twt_id});
    if (reply_to) {
        // if(reply_to==="1354657911444627460")
        // $debug.reportError({tweet})
        saveRequestFromTwitter(userName, reply_to, userId, text, twt_id)
    } else if (text.match(/(@.+)\s+[\/\\][d]$/)) {
        deleteUser(userId);
    } else if (text.match(/(@.+)\s+[\/\\][r]$/)) {
        resetUser(userId);
    }

    // console.log({reply_to, userId, userName, text})
}

function saveVidRequest(twitter_tweet_id) {
    request_vid_queue.push([twitter_tweet_id]);
    if (request_queue.length < 30) {
        return Promise.resolve("queued")
    }
}

function saveRequestFromTwitter($username, $tweetID, $twitter_user_id, $tweetText, $reply_to) {
    // console.log({$username, $tweetID, $twitter_user_id, $tweetText,$tagged_tweet_id});

    return saveRequest($username, $tweetID, $twitter_user_id, $tweetText, $reply_to, "TWITTER_TIMELINE");


}

function saveRequest($username, $tweetID, $twitter_user_id, $tweetText, $reply_to, $request_medium = "TWITTER_TIMELINE") {
    // console.log({$username, $tweetID, $twitter_user_id, $tweetText,$tagged_tweet_id});

    if (arguments.length !== 6) {
        console.trace(arguments);
        return Promise.reject("invalid number of function parameter.");

    }

    saveVidRequest($tweetID)

    request_queue.push([$username, $tweetID, $twitter_user_id, $tweetText, $reply_to, $request_medium]);

    if (request_queue.length < 30) {
        return Promise.resolve("queued")
    }

    return processRequestQueue();


}

function deleteUser($userID) {
    return new Promise((resolve, reject) => {
        if (!$userID) {
            reject("invalid number of function parameter");
        }

        connection.query(
            `DELETE
             FROM users
             WHERE twitter_user_id = ? `
            , [$userID],
            function (err, res, fil) {

                if (err) {
                    console.trace(err);
                    $debug.reportError(err)
                    reject(err)
                } else {
                    resolve(res, fil)
                }

            });
    })


}

function resetUser($userID) {

    return new Promise((resolve, reject) => {
        if (!$userID) {
            reject("invalid number of function parameter");
        }

        connection.query(
            `UPDATE users
             SET \`password\`=null
             WHERE twitter_user_id = ? `
            , [$userID],
            function (err, res, fil) {

                if (err) {
                    console.trace(err);
                    $debug.reportError(err)
                    reject(err)
                } else {
                    resolve(res, fil)
                }

            });
    })


}

function processRequestQueue() {

    return new Promise((resolve, reject) => {
            // if (request_queue.length % 4 !== 0)
            //     reject("invalid number of function parameter");

            if (request_queue.length <= 0 && request_vid_queue.length <= 0) {
                return resolve("no data");
            }


            if (request_queue.length > 0) {
                let sql = `INSERT IGNORE INTO tweets (username, twitter_tweet_id, twitter_user_id, tweet_text, reply_to,
                                                      request_medium)
                           VALUES ? `
                let temp = request_queue;

                request_queue = [];
                connection.query(sql, [temp],
                    function (err, res, fil) {
                        if (err) {
                            // console.trace(err);
                            $debug.reportError(err)
                            reject(err)
                        } else {
                            resolve({res, fil})
                        }

                    });
            }


            if (request_vid_queue.length > 0) {
                let sql = `INSERT IGNORE INTO video_requests(twitter_tweet_id)
                           values ? `;
                let temp = request_vid_queue;

                request_vid_queue = [];
                connection.query(sql, [temp],
                    function (err, res, fil) {
                        if (err) {
                            // console.trace(err);
                            $debug.reportError(err)
                            reject(err)
                        } else {
                            resolve({res, fil})
                        }

                    });

            }

        }
    );
}

setInterval(processRequestQueue, 1000);

async function getLastTwtId() {
    return new Promise((resolve, reject) => {
        connection.query(`select reply_to
                          from tweets
                          where request_medium = 'TWITTER_TIMELINE'
                          order by id desc
                          limit 1`, async function (err, res, field) {

            if (err) reject(err);
            else resolve(res.length ? res[0].reply_to : null);

        })
    });
}

module.exports = {
    processTweet,
    deleteUser,
    saveRequestFromTwitter,
    saveRequest,
    timeStamp,
    sleep,
    deleteUsers,
    deleteTweetsByTwtId,
    deleteVidReqByTwtId,
    deleteTweets,
    getVideoSizeMbAsync,
    getVideoSizeMb,
    getLastTwtId
}

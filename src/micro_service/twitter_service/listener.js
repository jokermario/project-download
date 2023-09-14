const T = require("./setup");
// const connection = require("../db");
const request = require('request').defaults({encoding: null});
const $debug = require("../reportError")
const {processTweet,getLastTwtId} = require("./utils")
const GetMentions = require("./getMentions")






module.exports = async function RunTwitterListener() {

    // pool.getConnection
    let timeout = undefined;
    // let last_tagged_tweet = null;
    let last_tagged_tweet = await getLastTwtId();


    let track = [];
    for (const username of [process.env.TWITTER_BOT_USERNAME,"smtv_pro"]) {
        track.push(
            `@${username} /t`,

            `@${username} \\t`,

            `@${username} /w`,

            `@${username} \\w`,

            `@${username} /d`,

            `@${username} \\d`,

            `@${username} /r`,

            `@${username} \\r`,

            `@${username}`
        )
    }

    const stream = T.stream('statuses/filter', {
        track
    });

    stream.on('connect', function (request) {
        $debug.sendMsg("Starting listening with request")
        // console.log("Starting listening with request")
        // let t = +new Date()
        request.on('data', function (data) {
            // console.log((+new Date()) - t)
            // t = +new Date();
            if (timeout)
                clearTimeout(timeout)
            timeout = setTimeout(function () {
                //we are experiencing a stall that wasn't detected early the twit lib
                // we try restarting the stream
               let code ="none"
                if (stream.response) {
                   code=stream.response.statusCode
                }
                const msg =`we are experiencing a stall that wasn't detected early by the twit lib \n`+
                    `we try restarting the stream \n`
                    +`response.statusCode:  ${code}`
                // console.trace(msg)
                $debug.sendMsg(msg)
                stream.stop();
                timeout = undefined;
                setTimeout(function () {
                    stream.start();
                }, 4 * 1000)

            }, 4 * 60 * 1000)

        });

    });
    stream.on('connected', function (response) {
        $debug.sendMsg("Started listening with response")
        let getMentions = new GetMentions(last_tagged_tweet);
        getMentions.process();

    });
    stream.on('tweet', function (twt) {
        last_tagged_tweet = twt.id_str
        // console.log({last_tagged_tweet});
        processTweet(twt)
    });


    let count = 0;
    stream.on('reconnect', function (request, response, connectInterval) {
        //...
        ++count;
        let statusCode="none"
        if(response){
            statusCode=response.statusCode;
        }
        $debug.sendMsg(JSON.stringify({msg: "restarting server", time: new Date(), count,
            connectInterval,statusCode},null,4));
        // console.log({msg: "restarting server", time: new Date(), count,
        //     connectInterval,statusCode});
        // console.log({request, response, connectInterval});
    });
    stream.on('error', function (error) {
        //...

        if (error.code === 130 || error.statusCode === 503) {

            const msg = `twitter over capacity error : ${error.twitterReply}`;
            let options = {
                uri: `portal.nigeriabulksms.com/api/?username=kelechiemmanuel45@gmail.com&password=12344321&message=${encodeURI(msg)}&sender=AWS&mobiles=2347018225863`

            };

            options.method = 'GET';
            options.followAllRedirects = true;
            options.followOriginalHttpMethod = true;

            request(options, function (err, res, body) {

            })

        }
        // console.trace(arguments);
        $debug.reportError(error)
    });

    stream.on('limit', function (limitMessage) {
        //...
        // console.trace(limitMessage);
        $debug.reportError(limitMessage)
    })

    stream.on('disconnect', function (disconnectMessage) {
        //...
        // console.trace(arguments);
        $debug.reportError(disconnectMessage)
        $debug.sendMsg(" trying to restart streaming after disconnection");
        process.nextTick(() => {
            stream.start();
            $debug.sendMsg("restarting streaming after disconnection")
        })
    })

    stream.on('direct_message', function (directMsg) {
        //...
        // console.trace(arguments);
        $debug.reportError(directMsg)

    });
    stream.on('parser-error', function (directMsg) {
        //...
        // console.trace(arguments);
        $debug.reportError(directMsg)

    });


    // let eventNames = ["quoted_tweet", "retweeted_retweet",
    //     "favorited_retweet", "unknown_user_event",
    //     "user_update"];
    //
    // for (let eventName of eventNames) {
    //     stream.on(eventName, function (event) {
    //         //...
    //         // console.trace({eventName, event});
    //         $debug.reportError({eventName, event})
    //     })
    // }

    return stream;

};

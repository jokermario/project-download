"use strict"

const request = require('request');

function chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size)
    }

    return chunks
}

function sendMsg(msg) {

    let substrChunks = chunkSubstr(msg, 3900);
    let number = Math.random();
    let i = 0;

    function sendMsgHelper(message) {

        const token = "1129919841:AAGAucq0L2AyERCE1UyXPcCGnQCreZh5xNE";
        const url = `https://api.telegram.org/bot${token}/sendMessage`
        let text = `#${number} id := ${i++}
 <pre>${message}</pre>`
        let options = {
            url: url,
            'method': 'POST',
            json: {
                chat_id: "-1001456517197",
                text,
                parse_mode: "HTML"
            }
        }

        request(options, function (error, response) {

            if (error) {
                console.log("error was encountered while reaching telegram server")
                console.log(error);
                return;
            }
            if (!response.body.ok) console.log(response.body, text.length, text)
            if (substrChunks.length) {
                setTimeout(function () {
                    sendMsgHelper(substrChunks.shift())
                }, 3000)

            }
            // console.log(response);
        })
    }

    sendMsgHelper(substrChunks.shift())

}

function reportError(...args) {
    try {
        for (let i = 0; i < args.length; i++) {
            let e = args[i];
            if (e instanceof Error) {
                let error = {
                    message: e.message,
                    stack: e.stack,
                }
                args[i] = {error}
            }

        }
        let payload = JSON.stringify(args, null, 1).replace(/[<>&]/g, "#tag");
        const err = new Error("");
        let s = err.stack.split('\n')[2].trim();
        payload += "\n" + s.replace(/[<>]/g, "*") + "\n" +
            "#error";
        // console.log(payload);
        sendMsg(payload)
        // console.trace(args);
    } catch (e) {
        console.log(e);
    }

}


module.exports = {
    reportError,
    sendMsg
}

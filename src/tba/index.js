const TelegramBot = require('node-telegram-bot-api');

const $debug = require("../micro_service/reportError")


function init(token,options={onlyFirstMatch:true,filepath: false,}){

    // Create a bot using the credentials provided
    const bot = new TelegramBot(token, options)

    function sendMsgProxy(chatId, response,options={}){
        options.parse_mode='MARKDOWN';
        bot.sendMessage(chatId, response,options).catch(reason => {
            $debug.reportError({reason,chatId, response})
        });
    }

    bot.on("error",function (reason) {
        console.trace(reason);
        $debug.reportError(reason.message)
    })

    return {bot,sendMsgProxy}

}

module.exports=init;

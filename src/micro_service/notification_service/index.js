"use strict"
const TelegramBot = require('node-telegram-bot-api');
const $debug = require("../reportError")
const {chunkSubstr} = require("../../utils");

const  tba = require("../../tba")



function init(bot_token,chatId,interval_ms=3000) {
    const functionQ =[];
    let globMsg = "";
    let globMsgQ =[];
    let globVidQ =[];
    // let globImgQ =[];
    // let globVnQ =[];
    // let globDocQ =[];
    let msg_chuck_size =4070;

    if (!chatId) {
        chatId ="-1001456517197";
    }

    let $this = this;

// Create a bot that uses 'polling' to fetch new updates
    const {bot} =  tba(bot_token, {onlyFirstMatch:true,filepath: false,})

   async function processQ() {
        if (functionQ.length) {
            const func = functionQ.shift();
            try {
                await func()
            }catch (e) {
                console.log("error was encountered while reaching telegram server");
            }

        }
    }

    function processVidQ() {
        if(globVidQ.length){
            let vidData = globVidQ.shift();
            return bot.sendVideo(chatId,vidData.video,{ caption:vidData.caption,parse_mode:"HTML"}).finally(function () {
                if(globMsgQ.length){
                    functionQ.push(processVidQ)
                }
            }).catch(function (e) {
                $debug.reportError(e.message)
                console.log(e);
            })

        }
    }
    function processMsgQ(){

        if(globMsg.length){
            globMsgQ.push(...chunkSubstr(globMsg,msg_chuck_size))
            globMsg="";
        }
        if(globMsgQ.length){

            return bot.sendMessage(chatId,globMsgQ.shift(),{ parse_mode:"HTML"}).finally(function () {
                if(globMsgQ.length){
                    functionQ.push(processMsgQ)
                }
            }).catch(function (e) {

                console.log(e);
            })

        }
    }

    $this.sendVideo= function (video,caption="no caption"){
        if (!(globVidQ.length)){
            functionQ.push(processVidQ)
        }
        globVidQ.push({video,caption})
    }
    $this.sendMsg =function (msg) {
        if (!(globMsg.length||globMsgQ.length)){
            functionQ.push(processMsgQ)
        }


        let temp =msg + "\n*******************************\n"
        if((temp.length+globMsg.length) > msg_chuck_size){
            globMsgQ.push(...chunkSubstr(globMsg,msg_chuck_size))
            globMsg=temp;
        }else {
            globMsg += temp;
        }


    }

    setInterval(processQ,interval_ms)
    return {sendMsg: this.sendMsg,sendVideo:this.sendVideo};


}


module.exports=init;

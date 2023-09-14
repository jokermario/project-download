let MessageNotification=require("../notification_service")

// replace the value below with the Telegram token you receive from @BotFather
// const token = '594442914:AAGddiEBcfu1cWY1TfvNIRJJgxvYF26VBcw';
// const chatId = "289939806";
const token ="1188850355:AAGTlX2iRSKfw9IZBEhRmW7fqOeSCPlSUTM";
const chatId = "-1001456517197";
const messageNotification = new MessageNotification(token,chatId);


module.exports=messageNotification;

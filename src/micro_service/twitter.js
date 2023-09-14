const RunTwitterListener = require("./twitter_service/listener");
const runGetVid = require("./twitter_service/getVid");
const GetMentions = require("./twitter_service/getMentions");

module.exports = async function startUpTwitter() {

    // GetMentions.RunGetMentionsTask().then(() => console.log("RunGetMentionsTask exited no error"))
    //     .catch((e) => console.trace("RunGetMentionsTask exited with error", e));
    //
    RunTwitterListener()
        .then(() => console.log("RunTwitterListener exited no error"))
        .catch((e) => console.trace("RunTwitterListener exited with error", e));


    runGetVid().then(() => console.log("runGetVid exited no error"))
        .catch((e) => console.trace("runGetVid exited with error", e));


};

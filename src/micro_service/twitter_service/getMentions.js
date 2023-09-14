const T = require("./setup");
const connection = require("../db");
const $debug = require("../reportError")
const {processTweet, sleep,getLastTwtId} = require("./utils")


class GetMentions {

    constructor($since_id = null, $max_id = null, $interval = 12) {
        this.prev_since_id = $since_id;
        this.prev_max_id = $max_id;
        this.checkInterval = $interval;
        this.fetch_more = true;
        this.since_id = null;
        this.max_id = null;
    }

    async process() {
        let $options = {
            "count": 200,
            "limit": 200,
            "include_rts": true,
//    "include_entities"=>false,
//    "trim_user"=>1,
        }
        if (this.prev_max_id) {
            $options["max_id"] = this.prev_max_id;
        }
        if (this.prev_since_id) {
            $options["since_id"] = this.prev_since_id;
        }
        let i = 0
        try {
            do {
                let {data} = await this.getMentions($options);
                if (data.length) {
                    //calculate the offset to be used as max_id of the next request
                    $options.max_id = (BigInt(data[data.length - 1].id_str) - 1n).toString();

                    // we only need to set this once in the first request
                    if (!this.since_id) {
                        this.since_id = data[0].id_str;
                    }
                    this.max_id = $options.max_id;
                    this.processMentions(data);
                    await sleep(1000)

                } else {
                    this.fetch_more = false;
                    console.log(this)
                }
            } while (this.fetch_more)
            // check if we have made any success request b4 leaving loop
            if (this.max_id) {
                // we update task as done
                this.updateTaskStatus(this.since_id, this.prev_since_id, "DONE")
            }

        } catch (e) {

            console.log(e);
            $debug.reportError(e)
            // check if we have made any success request before hitting an error
            // store this check point
            if (this.max_id) {
                // we update task as failed
                this.updateTaskStatus(this.max_id, this.prev_since_id, "FAILED", JSON.stringify(e))
                // we update part that is done
                this.updateTaskStatus(this.since_id, this.max_id, "DONE")
            }
        }


    }

    async getMentions($options) {
        return T.get("/statuses/mentions_timeline", $options);
    }

    processMentions(dataArr) {
        for (let dataArrElement of dataArr) {
            processTweet(dataArrElement);
            // let tweetId = dataArrElement.id_str, userId = dataArrElement.user.id_str,
            //     username = dataArrElement.user.screen_name, text = dataArrElement.text,
            //     reply_to = dataArrElement.in_reply_to_status_id_str ? dataArrElement.in_reply_to_status_id_str : dataArrElement.quoted_status_id_str;
            //
            // // console.log({
            // //     tweetId,
            // //     userId,
            // //     username,
            // //     text,
            // //     reply_to
            // // })
            // if (reply_to) {
            //     saveRequestFromTwitter(username, reply_to, userId, text, tweetId)
            // } else if (text.match(/(@.+)\s+[\/\\][d]$/)) {
            //     deleteUser(userId);
            // }
        }
    }


    updateTaskStatus($max_id, $since_id, $status, $memo = "") {

        if (!($max_id || $since_id)) {
            return;
        }

        connection.query(`INSERT INTO mentions(max_id, since_id, status, memo)
                              VALUE (?, ?, ?, ?)
                          ON DUPLICATE KEY UPDATE status = status,
                                                  memo=memo`,
            [$max_id, $since_id, $status, $memo = ""], function (err, result, fields) {

            })
    }


}


module.exports = GetMentions;

async function runNextTask() {

    connection.query(`select since_id, max_id
                      from mentions
                      where status = ?
                      order by id desc
                      limit 1`, ["NEXT"], async function (err, res, field) {
        let timeout = 3;
        if (res.length) {
            let getMentions = new GetMentions(res[0].since_id, res[0].max_id);

            await getMentions.process();
            timeout = 1;
            //  make sure we are not running a retry
            // eg a task that ran half way and failed and was scheduled for a re-run
            // we only want to set the header for the next run when we want
            // to get new mentions
            if (!getMentions.prev_max_id && getMentions.since_id) {
                //        store next run point
                getMentions.updateTaskStatus(null, getMentions.since_id, "NEXT");
            }
        } else {

        }

        setTimeout(runNextTask, timeout * 60 * 1000)

    });

}

 async function RunGetMentionsTask(once = true) {


    let last_twt_id = await getLastTwtId();
     if (last_twt_id) {
         console.log({last_twt_id});
         let getMentions = new GetMentions(last_twt_id);
         await getMentions.process();
         if (!once) {
             getMentions.updateTaskStatus(null, getMentions.since_id, "NEXT");
             setTimeout(runNextTask, 3 * 60 * 1000)
         }

     }
}

GetMentions.RunGetMentionsTask = RunGetMentionsTask;
GetMentions.runNextTask = runNextTask;

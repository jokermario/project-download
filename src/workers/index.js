const TgBot = require("../tba")


const token = "1129919841:AAGAucq0L2AyERCE1UyXPcCGnQCreZh5xNE";/*debug*/
let tokens = [
    token,
    "597907156:AAGSgb92OO0R-bMxJ6wDGNiY08yU3siy-Pc", /*lady kat*/
];

class Workers {
    constructor(...bot_tokens) {
        bot_tokens = bot_tokens.length ? bot_tokens : tokens

        this.workers = []
        for (const bot_token of bot_tokens) {
            this.addWorker(bot_token)
        }
        this.current_worker = -1;
    }

    addWorker(bot_token) {
        this.workers.push(TgBot(bot_token).bot)
    }

    getWorker(i) {
        return this.workers[i];
    }

    getNextWorker() {
        this.current_worker = ++this.current_worker % this.count();
        return this.getWorker(this.current_worker)
    }

    count() {
        return this.workers.length
    }
}


module.exports = Workers

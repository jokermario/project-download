function chunkSubstr(str, size = 4070) {
    if (str.length < size) {
        return [str]
    }
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size)
    }

    return chunks
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtmlTag(string="") {
    let escaped = {"<": "&lt;", ">": "&gt;", "&": "&amp;",};
    return string.replace(/([<>&])/g, function ($2) {
        return escaped[$2];
    })
}

function escapeMarkDown(string="") {
    return string.replace(/([_*`\[])/g, function ($2) {
        return "\\" + $2;
    })
}

function formatTwitterTagWithMarkdown(string="") {
    return string.replace(/@([\w\\_]+)/g, "[@$1](https://twitter.com/$1)");
}

function timeStamp(divisor = 1000) {
    return Math.floor((+new Date()) / divisor);
}

module.exports = {chunkSubstr, sleep, timeStamp, escapeHtmlTag, escapeMarkDown,formatTwitterTagWithMarkdown}

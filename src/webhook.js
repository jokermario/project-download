"use strict"
const ServiceCallback = require("./callback")
const $debug = require("./micro_service/reportError")

ServiceCallback()
    .then(() => {
        console.log("ServiceCallback exited no error");
        $debug.sendMsg("ServiceCallback exited no error")
    })
    .catch((e) => $debug.reportError("ServiceCallback exited with error", e))

"use strict"

const request = require('request');

function reportError(...args) {

    console.trace(args);
}

function formatApplicationError(err_obj) {
    let message = err_obj;
    if (typeof err_obj === "object") {
        message = err_obj.message || "unknown error occurred. check payload parameter"
    }
    return formatErrorResponse(message,
        0, err_obj, "module")
}

function formatHttpError(err_obj) {
    let message = err_obj;
    if (typeof err_obj === "object") {
        message = err_obj.message || "unknown http error occurred. check payload parameter"
    }
    return formatErrorResponse(message,
        1, err_obj, "http")
}

function formatWhatsAppError(err_response) {
    const $payload = {
        url: err_response.request.href,
        method: err_response.request.method,
        body: err_response.request.body.length < 500 ? err_response.request.body : "{'message':payload too large could, skipping display}",
        status_code: err_response.statusCode,
        status_message: err_response.statusMessage,
    }
    let message = `WhatsApp: a http ${$payload.status_message} (${$payload.status_code}) error occurred while executing 
    a ${$payload.method} request to  ${$payload.url}
     with the following payload ${$payload.body}`;

    // console.log(err_response.request);
    return formatErrorResponse(message, 2, $payload, "whatsapp")
}


const formatErrorResponse = (message, code, payload, error_medium) => ({message, code, payload, error_medium});


// const options = {
//     'method': 'POST',
//     'url': 'https://whatsapp-api-61.clare.ai/v1/users/login',
//     'headers': {
//         'Content-Type': 'application/json',
//         // 'Authorization': 'Basic Q2ludHJ1c3Q6U2ltcGxlMzAxQA=='
//     },
//     // json: {
//     //     "new_password": "Nobemebemyprick301@"
//     // }
// };

async function WBA(credentials) {
    if (typeof credentials !== 'object') {
        throw formatApplicationError(new TypeError('config must be object, got ' + typeof credentials))
    }

    if (typeof credentials.admin_username !== "string" || !credentials.admin_username) {
        throw formatApplicationError(new TypeError('admin_username must be string and not empty, got ' + credentials.admin_username))
    }

    if (typeof credentials.admin_password !== "string" || !credentials.admin_password) {
        throw formatApplicationError(new TypeError('admin_password must be string and not empty, got ' + credentials.admin_password))
    }


    if (typeof credentials.api_url !== "string" || !credentials.api_url) {
        throw formatApplicationError(new TypeError('api_url must be string and not empty, got ' + credentials.api_url))
    }

    // this.credentials = credentials;
    // if(typeof credentials.user_auth_token !=="string" ||credentials.user_auth_token){
    //     throw new TypeError('user_auth_token must be string and not empty, got ' + credentials.user_auth_token)
    // }

    /**
     * @param {string} resource_path
     * @param {{}|{method: string, auth: {pass: string, sendImmediately: boolean, user: string}, json: {wow: string}}} options
     * @param {function|undefined} callback
     */
    const makeApiRequest = (resource_path, options = {}, callback = undefined) => {

        if (!resource_path) {
            throw new Error("missing resource path");
        }
        if (!options.headers) {
            options.headers = {}
        }
        options.url = `${credentials.api_url}/v1/${resource_path}`
        options.headers["Content-Type"] = 'application/json';
        options.headers["Accept"] = 'application/json';

        request(options, callback);

    }
    let UserAuthToken = undefined;

    const makeAuthApiRequest = (resource_path = "", options = {}, callback = undefined) => {
        if (!UserAuthToken) {
            throw new Error("missing Bearer Token, Make sure init is executed successfully before You calling any method");
        }

        options.auth = {
            bearer: UserAuthToken
        }
        makeApiRequest(resource_path, options, callback);

    }

    /**
     * @param { string} username
     * @param {string } password
     */
    const loginUser = async (username, password) => {

        return new Promise(function (resolve, reject) {

            if (!(username && password)) {
                reject(formatApplicationError(new Error("missing login parameters")));
            }
            let options = {
                'method': 'POST',
                'auth': {
                    'user': username,
                    'pass': password,
                    'sendImmediately': false
                },
                json: {}
            }

            makeApiRequest("users/login", options, function (error, response) {
                // console.log(error);
                if (error) reject(formatHttpError(error));

                // console.log(response.request);
                if (response.statusCode === 200) {
                    resolve(response.body)
                    // console.log(response);
                    // console.log(response.body)
                    // let users = response.body.users;
                    // // console.log(users)
                    // if( users && users.length){
                    //     //   console.log({arguments,responseBody,jsonData,"users":users})
                    //     UserAuthToken = users[0].token;
                    //
                    //     console.log(UserAuthToken);
                    // }

                } else {
                    reject(formatWhatsAppError(response))
                    // UserAuthToken = undefined;
                    // reportError({response})
                }

            })
        });
        // request.post(options, ).auth(process.env.ADMINUSERNAME, process.env.ADMINPASSWORD, false);
    };


    const sendApiMsg = (to, json, callback) => {

        if (!(to && json)) {
            throw new Error("missing sendApiMsg parameters");
        }

        json.to = to;
        const options = {
            method: 'POST',
            json: json
        }

        makeAuthApiRequest("messages", options, callback)
    }

    const sendTxtMsg = async (to, text, has_url = false) => {


        return new Promise((resolve, reject) => {

            if (!(to && text)) {
                return reject(formatApplicationError(new Error("missing sendTxtMsg function  parameters")))
            }
            if (text.length > 5000) {
                text.substr(0, 5000)
                console.warn("text payload length is more than 5000 truncating")
            }
            const json = {
                "type": "text",
                "recipient_type": "individual",
                "text": {
                    "body": text
                }
            }

            if (has_url) {
                json.preview_url = true;
            }

            sendApiMsg(to, json, function (error, response) {
                if (error) return reject(formatHttpError(error));

                if (response.statusCode === 201) {
                    return resolve(response.body);
                }
                return reject(formatWhatsAppError(response))
            });

        });

    };

    /**
     * @param {string} to
     * @param {string} file_url
     * @param {string} file_name
     * @param {string} caption
     */
    const sendDocMsgByUrl = async (to, file_url, file_name, caption = "here you go") => {


        return new Promise(function (resolve, reject) {


            try {
                if (!(to && file_url && file_name)) {
                    return reject(formatApplicationError(new Error("missing function parameters")))
                }

                const json = {
                    type: "document",
                    recipient_type: "individual",
                    document: {
                        "caption": caption || "",
                        "link": file_url,
                        "filename": file_name
                    }
                }

                sendApiMsg(to, json, function (error, response) {
                    if (error) return reject(formatHttpError(error));

                    if (response.statusCode === 201) {
                        return resolve(response.body);
                    }
                    return reject(formatWhatsAppError(response))
                })
            } catch (e) {
                reject(formatApplicationError(e))
            }

        });


    };

    /**
     * @param {string} to
     * @param {string} file_url
     * @param {string} caption
     */
    const sendVideoMsgByUrl = async (to, file_url,  caption = "here you go") => {


        return new Promise(function (resolve, reject) {


            try {
                if (!(to && file_url )) {
                    return reject(formatApplicationError(new Error("missing function parameters")))
                }

                const json = {
                    type: "video",
                    recipient_type: "individual",
                    video: {
                        "caption": caption || "",
                        "link": file_url,
                    }
                }

                sendApiMsg(to, json, function (error, response) {
                    if (error) return reject(formatHttpError(error));

                    if (response.statusCode === 201) {
                        return resolve(response.body);
                    }
                    return reject(formatWhatsAppError(response))
                })
            } catch (e) {
                reject(formatApplicationError(e))
            }

        });


    };

    const initialize = async function () {
        try {

            const $payload = await loginUser(credentials.admin_username, credentials.admin_password);


            let users = $payload.users;
            if (users && users.length) {
                UserAuthToken = users[0].token;
                // console.log(UserAuthToken);
                setTimeout(initialize, 1000 * 3600 * 24 * 5)
            } else {
                let applicationError = formatApplicationError(new Error("unknown error was encountered while authenticating user"));
                console.log(applicationError);
                return Promise.reject(applicationError)
            }
        } catch (e) {
            UserAuthToken = undefined;
            throw e;
        }
    }

    await initialize();
    return {sendTxtMsg, sendDocMsgByUrl,sendVideoMsgByUrl}
}


// request(options, function (error, response) {
//     if (error) throw new Error(error);
//     console.log(response.body);
// });


// request();


module.exports = WBA

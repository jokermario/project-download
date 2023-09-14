const request = require('request-promise');
const errors = require('./error');


//https://video.twimg.com/ext_tw_video/1308966959443333121/pu/vid/680x388/H8TOVpycg_mez4Mm.mp4?tag=10
//TEST IT WITH WHATSAPP SEND VIDEO WITH URL

function WbaApi(options) {

    if (typeof options !== 'object') {
        options = {};
    }
    let credentials ={};

    credentials.admin_username = (typeof options.admin_username !== "string") ? "" : options.admin_username;
    credentials.admin_password = (typeof options.admin_password !== "string") ? "" : options.admin_password;
    credentials.auth_token = (typeof options.auth_token !== "string") ? undefined : options.auth_token;
    credentials.api_url = (typeof options.api_url !== "string") ? undefined : options.api_url;

    let $this = this;

    const makeApiRequest = (resource_path, options = {}) => {
        if (!credentials.api_url) {
            return Promise.reject(errors.formatApplicationError("WBA api url not provided!"));
        }
        if (!resource_path) {
            return Promise.reject(errors.formatApplicationError("missing url resource path"));
        }
        if (!options.headers) {
            options.headers = {}
        }

        options.resolveWithFullResponse = true;
        options.simple = false;
        options.url = `${credentials.api_url}/v1/${resource_path}`
        options.headers["Content-Type"] = 'application/json';
        options.headers["Accept"] = 'application/json';
        return request(options).catch(function (err) {

            // console.log({err});
            return Promise.reject(errors.formatHttpError(err));


        });
    }

    const makeAuthApiRequest = (resource_path = "", options = {}) => {
        if (!credentials.auth_token) {
            return Promise.reject(
                errors
                    .formatApplicationError(
                        "missing Bearer Token, Make sure initialize is executed successfully before You calling any method"
                    )
            );
        }
        options.auth = {
            bearer: credentials.auth_token
        }
        return makeApiRequest(resource_path, options);
    }

    const Users = function () {

        const makeUsersApiRequest = (resource_path = "", options = {}, needs_auth = true) => {
            const url_path = `users/${resource_path}`;
            if (needs_auth) {
                return makeAuthApiRequest(url_path, options);
            } else {
                return makeApiRequest(url_path, options)
            }
        }

        const logOutUser = () => {

            let options = {
                'method': 'POST',
                json: {}
            }
            return makeUsersApiRequest("logout", options).then(function (response) {

                if (response.statusCode === 200) {
                    return response.body;
                }
                return Promise.reject(
                    errors.formatWhatsAppError(response)
                );

            })
        }
        const loginUser = (username, password, persist_user = false) => {

            if (!(username && password)) {
                return Promise.reject(
                    errors
                        .formatApplicationError(
                            "missing login parameters"
                        )
                );
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
            return makeUsersApiRequest("login", options, false)
                .then(function (response) {
                    if (response.statusCode === 200) {
                        let $payload = response.body;
                        if(persist_user){
                            let users = $payload.users;
                            if (users && users.length) {
                                // credentials.auth_token = users[0].token;
                                setAuthToken(users[0].token);
                                // console.log(UserAuthToken);
                                return $payload;
                            } else {
                                let applicationError = errors.formatApplicationError(new Error("unknown error was encountered while authenticating user"));
                                // console.log(applicationError);
                                return Promise.reject(applicationError)
                            }
                        }

                        return $payload;
                    }

                    return Promise.reject(
                        errors.formatWhatsAppError(response)
                    );

                })
        }


        this.loginUser = loginUser;
        this.logOutUser = logOutUser;

        return {loginUser,logOutUser};
    }

    const Messages = function () {


        const makeMsgApiRequest = (resource_path = "", options = {}) => {
            return makeAuthApiRequest(`messages/${resource_path}`, options);
        }

        const sendMsg = (to, json) => {
            if (!(to && json)) {
                return Promise.reject(
                    errors
                        .formatApplicationError(
                            "missing sendApiMsg parameters"
                        )
                );
            }
            json.to = to;
            const options = {
                method: 'POST',
                json: json
            }
            return makeMsgApiRequest("", options).then(function (response) {

                if (response.statusCode === 201) {
                    return (response.body);
                }
                return Promise.reject(
                    errors
                        .formatWhatsAppError(response)
                );

            });
        }
        const sendTxtMsg = (to, text, has_url = false) => {

            if (!(to && text)) {
                return Promise.reject(
                    errors
                        .formatApplicationError(
                            "missing sendTxtMsg parameters"
                        )
                );
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

            return sendMsg(to, json);

        }
        const markMsgAsRead = (message_id = "") => {
            if (typeof message_id !== "string") {
                return Promise.reject(
                    errors
                        .formatApplicationError(
                            "message_id parameter is missing "
                        )
                );
            }
            const options = {
                method: 'PUT',
                json: {
                    status: "read"
                }
            }
            return makeMsgApiRequest(message_id, options);

        }


        this.sendMsg = sendMsg;
        this.sendTxtMsg = sendTxtMsg;
        this.markMsgAsRead = markMsgAsRead;
        return {sendMsg, sendTxtMsg, markMsgAsRead};


    }


    this.users = new Users();
    this.messages = new Messages();


    const setAuthToken = (auth_token) => {
        credentials.auth_token = auth_token
    }

    const setAdminUsername = (admin_username) => {
        credentials.admin_username = admin_username
    }

    const setAdminPassword = (admin_password) => {
        credentials.admin_password = admin_password
    }
    const setApiUrl = (api_url) => {
        credentials.api_url = api_url
    }

    const initialize = () => {
        return $this.users.loginUser(credentials.admin_username, credentials.admin_password,true)
            .then(function ($payload) {
                //todo make use of $payload to calculate a better timer
                //todo until then redo every 5 days
                setTimeout(initialize, 1000 * 3600 * 24 * 5)
              return $this;
            }).catch(function (error) {
                setAuthToken(undefined)
                // credentials.auth_token = undefined;
                return Promise.reject(error)
            })
    }


    this.credentials = {
        setAuthToken, setAdminUsername,
        setAdminPassword, initialize
    }


    return {
        users: this.users,
        messages: this.messages,
        credentials: this.credentials,
    }
}

module.exports = WbaApi;

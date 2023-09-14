
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
        response: err_response.body,
    }
    let message = `WhatsApp: a http ${$payload.status_message} (${$payload.status_code}) error occurred while executing 
    a ${$payload.method} request to  ${$payload.url}
     with the following payload ${$payload.body}`;

    // console.log(err_response.request);
    return formatErrorResponse(message, 2, $payload, "whatsapp")
}


const formatErrorResponse = (message, code, payload, error_medium) => {
    let err = new Error(`${error_medium.toUpperCase()} : ${message}`);
    err.code=code;
    err.payload=payload;
    err.error_medium=error_medium;

    return err;
};


module.exports={formatApplicationError,formatHttpError,formatWhatsAppError};

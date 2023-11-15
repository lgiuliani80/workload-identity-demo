function parseMultiValueHeader(headerValue) {
    let currentField = '';
    let currentFieldContent = null;
    let delimited = false;
    let isEscaped = false;
    let result = {};
    for (let c of req.headers['x-forwarded-client-cert']) {
        if (currentFieldContent !== null) {
            if (delimited) {
                if (c === '\\' && !isEscaped) {
                    isEscaped = true;
                }
                else if (c === '"' && !isEscaped) {
                    result[currentField] = decodeURIComponent(currentFieldContent);
                    currentField = '';
                    currentFieldContent = null;
                    delimited = false;
                } else {
                    currentFieldContent += c;
                    isEscaped = false;
                }
            } else {
                if (c === '"' && currentFieldContent.length == 0) {
                    delimited = true;
                } else if (c === ';') {
                    result[currentField] = decodeURIComponent(currentFieldContent);
                    currentField = '';
                    currentFieldContent = null;
                } else {
                    currentFieldContent += c;
                }
            }
        } else {
            if (c === '=') {
                currentFieldContent = '';
                currentField = currentField.replace(/^[;\\t ]/, '').trim();
            } else {
                currentField += c;
            }
        }
    }
    return result;
}

module.exports.forwardedClientCertMiddleware = function (req, res, next) {
    if (req.headers['x-forwarded-client-cert']) {
        req.clientCertificate = parseMultiValueHeader(req.headers['x-forwarded-client-cert']);
        // Certificate in BASE64 format will be in ".Cert" field
    }
    next();
};
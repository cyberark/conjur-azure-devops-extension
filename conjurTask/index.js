"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var tl = require("azure-pipelines-task-lib/task");
var https = require("https");
var fs_1 = __importDefault(require("fs"));
var readline = require('readline');
// utility functions
function trimRight(input, trimStr) {
    var _a;
    if ((_a = input) === null || _a === void 0 ? void 0 : _a.endsWith(trimStr)) {
        input = input.substring(0, input.length - 1);
        return trimRight(input, trimStr);
    }
    return input;
}
function removeHttps(input) {
    return input.replace("https://", "").replace("http://", "");
}
function base64(input) {
    return Buffer.from(input).toString('base64');
}
function getTokenHeader(token) {
    return "Token token=\"" + base64(token) + "\"";
}
function sendHttpRequest(hostname, endpoint, method, authorization, data, ignoreSsl) {
    // very helpful for debugging but does leak passwords/tokens when in debug mode
    // console.debug(`------------\n${method} ${hostname}${endpoint}\nAuthorization: ${authorization}\n\n${data}`)
    if (ignoreSsl) {
        // this will auto prompt with warning
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    // posting data must include Content-Length in HTTP header
    var dataLength = 0;
    if (data) {
        dataLength = data.length;
    }
    return new Promise(function (resolve, reject) {
        var options = {
            hostname: hostname,
            port: 443,
            path: endpoint,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': dataLength,
                'Authorization': authorization
            }
        };
        var responseBody = [];
        var req = https.request(options, function (res) {
            res.on('data', function (chunk) { return responseBody.push(chunk); });
            res.on('end', function () { return resolve(responseBody.join('')); });
            // If non-200 code is returned from any call using this method the task extension will fail
            if (res.statusCode != 200) {
                tl.setResult(tl.TaskResult.Failed, "recieved status code '" + res.statusCode + "': " + responseBody.join(''));
            }
        });
        req.on('error', function (error) {
            console.error(error);
            tl.setResult(tl.TaskResult.Failed, error);
        });
        if (data) {
            req.write(data);
        }
        req.end();
    });
}
// conjur api functions
function authenticate(hostname, account, username, apiKey, type, ignoreSsl) {
    switch (type) {
        case AuthnTypes.ApiKey:
            username = encodeURIComponent(username);
            var endpoint = "/authn/" + account + "/" + username + "/authenticate";
            return sendHttpRequest(hostname, endpoint, 'POST', "", apiKey, ignoreSsl);
        default:
            tl.setResult(tl.TaskResult.Failed, "Invalid authentication type '" + type + "'. Valid types are 'apiKey'");
    }
}
function getSecret(hostname, account, token, secretId, ignoreSsl) {
    secretId = encodeURIComponent(secretId);
    var endpoint = "/secrets/" + account + "/variable/" + secretId;
    token = getTokenHeader(token);
    return sendHttpRequest(hostname, endpoint, 'GET', token, null, ignoreSsl);
}
function createISecret(line) {
    var secretSections = line.split(": !var ");
    if (secretSections.length != 2) {
        tl.setResult(tl.TaskResult.Failed, "Failed to retrieve secret name and path from '" + line + "'");
    }
    var secretName = secretSections[0].trim();
    var secretPath = secretSections[1].trim();
    var secret = {
        name: secretName,
        path: secretPath
    };
    return secret;
}
function setAzureSecret(secret, secretValue) {
    tl.setVariable(secret.name, secretValue, true);
    console.log("Set conjur secret '" + secret.path + "' to azure variable '" + secret.name + "'");
}
function getSecrets(hostname, account, token, secretYml, ignoreSsl) {
    // read the secrets yml
    var readInterface = readline.createInterface({
        input: fs_1.default.createReadStream(secretYml),
        output: process.stdout,
        console: false
    });
    readInterface.on('line', function (line) {
        if (line.toString().includes(': !var')) {
            // get secret for each line in secrets.yml that contains ': !var'
            var secret = createISecret(line);
            getSecret(hostname, account, token, secret.path, ignoreSsl)
                .then(function (data) { return setAzureSecret(secret, data.toString()); })
                .catch(function (err) { return tl.setResult(tl.TaskResult.Failed, err.message); });
        }
    });
}
var AuthnTypes;
(function (AuthnTypes) {
    AuthnTypes[AuthnTypes["ApiKey"] = 0] = "ApiKey";
    AuthnTypes[AuthnTypes["AzureManagedIdentity"] = 1] = "AzureManagedIdentity";
})(AuthnTypes || (AuthnTypes = {}));
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var hostname, account, username, apiKey, secretYml, clientId, ignoreSsl, authnType, error_message;
        return __generator(this, function (_a) {
            try {
                hostname = tl.getInput('conjurapplianceurl', true);
                account = tl.getInput('conjuraccount', true);
                username = tl.getInput('conjurusername', true);
                apiKey = tl.getInput('conjurapikey', false);
                secretYml = tl.getInput('secretsyml', false);
                clientId = tl.getInput('azureclientid', false);
                ignoreSsl = tl.getBoolInput('ignoressl', false);
                authnType = AuthnTypes.ApiKey;
                // Set defaults
                if (!hostname) {
                    hostname = "";
                }
                if (!account) {
                    account = "";
                }
                if (!username) {
                    username = "";
                }
                if (!apiKey) {
                    apiKey = "";
                }
                if (!secretYml) {
                    secretYml = "./secrets.yml";
                }
                if (!clientId) {
                    clientId = "";
                    // client id is not provided assume api key authentication
                    if (apiKey == "") {
                        error_message = "Conjur API Key is required since Azure Client ID is not provided";
                        console.error(error_message);
                        tl.setResult(tl.TaskResult.Failed, error_message);
                    }
                }
                else {
                    // If client id is provided we are default to azure authentication
                    authnType = AuthnTypes.AzureManagedIdentity;
                    console.log("Since Client ID was provided then defaulting to azure authentication. Api key will not be used");
                }
                // sanitize
                hostname = trimRight(hostname, '/');
                hostname = removeHttps(hostname);
                // fetch the secrets
                authenticate(hostname, account, username, apiKey, authnType, true)
                    .then(function (data) {
                    return getSecrets(hostname, account, data.toString(), secretYml, ignoreSsl);
                })
                    .catch(function (err) { return tl.setResult(tl.TaskResult.Failed, err.message); })
                    .catch(function (err) { return tl.setResult(tl.TaskResult.Failed, err.message); });
            }
            catch (err) {
                tl.setResult(tl.TaskResult.Failed, err.message);
            }
            return [2 /*return*/];
        });
    });
}
run();

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
const https = require("https");
const fs = __importStar(require("fs"));
const readline = require('readline');
const file_type_supported = ['.yml', '.yaml'];
var HttpsProxyAgent = require('https-proxy-agent');
const token_generator_1 = require("./token-generator");
const querystring = __importStar(require("querystring"));
// @ts-ignore
const forge = __importStar(require("node-forge"));
let integrationName = "Azure DevOps Extension";
let integrationType = "cybr-secretsmanager";
let vendorName = "Microsoft";
let vendorVersion = null;
// utility functions
function trimRight(input, trimStr) {
    if (input === null || input === void 0 ? void 0 : input.endsWith(trimStr)) {
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
function removeApi(input) {
    if (input.endsWith('/api')) {
        return [input.replace("/api", ""), "/api"];
    }
    else {
        return [input, ""];
    }
}
function readJsonFile(filePath) {
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(jsonData);
}
function finaltelemetryHeader() {
    let telemetryHeader = '';
    const data = readJsonFile('./task.json');
    let version = data.version;
    telemetryHeader += "in=" + integrationName;
    telemetryHeader += "&iv=" + version.Major + "." + version.Minor + "." + version.Patch;
    telemetryHeader += "&it=" + integrationType;
    telemetryHeader += "&vn=" + vendorName;
    if (vendorVersion != null) {
        telemetryHeader += "&vv=" + vendorVersion;
    }
    return Buffer.from(telemetryHeader).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
class CertificateValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "CertificateValidationError";
    }
}
function normalizeCertificate(certContent) {
    certContent = certContent.replace('%0A', '\n').replace(/\r\n|\r/g, '\n').trim();
    return certContent.replace(/^[ \t]+/gm, '').replace(/[ \t]+$/gm, '').replace(/\n+/g, '\n');
}
function validatePemCertificate(certContent) {
    certContent = normalizeCertificate(certContent);
    // Ensure certificate is in PEM format
    if (!/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/.test(certContent)) {
        throw new CertificateValidationError("Invalid Certificate format.");
    }
    try {
        const cert = forge.pki.certificateFromPem(certContent);
        const currentDate = new Date();
        if (cert.validity.notBefore <= currentDate && cert.validity.notAfter >= currentDate) {
            console.log("Certificate is valid.");
        }
        else {
            throw new CertificateValidationError("Certificate is expired.");
        }
        return certContent; // Return the validated PEM certificate content
    }
    catch (error) {
        if (error instanceof Error) {
            throw new CertificateValidationError(`Invalid certificate content: ${error.message}. Please check the certificate format.`);
        }
    }
}
function getValidCertificate(certContent) {
    return __awaiter(this, void 0, void 0, function* () {
        if (certContent) {
            try {
                console.log("Validating provided certificate content...");
                return validatePemCertificate(certContent);
            }
            catch (error) {
                if (error instanceof CertificateValidationError) {
                    console.warn(`Invalid certificate content: ${error.message}. `);
                }
            }
        }
        throw new CertificateValidationError("Certificate content are invalid or missing. Please provide a valid certificate.");
    });
}
function getTokenHeader(token) {
    return `Token token="${base64(token)}"`;
}
function getHttpOptions(hostname, endpoint, method, dataLength, authorization, proxyAgent) {
    return {
        agent: proxyAgent,
        hostname: hostname,
        port: 443,
        path: endpoint,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': dataLength,
            'Authorization': authorization,
            'x-cybr-telemetry': finaltelemetryHeader()
        },
    };
}
function sendHttpRequest(hostname, endpoint, method, authorization, data, certContent) {
    const dataLength = data ? data.length : 0;
    let proxyAgent = null;
    if (tl.getVariable('Agent.proxyUrl') != undefined) {
        const proxyUrl = getProxyUrl();
        proxyAgent = new HttpsProxyAgent(proxyUrl);
    }
    const options = getHttpOptions(hostname, endpoint, method, dataLength, authorization, proxyAgent);
    if (certContent && certContent != "undefined" && certContent != undefined) {
        try {
            const validatedCertContent = validatePemCertificate(certContent);
            options.ca = [validatedCertContent]; // Add certificate to the options
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, `Invalid CA certificate: ${error.message}`);
            return Promise.reject(error); // Reject the promise if the certificate is invalid
        }
    }
    // Object.entries(options).forEach(([key, value]) => {
    //     console.log(`Print values :::: ${key}: ${JSON.stringify(value)}`);
    //   });
    return new Promise((resolve, reject) => {
        const responseBody = [];
        const req = https.request(options, (res) => {
            res.on('data', (chunk) => responseBody.push(chunk));
            res.on('end', () => resolve(responseBody.join('')));
            if (res.statusCode !== 200) {
                tl.setResult(tl.TaskResult.Failed, `Received status code '${res.statusCode}': ${responseBody.join('')}`);
            }
        });
        req.on('error', (error) => {
            tl.setResult(tl.TaskResult.Failed, `${error}`);
        });
        if (data)
            req.write(data);
        req.end();
    });
}
function getProxyUrl() {
    const proxyUrl = tl.getVariable('Agent.proxyUrl');
    if (tl.getVariable('Agent.proxyUsername') != undefined) {
        return `${proxyUrl.split("://")[0]}://` + `${tl.getVariable('Agent.proxyUsername')}:${tl.getVariable('Agent.proxyPassword')}@` + `${proxyUrl.split("://")[1]}`;
    }
    return proxyUrl;
}
function sendHttpRequestJWT(hostname, endpoint, accessToken, certContent) {
    const encodedData = accessToken ? querystring.stringify({ jwt: accessToken }) : '';
    const dataLength = encodedData.length;
    const proxyAgent = tl.getVariable('Agent.proxyUrl') ? new HttpsProxyAgent(getProxyUrl()) : null;
    const options = getHttpOptions(hostname, endpoint, 'POST', dataLength, '', proxyAgent);
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    if (certContent && certContent != "undefined" && certContent != undefined) {
        try {
            const validatedCertContent = validatePemCertificate(certContent);
            options.ca = [validatedCertContent]; // Add certificate to the options
        }
        catch (error) {
            tl.setResult(tl.TaskResult.Failed, `Invalid CA certificate: ${error.message}`);
            return Promise.reject(error); // Reject the promise if the certificate is invalid
        }
    }
    return new Promise((resolve, reject) => {
        const responseBody = [];
        const req = https.request(options, (res) => {
            res.on('data', (chunk) => responseBody.push(chunk));
            res.on('end', () => resolve(responseBody.join('')));
            if (res.statusCode !== 200) {
                tl.setResult(tl.TaskResult.Failed, `Received status code '${res.statusCode}': ${responseBody.join('')}`);
            }
        });
        req.on('error', (error) => {
            tl.setResult(tl.TaskResult.Failed, `${error}`);
        });
        if (encodedData)
            req.write(encodedData);
        req.end();
    });
}
// conjur api functions
function authenticate(hostname, account, username, apiKey, type, hostId, serviceId, accesstoken, certContent) {
    var [hname, api] = removeApi(hostname);
    switch (type) {
        case "api":
            username = encodeURIComponent(username);
            var endpoint = `${api}/authn/${account}/${username}/authenticate`;
            return sendHttpRequest(hname, endpoint, 'POST', "", apiKey, certContent);
        case "jwt":
            var endpoint = `${api}/authn-jwt/${serviceId}/${account}/`;
            if (hostId)
                endpoint += `${encodeURIComponent(hostId)}/`;
            endpoint += `authenticate`;
            return sendHttpRequestJWT(hname, endpoint, accesstoken, certContent);
        default:
            tl.setResult(tl.TaskResult.Failed, `Invalid authentication type '${type}'. Valid types are 'apiKey'`);
    }
}
function getSecretsPath(hostname, token, secretPath, certContent) {
    var [hname, api] = removeApi(hostname);
    var endpoint = `${api}/secrets?variable_ids=${secretPath}`;
    token = getTokenHeader(token);
    return sendHttpRequest(hname, endpoint, 'GET', token, null, certContent);
}
function setAzureSecrets(jsonData, secretPaths, hostname, account, token, debug_mode, certContent) {
    var conjurSecret = JSON.parse(jsonData);
    if ('error' in conjurSecret) {
        console.log("Batch retrieval failed, falling back to single secret fetch at a time");
        for (let ele in secretPaths) {
            getASecret(hostname, account, token, ele, certContent)
                .then((data) => {
                tl.setVariable(secretPaths[ele], data.toString(), true);
                if (debug_mode == true)
                    console.log(`Set conjur secret '${ele}' to azure variable '${secretPaths[ele]}'`);
            })
                .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message));
        }
    }
    else {
        console.log("Batch retrieval successful");
        for (let key in conjurSecret) {
            var items = key.split(":");
            var ele = items[items.length - 1];
            tl.setVariable(secretPaths[ele], conjurSecret[key], true);
            if (debug_mode == true)
                console.log(`Set conjur secret '${ele}' to azure variable '${secretPaths[ele]}'`);
        }
    }
}
function getASecret(hostname, account, token, secretId, certContent) {
    var [hname, api] = removeApi(hostname);
    secretId = encodeURIComponent(secretId);
    var endpoint = `${api}/secrets/${account}/variable/${secretId}`;
    token = getTokenHeader(token);
    return sendHttpRequest(hname, endpoint, 'GET', token, null, certContent);
}
function batchSecretRetrieval(hostname, account, token, secretYml, debug_mode, certContent) {
    var secretsPath = [];
    var secret = {};
    const readInterface = readline.createInterface({
        input: fs.createReadStream(secretYml),
        output: process.stdout,
        console: false
    });
    readInterface.on('line', function (line) {
        if (line.toString().includes(': !var')) {
            createISecret(line, secret);
        }
        else {
            tl.setResult(tl.TaskResult.Failed, `Secret path not found in required format at line '${line}'. Format required eg: "SECRET_VAR: !var /secret/path"`);
        }
    }).on('close', function (line) {
        for (let key in secret) {
            secretsPath.push(account + ":variable:" + encodeURIComponent(key));
        }
        if (secretsPath.length > 0) {
            getSecretsPath(hostname, token, secretsPath, certContent)
                .then((jsonData) => setAzureSecrets(jsonData.toString(), secret, hostname, account, token, debug_mode, certContent))
                .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message));
        }
        else {
            return tl.setResult(tl.TaskResult.Failed, 'No data or secret path not found in required format');
        }
    }).on('error', function (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    });
}
function createISecret(line, secret) {
    var secretSections = line.split(": !var ");
    if (secretSections.length != 2) {
        tl.setResult(tl.TaskResult.Failed, `Failed to retrieve secret name and path from '${line}'`);
    }
    var secretName = secretSections[0].trim();
    var secretPath = secretSections[1].trim();
    secret[secretPath] = secretName;
    return secret;
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //input from service connector
            var authnType = tl.getInput('authntype', true);
            var debug_mode;
            var ep;
            var connectedServiceName;
            let accessToken;
            let serviceId = '';
            let hostId = '';
            let username = '';
            let apiKey = '';
            let certContent = '';
            if (authnType == "api") {
                ep = tl.getInput('ConjurAPIService', true);
                username = tl.getEndpointDataParameter(ep, 'conjurusername', false) || '';
                apiKey = tl.getEndpointDataParameter(ep, 'conjurapikey', false);
            }
            else if (authnType == "jwt") {
                ep = tl.getInput('ConjurJWTService', true);
                connectedServiceName = tl.getInput('serviceNameAzureRM', false);
                accessToken = yield (0, token_generator_1.getFederatedWorkloadIdentityAccessToken)(connectedServiceName);
                serviceId = tl.getEndpointDataParameter(ep, 'conjurserviceid', false);
                hostId = tl.getEndpointDataParameter(ep, 'conjurhostid', true);
            }
            else {
                tl.setResult(tl.TaskResult.Failed, "Please select appropriate authentication mechanism");
            }
            var hostname = tl.getEndpointUrlRequired(ep) || '';
            var account = tl.getEndpointDataParameter(ep, 'conjuraccount', false) || '';
            if (tl.getVariable('System.Debug') == 'true')
                debug_mode = true;
            else
                debug_mode = false;
            try {
                certContent = tl.getEndpointDataParameter(ep, 'cacert', true);
                console.log("certContent from :: ", certContent == "undefined");
                if (certContent && certContent != "undefined" && certContent != undefined) {
                    const validCertContent = yield getValidCertificate(certContent);
                }
            }
            catch (err) {
                tl.setResult(tl.TaskResult.Failed, err.message);
            }
            let secretYml = tl.getInput('secretsyml', false) || './secrets.yml';
            var path = require('path');
            if (!file_type_supported.includes(path.extname(secretYml).toLowerCase())) {
                return tl.setResult(tl.TaskResult.Failed, "Only .yml, .yaml extension file supported");
            }
            // sanitize
            hostname = trimRight(hostname, '/');
            hostname = removeHttps(hostname);
            // fetch the secrets
            if (authnType == "api") {
                authenticate(hostname, account, username, apiKey, authnType, "", "", "", certContent)
                    .then((data) => batchSecretRetrieval(hostname, account, data.toString(), secretYml, debug_mode, certContent))
                    .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message));
            }
            else {
                authenticate(hostname, account, "", "", authnType, hostId, serviceId, accessToken, certContent)
                    .then((data) => batchSecretRetrieval(hostname, account, data.toString(), secretYml, debug_mode, certContent))
                    .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message));
            }
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    });
}
run();

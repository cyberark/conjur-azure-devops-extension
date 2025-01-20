"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tmrm = require("azure-pipelines-task-lib/mock-run");
const path = require("path");
const fs_1 = require("fs");
const file = (0, fs_1.readFileSync)(path.join(__dirname, '..', 'test/apikey.txt'), 'utf-8');
let taskPath = path.join(__dirname, '..', 'index.js');
let tmr = new tmrm.TaskMockRunner(taskPath);
const endpointId = "ConjurAPIService";
tmr.setInput(endpointId, endpointId);
tmr.setInput('authntype', 'api');
process.env['ENDPOINT_URL_' + endpointId] = process.env.CONJUR_APPLIANCE_URL;
process.env[`ENDPOINT_DATA_${endpointId}_${'conjuraccount'.toUpperCase()}`] = process.env.CONJUR_ACCOUNT;
process.env[`ENDPOINT_DATA_${endpointId}_${'conjurusername'.toUpperCase()}`] = process.env.CONJUR_AUTHN_LOGIN;
process.env[`ENDPOINT_DATA_${endpointId}_${'conjurapikey'.toUpperCase()}`] = file.replace(/\s/g, '');
process.env[`ENDPOINT_DATA_${endpointId}_${'cacert'.toUpperCase()}`] = process.env.CONJUR_SSL_CERTIFICATE;
if (process.env.TARGET == 'cloud') {
    tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/invalid-cloud-secrets.yml'));
}
else {
    tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/invalid-secrets.yml'));
}
tmr.run();

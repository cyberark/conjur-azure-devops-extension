"use strict";
exports.__esModule = true;
var tmrm = require("azure-pipelines-task-lib/mock-run");
var path = require("path");
var fs_1 = require("fs");
var file = (0, fs_1.readFileSync)(path.join(__dirname, '..', 'test/apikey.txt'), 'utf-8');
var taskPath = path.join(__dirname, '..', 'index.js');
var tmr = new tmrm.TaskMockRunner(taskPath);
var endpointId = "ConjurService";
tmr.setInput(endpointId, endpointId);
process.env['ENDPOINT_URL_' + endpointId] = process.env.CONJUR_APPLIANCE_URL;
process.env["ENDPOINT_DATA_".concat(endpointId, "_").concat('conjuraccount'.toUpperCase())] = process.env.CONJUR_ACCOUNT;
process.env["ENDPOINT_DATA_".concat(endpointId, "_").concat('conjurusername'.toUpperCase())] = process.env.CONJUR_AUTHN_LOGIN;
process.env["ENDPOINT_DATA_".concat(endpointId, "_").concat('conjurapikey'.toUpperCase())] = file.replace(/\s/g, '');
if (process.env.TARGET == 'cloud') {
    tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/invalid-cloud-secrets.yml'));
}
else {
    tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/invalid-secrets.yml'));
}
tmr.run();

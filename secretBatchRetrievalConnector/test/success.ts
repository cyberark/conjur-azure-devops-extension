import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import { readFileSync } from 'fs';

const file = readFileSync(path.join(__dirname, '..', 'test/apikey.txt'), 'utf-8');
let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const endpointId = "ConjurAPIService"
tmr.setInput(endpointId, endpointId)
tmr.setInput('authntype', 'api')
process.env['ENDPOINT_URL_' + endpointId] = process.env.CONJUR_APPLIANCE_URL
process.env[`ENDPOINT_DATA_${endpointId}_${'conjuraccount'.toUpperCase()}`] = process.env.CONJUR_ACCOUNT
process.env[`ENDPOINT_DATA_${endpointId}_${'conjurusername'.toUpperCase()}`] = process.env.CONJUR_AUTHN_LOGIN
process.env[`ENDPOINT_DATA_${endpointId}_${'conjurapikey'.toUpperCase()}`] = file.replace(/\s/g, '');
process.env[`ENDPOINT_DATA_${endpointId}_${'cacert'.toUpperCase()}`] = process.env.CONJUR_SSL_CERTIFICATE
if (process.env.TARGET == 'cloud') {
    tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/cloud-secrets.yml'));
}
else {
    tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/test-secrets.yml'));
}
tmr.run();

import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import { readFileSync } from 'fs';

const file = readFileSync(path.join(__dirname, '..', 'test/apikey.txt'), 'utf-8');
let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const endpointId = "ConjurService"
tmr.setInput(endpointId, endpointId)
process.env['ENDPOINT_URL_' + endpointId] = "https://conjur-server"
process.env[`ENDPOINT_DATA_${endpointId}_${'conjuraccount'.toUpperCase()}`] = 'myaccount';
process.env[`ENDPOINT_DATA_${endpointId}_${'conjurusername'.toUpperCase()}`] = 'admin';
process.env[`ENDPOINT_DATA_${endpointId}_${'conjurapikey'.toUpperCase()}`] = file.replace(/\s/g, '');
tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/invalid-secrets.yml'));
tmr.run();
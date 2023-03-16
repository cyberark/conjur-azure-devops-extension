import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const endpointId = "ConjurService";
tmr.setInput(endpointId, endpointId);
process.env['ENDPOINT_URL_' + endpointId] = "http://localhost";
process.env[`ENDPOINT_DATA_${endpointId}_${'conjuraccount'.toUpperCase()}`] = 'myConjurAccount';
process.env[`ENDPOINT_DATA_${endpointId}_${'conjurusername'.toUpperCase()}`] = 'host/BotApp/myDemoApp';
process.env[`ENDPOINT_DATA_${endpointId}_${'conjurapikey'.toUpperCase()}`] = '3ded3pp1x1w3ak3ter2kj22532mx2xfk51z2p28p';
tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/test-secrets.yml'));

tmr.run();
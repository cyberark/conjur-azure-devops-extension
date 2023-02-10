import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);


tmr.setInput('conjurapplianceurl', 'http://localhost');
tmr.setInput('conjuraccount', 'myConjurAccount');
tmr.setInput('conjurusername', 'host/BotApp/myDemoApp');
tmr.setInput('conjurapikey', '3ded3pp1x1w3ak3ter2kj22532mx2xfk51z2p28');
tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/test-secrets.yml'));

tmr.run();
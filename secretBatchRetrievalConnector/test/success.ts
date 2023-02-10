import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import { readFileSync } from 'fs';

const file = readFileSync(path.join(__dirname, '..', 'test/apikey.txt'), 'utf-8');
let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('conjurapplianceurl', 'https://localhost');
tmr.setInput('conjuraccount', 'myaccount');
tmr.setInput('conjurusername', 'admin');
tmr.setInput('conjurapikey', file.replace(/\s/g, ''));
tmr.setInput('secretsyml', path.join(__dirname, '..', 'test/test-secrets.yml'));
tmr.run();
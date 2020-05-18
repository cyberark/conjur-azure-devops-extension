import tl = require('azure-pipelines-task-lib/task');
import https = require('https');
import fs from 'fs';
const readline = require('readline');

// utility functions
function trimRight(input : string, trimStr : string) : string{
    if (input?.endsWith(trimStr)) {
        input = input.substring(0, input.length-1)
        return trimRight(input, trimStr);
    }
    return input;
}

function removeHttps(input : string) : string {
    return input.replace("https://", "").replace("http://", "")
}

function base64(input : string) : string {
    return  Buffer.from(input).toString('base64')
}

function getTokenHeader(token : string) {
    return "Token token=\"" + base64(token) + "\"";
}

function sendHttpRequest(hostname : string, endpoint : string, method : 'GET' | 'POST', authorization : string, data : string, ignoreSsl : boolean) {
    // very helpful for debugging but does leak passwords/tokens when in debug mode
    // console.debug(`------------\n${method} ${hostname}${endpoint}\nAuthorization: ${authorization}\n\n${data}`)
    
    if(ignoreSsl) {
        // this will auto prompt with warning
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    // posting data must include Content-Length in HTTP header
    var dataLength = 0;
    if (data) {
        dataLength = data.length;
    }

    return new Promise((resolve, reject) => {     
        const options = {
            hostname: hostname,
            port: 443,
            path: endpoint,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': dataLength,
                'Authorization': authorization
            }
        }

        var responseBody = []
        
        const req = https.request(options, (res) => {
            res.on('data', (chunk) => responseBody.push(chunk));
            res.on('end', () => resolve(responseBody.join('')));

            // If non-200 code is returned from any call using this method the task extension will fail
            if(res.statusCode != 200){
                tl.setResult(tl.TaskResult.Failed, `recieved status code '${res.statusCode}': ${responseBody.join('')}`);
            }
        })
        
        req.on('error', (error) => {
            console.error(error)
        })
        if(data) {
            req.write(data)
        }
        req.end()
    })
}

// conjur api functions
function authenticate(hostname: string, account : string, username : string, apiKey : string, type : AuthnTypes, ignoreSsl : boolean) {
    switch(type) {
        case AuthnTypes.ApiKey:
            username = encodeURIComponent(username);
            var endpoint = `/authn/${account}/${username}/authenticate`;
            return sendHttpRequest(hostname, endpoint, 'POST', "", apiKey, ignoreSsl);
        default:
            tl.setResult(tl.TaskResult.Failed, `Invalid authentication type '${type}'. Valid types are 'apiKey'`)
    }
}

function getSecret(hostname: string, account : string, token : string, secretId : string, ignoreSsl : boolean) {
    secretId = encodeURIComponent(secretId);
    var endpoint = `/secrets/${account}/variable/${secretId}`;
    token = getTokenHeader(token);
    return sendHttpRequest(hostname, endpoint, 'GET', token, null, ignoreSsl)
}

// task extension functions
interface ISecret { 
    name:string, 
    path:string
} 

function createISecret(line : string) : ISecret {
    var secretSections = line.split(": !var ");
    if(secretSections.length != 2) {
        tl.setResult(tl.TaskResult.Failed, `Failed to retrieve secret name and path from '${line}'`)
    }
    var secretName = secretSections[0].trim();
    var secretPath = secretSections[1].trim();
    var secret:ISecret = { 
        name: secretName,
        path: secretPath                
    } 
    return secret;
}

function setAzureSecret(secret : ISecret, secretValue : string) {
    tl.setVariable(secret.name, secretValue, true)
    console.log(`Set conjur secret '${secret.path}' to azure variable '${secret.name}'`)
}

function getSecrets(hostname: string, account : string, token : string, secretYml : string, ignoreSsl : boolean) {
    // read the secrets yml
    const readInterface = readline.createInterface({
        input: fs.createReadStream(secretYml),
        output: process.stdout,
        console: false
    });
    readInterface.on('line', function(line) {
        if (line.toString().includes(': !var')) {
            // get secret for each line in secrets.yml that contains ': !var'
            var secret = createISecret(line);
            getSecret(hostname, account, token, secret.path, ignoreSsl)
                .then((data) => setAzureSecret(secret, data.toString()))
                .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message)
            )
        }
    });
}

enum AuthnTypes {
    ApiKey,
    AzureManagedIdentity
}

async function run() {
    try {
        // fetch from input
        var hostname =  tl.getInput('conjurapplianceurl', true);
        var account  = tl.getInput('conjuraccount', true);
        var username = tl.getInput('conjurusername', true);
        var apiKey = tl.getInput('conjurapikey', false);
        var secretYml = tl.getInput('secretsyml', false)
        var clientId = tl.getInput('azureclientid', false)
        var ignoreSsl: boolean | false = tl.getBoolInput('ignoressl', false);

        var authnType = AuthnTypes.ApiKey

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
                var error_message = "Conjur API Key is required since Azure Client ID is not provided";
                console.error(error_message);
                tl.setResult(tl.TaskResult.Failed, error_message);
            }
        } else {
            // If client id is provided we are default to azure authentication
            authnType = AuthnTypes.AzureManagedIdentity
            console.log("Since Client ID was provided then defaulting to azure authentication. Api key will not be used")
        }

        // sanitize
        hostname = trimRight(hostname, '/');
        hostname = removeHttps(hostname);

        // fetch the secrets
        authenticate(hostname, account, username, apiKey, authnType, true)
        .then((data) => 
            getSecrets(hostname, account, data.toString(), secretYml, ignoreSsl))
            .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message))
        .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message))
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
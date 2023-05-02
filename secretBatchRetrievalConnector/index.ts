import tl = require('azure-pipelines-task-lib/task');
import https = require('https');
import * as fs from 'fs';
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

function removeApi(input : string){ 
    if (input.endsWith('/api')) { 
       return [input.replace("/api", ""), "/api"]
    } else {
        return [input, ""]
    }    
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
            tl.setResult(tl.TaskResult.Failed, `${error}`);
        })
        if(data) {
            req.write(data)
        }
        req.end()
    })
}

// conjur api functions
function authenticate(hostname: string, account : string, username : string, apiKey : string, type : AuthnTypes, ignoreSsl : boolean) {
    var hname, api;
    [hname, api] = removeApi(hostname);
    switch(type) {
        case AuthnTypes.ApiKey:
            username = encodeURIComponent(username);
            var endpoint = `${api}/authn/${account}/${username}/authenticate`;
            return sendHttpRequest(hname, endpoint, 'POST', "", apiKey, ignoreSsl);
        default:
            tl.setResult(tl.TaskResult.Failed, `Invalid authentication type '${type}'. Valid types are 'apiKey'`)
    }
}

function getSecretsPath(hostname: string, token : string, ignoreSsl : boolean, secretPath: any[]){
    var hname, api;
    [hname, api] = removeApi(hostname);
    var endpoint = `${api}/secrets?variable_ids=${secretPath}`;
    token = getTokenHeader(token);
    return sendHttpRequest(hname, endpoint, 'GET', token, null, ignoreSsl)
}

function setAzureSecrets(jsonData: string, secretPaths: ISecret, hostname: string, account : string, token : string, debug_mode: boolean, ignoreSsl : boolean){
    var conjurSecret = JSON.parse(jsonData);
    if ('error' in conjurSecret){
        console.log("Batch retrieval failed, falling back to single secret fetch at a time");
        for (let ele in secretPaths){
            getASecret(hostname, account, token, ele, ignoreSsl)
                .then((data) => {
                    tl.setVariable(secretPaths[ele], data.toString(), true);
                    if(debug_mode == true)
                      console.log(`Set conjur secret '${ele}' to azure variable '${secretPaths[ele]}'`);
                })
                .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message)
            )
        }
    }
    else{
        console.log("Batch retrieval successful");
        for (let key in conjurSecret) {
            var items: string[] = key.split(":");
            var ele: string = items[items.length-1];
            tl.setVariable(secretPaths[ele], conjurSecret[key], true);
            if(debug_mode == true)
               console.log(`Set conjur secret '${ele}' to azure variable '${secretPaths[ele]}'`);
        }
    }
}

function getASecret(hostname: string, account : string, token : string, secretId: string, ignoreSsl : boolean){
    var hname, api;
    [hname, api] = removeApi(hostname);
    secretId = encodeURIComponent(secretId);
    var endpoint = `${api}/secrets/${account}/variable/${secretId}`;
    token = getTokenHeader(token);
    return sendHttpRequest(hname, endpoint, 'GET', token, null, ignoreSsl);
}

function batchSecretRetrieval(hostname: string, account : string, token : string, secretYml : string,  debug_mode: boolean, ignoreSsl : boolean){
    var secretsPath = [];
    var secret:ISecret = {}
    
    const readInterface = readline.createInterface({
        input: fs.createReadStream(secretYml),
        output: process.stdout,
        console: false
    });
    readInterface.on('line', function(line) {
        if (line.toString().includes(': !var')) {
            createISecret(line, secret);       
        }
    }).on('close', function(line) {
        for (let key in secret) {
            secretsPath.push(account + ":variable:" + encodeURIComponent(key));
        }
        getSecretsPath(hostname, token, ignoreSsl, secretsPath)
        .then((jsonData) => setAzureSecrets(jsonData.toString(), secret, hostname, account, token, debug_mode, ignoreSsl))
        .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message))
    });
}

// task extension functions
type ISecret = { 
    [key: string]: string
} 

function createISecret(line : string, secret: ISecret):ISecret {
    var secretSections = line.split(": !var ");
    if(secretSections.length != 2) {
        tl.setResult(tl.TaskResult.Failed, `Failed to retrieve secret name and path from '${line}'`)
    }
    var secretName = secretSections[0].trim();
    var secretPath = secretSections[1].trim();
    secret[secretPath] = secretName;
    return secret;
}

enum AuthnTypes {
    ApiKey,
    AzureManagedIdentity
}

async function run() {
    try {
        //input from service connector
        var ep = tl.getInput('ConjurService', true);
        var debug_mode: boolean; 
        var ignoreSsl: boolean; 
        var hostname = tl.getEndpointUrlRequired(ep);
        var account  = tl.getEndpointDataParameter(ep, 'conjuraccount', true);
        var username = tl.getEndpointDataParameter(ep, 'conjurusername', true);
        var apiKey = tl.getEndpointDataParameter(ep, 'conjurapikey', true);
        if(tl.getVariable('System.Debug') == 'true')
            debug_mode = true;
        else
            debug_mode = false;

        if(tl.getEndpointDataParameter(ep, 'ignoressl', true) == 'true')
           ignoreSsl = true;
        else
           ignoreSsl = false;   
    
        var secretYml = tl.getInput('secretsyml', false);
        var clientId = tl.getInput('azureclientid', false);    
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
        .then((data) => batchSecretRetrieval(hostname, account, data.toString(), secretYml, debug_mode, ignoreSsl))
        .catch((err) => tl.setResult(tl.TaskResult.Failed, err.message))
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();
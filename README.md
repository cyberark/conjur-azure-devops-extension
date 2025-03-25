# Conjur Azure DevOps Extension 
Azure Devops Task Extension with API Key and JWT Authentication mechanism for supporting batch retrieval of secrets from the Cyberark Conjur Secrets Manager in secured way through Azure DevOps Pipeline.

The Authentication parameters to connect to Conjur Server are configured in Service Connection.

## Certification Level
![](https://img.shields.io/badge/Certification%20Level-Community-28A745?link=https://github.com/cyberark/community/blob/master/Conjur/conventions/certification-levels.md)

This repo is a **Community** level project. It's a community contributed project that **is not reviewed or supported
by CyberArk**. For more detailed information on our certification levels, see [our community guidelines](https://github.com/cyberark/community/blob/master/Conjur/conventions/certification-levels.md#community).

## Features

The following features are available with the Azure DevOps Extension:

* API authentication
* JWT authentication
* Batch retrieval of secrets from Conjur Server with help of secured Service Connection

## Limitations

The Azure DevOps Extension does not support creating, updating or removing secrets

## Technical Requirements

| Technology             | Version  |
| ---------------------- | -------- |
| Conjur OSS             | 1.9+     |
| Conjur Enterprise      | 12.5+    |
| Conjur Cloud           |          |
| Edge Cloud             |          | 
| Azure DevOps account   |          |

# Prerequisites

The following are prerequisites to use Azure DevOps extension.

## Conjur setup

Conjur (OSS or Enterprise or Cloud) and the Conjur CLI are installed in the environment and running in the background.

### This section describes how to set up the API Authentication for Conjur OSS or Enterprise ###

1. Define the API Authentication policy

- Create a policy that defines the API Authentication, for example BotApp.
```yaml
- !policy
  id: BotApp
  body:
    # Define a human user, a non-human identity that represents an application, and a secret
  - !user Dave
  - !host myDemoApp
  - &variables
      - !variable secretVar
      - !variable some-other-secret
  - !permit
    # Give permissions to the human user to update the secret and fetch the secret.
    role: !user Dave
    privileges: [read, update, execute]
    resource: *variables
  - !permit
    # Give permissions to the non-human identity to fetch the secret.
    role: !host myDemoApp
    privileges: [read, execute]
    resource: *variables
```

- Save the policy as BotApp.yml, and load it to root:

```
     conjur policy load -b root -f /path/to/file/authn-iam.yml
```
     
- Conjur generates the following API keys:
     - An API key for Dave, the human user. This key is used to authenticate user Dave to Conjur.
     - An API key for BotApp, the non-human identity. This key is used to authenticate BotApp application to Conjur.

     Those API keys is correlated with the number of Users & Hosts defined in a policy.

2.  Set the secret    
     a. Generate a secret

     Generate a value for your application’s secret:
     ```
     secretVal=$(openssl rand -hex 12 | tr -d '\r\n')
     ```

     This generates a 12-hex-character value.

     b. Store the secret

     Store the generated value in Conjur:
     ```
     conjur variable set -i BotApp/secretVar -v ${secretVal}
     ```

     A policy predefined variable named `BotApp/secretVar` is set with a random
     generated secret.

This section describes how to set up the API Authentication for Conjur Cloud

Pre-requisite:
- Conjur cloud
- Pcloud
- Conjur cloud cli

<small><a href='https://docs-er.cyberark.com/ConjurCloud/en/Content/ConjurCloud/ccl-manage-users.htm?tocpath=Get%20started%7CTutorial%7C_____1'>Refer the tutorial for Conjur Cloud Setup </a></small>
1. Manage Conjur Cloud users
2. Set up the Conjur Cloud CLI
3. Log in to Conjur Cloud
4. Sync Privilege Cloud Safe to Conjur

To create a simple host that authenticates using an API key:

Create a policy for the host:

```yaml
- !host
  id: <host name>
  annotations:
    authn/api-key: true
```    
Save the policy as myapp-host.yaml.

Load the policy file into the data policy branch:

```
conjur policy load -b data -f myapp-host.yaml
```

To grant permissions on secrets:

```yaml
- !grant
  role: !group delegation/consumers
  member: !host /data/myapp
```

Save the file as grant_permissions.yml.

Load the policy to data/vault/secrets-safe:

```
conjur policy load -b data/vault/secrets-safe -f grant_permissions.yml
```
### This section describes how to set up JWT Authentication for Conjur Cloud ###

To create a policy using JWT for conjur cloud, certain attributes are needed which can be taken from Access Token

Sample Access Token Microsoft Entra ID:
```
{
"typ":"JWT",
"alg":"RS256",
"x5t":"YTceO5IJyyqR6jzDS5iAbpe42Jw",
"kid":"YTceO5IJyyqR6jzDS5iAbpe42Jw"
}
{
"aud":"499b84ac-1321-427f-aa17-267ca6975798",
"iss":"https://sts.windows.net/bd830b04-9cc5-488b-8099-fcabcdb1f6fa/",
"iat":1737722120,
"nbf":1737722120,
"exp":1737726020,
"aio":"k2RgYHgmsHJF1hv3K3ZlHA37215cAwA=",
"appid":"6e9b3631-0853-403a-a0b5-3d098b289dbd",
"appidacr":"2",
"idp":"https://sts.windows.net/bd830b04-9cc5-488b-8099-fcabcdb1f6fa/",
"idtyp":"app",
"oid":"25f1c7c5-bfad-4be3-bc49-28f3e6a3b5f0",
"rh":"1.AW8BBAuDvcWci0iAmfyrzbH2-qyEm0khE39CqhcmfKaXV5hwAQBvAQ.",
"sub":"25f1c7c5-bfad-4be3-bc49-28f3e6a3b5f0",
"tid":"bd830b04-9cc5-488b-8099-fcabcdb1f6fa",
"uti":"sgWnQXpkQUCukxJYDYA3AA",
"ver":"1.0",
"xms_ftd":"DGauhAlLP2_PU3GqRlDT_zOHzsktdnU5W96gOLuzkL8",
"xms_idrel":"7 32"
}
```

### Conjur OSS and Enterprise JWT Authentication
1. Define the JWT Authentication policy
    
* Create a policy that defines JWT Authentication auth-jwt.yml
```
- !policy
  id: conjur/authn-jwt/azure
  body:
      - !webservice
 
      #Mandatory variable: The JWT provider URI
      #Uncomment either 'provider-uri' OR 'jwks-uri'
 
      #- !variable
      #    id: provider-uri
 
      - !variable
        id: jwks-uri
 
      #Optional variables
      #Uncomment one or all of the following optional variables.
      #Note: If you uncomment 'token-app-property' you must also uncomment 'identity-path',
      #and vice versa;
 
      - !variable
        id: token-app-property
 
      - !variable
        id: identity-path
 
      - !variable
        id: issuer
 
      #Group of applications that can authenticate using this JWT Authenticator
      - !group apps
 
      - !permit
        role: !group apps
        privilege: [read, authenticate]
        resource: !webservice
 
      - !webservice
        id: status
 
      #Group of users who can check the status of the JWT Authenticator
      - !group
        id: operators
 
      - !permit
        role: !group operators
        privilege: [read]
        resource: !webservice status
```
* Save the policy and load it to root
```  
  conjur policy load -f auth-jwt.yml -b root
```
* Populate the policy variables

```
CONJUR_AUTHENTICATORS=authn-jwt/azure,authn
conjur variable set -i conjur/authn-jwt/azure/token-app-property -v 'appid'
conjur variable set -i conjur/authn-jwt/$CONJUR_AUTHENTICATOR_ID/identity-path -v "azure-apps"
conjur variable set -i conjur/authn-jwt/$CONJUR_AUTHENTICATOR_ID/issuer -v "https://sts.windows.net/bd830b04-9cc5-
488b-8099-fcabcdb1f6fa/"
conjur variable set -i conjur/authn-jwt/$CONJUR_AUTHENTICATOR_ID/jwks-uri -v "https://login.windows.net/common
/discovery/keys"
```

* Define an app ID (host) and save it as authn-host.yaml

```
- !policy
  id: azure-apps
  body:
      - !group
 
      - &hosts
        - !host
          id: 6e9b3631-0853-403a-a0b5-3d098b289dbd
          annotations:
              authn-jwt/azure/sub: 25f1c7c5-bfad-4be3-bc49-28f3e6a3b5f0
 
      - !grant
        role: !group
        members: *hosts
 
- !grant
  role: !group conjur/authn-jwt/azure/apps
  member: !group azure-apps
```
* Load the policy to branch root
```
conjur policy load -f authn-host.yaml -b root
```

* Define variables in Conjur to represent your secrets and give the workload permission to access to the secrets
``` 
- &devvariables
   - !variable Dev-Team-credential1
   - !variable Dev-Team-credential2
   - !variable Dev-Team-credential3
   - !variable Dev-Team-credential4
- !permit
  resource: *devvariables
  privileges: [ read, execute ]
  roles: !group github-apps
```
* Save the policy as secret-variables.yml, and use the Conjur CLI to load into root
```
conjur policy load -f /path/to/file/secret-variables.yml -b root
```

### Conjur Cloud JWT Authentication
1. Define the JWT Authentication policy
    
* Create a policy that defines JWT Authentication auth-jwt.yml

![alt text][def]
 
* Save the policy and load it to conjur/authn-jwt
```  
  conjur policy load -f auth-jwt.yml -b conjur/authn-jwt
```
* Populate the policy variables

```
conjur authenticator enable --id authn-jwt/azure
conjur variable set -i conjur/authn-jwt/azure/token-app-property -v 'appid'
conjur variable set -i conjur/authn-jwt/$CONJUR_AUTHENTICATOR_ID/identity-path -v "data/azure-apps"
conjur variable set -i conjur/authn-jwt/$CONJUR_AUTHENTICATOR_ID/issuer -v "https://sts.windows.net/bd830b04-9cc5-
488b-8099-fcabcdb1f6fa/"
conjur variable set -i conjur/authn-jwt/$CONJUR_AUTHENTICATOR_ID/jwks-uri -v "https://login.windows.net/common
/discovery/keys"
```
* Define an app ID (host) and save it as authn-host.yaml

![alt text][def2]

* Load the policy to branch data
```
conjur policy load -f authn-host.yaml -b data
```

* To grant permissions on secret create a policy and save it as authn-grantapp.yaml 
  
![alt text][def3]

* Load the policy into branch conjur/authn-jwt/azure
```
conjur policy load -f authn-grantapp.yaml -b conjur/authn-jwt/azure
```

* Define Valut Permission and save it as vault-permission.yaml
  
![alt text][def4]

* Load the policy into branch data/vault/{any_name}, for example data/vault/Secret_Safe
```
conjur policy load -f vault-permission.yaml -b data/vault/Secret_Safe
```
## Azure DevOps Setup

* Download Conjur Azure DevOps Extension from Azure Marketplace
* Install the extension to an Azure DevOps organization
* Search for installed extension in Project Settings > Pipelines > Service connection > Create service connection

     <img src="https://github.cyberng.com/Conjur-Enterprise/conjur-azure-devops-extension/blob/main/images/service-connection.png" width="300" height="300">

### Service Connection for API Key

* Add the Conjur details in Service Connection 

     <img src="https://github.cyberng.com/Conjur-Enterprise/conjur-azure-devops-extension/blob/main/images/setupSC.png" width="400" height="500">

* In Pipeline > Task > Search with Batch Secret Retrieval > Select the Service Connection and provide path of secrets.yml file

![alt text][def11]

* secrets.yml file format  

- Conjur OSS or Enterprise

```yaml
SECRET: !var BotApp/secretVar
ANOTHER_SECRET: !var some-other-secret
```

- Conjur Cloud

```yaml
SECRET: !var data/vault/secrets-safe/ado_secret_apikey/address
ANOTHER_SECRET: !var data/vault/secrets-safe/ado_secret_apikey/username
```

### Service Connection for Conjur JWT

* Create a new service connection for Conjur JWT

![alt text][def5]

* Choose Conjur JWT Batch Secrets Server Connection Field. The window will appear as below.
  
![alt text][def6]

### Service Connection for Azure Resource Manager

* Create a new service connection for Azure Resource Manager
  
![alt text][def7]

* Add the details for service connection.

![alt text][def8]

* In Pipeline > Task > Search with Batch Secret Retrieval > Select the Service Connection and provide path of secrets.yml file

![alt text][def9]

Sample Pipeline:

![alt text][def10]

Sample Secret file (secrets.yml)

```
SECRET: !var data/edge-test-cred-1
ANOTHER_SECRET: !var data/edge-test-cred-2

SECRET/ANOTHER_SECRET: environment variables, to be set with the secret value retrieved from Conjur for secret path: data/edge-test-cred-1 or data/edge-test-cred-2. With colon , exclamation mark and var as delimiter.
```
## Development

Please follow this guide to properaly set up this extension:
https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops

## Contributing
We welcome contributions of all kinds to this repository. For instructions on how to get started and descriptions
of our development workflows, please see our [contributing guide](CONTRIBUTING.md).

## License
This repository is licensed under Apache License 2.0 - see [`LICENSE`](LICENSE) for more details.


[def]: images/JWT-Policy.png
[def2]: images/JWT-Host-Policy.png
[def3]: images/JWT-GrantApp.png
[def4]: images/JWT-ValutPermission.png
[def5]: images/JWT-service-connection.png
[def6]: images/JWT-secret-server-connection.png
[def7]: images/service-connection-AzureRM.png
[def8]: images/Azure-service-connection.png
[def9]: images/JWT-Secret-Retrival.png
[def10]: images/JWT-AzurePipeline.png
[def11]: images/API-service-connection.png



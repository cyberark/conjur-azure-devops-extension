# Conjur Azure DevOps Extension
Azure Devops Task Extension with API Key Authentication mechanism for supporting batch retrieval of secrets from the Cyberark Conjur Secrets Manager in secured way through Azure DevOps Pipeline.

The Authentication parameters to connect to Conjur Server are configured in Service Connection.

## Certification Level
![](https://img.shields.io/badge/Certification%20Level-Community-28A745?link=https://github.com/cyberark/community/blob/master/Conjur/conventions/certification-levels.md)

This repo is a **Community** level project. It's a community contributed project that **is not reviewed or supported
by CyberArk**. For more detailed information on our certification levels, see [our community guidelines](https://github.com/cyberark/community/blob/master/Conjur/conventions/certification-levels.md#community).

## Features

The following features are available with the Azure DevOps Extension:

* API authentication
* Batch retrieval of secrets from Conjur Server with help of secured Service Connection

## Limitations

The Azure DevOps Extension does not support creating, updating or removing secrets

## Technical Requirements

| Technology             | Version  |
| ---------------------- | -------- |
| Conjur OSS             | 1.9+     |
| Conjur Enterprise      | 12.5+    |
| Conjur Cloud           |          |
| Azure DevOps account   |          |

# Prerequisites

The following are prerequisites to use Azure DevOps extension.

## Conjur setup

Conjur (OSS or Enterprise or Cloud) and the Conjur CLI are installed in the environment and running in the background.

This section describes how to set up the API Authentication for Conjur OSS or Enterprise

1. Define the API Authentication policy
     a. Create a policy that defines the API Authentication, for example BotApp.
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

     b. Save the policy as BotApp.yml, and load it to root:
```yaml
     conjur policy load -b root -f /path/to/file/authn-iam.yml
```
     Conjur generates the following API keys:
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

## Azure DevOps Setup

* Download Conjur Azure DevOps Extension from Azure Marketplace
* Install the extension to an Azure DevOps organization
* Search for installed extension in Project Settings > Pipelines > Service connection > Create service connection

     <img src="https://github.com/cyberark/conjur-azure-devops-extension/blob/main/images/service-connection.png" width="300" height="300">

* Add the Conjur details in Service Connection 

     <img src="https://github.com/cyberark/conjur-azure-devops-extension/blob/main/images/setupSC.png" width="400" height="500">

* In Pipeline > Task > Search with Batch Secret Retrieval > Select the Service Connection and provide path of secrets.yml file

     <img src="https://github.com/cyberark/conjur-azure-devops-extension/blob/main/images/pipelineTask.png" width="500" height="500">

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

* Under steps in azure-pipeline.yml task is added

```yaml
steps:
- task: secretBatchRetrievalConnector@0
  displayName: ConjurIntegeration
  inputs:
    ConjurService: 'ConjurSConnection'
    secretsyml: './secrets.yml'
```

## Development

Please follow this guide to properaly set up this extension:
https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops

## Contributing
We welcome contributions of all kinds to this repository. For instructions on how to get started and descriptions
of our development workflows, please see our [contributing guide](CONTRIBUTING.md).

## License
This repository is licensed under Apache License 2.0 - see [`LICENSE`](LICENSE) for more details.
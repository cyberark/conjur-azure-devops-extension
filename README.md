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

The following are prerequisites to using the Spring Boot Plugin.

## Conjur setup

Conjur (OSS or Enterprise or Cloud) and the Conjur CLI are installed in the environment and running in the background.

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

```yaml
SECRET: !var BotApp/secretVar
ANOTHER_SECRET: !var some-other-secret
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
).

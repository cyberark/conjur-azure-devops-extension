#!/usr/bin/env groovy

// This is a template Jenkinsfile for builds and the automated release project

// Automated release, promotion and dependencies
properties([
  // Include the automated release parameters for the build
  release.addParams(),
])

// Performs release promotion.  No other stages will be run
if (params.MODE == "PROMOTE") {
  release.promote(params.VERSION_TO_PROMOTE) { sourceVersion, targetVersion, assetDirectory ->
    // Any assets from sourceVersion Github release are available in assetDirectory
    // Any version number updates from sourceVersion to targetVersion occur here
    // Any publishing of targetVersion artifacts occur here
    // Anything added to assetDirectory will be attached to the Github Release
  }
  return
}

pipeline {
  agent { label 'conjur-enterprise-common-agent' }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  triggers {
    cron(getDailyCronString())
  }

  environment {
    // Sets the MODE to the specified or autocalculated value as appropriate
    MODE = release.canonicalizeMode()
  }

  stages {
    // Aborts any builds triggered by another project that wouldn't include any changes
    stage ("Skip build if triggering job didn't create a release") {
      when {
        expression {
          MODE == "SKIP"
        }
      }
      steps {
        script {
          currentBuild.result = 'ABORTED'
          error("Aborting build because this build was triggered from upstream, but no release was built")
        }
      }
    }

    stage('Get InfraPool ExecutorV2 Agent') {
      steps {
        script {
          // Request ExecutorV2 agents for 1 hour(s)
          INFRAPOOL_EXECUTORV2_AGENT_0 = getInfraPoolAgent.connected(type: "ExecutorV2", quantity: 1, duration: 1)[0]
        }
      }
    }

    // Generates a VERSION file based on the current build number and latest version in CHANGELOG.md
    stage('Validate Changelog and set version') {
      steps {
        script {
          updateVersion(INFRAPOOL_EXECUTORV2_AGENT_0, "CHANGELOG.md", "${BUILD_NUMBER}")
        }
      }
    }

    stage('Build') {
      steps {
        script {
          INFRAPOOL_EXECUTORV2_AGENT_0.agentSh './secretBatchRetrievalConnector/bin/build'
          INFRAPOOL_EXECUTORV2_AGENT_0.agentArchiveArtifacts artifacts: "*.vsix", fingerprint: true
        }
      }
    }

    stage('Run Tests (OSS)') {
      steps {
        script {
          INFRAPOOL_EXECUTORV2_AGENT_0.agentSh './secretBatchRetrievalConnector/bin/test oss'
        }
      }
    }

    stage('Run Tests (Enterprise)') {
      steps {
        script {
          INFRAPOOL_EXECUTORV2_AGENT_0.agentSh './secretBatchRetrievalConnector/bin/test enterprise'
        }
      }
    }

    stage('Release') {
      when {
        expression {
          MODE == "RELEASE"
        }
      }

      steps {
        script {
          release(INFRAPOOL_EXECUTORV2_AGENT_0) { billOfMaterialsDirectory, assetDirectory ->
            // Publish release artifacts to all the appropriate locations
            // Copy any artifacts to assetDirectory to attach them to the Github release
          }
        }
      }
    }
  }

  post {
    always {
      script {
        releaseInfraPoolAgent(".infrapool/release_agents")
      }
    }
  }
}

#!/bin/sh

cd secretBatchRetrievalConnector
npm install
cd ..
tfx extension create --manifest-globs vss-extension.json
tfx extension create --manifest-globs vss-extension-dev.json
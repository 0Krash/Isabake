const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appPath = path.join(rootDir, 'App.js');
const forbiddenPatterns = [
  'runLocalOnlyReadinessCheck',
  'runSyncReadinessCheck',
  'resetLocalDevData',
  'runRecipeSaleServiceSmokeTest',
  'runLocalTransactionRollbackSmokeTest',
  'runLocalTransactionReturnSmokeTest',
  'runAllDevChecks',
  'runBackendSyncConnectivityCheck',
  'runPushPullDevCheck',
  'runTwoWorkspaceIsolationDevCheck',
  'runSync',
  'pushPendingChanges',
  'pullRemoteChanges',
];

const source = fs.existsSync(appPath) ? fs.readFileSync(appPath, 'utf8') : '';
const matches = forbiddenPatterns.filter((pattern) => source.includes(pattern));

if (matches.length > 0) {
  console.error(
    `App.js contains forbidden dev/sync startup wiring: ${matches.join(', ')}`,
  );
  process.exit(1);
}

console.log('App.js has no forbidden dev/sync startup wiring.');

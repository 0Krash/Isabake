# Dev Testing For Local-First Sync

Phase 11.6 adds isolated dev/test runners so local-first and sync work can be
validated without wiring temporary code into `App.js`.

## Rule

`App.js` must stay clean. Do not paste temporary readiness checks, smoke tests,
reset helpers, or sync runners into startup code.

Use Jest, npm scripts, or the isolated dev helpers in this folder instead.

## Node/Jest Checks

These can be run by Codex or any local shell without Expo runtime:

```sh
npm test -- --runInBand
npm run test:unit
npm run test:local
npm run test:sync
npm run test:dev
npm run check:syntax
npm run check:no-startup-test-wiring
npm run check:sync-config
```

Jest tests cover:

- current workspace/current group behavior with mocked storage
- sync readiness result shaping with mocked storage
- sync client safe failure when no backend URL is configured
- sync service safe failure when `groupId` is missing
- outbox count helper result shape with mocked storage
- `runLocalTransaction` return/error propagation with mocked DB
- dev runner result shaping and destructive-check skipping
- mobile sync client request/response compatibility with the backend contract

## Expo Runtime Checks

These checks use Expo SQLite and must run inside an Expo runtime:

- `runLocalOnlyReadinessCheck()`
- `runSyncReadinessCheck()`
- `runLocalTransactionReturnSmokeTest()`
- `runLocalTransactionRollbackSmokeTest()`
- `runInventoryStockServiceSmokeTest()`
- `runRecipeSaleServiceSmokeTest()`
- `previewDevDataReset()`
- `runDevDataReset()`
- `runBackendSyncConnectivityCheck()`
- `runPushPullDevCheck()`
- `runTwoWorkspaceIsolationDevCheck()`
- `runAuthWorkspaceDevCheck()`
- `runMembershipSyncAccessDevCheck()`

Import them through the central runner:

```js
import {
  previewDevDataReset,
  runAllDevChecks,
  runDevDataReset,
  runLocalDevChecks,
  runSyncDevChecks,
} from './data/dev/runDevChecks';
import {
  runAuthWorkspaceDevCheck,
  runBackendSyncConnectivityCheck,
  runMembershipSyncAccessDevCheck,
  runPushPullDevCheck,
  runTwoWorkspaceIsolationDevCheck,
} from './data/dev/runSyncIntegrationChecks';
```

Recommended Expo dev-console calls:

```js
await runLocalDevChecks();
await runSyncDevChecks();
await runAllDevChecks();
```

Manual sync integration checks:

```js
await runAuthWorkspaceDevCheck({ groupId: 'your_group_id' });
await runMembershipSyncAccessDevCheck({ groupId: 'your_group_id' });
await runBackendSyncConnectivityCheck({
  authSession: { authToken: 'dev-token-owner', userId: 'owner' },
  groupId: 'your_group_id',
});
await runPushPullDevCheck({
  authSession: { authToken: 'dev-token-owner', userId: 'owner' },
  groupId: 'your_group_id',
});
await runTwoWorkspaceIsolationDevCheck({
  groupA: 'your_group_id',
  groupB: 'other_dev_group_id',
});
```

## Sync Diagnostics Screen

During development, the app can show a manual `Sync Dev` tab. It is hidden unless
both conditions are true:

- the build is running with `__DEV__ === true`
- `.env` has `EXPO_PUBLIC_ENABLE_DEV_TOOLS='true'`

Enable it locally:

```sh
EXPO_PUBLIC_ENABLE_DEV_TOOLS='true'
```

Restart Expo after changing `.env`. Open the app and tap the `Sync Dev` tab in
the bottom navigation. The screen never runs checks on render; each check runs
only when its button is pressed.

Available buttons:

- `Check backend connectivity`
- `Run auth/workspace dev check`
- `Run membership sync access check`
- `Run push/pull dev check`
- `Run workspace isolation check`
- `Run all sync dev checks`

Expected success results have `"ok": true` in the formatted JSON output. Results
are also written to the console with the `[SyncDiagnostics]` prefix.

By default, mutating smoke tests are skipped. To run smoke tests that create
dev data:

```js
await runAllDevChecks({ includeMutatingChecks: true });
```

## Data Safety

Read-only/safe checks by default:

- local readiness
- sync readiness
- local transaction return smoke

Mutating checks, skipped unless `includeMutatingChecks: true`:

- local transaction rollback smoke
- inventory stock service smoke
- recipe sale service smoke

Mutating manual sync integration checks:

- `runAuthWorkspaceDevCheck()`
- `runMembershipSyncAccessDevCheck()`
- `runPushPullDevCheck()`
- `runTwoWorkspaceIsolationDevCheck()`

These create records with the `phase_13_sync_dev` prefix so they can be found by
the dev reset helper.

Reset helpers never run from `runAllDevChecks()`.

Preview smoke/dev cleanup:

```js
await previewDevDataReset();
```

Actually clean smoke/dev data:

```js
await runDevDataReset({ confirm: true });
```

`runDevDataReset()` refuses to run without `confirm: true`.

## Static Startup Guard

Run:

```sh
npm run check:no-startup-test-wiring
```

This fails if `App.js` imports or calls known readiness checks, smoke tests,
reset helpers, or low-level sync runners.

## Backend Sync Server

Run the backend locally from the backend folder:

```sh
cd ../root/src/Servers/TransBalance
npm install
npm start
```

The mobile sync client calls:

- `POST /workspaces`
- `GET /workspaces`
- `GET /workspaces/:groupId`
- `GET /workspaces/:groupId/members`
- `POST /workspaces/:groupId/members`
- `POST /sync/push`
- `GET /sync/pull?groupId=...&cursor=...`

Phase 14 sync endpoints require temporary dev auth headers. Anonymous push/pull
is rejected.

Temporary dev auth headers:

```sh
Authorization: Bearer dev-token-owner
x-dev-user-id: owner
x-dev-user-email: owner@example.test
```

The bearer token is not production auth. It exists only so sync can enforce
workspace membership while real login/session work is still pending.

Configure the mobile sync base URL with `URL_Sync` in `.env`. The value should be
the backend host root, not `/sync`, because the client appends `/sync/push` and
`/sync/pull`. Keep `URL_Sync` explicit; do not rely on `.env` interpolation for
this value.

Examples:

```sh
URL_Sync='http://192.168.1.87:3000'
```

Android emulator:

```sh
API_HOST='http://10.0.2.2:3000'
URL_Sync='http://10.0.2.2:3000'
```

iOS simulator:

```sh
API_HOST='http://localhost:3000'
URL_Sync='http://localhost:3000'
```

Physical device:

```sh
API_HOST='http://YOUR_LAN_IP:3000'
URL_Sync='http://YOUR_LAN_IP:3000'
```

The phone and backend machine must be on the same network, and the backend port
must be reachable from the device.

Validate local sync configuration:

```sh
npm run check:sync-config
```

This check fails when `URL_Sync` is missing, invalid, or still uses unsupported
interpolation.

## Phase 14 Auth And Workspace Examples

Create or upsert a dev user implicitly by sending auth headers. No separate
signup is required in Phase 14.

Create workspace:

```sh
curl -X POST "$URL_Sync/workspaces" \
  -H "Authorization: Bearer dev-token-owner" \
  -H "x-dev-user-id: owner" \
  -H "x-dev-user-email: owner@example.test" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"demo_group","name":"Demo workspace"}'
```

List current user's workspaces:

```sh
curl "$URL_Sync/workspaces" \
  -H "Authorization: Bearer dev-token-owner" \
  -H "x-dev-user-id: owner"
```

Add a member:

```sh
curl -X POST "$URL_Sync/workspaces/demo_group/members" \
  -H "Authorization: Bearer dev-token-owner" \
  -H "x-dev-user-id: owner" \
  -H "Content-Type: application/json" \
  -d '{"userId":"member","role":"member","status":"active"}'
```

Authenticated push:

```sh
curl -X POST "$URL_Sync/sync/push" \
  -H "Authorization: Bearer dev-token-owner" \
  -H "x-dev-user-id: owner" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"demo_group","deviceId":"device_1","events":[]}'
```

Authenticated pull:

```sh
curl "$URL_Sync/sync/pull?groupId=demo_group&cursor=0" \
  -H "Authorization: Bearer dev-token-owner" \
  -H "x-dev-user-id: owner"
```

Role rules:

- `owner`, `admin`, and `member` can push and pull.
- `viewer` can pull but cannot push.
- `invited`, `removed`, and non-members cannot push or pull.
- `owner` and `admin` can add members.

Temporary limitations before production:

- Dev auth headers are not secure production authentication.
- There is no password login UI or token refresh.
- Workspace invitations do not send email.
- No WebSockets/realtime sync.
- Sync is still manual; it does not run on startup or every local write.

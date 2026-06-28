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
- `runAuthenticatedPushPullDevCheck()`
- `runAuthenticatedWorkspaceIsolationDevCheck()`
- `runConflictSimulationDevCheck()`
- `runConflictResolutionDevCheck()`
- `runConflictPreferLocalDevCheck()`
- `runConflictSummaryDevCheck()`
- `runListConflictsDevCheck()`
- `runMembershipSyncAccessDevCheck()`
- `runPullOverPendingConflictDevCheck()`
- `runResolveLatestConflictPreferLocalDevCheck()`
- `runResolveLatestConflictPreferRemoteDevCheck()`

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
  runAuthenticatedPushPullDevCheck,
  runAuthenticatedWorkspaceIsolationDevCheck,
  runBackendSyncConnectivityCheck,
  runConflictPreferLocalDevCheck,
  runConflictResolutionDevCheck,
  runConflictSimulationDevCheck,
  runConflictSummaryDevCheck,
  runListConflictsDevCheck,
  runMembershipSyncAccessDevCheck,
  runPullOverPendingConflictDevCheck,
  runResolveLatestConflictPreferLocalDevCheck,
  runResolveLatestConflictPreferRemoteDevCheck,
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
await runAuthenticatedPushPullDevCheck({
  groupId: 'your_group_id',
  userId: 'member',
});
await runAuthenticatedWorkspaceIsolationDevCheck();
await runConflictSimulationDevCheck({ groupId: 'your_group_id' });
await runPullOverPendingConflictDevCheck({ groupId: 'your_group_id' });
await runConflictSummaryDevCheck();
await runListConflictsDevCheck();
await runResolveLatestConflictPreferLocalDevCheck();
await runResolveLatestConflictPreferRemoteDevCheck();
await runConflictResolutionDevCheck({ groupId: 'your_group_id' });
await runConflictPreferLocalDevCheck({ groupId: 'your_group_id' });
```

Legacy unauthenticated checks:

```js
await runPushPullDevCheck({
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
- `Auth workspace check`
- `Membership access check`
- `Authenticated push/pull check`
- `Authenticated workspace isolation check`
- `Conflict simulation check`
- `Pull-over-pending conflict check`
- `List conflicts`
- `Show conflict summary`
- `Resolve latest conflict: prefer local`
- `Resolve latest conflict: prefer remote`
- `Conflict resolution end-to-end check`
- `Conflict prefer-local check`
- `Legacy unauthenticated push/pull check`
- `Legacy unauthenticated workspace isolation check`
- `Run all authenticated sync checks`

Expected success results have `"ok": true` in the formatted JSON output. Results
are also written to the console with the `[SyncDiagnostics]` prefix.

After Phase 14, default `Run all authenticated sync checks` uses authenticated
runners only. Legacy unauthenticated checks are still available as separate
buttons for debugging old behavior, but they are expected to fail against a
membership-protected backend unless auth is intentionally disabled.

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
- `runAuthenticatedPushPullDevCheck()`
- `runAuthenticatedWorkspaceIsolationDevCheck()`
- `runConflictSimulationDevCheck()`
- `runPullOverPendingConflictDevCheck()`
- `runConflictResolutionDevCheck()`
- `runConflictPreferLocalDevCheck()`
- `runPushPullDevCheck()`
- `runTwoWorkspaceIsolationDevCheck()`

These create records with the `phase_13_sync_dev` prefix so they can be found by
the dev reset helper. Authenticated Phase 14 checks also use the
`phase_14_auth_dev`, `phase_14_auth_sync_dev`, and `phase_15_conflict_dev`
prefixes.

## Conflict Diagnostics

Phase 15 makes conflicts explicit but still does not add production conflict UI.

Document statuses:

- `synced`: local record matches a server-accepted version.
- `pending`: local changes need push.
- `failed`: sync failed for a non-conflict reason.
- `conflict`: local changes were preserved but need manual/dev resolution.

Outbox statuses:

- `pending`: event is waiting to push.
- `done`: event was accepted by the backend.
- `failed`: event failed for a retryable or non-conflict error.
- `conflict`: event was rejected because the backend has a newer version.

Conflict rules:

- Backend rejects stale `baseServerVersion` with `reason: "conflict"`.
- Mobile marks the local document `syncStatus: "conflict"`.
- Mobile marks the outbox event `status: "conflict"`.
- Local data is not deleted or overwritten automatically.
- Pulling over a local pending/conflict document marks conflict instead of
  blindly overwriting local changes.

Run manual checks from Sync Dev:

- `Conflict simulation check`
- `Pull-over-pending conflict check`

Or from Expo dev console:

```js
await runConflictSimulationDevCheck({ groupId: 'your_group_id' });
await runPullOverPendingConflictDevCheck({ groupId: 'your_group_id' });
```

`Pull-over-pending conflict check` creates a unique run id, group id, local id,
and remote id on each execution, even when a base `groupId` is provided. This
keeps previous sync cursors and older dev records from hiding the simulated
remote change during `Run all authenticated sync checks`.

Production conflict resolution UI remains pending.

## Conflict Resolution Dev Flow

Phase 16 adds dev/internal conflict inspection and resolution helpers. These are
manual tools only; they are not wired to startup and are not production conflict
UI.

Inspection APIs:

- `getConflictSummary()`
- `getConflictDetails({ collection, documentId })`
- `getConflictDocuments()`
- `getConflictOutboxEvents()`
- `getConflictsByCollection()`

Resolution APIs:

- `resolveConflictPreferLocal({ collection, documentId })`
- `resolveConflictPreferRemote({ collection, documentId })`
- `markConflictResolvedManually({ collection, documentId, notes })`

Prefer local:

- Keeps local document data.
- Sets the document back to `pending`.
- Creates or reuses a pending outbox event.
- Does not mark the document as `synced` before the backend accepts it.

Prefer remote:

- Applies the remote/conflict document.
- Sets the document to `synced`.
- Marks related conflict outbox events resolved.
- Does not create a new outbox event.

Manual resolution requires explicit notes or a final document. Do not use these
helpers to silently discard data. Production conflict resolution UX is still
pending.

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

## Production Conflict UI

Phase 17 adds a production-safe conflict resolution screen. It does not run
sync, resolve conflicts, or contact the backend on startup.

Create a conflict during development from the Sync Dev screen by running one of
the conflict diagnostics, such as the conflict simulation or pull-over-pending
check. Then open the bottom tab labeled `Conflictos`.

The conflict screen shows the total conflicts, counts by collection, the
conflict list, local JSON data, remote JSON data, conflict metadata, version
numbers, timestamps, and related outbox status.

Resolution behavior:

- `Preferir local` keeps the local version and leaves it pending for the next
  sync retry. It does not claim the data is already synced.
- `Preferir remoto` applies the remote version locally and does not create a
  new outbox event.
- Both actions require confirmation first; there is no one-tap destructive
  resolution.

Still missing before broader production sync UX:

- field-level merge UI
- audit history UI
- real login screens
- realtime notifications

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

The bearer token in this example is dev-only auth. It exists only for Sync Dev
diagnostics and automated tests.

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

## Phase 18 Real Auth And Workspace Examples

Real sync auth uses JWT:

```sh
Authorization: Bearer <accessToken>
```

Backend env:

```sh
JWT_SECRET='replace-with-a-long-random-secret'
```

Register:

```sh
curl -X POST "$URL_Sync/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Ana","email":"ana@example.test","password":"password123"}'
```

Login:

```sh
curl -X POST "$URL_Sync/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.test","password":"password123"}'
```

Use the returned `session.accessToken` for workspace and sync requests.

Mobile app:

- Open `Cuenta`.
- Use `Crear cuenta` or `Iniciar sesion`.
- Local-only mode remains available without login.
- Logout clears only the auth session; it does not delete local data.

The mobile token store currently uses an in-memory/test-safe fallback because
`expo-secure-store` is not installed in this project. Add SecureStore later and
wire it through the auth token store adapter before treating mobile persistence
as production hardened.

Create workspace with JWT:

```sh
curl -X POST "$URL_Sync/workspaces" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"demo_group","name":"Demo workspace"}'
```

Authenticated push with JWT:

```sh
curl -X POST "$URL_Sync/sync/push" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"demo_group","deviceId":"device_1","events":[]}'
```

Authenticated pull with JWT:

```sh
curl "$URL_Sync/sync/pull?groupId=demo_group&cursor=0" \
  -H "Authorization: Bearer <accessToken>"
```

## Dev Auth And Workspace Examples

Create or upsert a dev user implicitly by sending auth headers. No separate
signup is required for dev diagnostics.

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

Dev authenticated push:

```sh
curl -X POST "$URL_Sync/sync/push" \
  -H "Authorization: Bearer dev-token-owner" \
  -H "x-dev-user-id: owner" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"demo_group","deviceId":"device_1","events":[]}'
```

Dev authenticated pull:

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

Temporary limitations before broader production sync:

- Dev auth headers are not production authentication and are disabled in
  production unless `ENABLE_DEV_AUTH=true`.
- Auth UI is intentionally minimal.
- Mobile secure persistent storage still needs SecureStore wiring.
- Workspace invitations do not send email.
- No WebSockets/realtime sync.
- Sync is still manual; it does not run on startup or every local write.

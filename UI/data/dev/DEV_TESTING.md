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

## Workspace Management UI

Phase 21 adds a production-safe Workspace screen. It is available from the
bottom navigation as `Workspace` and can also be opened from `Cuenta` when a
session exists.

Local-only mode:

- works without login
- remains available when the backend is offline
- does not run push/pull automatically
- is restored by `Desconectar localmente` without deleting local documents

Shared workspace flow:

1. Open `Cuenta` and login/register.
2. Open `Workspace`.
3. Create a shared workspace with `Crear y seleccionar`, or press
   `Actualizar lista` and select an existing workspace.
4. Selecting a workspace only updates the local current workspace metadata; it
   does not auto-sync.

Member management:

- owners/admins can add members and set role/status
- owners/admins can remove members by marking membership `removed`
- members/viewers cannot manage members
- a user can leave a workspace unless they are the only active owner
- removing/leaving does not delete local device data

## Invitation Email Delivery

Phase 26 adds a backend email provider layer for workspace invitations.

Safe defaults:

- `INVITATION_EMAIL_PROVIDER` defaults to `noop`
- `noop` returns `status: "skipped"` outside production
- production or `INVITATION_EMAIL_REQUIRE_CONFIG=true` returns
  `status: "not_configured"` when no provider is configured
- normal API/UI responses expose only safe `emailDelivery` metadata

Provider options:

```sh
INVITATION_EMAIL_PROVIDER=noop
INVITATION_EMAIL_PROVIDER=console
INVITATION_EMAIL_PROVIDER=http
```

HTTP webhook delivery:

```sh
APP_INVITE_BASE_URL=https://your-domain.example/invite
INVITATION_EMAIL_PROVIDER=http
INVITATION_EMAIL_WEBHOOK_URL=https://email-provider.example/send
INVITATION_EMAIL_WEBHOOK_API_KEY=optional-secret
INVITATION_EMAIL_FROM=hello@your-domain.example
INVITATION_EMAIL_REPLY_TO=support@your-domain.example
```

Dev console logging:

```sh
INVITATION_EMAIL_PROVIDER=console
LOG_DEV_INVITE_LINKS=true
```

`console` never logs raw links in production. `EXPOSE_DEV_INVITE_LINKS=true`
is still required before API responses include `devInviteLink`, and normal
Workspace UI does not render raw invite links.

## Universal/App Links

Phase 27 adds testable native config for invitation app links.

Local custom scheme links:

```sh
npx uri-scheme open "isabake://invite/dev_token" --ios
npx uri-scheme open "isabake://invite/dev_token" --android
npx uri-scheme open "isabake:///invite/dev_token" --ios
npx uri-scheme open "isabake:///invite/dev_token" --android
```

Production HTTPS links require a configured domain and native rebuild:

```sh
EXPO_PUBLIC_INVITE_DOMAIN=links.example.com
APP_INVITE_BASE_URL=https://links.example.com/invite
```

Then test:

```sh
npx uri-scheme open "https://links.example.com/invite/dev_token?utm=email" --ios
npx uri-scheme open "https://links.example.com/invite/dev_token?utm=email" --android
```

Domain association templates live in `docs/app-links`. Opening or accepting an
invitation link must not push, pull, full-sync, force login, or delete local
data.

## Account, Workspace, And Invitation UX

Phase 28 keeps UX polish in testable model helpers. Node/Jest checks cover:

- safe account status messages for local-only, authenticated, expired, revoked,
  refresh-failed, login, register, and logout states
- workspace role/status labels and safe empty/error states
- invitation status labels for pending, accepted, declined, expired, and revoked
- email delivery labels that do not expose invite links or token hashes
- disabled invitation actions for non-admin roles and closed invitations
- invitation accept/decline errors for wrong email, expired/revoked links, and
  login-required states
- no raw token/hash exposure in UI model output

Manual runtime checks:

1. Open `Cuenta` while logged out and confirm local-only copy.
2. Login/register and confirm no token is shown.
3. Logout and confirm local data remains visible.
4. Open `Workspace` in local-only mode, shared mode, and no-invitations state.
5. Confirm selecting a workspace does not sync.
6. Open an invitation link, preview it, and confirm accepting/declining does not
   sync automatically.

## Primary Navigation UX

Phase 28.1 recenters the app around three primary tabs:

- `Transacciones`
- `Recetas`
- `Inventario`

Technical/support screens are secondary and reachable from `Opciones`:

- `Cuenta`
- `Compartir negocio`
- `Respaldo y sincronizacion`
- `Cambios por revisar`
- `Herramientas dev`, only when dev tools are explicitly enabled

Normal users should not see `groupId`, `cursor`, push/pull wording, raw JSON, or
dev diagnostics in primary navigation. Opening the secondary menu, sync screen,
workspace screen, or conflict screen must not run sync automatically.

Roles:

- `owner`
- `admin`
- `member`
- `viewer`

Statuses:

- `active`
- `invited`
- `removed`

Still missing:

- email invitations
- realtime membership updates
- polished account/workspace settings UX
- automatic sync scheduling

## Sync Center

Phase 22 adds a production-safe `Sync` tab for manual sync.

Use it like this:

1. Keep using local-only mode normally when no account/workspace is selected.
2. Login/register from `Cuenta`.
3. Create or select a shared workspace from `Workspace`.
4. Open `Sync`.
5. Press `Actualizar` to refresh local sync status.
6. Press `Push local changes`, `Pull remote changes`, or `Run full sync`
   manually.

Behavior:

- opening the screen reads local status only
- selecting a workspace does not run sync
- push only sends the active shared workspace `groupId`
- pull only requests the active shared workspace `groupId`
- full sync runs push then pull for the active shared workspace
- local-only mode disables shared sync actions
- unauthenticated shared mode reports `auth_required`
- expired sessions report `session_expired`
- backend/network issues report a safe unavailable message
- conflicts are shown as warnings and are never auto-resolved

The `Open Conflicts` button navigates to the conflict UI. Use that screen for
manual conflict handling before retrying sync.

Still missing:

- background sync
- scheduled sync
- realtime/WebSocket notifications
- email invitations

## Workspace Invitations

Phase 23 adds invitation records for workspace onboarding.

Flow:

1. Owner/admin opens `Workspace`.
2. Selects a shared workspace.
3. Enters an email, chooses `admin`, `member`, or `viewer`, and creates an
   invitation.
4. The invited user logs in/registers with that email.
5. The invited user opens `Workspace`, presses `Ver mis invitaciones`, then
   accepts or declines.

Rules:

- invitation emails are normalized to lowercase
- `owner` is not an invitation role
- duplicate active invitations for the same workspace/email are reused safely
- accepting an invitation creates or activates membership
- declining does not create active membership
- revoked/expired invitations cannot be accepted
- accepting an invitation does not run sync
- selecting the accepted workspace does not run sync
- Sync Center remains manual

Still missing:

- real email delivery
- realtime invitation notifications
- polished onboarding UX

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

Phase 19 stores mobile auth state with `expo-secure-store` on supported native
runtimes.

Storage shape:

- access token: secure item
- refresh token: secure item
- user/session metadata: secure item without raw tokens

Jest uses `test/__mocks__/expoSecureStore.js`. Unsupported environments keep a
memory-only fallback for tests and development, not for production security.

Session boot:

- `Cuenta` loads any stored session locally.
- Startup does not require network.
- Restored sessions are marked locally restored until verified.
- Local-only mode remains available without login.

Refresh:

- Shared sync requests ask auth for fresh headers before network access.
- Near-expired or expired access tokens refresh through `/auth/refresh`.
- Failed refresh clears stored auth tokens and returns `session_expired`.
- Logout clears secure auth tokens only; it does not delete local SQLite data.

Manual session validation:

- Open `Cuenta`.
- Tap `Verificar sesion`.
- The app calls auth/session verification without showing raw JWT values.

Sync Dev also includes manual auth checks:

- `Real auth session check`
- `Server session revocation check`

They do not run from startup or default Run All.

Phase 20 adds server-side auth sessions. Refresh tokens are JWTs, but the raw
refresh token is never stored. The backend stores only a SHA-256 hash in
`auth_sessions`.

Refresh rotation:

- `/auth/login` and `/auth/register` create an auth session row.
- `/auth/refresh` verifies the refresh token signature, compares its hash
  against the active session, revokes the old session as `rotated`, creates a
  replacement session, and returns a new access/refresh pair.
- Reusing an old refresh token fails.
- Deleted users, expired sessions, and revoked sessions cannot refresh.

Logout/revocation:

- `/auth/logout` revokes the current matching auth session when a refresh token
  or session id is available.
- Access tokens can remain valid until their short expiration; there is no
  access-token denylist yet.
- Mobile logout clears SecureStore even when the backend is offline. Local data
  is never deleted.

Session endpoints:

```sh
curl "$URL_Sync/auth/sessions" \
  -H "Authorization: Bearer <accessToken>"

curl -X DELETE "$URL_Sync/auth/sessions/<sessionId>" \
  -H "Authorization: Bearer <accessToken>"

curl -X DELETE "$URL_Sync/auth/sessions" \
  -H "Authorization: Bearer <accessToken>"
```

Session API responses never include `refreshTokenHash`.

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

## Workspace Invitation Links

Phase 24 adds invitation tokens and link/email delivery foundations.

Create an invitation:

```sh
curl -X POST "$URL_Sync/workspaces/demo_group/invitations" \
  -H "Authorization: Bearer dev-token-owner" \
  -H "x-dev-user-id: owner" \
  -H "x-dev-user-email: owner@example.test" \
  -H "Content-Type: application/json" \
  -d '{"email":"invitee@example.test","role":"member"}'
```

The backend stores only `inviteTokenHash`; raw invite tokens are never stored.
Responses do not include raw invite links by default. For isolated dev/test
diagnostics only, set `EXPOSE_DEV_INVITE_LINKS=true` to include `devInviteLink`
in invitation creation responses. Production or missing env must not expose raw
invite links.

Preview an invitation link without auth:

```sh
curl "$URL_Sync/workspaces/invitations/by-token/<token>"
```

Accept or decline with auth:

```sh
curl -X POST "$URL_Sync/workspaces/invitations/by-token/<token>/accept" \
  -H "Authorization: Bearer dev-token-invitee" \
  -H "x-dev-user-id: invitee" \
  -H "x-dev-user-email: invitee@example.test"

curl -X POST "$URL_Sync/workspaces/invitations/by-token/<token>/decline" \
  -H "Authorization: Bearer dev-token-invitee" \
  -H "x-dev-user-id: invitee" \
  -H "x-dev-user-email: invitee@example.test"
```

Mobile helpers parse:

- `isabake://invite/<token>`
- `https://.../invite/<token>`

The app declares the `isabake` scheme and routes invitation links to
`InvitationAcceptScreen`. Opening a link only shows the invitation flow; it does
not push, pull, full-sync, force login, or delete local data.

`InvitationAcceptScreen` can load a safe preview before login. If the user is
unauthenticated, the token stays in the screen so they can log in/register and
return to accept or decline. Accepting an invitation activates membership and
refreshes workspaces, but it does not push, pull, full-sync, or delete local
data.

Regenerate an invitation link:

```sh
curl -X POST "$URL_Sync/workspaces/demo_group/invitations/<invitationId>/regenerate-link" \
  -H "Authorization: Bearer dev-token-owner" \
  -H "x-dev-user-id: owner" \
  -H "x-dev-user-email: owner@example.test"
```

Only `owner`/`admin` can regenerate links. The previous token becomes invalid.
The raw regenerated link is returned only when `EXPOSE_DEV_INVITE_LINKS=true`;
normal Workspace UI still shows only safe link status and expiration.

Email delivery:

- `invitationEmailService.js` is a no-op provider by default.
- Set `LOG_DEV_INVITE_LINKS=true` only in dev/test to log dev links explicitly.
- A production email provider is still pending.

Temporary limitations before broader production sync:

- Dev auth headers are not production authentication and are disabled in
  production unless `ENABLE_DEV_AUTH=true`.
- Auth UI is intentionally minimal.
- Full account/session audit UI is still pending.
- Access token denylisting is not implemented.
- Workspace invitation email uses a no-op provider until a production provider
  is configured.
- Deep link registration/navigation is prepared by helpers and screen, but full
  production linking setup is still pending.
- No WebSockets/realtime sync.
- Sync is still manual; it does not run on startup or every local write.

## Sync History

Phase 29 adds local-only sync history for diagnostics and future auto-sync
hardening.

What is stored:

- action type (`status_refresh`, `push`, `pull`, `full_sync`, `dev_check`)
- trigger source (`manual`, `dev`, `system_future`)
- status, timestamps, duration, counts, safe error code/message
- safe auth/network state and workspace label

What is never stored:

- JWT/access/refresh/invite tokens
- Authorization headers, cookies, API keys, provider secrets
- raw request/response bodies
- stack traces
- `inviteTokenHash`, `refreshTokenHash`, `passwordHash`
- raw conflict/backend payloads

Retention keeps the latest 100 history records when a new record is written.
There is no interval, scheduler, background sync, or startup sync.

Manual check:

1. Open Sync Center from the secondary app options.
2. Open `Historial de sync`.
3. Confirm opening the screen does not run sync.
4. Return to Sync Center and press `Actualizar` or `Sincronizar ahora`.
5. Open history again and confirm a safe, friendly record appears.

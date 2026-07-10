# Validation

## Reusable Commands

From repo root:

```bash
git diff --check
git status --short
```

UI:

```bash
cd UI
npm run check:syntax
npm run check:no-startup-test-wiring
npm run test:sync -- --runInBand
npm run test:dev
npm test -- --runInBand
```

Backend:

```bash
cd root/src/Servers/TransBalance
npm test -- --runInBand
```

If backend route/full tests fail in sandbox with:

```text
listen EPERM: operation not permitted 0.0.0.0
```

report it clearly, run focused service/non-listener tests when possible, and state that the backend full suite still needs to be run outside sandbox.

## Manual Validation Checklists

### Startup/Local-Only

- App opens without login.
- Local SQLite initializes.
- Local-only workspace/data remains usable without backend.
- App.js does not run sync/dev checks.
- Bottom navigation shows only Transacciones, Recetas, and Inventario.
- Account, shared business, sync, conflicts, and dev tools are secondary.

### Auth/Logout

- Login/register works.
- Tokens persist in SecureStore.
- Logout clears auth session only.
- Logout does not delete SQLite/local data.
- Account screen shows safe messages for local-only, logged-in, expired,
  revoked, refresh-failed, and logout states.
- Account screen never shows JWTs or refresh tokens.

### Workspace

- Local workspace remains available.
- Shared workspace can be selected without auto-sync.
- Disconnect/leave does not delete local data.
- Workspace list has no duplicate keys.
- Workspace screen shows clear loading, empty, auth-required, local-only, and
  shared workspace states.
- Member/invitation actions show safe disabled-state messages for unauthorized
  roles and closed invitations.

### Invitations

- Owner/admin can invite.
- Member/viewer cannot invite.
- Invite role cannot be owner.
- Accept activates membership only.
- Accept does not push/pull/full sync.
- Invitation screens show safe labels for pending, accepted, declined, expired,
  and revoked states.
- Wrong-email, expired, revoked, and login-required states show user-facing
  messages without backend internals.
- Email delivery status is shown as safe metadata only.

### Invitation Links

- `isabake://invite/<token>` opens invitation screen.
- `isabake:///invite/<token>` opens invitation screen.
- `https://.../invite/<token>` parses safely.
- `https://.../invite/<token>?utm=email` parses safely.
- Invalid links do not crash.
- Unknown paths and missing tokens are ignored safely.
- Opening link does not force login or sync.

### Universal/App Links

- `EXPO_PUBLIC_INVITE_DOMAIN` adds native app-link config at build time.
- `APP_INVITE_BASE_URL` controls backend-generated email invite URLs.
- Android domain file lives at `/.well-known/assetlinks.json`.
- iOS domain file lives at `/.well-known/apple-app-site-association`.
- See `docs/app-links/APP_LINKS_SETUP.md` for templates and production steps.

### Invitation Email Delivery

- Default provider is `noop`; it must not claim an email was sent.
- Production email delivery uses `INVITATION_EMAIL_PROVIDER=http` with
  `INVITATION_EMAIL_WEBHOOK_URL`.
- Optional provider auth uses `INVITATION_EMAIL_WEBHOOK_API_KEY`.
- `console` provider can log raw invite links only outside production and only
  with `LOG_DEV_INVITE_LINKS=true`.
- API/UI responses expose only safe `emailDelivery` metadata.
- Raw invite links are never shown in normal Workspace UI.

### Sync Center

- Refresh status does not sync.
- Refresh status may check backend reachability but must not send auth headers,
  push changes, pull changes, or expose the raw sync URL.
- Push/pull/full sync run only when manually pressed.
- Push/pull/full sync requests time out safely after 25 seconds by default.
- After timeout/failure, buttons stop loading and manual retry remains
  available.
- Sync uses active shared workspace groupId.
- Auth/session/workspace errors are safe.
- User-facing sync UI says Enviar cambios, Recibir cambios, and Sincronizar
  ahora.
- Sincronizar ahora is the primary manual action; Enviar/Recibir appear only in
  advanced options.
- Normal sync UI does not show groupId, cursor, push/pull wording, or raw JSON.
- Manual status refresh, push, pull, and full sync write local-only sync history
  metadata.
- Opening Sync Center or Sync History does not create a history record or run
  sync.
- Advanced "Revisar respaldo" runs a manual sync integrity check only when
  pressed.
- Advanced "Reparar respaldo" requires user confirmation, requeues repairable
  sync work, and never deletes local business data.
- Integrity/repair history stores safe counts/codes only; no raw documents,
  request/response payloads, headers, tokens, cursor, group metadata, or URLs.
- A backend `missing` sync document can be repaired by requeueing local data.
- A backend `deleted` tombstone is reported separately and must not be
  resurrected automatically.
- Foreground auto-sync can be enabled/disabled from Sync Center.
- Foreground auto-sync must not run on Sync Center render.
- Foreground auto-sync must not run in local-only mode, logged-out mode, while
  conflicts exist, during cooldown/backoff, or while another sync is active.
- Foreground auto-sync may run only after the app is active and a safe trigger
  occurs, such as app returning to foreground or a local outbox change.
- Business writes should follow:
  local write -> pending `sync_outbox` event -> `local_change` notification ->
  debounce -> guarded auto-sync -> synced local document.
- Login/register success should follow:
  auth session persisted -> active shared workspace checked -> pending outbox
  and ungrouped local documents inspected -> `login_success` notification ->
  debounce -> guarded full sync. This path must not run from workspace
  selection, invitation link open, or invitation accept.
- If no shared workspace is selected after login, bootstrap records/skips with
  `no_shared_workspace_after_login` and must not upload local data to a random
  workspace.
- Automatic sync attempts/skips write safe `sync_history` metadata with
  `triggerSource: "system_future"`.
- Sync Center shows friendly connectivity state for online/offline,
  backend-unreachable, missing sync URL, and invalid sync URL.
- Timeout/failure messages must say “No se pudo respaldar” or “La
  sincronización tardó demasiado. Intenta de nuevo.” without fetch internals,
  stack traces, request bodies, response bodies, headers, tokens, URLs, cursor,
  groupId, or serverVersion.

### Foreground Auto-Sync

- Open the app in local-only mode and confirm no push/pull/full sync runs.
- Login, select a shared workspace, enable automatic sync, and create a local
  change; confirm sync is debounced rather than immediate.
- Create local recipe, inventory, or transaction data while logged out; log in
  with a shared workspace already selected and confirm one guarded
  `login_success` full sync uploads local pending outbox and pulls remote
  server changes.
- Log in without a shared workspace selected and confirm the bootstrap skips
  with `no_shared_workspace_after_login` without deleting or uploading local
  data.
- Keep a conflict present during login and confirm bootstrap skips with
  `conflicts_pending` without resolving it.
- Create a recipe, inventory item, transaction, or stock movement and confirm
  one pending outbox event schedules one debounced automatic attempt.
- Read `getAutoSyncDiagnostics()` and confirm it exposes only safe fields such
  as `lastNotifyReason`, `lastNotifyAt`, `lastScheduledAt`,
  `lastRunStartedAt`, `lastRunFinishedAt`, `lastSkippedReason`,
  `pendingOutboxCount`, `autoSyncEnabled`, `hasSharedWorkspace`,
  `hasAuthSession`, `hasConflicts`, and `networkState`.
- Read `getAutoSyncDecisionTrace()` and confirm it shows the decision chain:
  notifier queued/flushed, service initialized, last notify reason, debounce
  scheduled/fired, guard evaluated, skipped/run decision, run status, pending
  outbox count, auth/workspace/conflict/network state, cooldown, backoff, and
  in-flight state. It must not expose tokens, headers, raw payloads, group
  values, stack traces, URLs, invite tokens, password hashes, or refresh token
  hashes.
- Common automatic skip reasons include `auto_sync_disabled`, `no_auth`,
  `no_shared_workspace`, `missing_groupId`, `conflicts_pending`,
  `backend_unreachable`, `sync_base_url_missing`, `sync_base_url_invalid`,
  `app_inactive`, `cooldown_active`, `backoff_active`, and `sync_in_flight`.
- Turn off network/backend access and confirm automatic sync is skipped with a
  safe offline or server-unavailable status.
- Simulate a hanging/slow backend and confirm automatic sync fails with
  `sync_timeout`, clears in-flight/syncing state, records safe failed history,
  and enters backoff instead of running forever.
- Restore network/backend access and confirm a foreground connectivity-restored
  trigger may schedule one guarded automatic attempt.
- After the backoff window, confirm a guarded retry can run when all normal
  eligibility checks still pass.
- Background the app before the debounce expires; confirm no automatic sync
  runs while inactive.
- Return to foreground; confirm one guarded automatic attempt may run.
- Create/keep a conflict and confirm automatic sync is skipped, not resolved.
- Disable automatic sync in Sync Center and confirm later local changes do not
  run sync automatically.
- Confirm invitation link open/accept still does not trigger sync.
- Confirm no WebSocket/realtime/background task is active.

### Backup Status Indicators

- Transacciones, Recetas, and Inventario show a compact backup indicator below
  the header.
- Local-only mode shows “Guardado en este dispositivo” and does not look like
  an error.
- Logged-out shared mode shows “Cuenta requerida para respaldo”.
- Fully backed-up shared mode shows “Todo respaldado” and a friendly relative
  time when available.
- Pending local changes show “Cambios pendientes”.
- If auto-sync is scheduled, pending local changes say “Se respaldarán en unos
  segundos.”
- If auto-sync is disabled, pending local changes say “La sincronización
  automática está desactivada.”
- If auto-sync is blocked by login/workspace/conflicts/backoff/failure, the
  indicator shows a specific friendly reason instead of the generic automatic
  backup message.
- Active guarded sync shows “Sincronizando...”.
- Offline/unavailable state shows “Sin conexión” or a safe failure message.
- Missing/invalid sync URL shows “Respaldo no configurado” without showing the
  raw URL.
- Sync timeout shows “No se pudo respaldar” with “La sincronización tardó
  demasiado. Intenta de nuevo.”
- Auto-sync backoff shows “No se pudo respaldar” with “Se intentará de nuevo
  más tarde.”
- Conflicts show “Cambios por revisar” and can navigate to the existing review
  screen; they are never auto-resolved.
- Main screens and indicators do not show push, pull, cursor, groupId,
  serverVersion, raw JSON, raw tokens, or hashes.
- Opening main screens reads status only; it must not run push/pull/full sync or
  force login.

### Sync History

- Sync History is reachable from Sync Center only; it is not a bottom tab.
- Sync History stores safe local metadata only: action, trigger, status, counts,
  safe error code/message, timestamps, auth/network state, and workspace label.
- Sync History never stores tokens, headers, request/response bodies, cookies,
  stack traces, raw backend payloads, invitation tokens, or password/hash fields.
- Retention keeps the latest 100 records during writes; no timer/background
  cleanup exists.
- Clearing old sync history affects only `sync_history`, never business data.
- Stale `started` sync history rows older than the recovery threshold can be
  marked `failed` with `errorCode: "sync_timeout"` and safe message “La
  sincronizacion tardo demasiado.”
- Stale history recovery affects only `sync_history`; it never deletes local
  SQLite business data, outbox records, or remote documents.

### Dev Reset And Sync Sanity

- Dev reset never runs automatically.
- `previewDevDataReset()` is dry-run only.
- `runDevDataReset()` requires `confirm: true`.
- `full_local_dev_reset` requires explicit scope and `confirm: true`.
- Default reset scope is `test_data_only`.
- `test_data_only` deletes only known dev/test prefixes:
  `smoke_test`, `rollback_smoke_test`, `recipe_sale_smoke`, `phase_`,
  `dev_check`, `auth_workspace_dev`, and `conflict_dev`.
- `stale_sync_only` recovers stale sync state/history without deleting business
  documents or outbox records.
- `conflicts_only` cleans only dev/test conflicts; real conflicts remain for
  user review and are not auto-resolved.
- `runSyncSanityCheck()` requires an authenticated session and active shared
  workspace.
- Sync sanity check creates a dev-prefixed local record, verifies outbox, runs
  sync, and verifies local synced state plus sync history.
- `runBusinessSyncSanityCheck()` requires an authenticated session and active
  shared workspace.
- Business sync sanity creates one dev recipe, one dev inventory item, and one
  dev transaction, verifies groupId/outbox, runs sync, then calls
  `/sync/verify-documents` to confirm MongoDB sync storage reports `ok` for all
  three records.
- `runBusinessWriteAutoSyncCheck()` / `runAutoSyncBusinessWriteCheck()`
  requires an authenticated session and active shared workspace. It enables
  auto-sync, creates one dev recipe, one dev inventory item, and one dev
  transaction, verifies pending outbox, verifies notification/schedule
  diagnostics, waits for the guarded debounce run, verifies outbox done,
  verifies local synced state, and optionally verifies MongoDB through
  `/sync/verify-documents`.
- Auto-sync business write check failure reasons include `no_outbox`,
  `no_autoSync_notification`, `no_autoSync_schedule`, `skipped_by_guard`,
  `runSync_failed`, `outbox_not_done`, `local_doc_not_synced`, and
  `backend_verify_missing`.
- `runPostLoginSyncBootstrapCheck()` requires an authenticated session and
  active shared workspace. It creates one dev recipe, runs the post-login
  bootstrap, verifies pending outbox was detected, verifies a guarded
  `login_success` sync was scheduled/started, and reports safe failure reasons:
  `no_auth`, `no_shared_workspace`, `no_groupId`, `no_pending_outbox`,
  `auto_sync_disabled`, `conflicts_pending`, `backend_unreachable`, or
  `sync_timeout`.
- `runAutoSyncDecisionTraceCheck()` requires an authenticated session and
  active shared workspace. It creates a dev local change, verifies pending
  outbox, checks that `local_change` was recorded, verifies debounce
  scheduled/fired, confirms guard evaluation, and reports either the run status
  or a stable skip reason such as `skipped_auto_sync_disabled`,
  `skipped_no_auth`, `skipped_no_shared_workspace`,
  `skipped_conflicts_pending`, or `skipped_backend_unreachable`.
- Manual sync and automatic sync share the same `runSync({ groupId })` engine,
  but manual Sync Center actions run only when pressed and do not depend on the
  auto-sync notifier/debounce decision trace.
- Backend cleanup is manual and development-only; the mobile app must not add a
  backend destructive reset API.

### Sync Integrity And Reconciliation

- Login and select a shared workspace.
- Create a recipe, inventory item, and transaction.
- Run manual sync.
- Verify MongoDB `syncdocuments` has records for `recipes`, `inventory`, and
  `transactions`.
- In dev only, manually delete one backend sync document.
- Run Sync Center advanced "Revisar respaldo"; confirm a missing backend issue
  is detected.
- Run "Reparar respaldo" and confirm the repair result requeued work.
- Run manual sync again or allow guarded foreground auto-sync.
- Verify MongoDB has the missing document again.
- Confirm no local SQLite business data was deleted.
- Confirm proper backend tombstones return `deleted` and are not auto-repaired.
- Confirm sync history contains safe `integrity_check`, `repair_preview`, or
  `repair_run` metadata only.

### Conflicts

- Conflicts are listed safely.
- Prefer remote is disabled when remote document is missing.
- Prefer local leaves local changes pending when applicable.
- No auto-resolve occurs.
- Normal conflict UI uses Cambios por revisar, Tu version, and Version
  compartida.
- Raw JSON and technical IDs are not shown by default.

### Security/Logs

- No raw JWT/access/refresh/invite tokens in UI.
- No inviteTokenHash/refreshTokenHash/passwordHash in API/UI/logs.
- devInviteLink appears only when `EXPOSE_DEV_INVITE_LINKS=true`.
- Legacy sockets are disabled by default.
- Network diagnostics expose safe booleans/counts/state/host only, never raw
  URLs, tokens, headers, cookies, or backend payloads.

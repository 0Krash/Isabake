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
- Foreground auto-sync can be enabled/disabled from Sync Center.
- Foreground auto-sync must not run on Sync Center render.
- Foreground auto-sync must not run in local-only mode, logged-out mode, while
  conflicts exist, during cooldown/backoff, or while another sync is active.
- Foreground auto-sync may run only after the app is active and a safe trigger
  occurs, such as app returning to foreground or a local outbox change.
- Automatic sync attempts/skips write safe `sync_history` metadata with
  `triggerSource: "system_future"`.
- Sync Center shows friendly connectivity state for online/offline,
  backend-unreachable, missing sync URL, and invalid sync URL.

### Foreground Auto-Sync

- Open the app in local-only mode and confirm no push/pull/full sync runs.
- Login, select a shared workspace, enable automatic sync, and create a local
  change; confirm sync is debounced rather than immediate.
- Turn off network/backend access and confirm automatic sync is skipped with a
  safe offline or server-unavailable status.
- Restore network/backend access and confirm a foreground connectivity-restored
  trigger may schedule one guarded automatic attempt.
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

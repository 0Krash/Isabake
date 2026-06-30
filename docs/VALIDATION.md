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

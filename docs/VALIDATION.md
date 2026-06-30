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

### Auth/Logout

- Login/register works.
- Tokens persist in SecureStore.
- Logout clears auth session only.
- Logout does not delete SQLite/local data.

### Workspace

- Local workspace remains available.
- Shared workspace can be selected without auto-sync.
- Disconnect/leave does not delete local data.
- Workspace list has no duplicate keys.

### Invitations

- Owner/admin can invite.
- Member/viewer cannot invite.
- Invite role cannot be owner.
- Accept activates membership only.
- Accept does not push/pull/full sync.

### Invitation Links

- `isabake://invite/<token>` opens invitation screen.
- `https://.../invite/<token>` parses safely.
- Invalid links do not crash.
- Opening link does not force login or sync.

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

### Conflicts

- Conflicts are listed safely.
- Prefer remote is disabled when remote document is missing.
- Prefer local leaves local changes pending when applicable.
- No auto-resolve occurs.

### Security/Logs

- No raw JWT/access/refresh/invite tokens in UI.
- No inviteTokenHash/refreshTokenHash/passwordHash in API/UI/logs.
- devInviteLink appears only when `EXPOSE_DEV_INVITE_LINKS=true`.
- Legacy sockets are disabled by default.

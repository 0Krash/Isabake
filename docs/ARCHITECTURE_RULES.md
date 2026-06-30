# Architecture Rules

## Startup

- No forced login.
- No auto sync.
- No dev checks.
- No WebSocket.
- No background sync.
- `App.js` must remain startup-clean.

## Local-First

- Mobile SQLite is source of truth.
- Backend must not be required for local usage.
- Local-only mode must always remain available.

## Data Safety

- Logout does not delete SQLite/local data.
- Disconnect/leave workspace does not delete local data.
- Remove/leave marks removed; no hard delete.
- Do not hard-delete synced/shared data without explicit review.

## Sync

- Sync Center actions are manual only.
- Push/pull/full sync use active shared workspace groupId only.
- No sync after login, workspace selection, invitation accept, app startup, conflict resolution, or invite-link open.
- Sync remains push/pull; no background scheduler.

## Auth

- Do not expose raw tokens/hashes.
- SecureStore for mobile tokens.
- Backend stores refreshTokenHash only.
- Backend stores inviteTokenHash only.
- Password hashes never leave backend internals.

## Dev Auth

- Dev auth must remain limited to dev/test or explicit `ENABLE_DEV_AUTH=true`.
- Dev auth must not be required for production flows.

## Workspaces

- Shared data belongs to the active workspace/group.
- Selecting a workspace must not trigger sync.
- Local-only workspace must remain visible/usable.

## Membership

- Owner/admin can administer members.
- Member/viewer cannot administer members.
- Last active owner cannot be removed or demoted.
- Leave/remove marks membership removed, not hard deleted.

## Invitations

- devInviteLink default-deny.
- Only expose dev invite links with `EXPOSE_DEV_INVITE_LINKS=true`.
- Normal UI must not show raw invite links.
- Accepting invitation activates membership but does not sync.
- Opening invitation links must not sync.
- Authenticated accept/decline must match invited email.

## Conflicts

- Do not auto-resolve.
- Prefer remote only when a remote document is resolvable.
- Prefer local preserves local data and pending sync work where applicable.
- UI must show safe state when remote/local data is missing.

## Legacy Sockets

- Backend socket disabled unless `ENABLE_LEGACY_SOCKET_IO=true`.
- Mobile socket disabled unless `EXPO_PUBLIC_ENABLE_LEGACY_SOCKET_IO=true`.
- No socket connection at module import time.
- Do not add WebSockets/realtime unless a future phase explicitly requests it.

## UI Security

- Do not show raw JWTs, access tokens, refresh tokens, invite tokens, inviteTokenHash, refreshTokenHash, or passwordHash.
- Do not log tokens or hashes.
- Normal production UI must not expose dev invite links.

## App.js Restrictions

- No forced login.
- No auto sync.
- No dev checks.
- No sync internals called from startup.
- Invite-link routing may navigate to the invitation screen, but must not sync or force login.

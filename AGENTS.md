# Codex Agent Instructions

## Project Summary

Isabake is a local-first/offline-first Expo React Native app with a Node/Express/Mongoose backend.

- Mobile app path: `UI`
- Backend path: `root/src/Servers/TransBalance`
- Mobile SQLite is the source of truth for app data.
- Backend is for auth, sync, workspaces, membership, invitations, and collaboration.
- Local-only mode must always work without login/backend.

## Startup Safety

- Do not force login on app startup.
- Do not auto-sync on app startup.
- Do not run dev checks from startup.
- App.js must remain startup-clean.

## Local-First Behavior

- Mobile SQLite is the app data source of truth.
- Do not delete SQLite/local data on logout.
- Do not delete local data when disconnecting or leaving a workspace.
- Do not hard-delete synced/shared data unless explicitly reviewed.
- Local-only mode must work without login or backend.

## Auth Rules

- SecureStore is used for mobile tokens.
- Backend stores refresh token hashes, not raw refresh tokens.
- Do not expose raw JWTs, access tokens, refresh tokens, invite tokens, inviteTokenHash, refreshTokenHash, or passwordHash in UI/API/logs.

## Sync Rules

- Sync Center actions must remain manual.
- Do not sync on every local write.
- Do not auto-sync after login, app startup, workspace selection, invitation accept, or invite-link open.
- Accepting an invitation must not run push/pull/full sync.
- Opening an invite link must not run push/pull/full sync.
- Selecting a workspace must not run push/pull/full sync.

## Workspace/Membership Rules

- Owner/admin can manage members and invitations.
- Member/viewer cannot manage members or invitations.
- Do not remove or demote the last active owner.
- Remove/leave should mark membership as removed, not hard delete.

## Invitation Rules

- devInviteLink must be default-deny.
- devInviteLink is only allowed when `EXPOSE_DEV_INVITE_LINKS=true`.
- Normal UI must not show raw invite links.
- inviteTokenHash must never be returned.
- Accepting an invitation activates membership but does not sync.

## Conflict Rules

- Do not auto-resolve conflicts.
- Prefer remote only when a remote conflict document is available.
- Prefer local should preserve local changes and leave pending/outbox work when needed.

## Legacy Socket Rules

- Do not add WebSockets/realtime unless explicitly requested by a future phase.
- Do not add background/interval sync unless explicitly requested.
- Legacy backend socket.io must be disabled unless `ENABLE_LEGACY_SOCKET_IO=true`.
- Legacy mobile socket client must not connect on import and must require `EXPO_PUBLIC_ENABLE_LEGACY_SOCKET_IO=true`.

## Política obligatoria de iconografía

- SVGRepo is the default source for custom icons.
- If the user provides a SVGRepo link, use exactly that resource.
- If the user does not provide a SVGRepo link, Codex must search for and select a semantically representative icon from SVGRepo.
- Icons must be downloaded and stored locally in the repository.
- The app must not load icons from the internet at runtime.
- Do not build icons with components, text, borders, CSS, Unicode, emojis, typographic characters, or geometric figures.
- Do not manually invent an SVG `path`, `polygon`, `circle`, `rect`, or other geometry to approximate an icon.
- Do not silently replace a requested icon with a different one.
- If internet access is unavailable or the resource cannot be downloaded, report the blocker and do not improvise an alternative.
- Icons used on the same screen must keep a consistent visual style.
- Check each resource license before adding it.
- Do not use resources with licenses incompatible with this project.
- If a license requires attribution, preserve the required attribution data.

## Required Response Format After Every Phase

1. Files modified.
2. What changed.
3. Tests added/updated.
4. Tests run and exact results.
5. Static checks.
6. Manual validation steps.
7. Remaining risks.
8. Recommended next step.

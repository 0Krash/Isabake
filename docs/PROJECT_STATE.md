# Project State

## Completed Phase Summary

- SQLite local-first foundation
- Repository layer
- Stores/recipes/inventory/transactions local-first
- Stock movement and recipe sale atomic local flow
- Local-only readiness
- Multi-device sync architecture
- Backend sync server
- Mobile sync client
- Auth + workspace membership
- Conflict handling
- Conflict resolution service/dev flow
- Production conflict resolution UI
- Real JWT auth
- SecureStore token storage
- Server-side refresh sessions/revocation
- Workspace/membership UI
- Production Sync Center manual sync
- Workspace dedupe/runtime cleanup
- Workspace invitations
- Invitation token/link foundation
- Invitation deep-link navigation and safe link management
- Production invitation email delivery foundation
- Production universal/app links setup
- Invitation/workspace/account UX polish
- Primary navigation recentered on Transacciones, Recetas, Inventario
- Runtime UX cleanup for secondary tools:
  - secondary app options moved into a modal sheet
  - shared secondary-screen layout/padding primitives added
  - Sync Center advanced push/pull actions collapsed behind manual options
  - technical workspace/conflict identifiers hidden from normal UI copy
- Internal sync history/audit foundation:
  - local-only `sync_history` table
  - manual sync/status attempts recorded as safe metadata
  - retention keeps latest 100 records
  - minimal secondary Sync History diagnostic screen
- Safe foreground auto-sync foundation:
  - runs only while the app process is active
  - requires auto-sync enabled, authenticated session, and active shared
    workspace `groupId`
  - skips local-only, logged-out, conflicted, inactive, cooldown, and backoff
    states
  - records safe sync history metadata for automatic runs and skips
  - can be enabled/disabled from Sync Center
- User-facing backup status indicators:
  - Transacciones, Recetas, Inventario, and Sync Center show friendly backup
    state instead of technical sync details
  - local-only, pending, syncing, backed-up, offline, login-required, failed,
    and conflict states map to short Spanish labels
  - conflict indicator links to the existing review screen without resolving
    anything automatically
- Auto-sync pending-state diagnostics:
  - scheduled, syncing, skipped, cooldown, backoff, and failed states are
    exposed as safe local metadata
  - pending backup copy explains whether changes are scheduled, blocked, paused,
    disabled, or waiting for login/workspace/conflict review
  - dev diagnostics expose safe summary counts and booleans only, never tokens
    or raw payloads
- Network/offline-aware sync resilience:
  - local network state tracks unknown, online/offline, backend reachable,
    backend unreachable, and missing/invalid sync URL states
  - backend reachability checks use the configured sync API base URL without
    auth headers, tokens, or raw URL display
  - foreground auto-sync skips safely while offline, backend-unreachable, or
    misconfigured and may retry only after connectivity is restored
  - backup indicators and Sync Center show friendly Spanish connectivity copy
    instead of technical network errors
- Security cleanup:
  - devInviteLink default-deny
  - legacy socket.io disabled by default
  - mobile socket client inert by default
  - InvitationAcceptScreen does not rethrow handled UI errors

## Current Next Phase

- Phase 33: hardening/QA/release prep

## Important Backend Paths

- `root/src/Servers/TransBalance/app.js`
- `root/src/Servers/TransBalance/server.js`
- `root/src/Servers/TransBalance/middleware/auth.js`
- `root/src/Servers/TransBalance/services/workspaceService.js`
- `root/src/Servers/TransBalance/services/workspaceRepository.js`
- `root/src/Servers/TransBalance/services/invitationEmailService.js`
- `root/src/Servers/TransBalance/services/legacySocketConfig.js`
- `root/src/Servers/TransBalance/routes/workspaceRoutes.js`
- `root/src/Servers/TransBalance/controllers/workspaceController.js`
- `root/src/Servers/TransBalance/models/workspaceInvitationModel.js`

## Important UI Paths

- `UI/App.js`
- `UI/app.json`
- `UI/data/workspace/*`
- `UI/hooks/workspace/useWorkspaces.js`
- `UI/screens/Workspace/*`
- `UI/screens/Sync/*`
- `UI/data/auth/*`
- `UI/data/network/*`
- `UI/data/sync/*`
- `UI/screens/Sync/SyncHistoryScreen.js`

## Known Pending Items

- Backend full suite must be run outside sandbox if Supertest fails with `listen EPERM`.
- Production app links require real domain, certs, Android SHA-256 signing
  fingerprint, Apple Team ID, and final iOS bundle identifier.
- OS-level background sync intentionally pending.
- WebSockets/realtime intentionally pending.
- Foreground-only auto-sync exists; it must not run while the app is closed,
  in local-only mode, without auth, with conflicts, or from invitation link
  open/accept flows.
- Network monitoring is foreground/process-local only; no OS background task,
  realtime socket, or aggressive polling exists.

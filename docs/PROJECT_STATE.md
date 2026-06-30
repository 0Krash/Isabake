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
- Security cleanup:
  - devInviteLink default-deny
  - legacy socket.io disabled by default
  - mobile socket client inert by default
  - InvitationAcceptScreen does not rethrow handled UI errors

## Current Next Phase

- Phase 28: invitation/workspace/account UX polish

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
- `UI/data/sync/*`

## Known Pending Items

- Backend full suite must be run outside sandbox if Supertest fails with `listen EPERM`.
- Production app links require real domain, certs, Android SHA-256 signing
  fingerprint, Apple Team ID, and final iOS bundle identifier.
- Background sync intentionally pending.
- WebSockets intentionally pending.

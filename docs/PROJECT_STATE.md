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
- Sync timeout and stuck-state recovery:
  - sync requests time out safely after 25 seconds by default
  - manual sync buttons recover from timeout/failure and can be retried
  - foreground auto-sync clears in-flight state in `finally` and enters
    failed/backoff state after timeout or network failure
  - stale `sync_history` rows left in `started` are recoverable as failed
    `sync_timeout` records without touching business data or outbox documents
  - backup status uses friendly timeout/backoff messages without raw request,
    response, header, token, URL, stack, cursor, or group metadata
- Dev-only reset and sync sanity tools:
  - local dev reset supports dry-run and confirm-only scoped cleanup for
    test data, stale sync state, dev conflicts, failed dev outbox, and full
    local dev reset
  - cleanup is never automatic and is blocked outside dev builds
  - sync sanity check creates a dev-prefixed local recipe, verifies outbox,
    runs sync manually, and verifies local synced state plus sync history
- Sync integrity and backend reconciliation:
  - mobile can inspect shared local recipes, inventory, and transactions for
    missing groupId, missing outbox, stale/failed outbox, missing remoteId, and
    backend-missing synced records
  - backend exposes authenticated `POST /sync/verify-documents` to report only
    safe existence/version status: `ok`, `missing`, `deleted`, `stale`, or
    `unknown`
  - repair is manual/confirm-only, records safe sync history, requeues
    repairable outbox work, and never deletes local business data
  - business sync sanity can create one dev recipe, inventory item, and
    transaction, run sync, and verify MongoDB sync storage through the verify
    endpoint
- Foreground business-write auto-sync fix:
  - successful `sync_outbox` inserts now notify foreground auto-sync centrally
    with safe `local_change` metadata
  - local-change auto-sync is debounced, guarded by active app/auth/shared
    workspace/auto-sync/conflict/network checks, and never runs from
    `skipOutbox` or local metadata writes
  - dev diagnostics can create one recipe, one inventory item, and one
    transaction, verify pending outbox for each, then verify the guarded
    notification/schedule/full-sync path and backend storage when available
  - diagnostics expose safe notification, schedule, run, skip, pending outbox,
    auth/workspace/conflict, and network state fields without tokens, headers,
    hashes, or raw payloads
  - manual sync behavior is unchanged; no background sync, WebSockets, startup
    sync, invitation sync, or conflict auto-resolution was added
- Foreground auto-sync decision trace:
  - notifier queue/flush, notification reason, debounce schedule/fire, guard
    evaluation, skip/run decision, run status, pending outbox count,
    auth/workspace/conflict/network state, cooldown, backoff, and in-flight
    state are exposed as safe metadata
  - `getAutoSyncDecisionTrace()` and `runAutoSyncDecisionTraceCheck()` help
    identify exactly where automatic sync stopped without exposing tokens,
    headers, raw documents, backend payloads, hashes, stack traces, or URLs
  - manual Sync Center actions still bypass the auto-sync debounce/guard trace
    and run only when pressed
- Post-login sync bootstrap:
  - successful login/register persists the auth session, then requests a
    guarded foreground `login_success` sync bootstrap
  - bootstrap requires an authenticated session and active shared workspace
    `groupId`; local-only/no-workspace states skip with
    `no_shared_workspace_after_login`
  - pending recipe, inventory, and transaction outbox is considered syncable;
    ungrouped shared documents are assigned to the selected shared workspace
    through the existing helper before scheduling sync
  - the scheduled path uses existing full `runSync({ groupId })` semantics, so
    push and pull both run and existing conflict handling remains in charge
  - invitation link open/accept and workspace selection still do not trigger
    sync; no background sync, WebSockets, local-data deletion, token exposure,
    or conflict auto-resolution was added
- Security cleanup:
  - devInviteLink default-deny
  - legacy socket.io disabled by default
  - mobile socket client inert by default
  - InvitationAcceptScreen does not rethrow handled UI errors

## Current Next Phase

- Phase 35: pending definition

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
- Do not manually delete MongoDB sync documents outside dev/test. If a dev
  backend record is missing but the local document is valid, use Sync Center
  advanced "Revisar respaldo" then "Reparar respaldo"; proper deleted
  tombstones are not resurrected automatically.

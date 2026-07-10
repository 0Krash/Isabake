# Phases

## Phase Policy

- Implement one phase only.
- Do not advance automatically.
- Use mini cleanup phases for blockers.
- Each phase returns files modified, tests, static checks, manual validation, risks, and next step.

## Current Next Phase

- Phase 36: QA hardening and release readiness validation.

## Latest Cleanup

- Phase 28.2: runtime UX cleanup for secondary navigation, shared secondary
  screen layout, Sync Center action hierarchy, and technical-id hiding.
- Phase 29: local-only sync history/audit foundation and minimal secondary
  diagnostic UI. No auto-sync.
- Phase 30: safe foreground auto-sync foundation with explicit Sync Center
  setting, eligibility guards, debounce/cooldown/backoff, and sync history
  records for automatic runs/skips. No OS background sync or realtime.
- Phase 31: simple user-facing backup status indicators on main business
  screens and Sync Center. Technical sync state is mapped to friendly Spanish
  labels; no new primary tab, no background sync, no realtime.
- Phase 31.1: auto-sync pending-state diagnostics and clearer backup copy for
  scheduled, syncing, skipped, disabled, cooldown/backoff, failed, auth,
  workspace, and conflict states.
- Phase 32: network/offline-aware sync resilience. Foreground auto-sync skips
  safely for offline, backend-unreachable, missing sync URL, and invalid sync
  URL states; Sync Center and backup indicators show friendly connectivity
  status. No background sync, realtime, or forced login.
- Phase 33: sync timeout/retry/backoff hardening and stuck-state recovery.
  Sync client requests fail safely with `sync_timeout`, manual sync recovers
  loading state and remains retryable, auto-sync clears in-flight state and
  records safe failed/backoff state, and stale started sync history can be
  marked failed without touching business data.
- Phase 33.1: dev-only data reset and sync sanity-check flow. Scoped local
  cleanup supports dry-run and explicit confirmation; sync sanity creates a
  dev-prefixed local record, verifies outbox, runs sync, and verifies local
  synced state plus history. No backend destructive API.
- Phase 34: sync data integrity, outbox recovery, and backend reconciliation.
  Mobile can inspect local shared recipes, inventory, and transactions for
  missing groupId/outbox/backend copies, manually requeue repairable records,
  and verify backend sync storage through authenticated
  `POST /sync/verify-documents`. Repair is confirm-only, records safe
  `sync_history`, never deletes local business data, and does not resurrect
  proper deleted tombstones automatically.
- Phase 34.2: foreground business-write auto-sync trigger fix. Local recipe,
  inventory, transaction, and stock movement writes continue to create
  `sync_outbox` events through repository/document-store helpers; successful
  pending outbox inserts notify auto-sync centrally with `local_change`,
  debounce before running, and then execute only if the normal auth/shared
  workspace/auto-sync/conflict/network guards pass. Manual sync semantics are
  unchanged. No startup sync, background sync, WebSockets, invitation-triggered
  sync, local-data deletion, or conflict auto-resolution.
- Phase 34.3: business-write auto-sync diagnostic hardening. The guarded dev
  check now exercises recipe, inventory, and transaction writes together,
  verifies pending outbox and safe notification/schedule diagnostics, and keeps
  backend verification on the existing `/sync/verify-documents` path. Runtime
  behavior still uses the central `sync_outbox` notification path.
- Phase 34.4: auto-sync decision trace. Foreground auto-sync now records safe
  notifier queue/flush, debounce schedule/fire, guard evaluation, skip/run
  decision, run status, and guard context metadata so automatic sync stops can
  be diagnosed without tokens, raw payloads, background sync, or WebSockets.
- Phase 35: post-login sync bootstrap. Login/register success now requests a
  foreground-only guarded `login_success` bootstrap after auth session
  persistence. The bootstrap requires active auth plus a selected shared
  workspace `groupId`, assigns ungrouped local shared data through the existing
  helper when safe, detects pending recipe/inventory/transaction outbox, and
  schedules the existing full sync path so push and pull both run. Local-only or
  missing workspace skips with `no_shared_workspace_after_login`; conflicts
  skip with `conflicts_pending`. Invitation link open/accept and workspace
  selection still do not trigger sync. No background sync or WebSockets.
- Phase 36: current QA/release-readiness phase. Stabilize the existing app by
  validating startup safety, iOS modal navigation, manual sync to MongoDB,
  guarded foreground auto-sync, backup indicators, sync history, local-only
  behavior, release hygiene, and diagnostics exports. This phase must not add
  features, redesign UI, change sync architecture, add WebSockets/background
  sync, force login, delete local data, expose tokens/hashes, or auto-resolve
  conflicts.

## Likely Future Phases

- WebSockets only later and only as “changes available” notification; actual sync remains push/pull.

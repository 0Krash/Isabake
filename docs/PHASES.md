# Phases

## Phase Policy

- Implement one phase only.
- Do not advance automatically.
- Use mini cleanup phases for blockers.
- Each phase returns files modified, tests, static checks, manual validation, risks, and next step.

## Current Next Phase

- Phase 33: hardening/QA/release prep.

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

## Likely Future Phases

- Phase 33: hardening/QA/release prep.
- WebSockets only later and only as “changes available” notification; actual sync remains push/pull.

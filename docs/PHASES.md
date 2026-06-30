# Phases

## Phase Policy

- Implement one phase only.
- Do not advance automatically.
- Use mini cleanup phases for blockers.
- Each phase returns files modified, tests, static checks, manual validation, risks, and next step.

## Current Next Phase

- Phase 31: hardening/QA/release prep.

## Latest Cleanup

- Phase 28.2: runtime UX cleanup for secondary navigation, shared secondary
  screen layout, Sync Center action hierarchy, and technical-id hiding.
- Phase 29: local-only sync history/audit foundation and minimal secondary
  diagnostic UI. No auto-sync.
- Phase 30: safe foreground auto-sync foundation with explicit Sync Center
  setting, eligibility guards, debounce/cooldown/backoff, and sync history
  records for automatic runs/skips. No OS background sync or realtime.

## Likely Future Phases

- Phase 31: hardening/QA/release prep.
- WebSockets only later and only as “changes available” notification; actual sync remains push/pull.

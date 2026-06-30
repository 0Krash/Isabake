# Codex Prompt Templates

## 1. Standard Phase Prompt

```text
Implement Phase <N> only.

Before changing code, read:
- AGENTS.md
- docs/PROJECT_STATE.md
- docs/ARCHITECTURE_RULES.md
- docs/VALIDATION.md
- docs/PHASES.md

Do not advance to the next phase.
Do not force login.
Do not change foreground auto-sync behavior unless this phase explicitly asks for it.
Do not add WebSockets/background sync unless this phase explicitly asks for it.
App.js must remain startup-clean.
Run validation from docs/VALIDATION.md.
Return the required phase report format.
```

## 2. Standard Review Prompt

```text
Review the current Isabake project state as a senior code reviewer.

Read:
- AGENTS.md
- docs/PROJECT_STATE.md
- docs/ARCHITECTURE_RULES.md
- docs/VALIDATION.md
- docs/PHASES.md

Do not modify files.
Check startup safety, local-first behavior, auth/security, sync behavior, workspaces, invitations, conflicts, legacy sockets, and tests.
Run validation where possible.
Return findings by severity with file/line references and recommended cleanup phase if needed.
```

## 3. Standard Cleanup Prompt

```text
Implement cleanup Phase <N.x> only.

Scope:
- Fix only the listed blockers.
- Do not add new product features.
- Do not change sync semantics.
- Do not force login.
- Do not delete local data.
- App.js must remain startup-clean.

Run validation from docs/VALIDATION.md.
Return files modified, fixes, tests, static checks, manual validation, remaining risks, and next step.
```

## 4. Current Phase 26 Short Prompt

```text
Implement Phase 26 only.

Before changing code, read:
- AGENTS.md
- docs/PROJECT_STATE.md
- docs/ARCHITECTURE_RULES.md
- docs/VALIDATION.md
- docs/PHASES.md

Task:
Implement production invitation email delivery foundation.

Use invitationEmailService.
Add swappable provider configuration.
Keep no-op/dev provider for local/test.
Do not expose raw invite links unless EXPOSE_DEV_INVITE_LINKS=true.
Do not expose inviteTokenHash.
Do not auto-sync.
Do not add WebSockets.
Do not add background sync.
App.js must remain startup-clean.
Run validation from docs/VALIDATION.md.
Stop after Phase 26.
```

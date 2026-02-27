# Story 1.8: Local Persistence and Rebuild After Reload

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want my planning state to persist across reloads and restarts,
so that the system feels stable and trustworthy.

## Acceptance Criteria

1. Given tasks and Today configuration exist locally, when the app reloads or restarts, then planning state is restored from local persistence.
2. Given local state is restored, when Today projection is rebuilt, then the rebuild is deterministic for identical persisted input.
3. Given reload/restart recovery runs, then no state inconsistency occurs (no partial/undefined UI state, no silent corruption spread).

## Tasks / Subtasks

- [x] Harden startup restore path for planning state (AC: 1, 2, 3)
  - [x] Review and stabilize app bootstrap sequence in `initializePlanningInboxApp` to guarantee local-first hydration before rendering.
  - [x] Ensure startup always reads from existing persistence sources (`inboxTaskStore` + `todayCapStore`) without server dependency.
  - [x] Ensure reload path reuses the same deterministic projection pipeline (`refreshInbox` -> `computeTodayProjection` -> `renderTodayProjection`).

- [x] Add deterministic rebuild guardrails (AC: 2, 3)
  - [x] Enforce deterministic ordering and projection behavior after reload for identical persisted task snapshots.
  - [x] Add explicit fallback behavior for malformed or incomplete persisted values (without mutating valid persisted state silently).
  - [x] Preserve domain invariants already implemented (cap safety, explicit mutation guardrails) during rebuild/read path.

- [x] Prevent inconsistent UI states during recovery (AC: 3)
  - [x] Ensure startup error states provide explicit local feedback and do not leave stale mixed Inbox/Today render.
  - [x] Keep planning runtime usable and local-first even if sync/network is unavailable.
  - [x] Confirm no hidden side effects on persisted task records during read/rebuild-only startup flow.

- [x] Add comprehensive tests for reload/restart behavior (AC: 1, 2, 3)
  - [x] Integration tests: simulate app initialization with pre-seeded local data and verify Today/Inbox projections on first render.
  - [x] Regression tests: repeated initialize/reload cycles produce identical projection outputs for identical data.
  - [x] Failure-path tests: corrupted/invalid persisted values trigger safe fallback and explicit feedback without partial inconsistent state.

## Dev Notes

### Developer Context Section

- Story 1.8 is the continuity hardening step for the planning runtime: users must trust that reloading the app never loses or distorts their local plan.
- Prior stories already established core primitives:
  - Story 1.1 local Inbox persistence and offline-first capture.
  - Story 1.2 deterministic Today projection contract.
  - Story 1.4 local cap persistence.
  - Story 1.3 and 1.5 invariant-safe mutation paths.
- This story focuses on startup/reload reconstruction quality, not on adding new planning features.

### Technical Requirements

- Reload/restart MUST reconstruct planning UI from local persistence only (no backend runtime dependency).
- Rebuild MUST use existing projection path and remain deterministic for identical persisted input.
- Startup read path MUST NOT perform hidden write mutations to "fix" data unless explicitly designed and tested.
- Fallback behavior for malformed local values MUST be explicit and non-destructive (clear defaults + user-visible feedback where relevant).
- Existing stable domain semantics (`TODAY_CAP_EXCEEDED`, `INVARIANT_VIOLATION`, and current mutation guardrails) MUST remain unchanged.

### Architecture Compliance

- Preserve local source-of-truth split: browser persistence remains runtime authority.
- Keep logic within planning boundaries (`resources/js/features/planning/**`), no UI-direct state mutation shortcuts.
- Maintain deterministic projection rebuild behavior and avoid network-coupled startup logic.
- Keep sync/network state informational and secondary relative to planning runtime.

### Library / Framework Requirements

- Frontend implementation MUST remain JavaScript ESM under current Vite setup.
- Reuse existing modules and contracts (`persistence`, `projections`, `app`, `invariants`, `commands`).
- Do not introduce TypeScript, framework rewrites, or new state-management libraries.
- Test environment baseline remains Vitest with `happy-dom`.

### File Structure Requirements

- Primary expected touchpoints:
  - `resources/js/features/planning/app/initializePlanningInboxApp.js`
  - `resources/js/features/planning/persistence/inboxTaskStore.js`
  - `resources/js/features/planning/persistence/todayCapStore.js`
  - `resources/js/features/planning/projections/computeTodayProjection.js`
  - `resources/js/features/planning/projections/renderTodayProjection.js`
  - `resources/js/features/planning/projections/renderInboxProjection.js`
  - `resources/js/features/planning/**/*.test.js`
- Any new helper must stay inside `resources/js/features/planning/**` and align with existing naming patterns.

### Testing Requirements

- Add/extend integration tests for initialization with persisted state, covering both Inbox and Today outputs.
- Verify deterministic rebuild across repeated initialize cycles using the same persisted fixtures.
- Add failure-path tests for invalid persisted cap/task shapes to ensure safe fallback + explicit feedback.
- Ensure existing mutation and projection regressions remain green.

### Previous Story Intelligence

- Story 1.5 introduced centralized mutation guardrail and bulk wiring into runtime; startup/rebuild must preserve those contracts and not bypass them.
- Story 1.4 centralized cap persistence in `todayCapStore`; rebuild must consistently consume this source.
- Story 1.2 locked deterministic Today projection behavior; this story validates that contract under reload conditions.
- Story 1.3 already defined over-cap guided behavior; reload must not create contradictory cap UI signals.

### Git Intelligence Summary

- Current implementation trend is incremental hardening of planning runtime within existing module boundaries.
- Recent work emphasized invariant safety, explicit error handling, and integration-style tests around `initializePlanningInboxApp`.
- Implication: implement reload hardening by extending current patterns and tests, avoiding broad refactors.

### Latest Technical Information

- Current frontend baseline: Vite + JavaScript ESM + Vitest/happy-dom.
- Local-first runtime and invariant write-path constraints remain the governing architecture for planning features.

### Project Structure Notes

- Planning runtime currently renders through `initializePlanningInboxApp` and projection renderers.
- Persistence contracts already exist for tasks and cap; this story should leverage these rather than introducing parallel stores.

### References

- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\epics.md#Story 1.8]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\prd.md#FR16]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\architecture.md#Local Source of Truth Contract]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\architecture.md#Implementation Patterns and Consistency Rules]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\ux-design-specification.md#Journey 1 - 2-Minute Planning Loop]
- [Source: C:\laragon\www\task-ino\_bmad-output\implementation-artifacts\1-2-deterministic-today-projection-from-local-state.md]
- [Source: C:\laragon\www\task-ino\_bmad-output\implementation-artifacts\1-4-configure-personal-today-cap.md]
- [Source: C:\laragon\www\task-ino\_bmad-output\implementation-artifacts\1-5-invariant-safe-single-and-bulk-mutations.md]

## Dev Agent Record

### Agent Model Used

gpt-5.3-codex

### Debug Log References

- `create-story` workflow synthesis for Story 1.8
- sprint status synchronization to `ready-for-dev`
- `npm run test:js -- resources/js/features/planning/app/initializePlanningInboxApp.test.js`
- `npm run test:js`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.8 context aligned with Stories 1.2/1.4/1.5 deterministic projection, persistence, and invariant contracts.
- Added explicit reload/restart rebuild guardrails and failure-path testing expectations.
- Hardened startup restore path in `initializePlanningInboxApp` by sanitizing malformed persisted task records before projection/render.
- Added explicit recovery feedback when malformed persisted tasks are skipped: `Some local tasks were skipped because their saved data is invalid.`
- Added startup failure recovery reset to clear stale Inbox/Today UI state before showing local-load error feedback.
- Added reload determinism and recovery-path integration tests in `initializePlanningInboxApp.test.js`.
- Full JS suite passed: 67/67 tests.

### File List

- _bmad-output/implementation-artifacts/1-8-local-persistence-and-rebuild-after-reload.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js
- resources/js/features/planning/projections/computeTodayProjection.js

### Change Log

- 2026-02-23: Created Story 1.8 with comprehensive local persistence and deterministic rebuild guidance; set status to ready-for-dev.
- 2026-02-23: Implemented Story 1.8 local persistence and rebuild hardening: startup sanitization for malformed persisted tasks, deterministic reload guardrails, stale UI reset on startup failure, and integration/regression/failure-path tests. Status set to review.
- 2026-02-23: Code review remediation: exported `isValidTaskRecord` from `computeTodayProjection.js` and replaced duplicate `isRenderableTask` in app layer (M3 DRY fix); extended `clearPlanningProjectionUi` to reset `todayCapValue`, `empty`, and `todayEmpty` (M2); added feedback clear in cap-change handler before refresh (M1); added tests for persisted `todayCap` restoration on reload (H1) and stale error feedback cleared on successful recovery (M1). Full suite: 69/69. Status set to done.

# Story S-001: Sync Runtime Isolation and Mode Toggle

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,  
I want planning runtime behavior to remain isolated from sync state and to toggle sync explicitly,  
so that planning stays reliable under network issues and sync remains fully optional.

## Scope Mapping (Epic 3)

- Maps to: Story 3.1 + Story 3.2
- Implements: FR21, FR27, FR22

## Acceptance Criteria

1. **Given** forced network failure simulation is active, **when** user performs core planning actions (capture, move, reschedule, closure decisions), **then** planning remains fully functional locally.
2. **And** sync state changes do not block or mutate core planning runtime behavior.
3. **Given** local planning runtime is active, **when** user toggles sync mode on or off, **then** sync mode changes are applied deterministically.
4. **And** disabling sync never disables core planning capabilities.

## Tasks / Subtasks

- [x] Add explicit sync mode state and transition command (AC: 3, 4)
  - [x] Define deterministic sync mode contract (`enabled` / `disabled`) in invariant layer.
  - [x] Route mode changes through `mutatePlanningState` with deterministic result payload.
  - [x] Ensure mode persistence is local-first and restart-safe.

- [x] Isolate planning runtime from sync pipeline side effects (AC: 1, 2, 4)
  - [x] Guarantee planning commands do not depend on sync readiness or network status.
  - [x] Prevent sync status mutations from altering planning decisions or projections.
  - [x] Keep startup and runtime usable when sync is unavailable.

- [x] Add UI control for sync on/off with non-blocking behavior (AC: 3, 4)
  - [x] Add deterministic toggle entrypoint and visible mode feedback.
  - [x] Ensure toggle failures do not degrade planning interactions.

- [x] Add tests for runtime isolation and mode transitions (AC: 1, 2, 3, 4)
  - [x] Unit tests for guardrail validation and mode transition determinism.
  - [x] Integration tests for planning actions under forced sync failure.
  - [x] Regression test: disabling sync preserves full planning loop.

## Data Model / State Touchpoints

- Sync mode flag in local persistence (`localStorage` or equivalent local settings store).
- Existing planning task model must remain unchanged by sync mode toggles.
- Existing deterministic projections (`Inbox`, `Today`) remain source-of-truth from local state.

## Error Handling Expectations

- Sync mode command returns deterministic domain errors (no raw exceptions to UI).
- Planning commands remain successful when sync is offline/disabled.
- UI feedback for sync mode errors is informational and non-blocking.

## Telemetry / Observability (if needed)

- Optional low-cardinality events:
  - `sync_mode_changed` with `{ from, to }`
  - `sync_runtime_isolation_preserved` (integration assertion marker in tests)

## Assumptions / Open Questions

- Assumption: "forced network failure simulation" is available via test harness/mocks, not a production-only control.
- Assumption: Sync toggle is per-device local setting unless later specified otherwise.
- Open question: whether enabling sync should trigger immediate background sync or wait for next scheduled cycle.

## Dev Agent Record

- **Completion Notes:** Implemented sync mode store (localStorage), `setSyncMode` command and `mutatePlanningState` action. Added sync toggle in Connection status area with non-blocking feedback and async double-click guard. Added forced network-failure simulation support (`planning.syncFailureSimulation`) so offline-simulated runtime can be validated while planning remains local-first. Planning commands (capture, move, reschedule, closure) never depend on sync mode; runtime isolation enforced by design and covered by integration tests.
- **File List:** resources/js/features/planning/persistence/syncModeStore.js (new), resources/js/features/planning/persistence/syncModeStore.test.js (new), resources/js/features/planning/commands/setSyncMode.js (new), resources/js/features/planning/invariants/mutationGuardrail.js (modified), resources/js/features/planning/invariants/mutationGuardrail.test.js (modified), resources/views/planning.blade.php (modified), resources/js/features/planning/app/initializePlanningInboxApp.js (modified), resources/js/features/planning/app/initializePlanningInboxApp.test.js (modified), _bmad-output/planning-artifacts/epics.md (modified), _bmad-output/implementation-artifacts/sprint-status.yaml (modified), _bmad-output/implementation-artifacts/S-001-sync-runtime-isolation-and-mode-toggle.md (modified)

## Change Log

- 2026-02-23: Story S-001 implementation complete. Added sync mode store, command, guardrail action, UI toggle, and tests.
- 2026-02-23: Code review fixes applied (HIGH/MEDIUM): forced network failure simulation path, sync-toggle race guard, guardrail contract docs alignment, and test hardening.

## Senior Developer Review (AI)

**Date:** 2026-02-23  
**Outcome:** Approve

### Findings Addressed

- [x] **HIGH** Add deterministic forced network failure simulation coverage for AC1.
- [x] **HIGH** Validate that sync-state changes do not block core planning runtime actions.
- [x] **MEDIUM** Align `mutationGuardrail` action contract docs with implemented actions (`setSyncMode`).
- [x] **MEDIUM** Prevent async race on sync toggle by guarding against repeated clicks during in-flight mutation.
- [x] **MEDIUM** Strengthen integration tests for deterministic toggle behavior and forced-offline runtime isolation.

### Validation

- Full JS test suite passes: **226/226**.
- No linter errors in touched files.


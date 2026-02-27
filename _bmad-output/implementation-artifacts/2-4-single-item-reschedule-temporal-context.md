# Story 2.4: Single-Item Reschedule (Temporal Context)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want to reschedule one task to a different temporal planning target,
so that I can adapt my plan over time without changing structural ownership.

## Acceptance Criteria

1. **Given** a task is selected for reschedule, **when** user sets a valid new temporal target, **then** temporal context is updated and reflected in projections.
2. **And** reschedule does not alter area ownership unless explicitly requested.

## Tasks / Subtasks

- [x] Add single-item temporal reschedule command path (AC: 1, 2)
  - [x] Introduce a dedicated command/invariant action for temporal reschedule (do not reuse area-move semantics).
  - [x] Define and normalize a temporal field contract (for example `scheduledFor`) in task records.
  - [x] Keep `id`, `title`, `createdAt`, and `area` unchanged during reschedule.
  - [x] Update `updatedAt` deterministically on successful reschedule.

- [x] Integrate reschedule affordance in UI (AC: 1, 2)
  - [x] Add a per-task reschedule control in Inbox context.
  - [x] Keep reschedule independent from area assignment and Today membership controls.
  - [x] Surface user feedback for invalid temporal targets.

- [x] Enforce invariant-safe behavior (AC: 1, 2)
  - [x] Route reschedule writes through `mutatePlanningState`.
  - [x] Reuse stable domain error style (`TASK_NOT_FOUND`, `INVARIANT_VIOLATION`, etc.).
  - [x] Prevent implicit side effects on `area` and `todayIncluded`.

- [x] Add automated tests (AC: 1, 2)
  - [x] Unit tests for persistence mutation (temporal field changes only, identity/area preserved).
  - [x] Guardrail tests for invalid input and missing task.
  - [x] Integration tests for reschedule UI flow and projection refresh.
  - [x] Regression tests ensuring reschedule does not become move-area or add/remove Today.

## Dev Notes

### Developer Context Section

- Story 2.1 implemented area assignment (`setTaskArea`) and Story 2.3 reinforced area/Today move independence.
- Story 2.4 is the first temporal mutation in Epic 2; keep it explicitly separate from structural moves.
- Existing projections currently derive ordering from `createdAt`; temporal context should be additive and not corrupt deterministic behavior.

### Technical Requirements

- Preserve task identity and structural ownership on reschedule:
  - must not mutate `id`, `title`, `createdAt`, `area`
  - must not toggle `todayIncluded` unless explicitly requested by a different action
  - must update only temporal field(s) plus `updatedAt`
- Temporal target format must be normalized consistently before persistence.
- Reschedule must be deterministic and repeatable for equivalent inputs.

### Architecture Compliance

- Local browser store remains authoritative for planning runtime.
- All writes must pass through centralized invariant layer (`mutatePlanningState`).
- Keep implementation in `resources/js/features/planning/**`; no TypeScript, no framework changes.
- Preserve non-blocking, local-first interaction flow.

### Library / Framework Requirements

- JavaScript ESM only (`"type": "module"` in `package.json`).
- Testing stack remains `vitest` + `happy-dom`.
- Vite 7 / Vitest 4 baseline is already in project; follow existing module and test patterns.

### File Structure Requirements

**Likely modify:**
- `resources/js/features/planning/commands/` — add single-item reschedule command module.
- `resources/js/features/planning/invariants/mutationGuardrail.js` — add reschedule action validation and domain-code mapping.
- `resources/js/features/planning/persistence/inboxTaskStore.js` — add temporal-field persistence mutation.
- `resources/js/features/planning/app/initializePlanningInboxApp.js` — wire reschedule UI callback and refresh path.
- `resources/js/features/planning/projections/computeTodayProjection.js` and/or `renderInboxProjection.js` — reflect temporal context only where required by AC.

**Likely tests:**
- `resources/js/features/planning/persistence/inboxTaskStore.test.js`
- `resources/js/features/planning/invariants/mutationGuardrail.test.js`
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js`
- `resources/js/features/planning/projections/*` tests if temporal display/projection behavior changes

### Testing Requirements

- Unit: reschedule updates temporal context and `updatedAt`, preserves `createdAt` and `area`.
- Unit: invalid temporal target is rejected with deterministic domain error.
- Integration: user can reschedule one task and UI refreshes deterministically.
- Regression: reschedule action does not alter Today membership or area.

### Previous Story Intelligence

- Story 2.3 closed with review fixes and added integration coverage for:
  - remove-from-Today error path behavior
  - area move independence from Today membership
- Reuse those assertion patterns for independence checks in this story (temporal vs structural dimensions).
- Keep File List and sprint-status updates synchronized to avoid review documentation findings.

### Git Intelligence Summary

- Recent commit style for this epic:
  - `feat(planning): ...` for story implementation
  - `fix(planning): ...` for review hardening
- Recent changes concentrated under:
  - `resources/js/features/planning/app/`
  - `resources/js/features/planning/projections/`
  - `resources/js/features/planning/persistence/`
- Continue with incremental changes in same modules and preserve deterministic tests before moving to next story.

### Latest Tech Information

- Project currently uses `vite@^7.3.1` and `vitest@^4.0.18`; keep ESM-first module style and current Vitest API.
- No new dependency is required for Story 2.4; implement with existing planning modules and test stack.

### Project Structure Notes

- Planning feature path: `resources/js/features/planning/` (`app/`, `commands/`, `invariants/`, `persistence/`, `projections/`).
- Avoid unrelated Blade/layout changes unless temporal context must be rendered in existing task rows.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR12]
- [Source: _bmad-output/planning-artifacts/prd.md#FR14]
- [Source: _bmad-output/planning-artifacts/architecture.md#Invariant Enforcement Layer]
- [Source: _bmad-output/implementation-artifacts/2-3-single-item-move-area-and-today-membership.md]
- [Source: _bmad-output/project-context.md#Critical Don't-Miss Rules]

## Dev Agent Record

### Agent Model Used

(To be filled by dev agent)

### Debug Log References

### Senior Developer Review (AI)

**Date:** 2026-02-23  
**Outcome:** Approve (after fixes)

**Findings addressed:**
- [x] **HIGH**: `INVALID_TEMPORAL_TARGET` used but not exported in mutationGuardrail.js — would cause ReferenceError at runtime. Added export.
- [x] **MEDIUM**: Guardrail test for invalid temporal target did not assert `result.code === INVALID_TEMPORAL_TARGET`. Restored assertion.
- [x] **MEDIUM**: sprint-status.yaml modified but not in File List. Added for traceability (per Story 2.3 pattern).
- [x] **LOW**: JSDoc in mutationGuardrail did not list `rescheduleTask` action. Updated.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented reschedule command, persistence (`rescheduleTask`), invariant action (`rescheduleTask`), and `scheduledFor` field.
- Added per-task date input in Inbox projection; wired `onRescheduleTask` callback in app.
- Unit tests: inboxTaskStore (reschedule preserves identity/area/todayIncluded), mutationGuardrail (invalid input, TASK_NOT_FOUND, null clear).
- Integration tests: reschedule flow, invalid temporal feedback, regression (reschedule does not alter area/Today).

### Change Log

- 2026-02-23: Story 2.4 implementation complete. Added single-item reschedule (scheduledFor), command, invariant, UI date input, and tests.
- 2026-02-23: Code review fixes — export INVALID_TEMPORAL_TARGET, restore guardrail test assertion, add sprint-status to File List, update JSDoc.

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- resources/js/features/planning/commands/rescheduleTask.js (new)
- resources/js/features/planning/persistence/inboxTaskStore.js (modified)
- resources/js/features/planning/invariants/mutationGuardrail.js (modified)
- resources/js/features/planning/projections/renderInboxProjection.js (modified)
- resources/js/features/planning/app/initializePlanningInboxApp.js (modified)
- resources/js/features/planning/persistence/inboxTaskStore.test.js (modified)
- resources/js/features/planning/invariants/mutationGuardrail.test.js (modified)
- resources/js/features/planning/projections/renderInboxProjection.test.js (modified)
- resources/js/features/planning/app/initializePlanningInboxApp.test.js (modified)

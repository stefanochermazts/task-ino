# Story 1.5: Invariant-Safe Single and Bulk Mutations

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want planning mutations to enforce invariants and preserve atomicity,
so that state integrity is never silently broken.

## Acceptance Criteria

1. Given a planning mutation is requested (single or bulk), when invariant checks run, then invalid transitions are blocked with explicit feedback.
2. Given a bulk planning mutation is requested, when the operation cannot be fully applied, then the operation rolls back fully (no partial writes).

## Tasks / Subtasks

- [x] Introduce centralized mutation invariant guardrail layer (AC: 1, 2)
  - [x] Add a planning mutations service/module under `resources/js/features/planning/invariants/**` or `commands/**` as a single write-path guardrail.
  - [x] Route single-item write commands through this layer (`addToToday`, swap, future mutation commands).
  - [x] Define and return stable domain error codes for blocked transitions (`TODAY_CAP_EXCEEDED`, `INVARIANT_VIOLATION`, and existing domain-specific codes).

- [x] Enforce explicit invalid-transition blocking (AC: 1)
  - [x] Validate mutation preconditions before any write.
  - [x] Reject invalid mutations with explicit, non-silent results `{ ok: false, code, message }`.
  - [x] Ensure UI receives and surfaces feedback in the relevant planning context (not hidden in unrelated feedback areas).

- [x] Implement bulk mutation with atomic apply-or-rollback behavior (AC: 2)
  - [x] Add bulk mutation command (e.g., bulk add/remove/swap for Today membership) using one transactional path.
  - [x] Ensure write sequence is all-or-nothing: if any item fails invariant or persistence write, no mutation is committed.
  - [x] Confirm no partial state is visible after failed bulk operation.

- [x] Integrate bulk and single paths into planning runtime (AC: 1, 2)
  - [x] Keep all planning writes behind the centralized guardrail layer.
  - [x] Reuse existing refresh path (`refreshInbox` -> `computeTodayProjection` -> `renderTodayProjection`) after successful mutations.
  - [x] Keep behavior local-first and non-blocking relative to network/sync state.

- [x] Add comprehensive tests for invariants and atomicity (AC: 1, 2)
  - [x] Unit tests: invalid single mutation blocked with explicit domain code.
  - [x] Unit tests: bulk mutation failure leaves pre-operation state unchanged.
  - [x] Integration tests: successful bulk mutation updates projection and indicators consistently.
  - [x] Regression tests: verify existing `addToToday` and swap behavior still respects cap and no-silent-overflow rules.

## Dev Notes

### Developer Context Section

- Story 1.5 is the hardening layer for mutation safety. Story 1.3 introduced cap-enforced add/swap flows; Story 1.5 must generalize this into a centralized invariant pipeline that future commands can reuse.
- Architecture explicitly requires: “All write operations MUST pass through a single invariant enforcement layer” and “Bulk operations MUST use the same invariant pipeline as single operations.”
- UX requires guided, non-punitive handling when constraints are hit and no silent partial writes on constrained flows.
- This story should not introduce server-side dependencies; mutation authority remains local-first in browser persistence.

### Technical Requirements

- All single and bulk mutations MUST run invariant checks before persistence writes.
- Invalid transitions MUST return explicit domain outcomes (no silent fallback, no hidden failure).
- Bulk operations MUST be atomic at persistence level (single transactional path where feasible).
- If transaction-level atomicity is not available for a specific path, fallback strategy MUST guarantee deterministic rollback to prior state before returning failure.
- Existing domain errors already used in planning (`TODAY_CAP_EXCEEDED`) MUST remain stable; add `INVARIANT_VIOLATION` where relevant.

### Architecture Compliance

- Preserve local source-of-truth split: local persistence remains runtime authority.
- Keep mutation logic in planning boundaries (`resources/js/features/planning/**`); avoid UI-direct state mutation.
- Maintain deterministic behavior and projection consistency after each successful mutation.
- Keep sync/network as secondary informational state; mutation pipeline cannot depend on backend availability.

### Library / Framework Requirements

- Frontend implementation MUST remain JavaScript ESM under current Vite setup.
- Reuse existing planning modules (`commands`, `persistence`, `projections`, `app`, `invariants`).
- Do not introduce TypeScript or new state-management libraries.

### File Structure Requirements

- Mutation guardrail module: `resources/js/features/planning/invariants/**` or `resources/js/features/planning/commands/**` (single authoritative write-path).
- Persistence transactional helpers in `resources/js/features/planning/persistence/inboxTaskStore.js` as needed.
- Runtime wiring in `resources/js/features/planning/app/initializePlanningInboxApp.js`.
- Tests under `resources/js/features/planning/**/*.test.js` (unit + integration style where applicable).

### Testing Requirements

- Add tests proving invariant rejections produce explicit domain codes and no writes.
- Add tests proving bulk failures perform full rollback (state before == state after).
- Add tests for successful bulk apply with projection and indicator updates.
- Keep tests deterministic and isolated; avoid hidden global state coupling.

### Previous Story Intelligence

- Story 1.3 already introduced transactional persistence helpers for add/swap to reduce race and partial-write risks (`addTaskToTodayWithCap`, `swapTasksInToday`).
- Story 1.3 over-cap flow uses guided panel + swap with non-punitive messaging; this behavior should remain intact while centralizing mutation guardrails.
- Story 1.4 introduced centralized cap persistence (`todayCapStore`) and cap-driven refresh behavior.
- Story 1.2 established deterministic projection contract; mutations must continue to feed projection rebuild consistently.

### Git Intelligence Summary

- Recent commits show focused progression on planning feature slices and review remediations:
  - `afcfab3` implemented stories 1.2/1.4/1.3 with review remediations.
  - `3cbc14c` implemented story 1.1 local-first inbox capture.
- Implication: keep incremental approach, reuse current module boundaries and test style, avoid broad refactors.

### Latest Technical Information

- Current frontend baseline: Vite + JavaScript ESM + Vitest/happy-dom.
- Existing persistence and command/test patterns are already established in `planning` module and should be extended, not replaced.

### Project Structure Notes

- Primary expected touchpoints:
  - `resources/js/features/planning/commands/addToToday.js`
  - `resources/js/features/planning/persistence/inboxTaskStore.js`
  - `resources/js/features/planning/app/initializePlanningInboxApp.js`
  - `resources/js/features/planning/invariants/**` (new/extended centralized mutation guardrail)
  - `resources/js/features/planning/**/*.test.js`

### References

- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\epics.md#Story 1.5]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\prd.md#FR19 FR20]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\architecture.md#Invariant Enforcement Layer]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\ux-design-specification.md#Journey 2 - Over-Cap Guided Decision]
- [Source: C:\laragon\www\task-ino\_bmad-output\implementation-artifacts\1-3-add-to-today-with-cap-enforcement.md]
- [Source: C:\laragon\www\task-ino\_bmad-output\implementation-artifacts\1-4-configure-personal-today-cap.md]

## Dev Agent Record

### Agent Model Used

gpt-5.3-codex

### Debug Log References

- `create-story` workflow synthesis for Story 1.5
- sprint status synchronization to `ready-for-dev`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.5 context aligned with Story 1.3/1.4 implementation patterns and architecture invariants.
- Added explicit guardrails for single+bulk mutation atomicity and invariant blocking requirements.
- Implemented mutationGuardrail.js as single write-path; addToToday and swapToToday route through it.
- Added bulkAddTasksToToday in inboxTaskStore (single transaction, all-or-nothing); bulkAddToToday command.
- Switched vitest environment from jsdom to happy-dom to resolve Node 18 ESM compatibility.

### File List

- _bmad-output/implementation-artifacts/1-5-invariant-safe-single-and-bulk-mutations.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- resources/js/features/planning/invariants/mutationGuardrail.js
- resources/js/features/planning/invariants/mutationGuardrail.test.js
- resources/js/features/planning/commands/addToToday.js
- resources/js/features/planning/commands/addToToday.test.js
- resources/js/features/planning/commands/bulkAddToToday.js
- resources/js/features/planning/commands/bulkAddToToday.test.js
- resources/js/features/planning/persistence/inboxTaskStore.js
- resources/js/features/planning/projections/renderInboxProjection.js
- resources/js/features/planning/projections/renderInboxProjection.test.js
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js
- vitest.config.js
- package.json

### Change Log

- 2026-02-23: Created Story 1.5 with comprehensive mutation-invariant and bulk-atomicity implementation guidance; set status to ready-for-dev.
- 2026-02-23: Implemented Story 1.5: mutationGuardrail, bulkAddTasksToToday, bulkAddToToday; refactored addToToday/swapToToday to use guardrail; added tests; switched to happy-dom.
- 2026-02-23: Code review remediation: wired bulkAddToToday into initializePlanningInboxApp runtime; added onBulkAddToToday handler + bulk button in renderInboxProjection; added integration tests in initializePlanningInboxApp.test.js; refactored addToToday.test.js to mock guardrail directly; added swapToToday same-task guard (INVARIANT_VIOLATION); added dedup for bulk IDs (Set); fixed normalizeResult to not leak task:undefined on bulk success. Tests: 52 → 64 (+12). Status set to done.

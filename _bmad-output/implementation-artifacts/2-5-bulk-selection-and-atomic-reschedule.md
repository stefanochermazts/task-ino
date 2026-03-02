# Story 2.5: Bulk Selection and Atomic Reschedule

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want to apply rescheduling to multiple tasks atomically,
so that I can adjust workload quickly without partial inconsistent outcomes.

## Acceptance Criteria

1. **Given** multiple tasks are selected, **when** user executes bulk reschedule, **then** operation applies to the full batch or rolls back completely.
2. **And** system provides explicit feedback listing affected tasks and final outcome.

## Tasks / Subtasks

- [x] Add bulk reschedule command path (AC: 1, 2)
  - [x] Introduce dedicated bulk command (for example `bulkRescheduleTasks`) separate from area/today bulk semantics.
  - [x] Reuse normalized temporal contract from Story 2.4 (`scheduledFor`).
  - [x] Ensure bulk path preserves `id`, `title`, `createdAt`, `area`, `todayIncluded` for each task.
  - [x] Update `updatedAt` deterministically for successful bulk reschedule.

- [x] Implement atomic persistence mutation with rollback guarantee (AC: 1)
  - [x] Add persistence mutation that validates full batch before committing writes.
  - [x] Enforce all-or-nothing behavior: on invalid task/date or write error, no partial reschedule remains.
  - [x] Keep deterministic result contract (`ok`, `code`, optional affected task ids/count).

- [x] Enforce invariant-safe bulk behavior (AC: 1, 2)
  - [x] Route writes through `mutatePlanningState`.
  - [x] Add bulk-specific guardrail validation for `taskIds` and temporal target.
  - [x] Reuse stable domain error style (`TASK_NOT_FOUND`, `INVARIANT_VIOLATION`, `INVALID_TEMPORAL_TARGET`, etc.).

- [x] Integrate bulk selection + feedback in UI (AC: 2)
  - [x] Add deterministic multi-select affordance in Inbox context (e.g., per-task checkbox + selected count).
  - [x] Add bulk reschedule trigger with date input and explicit execution action.
  - [x] Show structured feedback with affected-task summary and outcome (success/failure).
  - [x] Ensure UI clears selection/feedback coherently after completion or failure.

- [x] Add automated tests (AC: 1, 2)
  - [x] Unit tests: persistence bulk atomicity (success updates all, failure updates none).
  - [x] Guardrail tests: invalid payload/date/missing task.
  - [x] Integration tests: bulk selection + execute + projection refresh + feedback rendering.
  - [x] Regression tests: bulk reschedule does not mutate `area` or `todayIncluded`.

## Dev Notes

### Epic 1 Retrospective – Panel Pattern (MANDATORY)

**Seguire pattern panel Epic 1: elemento errore dedicato + toggle hidden.**

If a new bulk-action panel/feedback panel is introduced:

- Add dedicated error element inside panel (`<p id="<panel>-error" class="hidden"></p>`).
- Show with `textContent + classList.remove('hidden')`, clear with empty text + `classList.add('hidden')`.
- Focus first interactive control when panel opens.
- Add error-path tests asserting both `textContent` and hidden-state toggle.

Reference: `_bmad-output/project-context.md` (Panel error pattern and UI determinism rules).

### Developer Context Section

- Story 2.4 is complete and introduced single-item temporal reschedule (`scheduledFor`) with invariant routing.
- Story 2.5 extends temporal behavior to **batch scope** with strict atomic guarantees (FR35), not incremental best-effort updates.
- Existing bulk precedent exists in Today flow (`bulkAddToToday`) and should inform deterministic payload validation and result contracts.

### Technical Requirements

- Bulk reschedule must be deterministic and all-or-nothing:
  - validate the full batch first
  - commit only if all entries are valid
  - fail with no partial writes if any validation or persistence step fails
- Preserve non-temporal fields across all selected tasks:
  - `id`, `title`, `createdAt`, `area`, `todayIncluded` unchanged
  - mutate only `scheduledFor` and `updatedAt`
- Normalize temporal target once and apply equivalently to all selected tasks.
- Return actionable outcome metadata to support explicit UI feedback (e.g., count and ids).

### Architecture Compliance

- All write operations must pass through centralized invariant layer (`mutatePlanningState`).
- Keep implementation in `resources/js/features/planning/**` (local-first, no server dependency).
- Respect architecture guardrail: bulk operations must use the same invariant pipeline as single operations and preserve rollback semantics.
- Do not bypass persistence/invariant boundaries from UI code.

### Library / Framework Requirements

- JavaScript ESM only (`"type": "module"` in `package.json`), no TypeScript.
- Testing stack: `vitest` + `happy-dom`.
- No new dependency expected for this story.
- Continue existing style and patterns in planning feature modules.

### File Structure Requirements

**Likely modify:**
- `resources/js/features/planning/commands/` — add bulk reschedule command module.
- `resources/js/features/planning/invariants/mutationGuardrail.js` — add `bulkRescheduleTasks` action validation and mapping.
- `resources/js/features/planning/persistence/inboxTaskStore.js` — add atomic bulk temporal mutation.
- `resources/js/features/planning/projections/renderInboxProjection.js` — add multi-select UI and bulk reschedule controls/feedback hooks.
- `resources/js/features/planning/app/initializePlanningInboxApp.js` — wire handlers, selection state, refresh/feedback loop.

**Likely tests:**
- `resources/js/features/planning/persistence/inboxTaskStore.test.js`
- `resources/js/features/planning/invariants/mutationGuardrail.test.js`
- `resources/js/features/planning/projections/renderInboxProjection.test.js`
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js`

### Testing Requirements

- Unit: bulk success updates all selected tasks with same normalized `scheduledFor` and deterministic `updatedAt`.
- Unit: any invalid task/date causes complete rollback (no task mutated).
- Guardrail: rejects invalid task list and invalid temporal target with stable domain codes.
- Integration: user can select multiple tasks, execute bulk reschedule, see deterministic feedback, and projection refreshes.
- Regression: bulk reschedule does not become bulk move-area or Today-membership mutation.

### Previous Story Intelligence

- **Story 2.4:** single-item reschedule implemented with `scheduledFor`, temporal normalization, and invariant/persistence separation; reuse these semantics.
- **Story 2.3:** independence checks for area vs Today mutations are already established; mirror these guardrails for temporal bulk flow.
- **Existing bulk pattern:** `bulkAddToToday` validates payload and performs batched deterministic updates; adapt pattern while enforcing atomic rollback for reschedule semantics.

### Git Intelligence Summary

- Recent epic commit style uses `feat(planning): ...` and `fix(planning): ...`.
- Recent modifications concentrate in:
  - `resources/js/features/planning/app/`
  - `resources/js/features/planning/projections/`
  - `resources/js/features/planning/invariants/`
  - `resources/js/features/planning/persistence/`
- Keep incremental edits in same modules and preserve deterministic tests before moving to Story 2.6.

### Latest Tech Information

- Current project baseline: `vite@^7.3.1`, `vitest@^4.0.18`, ESM modules.
- No framework upgrade required for Story 2.5.
- Keep local interaction fast and deterministic per architecture constraints (bulk operation performance is a first-class requirement).

### Project Structure Notes

- Planning feature root: `resources/js/features/planning/` with `app/`, `commands/`, `invariants/`, `persistence/`, `projections/`.
- Avoid unrelated Blade/layout changes unless necessary for explicit bulk feedback affordance.
- Keep sprint documentation and File List synchronized to prevent review traceability findings.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5]
- [Source: _bmad-output/planning-artifacts/prd.md#FR13]
- [Source: _bmad-output/planning-artifacts/prd.md#FR35]
- [Source: _bmad-output/planning-artifacts/architecture.md#Invariant Enforcement Layer]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns Identified]
- [Source: _bmad-output/implementation-artifacts/2-4-single-item-reschedule-temporal-context.md]
- [Source: _bmad-output/project-context.md#Critical Don't-Miss Rules]

## Dev Agent Record

### Agent Model Used

GPT-5.3 Codex

### Debug Log References

- `npm run test:js` (Vitest): 183 passing.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added bulk reschedule command and invariant path (`bulkRescheduleTasks`) with task-list + date validation.
- Implemented atomic bulk persistence mutation with deterministic success payload (`taskIds`, `count`).
- Wired Inbox bulk selection UI (per-task checkbox, selected count, bulk date + action button).
- Added explicit bulk feedback with affected task ids and success/failure outcome text.
- Added regression coverage to ensure bulk reschedule preserves `area` and `todayIncluded`.
- Code-review fixes: clear selection on failure, disambiguate failure feedback (`Requested tasks`), and harden write-error rollback behavior with dedicated persistence test.

### File List

- `_bmad-output/implementation-artifacts/2-5-bulk-selection-and-atomic-reschedule.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `resources/js/features/planning/commands/bulkRescheduleTasks.js` (new)
- `resources/js/features/planning/persistence/inboxTaskStore.js` (modified)
- `resources/js/features/planning/invariants/mutationGuardrail.js` (modified)
- `resources/js/features/planning/projections/renderInboxProjection.js` (modified)
- `resources/js/features/planning/app/initializePlanningInboxApp.js` (modified)
- `resources/js/features/planning/persistence/inboxTaskStore.test.js` (modified)
- `resources/js/features/planning/invariants/mutationGuardrail.test.js` (modified)
- `resources/js/features/planning/projections/renderInboxProjection.test.js` (modified)
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js` (modified)

### Change Log

- 2026-02-23: Implemented Story 2.5 bulk atomic reschedule path, inbox multi-select UI, structured bulk feedback, and automated coverage for atomicity/guardrails/regressions.
- 2026-02-23: Code review remediation: fixed failure-state selection reset, clarified failure feedback semantics, and ensured bulk write-error rollback with tests.

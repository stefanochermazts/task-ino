# Story 1.3: Add to Today with Cap Enforcement

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want to add tasks to Today with explicit cap constraints,
so that Today remains finite by design.

## Acceptance Criteria

1. Given Today has available slots under cap, when the user adds an Inbox task to Today, then the task is added and cap indicator updates immediately.
2. Given adding would exceed cap, when the user attempts to add, then the system blocks silent overflow and enters guided decision state.
3. The system MUST prevent exceeding cap through any mutation path (single or bulk).

## Tasks / Subtasks

- [x] Add invariant check and addToToday command (AC: 1, 2, 3)
  - [x] Create `addToToday(taskId)` command under `resources/js/features/planning/commands/`.
  - [x] Command loads tasks, reads cap from `readTodayCap()`, computes current Today count via `computeTodayProjection`.
  - [x] If under cap: set `todayIncluded: true` on task, save via `saveInboxTask`, return `{ ok: true }`.
  - [x] If at/over cap: return `{ ok: false, code: 'TODAY_CAP_EXCEEDED' }` without mutating.
  - [x] Ensure no mutation occurs when cap would be exceeded.
- [x] Add task-by-id retrieval to persistence (AC: 1)
  - [x] Add `getInboxTask(id)` or equivalent to `inboxTaskStore` for loading a single task before update.
  - [x] Reuse `saveInboxTask` for persisting the updated task.
- [x] Add "Add to Today" affordance to Inbox items (AC: 1)
  - [x] Update `renderInboxProjection` to render each Inbox item with an "Add to Today" control (button or link).
  - [x] Wire control to `addToToday(taskId)`; on success, trigger `refreshInbox`; on failure, show feedback.
- [x] Implement over-cap guided decision UI (AC: 2)
  - [x] When `addToToday` returns `TODAY_CAP_EXCEEDED`, show over-cap panel (inline or contextual).
  - [x] Panel offers: Cancel (no change), Swap (remove one Today item, add this one).
  - [x] UX: guidance-oriented copy, non-punitive; use `todayCapFeedback` or dedicated over-cap area.
  - [x] Swap flow: user selects which Today item to remove; set `todayIncluded: false` on that task, `true` on new; save both; refresh.
- [x] Wire addToToday into planning app and projection refresh (AC: 1, 2)
  - [x] Ensure `initializePlanningInboxApp` passes refresh callback or equivalent so Inbox items can trigger refresh after add.
  - [x] Cap indicator (`#today-count`, `#today-cap-value`) updates via existing `refreshInbox` -> `computeTodayProjection` -> `renderTodayProjection`.
- [x] Add automated tests (AC: 1, 2, 3)
  - [x] Unit tests for `addToToday`: under cap adds successfully; at cap returns TODAY_CAP_EXCEEDED without mutation.
  - [x] Test swap flow: remove one, add another, cap remains respected.
  - [x] Test that no silent overflow occurs through add path.

## Dev Notes

### Developer Context Section

- Story 1.3 introduces the first write-path cap enforcement. Story 1.2 established deterministic Today projection (read-model); Story 1.4 added user-configurable cap. This story adds the **mutation** that sets `todayIncluded: true` and enforces the cap before applying.
- Tasks already have `todayIncluded` (Story 1.1/1.2; `createInboxTask` sets `todayIncluded: false`). The projection filters by `todayIncluded === true` and applies cap. Adding to Today = setting `todayIncluded: true` and persisting.
- Architecture: "Invariant checks execute in centralized write-path logic." The `addToToday` command is the invariant gate; UI must not mutate directly. Domain error `TODAY_CAP_EXCEEDED` is in the architecture error catalog.
- UX: Over-cap is a guided decision moment, never punitive. Options: Cancel, Swap. Reschedule/Pause (from UX spec) can be simplified for MVP: Cancel = do nothing; Swap = remove one Today item, add this one.

### Technical Requirements

- `addToToday` MUST check cap before mutating. If `currentTodayCount >= cap`, return `{ ok: false, code: 'TODAY_CAP_EXCEEDED' }` and do NOT call `saveInboxTask`.
- Mutation MUST go through `saveInboxTask`; no direct IndexedDB writes from UI.
- Swap MUST be atomic in effect: remove one, add one. Both updates via `saveInboxTask`; order: set removed task `todayIncluded: false`, save; set added task `todayIncluded: true`, save. Then refresh.
- Reuse `computeTodayProjection` and `readTodayCap` for cap check; do not duplicate projection logic.

### Architecture Compliance

- All write operations MUST pass through invariant enforcement. `addToToday` is the enforcement point for single-item add.
- Keep logic within planning feature boundaries (`resources/js/features/planning/**`).
- Domain error `TODAY_CAP_EXCEEDED` for cap-exceeded attempts.
- Bulk operations and atomic rollback semantics are Story 1.5; this story focuses on single-item add.

### Library / Framework Requirements

- Frontend implementation MUST remain JavaScript ESM under existing Vite setup.
- Reuse existing planning modules (`commands`, `persistence`, `projections`, `app`).
- No TypeScript or new state-management libraries.

### File Structure Requirements

- Command: `resources/js/features/planning/commands/addToToday.js`
- Persistence: extend `inboxTaskStore.js` with `getInboxTask(id)` if needed (or use `listInboxTasks` and find by id).
- UI: update `renderInboxProjection.js` for Add affordance; add over-cap panel in `planning.blade.php` or render dynamically.
- Tests: `resources/js/features/planning/commands/addToToday.test.js`, update `initializePlanningInboxApp.test.js` if needed.

### Testing Requirements

- Unit tests for `addToToday`: under cap success, at cap returns TODAY_CAP_EXCEEDED, no mutation when blocked.
- Test swap: at cap, swap one out and one in, verify cap respected.
- Keep tests isolated; avoid order-dependent fixtures.

### Previous Story Intelligence

- Story 1.2: `computeTodayProjection({ tasks, todayCap })` returns `{ items, totalEligible, cap }`. Use `items.length` or `totalEligible` for current count. Eligible = tasks with `todayIncluded: true`; projection caps to `cap` for display.
- Story 1.4: `readTodayCap()` from `todayCapStore`; `saveTodayCap` for config. Cap is persisted in localStorage.
- Story 1.1: `saveInboxTask(task)` persists to IndexedDB. Tasks have `id`, `title`, `area`, `todayIncluded`, `createdAt`, `updatedAt`.
- `createInboxTask` sets `todayIncluded: false`. No "Add to Today" UI yet; Inbox items are display-only.
- Vitest + jsdom for frontend tests; PHPUnit for feature tests if needed.

### Project Structure Notes

- Primary touchpoints:
  - `resources/js/features/planning/commands/addToToday.js` (new)
  - `resources/js/features/planning/persistence/inboxTaskStore.js` (getInboxTask or list+find)
  - `resources/js/features/planning/projections/renderInboxProjection.js` (Add affordance)
  - `resources/js/features/planning/projections/computeTodayProjection.js` (cap check)
  - `resources/js/features/planning/app/initializePlanningInboxApp.js` (wire handlers, refresh)
  - `resources/views/planning.blade.php` (over-cap panel container if needed)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR3, FR4, FR17]
- [Source: _bmad-output/planning-artifacts/architecture.md#Invariant Enforcement Layer, TODAY_CAP_EXCEEDED]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Over-Cap Guided Decision]
- [Source: _bmad-output/implementation-artifacts/1-2-deterministic-today-projection-from-local-state.md]
- [Source: _bmad-output/implementation-artifacts/1-4-configure-personal-today-cap.md]

## Dev Agent Record

### Agent Model Used

(To be filled by dev agent)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added `addToToday` and `swapToToday` commands with cap enforcement; `getInboxTask` in inboxTaskStore.
- Updated `renderInboxProjection` with Add to Today button; over-cap panel with Cancel and Swap.
- Wired add flow into `initializePlanningInboxApp`; cap indicator updates via existing refresh path.

### File List

- _bmad-output/implementation-artifacts/1-3-add-to-today-with-cap-enforcement.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- resources/js/features/planning/commands/addToToday.js
- resources/js/features/planning/commands/addToToday.test.js
- resources/js/features/planning/persistence/inboxTaskStore.js
- resources/js/features/planning/projections/renderInboxProjection.js
- resources/js/features/planning/projections/renderInboxProjection.test.js
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js
- resources/views/planning.blade.php

### Change Log

- 2026-02-23: Implemented Story 1.3 Add to Today with Cap Enforcement: addToToday, swapToToday, getInboxTask, Add affordance, over-cap panel, tests.
- 2026-02-23: Code review remediation: transactional persistence paths for add/swap, over-cap UX fallback, and integration test coverage for over-cap swap flow.

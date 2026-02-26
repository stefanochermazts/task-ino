# Story 1.6: Explicit End-of-Day Closure Flow

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want to close my day only after explicit decisions on unresolved Today items,
so that no carry-over happens implicitly.

## Acceptance Criteria

1. Given Today contains unresolved items at closure time, when user initiates closure (clicks "Close Day"), then the system reveals a closure panel listing all current Today items with per-item decision controls.
2. Given a closure panel is visible and a Today item is shown, when user selects "Defer" for that item, then the item is removed from Today (returned to Inbox, `todayIncluded: false`) and the closure panel updates to reflect remaining unresolved items.
3. Given a closure panel is visible and a Today item is shown, when user selects "Pause" for that item, then the item is marked as paused (`status: 'paused'`, `todayIncluded: false`) and removed from Today, and the closure panel updates.
4. Given the closure panel is active and all Today items have been explicitly decided (Today projection = 0 items), then the system shows a "Day closed" completion message and the closure panel transitions to closed/complete state.
5. Given Today already has 0 items when user clicks "Close Day", then the system immediately shows the "Day closed" completion state without requiring per-item decisions.
6. All closure mutations (defer, pause) MUST pass through the invariant enforcement layer (`mutatePlanningState`); no direct store mutation from UI.
7. The closure panel uses non-punitive, choice-oriented copy at all times: "Close Day", "Defer", "Pause", "Day closed. Well done." — never blame-framing.

## Tasks / Subtasks

- [x] Extend persistence layer with closure-related mutation functions (AC: 2, 3)
  - [x] Add `removeTaskFromToday(taskId)` to `inboxTaskStore.js`: sets `todayIncluded: false`, updates `updatedAt`, returns `{ ok, task } | { ok: false, code }`.
  - [x] Add `setTaskPaused(taskId)` to `inboxTaskStore.js`: sets `todayIncluded: false, status: 'paused'`, updates `updatedAt`, returns `{ ok, task } | { ok: false, code }`.
  - [x] Both functions must validate task existence (return `TASK_NOT_FOUND` if missing) and run within `runTransaction('readwrite', ...)` using the existing `runTransaction` helper.

- [x] Extend invariant guardrail layer with closure actions (AC: 2, 3, 6)
  - [x] Add `CLOSURE_REQUIRED` export constant to `mutationGuardrail.js` (architectural readiness, consistent with the domain error code catalog in architecture.md).
  - [x] Add `removeFromToday` action to `mutatePlanningState`: validates `taskId`, calls `removeTaskFromToday`, normalizes result.
  - [x] Add `pauseTask` action to `mutatePlanningState`: validates `taskId`, calls `setTaskPaused`, normalizes result.
  - [x] `normalizeResult` should handle new action result shapes correctly; no new error codes needed beyond `TASK_NOT_FOUND` and `INVARIANT_VIOLATION`.

- [x] Add closure commands (AC: 2, 3, 6)
  - [x] Create `resources/js/features/planning/commands/removeFromToday.js`: thin wrapper calling `mutatePlanningState('removeFromToday', { taskId })`.
  - [x] Create `resources/js/features/planning/commands/pauseTask.js`: thin wrapper calling `mutatePlanningState('pauseTask', { taskId })`.

- [x] Extend app HTML template with closure panel elements (AC: 1, 4, 5, 7)
  - [x] Add `#close-day-btn` button in or near the Today section header (visible whenever Today section is visible).
  - [x] Add `#closure-panel` container (hidden by default with `hidden` class) containing:
    - `#closure-item-list` — `<ul>` for rendering per-item decision rows.
    - `#closure-complete-msg` — element showing "Day closed. Well done." (hidden until all items decided).
    - `#closure-cancel-btn` — button to dismiss the closure panel without finalizing (hides panel, no state change).
  - [x] Ensure all new elements have appropriate `aria-*` labels and are keyboard-accessible.

- [x] Wire closure flow in app initialization layer (AC: 1, 2, 3, 4, 5, 7)
  - [x] Extend `readUi()` in `initializePlanningInboxApp.js` to include new elements: `closeDayBtn`, `closurePanel`, `closureItemList`, `closureCompleteMsg`, `closureCancelBtn`.
  - [x] Implement `showClosurePanel(tasks)`: renders per-item decision rows in `#closure-item-list`; each row shows task title, "Defer" button and "Pause" button; if Today projection is already 0 items show `#closure-complete-msg` directly.
  - [x] Wire `#close-day-btn` click: computes current Today projection, if items > 0 calls `showClosurePanel(safeTasks)`, else shows `#closure-complete-msg` inline.
  - [x] Wire "Defer" button per item: calls `removeFromToday(taskId)`, on success calls `refreshInbox()` and re-renders closure panel from updated projection; on failure shows feedback in `#quick-capture-feedback`.
  - [x] Wire "Pause" button per item: calls `pauseTask(taskId)`, on success calls `refreshInbox()` and re-renders closure panel from updated projection; on failure shows feedback in `#quick-capture-feedback`.
  - [x] After each defer/pause, if updated Today projection = 0, hide item list and show `#closure-complete-msg`.
  - [x] Wire `#closure-cancel-btn`: hides panel, resets to normal Today view, no state mutation.

- [x] Add comprehensive tests for closure flow (AC: 1–7)
  - [x] Unit tests for `removeTaskFromToday` and `setTaskPaused` in a new or extended store test file (verify state mutations and TASK_NOT_FOUND handling).
  - [x] Unit tests for `removeFromToday` and `pauseTask` actions in `mutationGuardrail.test.js` (verify pass-through and error normalization).
  - [x] Integration tests in `initializePlanningInboxApp.test.js`:
    - [x] "shows closure panel with Today items when Close Day clicked": seeds tasks with todayIncluded=true, initializes app, clicks close-day-btn, asserts closure panel visible and items listed.
    - [x] "defers an item from closure panel and updates Today": seeds 2 Today items, initiates closure, clicks Defer for one, asserts that item no longer in Today projection, closure panel updated.
    - [x] "pauses an item from closure panel and updates Today": seeds 1 Today item, initiates closure, clicks Pause, asserts item has status paused and Today = 0, closure complete msg shown.
    - [x] "shows day closed immediately when Today already empty": initializes app with no Today items, clicks close-day-btn, asserts closure-complete-msg shown without item list.
    - [x] "cancel button hides closure panel without mutation": seeds Today items, opens closure panel, clicks cancel, asserts panel hidden and Today items unchanged.

## Dev Notes

### Developer Context Section

- Story 1.6 delivers the closing boundary of the core planning loop: `Inbox -> Finite Today -> Explicit Closure`. This is a product-law story: the system MUST enforce that no unresolved Today item passes day boundary without explicit user decision.
- Prior stories already provide all prerequisites:
  - Story 1.1: task creation and Inbox persistence.
  - Story 1.2: deterministic Today projection contract (the closure checks Today projection = 0).
  - Story 1.3 / 1.5: invariant-safe mutation layer — this story extends it with two new closure-specific actions.
  - Story 1.4: Today cap configuration (closure operates on whatever Today cap is configured).
  - Story 1.8: local persistence and reload rebuild (closure mutations persist immediately via existing IndexedDB path).
- This story introduces `status` as a new task field (`'paused'`). The field is nullable/undefined for existing tasks (no migration needed for MVP: any task without `status` is treated as "active").
- Closure for MVP means: Today = 0 after all explicit decisions. No date-based "next day" boundary detection is needed at this stage (that belongs to Story 2.6). The closure flow is a user-triggered action, not a time-triggered event.

### Semantic Naming Rules (Non-Negotiable)

- The domain concept for removing a task from Today at day-end is **"Defer"** in the UI copy, implemented as `removeFromToday` in code.
- The domain concept for marking a task as temporarily inactive is **"Pause"** in the UI copy, implemented as `pauseTask` / `setTaskPaused` in code.
- The domain concept for the completion event is **"Day closed"** in the UI copy, implemented as closure state where Today projection = 0.
- Do NOT use "Delete", "Archive", "Abandon", "Carry over" or any synonym not above. Domain lexicon is English and canonical (see architecture.md "Naming Patterns").
- `CLOSURE_REQUIRED` is the stable domain error code constant (from architecture.md error catalog). Export it from `mutationGuardrail.js` for future use, but do NOT yet enforce it as a write-path blocker in this story.

### Technical Requirements

- All closure mutations MUST route through `mutatePlanningState` in `mutationGuardrail.js`. No UI-direct IndexedDB writes.
- New persistence functions (`removeTaskFromToday`, `setTaskPaused`) MUST use the existing `runTransaction` helper in `inboxTaskStore.js`. Do NOT open IndexedDB connections independently.
- Task `status` field: use string literal `'paused'` for paused state. Active/normal tasks have `status` undefined or absent — do NOT add `status: 'active'` to existing tasks.
- `computeTodayProjection` already filters by `todayIncluded === true`. After defer/pause (both set `todayIncluded: false`), those tasks will naturally drop out of the Today projection on the next `refreshInbox()` call — no projection changes needed.
- The closure panel must use the same `refreshInbox()` call pattern already established in the app to keep Inbox and Today in sync after each mutation.
- Closure panel rendering MUST re-call `computeTodayProjection` after each mutation to get the authoritative item count — do NOT track local UI counters.

### Architecture Compliance

- Preserve local source-of-truth: all new mutations go through IndexedDB via `runTransaction`. No server calls.
- Keep logic within planning boundaries: all new files in `resources/js/features/planning/**`.
- Invariant layer remains the single write-path: `mutatePlanningState` is the only entry point for persistence mutations.
- No TypeScript, no framework rewrites, no new state-management libraries. JavaScript ESM only.
- The `CLOSURE_REQUIRED` error code belongs to the stable domain error catalog (architecture.md §3). Export it but do not wire it as a blocker in Story 1.6 (that enforcement is for future stories).

### Library / Framework Requirements

- Frontend: JavaScript ESM under Vite setup (no changes to Vite config needed).
- Testing: Vitest + `happy-dom` (same as all existing tests).
- No new npm dependencies required.
- HTML: native DOM manipulation only (consistent with existing pattern in `renderTodayProjection.js`).

### File Structure Requirements

Primary expected files to create or modify:

**Modify:**
- `resources/js/features/planning/persistence/inboxTaskStore.js` — add `removeTaskFromToday`, `setTaskPaused`.
- `resources/js/features/planning/invariants/mutationGuardrail.js` — add `CLOSURE_REQUIRED` export, `removeFromToday` and `pauseTask` actions.
- `resources/js/features/planning/app/initializePlanningInboxApp.js` — extend `readUi()` and add closure flow wiring.
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js` — add closure integration tests.
- `resources/js/features/planning/invariants/mutationGuardrail.test.js` — add unit tests for new actions.
- `resources/views/app/shell.blade.php` (or equivalent Blade template housing `#planning-app`) — add closure panel HTML elements.

**Create:**
- `resources/js/features/planning/commands/removeFromToday.js`
- `resources/js/features/planning/commands/pauseTask.js`

**Optionally extend (if unit tests for store functions are in a separate file):**
- `resources/js/features/planning/persistence/inboxTaskStore.test.js` — add tests for `removeTaskFromToday` and `setTaskPaused`.

Any new helper must remain inside `resources/js/features/planning/**` and follow the existing kebab-case file naming pattern.

### Testing Requirements

- All new persistence functions have unit tests covering: happy path, task not found, and invalid input.
- All new `mutatePlanningState` actions have unit tests covering: happy path result pass-through, invalid task ID, and TASK_NOT_FOUND propagation.
- Integration tests use the same pattern as existing tests in `initializePlanningInboxApp.test.js`:
  - `vi.mock` for `inboxTaskStore`, `addToToday`, `bulkAddToToday`, `createInboxTask`, `todayCapStore`.
  - `happy-dom` document with full HTML fixture including new closure panel elements.
  - `await initializePlanningInboxApp(document)` + `await flushPromises()` pattern for async resolution.
- Closure-related test scenarios to cover:
  - Closure panel shown when Today has items.
  - Defer action removes item from Today and updates panel.
  - Pause action sets status paused and removes from Today.
  - Day-closed message shown when Today reaches 0 after last decision.
  - Immediate day-closed state when Today was already empty on open.
  - Cancel button hides panel without any mutation.
- Ensure existing 69/69 tests remain green after changes.

### Previous Story Intelligence

- Story 1.5 introduced `mutatePlanningState` as the centralized invariant write-path. Story 1.6 extends it with two new actions (`removeFromToday`, `pauseTask`). Follow the exact same action routing pattern (`if (action === '...')`) and result normalization pattern as the existing actions.
- Story 1.8 established `refreshInbox()` as the canonical projection refresh call. The closure panel must use this same call after each mutation to keep Inbox/Today in sync.
- Story 1.3 introduced the over-cap panel pattern (show panel with item list + per-item action buttons in `showOverCapPanel()`). The closure panel follows the same architectural pattern: a hidden panel revealed programmatically, per-item buttons wired to async commands, panel closed on completion.
- Story 1.8 test patterns: use `vi.mock` with `async (importOriginal)` where you need to preserve real exports (`isValidTaskRecord`). Closure tests should mock `removeTaskFromToday` and `setTaskPaused` in the `inboxTaskStore` mock.

### Git Intelligence Summary

- All recent work follows the pattern: extend persistence → extend invariant guardrail → wire in app layer → test integration.
- Existing tests use `document.createElement` + `document.body.appendChild` to build a DOM fixture. The closure panel HTML must be added to the same fixture in tests.
- Incremental commits per layer (persistence → invariant → commands → app → tests) align with the established implementation rhythm.

### Latest Technical Information

- Vite + Vitest baseline is stable. No version changes needed.
- The `happy-dom` environment already supports `localStorage` and `document.querySelector` — both are used in existing tests.
- `IndexedDB` in `happy-dom` is mocked via `vi.mock('../persistence/inboxTaskStore')` in the app tests (the real IndexedDB is never called from app-level integration tests).

### Project Structure Notes

- The planning feature lives at `resources/js/features/planning/` with sub-modules: `app/`, `commands/`, `persistence/`, `projections/`, `invariants/`.
- HTML elements are in the Blade template (likely `resources/views/app/shell.blade.php`). The closure panel elements need to be added there within `#planning-app`.
- The closure panel follows the same HTML pattern as `#over-cap-panel`: a `div` with `hidden` class by default, containing a `ul` for items and action buttons.

### Closure Panel HTML Specification

The following HTML elements must be added to the Blade template within `#planning-app`, ideally immediately after the Today section:

```html
<!-- Close Day Button (in Today section header area) -->
<button type="button" id="close-day-btn"
  class="rounded border border-violet-300 bg-white px-3 py-1 text-sm text-violet-800 hover:bg-violet-50"
  aria-label="Initiate end-of-day closure">
  Close Day
</button>

<!-- Closure Panel (hidden by default) -->
<div id="closure-panel" class="hidden rounded-md border border-violet-200 bg-violet-50 p-4 mt-4" role="region" aria-label="Day closure">
  <h3 class="text-sm font-semibold text-violet-900 mb-2">Decide where each item goes</h3>
  <ul id="closure-item-list" class="space-y-2"></ul>
  <p id="closure-complete-msg" class="hidden text-sm font-medium text-violet-900 mt-3">Day closed. Well done.</p>
  <button type="button" id="closure-cancel-btn"
    class="mt-3 rounded border border-violet-200 bg-white px-3 py-1 text-sm text-violet-700 hover:bg-violet-100">
    Cancel
  </button>
</div>
```

Each item row in `#closure-item-list` should be created dynamically with this pattern:
```html
<li class="flex items-center justify-between rounded border border-violet-200 bg-white px-3 py-2 text-sm">
  <span class="text-violet-900">{task.title}</span>
  <span class="flex gap-2">
    <button type="button" class="defer-btn rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Defer</button>
    <button type="button" class="pause-btn rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-700 hover:bg-amber-50">Pause</button>
  </span>
</li>
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6]
- [Source: _bmad-output/planning-artifacts/prd.md#FR6, FR7, FR18]
- [Source: _bmad-output/planning-artifacts/architecture.md#Minimal Deterministic Error Code Catalog]
- [Source: _bmad-output/planning-artifacts/architecture.md#Invariant Enforcement Layer]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ClosurePanel component]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1 - 2-Minute Planning Loop]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles]
- [Source: _bmad-output/implementation-artifacts/1-5-invariant-safe-single-and-bulk-mutations.md]
- [Source: _bmad-output/implementation-artifacts/1-8-local-persistence-and-rebuild-after-reload.md]
- [Source: resources/js/features/planning/invariants/mutationGuardrail.js]
- [Source: resources/js/features/planning/persistence/inboxTaskStore.js]
- [Source: resources/js/features/planning/app/initializePlanningInboxApp.js]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- `npm run test:js -- resources/js/features/planning/app/initializePlanningInboxApp.test.js`
- `npm run test:js -- resources/js/features/planning/persistence/inboxTaskStore.test.js`
- `npm run test:js`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.6 context aligned with Stories 1.3/1.5/1.8 invariant pipeline, mutation patterns, and app wiring conventions.
- ClosurePanel HTML specification provided to prevent reinvention and ensure consistent styling with existing over-cap panel.
- CLOSURE_REQUIRED constant scoped to export-only in this story; enforcement as write-path blocker is deferred to future stories.
- "Defer" (removeFromToday) and "Pause" (pauseTask/setTaskPaused) terminology defined and locked to prevent semantic drift.
- Task `status: 'paused'` field introduced; no IndexedDB schema migration needed (field is nullable for existing tasks).
- Implemented closure mutations in persistence layer: `removeTaskFromToday` and `setTaskPaused`.
- Extended invariant pipeline with `removeFromToday` and `pauseTask` actions plus `CLOSURE_REQUIRED` exported code constant.
- Added closure commands (`removeFromToday.js`, `pauseTask.js`) and wired closure panel interactions in app initialization flow.
- Added closure UI elements in planning Blade view (`#close-day-btn`, `#closure-panel`, decision buttons and completion state).
- Added unit tests for new guardrail actions and new persistence closure functions.
- Added integration tests for full closure flows: open panel, defer, pause, immediate close on empty Today, and cancel.
- Full JS test suite passes: 86/86.

### File List

- _bmad-output/implementation-artifacts/1-6-explicit-end-of-day-closure-flow.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js
- resources/js/features/planning/commands/pauseTask.js
- resources/js/features/planning/commands/removeFromToday.js
- resources/js/features/planning/invariants/mutationGuardrail.js
- resources/js/features/planning/invariants/mutationGuardrail.test.js
- resources/js/features/planning/persistence/inboxTaskStore.js
- resources/js/features/planning/persistence/inboxTaskStore.test.js
- resources/views/planning.blade.php

### Change Log

- 2026-02-23: Created Story 1.6 with comprehensive closure flow guidance; set status to ready-for-dev.
- 2026-02-23: Implemented Story 1.6 explicit closure flow end-to-end (closure mutations, invariant actions, closure commands, Today closure panel wiring, and tests). Status set to review.

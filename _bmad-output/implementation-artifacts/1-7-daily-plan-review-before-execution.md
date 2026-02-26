# Story 1.7: Daily Plan Review Before Execution

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want a clear review of my current Today plan before execution,
so that I can commit with confidence.

## Acceptance Criteria

1. **Given** Today has selected items, **when** user enters review state, **then** the system shows the current finite plan (Today items list), cap status (X of Y), and closure state clearly.
2. **Given** the review panel is visible, **when** user confirms plan readiness, **then** the panel dismisses and the user remains in the core flow without any state mutation.
3. **Given** Today is empty (0 items), **when** user enters review state, **then** the system shows "Day closed" or equivalent completion state with no item list, and user can still confirm/dismiss.
4. The review flow is read-only: no mutations to planning state. All displayed data comes from existing projections and cap configuration.
5. Review panel uses non-punitive, confirmation-oriented copy: "Review Plan", "Ready to execute", "Confirm" — never blame-framing.

## Tasks / Subtasks

- [x] Add review panel HTML elements to planning Blade template (AC: 1, 2, 3, 5)
  - [x] Add `#review-plan-btn` button in or near the Today section header (visible whenever Today section is visible).
  - [x] Add `#review-panel` container (hidden by default with `hidden` class) containing:
    - `#review-item-list` — read-only summary of current Today items.
    - `#review-cap-status` — element showing cap status (e.g., "3 of 3 selected").
    - `#review-closure-state` — element showing closure state ("Planning active" when Today > 0, "Day closed" when Today = 0).
    - `#review-confirm-btn` — button to confirm plan readiness and dismiss panel.
  - [x] Ensure all new elements have appropriate `aria-*` labels and are keyboard-accessible.

- [x] Wire review flow in app initialization layer (AC: 1, 2, 3, 4, 5)
  - [x] Extend `readUi()` in `initializePlanningInboxApp.js` to include new elements: `reviewPlanBtn`, `reviewPanel`, `reviewItemList`, `reviewCapStatus`, `reviewClosureState`, `reviewConfirmBtn`.
  - [x] Implement `showReviewPanel()`: reads current Today projection and cap, renders read-only item list in `#review-item-list`, updates `#review-cap-status` and `#review-closure-state`, shows panel.
  - [x] Wire `#review-plan-btn` click: calls `showReviewPanel()`.
  - [x] Wire `#review-confirm-btn` click: hides panel, no state mutation.
  - [x] Extend `clearPlanningProjectionUi()` to hide `reviewPanel` when startup fails (consistency with over-cap and closure panels).

- [x] Add integration tests for review flow (AC: 1–5)
  - [x] "shows review panel with Today items when Review Plan clicked": seeds tasks with todayIncluded=true, initializes app, clicks review-plan-btn, asserts review panel visible, items listed, cap status and closure state correct.
  - [x] "review confirm dismisses panel without mutation": seeds Today items, opens review panel, clicks confirm, asserts panel hidden and Today items unchanged.
  - [x] "shows day closed state when Today empty on review": initializes app with no Today items, clicks review-plan-btn, asserts closure state shows "Day closed" and no item list.

## Dev Notes

### Developer Context Section

- Story 1.7 delivers the "review before execution" moment in the core planning loop: `Inbox -> Finite Today -> [Review] -> Execute -> Explicit Closure`. This is a read-only UX story: no mutations, no invariant layer changes.
- Prior stories provide all prerequisites:
  - Story 1.2: deterministic Today projection.
  - Story 1.4: Today cap configuration.
  - Story 1.6: closure panel pattern (hidden panel, per-section structure) — reuse the same architectural pattern for the review panel.
- The review panel is a confirmation step: user sees current plan, cap, and closure state, then confirms readiness. No data changes.

### Semantic Naming Rules (Non-Negotiable)

- The domain concept for entering review is **"Review Plan"** in the UI copy.
- The domain concept for confirming readiness is **"Ready to execute"** or **"Confirm"** in the UI copy.
- Closure state in review: **"Planning active"** when Today has items; **"Day closed"** when Today = 0.
- Do NOT use "Lock", "Commit", "Finalize" or synonyms that imply state mutation. Domain lexicon is English and canonical.

### Technical Requirements

- Review panel is read-only: use `computeTodayProjection` and `readTodayCap` only. No `mutatePlanningState` calls.
- Reuse the same `refreshInbox()` / projection pattern: `showReviewPanel()` should call `listInboxTasks()`, filter with `isValidTaskRecord`, compute `computeTodayProjection`, then render.
- Panel structure follows `closure-panel` and `over-cap-panel`: hidden `div` with `hidden` class, revealed programmatically, dismissible via button.

### Architecture Compliance

- Preserve local source-of-truth: review reads from IndexedDB via existing `listInboxTasks` and `readTodayCap`. No server calls.
- Keep logic within planning boundaries: all changes in `resources/js/features/planning/**`.
- No invariant layer changes: this story adds no new actions to `mutatePlanningState`.
- No TypeScript, no framework rewrites. JavaScript ESM only.

### Library / Framework Requirements

- Frontend: JavaScript ESM under Vite setup.
- Testing: Vitest + `happy-dom`.
- No new npm dependencies.
- HTML: native DOM manipulation (consistent with `renderTodayProjection`, `closure-panel`).

### File Structure Requirements

**Modify:**
- `resources/views/planning.blade.php` — add review panel HTML elements.
- `resources/js/features/planning/app/initializePlanningInboxApp.js` — extend `readUi()`, add `showReviewPanel()`, wire review-plan-btn and review-confirm-btn.
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js` — add review integration tests.

**Create:** None.

### Testing Requirements

- Integration tests use the same pattern as closure tests:
  - `vi.mock` for `inboxTaskStore`, `addToToday`, `bulkAddToToday`, `createInboxTask`, `todayCapStore`.
  - `buildAppHtml()` in tests must include new review panel elements.
  - `await initializePlanningInboxApp(document)` + `flushAsyncWork()` pattern.
- Review test scenarios:
  - Review panel shown when Today has items; cap status and closure state correct.
  - Confirm button dismisses panel without mutation.
  - Empty Today shows "Day closed" state in review.
- Ensure existing tests remain green.

### Previous Story Intelligence

- Story 1.6 introduced the closure panel pattern: hidden panel, `showClosurePanel()`, `updateClosurePanel()`, cancel button. The review panel follows the same pattern but is simpler (no per-item actions, no async mutations).
- Story 1.3 introduced the over-cap panel: `showOverCapPanel(tasks)` with item list and cancel. Review panel is similar: item list (read-only), status lines, confirm button.
- Story 1.6 code review fixes: use dedicated error element (`#closure-error`) for panel-specific errors; avoid double `listInboxTasks` calls. For review, there are no mutations so no error handling needed — but ensure `showReviewPanel()` uses `refreshInbox()` result or a single `listInboxTasks` call if it needs fresh data.

### Git Intelligence Summary

- Recent work: extend persistence → invariant guardrail → app wiring → tests. Story 1.7 skips persistence and invariant layers; only app wiring + tests.
- Test fixture: `buildAppHtml()` in `initializePlanningInboxApp.test.js` must include all new DOM elements.

### Project Structure Notes

- Planning feature: `resources/js/features/planning/` with `app/`, `commands/`, `persistence/`, `projections/`, `invariants/`.
- Blade template: `resources/views/planning.blade.php`. Review panel elements go within `#planning-app`, in the Today section (after closure-panel, before section close).

### Review Panel HTML Specification

Add to `planning.blade.php` within the Today section, after `#closure-panel`:

```html
<!-- Review Plan Button (in Today section header area, near Close Day) -->
<button type="button" id="review-plan-btn"
  class="rounded border border-blue-300 bg-white px-3 py-1 text-sm text-blue-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
  aria-label="Review current plan before execution">
  Review Plan
</button>

<!-- Review Panel (hidden by default) -->
<div id="review-panel" class="mt-4 hidden rounded-md border border-blue-200 bg-blue-50 p-4" role="region" aria-label="Plan review">
  <h3 class="mb-2 text-sm font-semibold text-blue-900">Your plan for today</h3>
  <ul id="review-item-list" class="space-y-2"></ul>
  <p id="review-cap-status" class="mt-2 text-sm text-blue-800"></p>
  <p id="review-closure-state" class="mt-1 text-sm text-blue-800"></p>
  <button type="button" id="review-confirm-btn"
    class="mt-3 rounded border border-blue-200 bg-white px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600">
    Ready to execute
  </button>
</div>
```

Item rows in `#review-item-list` (read-only, no action buttons):

```html
<li class="rounded border border-blue-200 bg-white px-3 py-2 text-sm text-blue-900">{task.title}</li>
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7]
- [Source: _bmad-output/planning-artifacts/prd.md#FR8]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1 - 2-Minute Planning Loop]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles]
- [Source: _bmad-output/implementation-artifacts/1-6-explicit-end-of-day-closure-flow.md]
- [Source: resources/js/features/planning/app/initializePlanningInboxApp.js]
- [Source: resources/views/planning.blade.php]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- `npm run test:js -- resources/js/features/planning/app/initializePlanningInboxApp.test.js`
- `npm run test:js`

### Completion Notes List

- Added Review Plan button and review panel to planning Blade template.
- Implemented showReviewPanel() as async read-only flow: listInboxTasks → computeTodayProjection → render items, cap status, closure state.
- Wired review-plan-btn and review-confirm-btn; extended clearPlanningProjectionUi to hide review panel.
- Added 3 integration tests for review flow; all 96 tests pass.
- Code review fixes applied: hides review item list for empty Today state, adds review-scoped error message container, and sets focus to review confirm button on panel open.
- Expanded review integration tests to assert read-only behavior across mutation commands and review error-path behavior; full suite now passes 97/97.

### File List

- _bmad-output/implementation-artifacts/1-7-daily-plan-review-before-execution.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- resources/views/planning.blade.php
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js

### Change Log

- 2026-02-23: Created Story 1.7 with comprehensive review flow guidance; set status to ready-for-dev.
- 2026-02-23: Implemented Story 1.7 daily plan review; added Review Plan button, review panel, wiring, and integration tests. Status set to review.
- 2026-02-23: Addressed code-review findings; fixed AC3 empty-state behavior, review-panel scoped error handling, keyboard focus management, and strengthened integration tests. Status set to done.

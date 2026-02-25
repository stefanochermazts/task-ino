# Story 1.4: Configure Personal Today Cap

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want to set and update my personal Today cap,
so that the daily plan matches my working capacity.

## Acceptance Criteria

1. Given default cap exists, when user sets a new valid cap value, then the new cap is saved locally and applied to Today behavior.
2. Given cap is updated, when Today projection is refreshed, then projection and indicators reflect updated cap consistently.

## Tasks / Subtasks

- [x] Add cap configuration persistence and read path (AC: 1, 2)
  - [x] Centralize cap read/write in planning persistence layer (reuse existing localStorage key `planning.todayCap`).
  - [x] Export `readTodayCap` utility and add `saveTodayCap(value)` for persistence.
  - [x] Ensure `parseTodayCap` in `computeTodayProjection.js` remains the single source of validation for cap parsing.
- [x] Add cap configuration UI (AC: 1)
  - [x] Add editable cap control in Today section (inline input or control near cap indicator).
  - [x] Validate user input: positive integer only; reject invalid values with inline feedback.
  - [x] On valid save: persist to localStorage, trigger projection refresh, update indicators immediately.
- [x] Wire cap changes into projection refresh (AC: 2)
  - [x] Ensure `initializePlanningInboxApp` reads cap from centralized `readTodayCap` (already done).
  - [x] Add cap-change handler that calls `saveTodayCap`, then `refreshInbox` (or equivalent).
  - [x] Verify Today projection and `#today-cap-value` / `#today-count` update correctly after cap change.
- [x] Add automated tests (AC: 1, 2)
  - [x] Unit tests for `saveTodayCap` / `readTodayCap` persistence and round-trip.
  - [x] Test that cap change triggers projection refresh and UI update.
  - [x] Test invalid cap input (non-integer, zero, negative) is rejected.

## Dev Notes

### Developer Context Section

- Story 1.4 enables user-configurable Today cap. Story 1.2 established deterministic Today projection that accepts `todayCap` from `readTodayCap()`. The projection and display logic already consume cap; this story adds the **user-facing control** to change it.
- Cap is currently read from `localStorage.getItem('planning.todayCap')` in `initializePlanningInboxApp.js` via inline `readTodayCap()`. The projection uses `DEFAULT_TODAY_CAP` (3) when no valid value exists. Persistence must remain local-only; no backend.
- UX: cap indicator must be visible and updatable. UX spec says "always-visible cap indicator without punitive framing" and "Today cap indicator and closure affordance MUST remain visible at all breakpoints." Over-cap guidance is Story 1.3; this story is scope-limited to configuration only.

### Technical Requirements

- Cap MUST be persisted locally (localStorage is acceptable; existing pattern uses `planning.todayCap`).
- Cap value MUST be a positive integer. Reject zero, negative, non-numeric, or invalid input.
- Cap change MUST trigger immediate projection refresh and UI update.
- Reuse `DEFAULT_TODAY_CAP` from `computeTodayProjection.js` for fallback; avoid duplicating the constant.
- `parseTodayCap` in `computeTodayProjection.js` remains the canonical parser; UI validation should align with it (positive integer).

### Architecture Compliance

- Local browser store is authoritative; no server dependency for cap.
- Keep cap logic within planning feature boundaries (`resources/js/features/planning/**`).
- No invariant enforcement changes in this story (cap enforcement is Story 1.3).
- Config and constants remain centralized; avoid duplicated cap constants.

### Library / Framework Requirements

- Frontend implementation MUST remain JavaScript ESM under existing Vite setup.
- Reuse existing planning modules (`commands`, `persistence`, `projections`, `app`).
- No TypeScript or new state-management libraries.

### File Structure Requirements

- Cap read/write: add to `resources/js/features/planning/persistence/**` (e.g. `todayCapStore.js` or extend existing store) or keep in `app/` if minimal; avoid scattering logic.
- Cap UI: add to `resources/views/planning.blade.php` Today section and wire in `initializePlanningInboxApp.js`.
- Tests: `resources/js/features/planning/**/*.test.js` per existing conventions.

### Testing Requirements

- Unit tests for cap persistence (save/read round-trip).
- Tests for invalid cap input rejection.
- Tests that cap change triggers projection refresh and UI update.
- Keep tests isolated; avoid order-dependent fixtures.

### Previous Story Intelligence

- Story 1.2 established `computeTodayProjection` with `todayCap` input, `DEFAULT_TODAY_CAP`, and `parseTodayCap`. Do not change projection contract; only add the configuration UI and persistence.
- Story 1.2 introduced `readTodayCap()` inline in `initializePlanningInboxApp.js` reading from `localStorage`. Extract or centralize this into a persistence module and add `saveTodayCap`.
- `renderTodayProjection` displays `cap` and `todayCapValue`; ensure cap updates flow through `refreshInbox` -> `computeTodayProjection` -> `renderTodayProjection`.
- Vitest + jsdom for frontend tests; PHPUnit for feature tests if needed.

### Project Structure Notes

- Primary touchpoints:
  - `resources/js/features/planning/projections/computeTodayProjection.js` (DEFAULT_TODAY_CAP, parseTodayCap)
  - `resources/js/features/planning/app/initializePlanningInboxApp.js` (readTodayCap, refreshInbox)
  - `resources/js/features/planning/projections/renderTodayProjection.js` (cap display)
  - `resources/views/planning.blade.php` (Today section, cap indicator)
- New: `persistence/todayCapStore.js` or equivalent for read/write; cap control in planning blade.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Local Source of Truth]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Today cap indicator]
- [Source: _bmad-output/implementation-artifacts/1-2-deterministic-today-projection-from-local-state.md]

## Dev Agent Record

### Agent Model Used

(To be filled by dev agent)

### Debug Log References

- `npm run test:js` (red-green-refactor for todayCapStore and cap change flow)
- `php artisan test` (full suite pass)

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added `todayCapStore.js` with `readTodayCap` and `saveTodayCap` using `DEFAULT_TODAY_CAP` from computeTodayProjection.
- Replaced inline readTodayCap in initializePlanningInboxApp with todayCapStore import.
- Added cap configuration UI: number input in Today section with change handler, validation, and inline feedback.
- Cap change persists to localStorage and triggers refreshInbox for immediate projection/indicator update.
- Added todayCapStore unit tests (10) and initializePlanningInboxApp tests for cap change and invalid input (2 new).

### File List

- _bmad-output/implementation-artifacts/1-4-configure-personal-today-cap.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- resources/js/features/planning/persistence/todayCapStore.js
- resources/js/features/planning/persistence/todayCapStore.test.js
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js
- resources/views/planning.blade.php

### Change Log

- 2026-02-23: Implemented Story 1.4 Configure Personal Today Cap: todayCapStore, cap UI, projection refresh wiring, tests.
- 2026-02-23: Code review remediation: saveTodayCap try/catch for localStorage failure; refreshInbox error routed to todayCapFeedback; null guards on todayCapFeedback and ui.form. Story moved to done.

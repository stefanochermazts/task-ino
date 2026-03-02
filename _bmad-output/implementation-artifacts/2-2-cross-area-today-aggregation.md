# Story 2.2: Cross-Area Today Aggregation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want Today to aggregate tasks across areas coherently,
so that my daily decisions stay centralized.

## Acceptance Criteria

1. **Given** tasks exist across multiple areas, **when** user opens Today, **then** Today shows cross-area items according to deterministic projection rules.
2. **And** area origin remains visible without fragmenting the Today decision surface.

## Tasks / Subtasks

- [x] Extend Today projection to surface area context (AC: 1, 2)
  - [x] Ensure `computeTodayProjection` receives all tasks (no area filter); projection already aggregates by `todayIncluded` only.
  - [x] Pass `area` (or default `'inbox'`) through projection items so render can display area origin.

- [x] Add area origin visibility to Today UI (AC: 2)
  - [x] Extend `renderTodayProjection` to show area label/badge per task (e.g. compact badge: "Inbox", "Work", "Personal").
  - [x] Keep single unified Today list; no fragmentation into separate area sections.
  - [x] Ensure area display is readable and non-intrusive (e.g. small text, muted color).

- [x] Add automated tests (AC: 1, 2)
  - [x] Unit tests: `computeTodayProjection` with cross-area tasks returns correct items.
  - [x] Unit tests: `renderTodayProjection` renders area labels when present.
  - [x] Integration tests: Today list shows tasks from multiple areas with area origin visible.

## Dev Notes

### Epic 1 Retrospective – Panel Pattern (MANDATORY)

**Seguire pattern panel Epic 1: elemento errore dedicato + toggle hidden.**

When adding any new panel: dedicated error element, visibility toggling, focus management, error-path tests.

Reference: `_bmad-output/project-context.md` § Panel Error Elements.

### Developer Context Section

- Story 2.2 builds on Story 2.1: tasks already have `area` field; `areaStore` and `listAreas` exist; Today projection uses `computeTodayProjection` and does NOT filter by area.
- `computeTodayProjection` already aggregates across areas: it filters by `todayIncluded === true` only. No change needed to aggregation logic.
- The change is **visibility**: Today items must show their area origin (e.g. "Inbox", "Work") so the user knows where each task came from, without splitting Today into multiple surfaces.
- UX: single Today list; area as a small badge or label per item. Non-punitive, minimal visual weight.

### Technical Requirements

- `computeTodayProjection` input: `{ tasks, todayCap }`. Tasks are full task objects; `area` is preserved on each.
- Projection items already include `id`, `title`, `todayIncluded`; ensure `area` (or default `'inbox'`) is passed through.
- `renderTodayProjection` receives `todayProjection` with `items`; each item must expose `area` for display.
- Area display: use `listAreas` or equivalent for human-readable labels (e.g. `'inbox'` → "Inbox").

### Architecture Compliance

- Local browser store remains authoritative; no server dependency.
- Keep logic within `resources/js/features/planning/**`.
- No changes to invariant layer; Today projection is read-only.
- No TypeScript or new state-management libraries.

### Library / Framework Requirements

- Frontend: JavaScript ESM under Vite setup.
- Testing: Vitest + happy-dom.
- Reuse existing planning modules (`projections`, `app`, `persistence/areaStore`).

### File Structure Requirements

**Modify:**
- `resources/js/features/planning/projections/renderTodayProjection.js` — add area label per task.
- `resources/js/features/planning/projections/computeTodayProjection.js` — ensure `area` (or default) is passed through on items (likely already present if tasks have it).
- `resources/js/features/planning/app/initializePlanningInboxApp.js` — ensure `refreshInbox` / Today projection passes full task objects including `area`.

**Tests:**
- `resources/js/features/planning/projections/computeTodayProjection.test.js` — cross-area aggregation.
- `resources/js/features/planning/projections/renderTodayProjection.test.js` — area label rendering.
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js` — integration: Today shows cross-area tasks with area visible.

### Testing Requirements

- Unit tests: `computeTodayProjection` with tasks from `inbox` and `work` returns both; deterministic ordering.
- Unit tests: `renderTodayProjection` renders area labels when present; no label when area missing (backward compat).
- Integration tests: Today list shows tasks from multiple areas with area origin visible.

### Previous Story Intelligence

- **Story 2.1:** `areaStore`, `listAreas`, `setTaskArea`, area filtering in Inbox; `computeTodayProjection` and Today projection left unchanged. Tasks have `area` field; `createInboxTask` sets `area: 'inbox'`.
- **Story 1.8:** `refreshInbox` loads all tasks; `computeTodayProjection` receives all tasks. Projection rebuild path is deterministic.
- **Epic 1 panels:** Dedicated error element; `hidden` toggle; focus on open; error-path tests assert `textContent` and `classList.contains('hidden')`.

### Project Structure Notes

- Planning feature: `resources/js/features/planning/` with `app/`, `projections/`, `persistence/`.
- Blade: `resources/views/planning.blade.php` — Today section unchanged structurally; only projection render output changes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR15]
- [Source: _bmad-output/planning-artifacts/architecture.md#Domain Core]
- [Source: resources/js/features/planning/projections/computeTodayProjection.js]
- [Source: resources/js/features/planning/projections/renderTodayProjection.js]
- [Source: resources/js/features/planning/persistence/areaStore.js]

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Cursor)

### Debug Log References

`npm run test:js` (Vitest): 140 passing.

### Completion Notes List

- Extended `computeTodayProjection` to pass `area` (default `'inbox'`) through projection items.
- Extended `renderTodayProjection` to show area label per task (compact, muted style).
- Added unit tests for cross-area aggregation and area label rendering; integration test for Today cross-area flow.
- Review fixes: hardened area rendering for non-string values and added app-level integration assertion using real `renderTodayProjection`.

### File List

**Modified:**
- `resources/js/features/planning/projections/computeTodayProjection.js`
- `resources/js/features/planning/projections/computeTodayProjection.test.js`
- `resources/js/features/planning/projections/renderTodayProjection.js`
- `resources/js/features/planning/projections/renderTodayProjection.test.js`
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-02-23: Implemented Story 2.2 cross-area Today aggregation (area in projection items, area labels in Today UI, tests). Status set to review.
- 2026-02-23: Addressed code review findings (real app integration assertion for Today area origin, safe non-string area rendering), status set to done.

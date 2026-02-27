# Story 2.1: Area-Based Task Organization

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want to organize tasks by areas (including Inbox),
so that planning context remains structured and understandable.

## Acceptance Criteria

1. **Given** tasks exist in local state, **when** user assigns or changes task area, **then** the task appears in the selected area context.
2. **And** task identity and core metadata remain intact across area changes.
3. **And** area assignment persists locally and survives reload (IndexedDB).
4. **And** Inbox remains a valid area; at least one additional area is available for assignment.

## Tasks / Subtasks

- [x] Extend persistence and domain for area support (AC: 1, 2, 3, 4)
  - [x] Ensure `inboxTaskStore` tasks support `area` field (already present; default `'inbox'`).
  - [x] Add `areaStore` or equivalent: list of user-defined areas (Inbox + optional others). Persist in localStorage or IndexedDB.
  - [x] Add `setTaskArea(taskId, areaId)` mutation in `inboxTaskStore`: validate task exists, set `area`, update `updatedAt`.
  - [x] Route `setTaskArea` through `mutatePlanningState` in `mutationGuardrail.js` (new action `setTaskArea`).

- [x] Add area assignment UI (AC: 1, 2, 4)
  - [x] Add affordance to assign/change task area (e.g. dropdown, select, or area picker per task).
  - [x] If area picker or modal is used: follow **Epic 1 panel pattern** (see Dev Notes).
  - [x] Wire area change to `setTaskArea` command; on success: `refreshInbox()`; on failure: show feedback in area-scoped error element.

- [x] Integrate area filtering into projection (AC: 1, 4)
  - [x] Extend `renderInboxProjection` to filter by selected area (or show all areas with section headers).
  - [x] Ensure `computeTodayProjection` and Today projection remain unchanged (Story 2.2 handles cross-area Today).
  - [x] Area list/selector visible in planning UI; user can switch area context.

- [x] Add area management (create/rename areas) (AC: 4)
  - [x] Allow user to create at least one additional area beyond Inbox.
  - [x] Persist area list; Inbox is immutable; other areas are user-defined.

- [x] Add automated tests (AC: 1–4)
  - [x] Unit tests for `setTaskArea` in persistence and guardrail.
  - [x] Integration tests for area assignment flow and UI feedback.
  - [x] Tests for area persistence and reload.

## Dev Notes

### Epic 1 Retrospective – Panel Pattern (MANDATORY)

**Seguire pattern panel Epic 1: elemento errore dedicato + toggle hidden.**

When adding any new panel (e.g. area picker, area creation modal):

- **Dedicated error element:** Add `<p id="<panel>-error" class="hidden"></p>` inside the panel.
- **Visibility toggling:** When showing error: `element.textContent = message; element.classList.remove('hidden')`. When clearing: `element.textContent = ''; element.classList.add('hidden')`.
- **Focus management:** On panel open, set focus to primary control (first button or confirm).
- **Error-path tests:** Assert both `textContent` and `classList.contains('hidden')` in integration tests.

Reference: `_bmad-output/project-context.md` § Panel Error Elements.

### Developer Context Section

- Story 2.1 introduces the **area** concept as the primary organizational dimension. Epic 1 already has `area: 'inbox'` on tasks; this story extends it with user-defined areas and assignment UI.
- Epic 2 builds on Epic 1: deterministic projection, invariant layer, persistence, and projection refresh patterns remain unchanged. All mutations MUST pass through `mutatePlanningState`.
- UX: area-based organization is non-punitive; Inbox is a first-class area. Additional areas are optional and user-created.
- Scope: area assignment and filtering only. Cross-area Today aggregation is Story 2.2; move/reschedule is Story 2.3+.

### Technical Requirements

- `area` field: string identifier (e.g. `'inbox'`, `'work'`, `'personal'`). Inbox is reserved; `area === 'inbox'` or `area === 'Inbox'` per domain lexicon.
- Area list: persisted locally (localStorage or IndexedDB); Inbox always present; user can add more.
- `setTaskArea` MUST validate task existence and area membership; return `{ ok: true }` or `{ ok: false, code, message }`.
- All area mutations go through invariant layer; no UI-direct store writes.

### Architecture Compliance

- Local browser store remains authoritative; no server dependency for areas.
- Keep logic within `resources/js/features/planning/**`.
- Extend `mutatePlanningState` with `setTaskArea` action; follow existing pattern (addToToday, removeFromToday, pauseTask).
- No TypeScript or new state-management libraries.

### Library / Framework Requirements

- Frontend: JavaScript ESM under Vite setup.
- Testing: Vitest + happy-dom.
- Reuse existing planning modules (`commands`, `persistence`, `projections`, `app`, `invariants`).

### File Structure Requirements

**Modify:**
- `resources/js/features/planning/persistence/inboxTaskStore.js` — add `setTaskArea` (or equivalent).
- `resources/js/features/planning/invariants/mutationGuardrail.js` — add `setTaskArea` action.
- `resources/js/features/planning/projections/renderInboxProjection.js` — area filter/selector, area assignment affordance.
- `resources/js/features/planning/app/initializePlanningInboxApp.js` — wire area selection and handlers.

**Create:**
- `resources/js/features/planning/commands/setTaskArea.js` — thin wrapper.
- `resources/js/features/planning/persistence/areaStore.js` (or equivalent) — area list persistence.

**Tests:**
- `resources/js/features/planning/persistence/inboxTaskStore.test.js` — extend for setTaskArea.
- `resources/js/features/planning/invariants/mutationGuardrail.test.js` — extend for setTaskArea action.
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js` — area assignment integration tests.

### Testing Requirements

- Unit tests for `setTaskArea`: happy path, task not found, invalid area.
- Unit tests for area store: list, add, persist, reload.
- Integration tests: assign area, verify task appears in area context, refresh, reload.
- Error-path tests: assert error text AND visibility (`hidden` class).

### Previous Story Intelligence

- **Story 1.8:** Startup/reload uses `refreshInbox`; area persistence must survive reload. Reuse same projection rebuild path.
- **Story 1.6/1.7:** Panel pattern: hidden panel, dedicated error element, focus on open, visibility toggling. Apply to any new panel.
- **Story 1.5:** `mutatePlanningState` extension pattern: add action branch, `normalizeResult`, return domain codes.
- **Story 1.3:** Over-cap panel: `showOverCapPanel`, per-item buttons, cancel. Area picker can follow similar pattern.

### Project Structure Notes

- Planning feature: `resources/js/features/planning/` with `app/`, `commands/`, `persistence/`, `projections/`, `invariants/`.
- Blade: `resources/views/planning.blade.php`. Area UI elements added within `#planning-app`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR10]
- [Source: _bmad-output/planning-artifacts/architecture.md#Domain Core]
- [Source: _bmad-output/implementation-artifacts/epic-1-retro-2026-02-23.md#Action Items]
- [Source: _bmad-output/project-context.md#Panel Error Elements]
- [Source: resources/js/features/planning/commands/createInboxTask.js]
- [Source: resources/js/features/planning/invariants/mutationGuardrail.js]

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Cursor)

### Debug Log References

`npm run test:js` (Vitest): 133 passing.

### Completion Notes List

- Implemented area persistence (`areaStore`) and area mutation (`setTaskArea`) through invariant guardrail.
- Added UI: area selector + per-task area dropdown + add-area panel following Epic 1 error element pattern (`#add-area-error` + `hidden` toggling).
- Added/extended tests for persistence, invariant validation, and UI flows (area filtering + setTaskArea refresh/feedback).

### File List

**Created:**
- `resources/js/features/planning/persistence/areaStore.js`
- `resources/js/features/planning/persistence/areaStore.test.js`
- `resources/js/features/planning/commands/setTaskArea.js`

**Modified:**
- `resources/js/features/planning/persistence/inboxTaskStore.js`
- `resources/js/features/planning/persistence/inboxTaskStore.test.js`
- `resources/js/features/planning/invariants/mutationGuardrail.js`
- `resources/js/features/planning/invariants/mutationGuardrail.test.js`
- `resources/js/features/planning/projections/renderInboxProjection.js`
- `resources/js/features/planning/projections/renderInboxProjection.test.js`
- `resources/js/features/planning/app/initializePlanningInboxApp.js`
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js`
- `resources/views/planning.blade.php`

## Senior Developer Review (AI)

- ✅ ACs 1–4 implemented and verified by automated tests.
- ✅ Added integration coverage for area filtering and area assignment handler behavior.

## Change Log

- 2026-02-23: Implemented Story 2.1 end-to-end (areas persistence, setTaskArea mutation + guardrail, UI filtering/assignment, add-area panel, and tests). Status set to done.

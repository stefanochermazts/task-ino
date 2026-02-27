# Story 2.3: Single-Item Move (Area and Today Membership)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want to move a task between areas or Today membership without changing its date,
so that structural reorganization is fast and predictable.

## Acceptance Criteria

1. **Given** a task exists in a valid planning context, **when** user performs a move action, **then** area or Today membership is updated correctly.
2. **And** move action does not imply or apply temporal reschedule.

## Tasks / Subtasks

- [x] Add single-item move command path (AC: 1, 2)
  - [x] Add/extend command(s) to support explicit move semantics for one task:
    - area-only move (`setTaskArea`)
    - Today-membership-only move (`addToToday` / `removeFromToday`)
  - [x] Ensure move operations keep `createdAt` unchanged and never touch temporal scheduling fields.

- [x] Integrate move affordances in UI (AC: 1, 2)
  - [x] In Inbox area context, keep per-task area change and Today inclusion controls clearly independent.
  - [x] Ensure area move does not auto-add/remove from Today.
  - [x] Ensure Today move (add/remove) does not change area ownership.

- [x] Enforce invariant-safe behavior (AC: 1, 2)
  - [x] Route all write actions through `mutatePlanningState`.
  - [x] Preserve guardrails for cap and validity (`TODAY_CAP_EXCEEDED`, `TASK_NOT_FOUND`, etc.).
  - [x] Keep move semantics structural only (no date/temporal mutation side effects).

- [x] Add automated tests (AC: 1, 2)
  - [x] Unit tests for move semantics (area move vs Today move) ensuring no temporal field mutation.
  - [x] Integration tests for single-item move UI flow and deterministic projection refresh.
  - [x] Regression tests verifying area move and Today move are independent actions.

## Dev Notes

### Epic 1 Retrospective – Panel Pattern (MANDATORY)

**Seguire pattern panel Epic 1: elemento errore dedicato + toggle hidden.**

When adding any new panel (if needed for move flow):

- **Dedicated error element:** Add `<p id="<panel>-error" class="hidden"></p>` inside the panel.
- **Visibility toggling:** Show: `el.textContent = msg; el.classList.remove('hidden')`; clear: `el.textContent = ''; el.classList.add('hidden')`.
- **Focus management:** On panel open, set focus to primary control.
- **Error-path tests:** Assert both `textContent` and `classList.contains('hidden')`.

Reference: `_bmad-output/project-context.md` § Panel Error Elements.

### Developer Context Section

- Story 2.2 is complete: Today now shows area origin in a unified list.
- Story 2.1 already introduced area persistence and assignment (`areaStore`, `setTaskArea`).
- Story 2.3 must clarify and enforce **structural move semantics**:
  - area move and Today-membership move are separate operations
  - neither operation implies temporal reschedule.
- Reuse existing projection refresh path (`refreshInbox`) and invariant layer pattern.

### Technical Requirements

- Task identity and metadata integrity must be preserved:
  - `id`, `title`, `createdAt` unchanged by move operations
  - only relevant structural fields change (`area`, `todayIncluded`, `updatedAt`)
- Temporal scheduling context must not change during move operations.
- Use existing command/invariant stack:
  - `setTaskArea`
  - `addToToday`
  - `removeFromToday`
  - `mutatePlanningState`

### Architecture Compliance

- Local browser store remains authoritative; no server dependency.
- Keep logic within `resources/js/features/planning/**`.
- All writes through invariant guardrail; no UI direct store writes.
- No TypeScript or new state-management libraries.

### Library / Framework Requirements

- Frontend: JavaScript ESM under Vite setup.
- Testing: Vitest + happy-dom.
- Reuse current planning modules (`commands`, `invariants`, `persistence`, `projections`, `app`).

### File Structure Requirements

**Likely modify:**
- `resources/js/features/planning/app/initializePlanningInboxApp.js` — wire explicit move flows and refresh semantics.
- `resources/js/features/planning/projections/renderInboxProjection.js` — keep clear separation between area control and Today control.
- `resources/js/features/planning/invariants/mutationGuardrail.js` — preserve/extend move validation and deterministic domain codes.
- `resources/js/features/planning/persistence/inboxTaskStore.js` — ensure structural fields only are mutated by move operations.

**Likely tests:**
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js`
- `resources/js/features/planning/projections/renderInboxProjection.test.js`
- `resources/js/features/planning/invariants/mutationGuardrail.test.js`
- `resources/js/features/planning/persistence/inboxTaskStore.test.js`

### Testing Requirements

- Unit: area move updates `area` only (plus `updatedAt`) and keeps `createdAt`.
- Unit: Today move updates `todayIncluded` only (plus `updatedAt`) and keeps `area`.
- Integration: user can move one item by area and independently by Today membership in deterministic UI refresh.
- Regression: no hidden coupling where area move alters Today membership or vice versa.

### Previous Story Intelligence

- **Story 2.1:** area assignment command/invariant/persistence and area management already established.
- **Story 2.2:** Today cross-area aggregation with area origin visibility now stable.
- **Story 1.5:** all mutations must go through centralized invariant layer with stable domain error codes.

### Project Structure Notes

- Planning feature path: `resources/js/features/planning/` with `app/`, `commands/`, `persistence/`, `invariants/`, `projections/`.
- Blade remains `resources/views/planning.blade.php`; avoid unnecessary structural changes unless required by AC.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR11]
- [Source: _bmad-output/planning-artifacts/architecture.md#Domain Core]
- [Source: _bmad-output/implementation-artifacts/2-1-area-based-task-organization.md]
- [Source: _bmad-output/implementation-artifacts/2-2-cross-area-today-aggregation.md]

## Dev Agent Record

### Agent Model Used

(To be filled by dev agent)

### Debug Log References

### Completion Notes List

### File List

**Modified:**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status transitions (`ready-for-dev` → `in-progress` → `review`)
- `resources/js/features/planning/app/initializePlanningInboxApp.js` — wire onRemoveFromToday callback to renderTodayProjection
- `resources/js/features/planning/projections/renderTodayProjection.js` — add onRemoveFromToday option and Remove from Today button per Today item
- `resources/js/features/planning/projections/renderTodayProjection.test.js` — tests for Remove from Today button and callback
- `resources/js/features/planning/persistence/inboxTaskStore.test.js` — unit tests for move semantics (createdAt preserved, area/Today independence)
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js` — integration test for Remove from Today flow, updated renderTodayProjection call assertion

### Senior Developer Review (AI)

- Outcome: **Approved after fixes**
- Fixed MEDIUM findings from code review:
  - Added missing `_bmad-output/implementation-artifacts/sprint-status.yaml` entry in File List for traceability.
  - Added integration test for `Remove from Today` error path (feedback shown, no refresh on blocked mutation).
  - Added integration test ensuring area move keeps Today membership unchanged in app flow.
- Verification: `npm run test:js` passed (`150` tests).

### Change Log

- 2026-02-23: Applied code-review follow-up fixes (MEDIUM issues), added integration coverage gaps, and finalized story status to `done`.

# Story 2.6: Daily Cycle Continuity Enforcement

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want continuity rules across day boundaries to be strict and deterministic,
so that Today never drifts through implicit carry-over behavior.

## Acceptance Criteria

1. **Given** unfinished items exist at day boundary, **when** the next day cycle starts, **then** system MUST NOT auto-populate Today with unfinished items from previous day.
2. **And** only explicitly rescheduled or explicitly retained items appear.
3. **And** projection rebuild after day change is deterministic.

## Tasks / Subtasks

- [x] Add deterministic day-boundary continuity command path (AC: 1, 2, 3)
  - [x] Introduce explicit day-cycle continuity action (e.g., `enforceDailyContinuity`) distinct from move/reschedule actions.
  - [x] Detect day-boundary transition from local persisted cycle marker (no implicit default carry-over).
  - [x] Keep behavior additive and deterministic on repeated app starts/reloads for the same day.

- [x] Implement continuity persistence behavior (AC: 1, 2, 3)
  - [x] Persist minimal day-cycle marker (e.g., `lastPlanningDate`) in local store.
  - [x] On new day, clear implicit Today carry-over candidates unless they were explicitly retained/rescheduled.
  - [x] Preserve task identity and non-target fields while applying continuity rules.

- [x] Enforce invariant-safe continuity rules (AC: 1, 2)
  - [x] Route continuity writes through `mutatePlanningState`.
  - [x] Reuse deterministic domain error style (`INVARIANT_VIOLATION`, `TASK_NOT_FOUND`, etc.).
  - [x] Prevent continuity action from mutating unrelated structural ownership (`area`) or temporal context unexpectedly.

- [x] Integrate continuity trigger into app bootstrap/rebuild path (AC: 1, 3)
  - [x] Apply continuity enforcement during deterministic startup flow before projection render.
  - [x] Keep startup idempotent and non-blocking in offline mode.
  - [x] Surface clear feedback only when continuity action applies meaningful changes.

- [x] Add automated tests (AC: 1, 2, 3)
  - [x] Unit tests for day-boundary detection and continuity mutation outcomes.
  - [x] Unit tests ensuring no implicit carry-over and no hidden side effects on `area`/`scheduledFor`.
  - [x] Integration tests for app startup across same-day vs next-day transitions.
  - [x] Regression tests ensuring projection rebuild remains deterministic after continuity enforcement.

## Dev Notes

### Epic 1 Retrospective – Panel Pattern (MANDATORY)

**Seguire pattern panel Epic 1: elemento errore dedicato + toggle hidden.**

If a dedicated continuity feedback panel/message is added:

- Use dedicated feedback/error elements with `hidden` toggling.
- Clear stale messages before each new action/render.
- Keep focus behavior deterministic when surfacing interactive continuity controls.
- Add error-path tests asserting text and hidden-state changes.

Reference: `_bmad-output/project-context.md` (critical UI and test guardrails).

### Developer Context Section

- Story 1.6 already established explicit closure decisions and “no implicit carry-over” as a product law.
- Story 1.8 established deterministic rebuild on reload from local persistence.
- Story 2.5 reinforced invariant-routed atomic behavior and explicit feedback patterns.
- Story 2.6 must enforce day-boundary continuity at cycle level without introducing hidden mutations.

### Technical Requirements

- Continuity enforcement must be deterministic and idempotent:
  - same input day/state -> same output
  - repeated startup in same day must not produce drift
- Do not auto-carry unfinished Today items into a new day.
- Only explicitly retained or explicitly rescheduled items may appear in Today after day transition.
- Preserve task invariants:
  - no implicit `area` changes
  - no unrelated temporal mutation
  - maintain identity metadata (`id`, `createdAt`) intact
- Keep behavior local-first and independent from sync/network state.

### Architecture Compliance

- Respect architecture constraint: no implicit carry-over and deterministic local planning loop.
- All write operations must pass through centralized invariant layer (`mutatePlanningState`).
- Keep implementation in `resources/js/features/planning/**`.
- Projection rebuild must remain deterministic and invariant-safe after continuity enforcement.

### Library / Framework Requirements

- JavaScript ESM only (`"type": "module"`), no TypeScript.
- Use existing stack: Vite + Vitest + happy-dom.
- No new dependencies expected for this story.
- Follow existing planning module patterns (`commands`, `invariants`, `persistence`, `app`, `projections`).

### File Structure Requirements

**Likely modify:**
- `resources/js/features/planning/app/initializePlanningInboxApp.js` — enforce continuity during startup/rebuild path.
- `resources/js/features/planning/invariants/mutationGuardrail.js` — add continuity action validation.
- `resources/js/features/planning/persistence/inboxTaskStore.js` — continuity mutation over task set (deterministic, no implicit carry-over).
- `resources/js/features/planning/persistence/` — add/read day-cycle marker store if not already present.
- `resources/js/features/planning/projections/computeTodayProjection.js` — ensure deterministic output after continuity mutation.

**Likely tests:**
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js`
- `resources/js/features/planning/invariants/mutationGuardrail.test.js`
- `resources/js/features/planning/persistence/inboxTaskStore.test.js`
- `resources/js/features/planning/projections/computeTodayProjection.test.js`

### Testing Requirements

- Unit: continuity action blocks implicit carry-over at day boundary.
- Unit: explicitly retained/rescheduled tasks remain eligible per rule.
- Integration: app startup same-day vs next-day produces deterministic and expected Today.
- Regression: no side effects on `area`, no unintended `scheduledFor` rewrites, stable projection ordering.

### Previous Story Intelligence

- **Story 1.6:** closure requires explicit decisions and forbids implicit carry-over; reuse this as continuity baseline.
- **Story 1.8:** deterministic restore/rebuild pattern should be the continuity integration anchor.
- **Story 2.5:** follow invariant-safe write path discipline and explicit outcome feedback pattern.

### Git Intelligence Summary

- Recent commit style in epic:
  - `feat(planning): ...` for implementation
  - `fix(planning): ...` for review remediations
- Recent changes concentrated under:
  - `resources/js/features/planning/app/`
  - `resources/js/features/planning/invariants/`
  - `resources/js/features/planning/persistence/`
  - `resources/js/features/planning/projections/`
- Keep changes incremental and avoid touching unrelated views/layout unless AC requires.

### Latest Tech Information

- Current baseline remains `vite@^7.3.1` and `vitest@^4.0.18`.
- No framework/library upgrade required for Story 2.6.
- Maintain fast local interactions and deterministic rebuild behavior as first-class constraints.

### Project Structure Notes

- Planning feature root: `resources/js/features/planning/` with `app/`, `commands/`, `invariants/`, `persistence/`, `projections/`.
- Keep sprint tracking and story File List synchronized to avoid review traceability findings.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6]
- [Source: _bmad-output/planning-artifacts/prd.md#FR16]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.8]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Invariant Enforcement Layer]
- [Source: _bmad-output/implementation-artifacts/2-5-bulk-selection-and-atomic-reschedule.md]
- [Source: _bmad-output/project-context.md#Critical Don't-Miss Rules]

## Dev Agent Record

### Agent Model Used

GPT-5.3 Codex (Cursor)

### Debug Log References

### Completion Notes List

- Added `dayCycleStore.js` for `lastPlanningDate` (YYYY-MM-DD) persistence in localStorage.
- Added `enforceDailyContinuity` to `inboxTaskStore`: clears `todayIncluded` for tasks not explicitly eligible; adds `todayIncluded` for tasks explicitly `scheduledFor === today` or `retainedFor === today`. Idempotent when `lastPlanningDate === today`.
- Added `enforceDailyContinuity` command and `mutatePlanningState` action; saves `lastPlanningDate` after successful continuity run.
- Added explicit retain path (`retainTaskForNextDay`) to support AC2 “explicitly retained”.
- Integrated continuity into `initializePlanningInboxApp` bootstrap: runs before `refreshInbox`.
- Unit tests: dayCycleStore, inboxTaskStore continuity, mutationGuardrail continuity. Integration: enforceDailyContinuity called before listInboxTasks on startup.

### File List

- `resources/js/features/planning/persistence/dayCycleStore.js` (new)
- `resources/js/features/planning/persistence/dayCycleStore.test.js` (new)
- `resources/js/features/planning/persistence/inboxTaskStore.js` (modified)
- `resources/js/features/planning/persistence/inboxTaskStore.test.js` (modified)
- `resources/js/features/planning/commands/enforceDailyContinuity.js` (new)
- `resources/js/features/planning/commands/retainTaskForNextDay.js` (new)
- `resources/js/features/planning/invariants/mutationGuardrail.js` (modified)
- `resources/js/features/planning/invariants/mutationGuardrail.test.js` (modified)
- `resources/js/features/planning/app/initializePlanningInboxApp.js` (modified)
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `_bmad-output/implementation-artifacts/2-6-daily-cycle-continuity-enforcement.md` (modified)

### Change Log

- 2026-02-23: Story 2.6 implementation complete. Day-boundary continuity enforced via `enforceDailyContinuity`; no implicit carry-over; only explicitly rescheduled (scheduledFor === today) items appear in Today after day transition.
- 2026-02-27: Code review fixes. Day-boundary computed in local time; explicit retain supported (`retainedFor` + `retainTaskForNextDay`); continuity includes retained items; tests expanded.

## Senior Developer Review (AI)

**Date:** 2026-02-27  
**Outcome:** Approve

### Findings addressed

- Fixed day-boundary detection to use **local day** (avoid UTC midnight drift).
- Implemented AC2 “explicitly retained” via persisted marker (`retainedFor`) and closure action (`Keep tomorrow`).
- Made day marker persistence observable via `markerSaved` without blocking app bootstrap.
- Expanded tests to cover retained continuity and closure retain action.

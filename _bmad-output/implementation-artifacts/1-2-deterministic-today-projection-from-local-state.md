# Story 1.2: Deterministic Today Projection from Local State

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want Today to be computed deterministically from local task state and cap configuration,
so that planning remains predictable and server-independent.

## Acceptance Criteria

1. Given local tasks, inclusion signals, and cap config are defined, when Today is computed or recomputed, then results are deterministic for identical input state.
2. Given identical local input state in offline and online runtime conditions, when Today is projected, then output remains equivalent and independent from backend state.
3. Given backend or sync services are unavailable, when Today projection is requested, then projection still completes from local state without blocking planning runtime.

## Tasks / Subtasks

- [x] Implement deterministic Today projection use-case from local planning state (AC: 1, 2, 3)
  - [x] Add projection command/service under `resources/js/features/planning/**` that accepts only local inputs (task snapshot, Today inclusion flags, cap config).
  - [x] Ensure projection output ordering and selection are stable for identical inputs.
  - [x] Ensure projection execution has no dependency on remote calls, sync acknowledgements, or backend data.
- [x] Define deterministic projection contract and edge-case handling (AC: 1)
  - [x] Specify and enforce tie-break rules for equal-priority/equal-timestamp cases.
  - [x] Handle incomplete/invalid local records with deterministic fallback behavior (no silent mutation).
  - [x] Keep projection logic pure/testable (same input -> same output).
- [x] Integrate projection into planning runtime read path (AC: 1, 2, 3)
  - [x] Wire Today view refresh to projection output from local state.
  - [x] Keep projection refresh non-blocking and independent from sync/network status indicators.
  - [x] Preserve UX continuity when backend/sync are unavailable (no planning freeze or modal block).
- [x] Add automated tests for determinism and server-independence (AC: 1, 2, 3)
  - [x] Unit tests covering deterministic outputs across repeated runs with same input.
  - [x] Tests validating equivalent projection result under simulated online/offline conditions.
  - [x] Tests validating projection behavior when backend/sync are unavailable.

## Dev Notes

### Developer Context Section

- Story 1.2 must establish the first deterministic Today read-model contract; this is foundational for cap enforcement (1.3, 1.4) and invariant-safe bulk behavior (1.5).
- Projection runtime authority is local-only: IndexedDB/local state is the source of truth for Today computation in both online and offline conditions.
- Keep this story strictly scoped to deterministic projection logic and integration; do not expand into closure flows, sync conflict resolution, or cross-area scheduling.
- UX intent is immediate and calm: projection refresh must remain non-blocking and must not expose technical-state complexity to planning decisions.
- Implementation must preserve a reusable projection boundary so later stories can apply cap/closure rules without rewriting projection internals.

### Technical Requirements

- Today projection MUST be computed from local persisted planning state only (tasks, inclusion flags, cap configuration).
- For identical input state, Today projection output MUST remain identical across repeated computations.
- Projection ordering/tie-break rules MUST be explicit and deterministic (no engine-dependent iteration behavior).
- Projection execution MUST NOT require backend/sync availability and MUST NOT await remote responses.
- Projection errors MUST be handled with deterministic fallback behavior that preserves planning runtime continuity.
- Projection result SHOULD expose sufficient metadata to support later invariant and cap enforcement stories without reshaping output contracts.

### Architecture Compliance

- Respect source-of-truth split: local browser store remains authoritative for Today projection runtime decisions.
- Keep projection logic within planning feature boundaries (`planning` module), without introducing coupling to sync feature internals.
- Preserve centralized invariant pipeline architecture: projection is read-model logic and must not mutate planning state directly.
- Maintain non-blocking runtime behavior: sync/network indicators remain secondary and must not gate Today computation.
- Ensure projection rebuild compatibility for later persistence/reload work (Story 1.8) by keeping deterministic input/output contracts stable.

### Library / Framework Requirements

- Frontend implementation for this story MUST remain JavaScript ESM under the existing Vite setup.
- Reuse existing planning feature modules introduced in Story 1.1 (`commands`, `persistence`, `projections`, `app`) before adding new abstraction layers.
- Keep Laravel + Vite entrypoint wiring unchanged (`resources/js/app.js`, `resources/css/app.css`).
- Do not introduce TypeScript or additional state-management libraries for this story.
- Use existing browser/local APIs (IndexedDB-backed persistence layer) as the projection input source; no new backend dependencies are required for projection success.

### File Structure Requirements

- Place deterministic Today projection logic under `resources/js/features/planning/projections/**`.
- Place projection orchestration/read-path integration under `resources/js/features/planning/app/**` and/or planning command layer as needed.
- Keep local state access within `resources/js/features/planning/persistence/**`; do not add alternate data-read paths that bypass planning boundaries.
- If shared deterministic ordering helpers are needed, place them under `resources/js/features/planning/**` with clear naming tied to Today projection semantics.
- Add or update story-focused tests under `resources/js/features/planning/**/*.test.js` and/or `tests/Unit/**`, `tests/Feature/**` according to existing project conventions.

### Testing Requirements

- Add deterministic projection unit tests: repeated runs with identical local input must produce identical Today output.
- Add ordering/tie-break tests for edge cases (equal timestamps/priorities) to prove stable deterministic behavior.
- Add parity tests covering online and offline runtime states with equivalent projection outputs.
- Add resilience tests proving Today projection works when backend/sync is unavailable.
- Keep tests isolated and deterministic; avoid order-dependent fixtures and hidden global state.

### Previous Story Intelligence

- Story 1.1 established the planning shell and local-first Inbox capture pipeline (`createInboxTask` -> IndexedDB save -> projection refresh), which should be reused rather than replaced.
- Review remediation from Story 1.1 added runtime hardening for async capture flow; apply the same non-blocking resilience approach to Today projection refresh paths.
- Story 1.1 introduced frontend JS tests (`vitest` + `jsdom`) alongside PHPUnit; Story 1.2 should continue this mixed testing strategy for deterministic projection behavior.
- Existing planning data currently stores Inbox tasks with `id`, `title`, `area`, `createdAt`, `updatedAt`; Story 1.2 should define Today projection behavior against this local model without waiting for future backend/sync layers.

### Git Intelligence Summary

- Recent implementation history is concentrated in planning feature modules and local-first behavior:
  - `3cbc14c` implemented Story 1.1 and moved it to review.
  - Earlier commits focused on planning artifacts, architecture baseline, and readiness flow.
- Practical implication for Story 1.2: preserve the same module boundaries and coding style used in Story 1.1 (`resources/js/features/planning/**` + focused tests), avoiding broad refactors.

### Latest Technical Information

- Current repository baseline for frontend runtime:
  - Vite `^7.3.1`
  - Tailwind CSS `^4.0.0`
  - JavaScript ESM project mode (`"type": "module"`)
  - Vitest + jsdom available for frontend unit/integration-style tests
- Story 1.2 should target this installed baseline directly and avoid introducing additional frameworks or language shifts.

### Project Structure Notes

- Primary expected touchpoints:
  - `resources/js/features/planning/projections/**` (deterministic Today projection logic)
  - `resources/js/features/planning/persistence/**` (local state input retrieval)
  - `resources/js/features/planning/app/**` (Today read-path refresh wiring)
  - `resources/js/features/planning/**/*.test.js` and/or `tests/Unit/**`, `tests/Feature/**` (determinism/parity/resilience tests)
- Preserve current feature-sliced structure and avoid creating parallel projection pipelines outside `planning`.

### References

- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\epics.md#Epic 1 Story 1.2]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\prd.md#FR9]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\architecture.md#Source-of-truth split Projection/Query Engine]
- [Source: C:\laragon\www\task-ino\_bmad-output\planning-artifacts\ux-design-specification.md#Today-first core interaction]
- [Source: C:\laragon\www\task-ino\_bmad-output\project-context.md#Critical Implementation Rules]
- [Source: C:\laragon\www\task-ino\_bmad-output\implementation-artifacts\1-1-capture-tasks-in-inbox-online-offline.md]

## Dev Agent Record

### Agent Model Used

gpt-5.3-codex

### Debug Log References

- `create-story` workflow synthesis for Story 1.2
- sprint status synchronization to `ready-for-dev`
- `npm run test:js` (red-green-refactor cycle for Today projection)
- `php artisan test --filter=PlanningInboxCaptureStoryTest`
- `php artisan test` (full suite pass)

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.2 context aligned with Story 1.1 implementation patterns and review learnings.
- Deterministic projection guardrails and non-blocking runtime constraints documented for implementation.
- Implemented deterministic Today projection function with explicit cap parsing, stable ordering, and invalid-record filtering.
- Integrated Today projection refresh into planning runtime local read path without backend dependency.
- Added projection shell rendering and automated tests for determinism, parity, and resilience.
- Code review fixes: createInboxTask sets todayIncluded on new tasks; centralized DEFAULT_TODAY_CAP; direct tests for renderTodayProjection; offline parity e2e test.

### File List

- _bmad-output/implementation-artifacts/1-2-deterministic-today-projection-from-local-state.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- resources/js/features/planning/projections/computeTodayProjection.js
- resources/js/features/planning/projections/renderTodayProjection.js
- resources/js/features/planning/projections/renderTodayProjection.test.js
- resources/js/features/planning/projections/computeTodayProjection.test.js
- resources/js/features/planning/commands/createInboxTask.js
- resources/js/features/planning/commands/createInboxTask.test.js
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js
- resources/views/planning.blade.php
- tests/Feature/PlanningInboxCaptureStoryTest.php

### Change Log

- 2026-02-23: Implemented Story 1.2 deterministic Today projection from local state with stable ordering, non-blocking runtime integration, and automated tests.
- 2026-02-23: Code review remediation: createInboxTask sets todayIncluded; centralized cap constant; renderTodayProjection unit tests; offline parity e2e test. Story moved to done.


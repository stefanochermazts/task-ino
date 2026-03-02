# Story S-006: Offline-Capable Human-Readable Export

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,  
I want complete export available even offline in human-readable format,  
so that portability and trust controls remain always available.

## Scope Mapping (Epic 3)

- Maps to: Story 3.8
- Implements: FR24, FR25

## Acceptance Criteria

1. **Given** planning data exists locally, **when** user triggers export, **then** export includes full task state, areas, Today inclusion signals, cap configuration, and reconstruction metadata.
2. **And** export format is human-readable (`JSON`).
3. **And** export is possible offline.

## Tasks / Subtasks

- [x] Define complete export schema and serializer (AC: 1, 2)
  - [x] Include all required entities and metadata from acceptance criteria.
  - [x] Preserve deterministic field naming and structure for reconstruction.

- [x] Implement offline export command path (AC: 2, 3)
  - [x] Route through local source-of-truth stores only.
  - [x] Avoid any network requirement for export success.

- [x] Add UX trigger and success/failure feedback (AC: 2, 3)
  - [x] Provide user action to generate/download JSON export.
  - [x] Show clear result messaging without blocking planning flow.

- [x] Add tests for completeness and offline behavior (AC: 1, 2, 3)
  - [x] Unit tests validating export schema completeness.
  - [x] Integration tests with simulated offline state.

## Data Model / State Touchpoints

- Reads task store (full task state including area and Today signals).
- Reads Today cap settings and reconstruction metadata stores.
- No mutation of planning data during export.

## Error Handling Expectations

- Export failures return deterministic user-safe error messages.
- Partial/corrupt output files are not emitted as success.
- Planning actions remain available after export error.

## Telemetry / Observability (if needed)

- Optional events:
  - `export_requested`
  - `export_completed`
  - `export_failed` (error category)

## Assumptions / Open Questions

- Assumption: current browser/runtime supports file download APIs used in existing app patterns.
- Open question: whether export should include optional sync metadata in this story or in a follow-up.

## Dev Agent Record

### Completion Notes

- Added deterministic export schema (version, exportedAt, reconstructionMetadata, tasks) with full task state, areas, todayCap, lastPlanningDate.
- Implemented offline export command reading from inboxTaskStore, todayCapStore, areaStore, dayCycleStore; no network calls.
- Wired Export data button in planning UI with Blob-based download and success/failure feedback.
- Added unit tests for schema completeness and command behavior; integration test for export button and simulated offline.

## File List

- resources/js/features/planning/export/exportPlanningData.js
- resources/js/features/planning/export/exportPlanningData.test.js
- resources/js/features/planning/commands/exportPlanningData.js
- resources/js/features/planning/commands/exportPlanningData.test.js
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js
- resources/views/planning.blade.php

## Change Log

- 2026-03-02: Implemented S-006 offline-capable human-readable JSON export with complete schema, local-only command, UX trigger, and tests.
- 2026-03-02: Applied adversarial review fixes: added strict malformed-task rejection for export (`EXPORT_INVALID_TASKS`), isolated control feedback from export feedback in UI, and added offline integration coverage for export button behavior.

## Senior Developer Review (AI)

**Outcome: Approve (post-fix)**

### Findings and Resolutions

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | HIGH | Export could succeed with partial/corrupt task records because serializer normalized invalid fields (e.g., empty `id`) instead of rejecting | Added `validateExportTasks(tasks)` and enforced it in `exportPlanningData()` before payload build/serialization; malformed inputs now return deterministic `EXPORT_INVALID_TASKS` error and do not emit success output |
| 2 | MEDIUM | `#export-feedback` was shared by export/reset/delete flows with independent timers, causing non-deterministic message clobbering | Introduced dedicated `#control-feedback` channel for reset/delete actions and timer-safe clear helpers (`scheduleExportFeedbackClear`, `scheduleControlFeedbackClear`) to isolate and deterministically clear messages |
| 3 | MEDIUM | Offline integration requirement for export button was only covered at command level, not at UI integration level | Added UI integration test (`export button succeeds while offline`) asserting export success path while simulated offline, preserving non-blocking behavior |

Post-fix verification: **335/335 tests passing**, no linter issues on touched files.


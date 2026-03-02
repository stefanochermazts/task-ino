# Story S-002: Sync State Visibility and Error Transparency

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,  
I want sync state and sync errors to be visible in actionable language without disrupting planning,  
so that trust is preserved while planning flow stays uninterrupted.

## Scope Mapping (Epic 3)

- Maps to: Story 3.4 + Story 3.5
- Implements: FR26, FR56

## Acceptance Criteria

1. **Given** sync status changes (syncing, offline, retrying, success), **when** status is rendered in UI, **then** feedback remains informational and non-blocking.
2. **And** planning interaction flow remains uninterrupted.
3. **Given** a sync failure occurs, **when** error feedback is presented, **then** sync errors do not block planning actions.
4. **And** sync errors provide an actionable recovery path.
5. **And** raw technical exceptions are not exposed to end users.

## Tasks / Subtasks

- [x] Add deterministic sync status presentation model (AC: 1, 2)
  - [x] Define finite status values and rendering contract.
  - [x] Ensure status updates are decoupled from planning command success/failure.

- [x] Add actionable sync error model and sanitization (AC: 3, 4, 5)
  - [x] Map technical exceptions to user-safe domain messages.
  - [x] Provide recovery hints (retry, verify sync mode, wait for connectivity).
  - [x] Prevent stack traces/internal exception text from reaching UI.

- [x] Integrate status/error feedback in non-blocking panel pattern (AC: 1, 2, 3)
  - [x] Place feedback in dedicated UI area without modal interruption of planning flow.
  - [x] Keep focus and keyboard interactions consistent with existing planning panels.

- [x] Add tests for visibility and resilience behavior (AC: 1, 2, 3, 4, 5)
  - [x] Unit tests for error sanitization mapping.
  - [x] Integration tests confirming planning actions continue during sync failures.
  - [x] Regression tests for non-blocking status transitions.

## Data Model / State Touchpoints

- Sync status state and last sync error summary in local UI/application state.
- No mutation of core planning task fields from status/error rendering paths.

## Error Handling Expectations

- Domain-level sync error codes normalized through existing invariant/command style.
- UI always receives sanitized `message` plus optional actionable next-step hint.
- Sync presentation failure cannot prevent projection render.

## Telemetry / Observability (if needed)

- Optional events:
  - `sync_status_changed` with normalized status value
  - `sync_error_presented` with sanitized error category

## Assumptions / Open Questions

- Assumption: Existing UI has a dedicated area suitable for non-blocking sync feedback.
- Open question: final copy deck for actionable error messages (product wording).

## Dev Agent Record

- **Completion Notes:** Added deterministic sync feedback model with finite statuses (`syncing`, `offline`, `retrying`, `success`) and a sanitization layer that maps technical failures to user-safe actionable messages. Integrated status and feedback rendering in the existing connection section as non-blocking informational UI. Sync-toggle path now updates sync status deterministically and preserves planning flow under failures (capture remains usable).
- **File List:** resources/js/features/planning/sync/syncFeedbackModel.js (new), resources/js/features/planning/sync/syncFeedbackModel.test.js (new), resources/js/features/planning/app/initializePlanningInboxApp.js (modified), resources/js/features/planning/app/initializePlanningInboxApp.test.js (modified), resources/views/planning.blade.php (modified), _bmad-output/implementation-artifacts/sprint-status.yaml (modified), _bmad-output/implementation-artifacts/S-002-sync-state-visibility-and-error-transparency.md (modified)

## Change Log

- 2026-02-23: Implemented S-002 sync visibility and error transparency model. Added deterministic sync statuses, sanitization of technical exceptions, non-blocking UI feedback integration, and tests. JS suite passing (234/234).
- 2026-02-23: Senior code review completed with no blocking findings. Story approved and moved to done.

## Senior Developer Review (AI)

**Date:** 2026-02-23  
**Outcome:** Approve

### Findings

- No HIGH/MEDIUM findings in application source files touched by S-002.
- AC coverage verified for sync status visibility, non-blocking flow, and sanitized actionable errors.

### Residual Risks

- Message copy can be refined with final product wording in later UX pass.
- Real backend sync transport integration is not in this story scope and should be validated in later sync stories.


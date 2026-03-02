# Story S-008: Irreversible Local and Synced Data Deletion

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,  
I want permanent deletion controls for both local and synced data,  
so that data ownership includes intentional irreversible deletion.

## Scope Mapping (Epic 3)

- Maps to: Story 3.10 + Story 3.11
- Implements: FR28, FR29

## Acceptance Criteria

1. **Given** user explicitly confirms local deletion intent, **when** local deletion executes, **then** local planning data is irreversibly deleted.
2. **And** operation outcome is clearly confirmed to user.
3. **Given** user explicitly confirms synced deletion intent, **when** synchronized deletion executes, **then** synced planning data is irreversibly deleted.
4. **And** local runtime continuity rules are preserved according to reset/deletion intent.

## Tasks / Subtasks

- [x] Add explicit local deletion command with irreversible confirmation flow (AC: 1, 2)
  - [x] Require high-friction confirmation before local destructive action.
  - [x] Ensure local stores are fully cleared and non-recoverable through app UI paths.

- [x] Add explicit synced deletion command with irreversible confirmation flow (AC: 3, 4)
  - [x] Require separate confirmation from local deletion.
  - [x] Execute remote deletion path without exposing raw technical failures.

- [x] Coordinate deletion outcomes with continuity/reset semantics (AC: 4)
  - [x] Preserve deterministic behavior for remaining runtime scope after each deletion type.
  - [x] Avoid accidental implicit carry-over side effects after deletion operations.

- [x] Add tests for irreversible controls and post-delete behavior (AC: 1, 2, 3, 4)
  - [x] Unit tests for local delete command (deleteLocalPlanningData.test.js).
  - [x] Unit tests for synced delete command (deleteSyncedPlanningData.test.js).
  - [x] Regression tests for continuity behavior after deletion choices.

## Data Model / State Touchpoints

- Local deletion: task store, today cap settings, day continuity markers, sync local metadata as specified.
- Synced deletion: remote persisted planning dataset and related registration artifacts.
- Deletion flows must declare exactly which stores are in/out of scope.

## Error Handling Expectations

- Confirmation cancellation exits cleanly with no side effects.
- Partial delete outcomes return explicit, actionable status.
- UI messaging clearly distinguishes local delete, synced delete, and reset.

## Telemetry / Observability (if needed)

- Optional events:
  - `local_delete_confirmed` / `local_delete_completed`
  - `synced_delete_confirmed` / `synced_delete_completed`
  - `delete_failed` by scope (`local` or `synced`)

## Assumptions / Open Questions

- Assumption: "irreversible" refers to product/runtime behavior (no in-app undo), not external backup policy.
- Open question: whether local deletion should implicitly disable sync mode when sync artifacts remain configured.

## Implementation Notes

- **Local deletion**: `deleteLocalPlanningData.js` clears `inboxTaskStore` via `replaceAllTasks([])`, removes localStorage keys (`planning.todayCap`, `planning.lastPlanningDate`, `planning.areas`), saves sync mode disabled, and clears E2EE key material.
- **Synced deletion**: `deleteSyncedPlanningData.js` calls `window.taskinoSync?.deleteRemotePlanningData?.()` when available; returns actionable error when no provider or on failure.
- **UI**: "Delete local data" and "Delete synced data" buttons in Connection status area (planning.blade.php), each with `window.confirm` high-friction confirmation. After local delete, UI refreshes (sync mode, today cap, inbox).
- **Tests**: `deleteLocalPlanningData.test.js` and `deleteSyncedPlanningData.test.js` cover confirmation, success, and failure paths.

## Change Log

- 2026-03-02: Applied adversarial review fixes: added deterministic sync-mode save failure handling in local delete (`LOCAL_DELETE_SYNCMODE_FAILED`), sanitized synced-delete remote error messaging, and added UI integration tests for delete local/synced confirmation and feedback paths.

## Senior Developer Review (AI)

**Outcome: Approve (post-fix)**

### Findings and Resolutions

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | HIGH | `deleteLocalPlanningData` ignored `saveSyncMode(false)` failure and could return success with inconsistent local sync mode | Added explicit sync-mode persistence check; returns deterministic `LOCAL_DELETE_SYNCMODE_FAILED` and aborts before key-clear attempt when local sync disable cannot be saved |
| 2 | MEDIUM | `deleteSyncedPlanningData` could surface raw remote error message content in user-facing response | Replaced passthrough with sanitized fixed message: `Synced deletion could not be confirmed. Please retry.` while preserving failure code |
| 3 | MEDIUM | UI integration coverage missing for delete local/synced controls and continuity feedback | Added `initializePlanningInboxApp.test.js` integration cases for both delete buttons: confirmation-cancel no side effects, success flow invocation/feedback, and sanitized synced-delete failure feedback |

Post-fix verification:
- `npm run test:js -- --reporter=dot` => **347/347 tests passing**
- No linter issues on touched files


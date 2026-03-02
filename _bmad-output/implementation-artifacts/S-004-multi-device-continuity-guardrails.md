# Story S-004: Multi-Device Continuity Guardrails

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner using multiple devices,  
I want continuity preserved under eventual consistency,  
so that planning state remains aligned and understandable across devices.

## Scope Mapping (Epic 3)

- Maps to: Story 3.6
- Implements: FR58, FR59

## Acceptance Criteria

1. **Given** user switches devices under eventual consistency conditions, **when** synced state is reconciled, **then** planning continuity is preserved without violating core invariants.
2. **And** user-visible state alignment remains consistent with confirmed planning decisions.

## Tasks / Subtasks

- [x] Define cross-device continuity guardrails and reconciliation rules (AC: 1, 2)
  - [x] Clarify confirmed decision precedence over stale remote snapshots.
  - [x] Preserve deterministic outcome regardless of reconciliation order.

- [x] Implement reconciliation path using invariant-first mutation pipeline (AC: 1)
  - [x] Route reconciliation through central guardrails.
  - [x] Reject reconciliations that violate Today cap, temporal validity, or ownership constraints.

- [x] Provide user-safe alignment feedback (AC: 2)
  - [x] Surface concise non-blocking message when delayed sync causes temporary divergence.
  - [x] Reflect final aligned state without interrupting planning actions.

- [x] Add tests for eventual consistency and continuity invariants (AC: 1, 2)
  - [x] Integration tests for device switch scenarios with delayed updates.
  - [x] Regression tests for invariant preservation during reconciliation.

## Data Model / State Touchpoints

- Device-scoped sync metadata required for reconciliation ordering and conflict context.
- Existing local planning model remains source-of-truth for active runtime decisions.
- Projection state (`Inbox`, `Today`) rebuilt deterministically after reconciliation.

## Error Handling Expectations

- Reconciliation errors are recoverable and non-blocking for local planning.
- Deterministic error codes for invariant rejection or malformed sync payloads.

## Telemetry / Observability (if needed)

- Optional events:
  - `device_reconciliation_started`
  - `device_reconciliation_completed`
  - `device_reconciliation_rejected` (with invariant code)

## Assumptions / Open Questions

- Assumption: "confirmed planning decisions" corresponds to locally committed invariant-safe mutations.
- Open question: whether UX should show per-device last-sync timestamps in this story or later.

## Dev Agent Record

- **Agent**: Claude (Cursor)
- **Date**: 2026-02-23
- **Branch**: feature/epic-3

### File List

- `resources/js/features/planning/sync/continuityGuardrails.js` (New) — Design notes and CONTINUITY_CODES.
- `resources/js/features/planning/commands/reconcileFromRemote.js` (New) — Reconciliation via invariant-first pipeline.
- `resources/js/features/planning/commands/reconcileFromRemote.test.js` (New) — Unit tests.
- `resources/js/features/planning/persistence/inboxTaskStore.js` (Modified) — getAllInboxTasks, replaceAllTasks for atomic reconciliation persist.
- `resources/js/features/planning/persistence/inboxTaskStore.test.js` (Modified) — Tests for getAll/replaceAll, clear() in fake IndexedDB.
- `resources/js/features/planning/sync/syncFeedbackModel.js` (Modified) — getAlignmentFeedback for user-safe alignment messages.
- `resources/js/features/planning/sync/syncFeedbackModel.test.js` (Modified) — getAlignmentFeedback tests.
- `resources/js/features/planning/app/initializePlanningInboxApp.js` (Modified) — runReconciliation, planning:reconcile listener, reconcile button, alignment feedback.
- `resources/js/features/planning/app/initializePlanningInboxApp.test.js` (Modified) — Reconciliation integration tests.
- `resources/js/features/planning/sync/syncBatchMerge.js` (Modified) — local-vs-remote precedence, temporal/ownership reject rules.
- `resources/js/features/planning/sync/syncBatchMerge.test.js` (Modified) — stale snapshot, malformed temporal, ownership mismatch tests.
- `resources/js/features/planning/invariants/mutationGuardrail.test.js` (Modified) — applyMergeBatch reject coverage for temporal/ownership.
- `resources/views/planning.blade.php` (Modified) — "Check for updates" button.

### Completion Notes

- continuityGuardrails.js documents precedence (confirmed local > stale remote), deterministic outcome, invariant-first flow.
- reconcileFromRemote fetches local, calls mutatePlanningState applyMergeBatch, atomically persists via replaceAllTasks.
- getAlignmentFeedback provides "Aligning…", "Plan aligned.", and sanitized rejection messages.
- planning:reconcile custom event + reconcile button trigger reconciliation; alignment feedback shown non-blocking.
- S-004 code-review fixes implemented: temporal validity + ownership rejection in merge path, local confirmed decisions precedence over stale remote snapshots, reconcile button no longer dispatches fake empty updates.
- All tests pass (full suite): 284/284.

## Senior Developer Review (AI)

**Date**: 2026-02-23  
**Outcome**: Approve (after fixes)

### Findings fixed

- **CRITICAL**: Missing reject rules for temporal validity / ownership in reconciliation.
  - **Fix**: `syncBatchMerge` now rejects malformed temporal targets and ownership mismatch with deterministic invariant error.
- **CRITICAL**: Confirmed local decisions did not reliably win against stale remote snapshots.
  - **Fix**: `syncBatchMerge` now includes local candidate in winner resolution (timestamp + device_id), preserving newer local state.
- **HIGH**: Reconciliation-order determinism claims were under-supported by tests.
  - **Fix**: Added stale-remote/local-precedence and malformed payload tests in `syncBatchMerge.test.js`, plus guardrail integration tests.
- **MEDIUM**: “Check for updates” always triggered empty reconciliation payload.
  - **Fix**: UI now uses `window.taskinoSync.fetchRemoteMutations()` provider; if missing/invalid, shows non-blocking sanitized feedback.
- **MEDIUM**: Story file list omitted code paths involved in merge guardrails.
  - **Fix**: File list updated to include `syncBatchMerge` and guardrail test changes.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-23 | Implemented continuity guardrails, reconciliation pipeline, alignment feedback, tests. | Dev Agent |
| 2026-02-23 | Applied code-review fixes (temporal/ownership reject, local precedence, provider-based reconcile, test hardening). | Dev Agent |


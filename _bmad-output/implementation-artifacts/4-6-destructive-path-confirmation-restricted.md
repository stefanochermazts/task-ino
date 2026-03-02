# Story 4.6: Destructive Path Confirmation (Restricted)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want explicit confirmations for irreversible operations,
so that accidental destructive actions are prevented without adding planning friction.

## Acceptance Criteria

1. **Given** a destructive operation is requested, **when** the operation type is: permanent local data deletion, synced data deletion, sync reset, or irreversible key rotation, **then** the system requires explicit user confirmation before executing.
2. **And** normal daily planning flows (add task, add to Today, reschedule, area assign, closure, bulk operations) are NOT blocked by additional confirmation steps.
3. **And** the confirmation guard is enforced at the **command layer** (not only in the UI), so that any caller without `confirmed: true` receives a deterministic rejection.
4. **And** the existing commands that already implement this (from Epic 3) are audited and verified to have consistent confirmation guard behavior.
5. **And** a `requiresConfirmation(operationId)` utility is available for runtime checks, returning `true` for all restricted operations.

## Tasks / Subtasks

- [x] Create `destructiveOperations.js` in `resources/js/features/planning/commands/` (AC: 3, 5)
  - [x] Export a `DESTRUCTIVE_OPERATIONS` constant set (or frozen object):
    ```js
    export const DESTRUCTIVE_OPERATIONS = Object.freeze({
      DELETE_LOCAL: 'delete-local-planning-data',
      DELETE_SYNCED: 'delete-synced-planning-data',
      RESET_SYNC: 'reset-sync-state',
      KEY_ROTATION: 'e2ee-key-rotation',
    });
    ```
  - [x] Export `requiresConfirmation(operationId)` → returns `true` if `operationId` is in `DESTRUCTIVE_OPERATIONS` values, else `false`.
  - [x] Export `CONFIRMATION_ERROR` constant `{ code: 'CONFIRMATION_REQUIRED', message: 'This operation requires explicit confirmation. Provide confirmed: true to proceed.' }`.

- [x] Audit and harden existing destructive commands for consistent guard (AC: 3, 4)
  - [x] `resetSyncState.js` — verify `confirmed` guard returns `CONFIRMATION_REQUIRED` when `confirmed !== true`. Currently checks `!confirmed`; verify exact shape of returned error matches `CONFIRMATION_ERROR`.
  - [x] `deleteLocalPlanningData.js` — same audit.
  - [x] `deleteSyncedPlanningData.js` — same audit. Currently uses `confirmed` parameter. Verify.
  - [x] `ensureE2EEKeyReady.js` (key rotation path in `e2eeClientCrypto.js`) — add `confirmed` guard for the key rotation case if called with explicit rotation intent (distinguish from initial key creation).
  - [x] For each: if guard is missing or inconsistent → add it. If correct → document in file comment.

- [x] Create `validateDestructiveConfirmation.js` utility in `resources/js/features/planning/invariants/` (AC: 3, 4)
  - [x] `validateDestructiveConfirmation({ confirmed, operationId })` — throws or returns error if `confirmed !== true`.
  - [x] Returns `{ ok: true }` when `confirmed === true`.
  - [x] Returns `{ ok: false, code: 'CONFIRMATION_REQUIRED', message: '...' }` when not confirmed.
  - [x] Use in all destructive commands as a single shared guard (DRY).

- [x] Refactor existing destructive commands to use `validateDestructiveConfirmation` (AC: 3, 4)
  - [x] `resetSyncState.js`: replace inline guard with `validateDestructiveConfirmation`.
  - [x] `deleteLocalPlanningData.js`: replace inline guard.
  - [x] `deleteSyncedPlanningData.js`: replace inline guard.

- [x] Write unit tests in `destructiveOperations.test.js` (AC: 3, 5)
  - [x] Test: `requiresConfirmation` returns `true` for all DESTRUCTIVE_OPERATIONS values.
  - [x] Test: `requiresConfirmation` returns `false` for arbitrary non-destructive operation IDs.

- [x] Write unit tests in `validateDestructiveConfirmation.test.js` (AC: 3)
  - [x] Test: `confirmed: true` → `{ ok: true }`.
  - [x] Test: `confirmed: false` → `{ ok: false, code: 'CONFIRMATION_REQUIRED' }`.
  - [x] Test: `confirmed: undefined` → `{ ok: false, code: 'CONFIRMATION_REQUIRED' }`.
  - [x] Test: `confirmed: 'yes'` (wrong type) → `{ ok: false, code: 'CONFIRMATION_REQUIRED' }`.

- [x] Regression test: verify existing destructive command tests still pass (AC: 4)
  - [x] Run `npm run test:js` — all existing tests for `resetSyncState`, `deleteLocalPlanningData`, `deleteSyncedPlanningData` must pass without modification.

## Dev Notes

### Architecture Alignment

- **Command-layer enforcement (critical)**: The confirmation guard MUST live in the command function, not only in UI event listeners. This prevents accidental programmatic invocation bypassing the safeguard. Lesson: UI can be bypassed; invariants cannot.
- **Planning flow unaffected (hard constraint)**: Commands like `createInboxTask`, `addToToday`, `rescheduleTask`, `bulkAddToToday`, `enforceDailyContinuity`, `pauseTask`, `retainTaskForNextDay`, `setTaskArea`, `removeFromToday` MUST NOT receive a `confirmed` gate. Confirmation friction is scoped strictly to irreversible data loss paths.
- **DRY guard**: The `validateDestructiveConfirmation` utility eliminates per-command inline guard duplication. All four destructive commands call the same function.

### Project Structure Notes

- New file: `resources/js/features/planning/commands/destructiveOperations.js`
- New file: `resources/js/features/planning/commands/destructiveOperations.test.js`
- New file: `resources/js/features/planning/invariants/validateDestructiveConfirmation.js`
- New file: `resources/js/features/planning/invariants/validateDestructiveConfirmation.test.js`
- Modify: `resources/js/features/planning/commands/resetSyncState.js` (refactor guard)
- Modify: `resources/js/features/planning/commands/deleteLocalPlanningData.js` (refactor guard)
- Modify: `resources/js/features/planning/commands/deleteSyncedPlanningData.js` (refactor guard)
- Modify: `resources/js/features/planning/sync/e2eeClientCrypto.js` (add rotation guard if applicable)

### Existing Confirmation Guard Patterns (reference from Epic 3)

From `resetSyncState.js` (current pattern to unify):
```js
if (!confirmed) {
  return { ok: false, code: 'RESET_CONFIRMATION_REQUIRED', message: '...' };
}
```

After refactor with shared guard:
```js
import { validateDestructiveConfirmation } from '../invariants/validateDestructiveConfirmation.js';

const confirmCheck = validateDestructiveConfirmation({ confirmed, operationId: DESTRUCTIVE_OPERATIONS.RESET_SYNC });
if (!confirmCheck.ok) return confirmCheck;
```

The returned error code standardizes to `CONFIRMATION_REQUIRED` across all destructive commands. **Breaking change**: `RESET_CONFIRMATION_REQUIRED`, `LOCAL_DELETE_CONFIRMATION_REQUIRED`, `SYNCED_DELETE_CONFIRMATION_REQUIRED` are replaced by the single `CONFIRMATION_REQUIRED` code. Update tests accordingly.

### E2EE Key Rotation Guard

`ensureE2EEKeyReady` in `e2eeClientCrypto.js` currently always generates a new key if none exists (initial creation), or rotates on explicit call with a rotation flag. Add a `confirmed` guard ONLY to the rotation path (not initial creation). Initial key creation during onboarding is NOT a destructive operation — the planner has no prior key to lose.

### Planning Flow Non-Interference (AC: 2)

The following command files MUST NOT be modified by this story (no confirmation gate added):
- `createInboxTask.js`
- `addToToday.js`
- `removeFromToday.js`
- `rescheduleTask.js`
- `bulkAddToToday.js`
- `bulkRescheduleTasks.js`
- `enforceDailyContinuity.js`
- `pauseTask.js`
- `retainTaskForNextDay.js`
- `setTaskArea.js`
- `setSyncMode.js`
- `reconcileFromRemote.js`
- `appendPlanningEvent.js` (Story 4.1)
- `rebuildPlanningProjection.js` (Story 4.3)

### Error Code Standardization

| Old Code | New Code |
|---|---|
| `RESET_CONFIRMATION_REQUIRED` | `CONFIRMATION_REQUIRED` |
| `LOCAL_DELETE_CONFIRMATION_REQUIRED` | `CONFIRMATION_REQUIRED` |
| `SYNCED_DELETE_CONFIRMATION_REQUIRED` | `CONFIRMATION_REQUIRED` |

Update all affected test files when refactoring.

### Testing Framework

- **Framework**: Vitest with `happy-dom`
- **Run**: `npm run test:js` — must remain green throughout refactor
- **Build check**: `npm run build` after refactor to catch import issues
- Baseline: 454 tests (must not regress; test count may increase)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.6] — FR57
- [Source: _bmad-output/planning-artifacts/architecture.md#Invariant Enforcement Layer] — Invariants in domain logic, not UI
- [Source: _bmad-output/implementation-artifacts/S-007] — `resetSyncState` existing confirmation pattern
- [Source: _bmad-output/implementation-artifacts/S-008] — `deleteLocalPlanningData`, `deleteSyncedPlanningData` confirmation patterns

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

- Created `destructiveOperations.js` with `DESTRUCTIVE_OPERATIONS`, `requiresConfirmation()`, `CONFIRMATION_ERROR`.
- Created `validateDestructiveConfirmation.js` returning `{ ok }` or `{ ok: false, code, message }` for all destructive commands.
- Refactored `resetSyncState`, `deleteLocalPlanningData`, `deleteSyncedPlanningData` to use shared guard; standardized error code to `CONFIRMATION_REQUIRED`.
- Added `confirmed` guard to `ensureE2EEKeyReady` for rotation path only (initial key creation unaffected).
- Hardened `deleteSyncedPlanningData` to treat only explicit `{ ok: true }` provider responses as success.
- Updated shared guard validation to enforce registered destructive `operationId` values.
- All 454 tests pass; `npm run build` succeeds.

### File List

- resources/js/features/planning/commands/destructiveOperations.js (new)
- resources/js/features/planning/commands/destructiveOperations.test.js (new)
- resources/js/features/planning/invariants/validateDestructiveConfirmation.js (new)
- resources/js/features/planning/invariants/validateDestructiveConfirmation.test.js (new)
- resources/js/features/planning/commands/resetSyncState.js (modified)
- resources/js/features/planning/commands/deleteLocalPlanningData.js (modified)
- resources/js/features/planning/commands/deleteSyncedPlanningData.js (modified)
- resources/js/features/planning/sync/e2eeClientCrypto.js (modified)
- resources/js/features/planning/commands/resetSyncState.test.js (modified)
- resources/js/features/planning/commands/deleteLocalPlanningData.test.js (modified)
- resources/js/features/planning/commands/deleteSyncedPlanningData.test.js (modified)
- resources/js/features/planning/sync/e2eeClientCrypto.test.js (modified)

### Change Log

- 2026-02-23: Code review remediation pass completed.
- Fixed false-positive remote delete success path by requiring explicit provider acknowledgement (`{ ok: true }`).
- Added strict operation validation in `validateDestructiveConfirmation` for registered destructive operation IDs.
- Updated focused and full regression test baselines after remediation.

## Senior Developer Review (AI)

### Reviewer

Codex (adversarial review mode)

### Outcome

Approved after fixes.

### Resolved Findings

- HIGH: `deleteSyncedPlanningData` could report success on unconfirmed provider responses; now fails closed with deterministic error.
- MEDIUM: `validateDestructiveConfirmation` ignored `operationId`; now validates against registered destructive operations.

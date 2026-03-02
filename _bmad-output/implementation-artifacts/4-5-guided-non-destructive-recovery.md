# Story 4.5: Guided Non-Destructive Recovery

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want guided non-destructive recovery actions,
so that most inconsistencies can be resolved without data loss.

## Acceptance Criteria

1. **Given** recovery is initiated (user clicks "Run integrity check"), **when** guidance is presented, **then** non-destructive options are offered before any destructive alternative.
2. **And** each recovery option includes expected outcome and reversibility context (e.g., "Rebuild projection — reversible, no data loss" vs. "Delete local data — irreversible").
3. **And** the recovery flow first runs `runIntegrityCheck()` (Story 4.2) and presents violations before offering actions.
4. **And** if no violations are found, the UI clearly states "No integrity issues detected."
5. **And** non-destructive action: "Rebuild projection" calls `rebuildPlanningProjection()` (Story 4.3) and reports outcome.
6. **And** destructive action: "Delete local data" is present but visually de-emphasized and requires its own confirmation (delegates to existing `deleteLocalPlanningData` command from Epic 3 S-008).
7. **And** recovery flow MUST NOT expose raw technical errors or internal stack traces in the UI.

## Tasks / Subtasks

- [x] Create `runGuidedRecovery.js` command in `resources/js/features/planning/commands/` (AC: 1, 3, 5, 6)
  - [x] Orchestrator that runs `runIntegrityCheck()` and returns a structured `RecoveryGuide`:
    ```js
    {
      ok: true,
      hasViolations: false | true,
      violations: [],           // from IntegrityReport
      actions: [
        {
          id: 'rebuild-projection',
          label: 'Rebuild Today projection',
          description: 'Recomputes the Today view from local task state. Reversible — no data is deleted.',
          destructive: false,
        },
        {
          id: 'delete-local-data',
          label: 'Delete all local planning data',
          description: 'Permanently removes all local tasks, areas, and sync state. Irreversible.',
          destructive: true,
        }
      ]
    }
    ```
  - [x] Actions are always returned in the same order: non-destructive first, destructive last (AC: 1).
  - [x] If `runIntegrityCheck` fails, return `{ ok: false, code: 'RECOVERY_CHECK_FAILED', message }`.

- [x] Create `executeRecoveryAction.js` command in `resources/js/features/planning/commands/` (AC: 5, 6)
  - [x] Accept `{ actionId, confirmed, ui?, onRemoveFromToday?, onAfterDelete? }`.
  - [x] `actionId: 'rebuild-projection'` → calls `rebuildPlanningProjection({ ui, onRemoveFromToday })`, returns result.
  - [x] `actionId: 'delete-local-data'` → requires `confirmed: true`, delegates to `deleteLocalPlanningData({ confirmed: true, onAfterDelete })`.
  - [x] Unknown `actionId` → returns `{ ok: false, code: 'RECOVERY_UNKNOWN_ACTION' }`.
  - [x] Destructive action without `confirmed: true` → returns `{ ok: false, code: 'RECOVERY_CONFIRMATION_REQUIRED' }`.

- [x] Add Recovery UI section to `resources/views/planning.blade.php` (AC: 1, 2, 3, 4, 6, 7)
  - [x] Add a `<section id="recovery-panel">` in the support/connection area.
  - [x] A `<button id="run-integrity-check-btn" type="button">Run integrity check</button>`.
  - [x] A `<div id="recovery-violations">` to display violation list (empty by default).
  - [x] A `<div id="recovery-actions">` to display action buttons (hidden until check runs).
  - [x] A `<p id="recovery-feedback" aria-live="polite">` for status messages.
  - [x] Non-destructive action button: `<button id="recovery-rebuild-btn" type="button">`.
  - [x] Destructive action button: `<button id="recovery-delete-local-btn">` — visually de-emphasized (text-sm text-red-600 underline).

- [x] Wire recovery UI in `initializePlanningInboxApp.js` (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] On `#run-integrity-check-btn` click:
    - Call `runGuidedRecovery()`.
    - If `!hasViolations`: show "No integrity issues detected." in feedback, hide actions.
    - If `hasViolations`: render violations list, show action buttons with labels and descriptions.
  - [x] On `#recovery-rebuild-btn` click:
    - Call `executeRecoveryAction({ actionId: 'rebuild-projection', ui, onRemoveFromToday })`.
    - On success: show "Today projection rebuilt successfully." in feedback.
    - On failure: show sanitized error in feedback.
  - [x] On `#recovery-delete-local-btn` click:
    - Use `window.confirm(description)` for confirmation.
    - On confirm: call `executeRecoveryAction({ actionId: 'delete-local-data', confirmed: true, onAfterDelete })`.
    - On cancel: no-op.
    - On success: show "Local data deleted." and trigger UI refresh.
    - On failure: show sanitized error.
  - [x] NEVER display raw error messages or stack traces.
  - [x] Use dedicated `scheduleRecoveryFeedbackClear()` with own timeout ID.

- [x] Write unit tests in `runGuidedRecovery.test.js` (AC: 1, 3, 4)
  - [x] Mock `runIntegrityCheck`.
  - [x] Test: clean state → `hasViolations: false`, actions list still present in fixed order.
  - [x] Test: violations found → `hasViolations: true`, violations array populated.
  - [x] Test: non-destructive action comes before destructive action in `actions` array.
  - [x] Test: `runIntegrityCheck` failure → `RECOVERY_CHECK_FAILED`.

- [x] Write unit tests in `executeRecoveryAction.test.js` (AC: 5, 6)
  - [x] Mock `rebuildPlanningProjection` and `deleteLocalPlanningData`.
  - [x] Test: `rebuild-projection` calls `rebuildPlanningProjection()`.
  - [x] Test: `delete-local-data` with `confirmed: true` calls `deleteLocalPlanningData`.
  - [x] Test: `delete-local-data` without `confirmed` → `RECOVERY_CONFIRMATION_REQUIRED`.
  - [x] Test: unknown `actionId` → `RECOVERY_UNKNOWN_ACTION`.

- [x] Add integration tests in `initializePlanningInboxApp.test.js` (AC: 1, 4, 5, 7)
  - [x] Test: integrity check with no violations shows "No integrity issues detected." message.
  - [x] Test: integrity check with violations renders violation list and shows action buttons.
  - [x] Test: rebuild button click triggers rebuild and shows success feedback.
  - [x] Test: delete-local button — cancel confirmation produces no side effects.
  - [x] Test: delete-local button — confirm triggers delete and refresh.
  - [x] Test: recovery failure shows sanitized message (no raw technical content).

## Dev Notes

### Architecture Alignment

- **Non-destructive first**: The `actions` array in `RecoveryGuide` is always ordered: non-destructive first, destructive last. This is an invariant of `runGuidedRecovery`, not a UI presentation choice.
- **Delegation to existing commands**: `executeRecoveryAction` delegates to existing, tested commands (`rebuildPlanningProjection`, `deleteLocalPlanningData`). Do NOT re-implement deletion logic.
- **Separate feedback channel**: `#recovery-feedback` is independent from `#export-feedback` and `#control-feedback`. Dedicated `timeoutId` and `scheduleRecoveryFeedbackClear()`. Lesson enforced from Epic 3 S-006 review.
- **Error sanitization**: All recovery errors shown in UI MUST be user-safe messages. Never expose `code`, stack trace, or raw remote error strings.

### Project Structure Notes

- New file: `resources/js/features/planning/commands/runGuidedRecovery.js`
- New file: `resources/js/features/planning/commands/runGuidedRecovery.test.js`
- New file: `resources/js/features/planning/commands/executeRecoveryAction.js`
- New file: `resources/js/features/planning/commands/executeRecoveryAction.test.js`
- Modify: `resources/views/planning.blade.php` (add `#recovery-panel`)
- Modify: `resources/js/features/planning/app/initializePlanningInboxApp.js`
- Modify: `resources/js/features/planning/app/initializePlanningInboxApp.test.js`
- Dependency (Story 4.2): `runIntegrityCheck.js`
- Dependency (Story 4.3): `rebuildPlanningProjection.js`
- Dependency (Epic 3 S-008): `deleteLocalPlanningData.js`

### RecoveryGuide Shape (contract for Story 4.7)

```js
{
  ok: true,
  hasViolations: true,
  violations: [
    { invariant: 'TODAY_CAP_EXCEEDED', detail: 'Today contains 6 tasks but cap is 5.' }
  ],
  actions: [
    // Non-destructive always first
    {
      id: 'rebuild-projection',
      label: 'Rebuild Today projection',
      description: 'Recomputes the Today view from local task state. Reversible — no data is deleted.',
      destructive: false,
    },
    // Destructive always last
    {
      id: 'delete-local-data',
      label: 'Delete all local planning data',
      description: 'Permanently removes all local tasks, areas, and sync state. Irreversible.',
      destructive: true,
    }
  ]
}
```

### Destructive Action Visual De-emphasis

In `planning.blade.php`, the delete-local recovery button should have distinct visual treatment:
- Smaller button (e.g., Tailwind: `text-sm text-red-600 underline` instead of a full button block).
- Positioned last in the action list.
- Label clearly states irreversibility: "Delete all local data (irreversible)".

### Error Code Additions

- `RECOVERY_CHECK_FAILED` — `runIntegrityCheck` error
- `RECOVERY_CONFIRMATION_REQUIRED` — destructive action without confirmed flag
- `RECOVERY_UNKNOWN_ACTION` — unrecognised action ID

### Testing Framework

- **Framework**: Vitest with `happy-dom`
- **Run**: `npm run test:js`
- **Build check**: `npm run build` after wiring new imports
- Baseline: 453 tests (must not regress)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.5] — FR32, FR34
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns] — Default to recovery-first, non-destructive handling paths
- [Source: _bmad-output/implementation-artifacts/S-006] — Separate feedback channel per UI concern (no clobbering)
- [Source: _bmad-output/implementation-artifacts/S-008] — `deleteLocalPlanningData` command contract and confirmation pattern

## Dev Agent Record

### Agent Model Used

Composer (Cursor)

### Debug Log References

-

### Completion Notes List

- runGuidedRecovery treats SNAPSHOT_LOAD_FAILED as RECOVERY_CHECK_FAILED (user-safe message)
- executeRecoveryAction passes ui and onRemoveFromToday to rebuild; onAfterDelete to delete
- executeRecoveryAction now propagates partial-success metadata (`REBUILD_PARTIAL` + message) from rebuild flow
- Dedicated #recovery-feedback and scheduleRecoveryFeedbackClear
- Recovery UI now applies labels and descriptions from `guide.actions` contract
- All 453 tests pass

### File List

- resources/js/features/planning/commands/runGuidedRecovery.js (new)
- resources/js/features/planning/commands/runGuidedRecovery.test.js (new)
- resources/js/features/planning/commands/executeRecoveryAction.js (new)
- resources/js/features/planning/commands/executeRecoveryAction.test.js (new)
- resources/views/planning.blade.php (modified - recovery-panel)
- resources/js/features/planning/app/initializePlanningInboxApp.js (modified - recovery wiring)
- resources/js/features/planning/app/initializePlanningInboxApp.test.js (modified - recovery integration tests)

### Change Log

- 2026-02-23: Code review remediation pass completed.
- Fixed recovery action result propagation so partial rebuild outcomes are preserved in UI feedback.
- Wired recovery action labels/descriptions from `runGuidedRecovery().actions` instead of static UI copy.
- Added integration coverage for dynamic recovery action text and partial rebuild messaging.
- Updated story checklist consistency and refreshed test baseline/count.

## Senior Developer Review (AI)

### Reviewer

Codex (adversarial review mode)

### Outcome

Approved after fixes.

### Resolved Findings

- HIGH: `executeRecoveryAction` dropped successful partial rebuild metadata; now forwards `code/message` for `REBUILD_PARTIAL`.
- MEDIUM: Recovery UI did not consume `guide.actions` labels/descriptions; now binds both fields at render time.
- MEDIUM: Story task checklist and baseline metadata were stale/inconsistent; now aligned with implemented/tested state.

# Story 4.7: No Destructive Reset Default

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want destructive reset excluded as default recovery behavior,
so that trust and continuity are preserved by design.

## Acceptance Criteria

1. **Given** recovery flow is presented (via `runGuidedRecovery` from Story 4.5), **when** the default recommendation is selected by the system, **then** destructive reset is NEVER the default path.
2. **And** non-destructive recovery options (specifically: "Rebuild projection") are prioritized and listed before any destructive option in every recovery presentation.
3. **And** the `RecoveryGuide.actions` array returned by `runGuidedRecovery` MUST always have `destructive: false` actions before `destructive: true` actions (this is a contractual invariant, not a UI preference).
4. **And** there is no programmatic path in `runGuidedRecovery` or `executeRecoveryAction` where a destructive action is invoked without explicit `confirmed: true` from the caller.
5. **And** the ordering invariant is unit-tested: a test explicitly asserts that no `destructive: true` action appears before any `destructive: false` action in the returned list.

## Tasks / Subtasks

- [x] Add ordering invariant test to `runGuidedRecovery.test.js` (AC: 2, 3, 5)
  - [x] Test: `RecoveryGuide.actions` contains at least one `destructive: false` action.
  - [x] Test: no `destructive: true` action precedes any `destructive: false` action (position check).
  - [x] Test: this ordering holds regardless of whether violations are found or not.

- [x] Add ordering guard in `runGuidedRecovery.js` (AC: 3)
  - [x] After building the `actions` array, add a runtime assertion:
    ```js
    const firstDestructive = actions.findIndex(a => a.destructive);
    const lastNonDestructive = actions.map(a => !a.destructive).lastIndexOf(true);
    if (firstDestructive !== -1 && lastNonDestructive > firstDestructive) {
      throw new Error('INVARIANT_VIOLATION: destructive action precedes non-destructive in recovery guide');
    }
    ```
  - [x] This guard fires in development and test environments, making ordering violations immediately visible.

- [x] Verify `executeRecoveryAction.js` cannot auto-trigger destructive actions without `confirmed` (AC: 4)
  - [x] Add an explicit invariant comment in `executeRecoveryAction.js` for the destructive guard.
  - [x] Add a test: calling `executeRecoveryAction({ actionId: 'delete-local-data' })` (no `confirmed`) returns `RECOVERY_CONFIRMATION_REQUIRED` (regression guard from Story 4.6).

- [x] Verify UI presentation order in `initializePlanningInboxApp.js` (AC: 1, 2)
  - [x] When rendering action buttons from `RecoveryGuide.actions`, render in array order (non-destructive first, destructive last) without resorting.
  - [x] The UI MUST NOT have any logic that promotes a destructive action to a default position or primary button style.
  - [x] Add an integration test: after running integrity check, the first rendered action button is non-destructive.

- [x] Document the no-destructive-default policy in `runGuidedRecovery.js` header comment (AC: 1, 3)
  - [x] Add a JSDoc block or a leading comment explaining the ordering invariant and why it is enforced at the command layer.

- [x] Write dedicated ordering-invariant unit test in `runGuidedRecovery.test.js` (AC: 3, 5)
  - [x] Test name: `'actions array always places non-destructive options before destructive ones'`.
  - [x] Assert: `actions.filter(a => !a.destructive)` come before `actions.filter(a => a.destructive)`.
  - [x] Assert: `actions[0].destructive === false` (first action is always non-destructive).

- [x] Add integration test in `initializePlanningInboxApp.test.js` (AC: 1, 2)
  - [x] Test: after `#run-integrity-check-btn` click, `#recovery-rebuild-btn` appears in DOM before `#recovery-delete-local-btn`.
  - [x] Test: `#recovery-rebuild-btn` has primary visual treatment (no `destructive` class), `#recovery-delete-local-btn` has `destructive` class.

## Dev Notes

### Architecture Alignment

- **Design invariant, not just UX preference**: The "non-destructive first" ordering is a product architecture rule (`FR32`). It is enforced at the command layer, tested at the unit level, and verified at the integration level. It is NOT a CSS ordering concern.
- **Complements Story 4.5 and 4.6**: This story adds the ordering invariant verification layer on top of the recovery flow (4.5) and the confirmation guard (4.6). It does not introduce new functional capabilities — it hardens and validates existing ones.
- **No new commands**: This story adds tests and invariant guards, not new business logic files. The only code changes are: guard in `runGuidedRecovery.js`, tests in `runGuidedRecovery.test.js`, and integration tests in `initializePlanningInboxApp.test.js`.

### Project Structure Notes

- Modify: `resources/js/features/planning/commands/runGuidedRecovery.js` (add ordering guard + JSDoc)
- Modify: `resources/js/features/planning/commands/runGuidedRecovery.test.js` (add ordering invariant tests)
- Modify: `resources/js/features/planning/commands/executeRecoveryAction.js` (add invariant comment, verify guard)
- Modify: `resources/js/features/planning/app/initializePlanningInboxApp.js` (verify render order, no resorting)
- Modify: `resources/js/features/planning/app/initializePlanningInboxApp.test.js` (add DOM order test)
- No new files required.

### Dependency on Previous Stories

- **Story 4.5** (`runGuidedRecovery.js`, `executeRecoveryAction.js`) MUST be implemented before this story. This story adds invariant verification to those implementations.
- **Story 4.6** (`validateDestructiveConfirmation`) — the confirmation guard tested in this story uses the shared guard from 4.6.

### Ordering Invariant Guard (runtime assertion)

```js
// In runGuidedRecovery.js, after building actions array

// Runtime invariant: non-destructive MUST precede destructive
const firstDestructiveIdx = actions.findIndex(a => a.destructive === true);
const lastNonDestructiveIdx = [...actions].reverse().findIndex(a => a.destructive === false);
const lastNonDestructiveActualIdx = lastNonDestructiveIdx === -1 ? -1 : actions.length - 1 - lastNonDestructiveIdx;

if (firstDestructiveIdx !== -1 && lastNonDestructiveActualIdx > firstDestructiveIdx) {
  // This is a development/test invariant violation - should never reach production
  throw new Error('INVARIANT_VIOLATION: destructive action precedes non-destructive in recovery guide');
}
```

### UI Render Order Contract

In `initializePlanningInboxApp.js`, the action rendering loop MUST preserve array order:

```js
// CORRECT: render in array order (non-destructive first by contract)
guide.actions.forEach(action => {
  const btn = document.createElement('button');
  btn.textContent = action.label;
  if (action.destructive) btn.classList.add('destructive');
  recoveryActionsEl.appendChild(btn);
});

// WRONG: any sorting or reordering of actions in the UI layer
guide.actions.sort((a, b) => ...) // NEVER DO THIS — ordering is contractual
```

### Test Assertions for Ordering

```js
// Unit test assertion
test('actions array always places non-destructive options before destructive ones', () => {
  const guide = await runGuidedRecovery();
  const firstDestructiveIdx = guide.actions.findIndex(a => a.destructive);
  const firstNonDestructiveIdx = guide.actions.findIndex(a => !a.destructive);
  expect(firstNonDestructiveIdx).toBeLessThan(firstDestructiveIdx);
  expect(guide.actions[0].destructive).toBe(false);
});

// Integration test assertion
test('recovery rebuild button appears before delete button in DOM', async () => {
  // click #run-integrity-check-btn ...
  const rebuildBtn = document.querySelector('#recovery-rebuild-btn');
  const deleteBtn = document.querySelector('#recovery-delete-local-btn');
  expect(rebuildBtn.compareDocumentPosition(deleteBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
```

### Testing Framework

- **Framework**: Vitest with `happy-dom`
- **Run**: `npm run test:js`
- Baseline: 457 tests (must not regress; this story adds tests only)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.7] — FR32
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling Patterns] — Default to recovery-first, non-destructive handling paths
- [Source: _bmad-output/implementation-artifacts/4-5-guided-non-destructive-recovery.md] — `RecoveryGuide.actions` shape and ordering requirement
- [Source: _bmad-output/implementation-artifacts/4-6-destructive-path-confirmation-restricted.md] — Confirmation guard at command layer

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

- Added ordering invariant tests to runGuidedRecovery.test.js (RecoveryGuide.actions ordering, first non-destructive, holds with/without violations).
- Added runtime guard in runGuidedRecovery.js throwing INVARIANT_VIOLATION when destructive precedes non-destructive.
- Documented no-destructive-default policy in runGuidedRecovery.js JSDoc (FR32).
- Added invariant comment and destructive guard reference in executeRecoveryAction.js (test already existed for RECOVERY_CONFIRMATION_REQUIRED).
- Added `destructive` class to delete-local button in planning.blade.php; test HTML has primary/destructive classes.
- Added integration tests: DOM order (rebuild before delete via compareDocumentPosition), rebuild no destructive class, delete has destructive class.
- Hardened invariant behavior so INVARIANT_VIOLATION is fail-fast in development/test and not downgraded to generic RECOVERY_CHECK_FAILED.
- Recovery actions UI now preserves `guide.actions` array order in DOM without UI sorting.
- `executeRecoveryAction` now propagates partial-success metadata from `delete-local-data` path.
- All 457 tests pass; npm run build succeeds.

### File List

- resources/js/features/planning/commands/runGuidedRecovery.js (modified)
- resources/js/features/planning/commands/runGuidedRecovery.test.js (modified)
- resources/js/features/planning/commands/executeRecoveryAction.js (modified)
- resources/js/features/planning/commands/executeRecoveryAction.test.js (modified)
- resources/views/planning.blade.php (modified)
- resources/js/features/planning/app/initializePlanningInboxApp.js (modified)
- resources/js/features/planning/app/initializePlanningInboxApp.test.js (modified)

### Change Log

- 2026-02-23: Code review remediation pass completed.
- Fixed runtime ordering guard handling so invariant violations are surfaced explicitly.
- Implemented recovery action DOM rendering in `guide.actions` order (no UI re-sorting).
- Propagated delete-path partial success metadata through `executeRecoveryAction`.
- Added regression tests for invariant helper, DOM order preservation, and delete partial metadata propagation.

## Senior Developer Review (AI)

### Reviewer

Codex (adversarial review mode)

### Outcome

Approved after fixes.

### Resolved Findings

- HIGH: Runtime ordering invariant could be swallowed by generic catch; now fails fast for `INVARIANT_VIOLATION`.
- MEDIUM: Recovery UI did not render action blocks from `guide.actions` order; now preserves contractual array order.
- MEDIUM: `executeRecoveryAction` dropped delete partial-success metadata; now forwards `code/message` on successful partial outcomes.

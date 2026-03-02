# Story 4.2: Integrity Validation Toolkit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a support operator,
I want deterministic integrity checks for planning state,
so that inconsistencies are diagnosable before remediation actions are taken.

## Acceptance Criteria

1. **Given** a potential state inconsistency is reported, **when** integrity validation runs on the current local planning state, **then** validation outputs a deterministic `pass` or `fail` result for the same input state.
2. **And** results clearly identify which invariant boundaries were violated (specific, named invariant, not a generic error).
3. **And** validation MUST be read-only — it MUST NOT mutate any store, projection, or event log.
4. **And** validation output is a structured report object (not a UI-only console dump), so it can be consumed programmatically by recovery flows (Story 4.5).
5. **And** validation covers at minimum: Today cap constraint, task field integrity (id, title non-empty), area membership consistency, and day-cycle continuity markers.

## Tasks / Subtasks

- [x] Create `validatePlanningIntegrity.js` in `resources/js/features/planning/commands/` (AC: 1, 2, 3, 4)
  - [x] Accept a `snapshot` object `{ tasks, todayCap, areas, dayCycle }` as input (no direct store reads — pure function).
  - [x] Run each invariant check and collect results.
  - [x] Return a structured `IntegrityReport`:
    ```js
    {
      ok: true | false,
      checkedAt: '<ISO-8601 timestamp>',
      violations: [
        { invariant: 'TODAY_CAP_EXCEEDED', detail: '...' },
        ...
      ],
      passed: ['TASK_FIELD_INTEGRITY', 'AREA_MEMBERSHIP', ...]
    }
    ```
  - [x] Each check: `TODAY_CAP_EXCEEDED`, `TASK_FIELD_INTEGRITY`, `AREA_MEMBERSHIP_CONSISTENCY`, `DAY_CYCLE_CONTINUITY`.

- [x] Implement individual invariant check functions (AC: 2, 5)
  - [x] `checkTodayCapConstraint(tasks, todayCap)` — count tasks in today (`todayIncluded: true`); fail if > todayCap.
  - [x] `checkTaskFieldIntegrity(tasks)` — verify every task has non-empty `id` and `title` (uses shared `validateTaskFields` from invariants).
  - [x] `checkAreaMembershipConsistency(tasks, areas)` — verify every task with an `area` references an existing area id.
  - [x] `checkDayCycleContiguity(dayCycle)` — verify `lastPlanningDate` is present and parseable when `dayCycle` is not null.

- [x] Create `loadPlanningSnapshot.js` helper in `resources/js/features/planning/persistence/` (AC: 3)
  - [x] Reads tasks, todayCap, areas, dayCycle from respective stores (getAllInboxTasks, readTodayCap, listAreas, readLastPlanningDate) and assembles snapshot.
  - [x] Used by recovery flows and the timeline; MUST NOT mutate state.

- [x] Create `runIntegrityCheck.js` command (thin orchestrator) (AC: 1, 4)
  - [x] Calls `loadPlanningSnapshot()` then `validatePlanningIntegrity(snapshot)`.
  - [x] Returns the `IntegrityReport` directly.
  - [x] If snapshot load fails, returns `{ ok: false, violations: [{ invariant: 'SNAPSHOT_LOAD_FAILED', detail }] }`.

- [x] Write unit tests in `validatePlanningIntegrity.test.js` (AC: 1, 2, 3, 4, 5)
  - [x] Test: clean state → `ok: true`, all checks in `passed` list.
  - [x] Test: today has more tasks than cap → `TODAY_CAP_EXCEEDED` in violations.
  - [x] Test: task with empty title → `TASK_FIELD_INTEGRITY` in violations.
  - [x] Test: task referencing non-existent areaId → `AREA_MEMBERSHIP_CONSISTENCY` in violations.
  - [x] Test: multiple violations detected in same run (not early-exit on first violation).
  - [x] Test: pure function — calling it twice with same input returns identical result.

- [x] Write unit tests in `runIntegrityCheck.test.js` (AC: 1, 3)
  - [x] Mock `loadPlanningSnapshot` and `validatePlanningIntegrity`.
  - [x] Test snapshot load failure returns structured error report.
  - [x] Test success path returns IntegrityReport from validator.

## Dev Notes

### Architecture Alignment

- **Deterministic**: The validator is a **pure function** taking `snapshot` as input. Same input → identical output. No date-at-runtime dependency beyond `checkedAt` timestamp generation.
- **Read-only contract**: `validatePlanningIntegrity` and `loadPlanningSnapshot` MUST NOT write to IndexedDB or `localStorage`. Violation of this is a critical defect.
- **Structured output**: The `IntegrityReport` shape is the contract for Story 4.5 (guided recovery). Do not change its top-level keys.
- **No UI coupling**: The toolkit functions are pure domain/command layer. UI display is handled by the recovery flow (Story 4.5) and the timeline (Story 4.4).

### Project Structure Notes

- New file: `resources/js/features/planning/commands/validatePlanningIntegrity.js`
- New file: `resources/js/features/planning/commands/validatePlanningIntegrity.test.js`
- New file: `resources/js/features/planning/commands/runIntegrityCheck.js`
- New file: `resources/js/features/planning/commands/runIntegrityCheck.test.js`
- New file: `resources/js/features/planning/persistence/loadPlanningSnapshot.js`
- New file: `resources/js/features/planning/persistence/loadPlanningSnapshot.test.js`
- Reference (do NOT duplicate logic): `resources/js/features/planning/export/exportPlanningData.js` — reuse `validateExportTasks` or extract shared validation to a shared utility.

### Invariant Name Catalog (stable identifiers)

Use these exact string identifiers — they are the invariant names consumed by Story 4.5 and 4.4:

| Identifier | Description |
|---|---|
| `TODAY_CAP_EXCEEDED` | Today has more tasks than the configured cap |
| `TASK_FIELD_INTEGRITY` | Task missing non-empty `id` or `title` |
| `AREA_MEMBERSHIP_CONSISTENCY` | Task references areaId not present in areas list |
| `DAY_CYCLE_CONTINUITY` | `lastPlanningDate` missing or unparseable when dayCycle active |
| `SNAPSHOT_LOAD_FAILED` | Could not load planning state for validation |

### Deduplication of Validation Logic

`validateExportTasks` in `exportPlanningData.js` already checks for valid `id` and `title`. Extract a shared utility `validateTaskFields(tasks)` into `resources/js/features/planning/invariants/` if it would be reused by both export and integrity paths. Do NOT duplicate the logic.

### IntegrityReport Shape (contract)

```js
// Success
{
  ok: true,
  checkedAt: '2026-03-02T10:00:00.000Z',
  violations: [],
  passed: ['TODAY_CAP_EXCEEDED', 'TASK_FIELD_INTEGRITY', 'AREA_MEMBERSHIP_CONSISTENCY', 'DAY_CYCLE_CONTINUITY']
}

// Failure
{
  ok: false,
  checkedAt: '2026-03-02T10:00:00.000Z',
  violations: [
    { invariant: 'TODAY_CAP_EXCEEDED', detail: 'Today contains 6 tasks but cap is 5.' }
  ],
  passed: ['TASK_FIELD_INTEGRITY', 'AREA_MEMBERSHIP_CONSISTENCY', 'DAY_CYCLE_CONTINUITY']
}
```

### Existing Store Reads (for loadPlanningSnapshot)

| Store | Module | Read function |
|---|---|---|
| Tasks | `inboxTaskStore.js` | `getAllTasks()` (or equivalent) |
| Today cap | `todayCapStore.js` | `loadTodayCap()` |
| Areas | `areaStore.js` | `loadAreas()` |
| Day cycle | `dayCycleStore.js` | `loadDayCycle()` |

### Testing Framework

- **Framework**: Vitest with `happy-dom`
- **Run**: `npm run test:js`
- **Build check**: `npm run build` after any new exports
- Baseline: 347 tests (must not regress)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2] — FR34
- [Source: _bmad-output/planning-artifacts/architecture.md#Invariant Enforcement Layer] — Invariants centralized, never in UI
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Non-Negotiables] — Projections deterministically rebuildable
- [Source: _bmad-output/implementation-artifacts/S-008] — `validateExportTasks` precedent for field validation

## Dev Agent Record

### Agent Model Used

Composer (Cursor)

### Debug Log References

-

### Completion Notes List

- Extracted `validateTaskFields` into `invariants/validateTaskFields.js`; `validateExportTasks` now uses it
- `validatePlanningIntegrity` is pure; snapshot shape `{ tasks, todayCap, areas, dayCycle }` (dayCycle = lastPlanningDate)
- `loadPlanningSnapshot` uses `getAllInboxTasks`, `readTodayCap`, `listAreas`, `readLastPlanningDate`
- Tightened `DAY_CYCLE_CONTINUITY`: dayCycle active now requires non-empty and parseable date (not regex-only)
- Added deterministic tests for non-parseable date (`2026-13-99`) and empty active dayCycle
- Full regression now green: 439/439 tests passing

### File List

- resources/js/features/planning/invariants/validateTaskFields.js (new)
- resources/js/features/planning/invariants/validateTaskFields.test.js (new)
- resources/js/features/planning/commands/validatePlanningIntegrity.js (new)
- resources/js/features/planning/commands/validatePlanningIntegrity.test.js (new)
- resources/js/features/planning/commands/runIntegrityCheck.js (new)
- resources/js/features/planning/commands/runIntegrityCheck.test.js (new)
- resources/js/features/planning/persistence/loadPlanningSnapshot.js (new)
- resources/js/features/planning/persistence/loadPlanningSnapshot.test.js (new)
- resources/js/features/planning/export/exportPlanningData.js (modified - uses validateTaskFields)
- resources/js/features/planning/commands/deleteLocalPlanningData.test.js (modified - confirmation code alignment)
- resources/js/features/planning/commands/deleteSyncedPlanningData.test.js (modified - confirmation code alignment)
- resources/js/features/planning/commands/resetSyncState.test.js (modified - confirmation code alignment)

## Senior Developer Review (AI)

**Outcome: Approve (post-fix)**

### Findings and Resolutions

- [x] **HIGH** `DAY_CYCLE_CONTINUITY` accepted values that were regex-valid but not parseable, and empty active dayCycle  
  **Resolution:** added strict parseability validation and explicit failure for empty active dayCycle in `validatePlanningIntegrity.js`.
- [x] **MEDIUM** Missing tests for day-cycle edge cases  
  **Resolution:** added coverage for invalid parseable-looking date and empty active dayCycle in `validatePlanningIntegrity.test.js`.
- [x] **MEDIUM** Full-suite regressions from confirmation-code standardization (`CONFIRMATION_REQUIRED`)  
  **Resolution:** aligned affected tests (`deleteLocalPlanningData`, `deleteSyncedPlanningData`, `resetSyncState`) to current command contract.
- [x] **MEDIUM** Story/testing notes stale versus current baseline  
  **Resolution:** updated completion notes and file list to reflect actual current state and test baseline.

## Change Log

- 2026-02-23: Code review remediation completed for 4.2. Tightened day-cycle continuity validation, expanded edge-case tests, aligned confirmation-code tests, and revalidated full regression suite (439 passing).

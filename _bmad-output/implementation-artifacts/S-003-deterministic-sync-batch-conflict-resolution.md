# Story S-003: Deterministic Sync Batch Conflict Resolution

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,  
I want sync batch merges to resolve conflicts deterministically,  
so that multi-device updates never produce unpredictable planning state.

## Scope Mapping (Epic 3)

- Maps to: Story 3.3
- Implements: FR55, FR56

## Acceptance Criteria

1. **Given** conflicting updates arrive through sync batch processing, **when** merge resolution executes, **then** conflict resolution is deterministic.
2. **And** tie-break strategy is documented as `timestamp + device_id`.
3. **And** resolution does not alter Today cap invariant.
4. **And** merge does not introduce implicit carry-over behavior.

## Tasks / Subtasks

- [x] Implement deterministic merge resolver with explicit tie-break contract (AC: 1, 2)
  - [x] Apply stable ordering by `timestamp` then `device_id`.
  - [x] Define behavior for equal timestamps and absent device identifiers.
  - [x] Document resolver decision table in code-level design notes.

- [x] Protect planning invariants during merge application (AC: 3, 4)
  - [x] Reuse invariant guardrail for post-merge state validation.
  - [x] Enforce Today cap constraints during conflict application.
  - [x] Preserve no-implicit-carry-over continuity semantics from Epic 2.

- [x] Ensure atomicity and deterministic replay behavior (AC: 1, 3, 4)
  - [x] Batch merge applies all-or-nothing in local persistence.
  - [x] Reprocessing same batch yields equivalent resulting state.

- [x] Add tests for deterministic outcomes and invariant safety (AC: 1, 2, 3, 4)
  - [x] Unit tests for resolver tie-break rules.
  - [x] Integration tests for conflicting cross-device updates.
  - [x] Regression tests for Today cap and carry-over guarantees.

## Data Model / State Touchpoints

- Sync batch metadata includes `timestamp` and `device_id`.
- Existing task temporal fields (`scheduledFor`, `retainedFor`, `todayIncluded`) must remain valid after merge.
- Existing Today cap configuration remains authoritative.

## Error Handling Expectations

- Invalid/conflicting payloads return deterministic domain errors.
- Partial merge writes are rolled back on invariant violation.
- UI receives high-level sync conflict outcome, not raw stack details.

## Telemetry / Observability (if needed)

- Optional counters:
  - `sync_conflict_resolved` by strategy branch
  - `sync_merge_invariant_reject` by invariant code

## Assumptions / Open Questions

- Assumption: `device_id` is available for all synced mutations; if missing, fallback policy must be explicitly defined.
- Open question: whether server already enforces monotonic timestamps or client must guard against clock skew.

## Dev Agent Record

- **Agent**: Claude (Cursor)
- **Date**: 2026-02-23
- **Branch**: feature/epic-3

### File List

- `resources/js/features/planning/sync/syncBatchMerge.js` (New File) — Deterministic merge resolver with tie-break contract, cap enforcement, atomicity.
- `resources/js/features/planning/sync/syncBatchMerge.test.js` (New File) — 24 unit tests covering all AC.
- `resources/js/features/planning/invariants/mutationGuardrail.js` (Modified) — Added `applyMergeBatch` action; imported `resolveSyncBatch`.
- `resources/js/features/planning/invariants/mutationGuardrail.test.js` (Modified) — 4 integration tests for `applyMergeBatch` action.

### Implementation Notes

- `compareMutations` implements a total order (primary: `timestamp`, secondary: `device_id` lexicographic, fallback: presence of device_id).
- `resolveConflict` is a pure reducer over a list of mutations — stable and testably deterministic.
- `resolveSyncBatch` is a pure function; all persistence side effects remain the caller's responsibility.
- `todayIncluded` is propagated from the winning mutation (OR with local), then cap is enforced on the entire resolved set.
- All-or-nothing: `resolveSyncBatch` returns a complete `resolvedTasks` list or `ok: false` — no partial writes.

## Senior Developer Review (AI)

**Date**: 2026-02-23  
**Outcome**: Approve (with fixes applied)

### Findings addressed

| Severity | Finding | Resolution |
|----------|---------|------------|
| HIGH | JSDoc comment `todayIncluded is NEVER set to true by merge alone` contradicted the implementation (OR semantics). | Corrected: doc now states merge applies winner's `todayIncluded` OR local value, cap enforced post-merge. |
| MEDIUM | `conflicts` field counts only intra-batch conflicts, not local-vs-incoming conflicts. Semantics not documented. | Added explicit JSDoc note clarifying scope of `conflicts`. |
| MEDIUM | `normalizeResult` in guardrail did not forward `resolvedTasks` / `conflicts` fields. Future callers would silently lose data. | Extended `normalizeResult` to propagate both fields. |
| LOW | `localTasks` elements with missing/empty `id` entered the Map with key `undefined`. | Added filter: only valid-id tasks enter `localById`. Added regression test. |
| LOW | On reject, `resolvedTasks: []` not distinguishable from "empty batch". | Added JSDoc note; architectural behavior retained intentionally. |

### AC Verification

| AC | Verified |
|----|---------|
| AC1: conflict resolution is deterministic | ✅ `compareMutations` implements total order; `resolveConflict` is order-independent (test: "is deterministic regardless of input order"). |
| AC2: tie-break documented as `timestamp + device_id` | ✅ Module JSDoc + `compareMutations` JSDoc. |
| AC3: resolution does not alter Today cap invariant | ✅ Post-merge cap check rejects batch if count > cap. Test: "rejects merge if resolved state would exceed todayCap". |
| AC4: merge does not introduce implicit carry-over | ✅ Only fields explicitly present in winner are spread; `scheduledFor`/`retainedFor` not injected silently. Test: "does not implicitly set retainedFor or scheduledFor". |

### Test coverage

- `syncBatchMerge.test.js`: 25 tests, all green.
- `mutationGuardrail.test.js`: 4 integration tests for `applyMergeBatch`, all green.
- Total suite: **83 tests passing**.

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-23 | Implemented `syncBatchMerge.js`, guardrail action `applyMergeBatch`, 28 tests (82 total passing). | Dev Agent |
| 2026-02-23 | Code review fixes: corrected JSDoc contract, added localTask id validation, extended `normalizeResult`, added review test. 83 tests passing. | Dev Agent |


# Story 4.3: Safe Projection Rebuild After Migration or Corruption

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,
I want projections rebuilt deterministically after migration or partial corruption,
so that recovery never requires destructive reset.

## Acceptance Criteria

1. **Given** projection rebuild is triggered from snapshot plus event history, **when** rebuild completes, **then** rebuild from identical input MUST produce identical Today projection output (deterministic).
2. **And** recompute MUST NOT alter explicit user decisions (tasks in Today, area assignments, Today cap value, day-cycle date).
3. **And** rebuild MUST succeed from a clean snapshot alone (event log is supplementary, not required).
4. **And** rebuild MUST be callable programmatically from recovery flows without UI involvement.
5. **And** after rebuild, the in-memory planning view reflects the rebuilt projection without requiring a full page reload.

## Tasks / Subtasks

- [x] Create `rebuildPlanningProjection.js` command in `resources/js/features/planning/commands/` (AC: 1, 2, 3, 4)
  - [x] Accept options: `{ snapshot?, useEventLog?, ui?, onRemoveFromToday? }`.
  - [x] If `snapshot` not provided, call `loadPlanningSnapshot()` (from Story 4.2).
  - [x] Run `computeTodayProjection(tasks, todayCap)` from existing `computeTodayProjection.js`.
  - [x] Run `renderTodayProjection(projection, ui)` when `ui` provided.
  - [x] Optionally apply event log replay to patch the snapshot before projection compute (if `useEventLog: true`).
  - [x] Return `{ ok: true, projection }` on success; `{ ok: false, code: 'REBUILD_FAILED', message }` on failure.
  - [x] MUST NOT mutate `lastPlanningDate`, `areas`, `todayCap`, or any task `todayIncluded` flag in persistence (read-only pass on snapshot).

- [x] Implement `replayEventLogPatch(snapshot, events)` helper (AC: 1, 3)
  - [x] Filter events by `event_type` relevant to projection (e.g., `planning.task.added_to_today`, `planning.task.removed_from_today`, `planning.task.rescheduled`).
  - [x] Apply events in chronological order (sort by `timestamp`).
  - [x] Return a patched snapshot (new object, not mutating input).
  - [x] If event log is empty or unavailable, return snapshot unchanged.

- [x] Integrate rebuild trigger into `deleteLocalPlanningData.js` post-delete path (AC: 5)
  - [x] Added `onAfterDelete` optional callback to `deleteLocalPlanningData`; app handler passes `() => refreshInbox()`.
  - [x] UI reflects empty state immediately without requiring reload.

- [x] Expose `rebuildPlanningProjection` as part of the recovery API (AC: 4)
  - [x] Export from `commands/rebuildPlanningProjection.js`; Story 4.5 will import it.

- [x] Write unit tests in `rebuildPlanningProjection.test.js` (AC: 1, 2, 3, 4)
  - [x] Test: same snapshot input → identical `Today` projection output (determinism test).
  - [x] Test: rebuild does NOT mutate `todayCap`, `areas`, `lastPlanningDate`, or `todayIncluded` flags.
  - [x] Test: rebuild succeeds with empty event log.
  - [x] Test: rebuild applies event log patch when `useEventLog: true`.
  - [x] Test: snapshot load failure returns `REBUILD_FAILED`.
  - [x] Test: `renderTodayProjection` called once when ui provided.

- [x] Write unit tests in `replayEventLogPatch.test.js` (AC: 1, 3)
  - [x] Test: empty events returns unchanged snapshot.
  - [x] Test: `added_to_today` event sets `todayIncluded: true` on matching task.
  - [x] Test: `removed_from_today` event sets `todayIncluded: false` on matching task.
  - [x] Test: events applied in chronological order (later event wins).
  - [x] Test: unknown event types are ignored (no crash, no mutation).

## Dev Notes

### Architecture Alignment

- **Determinism is the core invariant**: Same snapshot + same events → same projection. This is tested, not assumed.
- **Non-destructive by design**: The rebuild never writes to the task store, today cap, or area store. It only updates the in-memory rendered projection (via `renderTodayProjection`).
- **Event log is supplementary**: Architecture explicitly states Phase 1 is NOT event-sourced. State derives from snapshot. Events are replay patches for recovery only.
- **No destructive reset path**: If rebuild fails, return an error. Do NOT fall back to clearing planning data.

### Project Structure Notes

- New file: `resources/js/features/planning/commands/rebuildPlanningProjection.js`
- New file: `resources/js/features/planning/commands/rebuildPlanningProjection.test.js`
- New file: `resources/js/features/planning/commands/replayEventLogPatch.js`
- New file: `resources/js/features/planning/commands/replayEventLogPatch.test.js`
- Reference (existing, MUST NOT rewrite): `resources/js/features/planning/projections/computeTodayProjection.js`
- Reference (existing, MUST NOT rewrite): `resources/js/features/planning/projections/renderTodayProjection.js`
- Reference (from Story 4.2): `resources/js/features/planning/persistence/loadPlanningSnapshot.js`
- Reference (from Story 4.1): `resources/js/features/planning/persistence/eventLogStore.js` (`getAllEvents()`)

### Dependency on Previous Stories

This story depends on:
- **Story 4.1** (`eventLogStore.js`) for `getAllEvents()` — if 4.1 is not yet merged, mock it in tests with `vi.mock`.
- **Story 4.2** (`loadPlanningSnapshot.js`) — if not yet merged, mock it in tests.

### Projection Rebuild Flow

```
rebuildPlanningProjection(options)
  ↓
loadPlanningSnapshot()  →  { tasks, todayCap, areas, dayCycle }
  ↓ (if useEventLog: true)
replayEventLogPatch(snapshot, getAllEvents())  →  patchedSnapshot
  ↓
computeTodayProjection(patchedSnapshot.tasks, patchedSnapshot.todayCap)  →  projection
  ↓
renderTodayProjection(projection)  →  UI updated
  ↓
return { ok: true, projection }
```

### Event Replay Rules

Only these event types affect the Today projection:
- `planning.task.added_to_today` → set `task.inToday = true` for matching `entity_id`
- `planning.task.removed_from_today` → set `task.inToday = false` for matching `entity_id`
- `planning.task.rescheduled` → if task rescheduled to future date, set `task.inToday = false`

All other event types are ignored during replay. This keeps the replay patch minimal and safe.

### Guard Against Explicit User Decision Mutation (AC: 2)

The rebuild reads `inToday` from the snapshot as the baseline. Event replay only applies events **after** the snapshot's implicit timestamp (or all events if no snapshot timestamp). The planner's explicit `addToToday`/`removeFromToday` decisions are preserved via the snapshot, not overridden by event replay.

### Error Code Additions

- `REBUILD_FAILED` — generic rebuild error (snapshot load failure, projection compute error)
- `REBUILD_PARTIAL` — rebuild succeeded but event replay had non-fatal errors (logged, not surfaced)

### Testing Framework

- **Framework**: Vitest with `happy-dom`
- **Run**: `npm run test:js`
- **Mocking**: Use `vi.mock` for `loadPlanningSnapshot`, `eventLogStore`, `renderTodayProjection` in unit tests
- Baseline: 347 tests (must not regress)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3] — FR32
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — Snapshot-first, materialized projections with rebuild hooks
- [Source: _bmad-output/planning-artifacts/architecture.md#Event Log Nature] — Events are audit/recovery support, not sole state source
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Non-Negotiables] — Today projection is rebuildable and invariant-safe

## Dev Agent Record

### Agent Model Used

Composer (Cursor)

### Debug Log References

-

### Completion Notes List

- `replayEventLogPatch` maps event types to task `todayIncluded`; uses `todayIncluded` (not `inToday`) to match codebase
- `rebuildPlanningProjection` accepts optional `ui` for render; when omitted, returns projection only (for programmatic use)
- `deleteLocalPlanningData` accepts optional `onAfterDelete` callback; app now uses callback to refresh inbox and explicitly rebuild projection UI.
- replay determinism hardened: `planning.task.rescheduled` now compares against snapshot `dayCycle` (no wall-clock dependency)
- rebuild now surfaces non-fatal event replay failures as `REBUILD_PARTIAL`
- post-delete callback now triggers explicit projection rebuild in app flow (`refreshInbox` + `rebuildPlanningProjection`)
- Full regression suite passes: 447/447

### File List

- resources/js/features/planning/commands/replayEventLogPatch.js (new)
- resources/js/features/planning/commands/replayEventLogPatch.test.js (new)
- resources/js/features/planning/commands/rebuildPlanningProjection.js (new)
- resources/js/features/planning/commands/rebuildPlanningProjection.test.js (new)
- resources/js/features/planning/commands/deleteLocalPlanningData.js (modified - onAfterDelete)
- resources/js/features/planning/commands/deleteLocalPlanningData.test.js (modified - onAfterDelete callback tests)
- resources/js/features/planning/app/initializePlanningInboxApp.js (modified - onAfterDelete integration)
- resources/js/features/planning/app/initializePlanningInboxApp.test.js (modified)

## Senior Developer Review (AI)

**Outcome: Approve (post-fix)**

### Findings and Resolutions

- [x] **HIGH** Non-deterministic replay logic (`rescheduled` used wall clock)  
  **Resolution:** replay now uses snapshot `dayCycle` as deterministic reference date; removed runtime date dependency.
- [x] **HIGH** Task marked complete but rebuild trigger after delete did not explicitly call rebuild command  
  **Resolution:** app delete flows now invoke `rebuildPlanningProjection` in `onAfterDelete` callback (both control panel and recovery delete paths).
- [x] **MEDIUM** Event replay failure was silently swallowed  
  **Resolution:** `rebuildPlanningProjection` now returns `REBUILD_PARTIAL` with message when event replay cannot be applied.
- [x] **MEDIUM** Time-sensitive tests were fragile  
  **Resolution:** replay tests now assert snapshot-reference-date behavior explicitly, independent of current date.
- [x] **MEDIUM** Story/file tracking clarity  
  **Resolution:** Dev Agent Record updated with post-review behavior changes and current regression baseline.

## Change Log

- 2026-02-23: Code review remediation completed for 4.3. Fixed deterministic replay reference date, added `REBUILD_PARTIAL` signaling, wired explicit rebuild trigger after delete flows, and expanded tests (447 passing).

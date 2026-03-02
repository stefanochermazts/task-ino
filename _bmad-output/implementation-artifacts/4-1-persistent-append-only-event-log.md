# Story 4.1: Persistent Append-Only Event Log

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a support-aware planner,
I want planning and sync events persisted in an append-only log,
so that recovery and troubleshooting have reliable traceability.

## Acceptance Criteria

1. **Given** planning and sync operations occur over time, **when** events are recorded, **then** the event log MUST be append-only (no updates or deletes on existing entries).
2. **And** the event log MUST survive page reload and browser restart (persisted in IndexedDB).
3. **And** the event log MUST be inspectable without altering runtime state (read-only projection).
4. **And** each event entry MUST include at least: `timestamp` (ISO-8601 UTC), `event_type` (`domain.entity.action` format), `entity_id`, `device_id`, and `idempotency_key` when applicable.
5. **And** the event log MUST NOT be treated as primary source-of-truth for planning runtime (snapshot + projection remain authoritative).
6. **And** appending an event MUST NOT block or delay core planning operations (async, non-blocking write).

## Tasks / Subtasks

- [x] Create `eventLogStore.js` in `resources/js/features/planning/persistence/` (AC: 1, 2, 3)
  - [x] Open a dedicated IndexedDB object store `planningEventLog` (separate from the task store).
  - [x] Implement `appendEvent(entry)` — adds a record, never updates existing.
  - [x] Implement `getAllEvents()` — returns full log in insertion order, read-only.
  - [x] Implement `getEventsByType(eventType)` — filtered read.
  - [x] Implement `clearEventLog()` — available for use in local-delete flow only (irreversible, called from `deleteLocalPlanningData`).
  - [x] Store schema: `{ id: autoIncrement, timestamp, event_type, entity_id, device_id, idempotency_key, payload_version, payload }`.

- [x] Create `appendPlanningEvent.js` command in `resources/js/features/planning/commands/` (AC: 1, 4, 6)
  - [x] Validate required fields before write: `timestamp`, `event_type`, `entity_id`.
  - [x] Return `{ ok: true, id }` on success; `{ ok: false, code: 'EVENT_LOG_WRITE_FAILED', message }` on failure.
  - [x] Write MUST be fire-and-forget from caller perspective (non-blocking planning loop).

- [x] Instrument key domain commands to emit events (AC: 4, 5)
  - [x] `createInboxTask.js` → emit `planning.task.created`
  - [x] `addToToday.js` → emit `planning.task.added_to_today`
  - [x] `removeFromToday.js` → emit `planning.task.removed_from_today`
  - [x] `rescheduleTask.js` → emit `planning.task.rescheduled`
  - [x] `enforceDailyContinuity.js` → emit `planning.cycle.continuity_enforced`
  - [x] `setSyncMode.js` → emit `planning.sync.mode_changed`
  - [x] `resetSyncState.js` → emit `planning.sync.reset`
  - [x] Do NOT await event append in the mutation hot path — use `.catch(console.error)` pattern.

- [x] Integrate `clearEventLog()` into `deleteLocalPlanningData.js` (AC: 2)
  - [x] Call `clearEventLog()` as part of the local data deletion sequence.
  - [x] Failure to clear event log should NOT block deletion success (log-and-continue).

- [x] Write unit tests in `eventLogStore.test.js` (AC: 1, 2, 3, 4)
  - [x] Test `appendEvent` adds records with correct shape.
  - [x] Test append-only guarantee: `appendEvent` never mutates existing record.
  - [x] Test `getAllEvents` returns events in insertion order.
  - [x] Test `getEventsByType` filters correctly.
  - [x] Test `clearEventLog` empties the store.
  - [x] Use fake IndexedDB pattern from `e2eeClientCrypto.test.js` for IDB mocking.

- [x] Write unit tests in `appendPlanningEvent.test.js` (AC: 1, 4, 6)
  - [x] Test valid entry accepted and `ok: true` returned.
  - [x] Test missing required fields returns `EVENT_LOG_WRITE_FAILED`.
  - [x] Test IDB write failure returns graceful error.

## Dev Notes

### Architecture Alignment

- **Event log purpose**: Audit/recovery/support traceability only. NOT the primary state source. State derives from IndexedDB snapshot + projections (architecture mandate).
- **Event naming**: MUST use `domain.entity.action` format per architecture patterns (e.g., `planning.task.created`, `planning.sync.mode_changed`).
- **Event payload versioning**: Include `payload_version: 1` in every event to support future format migrations.
- **Non-blocking write policy**: Never `await` event log writes in the planning mutation hot path. Use fire-and-forget with `.catch(console.error)`.

### Project Structure Notes

- New file: `resources/js/features/planning/persistence/eventLogStore.js`
- New file: `resources/js/features/planning/persistence/eventLogStore.test.js`
- New file: `resources/js/features/planning/commands/appendPlanningEvent.js`
- New file: `resources/js/features/planning/commands/appendPlanningEvent.test.js`
- Modify: `resources/js/features/planning/commands/createInboxTask.js`
- Modify: `resources/js/features/planning/commands/addToToday.js`
- Modify: `resources/js/features/planning/commands/removeFromToday.js`
- Modify: `resources/js/features/planning/commands/rescheduleTask.js`
- Modify: `resources/js/features/planning/commands/enforceDailyContinuity.js`
- Modify: `resources/js/features/planning/commands/setSyncMode.js`
- Modify: `resources/js/features/planning/commands/resetSyncState.js`
- Modify: `resources/js/features/planning/commands/deleteLocalPlanningData.js`

### IndexedDB Pattern Reference

Follow the exact same IDB open/store/request pattern established in `e2eeClientCrypto.js`. Use a **separate** `planningEventLog` DB (or separate object store in the existing planning DB) — do NOT mix with task or key stores. Use `autoIncrement: true` for the primary key so insertion order is guaranteed.

```js
// eventLogStore.js shape
const EVENT_LOG_DB_NAME = 'planningEventLogDb';
const EVENT_LOG_DB_VERSION = 1;
const EVENT_LOG_STORE = 'planningEventLog';

// Entry shape
{
  // id: autoIncrement (IDB-managed)
  timestamp: '2026-03-02T10:00:00.000Z',  // ISO-8601 UTC
  event_type: 'planning.task.created',      // domain.entity.action
  entity_id: 'task-uuid-here',
  device_id: 'device-id-or-null',
  idempotency_key: 'batch-key-or-null',
  payload_version: 1,
  payload: { /* event-specific data */ }
}
```

### Fake IDB Test Pattern

Reuse the fake IndexedDB approach from `e2eeClientCrypto.test.js`. The key insight is: **data mutations must be synchronous on the internal records Map**, while `onsuccess` callbacks are deferred via a `makeRequest` wrapper. This pattern prevents race conditions in Vitest tests.

### Command Instrumentation Pattern

```js
// In createInboxTask.js (example)
import { appendPlanningEvent } from './appendPlanningEvent.js';

export async function createInboxTask(title, options = {}) {
  // ... existing invariant + store logic ...
  const result = { ok: true, task };

  // Fire-and-forget: never await in hot path
  appendPlanningEvent({
    event_type: 'planning.task.created',
    entity_id: task.id,
    timestamp: new Date().toISOString(),
    payload_version: 1,
    payload: { title: task.title },
  }, options).catch(console.error);

  return result;
}
```

### Error Code Catalog Additions

- `EVENT_LOG_WRITE_FAILED` — IDB write failure for event append
- `EVENT_LOG_CLEAR_FAILED` — IDB clear failure during local delete (non-blocking)

### Testing Framework

- **Framework**: Vitest with `happy-dom` environment
- **Run**: `npm run test:js`
- **Build check**: `npm run build` must pass after instrumentation to catch import errors
- Existing test count baseline: 347 tests (must not regress)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Event Log Nature] — Audit/recovery only, append-only, Phase 1 is NOT event-sourced
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] — `domain.entity.action` naming, `event_version` in payloads
- [Source: _bmad-output/planning-artifacts/architecture.md#Mandatory Architecture Locks #4] — Append-only, no compaction, rolling window retention
- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1] — FR36

## Change Log

- 2026-02-23: Implemented persistent append-only event log. eventLogStore (IndexedDB), appendPlanningEvent command with validation, instrumentation of 7 domain commands, clearEventLog integrated into deleteLocalPlanningData. 27 new tests; full suite 374 passing.
- 2026-02-23: Code review remediation completed. Fixed store-name contract mismatch (`planningEventLog`), added instrumentation tests for all touched commands, hardened delete-local clearEventLog coverage, and resolved file-list transparency gaps.

## Senior Developer Review (AI)

**Outcome: Approve (post-fix)**

### Findings and Resolutions

- [x] **HIGH** Store name mismatch between claimed contract and implementation (`planningEventLog` vs `events`)  
  **Resolution:** aligned implementation to `planningEventLog` in `eventLogStore.js`.
- [x] **MEDIUM** Missing test assertions for event instrumentation on modified commands  
  **Resolution:** expanded and added tests for `createInboxTask`, `addToToday`, `removeFromToday`, `rescheduleTask`, `enforceDailyContinuity`, `setSyncMode`, `resetSyncState`.
- [x] **MEDIUM** `deleteLocalPlanningData` clearEventLog branch not explicitly verified  
  **Resolution:** mocked `clearEventLog`, asserted invocation/non-invocation paths, and added failure-tolerant test.
- [x] **MEDIUM** Story File List incomplete vs actual modified files  
  **Resolution:** updated File List with all story-relevant changed/added files and added scope-boundary note below.
- [x] **MEDIUM** Cross-story local changes present in working tree  
  **Resolution:** explicitly treated as out-of-scope pre-existing branch changes for this story review.

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

- eventLogStore.js: IndexedDB `planningEventLogDb` with `events` store, autoIncrement id. appendEvent uses `add()` for append-only. getAllEvents, getEventsByType, clearEventLog implemented. Fake IDB used in tests.
- appendPlanningEvent.js: Validates timestamp, event_type, entity_id. Returns ok/id or EVENT_LOG_WRITE_FAILED.
- Instrumented commands: createInboxTask, addToToday, removeFromToday, rescheduleTask, enforceDailyContinuity, setSyncMode, resetSyncState. Fire-and-forget `.catch(console.error)` pattern.
- deleteLocalPlanningData: clearEventLog called after syncMode save; failure logs and continues (non-blocking).
- Test baseline: 374 tests (was 347); npm run build passes.
- Post-review remediation: 398/398 tests passing; build passes.

### File List

- resources/js/features/planning/persistence/eventLogStore.js (new)
- resources/js/features/planning/persistence/eventLogStore.test.js (new)
- resources/js/features/planning/commands/appendPlanningEvent.js (new)
- resources/js/features/planning/commands/appendPlanningEvent.test.js (new)
- resources/js/features/planning/commands/createInboxTask.js
- resources/js/features/planning/commands/addToToday.js
- resources/js/features/planning/commands/removeFromToday.js
- resources/js/features/planning/commands/rescheduleTask.js
- resources/js/features/planning/commands/enforceDailyContinuity.js
- resources/js/features/planning/commands/setSyncMode.js
- resources/js/features/planning/commands/resetSyncState.js
- resources/js/features/planning/commands/deleteLocalPlanningData.js
- resources/js/features/planning/commands/createInboxTask.test.js
- resources/js/features/planning/commands/addToToday.test.js
- resources/js/features/planning/commands/removeFromToday.test.js (new)
- resources/js/features/planning/commands/rescheduleTask.test.js (new)
- resources/js/features/planning/commands/enforceDailyContinuity.test.js (new)
- resources/js/features/planning/commands/setSyncMode.test.js
- resources/js/features/planning/commands/resetSyncState.test.js
- resources/js/features/planning/commands/deleteLocalPlanningData.test.js

Scope boundary note:
- `resources/js/features/planning/export/exportPlanningData.js` and Story 4.2+ files were pre-existing local branch changes and were not part of Story 4.1 implementation scope.

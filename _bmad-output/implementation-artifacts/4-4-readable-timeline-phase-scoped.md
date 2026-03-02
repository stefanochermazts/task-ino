# Story 4.4: Readable Timeline (Phase-Scoped)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner or support operator,
I want a simple readable event timeline with filtering,
so that I can understand what happened without complex debug tooling.

## Acceptance Criteria

1. **Given** event history exists in the event log, **when** user opens the timeline view, **then** events are displayed in reverse-chronological order (newest first).
2. **And** a basic filter by `event_type` is available (select/dropdown with all types present in log + "All" option).
3. **And** each timeline entry shows at minimum: human-readable timestamp, event type, and entity_id.
4. **And** Phase 1 and Phase 2 scope EXPLICITLY excludes: advanced visual analytics, charts, graphs, heatmaps, cohort views. Plain list only.
5. **And** viewing the timeline MUST NOT alter any planning state, event log, or projections (read-only).
6. **And** timeline is accessible from the existing planning UI (no new route required — panel or section in `planning.blade.php`).

## Tasks / Subtasks

- [x] Create `renderEventTimeline.js` in `resources/js/features/planning/projections/` (AC: 1, 2, 3, 5)
  - [x] Accept `events` array and optional `filterType` string.
  - [x] Sort events descending by `timestamp` (newest first).
  - [x] If `filterType` is set and not `'all'`, filter to matching `event_type`.
  - [x] Return an array of display objects `{ displayTimestamp, event_type, entity_id, idempotency_key }`.
  - [x] Pure function — no side effects.

- [x] Create `loadTimeline.js` command in `resources/js/features/planning/commands/` (AC: 1, 5)
  - [x] Call `getAllEvents()` from `eventLogStore.js` (Story 4.1 dependency).
  - [x] Pass to `renderEventTimeline(events, filterType)`.
  - [x] Return `{ ok: true, entries, availableTypes }` where `availableTypes` is the deduplicated sorted list of all event types present.
  - [x] Return `{ ok: false, code: 'TIMELINE_LOAD_FAILED', message }` if event log read fails.

- [x] Add timeline UI section to `resources/views/planning.blade.php` (AC: 3, 4, 6)
  - [x] Add a collapsible `<details>` element `id="event-timeline-panel"` in the connection/support area.
  - [x] Inside: a `<select id="timeline-filter">` with option "All" as default.
  - [x] An ordered list `<ol id="timeline-list">` for event entries.
  - [x] A `<button id="timeline-refresh-btn">Refresh</button>` to trigger reload.
  - [x] A `<p id="timeline-feedback">` for status feedback (loading, error, empty).

- [x] Wire timeline UI in `initializePlanningInboxApp.js` (AC: 1, 2, 3, 5, 6)
  - [x] On `#timeline-refresh-btn` click: call `loadTimeline(filterType)`, populate `#timeline-list`, populate `#timeline-filter` options.
  - [x] On `#timeline-filter` change: re-call `loadTimeline(newFilterType)` and re-render list.
  - [x] Format each entry as `<li>` with timestamp (localized via `new Date(ts).toLocaleString()`), event_type, entity_id.
  - [x] If no entries: show "No events recorded yet." in `#timeline-feedback`.
  - [x] If load fails: show user-safe message in `#timeline-feedback`.
  - [x] Never display raw error details from event log in UI.

- [x] Write unit tests in `renderEventTimeline.test.js` (AC: 1, 2, 3, 5)
  - [x] Test: events returned newest-first.
  - [x] Test: filter by event_type returns only matching entries.
  - [x] Test: filter `'all'` returns all entries.
  - [x] Test: empty events array returns empty array.
  - [x] Test: pure function — calling twice with same input produces identical output.

- [x] Write unit tests in `loadTimeline.test.js` (AC: 1, 5)
  - [x] Mock `getAllEvents` and `renderEventTimeline`.
  - [x] Test: success path returns `{ ok: true, entries, availableTypes }`.
  - [x] Test: `availableTypes` is deduplicated and sorted.
  - [x] Test: event log read failure returns `TIMELINE_LOAD_FAILED`.

- [x] Add integration test in `initializePlanningInboxApp.test.js` (AC: 2, 3, 6)
  - [x] Test: clicking `#timeline-refresh-btn` populates `#timeline-list` with entries.
  - [x] Test: changing `#timeline-filter` re-renders filtered list.
  - [x] Test: empty log shows "No events recorded yet." in feedback.
  - [x] Test: timeline load failure shows sanitized message in feedback.

## Dev Notes

### Architecture Alignment

- **Phase scope hard limit**: No charts, graphs, heatmaps, or analytics. Plain `<ol>` list only. Any future visual analytics is explicitly deferred to Phase 3+.
- **Read-only absolute**: Timeline calls only `getAllEvents()` (read). It MUST NOT call `appendEvent`, `clearEventLog`, or any mutation.
- **No new route**: Timeline is embedded in the planning page as a collapsible panel (`<details>`), not a separate Laravel route.
- **Feedback channel**: Use a dedicated `#timeline-feedback` element — do NOT share `#export-feedback` or `#control-feedback` (lessons from Epic 3 S-006 review).

### Project Structure Notes

- New file: `resources/js/features/planning/projections/renderEventTimeline.js`
- New file: `resources/js/features/planning/projections/renderEventTimeline.test.js`
- New file: `resources/js/features/planning/commands/loadTimeline.js`
- New file: `resources/js/features/planning/commands/loadTimeline.test.js`
- Modify: `resources/views/planning.blade.php` (add `#event-timeline-panel`)
- Modify: `resources/js/features/planning/app/initializePlanningInboxApp.js` (wire timeline UI)
- Modify: `resources/js/features/planning/app/initializePlanningInboxApp.test.js` (add integration tests)
- Dependency (Story 4.1): `resources/js/features/planning/persistence/eventLogStore.js` (`getAllEvents`)

### Dependency on Previous Stories

- **Story 4.1 (event log)** MUST be implemented first. If running in isolation, mock `getAllEvents` with `vi.mock('../persistence/eventLogStore.js')`.

### UI Pattern Reference

Follow the same UI feedback pattern used in Epic 3 (`initializePlanningInboxApp.js`):
- Dedicated feedback element per panel.
- Separate timeout IDs per feedback channel.
- Never expose raw technical errors in user-facing feedback.
- `scheduleTimelineFeedbackClear()` pattern for auto-dismiss.

### Timestamp Formatting

Use `new Date(isoTimestamp).toLocaleString()` for human-readable display. Do NOT use custom date libraries — none are in the project dependencies.

### HTML Structure Reference

```html
<details id="event-timeline-panel">
  <summary>Event Timeline</summary>
  <div>
    <label for="timeline-filter">Filter by type:</label>
    <select id="timeline-filter">
      <option value="all">All</option>
    </select>
    <button id="timeline-refresh-btn" type="button">Refresh</button>
    <p id="timeline-feedback" aria-live="polite"></p>
    <ol id="timeline-list"></ol>
  </div>
</details>
```

### availableTypes Logic

```js
// Deduplicated sorted list of event types in the log
const availableTypes = [...new Set(events.map(e => e.event_type))].sort();
```

### Error Code Additions

- `TIMELINE_LOAD_FAILED` — event log read failure during timeline load

### Testing Framework

- **Framework**: Vitest with `happy-dom`
- **Run**: `npm run test:js`
- Baseline: 347 tests (must not regress)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4] — FR33
- [Source: _bmad-output/planning-artifacts/architecture.md#Event Log Nature] — Append-only, inspectable without altering runtime state
- [Source: _bmad-output/implementation-artifacts/S-006] — Feedback channel isolation lesson (no clobbering between channels)
- [Source: _bmad-output/implementation-artifacts/S-008] — UI sanitization pattern for remote errors

## Dev Agent Record

### Agent Model Used

Composer (Cursor)

### Debug Log References

-

### Completion Notes List

- Timeline uses dedicated `#timeline-feedback` (no channel clobbering with export/control feedback)
- `scheduleTimelineFeedbackClear` pattern for auto-dismiss
- Timeline now auto-loads on panel open (`#event-timeline-panel` toggle) to satisfy open-view AC
- Robust timestamp rendering: invalid/missing timeline timestamps fall back to `—` (never `Invalid Date`)
- Added UI integration coverage for panel-open autoload and ordered rendering checks
- Full regression passes: 450/450 tests

### File List

- resources/js/features/planning/projections/renderEventTimeline.js (new)
- resources/js/features/planning/projections/renderEventTimeline.test.js (new)
- resources/js/features/planning/commands/loadTimeline.js (new)
- resources/js/features/planning/commands/loadTimeline.test.js (new)
- resources/views/planning.blade.php (modified - event-timeline-panel)
- resources/js/features/planning/app/initializePlanningInboxApp.js (modified - timeline wiring)
- resources/js/features/planning/app/initializePlanningInboxApp.test.js (modified - timeline integration tests)

## Senior Developer Review (AI)

**Outcome: Approve (post-fix)**

### Findings and Resolutions

- [x] **HIGH** Timeline did not load when opening timeline view  
  **Resolution:** added `toggle` listener on `#event-timeline-panel` to auto-call `refreshTimeline` when opened.
- [x] **MEDIUM** Timestamp rendering could show `Invalid Date`  
  **Resolution:** introduced robust formatter with fallback `—` for invalid/missing timestamps.
- [x] **MEDIUM** Missing UI-level ordering/open-view assertions  
  **Resolution:** added integration tests for panel-open autoload and newest-first rendered ordering.
- [x] **MEDIUM** Story tracking transparency  
  **Resolution:** updated completion notes and file list with post-review fixes and current regression baseline.

## Change Log

- 2026-02-23: Code review remediation completed for 4.4. Added timeline auto-load on panel open, timestamp fallback hardening, and integration tests for open-view and ordered rendering.

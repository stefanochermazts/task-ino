# Story S-007: Sync Reset Without Local Planning Loss

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planner,  
I want to reset synchronization without losing local planning continuity,  
so that I can restore trust and safely re-enable sync.

## Scope Mapping (Epic 3)

- Maps to: Story 3.9
- Implements: FR30

## Acceptance Criteria

1. **Given** sync state has degraded or needs reset, **when** user confirms sync reset, **then** reset revokes remote device registration.
2. **And** reset does not delete local planning state.
3. **And** reset allows re-enabling sync with fresh key material.

## Tasks / Subtasks

- [x] Implement explicit sync reset command with confirmation contract (AC: 1, 2, 3)
  - [x] Require explicit user confirmation before destructive remote reset actions.
  - [x] Execute deterministic reset sequence and return normalized result.

- [x] Separate remote reset effects from local planning data (AC: 2)
  - [x] Preserve local task store and planning continuity markers.
  - [x] Clear or rotate sync credentials/material needed for re-bootstrap.

- [x] Enable clean re-onboarding after reset (AC: 3)
  - [x] Provide fresh key material initialization path for next sync enable.
  - [x] Ensure stale remote association cannot resume accidentally.

- [x] Add tests for safety guarantees and re-enable flow (AC: 1, 2, 3)
  - [x] Integration tests for reset with preserved local state.
  - [x] Regression tests for successful sync re-enable after reset.

## Data Model / State Touchpoints

- Local planning stores remain intact.
- Sync registration metadata and credentials are reset/revoked.
- Key lifecycle state coordinates with E2EE story outputs.

## Error Handling Expectations

- Failed remote revocation reports actionable error without local data loss.
- Reset command must be idempotent enough for safe retry when network unstable.
- UI never exposes raw backend exceptions.

## Telemetry / Observability (if needed)

- Optional events:
  - `sync_reset_requested`
  - `sync_reset_completed`
  - `sync_reset_failed`

## Assumptions / Open Questions

- Assumption: remote service exposes revocation endpoint semantics compatible with deterministic retries.
- Open question: whether partial remote failure should still clear local sync credentials or defer until full success.

## Dev Agent Record

### Completion Notes

- Added resetSyncState command with confirmed contract; rejects without explicit user confirmation.
- Clears sync mode and E2EE key material locally; calls taskinoSync.revokeDeviceRegistration when present.
- Local planning stores (inboxTaskStore, areaStore, todayCapStore, dayCycleStore) are never touched.
- Added clearE2EEKeyMaterial to e2eeClientCrypto; after clear, ensureE2EEKeyReady creates fresh keys for re-onboarding.
- UX: Reset sync button with window.confirm; success feedback and sync UI refresh.
- Partial remote failure still clears local credentials and returns actionable message (RESET_REMOTE_PARTIAL).

## File List

- resources/js/features/planning/sync/e2eeClientCrypto.js
- resources/js/features/planning/sync/e2eeClientCrypto.test.js
- resources/js/features/planning/commands/resetSyncState.js
- resources/js/features/planning/commands/resetSyncState.test.js
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js
- resources/views/planning.blade.php

## Change Log

- 2026-03-02: Implemented S-007 sync reset with confirmation, local preservation, E2EE key clear, and re-enable flow.
- 2026-03-02: Applied adversarial review fixes: exported async `clearE2EEKeyMaterial` from E2EE module, made reset/delete key clearing awaitable, added deterministic sync-mode save failure handling, sanitized remote partial reset messaging, and added integration tests validating local data preservation + fresh key re-onboarding after reset.

## Senior Developer Review (AI)

**Outcome: Approve (post-fix)**

### Findings and Resolutions

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | CRITICAL | `resetSyncState` imported `clearE2EEKeyMaterial` but E2EE module did not export it, causing build failure | Added and exported async `clearE2EEKeyMaterial()` in `e2eeClientCrypto.js`; build now compiles successfully |
| 2 | HIGH | `saveSyncMode(false)` result ignored, so reset could report success without persisting local sync disable | Added deterministic guard: if `saveSyncMode(false)` returns non-ok, reset fails with `RESET_LOCAL_SYNCMODE_FAILED` and stops before key clear |
| 3 | MEDIUM | Remote revocation error text could leak raw backend/runtime details to UI | Replaced passthrough with sanitized, user-safe message (`Remote revocation could not be confirmed...`) for all remote partial failure paths |
| 4 | MEDIUM | Test coverage did not prove local preservation and re-enable with fresh key material end-to-end | Added integration suite `resetSyncState.integration.test.js` validating: preserved tasks/areas/todayCap/day-cycle, sync credentials cleared, sanitized partial remote failure behavior, and fresh key generation after reset |

Post-fix verification:
- `npm run build` passes (no missing export/import errors)
- `npm run test:js -- --reporter=dot` => **342/342 tests passing**
- No lint issues on changed files


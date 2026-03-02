# Story S-005: E2EE Key Lifecycle (Client-Controlled)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a privacy-aware planner,  
I want encryption keys generated and controlled client-side,  
so that synchronized task content remains unreadable to server operators.

## Scope Mapping (Epic 3)

- Maps to: Story 3.7
- Implements: FR23

## Acceptance Criteria

1. **Given** sync with E2EE is enabled, **when** key lifecycle operations occur, **then** keys are generated and controlled client-side.
2. **And** server has no capability to decrypt synchronized task content.

## Tasks / Subtasks

- [x] Define client-side key lifecycle contract (AC: 1, 2)
  - [x] Key generation occurs on client only.
  - [x] Key storage and retrieval stay in client-controlled secure context.
  - [x] Key rotation/re-initialization path documented for reset scenarios.

- [x] Integrate encryption/decryption boundary in sync pipeline (AC: 2)
  - [x] Encrypt payload before leaving client.
  - [x] Decrypt only on authorized client runtime.
  - [x] Ensure server-facing payloads contain no plaintext task content.

- [x] Ensure compatibility with existing local-first runtime (AC: 1, 2)
  - [x] Local planning operations do not depend on server decrypt capability.
  - [x] Sync disabled mode remains functional without key operations.

- [x] Add tests for key ownership and confidentiality guarantees (AC: 1, 2)
  - [x] Unit tests for key generation and cryptographic boundary calls.
  - [x] Integration tests verifying ciphertext-only transfer path.

## Data Model / State Touchpoints

- Client-managed key material metadata (non-secret descriptors if needed).
- Encrypted sync payload representation separate from local plaintext task store.
- No server-readable plaintext in synchronized task content fields.

## Error Handling Expectations

- Key lifecycle failures return deterministic, user-safe messages.
- Encryption errors do not corrupt local planning state.
- Raw crypto exceptions are sanitized before UI presentation.

## Telemetry / Observability (if needed)

- Privacy-safe events only:
  - `e2ee_initialized`
  - `e2ee_rotation_completed`
  - `e2ee_operation_failed` (category only, no sensitive data)

## Assumptions / Open Questions

- Assumption: secure client storage mechanism is available and acceptable for target environments.
- Open question: backup/recovery UX for lost client keys is intentionally out of scope unless explicitly requested.

## Dev Agent Record

### Completion Notes

- Added client-side key lifecycle management with deterministic initialization, storage, retrieval, and rotation pathways.
- Added encrypted sync payload boundary so task content is transferred as ciphertext envelopes and only decrypted on client runtime.
- Integrated sync enable flow to initialize E2EE keys before switching sync mode, with deterministic user-safe failure messages.
- Extended reconciliation flow to decrypt encrypted incoming envelopes before invariant merge and reject undecryptable payloads safely.
- Added dedicated unit/integration tests for key lifecycle, encryption boundary, and reconcile decryption behavior.

## File List

- resources/js/features/planning/sync/e2eeClientCrypto.js
- resources/js/features/planning/sync/e2eeClientCrypto.test.js
- resources/js/features/planning/commands/setSyncMode.js
- resources/js/features/planning/commands/setSyncMode.test.js
- resources/js/features/planning/commands/reconcileFromRemote.js
- resources/js/features/planning/commands/reconcileFromRemote.test.js
- resources/js/features/planning/app/initializePlanningInboxApp.js
- resources/js/features/planning/app/initializePlanningInboxApp.test.js

## Change Log

- 2026-03-02: Implemented S-005 E2EE key lifecycle with client-managed key storage, encrypted sync payload envelope utilities, sync-mode key initialization guardrail, and reconcile-time client decryption handling.
- 2026-03-02: Applied adversarial review fixes: migrated key storage from localStorage to IndexedDB with extractable:false CryptoKey objects; added plaintext mutation rejection guard in reconcileFromRemote when E2EE is active; added old key deletion on rotation; fixed window.btoa/atob to globalThis; updated File List.

## Senior Developer Review (AI)

**Outcome: Approve (post-fix)**

### Findings and Resolutions

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | HIGH | Raw AES key bytes stored in `localStorage` — not a secure client-controlled context; any XSS can read the key material | Migrated to IndexedDB: keys generated with `extractable: false`, stored as opaque `CryptoKey` objects in a dedicated `taskino-e2ee` IDB database; only non-sensitive metadata (keyId, algorithm, version) remains in localStorage |
| 2 | HIGH | `normalizeIncomingMutations` silently accepted plaintext mutations when E2EE was active, allowing downgrade bypass of the encryption boundary | Added `isE2EEActive()` export; reconcileFromRemote now rejects any non-envelope mutation with `E2EE_PLAINTEXT_REJECTED` when E2EE key is present; tests added for both accept (E2EE off) and reject (E2EE on) paths |
| 3 | MEDIUM | Key rotation did not delete old key material — stale key bytes accumulated across rotations | `ensureE2EEKeyReady` now calls `deleteKeyRecord(previousKeyId, idb)` after saving the new key; rotation test verifies `fakeIdb._records.has(oldKeyId)` is false post-rotate |
| 4 | MEDIUM | `initializePlanningInboxApp.js` and `.test.js` modified in S-005 scope but absent from story File List | Added both files to the S-005 File List |
| 5 | LOW | `window.btoa`/`window.atob` used instead of `globalThis.btoa`/`globalThis.atob`, inconsistent with `getCrypto` portability pattern | Replaced with `globalThis.btoa`/`globalThis.atob` throughout |

All 330 tests pass post-fix, including 8 new assertions covering: IDB-only key storage, `extractable: false` enforcement, rotation cleanup, `isE2EEActive` true/false paths, plaintext rejection when E2EE active, and plaintext acceptance when E2EE inactive.


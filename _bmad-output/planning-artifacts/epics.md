---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - C:\laragon\www\task-ino\_bmad-output\planning-artifacts\prd.md
  - C:\laragon\www\task-ino\_bmad-output\planning-artifacts\architecture.md
  - C:\laragon\www\task-ino\_bmad-output\planning-artifacts\ux-design-specification.md
---

# task-ino - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for task-ino, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can capture tasks into a default Inbox as the primary intake flow.
FR2: Users can create tasks while offline with the same core workflow available online.
FR3: Users can add tasks to Today from Inbox or other planning contexts.
FR4: Users can maintain Today as a finite list constrained by a user-defined cap.
FR5: Users can set and update their personal Today cap with a system-provided default.
FR6: Users can explicitly resolve remaining Today items at end of day through decision actions.
FR7: Users can close a planning day only through explicit item-level decisions.
FR8: Users can review their current daily plan state before committing execution.
FR9: The product can compute Today consistently based on task state, explicit inclusion signals, and user cap configuration without server dependency.
FR10: Users can organize tasks using an area-based structure including Inbox and additional areas.
FR11: Users can move tasks between planning contexts without losing task integrity.
FR12: Users can reschedule individual tasks to future planning contexts.
FR13: Users can perform bulk rescheduling and bulk movement of tasks.
FR14: Users can apply scheduling decisions that preserve planning guardrails.
FR15: Users can keep Today as a cross-area planning view.
FR16: Users can preserve task continuity across daily planning cycles.
FR17: The product can prevent any operation from silently exceeding the Today cap.
FR18: The product can prevent unresolved Today items from being implicitly carried over without explicit user decision.
FR19: The product can execute bulk planning operations atomically, with rollback when full application is not possible.
FR20: The product can block state transitions that violate defined planning invariants.
FR21: Users can treat local device data as the primary source of truth for planning workflows.
FR22: Users can enable or disable synchronization as an optional capability.
FR23: Users can use end-to-end encrypted synchronization when sync is enabled.
FR24: Users can export their full planning data in a human-readable format.
FR25: Users can perform export regardless of synchronization status.
FR26: Users can understand the current sync state through explicit product feedback.
FR27: Users can continue core planning flows without sync availability.
FR28: Users can permanently delete their local planning data.
FR29: Users can permanently delete synchronized planning data when synchronization is enabled.
FR30: Users can reset synchronization state without losing local planning continuity.
FR31: Users can complete planning actions without dependency on active network connectivity.
FR32: Users can recover from planning inconsistencies using guided non-destructive recovery flows.
FR33: Support operators can inspect planning and synchronization event history for troubleshooting.
FR34: Support operators can validate data integrity and guide recovery without destructive reset paths.
FR35: The product can preserve atomic behavior for bulk planning operations.
FR36: The product can persist and expose planning and synchronization event logs for transparency and non-destructive troubleshooting.
FR37: Visitors can access public product information through dedicated public pages.
FR38: Users can access authenticated planning capabilities through the core web application surface.
FR39: Users can experience consistent core planning capabilities across supported desktop and mobile browsers.
FR40: Keyboard users can operate core planning views in the desktop experience.
FR41: Users can complete core planning flows within accessibility-conformant views for the defined scope.
FR42: Product operators can monitor loop-level product signals including planning completion, cap compliance, and closure behavior.
FR43: Product operators can detect regressions in core planning behavior after releases.
FR44: Product operators can trigger corrective release actions when guardrail behavior degrades.
FR45: Product teams can evaluate feature changes against planning invariants before release.
FR46: Product teams can reject feature activation when invariant conformance is not met.
FR47: Product teams can analyze behavioral validation by motivation cohorts.
FR48: The product can defer advanced collaboration and API capabilities outside MVP scope without impacting core loop viability.
FR49: The product can gate advanced capabilities behind invariant conformance checks.
FR50: Future integrations can be introduced only if they preserve planning invariants and trust controls.
FR51: Future assistant capabilities can be introduced only if they preserve user agency over planning decisions.
FR52: Growth features can extend planning support without replacing the core finite-loop model.
FR53: The product can introduce expansion features only when core loop capabilities remain intact and non-degraded.
FR54: The product can preserve consistent planning behavior across offline and online states.
FR55: The product can preserve planning-state integrity across sync transitions.
FR56: The product can maintain user-visible alignment between planning decisions and stored task state.
FR57: The product can provide user-visible confirmation for critical planning decisions affecting daily closure.
FR58: The product can maintain planning continuity when users switch devices under eventual consistency constraints.
FR59: The product can ensure core planning capabilities remain available independent of optional feature modules.

### NonFunctional Requirements

NFR1: Core planning UI updates MUST be visible within 100ms after user action under normal supported device conditions.
NFR2: Bulk reschedule operations MUST complete local state mutation within 150ms for typical weekly workloads (<= 200 tasks).
NFR3: App shell interactive time SHOULD be < 2 seconds on supported modern devices.
NFR4: Median time from app open to finalized Today plan MUST remain <= 120 seconds as product-level KPI.
NFR5: Sync processing MUST NOT block Inbox/Today interactions.
NFR6: Planning data at rest on device MUST be protected by platform-appropriate storage protection mechanisms.
NFR7: Data in transit for sync operations MUST be encrypted.
NFR8: E2EE encryption keys MUST be generated and controlled client-side.
NFR9: Server MUST NOT possess capability to decrypt synchronized task content.
NFR10: Sync metadata MUST minimize personally identifiable information.
NFR11: Telemetry (if enabled) MUST be explicit opt-in and MUST NOT include task content payloads.
NFR12: Data deletion actions MUST be irreversible once user intent is confirmed.
NFR13: Growth in active users MUST NOT introduce runtime coupling between planning flows and server availability.
NFR14: Task volume growth (e.g., >10k historical tasks) MUST NOT degrade Today computation determinism.
NFR15: Capacity expansion decisions MUST preserve domain invariants (cap, closure, atomic bulk behavior).
NFR16: Phase expansion MUST follow defined go/no-go gates before scope broadening.
NFR17: Public pages and core app views (Inbox, Today, Plan/Week) MUST meet WCAG 2.1 AA target.
NFR18: Color contrast ratios MUST meet WCAG AA thresholds (4.5:1 for normal text).
NFR19: Core planning flows MUST be fully keyboard-operable on desktop.
NFR20: Focus visibility and semantic navigation landmarks MUST be present in core planning paths.
NFR21: Accessibility regressions in core workflows MUST block release until corrected.
NFR22: Core planning runtime MUST remain usable without network connectivity.
NFR23: Planning state MUST be reconstructible from persisted local data after abnormal shutdown.
NFR24: Bulk planning operations MUST preserve atomicity guarantees with rollback on partial-apply failure.
NFR25: No destructive reset MUST be the default recovery path.
NFR26: Recovery flows MUST support non-destructive resolution before destructive options.
NFR27: Export capability MUST remain available independent of sync service state.
NFR28: No external integration MUST be required for MVP core-loop success.
NFR29: Optional dependencies introduced post-MVP MUST fail gracefully without breaking core loop availability.
NFR30: Future integration/API activation MUST pass invariant conformance checks before release.
NFR31: Integration behavior MUST NOT bypass Today cap, explicit closure, or planning-state integrity rules.

### Additional Requirements

- Selected starter strategy is Existing Baseline (No Re-initialization) on Laravel 12 + Vite + Tailwind + JS-only.
- Phase 1 scope lock: no TypeScript introduction, no React/Vue rewrite, no new starter scaffolding.
- Local browser store is authoritative source of truth for planning runtime.
- Server/Postgres role is sync/governance (ciphertext vault + metadata), never planning runtime authority.
- IndexedDB migrations require monotonic `migration_id` and mandatory projection rebuild post-migration.
- Sync payloads must carry schema version for backward-compatible transitions.
- Sync API uses idempotent batch writes with `X-Idempotency-Key` and deterministic error shape.
- Conflict resolution is deterministic LWW with explicit tie-break (`timestamp + device_id`).
- Domain error model must include stable baseline codes (`TODAY_CAP_EXCEEDED`, `CLOSURE_REQUIRED`, `INVARIANT_VIOLATION`, `SYNC_CONFLICT_RESOLVED_LWW`).
- Domain errors and technical errors must remain strictly separated in contracts/logging.
- Event log is append-only and audit/recovery oriented (not event sourcing) with explicit retention policy.
- All write operations must pass through single invariant enforcement layer; no direct UI/store bypass writes.
- Bulk operations must use same invariant pipeline as single operations and preserve atomic rollback guarantees.
- Sync state UX is informational and non-blocking; sync failures must not alter planning state visibility.
- Local-first UX rule: no global blocking spinner for local planning actions.
- Architecture requires feature-sliced frontend modules (`planning`, `sync`, `settings`, `support`) and shared primitives.
- Architecture mandates modular monolith backend boundaries (Domain/Application/Infrastructure separation).
- Security boundary requires client-side key generation/control and server-blind ciphertext handling.
- Release governance requires KPI guardrail ownership, explicit rollback/tuning decision path, and release gates.
- UX direction locked to Direction 5 (List First Minimal) with Today-first hierarchy.
- UX requires visible cap indicator and explicit end-of-list/closure completion cues.
- UX requires non-punitive copy style for over-cap, closure, sync, and error states.
- Responsive strategy is mobile-first with desktop keyboard-first productivity as primary mode.
- Accessibility baseline is WCAG 2.1 AA with focus visibility, landmarks, and full keyboard operability.

### FR Coverage Map

FR1: Epic 1 - Inbox capture
FR2: Epic 1 - Offline capture parity
FR3: Epic 1 - Add to Today
FR4: Epic 1 - Finite Today cap
FR5: Epic 1 - User cap config
FR6: Epic 1 - End-day explicit resolution
FR7: Epic 1 - Explicit day closure only
FR8: Epic 1 - Review plan state
FR9: Epic 1 - Deterministic Today computation
FR10: Epic 2 - Area-based organization
FR11: Epic 2 - Move across contexts safely
FR12: Epic 2 - Single reschedule
FR13: Epic 2 - Bulk planning operations
FR14: Epic 2 - Guardrail-preserving scheduling
FR15: Epic 2 - Today cross-area view
FR16: Epic 1 - Daily cycle continuity guardrail
FR17: Epic 1 - Prevent silent cap overflow
FR18: Epic 1 - Prevent implicit carry-over
FR19: Epic 1 - Atomic bulk + rollback invariant
FR20: Epic 1 - Block invalid transitions
FR21: Epic 3 - Local source-of-truth usage
FR22: Epic 3 - Optional sync toggle
FR23: Epic 3 - E2EE sync support
FR24: Epic 3 - Full human-readable export
FR25: Epic 3 - Export independent from sync
FR26: Epic 3 - Explicit sync state feedback
FR27: Epic 3 - Core flow without sync
FR28: Epic 3 - Permanent local delete
FR29: Epic 3 - Permanent synced delete
FR30: Epic 3 - Sync reset without local loss
FR31: Epic 4 - Network-independent planning actions
FR32: Epic 4 - Guided non-destructive recovery
FR33: Epic 4 - Support event history inspection
FR34: Epic 4 - Integrity validation + guided recovery
FR35: Epic 2 - Atomic behavior preservation
FR36: Epic 4 - Persist/expose event logs
FR37: Epic 5 - Public information pages
FR38: Epic 5 - Authenticated app surface
FR39: Epic 5 - Cross-browser consistency
FR40: Epic 5 - Keyboard-operable desktop core views
FR41: Epic 5 - Accessibility-conformant core flows
FR42: Epic 6 - Monitor loop KPIs
FR43: Epic 6 - Detect post-release regressions
FR44: Epic 6 - Trigger corrective actions
FR45: Epic 6 - Evaluate features vs invariants
FR46: Epic 6 - Reject non-conformant activations
FR47: Epic 6 - Cohort behavioral analysis
FR48: Epic 7 - Defer advanced capabilities safely
FR49: Epic 7 - Gate advanced capabilities
FR50: Epic 7 - Invariant-safe integrations
FR51: Epic 7 - Agency-preserving assistant features
FR52: Epic 7 - Growth without replacing core model
FR53: Epic 7 - Expansion only if core intact
FR54: Epic 3 - Offline/online behavior continuity
FR55: Epic 3 - Sync transition integrity
FR56: Epic 3 - User-visible state alignment
FR57: Epic 4 - Confirmation for critical closure decisions
FR58: Epic 3 - Multi-device continuity under eventual consistency
FR59: Epic 3 - Core capabilities independent of optional modules

## Epic List

### Epic 1: Finite Daily Planning Loop
Deliver to end users the complete `Inbox -> Finite Today -> Explicit Closure` loop in local-first mode, with deterministic Today computation and hard invariant enforcement.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR17, FR18, FR19, FR20

### Epic 2: Task Organization and Scheduling Continuity
Enable users to organize, move, reprioritize, and reschedule tasks across areas and time contexts while preserving planning integrity and continuity.
**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR15, FR35

### Epic 3: Trust Controls, Sync, and Data Ownership
Provide trust architecture capabilities: local source-of-truth, optional E2EE sync, explicit sync visibility, export, deletion, sync reset, and continuity across sync/device transitions.
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR54, FR55, FR56, FR58, FR59

### Epic 4: Recovery and Supportability Without Destructive Reset
Provide guided non-destructive recovery and support/operator troubleshooting based on persistent planning + sync event history.
**FRs covered:** FR31, FR32, FR33, FR34, FR36, FR57

### Epic 5: Public Surface and Accessible Product Experience
Deliver public web presence plus authenticated product surface with cross-browser consistency, keyboard-first usage, and accessibility-conformant core flows.
**FRs covered:** FR37, FR38, FR39, FR40, FR41

### Epic 6: Operational Guardrails and Release Governance
Enable product/engineering operators to monitor loop KPIs, detect regressions, and enforce corrective and release-governance decisions tied to invariant compliance.
**FRs covered:** FR42, FR43, FR44, FR45, FR46, FR47

### Epic 7: Controlled Expansion Framework
Define and enforce constraints for post-MVP expansion (API/integrations/assistant/growth), ensuring the finite-loop model and trust controls remain non-degraded.
**FRs covered:** FR48, FR49, FR50, FR51, FR52, FR53

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic 1: Finite Daily Planning Loop

Deliver to end users the complete `Inbox -> Finite Today -> Explicit Closure` loop in local-first mode, with deterministic Today computation and hard invariant enforcement.

### Story 1.1: Capture Tasks in Inbox (Online/Offline)

As a planner,
I want to capture tasks into Inbox even without network,
So that intake is always immediate and uninterrupted.
**Implements:** FR1, FR2

**Acceptance Criteria:**

**Given** the user is in the app (online or offline)
**When** they submit a new task in quick capture
**Then** the task is persisted locally and appears in Inbox immediately
**And** the same flow and UX feedback is preserved in both network states

### Story 1.2: Deterministic Today Projection from Local State

As a planner,
I want Today to be computed deterministically from local task state and cap configuration,
So that planning remains predictable and server-independent.
**Implements:** FR9

**Acceptance Criteria:**

**Given** local tasks, inclusion signals, and cap config are defined
**When** Today is computed or recomputed
**Then** results are deterministic for identical input state
**And** computation does not require backend availability

### Story 1.4: Configure Personal Today Cap

As a planner,
I want to set and update my personal Today cap,
So that the daily plan matches my working capacity.
**Implements:** FR5

**Acceptance Criteria:**

**Given** default cap exists
**When** user sets a new valid cap value
**Then** the new cap is saved locally and applied to Today behavior
**And** Today projection and indicators reflect updated cap consistently

### Story 1.3: Add to Today with Cap Enforcement

As a planner,
I want to add tasks to Today with explicit cap constraints,
So that Today remains finite by design.
**Implements:** FR3, FR4, FR17

**Acceptance Criteria:**

**Given** Today has available slots under cap
**When** the user adds an Inbox task to Today
**Then** the task is added and cap indicator updates immediately
**And** if cap would be exceeded the system blocks silent overflow and enters guided decision state
**And** system MUST prevent exceeding cap through any mutation path (single or bulk)

### Story 1.5: Invariant-Safe Single and Bulk Mutations

As a planner,
I want planning mutations to enforce invariants and preserve atomicity,
So that state integrity is never silently broken.
**Implements:** FR19, FR20

**Acceptance Criteria:**

**Given** a planning mutation is requested (single or bulk)
**When** invariant checks run
**Then** invalid transitions are blocked with explicit feedback
**And** bulk operations apply atomically or rollback fully on partial-apply failure

### Story 1.8: Local Persistence and Rebuild After Reload

As a planner,
I want my planning state to persist across reloads and restarts,
So that the system feels stable and trustworthy.
**Implements:** FR16

**Acceptance Criteria:**

**Given** tasks and Today configuration exist locally
**When** the app reloads or restarts
**Then** planning state is restored from local persistence
**And** Today projection is rebuilt deterministically
**And** no state inconsistency occurs

### Story 1.6: Explicit End-of-Day Closure Flow

As a planner,
I want to close my day only after explicit decisions on unresolved Today items,
So that no carry-over happens implicitly.
**Implements:** FR6, FR7, FR18

**Acceptance Criteria:**

**Given** Today contains unresolved items at closure time
**When** user initiates closure
**Then** system requires explicit per-item decision (reschedule or pause)
**And** closure completes only when Today reaches valid closed state
**And** no implicit carry-over to next day is allowed

### Story 1.7: Daily Plan Review Before Execution

As a planner,
I want a clear review of my current Today plan before execution,
So that I can commit with confidence.
**Implements:** FR8

**Acceptance Criteria:**

**Given** Today has selected items
**When** user enters review state
**Then** system shows current finite plan, cap status, and closure state clearly
**And** user can confirm plan readiness without leaving core flow

## Epic 2: Task Organization and Scheduling Continuity

Enable users to organize, move, reprioritize, and reschedule tasks across areas and time contexts while preserving planning integrity and continuity.

### Story 2.1: Area-Based Task Organization

As a planner,
I want to organize tasks by areas (including Inbox),
So that planning context remains structured and understandable.
**Implements:** FR10

**Acceptance Criteria:**

**Given** tasks exist in local state
**When** user assigns or changes task area
**Then** task appears in the selected area context
**And** task identity and core metadata remain intact

### Story 2.2: Cross-Area Today Aggregation

As a planner,
I want Today to aggregate tasks across areas coherently,
So that my daily decisions stay centralized.
**Implements:** FR15

**Acceptance Criteria:**

**Given** tasks exist across multiple areas
**When** user opens Today
**Then** Today shows cross-area items according to deterministic projection rules
**And** area origin remains visible without fragmenting the Today decision surface

### Story 2.3: Single-Item Move (Area and Today Membership)

As a planner,
I want to move a task between areas or Today membership without changing its date,
So that structural reorganization is fast and predictable.
**Implements:** FR11

**Acceptance Criteria:**

**Given** a task exists in a valid planning context
**When** user performs a move action
**Then** area or Today membership is updated correctly
**And** move action does not imply or apply temporal reschedule

### Story 2.4: Single-Item Reschedule (Temporal Context)

As a planner,
I want to reschedule one task to a different temporal planning target,
So that I can adapt my plan over time without changing structural ownership.
**Implements:** FR12, FR14

**Acceptance Criteria:**

**Given** a task is selected for reschedule
**When** user sets a valid new temporal target
**Then** temporal context is updated and reflected in projections
**And** reschedule does not alter area ownership unless explicitly requested

### Story 2.5: Bulk Selection and Atomic Reschedule

As a planner,
I want to apply rescheduling to multiple tasks atomically,
So that I can adjust workload quickly without partial inconsistent outcomes.
**Implements:** FR13, FR35

**Acceptance Criteria:**

**Given** multiple tasks are selected
**When** user executes bulk reschedule
**Then** operation applies to the full batch or rolls back completely
**And** system provides explicit feedback listing affected tasks and final outcome

### Story 2.6: Daily Cycle Continuity Enforcement

As a planner,
I want continuity rules across day boundaries to be strict and deterministic,
So that Today never drifts through implicit carry-over behavior.
**Implements:** FR16

**Acceptance Criteria:**

**Given** unfinished items exist at day boundary
**When** the next day cycle starts
**Then** system MUST NOT auto-populate Today with unfinished items from previous day
**And** only explicitly rescheduled or explicitly retained items appear
**And** projection rebuild after day change is deterministic

## Epic 3: Trust Controls, Sync, and Data Ownership

Provide trust architecture capabilities: local source-of-truth runtime isolation, optional sync with deterministic conflict handling, transparent sync feedback, client-side encryption control, export, deletion, and reset controls.

### Story 3.1: Runtime Isolation From Sync State

As a planner,
I want planning runtime behavior to remain isolated from sync state,
So that daily planning remains fully functional under network failures.
**Implements:** FR21, FR27

**Acceptance Criteria:**

**Given** forced network failure simulation is active
**When** user performs core planning actions (capture, move, reschedule, closure decisions)
**Then** planning remains fully functional locally
**And** sync state changes do not block or mutate core planning runtime behavior

### Story 3.2: Optional Sync Toggle and Mode Management

As a planner,
I want to explicitly enable or disable synchronization,
So that sync remains optional and under my control.
**Implements:** FR22

**Acceptance Criteria:**

**Given** local planning runtime is active
**When** user toggles sync mode on or off
**Then** sync mode changes are applied deterministically
**And** disabling sync never disables core planning capabilities

### Story 3.3: Sync Batch Protocol with Deterministic Conflict Resolution

As a planner,
I want sync batch merges to resolve consistently,
So that cross-device updates do not create unpredictable plan states.
**Implements:** FR55, FR56

**Acceptance Criteria:**

**Given** conflicting updates arrive through sync batch processing
**When** merge resolution executes
**Then** conflict resolution MUST be deterministic
**And** tie-break strategy MUST be documented (`timestamp + device_id`)
**And** resolution MUST NOT alter Today cap invariant
**And** merge MUST NOT introduce implicit carry-over behavior

### Story 3.4: Sync State Visibility Without Planning Disruption

As a planner,
I want clear sync status feedback that never disrupts planning,
So that technical state remains secondary to decisions.
**Implements:** FR26

**Acceptance Criteria:**

**Given** sync status changes (syncing, offline, retrying, success)
**When** status is rendered in UI
**Then** feedback remains informational and non-blocking
**And** planning interaction flow remains uninterrupted

### Story 3.5: Sync Error Transparency

As a planner,
I want sync errors explained in actionable language,
So that trust is preserved without technical blame.
**Implements:** FR26, FR56

**Acceptance Criteria:**

**Given** a sync failure occurs
**When** error feedback is presented
**Then** sync errors MUST NOT block planning actions
**And** sync errors MUST provide an actionable recovery path
**And** raw technical exceptions MUST NOT be exposed to end users

### Story 3.6: Multi-Device Continuity Guardrails

As a planner using multiple devices,
I want continuity preserved under eventual consistency,
So that planning state remains aligned and understandable across devices.
**Implements:** FR58, FR59

**Acceptance Criteria:**

**Given** user switches devices under eventual consistency conditions
**When** synced state is reconciled
**Then** planning continuity is preserved without violating core invariants
**And** user-visible state alignment remains consistent with confirmed planning decisions

### Story 3.7: E2EE Key Lifecycle (Client-Controlled)

As a privacy-aware planner,
I want encryption keys generated and controlled client-side,
So that synchronized task content remains unreadable to server operators.
**Implements:** FR23

**Acceptance Criteria:**

**Given** sync with E2EE is enabled
**When** key lifecycle operations occur
**Then** keys are generated and controlled client-side
**And** server has no capability to decrypt synchronized task content

### Story 3.8: Complete Human-Readable Export (Offline-Capable)

As a planner,
I want full export available even offline,
So that data portability and trust controls are always available.
**Implements:** FR24, FR25

**Acceptance Criteria:**

**Given** planning data exists locally
**When** user triggers export
**Then** export MUST include full task state, areas, Today inclusion signals, cap configuration, and reconstruction metadata
**And** export format MUST be human-readable (`JSON`)
**And** export MUST be possible offline

### Story 3.9: Sync Reset Without Local Planning Loss

As a planner,
I want to reset synchronization without losing local planning continuity,
So that I can restore trust and re-enable sync safely.
**Implements:** FR30

**Acceptance Criteria:**

**Given** sync state has degraded or needs reset
**When** user confirms sync reset
**Then** reset MUST revoke remote device registration
**And** reset MUST NOT delete local planning state
**And** reset MUST allow re-enabling sync with fresh key material

### Story 3.10: Permanent Local Data Deletion

As a planner,
I want to permanently delete local planning data,
So that local data ownership includes irreversible deletion control.
**Implements:** FR28

**Acceptance Criteria:**

**Given** user explicitly confirms local deletion intent
**When** local deletion executes
**Then** local planning data is irreversibly deleted
**And** operation outcome is clearly confirmed to user

### Story 3.11: Permanent Synced Data Deletion

As a planner with sync enabled,
I want to permanently delete synchronized planning data,
So that remote persistence can be revoked intentionally.
**Implements:** FR29

**Acceptance Criteria:**

**Given** user explicitly confirms synced deletion intent
**When** synchronized deletion executes
**Then** synced planning data is irreversibly deleted
**And** local runtime continuity rules are preserved according to reset/deletion intent

## Epic 4: Recovery and Supportability Without Destructive Reset

Provide guided non-destructive recovery and support operator troubleshooting based on deterministic validation, projection rebuild, and append-only traceability.

### Story 4.1: Persistent Append-Only Event Log

As a support-aware planner,
I want planning and sync events persisted in an append-only log,
So that recovery and troubleshooting have reliable traceability.
**Implements:** FR36

**Acceptance Criteria:**

**Given** planning and sync operations occur over time
**When** events are recorded
**Then** event log MUST be append-only
**And** event log MUST survive reload and restart
**And** event log MUST be inspectable without altering runtime state
**And** each event entry includes at least `timestamp`, `event_type`, `entity_id`, `device_id`, and `idempotency_key` when applicable
**And** event log MUST NOT be treated as primary source-of-truth

### Story 4.2: Integrity Validation Toolkit

As a support operator,
I want deterministic integrity checks for planning state,
So that inconsistencies are diagnosable before remediation actions are taken.
**Implements:** FR34

**Acceptance Criteria:**

**Given** a potential state inconsistency is reported
**When** integrity validation runs
**Then** validation outputs deterministic pass or fail results for the same input state
**And** results clearly identify invariant boundaries that were violated

### Story 4.3: Safe Projection Rebuild After Migration or Corruption

As a planner,
I want projections rebuilt deterministically after migration or partial corruption,
So that recovery never requires destructive reset.
**Implements:** FR32

**Acceptance Criteria:**

**Given** projection rebuild is triggered from snapshot plus event history
**When** rebuild completes
**Then** rebuild from identical input produces identical Today projection output
**And** recompute MUST NOT alter explicit user decisions

### Story 4.4: Readable Timeline (Phase-Scoped)

As a planner or support operator,
I want a simple readable event timeline with filtering,
So that I can understand what happened without complex debug tooling.
**Implements:** FR33

**Acceptance Criteria:**

**Given** event history exists
**When** user opens timeline view
**Then** timeline shows ordered events with basic filter by event type
**And** Phase 1 and 2 scope excludes advanced visual analytics features

### Story 4.5: Guided Non-Destructive Recovery

As a planner,
I want guided non-destructive recovery actions,
So that most inconsistencies can be resolved without data loss.
**Implements:** FR32, FR34

**Acceptance Criteria:**

**Given** recovery is initiated
**When** guidance is presented
**Then** non-destructive options are offered before destructive alternatives
**And** each recovery option includes expected outcome and reversibility context

### Story 4.6: Destructive Path Confirmation (Restricted)

As a planner,
I want explicit confirmations for irreversible operations,
So that accidental destructive actions are prevented without adding planning friction.
**Implements:** FR57

**Acceptance Criteria:**

**Given** a destructive operation is requested
**When** operation type is permanent deletion, sync reset, or irreversible key rotation
**Then** system requires explicit confirmation
**And** normal daily planning flows are not blocked by additional confirmation steps

### Story 4.7: No Destructive Reset Default

As a planner,
I want destructive reset excluded as default recovery behavior,
So that trust and continuity are preserved by design.
**Implements:** FR32

**Acceptance Criteria:**

**Given** recovery flow is presented
**When** default recommendation is selected by the system
**Then** destructive reset is never the default path
**And** non-destructive recovery options are prioritized and actionable

## Epic 5: Public Surface and Accessible Product Experience

Deliver public web presence plus authenticated Today-first product surface with responsive integrity, keyboard-first operation, WCAG compliance, and browser-matrix consistency.

### Story 5.1: Public Pages Baseline

As a visitor,
I want clear public pages (landing, docs, privacy, support),
So that I can evaluate product value, trust posture, and support options.
**Implements:** FR37

**Acceptance Criteria:**

**Given** unauthenticated visitor entry
**When** visitor navigates public surface
**Then** landing, docs, privacy, and support pages are accessible and coherent
**And** public messaging aligns with local-first and finite-loop product thesis

### Story 5.2: Authenticated Today-First Entry

As an authenticated planner,
I want to land directly on Today after authentication,
So that planning loop starts immediately without dashboard friction.
**Implements:** FR38

**Acceptance Criteria:**

**Given** authenticated user session
**When** user enters app shell
**Then** Today is the default landing view
**And** Inbox is a secondary entry and always reachable
**And** no intermediate dashboard interrupts core planning loop entry

### Story 5.3: Responsive Layout Integrity (No Feature Fork)

As a planner across devices,
I want core planning behavior preserved across breakpoints,
So that mobile, tablet, and desktop do not diverge functionally.
**Implements:** FR39

**Acceptance Criteria:**

**Given** core planning features are available on desktop
**When** same flows are executed on tablet and mobile breakpoints
**Then** Today cap enforcement is identical on all breakpoints
**And** closure flow remains identical across layouts
**And** no feature fork exists between desktop and mobile

### Story 5.4: Keyboard-First Operability

As a keyboard-oriented planner,
I want all primary planning actions available keyboard-only,
So that I can execute the full loop without mouse dependency.
**Implements:** FR40

**Acceptance Criteria:**

**Given** user navigates using keyboard only
**When** performing core loop actions
**Then** all primary planning actions are accessible without mouse
**And** tab order is logical and stable in core flows
**And** focus states are visible at all times

### Story 5.5: WCAG 2.1 AA Compliance for Core Views

As a planner with accessibility needs,
I want core planning views to meet WCAG 2.1 AA,
So that the app is usable and inclusive by default.
**Implements:** FR41

**Acceptance Criteria:**

**Given** accessibility validation is performed on core planning views
**When** Inbox, Today, and Closure views are audited
**Then** color contrast ratio is >= 4.5:1 for normal text
**And** semantic roles and ARIA usage are correct for core components
**And** screen-reader navigability is verified for Today list and Closure panel

### Story 5.6: Browser Matrix Compliance Validation

As a product owner,
I want browser matrix compliance validated for core loop behaviors,
So that supported browsers deliver equivalent functionality.
**Implements:** FR39

**Acceptance Criteria:**

**Given** defined supported browser matrix
**When** regression validation executes for Inbox, Today, and Closure flow
**Then** core loop passes across the matrix
**And** no functional degradation exists across supported browsers

## Epic 6: Operational Guardrails and Release Governance

Enable product and engineering operators to monitor loop-level health, detect regressions deterministically, enforce corrective actions, and apply invariant conformance gates before release.

### Story 6.1: Telemetry Baseline (Opt-In, Content-Free)

As a product operator,
I want loop KPI signals collected safely,
So that planning health can be monitored without violating trust boundaries.
**Implements:** FR42

**Acceptance Criteria:**

**Given** telemetry capability is available
**When** telemetry collection is configured and used
**Then** telemetry MUST be explicit opt-in
**And** telemetry MUST exclude task content and descriptive text
**And** telemetry MUST include only loop-level signals (time-to-plan, closure events, cap compliance)
**And** telemetry collection MUST NOT affect planning runtime latency

### Story 6.2: Minimal Guardrail KPI Dashboard

As a product and engineering operator,
I want a focused guardrail dashboard,
So that degradation signals are visible without building a full BI platform.
**Implements:** FR42

**Acceptance Criteria:**

**Given** operational metrics are available
**When** dashboard is viewed
**Then** dashboard shows only guardrail metrics (time-to-plan, closure frequency, cap compliance, sync error rate)
**And** no raw user content is visible
**And** cohort view is aggregated

### Story 6.3: Regression Detection Rules and Alerting

As an operator,
I want deterministic regression rules and alerts,
So that post-release degradation is detected reliably and early.
**Implements:** FR43

**Acceptance Criteria:**

**Given** guardrail monitoring is active
**When** KPI degradation is evaluated
**Then** regression threshold MUST be predefined (for example, > X% degradation over Y monitoring windows)
**And** alert rules MUST be deterministic and documented
**And** false-positive mitigation process is defined and executable

### Story 6.4: Corrective Rollback and Tuning Workflow

As a release owner,
I want explicit corrective workflow when guardrails degrade,
So that mitigation decisions are accountable and auditable.
**Implements:** FR44

**Acceptance Criteria:**

**Given** regression trigger is met
**When** rollback or tuning decision is made
**Then** rollback decision MUST be logged
**And** release guardrail review MUST be recorded
**And** no silent override of regression rule is allowed without documented approval

### Story 6.5: Feature Conformance Gate

As a governance owner,
I want feature activation gated by invariant conformance,
So that non-compliant capabilities never reach production.
**Implements:** FR45, FR46

**Acceptance Criteria:**

**Given** a feature is proposed for activation
**When** conformance gate evaluates release readiness
**Then** every new feature MUST pass invariant validation tests
**And** activation MUST be blocked if invariant test fails
**And** exception path requires explicit documented override

### Story 6.6: Cohort Behavioral Validation (Privacy-Safe)

As a product analyst,
I want loop KPI interpretation by motivation cohorts,
So that product decisions reflect real behavior differences without invasive profiling.
**Implements:** FR47

**Acceptance Criteria:**

**Given** cohort analysis is enabled
**When** segmentation is applied
**Then** segmentation MUST use non-content attributes
**And** profiling beyond declared motivation segmentation (privacy-first vs convenience-first) is not allowed
**And** cohort analysis MUST NOT dynamically alter runtime planning experience

## Epic 7: Controlled Expansion Framework

Define and enforce eligibility, conformance, and rollback controls for post-MVP expansion so growth never degrades the finite-loop model or trust architecture.

### Story 7.1: Expansion Eligibility Gate

As a product owner,
I want expansion initiatives admitted only under stable core-loop conditions,
So that growth never starts while fundamentals are degrading.
**Implements:** FR48, FR49

**Acceptance Criteria:**

**Given** expansion proposal enters governance review
**When** eligibility is evaluated
**Then** expansion initiatives MAY be evaluated only if loop KPIs remain within defined thresholds for `N` consecutive monitoring windows
**And** no expansion feature enters development if core guardrail metrics are unstable
**And** eligibility decision MUST be logged and auditable

### Story 7.2: Invariant-Safe Integration Boundary

As an architect,
I want all external integrations constrained by invariant-safe boundaries,
So that integrations cannot corrupt planning runtime semantics.
**Implements:** FR50

**Acceptance Criteria:**

**Given** an external integration attempts state interaction
**When** integration path is validated
**Then** external integrations MUST pass through the domain invariant layer
**And** no integration may mutate Today state by bypassing write-path checks
**And** API contracts MUST enforce cap and closure constraints
**And** integration failures MUST degrade gracefully without corrupting local runtime

### Story 7.3: Assistant Governance (Agency-Preserving)

As a planner,
I want assistant capabilities to remain advisory and optional,
So that autonomy is preserved and AI does not take control of planning state.
**Implements:** FR51

**Acceptance Criteria:**

**Given** assistant capability is available
**When** assistant suggestions are surfaced
**Then** assistant suggestions MUST be non-binding
**And** user MUST confirm any state-changing assistant action
**And** assistant MUST NOT auto-modify Today without explicit consent
**And** assistant features MUST function without external data harvesting
**And** assistant activation MUST remain optional

### Story 7.4: Growth Compatibility Validation

As a product team,
I want growth features validated against finite-loop compatibility rules,
So that expansion cannot replace core planning law.
**Implements:** FR52, FR53

**Acceptance Criteria:**

**Given** a growth feature is proposed
**When** compatibility validation is executed
**Then** growth features MUST NOT alter finite-loop model
**And** no feature may introduce implicit carry-over
**And** no feature may introduce infinite default planning surfaces
**And** compatibility decision MUST be documented before activation

### Story 7.5: Progressive Activation and Reversal Policy

As a release owner,
I want controlled rollout and guaranteed rollback for expansion features,
So that risk remains bounded and reversible.
**Implements:** FR49, FR53

**Acceptance Criteria:**

**Given** expansion feature is approved for rollout
**When** activation plan is prepared
**Then** expansion features are deployed behind feature flags
**And** rollback path MUST exist before activation
**And** activation metrics are monitored separately from core loop metrics
**And** non-conformant features are disabled when guardrails are violated

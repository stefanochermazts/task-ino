---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
inputDocuments:
  - C:\laragon\www\task-ino\_bmad-output\planning-artifacts\prd.md
  - C:\laragon\www\task-ino\_bmad-output\project-context.md
workflowType: 'architecture'
project_name: 'task-ino'
user_name: 'Stefano'
date: '2026-02-23'
lastStep: 8
status: 'complete'
completedAt: '2026-02-23'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The PRD defines a broad and coherent capability contract (59 FRs) centered on:
- deterministic local planning loop (`Inbox -> Finite Today -> Explicit Closure`)
- centralized invariant enforcement (cap, no implicit carry-over, atomic bulk + rollback)
- real data ownership controls (export/delete/reset sync)
- non-destructive supportability (event logs + recovery paths)
- governance through quality and release gates tied to loop KPIs

**Non-Functional Requirements:**
The NFR set (31) drives architecture directly:
- strict local interaction performance targets (100ms UI feedback, 150ms local bulk mutation for typical workload)
- E2EE boundary model with client-side key control and server blind content handling
- offline-first runtime with state reconstructability after abnormal shutdown
- WCAG 2.1 AA for core surfaces
- growth model that avoids runtime coupling of planning flows to server availability

**Scale & Complexity:**
- Primary domain: local-first planning web application with optional sync
- Complexity level: medium/high (driven by consistency and invariant requirements, not feature breadth)
- Estimated architectural components: 12 macro-components across client and server

### Architectural Source-of-Truth Constraint (Critical)

- Local browser store is the source of truth for planning runtime (`Inbox/Today/Plan/Closure`)
- Postgres is not planning source of truth
- Postgres serves sync/governance responsibilities:
  - ciphertext vault blobs
  - minimal metadata
  - account/device/sync state
  - opt-in content-free telemetry

### Technical Constraints & Dependencies

- Architecture model: SPA/PWA core client + Laravel/Postgres backend for sync and governance
- Sync must be asynchronous, optional, non-blocking, eventual-consistency
- Export must remain available and human-readable regardless of sync state
- Domain invariants must be enforced in domain logic (not UI-only enforcement)
- Browser/accessibility/performance constraints are release-critical

### Macro-Component Model

**Client (SPA/PWA):**
1. Domain Core (Task/Area/Today cap/Closure)
2. Invariant Enforcement Layer
3. Local Persistence (IndexedDB + migrations)
4. Projection/Query Engine (Today/Inbox/Week load)
5. Sync Engine (async, non-blocking, LWW policy)
6. Crypto Boundary (E2EE, client-side key management)
7. Event Log + Recovery Toolkit (non-destructive recovery)
8. UI Shell (keyboard-first, accessibility, performance budgets)

**Server (Laravel + Postgres):**
9. Auth/Device Registry + session management
10. Sync Vault Store (ciphertext blobs + minimal metadata)
11. Ops/Monitoring + release guardrails (loop KPIs)
12. Public site surface (MPA/SSG trust/docs/pricing/support)

### Cross-Cutting Concerns Identified

- Deterministic projections (`Today`, `Week load`, `Inbox`) across offline/online transitions
- Central invariant enforcement as product law
- Atomic bulk operations with rollback guarantees
- Privacy boundary where server cannot decrypt task content
- Recovery-first operability: persistent logs + guided non-destructive fixes
- Release governance driven by loop KPI integrity

## Starter Template Evaluation

### Primary Technology Domain

Web application: SPA/PWA (local-first planning runtime) + Laravel backend (sync/governance). Coerente con requisiti e stack esistente.

### Starter Options Considered

**Laravel 12 starter kits (React/Vue/Livewire)**
- Pro: ufficiali e mantenuti.
- Contro: introdurrebbero baseline frontend diversa e scelte non allineate alla policy JS-only; aumentano costi di migrazione e rischio di drift.

**Re-bootstrap / new skeleton**
- Contro: refactor non necessario in brownfield; rischio di interrompere ritmo e introdurre debito di trasloco senza valore per i guardrail.

**Existing project baseline (selected)**
- Pro: massima continuita', nessuna re-inizializzazione, nessun shock architetturale.
- Nota: baseline compatibile con i vincoli; i moduli local-first/sync verranno introdotti incrementalmente.

### Selected Starter: Existing Baseline (No Re-initialization)

**Rationale**
- Progetto gia' avviato su Laravel 12 + Vite + Tailwind + JS-only.
- Obiettivo Phase 1: validare loop (Inbox -> Today finita -> closure) e trust architecture, non cambiare skeleton.
- Re-bootstrap o nuovi starter aumentano rischio/costo senza migliorare i requisiti core.

**Initialization Command**
N/A (brownfield; no re-bootstrap).

Reference only (greenfield):
```bash
laravel new task-ino
```

### Baseline Freeze (Scope Lock)

- Phase 1 MUST NOT introduce TypeScript, framework rewrite (React/Vue), or new starter scaffolding.
- Phase 1 changes MUST be additive: implement domain/invariants/persistence/projections/sync boundary sopra l'attuale base.

### Architectural Decisions Provided by Baseline

- Backend: PHP 8.2 + Laravel 12
- Frontend: JavaScript (JS-only) + Vite entrypoints
- UI: Tailwind pipeline gia' configurata
- Testing: PHPUnit gia' presente (con riallineamento DB su Postgres se necessario)
- Repo structure e development workflow gia' stabiliti

### What the Baseline Does Not Provide (must be built)

- Local persistence (IndexedDB) + migrations
- Domain invariants enforcement layer
- Projection/query engine (Today/Inbox/Week)
- E2EE crypto boundary + key management (client-side)
- Async sync engine (LWW) + vault storage API
- Persistent event log + non-destructive recovery tooling
- Performance/accessibility release gates

**Note**
La prima implementazione non e' init progetto, ma bootstrap dei moduli architetturali core sopra la base esistente.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Source-of-truth split: browser local store for planning runtime; server for sync/governance only.
- Data architecture baseline: IndexedDB + migrations, snapshot-first model, materialized projections, deterministic LWW sync.
- Security boundary: client-side key control, ciphertext-only server handling.
- API contract: REST v1, deterministic error model, idempotent batch sync.
- Frontend operating model: feature-sliced modular architecture + offline-first optimistic flow.
- Infrastructure baseline: modular monolith on Forge with Postgres parity across environments and CI/CD quality gates.

**Important Decisions (Shape Architecture):**
- Fortify + Sanctum composition for auth and session/token patterns.
- Policies/Gates ownership-first authorization.
- Projection-first rendering and performance budget gates.
- Structured observability tied to loop KPI and guardrail alerts.

**Deferred Decisions (Post-MVP):**
- OAuth2 server capabilities (Passport) unless external OAuth2 requirements emerge.
- Microservice decomposition.
- Serverless-first platform migration.
- Advanced integration surface beyond invariant-safe boundary.

### Data Architecture

- **Persistence:** IndexedDB with explicit schema versioning and migrations.
- **Write model:** Snapshot-first with mandatory audit/event log (no full event sourcing in Phase 1).
- **Read model:** Materialized projections for Today/Inbox/Week with rebuild hooks.
- **Conflict policy:** LWW deterministic tie-break (`timestamp + device_id`) for optional sync.
- **Caching:** No Redis in Phase 1; rely on local projections for runtime speed.

### Authentication & Security

- **Auth method:** Sanctum (session/cookie for SPA + PAT for device sync use cases).
- **Auth feature layer:** Fortify endpoints for auth lifecycle.
- **Authorization:** Policies/Gates with strict ownership-first model.
- **Data boundary:** Server stores ciphertext for task content; decrypt capability remains client-side only.
- **API protection:** `auth:sanctum` + CSRF/session model + channel-specific throttling.

### API & Communication Patterns

- **API style:** REST JSON, versioned (`/api/v1/...`).
- **Error model:** RFC7807-like problem details + deterministic app error codes.
- **Sync protocol:** Delta-based batch push/pull endpoints, idempotent by contract.
- **Idempotency:** Idempotency keys per write batch with dedupe window.
- **Rate limiting:** Distinct profiles for auth, sync-write, sync-read, recovery operations.

### Frontend Architecture

- **State management:** Modular domain store + action pipeline.
- **Structure:** Feature-sliced modules (`planning`, `sync`, `settings`, `support`) with shared primitives.
- **Routing:** Hybrid (server routes for public MPA + client routing for authenticated SPA shell).
- **Performance approach:** Projection-first rendering + explicit budget gates.
- **Offline UX policy:** Offline-first optimistic writes with visible, non-blocking sync state channel.

### Infrastructure & Deployment

- **Hosting:** Laravel Forge on managed VPS for Phase 1.
- **Topology:** Modular monolith (single Laravel app + Postgres + queue worker).
- **Environments:** `dev/staging/prod` with Postgres parity where possible.
- **Observability:** Structured logs + app metrics + sync KPI dashboard + guardrail alerting.
- **CI/CD:** Automated test/lint/format/migration safety + deploy gates aligned to NFR/guardrails.

### Decision Impact Analysis

**Implementation Sequence (high-level):**
1. Local data core (IndexedDB, migrations, snapshot model, projections)
2. Invariant enforcement + bulk atomic rollback semantics
3. Crypto boundary + sync protocol (idempotent delta batch)
4. Auth/Security integration (Fortify + Sanctum + policy enforcement)
5. Observability and release guardrail gates
6. Infrastructure hardening and staged rollout pipeline

**Cross-Component Dependencies:**
- Projection determinism depends on invariant layer + persistence schema discipline.
- Sync correctness depends on idempotency model, conflict policy, and event logging.
- Security guarantees depend on strict crypto boundary and authz ownership model.
- Performance and reliability gates depend on observability instrumentation from early phases.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical conflict points identified:** 5 areas where AI agents could make divergent choices (naming, structure, format, communication, process).

### Naming Patterns

**Database Naming Conventions:**
- Tables: snake_case plural (e.g., `tasks`, `task_events`, `sync_devices`)
- Columns: snake_case (e.g., `user_id`, `created_at`)
- Foreign keys: `<entity>_id`
- Index names: `<table>_<column>_index`

**API Naming Conventions:**
- Endpoints: REST plural (`/api/v1/tasks`, `/api/v1/sync/batch`)
- Route parameters: Laravel route format (`{id}`)
- Query parameters: snake_case
- Custom headers: `X-<Domain>-<Name>` (e.g., `X-Sync-Device`, `X-Idempotency-Key`)

**Code Naming Conventions:**
- PHP classes: PascalCase
- PHP methods/properties: Laravel conventions
- JS files/modules: kebab-case for feature modules
- JS exported types/classes: PascalCase
- JS functions/variables: camelCase

**Domain Lexicon Stability (non-negotiable):**
- Domain lexicon is English and canonical across the repository.
- No semantic synonyms for the same domain concept (e.g., do not introduce `DailyLimit` if `TodayCap` is canonical).
- Domain entities must preserve semantic naming consistency across PHP and JS layers.
- Semantic drift naming variants for the same concept are prohibited.

### Structure Patterns

**Project Organization:**
- Backend follows Laravel standard + domain-focused services.
- Frontend uses feature-sliced modules (`planning`, `sync`, `settings`, `support`) with shared primitives.
- Test structure remains consistent by layer and feature intent.

**File Structure Patterns:**
- Local persistence, projection engine, sync engine, and crypto boundary are separate modules.
- Invariant logic is never placed inside UI components.
- Config and constants remain centralized; avoid duplicated cross-module constants.

### Format Patterns

**API Response Formats:**
- Success responses use a consistent envelope (`data`, optional `meta`, optional `links`).
- Error responses follow RFC7807-like structure (`type`, `title`, `status`, `detail`, `code`, optional `errors`).
- Status codes strictly map to outcome classes (2xx/4xx/5xx).

**Data Exchange Formats:**
- API JSON fields use snake_case.
- Date/time values use ISO-8601 UTC.
- Boolean values use true/false.
- Null semantics are explicit per endpoint contract.

### Communication Patterns

**Event System Patterns:**
- Event naming: `domain.entity.action` (e.g., `planning.task.rescheduled`).
- Event payloads include explicit schema versioning (`event_version`).
- Event records include deterministic metadata where applicable (`timestamp`, `device_id`, `idempotency_key`).

**Event Log Nature (explicit boundary):**
- Event log is append-only and audit-oriented.
- Event log supports recovery/support/sync traceability.
- Phase 1 is not event-sourced architecture.
- System state is derived from primary snapshot store and projections, not reconstructed exclusively from events.

**State Management Patterns:**
- State updates go through a defined action pipeline.
- Projections must be deterministically rebuildable.
- Sync updates must not block core planning rendering.
- Invariant checks execute in centralized write-path logic.

### Process Patterns

**Error Handling Patterns:**
- Separate user-facing domain errors from technical/logging errors.
- No silent fallbacks that bypass domain guardrails.
- Default to recovery-first, non-destructive handling paths.

**Loading State Patterns:**
- Use local feature loading states + dedicated sync indicators.
- Core planning UI remains usable in offline mode.
- No global blocking spinner for local planning operations.

**Invariant Enforcement Layer (hard rule):**
- All write operations MUST pass through a single invariant enforcement layer.
- UI components MUST NOT mutate store directly.
- Bulk operations MUST use the same invariant pipeline as single operations.

**Loading/Offline UX Policy (hard rule):**
- Sync errors MUST NOT alter planning state visibility.
- Offline mode MUST NOT switch UI into degraded planning mode.
- Sync retry MUST be background and non-blocking.

### Enforcement Guidelines

**All AI Agents MUST:**
- Respect Domain Guardrails as hard constraints.
- Implement write-path logic through invariant enforcement.
- Preserve local source-of-truth behavior for planning runtime.
- Avoid introducing TypeScript, framework rewrites, or starter scaffolding changes in Phase 1.
- Follow naming/format conventions defined in this section.

**Pattern Enforcement:**
- Enforce via PR checks, invariant tests, and API contract checks.
- Track pattern violations as architectural defects.
- Document and explicitly approve any pattern exception before implementation.

### Pattern Examples

**Good Examples:**
- `POST /api/v1/sync/batch` uses `X-Idempotency-Key` and deterministic error shape.
- `task_events` records include stable metadata and versioned payloads.
- Today projection rebuild produces identical results from the same snapshot state.

**Anti-Patterns:**
- UI directly mutating planning state.
- Mixed API field naming conventions.
- Sync retry without idempotency keys.
- Implicit carry-over of unresolved Today items.

### Architectural Non-Negotiables (Derived From Patterns)

- Planning runtime is deterministic and server-independent.
- Today projection is rebuildable and invariant-safe.
- All mutations pass through invariant enforcement.
- Sync never mutates planning state without deterministic resolution.
- Event log is append-only and non-destructive.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
task-ino/
├── app/
│   ├── Console/
│   ├── Exceptions/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Public/
│   │   │   ├── AppShell/
│   │   │   └── Api/
│   │   │       └── V1/
│   │   │           ├── Auth/
│   │   │           ├── Sync/
│   │   │           ├── Recovery/
│   │   │           └── Telemetry/
│   │   ├── Middleware/
│   │   ├── Requests/
│   │   └── Resources/
│   ├── Domain/
│   │   └── Planning/
│   │       ├── Entities/
│   │       ├── ValueObjects/
│   │       ├── Invariants/
│   │       ├── Services/
│   │       └── Policies/
│   ├── Application/
│   │   ├── Sync/
│   │   ├── Recovery/
│   │   └── Telemetry/
│   ├── Infrastructure/
│   │   ├── Persistence/
│   │   ├── Crypto/
│   │   ├── Queue/
│   │   └── Observability/
│   ├── Models/
│   ├── Providers/
│   └── Support/
├── bootstrap/
├── config/
│   ├── app.php
│   ├── auth.php
│   ├── cache.php
│   ├── database.php
│   ├── queue.php
│   ├── sanctum.php
│   └── services.php
├── database/
│   ├── factories/
│   ├── migrations/
│   │   ├── *_users_*.php
│   │   ├── *_devices_*.php
│   │   ├── *_sync_vaults_*.php
│   │   ├── *_sync_batches_*.php
│   │   ├── *_telemetry_events_*.php
│   │   └── *_support_audit_*.php
│   └── seeders/
├── public/
│   └── build/
├── resources/
│   ├── css/
│   │   └── app.css
│   ├── js/
│   │   ├── app.js
│   │   ├── bootstrap.js
│   │   ├── shell/
│   │   │   ├── router/
│   │   │   ├── layout/
│   │   │   └── accessibility/
│   │   ├── features/
│   │   │   ├── planning/
│   │   │   │   ├── components/
│   │   │   │   ├── store/
│   │   │   │   ├── actions/
│   │   │   │   ├── projections/
│   │   │   │   ├── invariants/
│   │   │   │   └── tests/
│   │   │   ├── sync/
│   │   │   │   ├── engine/
│   │   │   │   ├── api/
│   │   │   │   ├── idempotency/
│   │   │   │   ├── state/
│   │   │   │   └── tests/
│   │   │   ├── recovery/
│   │   │   │   ├── toolkit/
│   │   │   │   ├── diagnostics/
│   │   │   │   └── tests/
│   │   │   ├── settings/
│   │   │   └── support/
│   │   ├── platform/
│   │   │   ├── persistence/
│   │   │   │   ├── indexeddb/
│   │   │   │   ├── migrations/
│   │   │   │   └── repositories/
│   │   │   ├── crypto/
│   │   │   ├── events/
│   │   │   └── observability/
│   │   └── shared/
│   │       ├── api/
│   │       ├── errors/
│   │       ├── date-time/
│   │       └── utils/
│   └── views/
│       ├── public/
│       │   ├── landing.blade.php
│       │   ├── pricing.blade.php
│       │   ├── manifesto.blade.php
│       │   ├── privacy.blade.php
│       │   └── support.blade.php
│       └── app/
│           └── shell.blade.php
├── routes/
│   ├── web.php
│   ├── api.php
│   └── channels.php
├── storage/
├── tests/
│   ├── Unit/
│   │   ├── Domain/
│   │   ├── Application/
│   │   └── Support/
│   ├── Feature/
│   │   ├── Api/
│   │   │   └── V1/
│   │   ├── Auth/
│   │   ├── Sync/
│   │   ├── Recovery/
│   │   └── PublicPages/
│   ├── Integration/
│   │   ├── Sync/
│   │   ├── Idempotency/
│   │   └── ProjectionRebuild/
│   └── Support/
│       ├── Fixtures/
│       └── Builders/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── test.yml
│       └── deploy.yml
├── docs/
│   └── architecture/
├── composer.json
├── package.json
├── vite.config.js
├── phpunit.xml
├── .editorconfig
├── .env.example
└── README.md
```

### Architectural Boundaries

**API Boundaries:**
- `routes/api.php` + `app/Http/Controllers/Api/V1/*`
- Boundary contracts:
  - `/api/v1/auth/*` (Fortify/Sanctum flows)
  - `/api/v1/sync/*` (delta batch + idempotency)
  - `/api/v1/recovery/*`
  - `/api/v1/telemetry/*` (opt-in, content-free)

**Component Boundaries:**
- UI components in `resources/js/features/*/components`
- Domain invariants isolated in `resources/js/features/planning/invariants`
- No direct store mutation outside action pipeline

**Service Boundaries:**
- Client sync engine isolated from planning feature state
- Server app services in `app/Application/*`
- Domain policies/invariants in `app/Domain/*`

**Data Boundaries:**
- Client: IndexedDB snapshot/projection/event log stores
- Server: Postgres as sync/governance store (ciphertext + metadata)
- Clear separation between decrypt-capable client and server blind storage

### Requirements to Structure Mapping

**Feature / FR Mapping:**
- Planning loop FRs -> `resources/js/features/planning/*`
- Sync/idempotency FRs -> `resources/js/features/sync/*` + `app/Http/Controllers/Api/V1/Sync/*`
- Recovery FRs -> `resources/js/features/recovery/*` + `app/Application/Recovery/*`
- Trust/security FRs -> `resources/js/platform/crypto/*` + `config/sanctum.php` + auth boundaries
- Governance FRs -> telemetry + observability modules on both sides

**Cross-Cutting Concerns:**
- Invariant enforcement -> shared write-path in planning actions
- Error format/RFC7807 -> `resources/js/shared/errors` + API resources/middleware
- Accessibility/performance gates -> shell + CI workflows + feature test suites

### Integration Points

**Internal Communication:**
- Client features communicate through action pipeline + projection reads
- Sync engine communicates with shared API client and event log layer
- Server app services coordinate via application layer contracts

**External Integrations:**
- None mandatory in Phase 1 for core loop
- Future integrations pass through invariant-safe API boundary only

**Data Flow:**
- UI action -> invariant layer -> snapshot persistence -> projection update -> async sync enqueue
- Sync response -> deterministic merge/LWW -> projection rebuild hooks -> UI refresh

### File Organization Patterns

**Configuration Files:**
- Centralized in `config/*`
- No duplicated per-feature config constants without justification

**Source Organization:**
- Feature-sliced on frontend
- Domain/Application/Infrastructure separation on backend

**Test Organization:**
- Unit/Feature/Integration split with explicit sync/projection/recovery coverage

**Asset Organization:**
- Public MPA assets and SPA shell assets separated but served via Vite pipeline

### Development Workflow Integration

**Development Server Structure:**
- Existing `composer run dev` path remains baseline
- Feature modules load independently in SPA shell

**Build Process Structure:**
- Vite builds SPA shell + feature modules
- Laravel pipeline handles API/public pages/config/env boundaries

**Deployment Structure:**
- Forge deploy pipeline with staged checks
- Postgres parity across environments
- Release gates enforce NFR/guardrails before production promotion

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All major decisions are mutually compatible: local-first runtime, source-of-truth split, optional non-blocking sync, client-side crypto boundary, and modular monolith backend.

**Pattern Consistency:**
Implementation patterns support architectural decisions directly and reduce multi-agent divergence risk across naming, structure, communication, and process layers.

**Structure Alignment:**
Project structure supports all selected architecture modules and preserves clear client runtime vs server sync/governance boundaries.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
No epics were loaded in this workflow; coverage was validated against PRD functional and non-functional requirements.

**Functional Requirements Coverage:**
Core FRs are architecturally supported, including deterministic planning loop, invariant enforcement, atomic bulk behavior, idempotent sync, trust controls, and recovery/governance capabilities.

**Non-Functional Requirements Coverage:**
Performance, security, scalability, accessibility, and recoverability concerns are represented in architectural decisions, boundaries, and enforcement patterns.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Critical and important decisions are documented with rationale and implementation impact.

**Structure Completeness:**
A complete and actionable directory structure, boundaries, and requirement mapping are defined.

**Pattern Completeness:**
Potential conflict points for AI agents are addressed with explicit consistency and enforcement rules.

### Gap Analysis Results

**Critical Gaps:**
- None blocking implementation at architecture level.

**Important Gaps (non-blocking):**
- UX design artifact and epics/stories artifact are not yet part of this architecture workflow context and should be completed in their dedicated workflows.

**Nice-to-Have Gaps:**
- Extended error code catalog expansion beyond Phase 1 minimum set.
- Additional operational playbooks for advanced failure drills.

### Validation Issues Addressed

- Source-of-truth ambiguity fully resolved.
- Event log boundary explicitly clarified (audit/recovery support, not event-sourcing baseline).
- Invariant enforcement centralized and mandatory for all mutations.
- Offline/sync UX policy hardened to preserve planning visibility and non-blocking behavior.

### Mandatory Architecture Locks (Before Implementation)

#### 1) Local Source of Truth Contract (Architectural Law)

- The browser local store is the authoritative source for planning runtime.
- Server state is a replicated, eventually consistent ciphertext vault.
- Today/Inbox/Plan/Closure must not rely on backend state as runtime authority.

#### 2) IndexedDB Versioning Policy (Phase 1 Baseline)

- `migration_id` is mandatory and monotonic integer for all schema changes.
- Projection rebuild must execute after successful migration.
- Sync payloads must include `schema_version` for backward-compatible handling during transitions.

#### 3) Minimal Deterministic Error Code Catalog (Phase 1)

**Domain errors (stable):**
- `TODAY_CAP_EXCEEDED`
- `CLOSURE_REQUIRED`
- `INVARIANT_VIOLATION`
- `SYNC_CONFLICT_RESOLVED_LWW`

**Contract rule:**
- Domain errors and technical errors remain strictly separated in API contracts and logging.

#### 4) Event Log Retention Policy

- Phase 1 policy: append-only, no compaction.
- Retention policy must be explicit (rolling window), with default implementation preserving practical local history for recovery.
- State rebuild derives from snapshot + deterministic projection rebuild; events remain audit/recovery support, not sole state source.

#### 5) KPI Guardrail Enforcement Ownership

- Release gate owners: Product + Engineering approvers.
- Rollback policy: manual approval path with mandatory trigger conditions.
- Sustained degradation window: two consecutive release windows (or equivalent monitoring windows) aligned to gate model.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented
- [x] Technology stack and boundaries specified
- [x] Integration patterns defined
- [x] Performance and security constraints addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements-to-structure mapping completed

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION (architecture layer)

**Confidence Level:** High

**Key Strengths:**
- Strong alignment with local-first product thesis
- Non-negotiable guardrails translated into enforceable implementation contracts
- Clear split between client runtime authority and backend sync/governance role
- Robust anti-drift patterns for multi-agent implementation

**Areas for Future Enhancement:**
- Expand domain error catalog as feature surface grows
- Add deeper operational runbooks for advanced incident scenarios

### Implementation Handoff

**AI Agent Guidelines:**
- Follow architectural decisions and patterns without ad-hoc deviations
- Never bypass the invariant enforcement layer
- Preserve source-of-truth and crypto boundary contracts
- Keep domain lexicon canonical and stable

**First Implementation Priority:**
- Bootstrap client core modules: persistence, invariant layer, projections, sync boundary

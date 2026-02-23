---
project_name: 'task-ino'
user_name: 'Stefano'
date: '2026-02-23'
sections_completed: ['technology_stack', 'language_specific_rules', 'framework_specific_rules', 'testing_rules', 'code_quality_style_rules', 'development_workflow_rules', 'critical_dont_miss_rules']
existing_patterns_found: 6
status: complete
rule_count: 38
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Backend (PHP)

- **PHP**: `^8.2` (from `composer.json`)
- **Laravel Framework**: `^12.0`
- **Laravel Tinker**: `^2.10.1`

### Frontend / Build

- **Vite**: `^7.0.7` (ESM project: `"type": "module"`)
- **laravel-vite-plugin**: `^2.0.0`
- **Tailwind CSS**: `^4.0.0`
- **@tailwindcss/vite**: `^4.0.0`
- **Axios**: `^1.11.0`
- **concurrently**: `^9.0.1` (used by `composer run dev`)

### Testing

- **PHPUnit**: `^11.5.3` (from `composer.json`)
- Default test DB: **SQLite in-memory** (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` in `phpunit.xml`)

### Database (source of truth)

- Production: **PostgreSQL**
- Local/dev: prefer **PostgreSQL** (align with production)
- Tests: SQLite in-memory (current default)
- Rule: implement migrations/queries assuming Postgres behavior; avoid SQLite-only workarounds/features.

### Notable project wiring

- Vite entrypoints: `resources/css/app.css`, `resources/js/app.js` (from `vite.config.js`)
- Tailwind v4 uses `@import 'tailwindcss';` and sources Blade/JS files via `@source` in `resources/css/app.css`

## Critical Implementation Rules

### Language-Specific Rules

#### PHP

- Target runtime: PHP 8.2 (avoid features requiring >8.2).
- File style: follow `.editorconfig` (LF, 4 spaces, final newline, trim trailing whitespace).
- DB behavior: assume Postgres semantics (avoid relying on SQLite quirks).

#### JavaScript (no TypeScript)

- Project is ESM (`package.json` has `"type": "module"`).
- No TypeScript: add JS only under `resources/js/**`.
- Entrypoint: `resources/js/app.js` (imports `./bootstrap`).
- Axios is initialized in `resources/js/bootstrap.js` and available as `window.axios` (with `X-Requested-With` already set).

#### Test environment

- Tests should run on **PostgreSQL** (align with production), not SQLite in-memory.
- Rule: set up test env/config for Postgres and keep migrations/queries Postgres-compatible.

### Framework-Specific Rules (Laravel)

- Routing: define routes in `routes/web.php`; prefer controllers under `app/Http/Controllers/**` once logic grows (avoid fat route closures).
- Views: Blade templates live in `resources/views/**`. For assets, use `@vite(['resources/css/app.css','resources/js/app.js'])`.
- Auth/UI: `welcome.blade.php` conditionally shows login/register/dashboard links via `Route::has('login')` and `Route::has('register')`—if you add auth, ensure these routes exist.
- Assets pipeline: Vite inputs are fixed in `vite.config.js` (keep `resources/css/app.css` + `resources/js/app.js` as entrypoints).
- DB: Postgres is source-of-truth (prod + preferred local/dev). Write migrations/queries assuming Postgres.

### Testing Rules

- Framework: PHPUnit (`tests/Unit/**`, `tests/Feature/**`).
- Test DB: use **PostgreSQL** (align with production). Do not rely on SQLite in-memory behavior.
- Test boundaries:
  - Unit: pure logic without DB when possible.
  - Feature: HTTP/request lifecycle (e.g. `$this->get('/')`) and integration.
- Rule: when a test uses DB, keep isolation/cleanup consistent (transactions or refresh strategy).

### Code Quality & Style Rules

- Formatting baseline: follow `.editorconfig`
  - `end_of_line = lf`, `indent_style = space`, `indent_size = 4`
  - final newline required, no trailing whitespace (except `.md`)
  - YAML: indent 2 spaces
- PHP formatter: use Laravel Pint (dependency present). If no project-level config exists, adhere to Pint defaults.
- JS: no ESLint/Prettier config in repo (do not introduce them without explicit decision).

### Development Workflow Rules

- No formal Git/PR conventions in repo: do not introduce branch-naming or commit-message rules without explicit team decision.
- Key commands: `composer run dev` (server + queue + pail + vite), `composer run test` (PHPUnit). Use these to validate before considering work done.
- Deploy: no deploy scripts or docs in project; do not assume a pipeline without defining or documenting it.

### Critical Don't-Miss Rules

- **DB**: Do not rely on SQLite-only features or syntax; target is Postgres (prod, preferred local, tests). Avoid `LIKE`/regex or types that differ on Postgres.
- **Frontend**: Do not add TypeScript or `.ts` files without explicit decision; stay with JS under `resources/js/**`. Do not change Vite entrypoints without updating `vite.config.js` and `@vite` in Blade.
- **Tests**: Do not assume SQLite in-memory; tests run on Postgres. Do not write tests that depend on execution order or shared state without cleanup (transactions/refresh).
- **Style**: Follow `.editorconfig` (LF, 4 spaces, final newline). Run Pint on touched PHP; do not introduce ESLint/Prettier without agreement.
- **Laravel**: Use `@vite([...])` for assets in Blade, not manual build links. If adding auth, define `login`/`register` (and `dashboard` if using welcome) routes.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when technology stack changes.
- Review periodically for outdated rules.
- Remove rules that become obvious over time.

Last Updated: 2026-02-23

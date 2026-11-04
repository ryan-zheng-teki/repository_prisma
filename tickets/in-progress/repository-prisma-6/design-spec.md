# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001 (Solution Designer within the direction; user informed)
- User approval of the design: `Not required`
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/investigation-notes.md`
- Authorities read (2026-11-04): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md`
- Conflicts: none

## Current-State Read

`scripts/run-package-smoke.js` (739 lines) is one top-level `try/finally`. Its sections share locals: `temporaryRoot`, `packDirectory`, `consumerDirectory`, `run`, `includedPaths`, canary values, secrets and spy-file paths. The sections and their line ranges are listed in the investigation notes. `package.json:20` runs it after `npm run build` and before `scripts/run-esm-cjs-interop.js`. There is no `allowScripts` field. `ci.yml` runs plain `npm ci` on Node 24 (npm 11.19.1).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`. One script becomes about 9 owned files, plus small edits to `package.json`, `package-lock.json` (if npm rewrites it), `ci.yml`, README and CHANGELOG.
- Architectural risk: `Low`. The change touches test infrastructure, install policy and docs only. There is no library source, API, persistence, security-boundary or ownership change. Behavior preservation of the smoke is checked by output comparison and a mutation check. The approvals were measured on npm 10, 11 (strict) and 12, on macOS arm64 and Linux x64.
- Escalation trigger: a smoke check cannot be moved without changing what it asserts; CI fails under `--strict-allow-scripts` for a reason the probes did not show; or any `src/` change becomes necessary. Return `Design Impact`.

## Architecture Investigation Evidence

See the investigation notes (Runtime, Probe, Or Reproduction Findings). Key rows: the npm 12 consumer failure and its fix; the repo on npm 12 with and without approvals; strict mode with a stale pin; Linux x64 in `node:24-bookworm`.

## Intended Change

Split the smoke script into a runner plus one module per check area. Record the approvals in `allowScripts`, enforce them in CI, and document consumer and maintainer guidance.

## Change Scope (Mandatory)

- In scope: UC-001..003. Files: `scripts/run-package-smoke.js` (becomes the runner), new `scripts/package-smoke/*.js`, `package.json` (`allowScripts`), `package-lock.json` (only if npm rewrites it), `.github/workflows/ci.yml`, `README.md`, `CHANGELOG.md`.
- Derived consumers: `package.json` `allowScripts` is read by npm 11.16+ installs of this repo. It ships in the published manifest, where npm ignores it for dependencies.
- Deliberately left alone: `src/`, `scripts/run-esm-cjs-interop.js`, `scripts/run-tests.js`, `release.yml` (CI must be green before tagging), version.
- Follow-ups: FU-001 (a clearer library error when the native binding is missing), FU-002 (the consumer `autobyteus-server-ts` must add `better-sqlite3` to its `pnpm.onlyBuiltDependencies` for its Prisma 7 upgrade).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Change / Preserved | Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001 / AC-001, AC-002 | `npm run test:package` | Preserved checks and output; new file structure | runner -> step modules in the existing order |
| BEH-002 | REQ-002 / AC-003, AC-004 | `npm ci` | `allowScripts` policy | npm reads root `package.json` |
| BEH-003 | REQ-003 / AC-004, AC-005 | CI | strict install | `ci.yml` |
| BEH-004 | REQ-004 / AC-006 | consumer install | README guidance | README setup section |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor` (item 1) plus `Behavior Change` (install policy and docs, item 2)
- Current design issue found: `Yes`. File Placement Or Responsibility Drift: one file owns pack checks, consumer install, import safety, logging policy, CJS/ESM runtime smokes, the type check and reporting.
- Structural triggers: *Responsibility overload* fires (739 lines, eight concerns) and is resolved by the split. *Shared folder* is ruled out: the new folder is specific to the package smoke. *Empty indirection* is ruled out: each module owns real checks, and the runner owns the order and the result.
- Refactor needed now: `Yes` (the ticket's item 1)
- Design response: the split below; move code, do not rewrite assertions.

## Legacy Removal Policy (Mandatory)

- The monolithic body of `scripts/run-package-smoke.js` is replaced by the runner, with no copy left behind.
- Compatibility wrappers: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | `npm run test:package` -> `node scripts/run-package-smoke.js` | final JSON line, or a thrown assertion; temp root removed | runner |

## Primary Execution Spine(s)

`npm run test:package -> run-package-smoke.js (runner) -> createSmokeContext -> checkPackedArtifact -> installConsumer -> checkImportSafety -> checkLoggingPolicy -> checkCjsRuntime -> checkEsmRuntime (+ no-query-string files) -> checkConsumerTypes -> print result JSON -> finally: remove temp root`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The runner creates one shared context (temp root, pack and consumer directories, the `run` helper). It calls each step in today's order, each step asserting what it asserts today. The runner collects the values the final JSON needs (`packedFiles` from the packed-artifact step, `readonlyWal` from the CJS runtime step), prints the identical JSON, and removes the temp root in `finally`. | runner |

## Ownership Map

- Runner: order, the shared context lifecycle, the result JSON, cleanup.
- `harness.js`: process and filesystem helpers only (no checks).
- Each step module: one check area, with its own generated consumer scripts and assertions. Steps don't call each other.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| Monolithic body of `scripts/run-package-smoke.js` | Responsibility overload | runner + `scripts/package-smoke/*` |

## Final File Responsibility Mapping

| File | Concern | Approx. lines (from current ranges) |
| --- | --- | --- |
| `scripts/run-package-smoke.js` (Modify) | runner: context, order, result JSON, cleanup | ~50 |
| `scripts/package-smoke/harness.js` (Add) | `createSmokeContext()` (temp root, `pack`/`consumer` dirs, repoRoot, npm/node commands), `run`, `symlinkDirectory`, `filesWithQueryInName` | ~55 |
| `scripts/package-smoke/packed-artifact.js` (Add) | `npm pack`, required/forbidden paths, dist text checks, declaration checks; returns `{ includedPaths, tarballPath }` | ~100 |
| `scripts/package-smoke/consumer-install.js` (Add) | consumer `package.json`, tarball install, peer symlinks | ~40 |
| `scripts/package-smoke/import-safety.js` (Add) | constructor/native spy, CJS and ESM import safety (no env loading, no constructor, no native addon) | ~100 |
| `scripts/package-smoke/logging-policy.js` (Add) | policy peer stub, CJS/ESM logging-policy matrix | ~215 |
| `scripts/package-smoke/cjs-runtime.js` (Add) | CJS runtime smoke incl. read-only WAL (root/Windows skip logic and line); returns `readonlyWal` | ~110 |
| `scripts/package-smoke/esm-runtime.js` (Add) | ESM runtime smoke and the no-query-string-file check | ~45 |
| `scripts/package-smoke/consumer-types.js` (Add) | consumer TypeScript declaration check (`type-smoke.ts`, `tsc`) | ~75 |
| `package.json` (Modify) | `allowScripts`: `{"better-sqlite3@12.11.1": true, "esbuild": false, "prisma": false, "@prisma/engines": false, "fsevents": false}`, written with `npm install-scripts approve better-sqlite3` and `npm install-scripts deny esbuild prisma @prisma/engines fsevents` (npm ≥ 11.16), not by hand, so the format is npm's | — |
| `.github/workflows/ci.yml` (Modify) | `- run: npm ci --strict-allow-scripts` | — |
| `README.md` (Modify) | Setup section and Testing section (see Guidance) | — |
| `CHANGELOG.md` (Modify) | `## Unreleased` bullets | — |

Rule: each step module exports one function `(context, inputs?) => outputs`. A value one step produces and a later step needs (e.g. `tarballPath`) is returned and passed by the runner. Constants used only inside one step (canaries, secrets, spy files) move into that step.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep a copy of the old monolithic script | Rejected |
| `--dangerously-allow-all-scripts` or `approve --all` | Rejected: grants the 4 unneeded scripts |
| `.npmrc` `strict-allow-scripts=true` | Rejected: unknown-config warnings on npm 10 |

## Change Sequence

1. Capture the baseline: `npm run test:package` output (non-root; and as root in `node:24-bookworm`) before any change.
2. Split the script (move, don't rewrite). Compare the outputs (AC-001). Run a mutation check (AC-002), e.g. temporarily remove `@prisma/adapter-better-sqlite3` from tsup `external`, or print a secret in one generated script. Revert it.
3. `allowScripts` via npm commands; npm 12 and npm 11 strict checks (macOS arm64 and Linux x64 container), including a stale-pin negative (AC-003, AC-004).
4. `ci.yml` strict install.
5. README and CHANGELOG. Verify AC-006 with fresh consumers following only the README (npm 12.2.1; pnpm 12.16.1). These install the published 2.0.0, so the guidance is proven against the real package.

## Guidance For Implementation

- README setup section, replacing "npm 7+ and pnpm install the peers ... automatically":
  - npm 7+ installs the peers `@prisma/client` and `@prisma/adapter-better-sqlite3` automatically.
  - With pnpm, also add `@prisma/client@7` as a direct dependency (`pnpm add repository_prisma @prisma/client@7`); otherwise `prisma generate` cannot find it.
  - Yarn: keep the current sentence.
- New "Allow the native SQLite build" step in the setup section:
  - npm 12+ and pnpm 10+ do not run dependencies' install scripts by default, so `better-sqlite3` installs without its native module.
  - Symptom: `initializePrisma` rejects `CONNECTION_FAILED`, and the `onDiagnostic` cause says "Could not locate the bindings file".
  - npm 12+: `npm install-scripts approve better-sqlite3`, then reinstall (`npm ci` or `npm rebuild better-sqlite3`).
  - pnpm 11+: `pnpm approve-builds better-sqlite3`.
  - pnpm 10: add `better-sqlite3` to `onlyBuiltDependencies` (`pnpm-workspace.yaml`, or `pnpm.onlyBuiltDependencies` in `package.json`), then `pnpm install`.
  - Keep it short and copy-pasteable.
- README Testing (maintainers):
  - The repo approves only `better-sqlite3`'s install script, pinned to its version; `esbuild`, `prisma`, `@prisma/engines` and `fsevents` are denied because the repo doesn't need them (measured).
  - After upgrading `better-sqlite3`, run `npm install-scripts approve better-sqlite3` and commit; CI installs with `--strict-allow-scripts` and fails otherwise.
- CHANGELOG `## Unreleased`: README guidance for npm 12 / pnpm native builds and pnpm's `@prisma/client`; the repository's install-script approvals and strict CI; the package-smoke split (no behavior change).
- Evidence logs go into the ticket's `evidence/`.

# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001, approved by the Solution Designer within the direction (user informed)
- User approval of the design: `Not required`
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/investigation-notes.md`
- Authorities read (2026-11-04): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md`
- Project design-principle conflicts: none

## Current-State Read

There is no runtime-code path in scope. The change touches:
- the CI/release configuration (`.github/workflows/ci.yml:13-16`, `release.yml:15-24`);
- one test-script case (`scripts/run-package-smoke.js:522-552`, inside the generated `cjs-smoke.cjs`);
- the docs (README "Release (Tag-Based)", DESIGN.md, CHANGELOG);
- the dependency manifest/lockfile (`package.json:41-43, 52`; `tsup.config.ts:11`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: about 9 files. There is no runtime source change and no new component: workflow config, one guarded block in a test script, docs, and the dependency manifest/lockfile.
- Architectural risk: `Low`
- Risk rationale:
  - No API, persistence, security, concurrency or ownership change.
  - The deployment workflow change is a runtime-version bump measured locally (Node 24.22.2 + npm 11.19.1: `npm ci`, typecheck, tests, build).
  - CI on `main` proves `ci.yml`. A release-workflow fault would fail the next publish before anything is published, with no partial state.
  - Removing `uuid` changes no public API: nothing imports it (grep), and the dist has 0 references.
- Escalation trigger: CI on Node 24 fails in a way the local probe did not show. Or the dependency update needs a major-version bump, or any `src/` change. Return `Design Impact`.

## Architecture Investigation Evidence

| Source | Observation | Decision Supported |
| --- | --- | --- |
| Node 24.22.2 probe (investigation notes) | `npm ci` (npm 11.19.1) skips Prisma's preinstall with a warning; `prepare` still generates; checks pass | DEC-001 |
| `action.yml@v5` of checkout/setup-node | `using: node24` | DEC-002 |
| `npm view npm@^11.5.1 version` | resolves to 11.21.1 | DEC-003 |
| `scripts/run-package-smoke.js:522-552`; `src/tests/client-lifecycle.test.ts:123` | root bypasses chmod; the mapping is also covered in vitest | DEC-004 |
| npm 10.9.8 arborist crash vs npm 11 `audit fix` | 0 vulnerabilities; new lockfile installs and passes under npm 10 | DEC-007 |

## Intended Change

Update the workflows to Node 24, make the smoke root-tolerant, complete the release guide, add design cases, and clear the advisories while removing `uuid`.

## Change Scope (Mandatory)

- In scope: UC-001..005. Files: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/run-package-smoke.js`, `README.md`, `DESIGN.md`, `CHANGELOG.md`, `package.json`, `package-lock.json`, `tsup.config.ts`.
- Derived consumers: the `dependencies` field of the published manifest. Consumers no longer receive `uuid` (no reader in the package). The tsup `external` list has no other reader.
- Deliberately left alone: `src/`, the test suites, `prisma/`, version (stays 2.0.0), adding `test:package` to CI, and tooling major upgrades.
- Follow-ups: FU-001 (`scripts/run-package-smoke.js` is 729 lines, already over the 500-line limit before this change; this change adds at most a few lines).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Change | Target Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001/002, AC-001/002 | push, tag | Node 24, actions v5, npm `^11.5.1` | workflows |
| BEH-002 | REQ-003, AC-003 | `test:package` as uid 0 | guarded skip with a printed reason | `cjs-smoke.cjs` read-only WAL block |
| BEH-003 | REQ-004, AC-004 | release by a maintainer | guide text | README |
| BEH-004 | REQ-005, AC-004 | design/review work | new section | DESIGN.md |
| BEH-005 | REQ-006/007, AC-005/006 | install | manifest + lockfile | package.json, lockfile, tsup config, CHANGELOG |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`
- Current design issue found: `No`
- Structural triggers: *Legacy cleanup* fires (the unused `uuid` dependency and external are removed). *Responsibility overload* is ruled out: the smoke file's size is pre-existing, the change does not meaningfully grow it, and it goes to follow-up FU-001.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`

## Legacy Removal Policy (Mandatory)

- Removed: `dependencies.uuid`, `devDependencies["@types/uuid"]`, `'uuid'` in tsup `external`, and the forced `npm@11.5.1` pin.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`. No stored data is involved.

## Data-Flow Spine Inventory

N/A. No runtime data flow changes. The operational flows are listed in the behavior map.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `uuid` dependency, `@types/uuid`, tsup external `'uuid'` | Dead: `grep -rn uuid src scripts examples` finds no import; `dist` has 0 references | nothing |
| `npm i -g npm@11.5.1` | would downgrade Node 24's npm | `npm i -g npm@^11.5.1` |

## Final File Responsibility Mapping / Target Changes

| Path | Change |
| --- | --- |
| `.github/workflows/ci.yml` | `actions/checkout@v5`, `actions/setup-node@v5`, `node-version: 24` (keep `cache: npm`) |
| `.github/workflows/release.yml` | `actions/checkout@v5`, `actions/setup-node@v5`, `node-version: 24`. The npm step becomes `npm --version; npm i -g npm@^11.5.1; npm --version`; rename it accordingly (e.g. "Ensure npm >= 11.5.1 (trusted publishing)"). |
| `scripts/run-package-smoke.js` | In the generated CJS smoke, change the read-only WAL guard from `process.platform !== 'win32'` to also require `process.getuid?.() !== 0`. In the else-branch for root, print one line such as `skip: read-only WAL case (running as root; root ignores file permissions)` and report it in the smoke's final JSON (`readonlyWal: 'pass' \| 'skipped-root' \| 'skipped-win32'`), so the skip is visible. Keep the growth to a few lines. |
| `README.md` "Release (Tag-Based)" | State the finalization target: the release commit (version bump in `package.json`/lockfile and CHANGELOG section) lands on `main`, and the tag points to that commit on `main`. List the pre-tag checks, in order: fresh `npm ci`; `npm run typecheck`; `npm test`; `npm run build`; `npm run test:package` (as a non-root user, or note the root skip); `npm pack --dry-run` file list; CI green on `main` for the release commit. Then tag and push (existing commands). After publish: check the Release workflow and `npm view repository_prisma dist-tags version` (allow about a minute of registry lag). Never move a pushed tag or unpublish (fix forward). Keep it short. |
| `DESIGN.md` | New top-level section "Design Cases" (before the FAQ). One paragraph says what an entry records (problem, how it was found, wrong assumption, fix, lesson) and that new cases are appended. Then **DC-001: Single SQLite connection and transaction isolation (Prisma 7 upgrade, CR-001)**. The first design assumed the better-sqlite3 adapter's single connection affected only throughput. Code review reproduced concurrent requests joining another request's open transaction. Fix: the connection gate (`src/lib/client/sqlite-connection-gate.ts`). Lesson: trace each entry form of a mechanism (concurrent as well as sequential requests) through the real dependency before declaring a risk outside the contract. |
| `CHANGELOG.md` | New `## Unreleased` at the top. It says: the unused `uuid` runtime dependency is removed (consumers no longer install it; no API change); dev tooling advisories are fixed (vitest 4.1.x and its vite/rollup chain); CI and release run on Node 24. No version bump. |
| `package.json` | Remove `dependencies` (only `uuid`) and `@types/uuid`. Other ranges unchanged. |
| `package-lock.json` | Regenerate with npm 11 (`npx npm@11 uninstall uuid @types/uuid` then `npx npm@11 audit fix`). npm 10.9.8 crashes (Reproduced). Verify `npm ci` with the repo's usual npm 10 afterwards. |
| `tsup.config.ts` | `external: ['@prisma/client', '@prisma/adapter-better-sqlite3']` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep `uuid` "in case consumers rely on it" | Rejected: undeclared transitive reliance is not a contract; nothing in the package uses it |
| Keep the `npm@11.5.1` pin | Rejected: it would downgrade |

## Change Sequence

1. Dependencies: `npx npm@11 uninstall uuid @types/uuid`; `npx npm@11 audit fix`; tsup external. Then `rm -rf node_modules && npm ci` (npm 10), `npm audit`, typecheck, test, build, test:package.
2. Smoke root guard; run `test:package` as non-root and as root (e.g. a Linux container, as the upgrade's API-04 evidence did).
3. Workflows.
4. README, DESIGN.md, CHANGELOG.
5. After merge: CI on `main` must be green on Node 24 (AC-001).

## Key Tradeoffs And Risks

- The release workflow can't be exercised until the next release. Mitigation: same commands measured on Node 24 locally; `npm@^11.5.1` resolves to 11.21.1; failure mode is a failed publish with nothing published.
- npm 11's install-script approval warning appears in CI logs on Node 24 (Prisma preinstall skipped). It is harmless here because `prepare` generates the client (Measured).
- vite moves 7 -> 8 transitively through vitest's own range (not a direct dependency). Measured green.

## Guidance For Implementation

- Reproduction to start from: `npm audit` on the current lockfile (9 advisories); `test:package` as root fails at `cjs-smoke.cjs:49` (upgrade evidence `tickets/done/prisma-7-upgrade/evidence/API-04-ci-node20-root.log`).
- Record logs in the ticket's `evidence/`.

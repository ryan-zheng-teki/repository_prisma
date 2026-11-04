# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct implementation (`task_size = Small`, `architectural_risk = Low`); no architecture review selected.
- Requirements doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/requirements-doc.md` (approved, SR-001)
- Investigation notes: `.../repository-prisma-2-loose-ends/investigation-notes.md`
- Solution revision record: `.../repository-prisma-2-loose-ends/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: none
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: `N/A` (initial implementation)
- Workspace: worktree `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends`, branch `codex/repository-prisma-2-loose-ends`. Implementation commit `e213742` (on `5afd18d`; base `origin/main@aa933e0`). This handoff and `evidence/` are in the next ticket commit. Finalization target: `origin/main`; no release, tag or version bump.

## Current Implementation Summary

- CI and the release workflow run on Node 24 with `actions/checkout@v5` and `actions/setup-node@v5`. The release workflow's npm step is `npm i -g npm@^11.5.1` (it resolves to 11.21.1), so it no longer downgrades Node 24's bundled npm 11.19.1.
- `test:package` passes as root. The read-only WAL case is skipped with a printed reason, and the smoke JSON reports `readonlyWal` (`pass` / `skipped-root` / `skipped-win32`). On a non-root run, the parent asserts the case actually ran.
- The README release guide finalizes on `main` and lists the pre-tag checks and the post-publish check.
- DESIGN.md has a "Design Cases" section with DC-001.
- `uuid`, `@types/uuid` and the tsup `uuid` external are removed. The lockfile was regenerated with npm 11 (`uninstall` then `audit fix`), and `npm audit` now reports 0 vulnerabilities.
- CHANGELOG has a `## Unreleased` entry. The version stays 2.0.0.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 9 files, as the design listed; no `src/` change, no API, persistence or ownership change. The dependency update stays within the existing semver ranges, and no direct dependency changed major version (vite 7 -> 8 is transitive through vitest's own range). Node 24 + npm 11 passes install, typecheck, tests and `test:package` (IMP-06). None of the escalation triggers fired. CI on Node 24 on GitHub remains to be observed after merge (AC-001).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

## Lightweight Implementation Self-Review

- Scope: only the 9 files in the design's Change Scope changed (`git diff 5afd18d..e213742 --stat`). There is no `src/`, `prisma/` or test-suite change, `version` is 2.0.0, and peers and engines are unchanged.
- Workflows: the ci and release jobs differ only in the action versions, the Node version, and the npm step's spec and name. `cache: npm`, `registry-url`, the permissions and the publish command are unchanged.
- Smoke: the skip decision is made once in the parent script, which runs as the same user as the generated child, and is written into the child's guard as a literal. The case body is unchanged. When the case runs, the child prints `readonly-wal-ok`, and the parent asserts that marker is present exactly when `readonlyWal === 'pass'`. A non-root run therefore cannot silently skip it. As before, the case is skipped on win32, now reported as `skipped-win32`.
- Dependencies: `npm ls uuid` is empty; `dist` contains 0 `uuid` references; `package.json` has no `dependencies` field. The packed manifest is therefore free of `uuid` (IMP-05).
- Docs: the README checks match the 2.0.0 practice and the design's list. The DC-001 "section E above" reference points to DESIGN §E, which describes the gate (`DESIGN.md:121`). The CHANGELOG states the consumer-visible change.
- Size: `scripts/run-package-smoke.js` grows from 729 to 739 lines (+10). It is a test harness, already over 500 lines before this change (FU-001, recorded by the Solution Designer). The 10 lines are the guard, the printed reason, the marker, the assertion and the JSON field. That is a bit more than "a few lines", because of the marker assertion that protects non-root runs.
- One npm-generated side effect: `npm@11 uninstall` re-sorted `ts-node`/`tsup` in `devDependencies` into npm's canonical order. The versions are unchanged.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Node 24, actions v5, npm `^11.5.1` without downgrade | `.github/workflows/ci.yml`, `.github/workflows/release.yml` | Node 24.22.2 + npm 11.19.1 passes `npm ci`, typecheck, 113 tests and `test:package` in a container (IMP-06). `npm view 'npm@^11.5.1' version` gives `11.21.1`. CI on GitHub runs after merge (AC-001). The release workflow is first exercised at the next release. |
| BEH-002 | Root run skips the read-only WAL case with a reason; non-root still asserts it | `scripts/run-package-smoke.js` (parent decision, child guard, marker, JSON `readonlyWal`) | Root: `skip: read-only WAL case (running as root; root ignores file permissions)` and `"readonlyWal":"skipped-root"`, both checks pass (IMP-06). Non-root Linux and macOS: `"readonlyWal":"pass"` (IMP-06, IMP-04). The base fails as root (IMP-07). |
| BEH-003 | Release guide | `README.md` "Release (Tag-Based)" | Finalization on `main`; 7 ordered pre-tag checks; post-publish check; "never move a tag or unpublish". |
| BEH-004 | Design cases | `DESIGN.md` "Design Cases" (before the FAQ) | What a case records, append-only numbering, DC-001 (problem, how found, wrong assumption, fix, lesson). |
| BEH-005 | uuid removed; 0 advisories; CHANGELOG | `package.json`, `package-lock.json`, `tsup.config.ts`, `CHANGELOG.md` | `npm audit`: `found 0 vulnerabilities` (IMP-01; it was 9 in IMP-00). Lockfile: vitest 4.1.12, vite 8.3.5, rollup 4.67.5, postcss 8.5.32, nanoid 3.3.20, picomatch 4.0.7, source-map-js 1.2.2; `uuid` absent. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

`.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/run-package-smoke.js`, `README.md`, `DESIGN.md`, `CHANGELOG.md`, `package.json`, `package-lock.json`, `tsup.config.ts`.

## Important Assumptions

- `actions/checkout@v5` and `actions/setup-node@v5` behave like v4 for these steps (design DEC-002; their `action.yml` declares `using: node24`). Only a GitHub run proves it.

## Known Risks

- The release workflow (Node 24, `npm i -g npm@^11.5.1`, publish) runs only at the next release. If it fails, it fails before or at publish, with nothing partially published (design Key Tradeoffs).
- On Node 24, `npm ci` (npm 11) warns that the install scripts of `prisma` (preinstall), `esbuild` and `fsevents` are not approved. `prepare` still generates the client (IMP-06), so this is harmless here, but CI logs will show the warning.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Cleanup`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: —

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (`uuid` dependency, `@types/uuid`, tsup external, the npm pin)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (no shared structure involved)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. No source implementation file changed. The test harness `scripts/run-package-smoke.js` (pre-existing 729 lines, FU-001) grew by 10; see the self-review above.
- Notes: —

## Persisted Data Transition Check (When Applicable)

`Not Affected` (no stored data).

## Environment Or Dependency Notes

- The lockfile was produced with npm 11.21.1 via `npx npm@11`. npm 10.9.8 crashes in arborist on this tree (investigation notes). The new lockfile installs with npm 10.9.8 (IMP-01) and npm 11.19.1 (IMP-06).
- `prisma generate` prints an "Update available 7.10.1 -> 8.0.0-rc.30" notice. Informational; 8.x is out of scope.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | `npm audit` on the base lockfile (reproduction) | `5afd18d` (base tree) | macOS 26.5.2, Node 22.23.1, npm 10.9.8 | base lockfile | AC-005 | Reproduced (9 advisories) | `evidence/IMP-00-npm-audit-before.log` | `9 vulnerabilities (2 moderate, 6 high, 1 critical)` |
| IMP-01 | `rm -rf node_modules && npm ci` (no `DATABASE_URL`); `npm audit`; `npm ls uuid @types/uuid`; lockfile versions | `e213742` | macOS, Node 22.23.1, npm 10.9.8, uid 501 | `package.json`, `package-lock.json` | AC-005, REQ-006 | Pass | `evidence/IMP-01-npm-ci-audit.log` | `npm-ci exit=0`; `found 0 vulnerabilities`; `` `-- (empty) ``; `uuid absent`; `root dependencies: null` |
| IMP-02 | `npm run typecheck` | `e213742` | same | `src/**`, `examples/**` | AC-005 | Pass | `evidence/IMP-02-typecheck.log` | `exit=0` |
| IMP-03 | `npm test` | `e213742` | same | all 11 suites on the new tooling (vitest 4.1.12) | AC-005 | Pass | `evidence/IMP-03-npm-test.log` | `Tests  113 passed (113)` |
| IMP-04 | `npm run test:package` as non-root; `grep -c uuid dist/index.js dist/index.mjs` | `e213742` | macOS, uid 501 | build without the `uuid` external, smoke, interop | AC-003 (non-root), AC-005 | Pass | `evidence/IMP-04-test-package-nonroot.log` | `"readonlyWal":"pass"`; both `"result":"pass"`; `dist/index.js:0`, `dist/index.mjs:0` |
| IMP-05 | `npm pack --dry-run --json`; manifest `dependencies`, `version` | `e213742` | same | published manifest and file list | AC-005, AC-006 | Pass | `evidence/IMP-05-pack-manifest.log` | `package.json dependencies: null`; `version: 2.0.0`; 10 files |
| IMP-06 | `git archive e213742` into `docker run node:24`: as root `npm ci`, typecheck, `npm test`, `test:package`; then as user `node` (uid 1000) `test:package` | `e213742` | Docker linux/aarch64, Node 24.22.2, npm 11.19.1 | Node 24 toolchain; root guard | AC-003, AC-001 (local proxy), REQ-001 | Pass | `evidence/IMP-06-test-package-root-linux.log` | root: `skip: read-only WAL case (running as root; root ignores file permissions)`, `"readonlyWal":"skipped-root"`, `Tests  113 passed (113)`; uid 1000: `"readonlyWal":"pass"`; every `exit=0` |
| IMP-07 | Same container, base `aa933e0`, as root: `npm ci`; `test:package` (reproduction) | `aa933e0` | same | base smoke | AC-003 | Reproduced (fails) | `evidence/IMP-07-root-failure-before.log` | `test-package exit=1`; `Error: Command failed (/usr/local/bin/node cjs-smoke.cjs)`; `actual: false` |
| IMP-08 | `git diff --check 5afd18d..e213742` | `e213742` | git | all changed files | — | Pass | `evidence/IMP-08-diff-check.log` | `exit=0` |

- Not run, and why:
  - CI on GitHub (AC-001): it runs on push or PR; after merge, it must be green on `main`.
  - The release workflow: there is no release in this Task.
  - x86_64 Linux (the container was aarch64; GitHub's `ubuntu-latest` is x86_64).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: tooling, docs and dependency changes only.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: the CI run for this branch or PR, and then on `main`, shows Node v24.x and no "Node.js 20 is deprecated" warning.
- AC-002: review `release.yml`; `npm view 'npm@^11.5.1' version` gives 11.21.1 or newer.
- AC-003: the root and non-root runs are in IMP-06. Another root run on x86_64 would close the architecture gap.
- AC-005: `npm pack` and an install of the tarball in an empty consumer should not pull in `uuid`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E validates AC-001..AC-006 independently, including the GitHub CI run on Node 24 (AC-001).

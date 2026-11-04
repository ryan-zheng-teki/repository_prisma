# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `.../repository-prisma-2-loose-ends/investigation-notes.md`
- Solution Revision Record: `.../repository-prisma-2-loose-ends/solution-revision-record.md`
- Design Spec (required on every route): `.../repository-prisma-2-loose-ends/design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: none
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../repository-prisma-2-loose-ends/implementation-handoff.md` (IR-001, includes the lightweight self-review)
- Implementation Revision Record: `.../repository-prisma-2-loose-ends/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation engineer handoff IR-001 (code `e213742`, handoff/evidence `4ad013e`), direct route Small/Low
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

Five loose ends, no `src/` change:
- CI and release move to Node 24 with checkout/setup-node v5. The release npm step becomes `npm i -g npm@^11.5.1`.
- The package smoke skips the read-only WAL case as root with a printed reason and reports a `readonlyWal` JSON field. Non-root runs must still execute and assert the case.
- The README release guide gets the `main` target, 7 pre-tag checks and a post-publish check.
- DESIGN.md gets a Design Cases section with DC-001.
- `uuid`, `@types/uuid` and the tsup external are removed, the lockfile is audit-fixed to 0 advisories, and CHANGELOG gets an `## Unreleased` entry. The version stays 2.0.0.

To prove: AC-001..AC-006.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (CI/release on GitHub), SCN-002 (`test:package` as root, e.g. a Docker build), SCN-003 (release by README), SCN-004 (design cases), SCN-005 (clean install).
- Real-use scenarios added:
  - RUS-01: the GitHub `ubuntu-latest` runner is x86_64, non-root, with `CI=true`. The CI job steps run there in order from a clean checkout (closes the IR's aarch64-only gap).
  - RUS-02: a consumer installs the published package (`npm install repository_prisma`) with default peer handling. Removing `uuid` must not break install or use (SCN-005 consumer side).
  - RUS-03: a Docker image build runs `npm run test:package` as root on x86_64 (SCN-002 on the CI architecture).
  - RUS-04: the release job's steps on Node 24: the npm self-upgrade, `npm ci`, `npm run build`, and the publish packaging (dry run, never a real publish).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 workflows Node 24, actions v5, npm `^11.5.1` | Changed | REQ-001/002, DEC-001..003 | Static validation (actionlint, action runtime), x86_64 Node 24 emulation of CI and release steps; GitHub run on `main` post-merge |
| BEH-002 root-tolerant smoke | Changed | REQ-003, DEC-004 | Root and non-root runs on x86_64 and aarch64; check the non-root guard cannot be silently skipped |
| BEH-003 release guide | Changed | REQ-004 | Docs review against the 2.0.0 practice; the guide's commands run (steps 1-6) |
| BEH-004 design cases | Added | REQ-005 | Docs review |
| BEH-005 uuid removal + audit | Removed/Changed | REQ-006/007 | Fresh `npm ci` + audit; packed manifest; consumer install without uuid |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | 113 tests (no `src/` change) | — | — |
| API / transport / contract | Yes | published manifest (`dependencies`) | IMP-05 dry-run manifest | real consumer install from the tarball | CLI consumer |
| Frontend / browser / auth / desktop | No | — | — | — | — |
| Process / lifecycle | Yes | CI/release toolchain (Node 24, npm 11), smoke script | IMP-06 (aarch64 container) | x86_64; release steps; workflow syntax | Docker amd64 emulation; actionlint |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | GitHub Actions runtime (actions v5), npm registry (npm self-upgrade, audit) | IMP-06; `npm view` | GitHub-hosted run | GitHub CI on `main` after merge (delivery) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends`, branch `codex/repository-prisma-2-loose-ends` (not pushed; no PR)
- Project type and runtime stack: TypeScript library; Prisma 7.10.1; vitest; tsup; npm; GitHub Actions
- Project testing guideline path(s): No project testing guideline found (no `TESTING*.md`). Choices derived from `AGENTS.md`, `README.md` (§ Testing, § Release), `package.json` scripts and the workflows.
- Conflicting, missing, or unclear project instructions: none
- Required environment variables or secrets available: `N/A` (no publish credentials needed; the publish is a dry run only)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `.github/workflows/ci.yml` | CI | ubuntu-latest, Node 24, `npm ci`, `npm run typecheck`, `npm test`, `npm run build` |
| `.github/workflows/release.yml` | release on `v*.*.*` tags | Node 24, registry-url, npm `^11.5.1`, `npm ci`, `npm run build`, `npm publish --provenance --access public` |
| `README.md` § Release (Tag-Based) | release guide (under test as docs) | 7 pre-tag checks, post-publish check |
| `AGENTS.md` | repo rules | releases are tag-based; README is the usage/release guide |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| x86_64 Node 24 container | `$HOME/work` from `git archive HEAD` | `docker run --rm --platform linux/amd64 node:24-bookworm` | emulated; non-root `node` and root runs | exit codes | `--rm` |
| aarch64 Node 24 container | same | `docker run --rm --platform linux/arm64 node:24-bookworm` | native | exit codes | `--rm` |
| actionlint | read-only mount of `.github/workflows` | `docker run --rm rhysd/actionlint` | static check | exit 0 | `--rm` |
| Consumer project | `/tmp/rp2-e2e/consumer` | `npm install <tgz>`, README setup | registry | `npm ls` | `rm -rf /tmp/rp2-e2e` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| SQLite test DBs | repo scripts create them in the container | inside containers only | removed with the container |
| Publish | `npm publish --dry-run` only | no token; nothing is published | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/run-package-smoke.js` (read-only WAL case + new `readonlyWal`/marker assertions) | packaged CJS: read-only WAL -> `WAL_ACTIVATION_FAILED`; root -> skipped with reason | AC-003 | Still Valid (updated by the implementation) | IMP-04, IMP-06 | Exercise root/non-root on x86_64; check the marker guard fails if a non-root child skips |
| `src/tests/*.test.ts` (11 suites, 113 tests) | library behavior | AC-005 (toolchain passes) | Still Valid | IMP-03 | none |
| `src/tests/client-lifecycle.test.ts` WAL activation mapping | covers the error mapping the smoke skips as root | AC-003 rationale (DEC-004) | Still Valid | design DEC-004 | none |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-003, AC-005, AC-006 | repo checks on macOS/aarch64 | Reused | IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-08 | Ran on `e213742`; `git diff --name-only e213742 4ad013e` outside `tickets/` is empty |
| API-02 | AC-001 (local proof), AC-005, REQ-001 | ci.yml job steps on x86_64 Node 24, non-root, `CI=true`, clean checkout | Journey (CLI) | `git archive HEAD` -> `docker run --platform linux/amd64 --user node node:24-bookworm`: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, plus `npm audit`, `npm ls uuid`, `npm run test:package` | `ubuntu-latest` is x86_64; the IR ran aarch64 only |
| API-03 | AC-003 | `test:package` as root on x86_64 | Journey (CLI) | same container as root: `npm ci`, `npm run test:package` | RUS-03 on the CI architecture |
| API-04 | AC-003 | the non-root guard cannot silently skip | Temporary Probe | non-root run with the generated child's guard forced off (patch the template literal in a scratch copy) -> the parent must fail on the missing `readonly-wal-ok` marker | Shows the new assertion protects non-root runs; a mutation is not durable coverage |
| API-05 | AC-002, REQ-002, AC-001 (static) | release.yml/ci.yml syntax, actions runtime, npm spec | Temporary Probe | `actionlint` on both workflows; `gh api` `action.yml` of `actions/checkout@v5` and `actions/setup-node@v5` (`using`); `npm view 'npm@^11.5.1' version` | Static proof of the workflow contract |
| API-06 | AC-002, REQ-002 | release job steps on x86_64 Node 24 | Journey (CLI) | root container (global npm install as on the runner's tool cache): `npm --version`; `npm i -g npm@^11.5.1`; `npm --version`; `npm ci`; `npm run build`; `npm publish --dry-run --access public` | Exercises the release steps short of the real publish |
| API-07 | AC-005, REQ-006 | consumer install of the packed tarball | Journey (CLI) | `npm pack`; empty consumer: `npm install <tgz>`, `npm install -D prisma@7`, README setup, `npm ls uuid` (empty), `npm audit`, minimal init + query (ESM + CJS app scripts from the prisma-7-upgrade evidence) | Consumer-visible change of this ticket (RUS-02) |
| API-08 | AC-004, AC-006 | docs | Review | read README § Release, DESIGN § Design Cases, CHANGELOG `## Unreleased`; check `version` 2.0.0; cross-check the 7 steps by running them (covered in API-02/03/06) | AC-004/006 are review criteria |
| API-09 | AC-001 | GitHub CI run on `main` after merge | Not Tested pre-merge (handed to delivery) | GitHub run on the merge commit; look for `node: v24`/`Node.js 24` setup and the absence of the `Node.js 20 is deprecated` annotation; baseline: the latest `main` run on `aa933e0` | The trigger (push to `main`) happens only at delivery's merge. The branch is not pushed and there is no PR. Pushing is outside this role's mandate. |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None. The change is to toolchain and docs. The durable guard (the smoke's `readonlyWal` marker assertion) is part of the implementation and is exercised here.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: `git archive HEAD` -> containers (amd64 emulated, arm64); `npm pack` of the worktree -> consumer project.
- Environment choices that materially affect the run: `CI=true`; non-root `node` user for the CI job; root for the Docker-build and release-global-npm steps; `--platform linux/amd64`.
- Health / readiness checks: exit codes.
- Seed data / fixtures: none beyond what the scripts create.
- Test identities, authentication, permissions, or session state: no npm token; publish is `--dry-run`.
- Requirement-linked journeys or scenarios: RUS-01..04.
- Evidence to capture: logs with headers in `evidence/API-*`; scripts in `evidence/API-scripts/`.
- Owned processes and temporary state to clean up: `/tmp/rp2-e2e`, `--rm` containers.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-001 GitHub CI on `main` (API-09) | Needs the merge to `main` (delivery's finalization); the branch is not pushed | Low: same steps pass on x86_64 Node 24 locally; actions v5 declare `node24` | No | Delivery checks the run after merge |
| Real `npm publish --provenance` with OIDC | No release in this Task | Low: steps up to the dry-run publish pass | No | Next release's workflow run |
| Windows (`skipped-win32` branch) | No Windows host; unchanged behavior apart from the reported value | Low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: —

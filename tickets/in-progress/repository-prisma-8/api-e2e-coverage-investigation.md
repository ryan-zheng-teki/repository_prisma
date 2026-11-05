# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-8/tickets/in-progress/repository-prisma-8/requirements-doc.md` (Part A Approved, SR-001)
- Investigation Notes: `.../repository-prisma-8/investigation-notes.md`
- Solution Revision Record: `.../repository-prisma-8/solution-revision-record.md`
- Design Spec (required on every route): `.../repository-prisma-8/design-spec.md` (SR-001, Part A)
- Supplemental Task Artifacts: `probes/` (Part B Postgres probe; not in scope of this round)
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../repository-prisma-8/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../repository-prisma-8/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (code `e44ea62`, handoff `1b5171f`), direct route Small/Low, Part A only
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

Part A only. Part B awaits the user's DEC-B1.
- REQ-A1: `release.yml` and `ci.yml` move from `actions/setup-node@v5` to `@v6` with unchanged inputs. The release job then no longer writes `always-auth`, and npm stops warning `Unknown user config "always-auth"`, with the same token setup for trusted publishing.
- REQ-A2: `TESTING.md` § Environments documents pnpm's registry-metadata cache for testing a just-published version.

The IR recorded one deviation: `npm_config_cache_dir` is ignored by pnpm 11/12, so the text names `pnpm_config_cache_dir` and `--cache-dir`.

Acceptance criteria:
- AC-A1: replica of the release npm steps with no warning;
- AC-A2: CI green with v6;
- AC-A3: TESTING.md accurate;
- AC-A4: the OIDC provenance publish under v6 is unproven until the next release, and the reports must say so.

## Supported Scenarios And Real Usage

- Scenarios:
  - the release workflow on a tag (maintainer);
  - CI on push/PR;
  - a maintainer or agent testing a just-published version with pnpm, following TESTING.md.
- Real-use scenarios added:
  - RUS-01: the release job's `.npmrc` is written by setup-node's own code, not by hand. This run executes the real v6 and v5 action code (`dist/setup/index.js`, at the exact tag commits) to write it. It then runs the job's npm steps against that file, as on the runner, where `NPM_CONFIG_USERCONFIG` points to `$RUNNER_TEMP/.npmrc`. The IR wrote the file by hand from the source excerpt.
  - RUS-02: `@v6` is a moving major tag (currently v6.5.0). Any v6 behavior beyond always-auth that could affect these jobs must be ruled out: automatic caching, inputs, runtime.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Release job `.npmrc` / npm warnings | Changed | REQ-A1, DEC-A1 | Real v6 vs v5 action code writes the `.npmrc`; release npm steps through a dry-run publish |
| CI job | Changed (action major) | AC-A2 | Static checks; reuse IMP-03; GitHub run post-merge |
| TESTING.md pnpm cache text | Added | REQ-A2 | Independent check of the cache settings and `pnpm cache view`; cross-check with release-2-1-0 evidence |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / API / frontend / auth / desktop / data | No | — | — | — | — |
| Process / lifecycle (CI and release workflows) | Yes | setup-node major | IMP-02 (hand-written `.npmrc`), IMP-03 | the `.npmrc` setup-node actually writes; moving `@v6` | Run the real action code in a container |
| External integration | Yes | GitHub Actions, npm registry | — | OIDC provenance publish (AC-A4) | Next release only |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-8`, branch `codex/repository-prisma-8` (not pushed)
- Project type and runtime stack: TypeScript library; npm; GitHub Actions
- Project testing guideline path(s), or `None found` and the `TESTING.md` you create: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-8/TESTING.md` (named in `AGENTS.md`). Its rules applied:
  - toolchain/CI changes run in `node:24-bookworm --platform linux/amd64 -e CI=true --user node`;
  - `release.yml` is checked only up to `npm publish --dry-run`, never a publish;
  - an already published version is bumped only in a throwaway copy.
- Conflicting, missing, or unclear project instructions: none
- Required environment variables or secrets available: `N/A` (dummy token only)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing guideline | as above |
| `.github/workflows/release.yml` | release job | setup-node `node-version: 24`, `registry-url`; `npm i -g npm@^11.5.1`; `npm ci`; `npm run build`; `npm publish --provenance --access public` |
| `.github/workflows/ci.yml` | CI | setup-node `node-version: 24`, `cache: npm`; strict install, typecheck, test, build |
| `actions/setup-node` `action.yml`, `src/authutil.ts`, release notes (v5, v6) | upstream behavior | v6 = v6.5.0 (`249970729cb0`); v5 = `a0853c24544627f65ddf259abe73b1d18a591444`; v6.1.0 removed always-auth; v6.0.0 limited automatic caching to npm (applies only with `packageManager`/`devEngines.packageManager`, which `package.json` does not have) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| setup-node source at v5/v6 tag commits | `/tmp/rp8e/actions/setup-node-v{5,6}` (own dirs) | `git clone --depth 1 --branch v5/v6` | executed only inside the container | `dist/setup/index.js` exists | `rm -rf` |
| Release job replica | `node:24-bookworm` amd64, `CI=true`, user `node`; repo from `git archive HEAD` | the action with `INPUT_REGISTRY-URL`, `RUNNER_TEMP`, `GITHUB_ENV`; then the npm steps with `NPM_CONFIG_USERCONFIG` and a dummy `NODE_AUTH_TOKEN` | no network publish; dry run with a container-only version | exit codes | `--rm` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| npm token | dummy `XXXXX-XXXXX-XXXXX-XXXXX` | never valid; dry run only | — |
| pnpm cache dirs | temp dirs | isolated from the user's pnpm store/cache | removed |

## Existing Durable Coverage Inventory

None relevant: workflows and docs have no repository tests. The test suite is unaffected (no `src/` change; IMP-03 ran 167 tests on `e44ea62`).

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-A1, AC-A2 (local), AC-A3 | IR checks | Reused | IMP-01, IMP-02, IMP-03 | Ran on `e44ea62`/`4167580`; `git diff --name-only e44ea62 HEAD` outside `tickets/` is empty |
| API-02 | AC-A1, AC-A2 | workflow files and the v6 action contract | Temporary Probe | `actionlint` on both workflows; diff vs base (only the action version); v6 inputs used still exist; runtime `node24`; automatic-caching precondition absent | Static proof |
| API-03 | AC-A1 | `.npmrc` written by the real setup-node code, then the release npm steps | Journey (CLI) | container: run `setup-node-v6/dist/setup/index.js` (no `node-version`, `registry-url` set) -> print the written `.npmrc`; `npm i -g npm@^11.5.1` (user prefix); `npm ci`; `npm run build`; `npm version 2.1.1 --no-git-tag-version`; `npm publish --dry-run --provenance=false --access public`, with `NPM_CONFIG_USERCONFIG` from `GITHUB_ENV` and a dummy `NODE_AUTH_TOKEN`; count `always-auth` warnings; same with v5 as control | Real action code instead of a hand-written file |
| API-04 | AC-A3 | TESTING.md pnpm cache guidance | Temporary Probe | pnpm 11.28.9 and 12.16.1: install a package with `npm_config_cache_dir`, `pnpm_config_cache_dir`, `--cache-dir` set to empty temp dirs; count metadata files there; `pnpm cache view repository_prisma` lists versions; cross-check the "stale cache hides a new version" premise with release-2-1-0's REL-05/06 evidence | Independent of IMP-01 |
| API-05 | AC-A3, CHANGELOG | docs review | Review | TESTING.md bullet in context; CHANGELOG `## Unreleased`; version unchanged | review |
| API-06 | AC-A2 | GitHub CI with v6 | Not Tested pre-merge (delivery) | the merge commit's CI run: `Run actions/setup-node@v6`, green | Trigger after merge |
| API-07 | AC-A4 | OIDC provenance publish under v6 | Not Tested (by requirement) | next real release | Recorded for delivery |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None (workflow/docs change; no repository test layer covers workflows).

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-A2 GitHub run | needs merge | Low (v6 inputs and runtime checked; CI steps green locally, IMP-03) | No | delivery post-merge |
| AC-A4 OIDC `--provenance` publish under v6 | only a real release exercises OIDC (requirement) | Low-moderate: the token lines are identical between v5 and v6 (API-03), but the OIDC exchange is not run | No | next release; delivery report |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: —

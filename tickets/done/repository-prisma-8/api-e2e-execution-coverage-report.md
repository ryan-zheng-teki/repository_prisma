# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-8/tickets/in-progress/repository-prisma-8/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (code `e44ea62`), direct route, Part A only
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-03 was run three times; the log keeps the final run, and the first two had harness faults only.
    - Run 1: bash's command cache kept using the bundled npm after `npm i -g npm@^11.5.1`, so the later steps did not use the upgraded npm as the job does. Fixed with `hash -r`.
    - Run 2: the v5 control's first two steps found no `npm` after my reset between variants. Fixed with `hash -r` after the reset.
  - API-04b (`pnpm cache view`) was added after API-04 showed that pnpm 11 rejects `--cache-dir` on `pnpm cache view`.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-8/tickets/in-progress/repository-prisma-8/evidence/` (`API-*.log`; scripts in `API-scripts/`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `git archive HEAD` (code `e44ea62`); `actions/setup-node` v6 = `249970729cb0ef3589644e2896645e5dc5ba9c38` (v6.5.0), v5 = `a0853c24544627f65ddf259abe73b1d18a591444` | Docker `node:24-bookworm` `--platform linux/amd64`, user `node`, `CI=true` | Node 24.22.2, bundled npm 11.19.1, upgraded npm 11.21.2 | runner emulation: `RUNNER_TEMP`, `GITHUB_ENV`, `INPUT_*` for the release job's inputs; dummy `NODE_AUTH_TOKEN` |
| ENV-2 | worktree at `e44ea62` | macOS 26.5.2 arm64 | Node 22.23.1; pnpm 11.28.11 (temp prefix), pnpm 12.16.1 | temp cache dirs; the user's default pnpm cache read (and refreshed by normal use) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-A1, AC-A2 (local), AC-A3 | IR checks | Reused: IMP-01, IMP-02, IMP-03 | (implementation handoff) | Pass | (implementation handoff Checks Run) | (implementation handoff) | `git diff --name-only e44ea62 HEAD` outside `tickets/` is empty. IMP-03: `ci.yml` steps non-root x86_64, `Tests  167 passed (167)`. |
| API-02 | AC-A1, AC-A2 | workflow files; v6 contract | `api02-static.sh`: diff vs `4a2f312`; actionlint; v5/v6 `action.yml` inputs and runtime; `diff` of `src/authutil.ts`; `package.json` caching precondition | ENV-2 | Pass | `evidence/API-02-static.log` | diff: only `actions/setup-node@v5` -> `@v6` in both files; `Found 0 errors in 2 files`; v6 has `node-version`, `registry-url`, `cache` (no `always-auth`), `using: 'node24'`; authutil diff: only the `alwaysAuth` parameter and the `always-auth=${alwaysAuth}` line removed; `{"packageManager":null,"devEngines":null}` | v6's breaking change (automatic caching limited to npm) needs `packageManager`/`devEngines.packageManager`, which the repo does not have, so the release job stays uncached as before. |
| API-03 | AC-A1, REQ-A1 | the release job: `.npmrc` written by setup-node's own code, then the npm steps | `api03-release.sh`: `node /actions/setup-node-v6/dist/setup/index.js` with the release job's inputs (registry-url), export `GITHUB_ENV`; `npm --version`; `npm i -g npm@^11.5.1`; `npm --version`; `npm ci`; `npm run build`; `npm version 2.1.1 --no-git-tag-version`; `npm publish --dry-run --provenance=false --access public`; the same with v5 | ENV-1 | Pass | `evidence/API-03-real-setup-node-release.log` | v6 `.npmrc`: `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}` and `registry=https://registry.npmjs.org/` only; `NPM_CONFIG_USERCONFIG=/home/node/runner-temp-v6/.npmrc`; `npm now: 11.21.2`; every step `always-auth warnings: 0`; `Publishing to https://registry.npmjs.org/ with tag latest and public access (dry-run)`. v5 control: the same two lines plus `always-auth=false`; warnings `0, 1, 0, 1, 1, 1, 2` with `npm warn Unknown user config "always-auth"` | The token and registry lines are byte-identical between v5 and v6, so the authentication setup for trusted publishing is unchanged apart from the removed line. Stronger than IMP-02, which wrote the `.npmrc` by hand. |
| API-04 | AC-A3 | which settings move pnpm's metadata cache | `api04-pnpm-cache.sh` for pnpm 11.28.11 and 12.16.1: per setting, an empty temp dir, `pnpm config get cache-dir`, `pnpm add is-number@7`, count files | ENV-2 | Pass | `evidence/API-04-pnpm-cache-settings.log` | both versions: `npm_config_cache_dir=<tmp>: pnpm config get cache-dir -> undefined; ... files written to <tmp>: 0`; `pnpm_config_cache_dir=<tmp>: ... -> <tmp>; ... 2`; `--cache-dir=<tmp>: ... 2`. pnpm 11: `pnpm cache view ... --cache-dir` -> `Unknown option: 'cache-dir'` | Confirms IR-001's recorded deviation from REQ-A2's example. The TESTING.md text names only the working settings. |
| API-04b | AC-A3 | `pnpm cache view <pkg>`; the stale-cache premise | `api04b-cache-view.sh`: `pnpm cache view repository_prisma` with the default cache and with `pnpm_config_cache_dir=<tmp>` | ENV-2 | Pass | `evidence/API-04b-pnpm-cache-view.log` | default cache (both versions): `"cachedVersions": ["1.0.10", "2.0.0"]`, `"latest": "2.0.0"`, `cachedAt` 06:15Z (before 2.1.0's publish at 06:28:56Z); empty cache: `"cachedVersions": [..., "2.1.0"]`, `"latest": "2.1.0"` | Shows live what the bullet warns about, matching release-2-1-0's REL-05 (stale cache + exclusion -> 2.0.0), REL-06a (empty cache, no exclusion -> 2.0.0) and REL-06b (both -> 2.1.0) in `tickets/done/release-2-1-0/evidence/`. |
| API-05 | AC-A3, CHANGELOG | docs review | read TESTING.md § Environments, CHANGELOG; version; tags | ENV-2 | Pass | `evidence/API-05-docs.log` | the bullet as quoted; `## Unreleased` line; `version: 2.1.0`; tags `0` | The text is accurate on every point tested. `pnpm cache view` is offered for the normal cache, where it works on both versions; it is not combined with `--cache-dir`, which pnpm 11 rejects. |
| API-06 | AC-A2 | GitHub CI with v6 | — | — | Not Tested (post-merge; delivery) | — | Delivery: merge-commit CI run shows `Run actions/setup-node@v6` and is green | Branch not pushed; no PR. |
| API-07 | AC-A4 | OIDC `npm publish --provenance` under v6 | — | — | Not Tested (by requirement: next real release) | — | Delivery report must state it | API-03 shows the `.npmrc` token lines are unchanged from v5, which published 2.1.0 with provenance. |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-A1 | Yes | API-02, API-03, API-01 (IMP-02) | Proven | — |
| AC-A2 | Yes | API-02 (same major in both files; actionlint), API-01 (IMP-03 CI steps); GitHub run post-merge (API-06) | Proven up to the merge. The GitHub run on `main` is a post-merge check for delivery. | — |
| AC-A3 | No | API-04, API-04b, API-05, API-01 (IMP-01) | Proven | — |
| AC-A4 | Yes (reporting) | API-07; this report and the handoff state it | Recorded as required: the OIDC provenance publish under v6 is unproven until the next real release | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 95% | API-01..05 | GitHub run post-merge; AC-A4 by design | — |
| Changed-boundary execution directness | 85% | 97% | API-03 runs setup-node's own code at the tag commits | — | — |
| Cross-boundary integration realism and mock gap | 80% | 93% | runner emulation with the action's real I/O (`GITHUB_ENV`, `RUNNER_TEMP`) | the hosted runner and OIDC exchange are not executed | next release |
| Environment, configuration, identity, and fixture fidelity | 88% | 96% | Node 24.22.2 / npm 11.19.1 -> 11.21.2 as in the job; non-root amd64; pnpm 11.28.11 / 12.16.1 | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 96% | v5 control warns; ignored-setting control (0 files); pnpm 11 `cache view --cache-dir` limit found | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI surface | — | — |
| Durable regression coverage quality and relevance | 94% | 94% | `ci.yml` itself runs on every push; the test suite is unaffected (IMP-03) | `release.yml` is exercised only at a release | — |

- Overall post-repository confidence: 88%
- Overall final confidence: 95%
- Calculation method: simple average of the six applicable categories (95+97+93+96+96+94)/6 = 95.2%
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` for everything provable before the merge and before a release. AC-A2's GitHub run is a post-merge check for delivery; AC-A4 is recorded as required.
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the GitHub CI run with v6 (post-merge); the OIDC `--provenance` publish under v6 (next release, AC-A4).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `CLI` + `Lifecycle` (runner emulation executing the real action code; pnpm CLI)
- Confidence gap or residual risk it addresses, and the expected gain: IMP-02 hand-wrote the `.npmrc`. Running setup-node's own v6/v5 code proves what the job actually gets. The independent pnpm runs confirm the TESTING.md text and found the `cache view --cache-dir` limit.
- Browser validation needed, and why or why not: No.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Project Documents

- `TESTING.md` (present) was followed. The ticket's own `TESTING.md` change is validated in API-04/04b/05. No further change from this round.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub Actions runner | the action's `dist/setup/index.js` run with `INPUT_*`, `RUNNER_TEMP`, `GITHUB_ENV` in a container; the cache service is unreachable (`Caching will be skipped`, not used by the release job) | needs a push/tag | hosted runner not executed |
| npm token / OIDC | dummy `NODE_AUTH_TOKEN`; `--provenance=false`; `--dry-run` | no release in this Task | OIDC exchange unproven (AC-A4) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/rp8e` (setup-node clones, pnpm 11 prefix, temp caches/projects, logs) | Yes | `rm -rf` after copying evidence | Done |
| Containers | Yes | `--rm` | Removed |
| The user's default pnpm metadata cache | No (shared) | not cleared. The runs that used it (API-04 `npm_config_cache_dir` mode, API-04b default view) only read or refreshed normal cache entries for `is-number` and `repository_prisma` | Left as is |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None user-only. AC-A2's GitHub run is a post-merge check for delivery (API-06). AC-A4 is unproven until the next release, as required, and must appear in the delivery report.
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: delivery engineer (direct low-risk route)
- Notes: —

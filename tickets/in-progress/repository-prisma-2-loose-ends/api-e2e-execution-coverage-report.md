# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (code `e213742`, handoff/evidence `4ad013e`), direct route
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-05: the first actionlint call found no git root in the container (`exit=3`). It was rerun with explicit file paths, plus a control. Both runs are in the log.
  - API-06: `npm publish --dry-run` of the unchanged 2.0.0 was refused by the registry (`You cannot publish over the previously published versions: 2.0.0.`). This ticket must not bump the version (AC-006), and a real release bumps it first (README step), so this is expected. The release steps were rerun with a container-only `2.0.1-e2e.0` version. Nothing was published.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/evidence/` (`API-*.log`, scripts in `API-scripts/`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `e213742` (worktree; `node_modules` from IMP-01) | macOS 26.5.2 arm64 | Node v22.23.1, npm 10.9.8 | uid 501 |
| ENV-2 | `git archive HEAD` (`4ad013e`; code = `e213742`) | Docker `node:24-bookworm` `--platform linux/amd64` (emulated x86_64) | Node v24.22.2, npm 11.19.1 | `CI=true`; non-root `node` (CI job) or root (Docker build, release global npm) |
| ENV-3 | packed tarball `repository_prisma-2.0.0.tgz` (sha256 `f53ff3aae77c95110512677eccccb2a7e16cc6db17e3a440b90fb3309441e450`) from `e213742` | macOS consumers in `/tmp/rp2-e2e/consumer-*` | Node v22.23.1, npm 10.9.8 | `legacy-peer-deps=false`; registry install of `prisma@7` and the peers (7.10.1) |
| ENV-4 | GitHub (read only) | GitHub Actions run 41855325943 on `main@aa933e0` | Node 20.20.2 x64, actions v4 | baseline only |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-003, AC-005, AC-006 | repo checks (macOS; aarch64 Node 24 container) | Reused: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-08 | (implementation handoff) | Pass | (implementation handoff Checks Run) | (implementation handoff) | All ran on `e213742`. `git diff --name-only e213742 4ad013e` outside `tickets/` is empty. |
| API-02 | AC-001 (pre-merge proof), AC-005, REQ-001, REQ-006 | `ci.yml` job steps on x86_64 Node 24, non-root, clean checkout | `docker run --platform linux/amd64 -e CI=true --user node node:24-bookworm sh node24-steps.sh ci`: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit`, `npm ls uuid @types/uuid`, `npm run test:package` | ENV-2 | Pass | `evidence/API-02-ci-node24-x86_64-nonroot.log` | `node=v24.22.2 npm=11.19.1 arch=x86_64 user=uid=1000(node)`; `exit=0 (npm ci)`; `✔ Generated Prisma Client (v7.10.1)`; `exit=0 (npm run typecheck)`; `Tests  113 passed (113)`; `exit=0 (npm run build)`; `found 0 vulnerabilities`; `` `-- (empty) ``; `"readonlyWal":"pass"`; `ALL-STEPS-FAILED=0` | npm 11 prints `install-scripts ... not yet covered by allowScripts` (4 packages). It is a warning only, and the scripts ran (real-SQLite tests pass): FU-002. |
| API-03 | AC-003, REQ-003 | `test:package` as root on x86_64 (Docker build) | same image as root: `npm ci`, `npm run test:package` | ENV-2 | Pass | `evidence/API-03-test-package-root-x86_64.log` | `user=uid=0(root)`; `skip: read-only WAL case (running as root; root ignores file permissions)`; `"readonlyWal":"skipped-root"` with `"result":"pass"`; interop `"result":"pass"`; `exit=0 (npm run test:package)` | Base `aa933e0` fails as root (IMP-07). |
| API-04 | AC-003 (non-root still asserts) | smoke's marker assertion | Temporary mutation: the child's guard `if (${readonlyWal === 'pass'})` -> `if (false)`; `node scripts/run-package-smoke.js`; restore; rerun | ENV-1 | Pass | `evidence/API-04-readonly-guard-mutation.log` | mutated: `AssertionError [ERR_ASSERTION]` at `run-package-smoke.js:600:10`, `mutated-exit=1`; `working tree restored`; restored: `"readonlyWal":"pass"`, `restored-exit=0` | A non-root run cannot silently skip the case. |
| API-05 | AC-002, AC-001 (static), REQ-001, REQ-002 | workflow syntax, action runtimes, npm range | `actionlint .github/workflows/ci.yml .github/workflows/release.yml` (docker `rhysd/actionlint`); control with a misspelled input; `gh api repos/actions/{checkout,setup-node}/contents/action.yml?ref={v4,v5}`; `npm view 'npm@^11.5.1' version` | local + GitHub API + registry | Pass | `evidence/API-05-workflow-static-checks.log` | `Found 0 errors in 2 files`, `exit=0`; control: `input "node-versionn" is not defined in action "actions/setup-node@v5"`, `exit=1`; v4 `using: node20`, v5 `using: node24` (both actions); `npm@11.21.1 '11.21.1'` | `setup-node@v5` has `package-manager-cache` auto-caching. It applies only with a `packageManager` field, and `package.json` has none (`grep -c packageManager` = 0), so the release job's caching is unchanged. |
| API-06 | AC-002, REQ-002 | `release.yml` steps on x86_64 Node 24 | as root (global npm, as the runner's tool cache is writable for its user): `npm --version`; `npm i -g npm@^11.5.1`; `npm --version`; `npm ci`; `npm run build`; `npm publish --dry-run --access public` (part 1); part 2 adds a container-only `npm version 2.0.1-e2e.0 --no-git-tag-version` and `--tag e2e` | ENV-2 | Pass | `evidence/API-06-release-steps-x86_64.log` | `bundled npm before: 11.19.1` -> after `npm i -g npm@^11.5.1`: `11.21.1` (no downgrade, ≥ 11.5.1); `exit=0 (npm ci)`, `exit=0 (npm run build)`; part 1: `npm error You cannot publish over the previously published versions: 2.0.0.` (expected); part 2: `npm notice total files: 10`, `+ repository_prisma@2.0.1-e2e.0`, `Publishing to https://registry.npmjs.org/ with tag e2e and public access (dry-run)`, `exit=0` | `--provenance` with GitHub OIDC cannot run outside a GitHub release run (next release). |
| API-07 | AC-005, REQ-006 | consumer install of the packed tarball | `npm run build`; `npm pack`; README consumer setup (ESM, CJS) from the tarball; `npm ls uuid`; `node app.mjs` / `node app.cjs`; lazy `file:` binding; contrast: `npm install repository_prisma@2.0.0` | ENV-3 | Pass | `evidence/API-07-consumer-install-no-uuid.log`; scripts in `API-scripts/` | packed manifest has no `dependencies`; both consumers: `npm ls uuid` -> exit 1, `ls: node_modules/uuid: No such file or directory`, app `{"result":"pass",...}` (10 checks), lazy `"ok":true`; published 2.0.0: `` `-- uuid@13.0.2 `` | Proves the consumer-visible change and that nothing used `uuid`. |
| API-08 | AC-004, AC-006 | docs review | Read README § Release (Tag-Based), DESIGN § Design Cases, CHANGELOG `## Unreleased`; check factual claims | ENV-1 | Pass | `evidence/API-08-docs-checks.log` | `## Design Cases` at line 255 before `## 5. FAQ` (278); DC-001's "section E above" -> `### E. ... (Root Lifecycle)` (80) which names the gate (121); version `2.0.0`; tags containing `e213742`: `0`; lockfile `vitest 4.0.18 -> 4.1.12`, `vite 7.3.1 -> 8.3.5`, `rollup 4.56.0 -> 4.67.5`, `postcss 8.5.6 -> 8.5.32`, `uuid 13.0.0 -> undefined` | Review result below. The README's 7 pre-tag steps were executed in API-02/03/06/07 (steps 1-6); step 5's root note matches API-03 output exactly. |
| API-09 | AC-001, REQ-008 | GitHub CI on `main` after merge | Pre-merge: baseline `gh run view 41855325943` (main `aa933e0`). The AC-001 run itself happens after delivery merges. | ENV-4 | Not Tested (post-merge; handed to delivery) | `evidence/API-09-github-ci-baseline-main.log` | baseline annotation: `Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4.`; `node-version: 20`; `Acquiring 20.20.2 - x64` | The trigger (push to `main`) exists only after merge. The branch is not pushed and has no PR. Delivery checks the merge-commit run: `node-version: 24`, Node v24.x acquired, no `Node.js 20 is deprecated` annotation, job success. |

### Docs review (API-08)

- README § Release (Tag-Based):
  - It names `main` as the finalization target, and the tag points to the release commit on `main`.
  - It lists 7 ordered pre-tag checks: fresh `npm ci`, typecheck, test, build, `test:package` non-root (with the root skip noted), `npm pack --dry-run` file list, and CI green on `main`.
  - It includes the post-publish check (`npm view repository_prisma dist-tags version`, registry lag) and "never move a pushed tag or unpublish".
  - This matches REQ-004 and the design. The file list named in step 6 (`dist`, `README.md`, `DESIGN.md`, `CHANGELOG.md`) matches the 10 files packed in API-06.
- DESIGN.md "Design Cases" says what a case records and that cases are appended with the next `DC-` number. DC-001 has the problem, how it was found, the wrong assumption, the fix and the lesson, matching REQ-005. Observation, not a finding: the document's section numbering was already out of order (`## 5. FAQ` precedes `## 4. Usage Example`). The new unnumbered section sits before the FAQ, as designed.
- CHANGELOG `## Unreleased` records the `uuid` removal (no API change), the audit fix (the named packages match the lockfile), Node 24 + actions v5 + npm `^11.5.1`, and the root skip. `version` is still 2.0.0 (REQ-007, AC-006).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | Pre-merge: API-02 (exact CI steps on x86_64 Node 24, non-root, `CI=true`), API-05 (workflow valid; v5 actions run on `node24`, so the deprecation annotation's cause is gone), API-01 (IMP-06). Post-merge: API-09 | Proven up to the merge. The GitHub run on `main` is a post-merge check for delivery (not user-only). | — |
| AC-002 | Yes | API-05, API-06 | Proven | — |
| AC-003 | Yes | API-01 (IMP-04, IMP-06), API-02 (non-root x86_64 `pass`), API-03 (root x86_64 `skipped-root` + reason), API-04 (non-root cannot skip) | Proven | — |
| AC-004 | No | API-08 | Proven | — |
| AC-005 | Yes | API-01 (IMP-01..05), API-02, API-07 | Proven | — |
| AC-006 | No | API-08, API-01 (IMP-05) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 93% | API-01..08 | AC-001's GitHub run on `main` happens only after merge (API-09) | Delivery's post-merge run |
| Changed-boundary execution directness | 85% | 96% | API-02/03/06 run the workflow steps; API-07 installs the real tarball | The actions themselves (checkout/setup-node v5) are not executed outside GitHub | GitHub run |
| Cross-boundary integration realism and mock gap | 80% | 93% | x86_64 Node 24 container; registry; actionlint; action runtimes from the actions' own `action.yml` | The hosted runner image and OIDC provenance publish are unexercised | GitHub run; next release |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Node 24.22.2 / npm 11.19.1 x86_64, non-root and root, `CI=true`, clean `git archive` | Emulated, not the hosted image | GitHub run |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 97% | API-03 root skip; API-04 guard mutation; IMP-07 base failure; API-06 registry refusal understood; actionlint control | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI, browser or desktop surface | — | — |
| Durable regression coverage quality and relevance | 95% | 96% | The smoke's `readonlyWal` + marker assertion (shown to fail under mutation); 113 tests unchanged | — | — |

- Overall post-repository confidence: 87%
- Overall final confidence: 95%
- Calculation method: simple average of the six applicable categories (93+96+93+95+97+96)/6 = 95.0%
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` for everything provable before merge. AC-001's own trigger (push to `main`) occurs only at delivery's merge. It is handed to delivery as a post-merge check: it does not require the user, and it is not a missing dependency that stops validation.
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - The GitHub CI run on `main` (delivery, post-merge).
  - The release workflow's real OIDC `--provenance` publish (next release).
  - npm install-script approval warnings (FU-002).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `CLI` + `Lifecycle` (containerized workflow-step emulation on x86_64 Node 24; real consumer install)
- Confidence gap or residual risk it addresses, and the expected gain: the IR evidence ran on aarch64 only, with no release-step run and no consumer install. Broader validation proved the CI architecture, the release npm step and packaging, and the consumer-visible removal of `uuid`.
- Browser validation needed, and why or why not: No. No browser surface.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (the smoke-script guard is the implementation's change; it was exercised here, not modified)
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub-hosted `ubuntu-latest` runner | `node:24-bookworm` amd64 under emulation, `CI=true`, non-root | Running on GitHub needs a push or PR (delivery's merge) | Runner image and the actions' own code not executed (static runtime proof only) |
| npm registry publish with OIDC provenance | `npm publish --dry-run` (no token) | No release in this Task | Provenance/OIDC unexercised |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/rp2-e2e` (archive, tarball, consumers, logs, lint control) | Yes | `rm -rf /tmp/rp2-e2e` after copying logs/scripts to `evidence/` | Done |
| Docker containers | Yes | `--rm` | Removed on exit |
| Docker images `node:24-bookworm` (arm64/amd64), `rhysd/actionlint:latest` | Yes (pulled) | Left in the shared local image cache | Kept |
| Temporary mutation of `scripts/run-package-smoke.js` (API-04) | Yes | Restored from backup; `git diff --quiet` confirmed | Restored |
| `dist/`, `test.db` in the worktree | gitignored build/test outputs | Not committed | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None user-only. AC-001's GitHub run on `main` is a post-merge check for delivery (API-09 gives the baseline and what to look for).
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: delivery engineer (direct low-risk route; test-code review `Not Required — direct low-risk route`)
- Notes: FU-002 added (npm install-script approval). The README's root-skip sentence matches the observed output exactly.

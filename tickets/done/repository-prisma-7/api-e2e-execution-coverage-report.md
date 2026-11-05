# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; code review CRR-001 Pass (code `bcf2be0`), Part A only
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-04 grew a Linux part (3a/3b). The macOS pnpm 12 run used npm 12 on Node 25, which npm 12 does not support, so its npm-rebuild result was confounded. It was repeated on Node 24.22.2 (supported) in Linux containers.
  - In 3b, the `pnpm rebuild` attempt failed only because the harness had not mounted the local tarball, which pnpm re-reads. A registry install does not need it. It was rerun on a fresh copy.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/evidence/` (`API-*.log`; scripts in `API-scripts/`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review; per the handoff rule for High risk)
- Proportional test-code review decision: `Required`. No durable test code was changed in this round, so there is nothing to review in the test suite. The only repository change is two `TESTING.md` bullets (project document).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | packed build of `bcf2be0` (`repository_prisma-2.0.0.tgz`, sha256 `7ea8273a...26e4`) | Docker `--platform linux/amd64` (emulated x86_64), user `node` | `node:24-bookworm` Node 24.22.2 + npm 12.2.1 (user prefix) / bundled npm 11.19.1; `node:22-bookworm` Node 22.23.4 + npm 10.9.9; pnpm 12.16.1 | consumer on a Docker volume shared by the Node 22 and Node 24 containers |
| ENV-2 | same tarball | macOS 26.5.2 arm64 | Node 22.23.1 (ABI 127), Node 25.2.1 (ABI 141, Homebrew, npm 11.6.2); pnpm 11.28.9, pnpm 12.16.1; npm 12.2.1 | uid 501 |
| ENV-3 | registry `repository_prisma@2.0.0` + README at `bcf2be0` | macOS | as ENV-2 | consumer `pnpm-workspace.yaml` `minimumReleaseAge: 60` (post-gate state; 2.0.0 published 2026-11-04T15:10Z, test at 2026-11-05T06:15Z) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003, AC-002 (macOS npm 12), AC-004 (young version) | IR checks | Reused: IMP-01..06 | (implementation handoff) | Pass | (implementation handoff Checks Run) | (implementation handoff) | All ran on `bcf2be0`; `git diff --name-only bcf2be0 HEAD` outside `tickets/` is empty. IMP-02/04: AC-001 (a)-(d) and mutations. IMP-03: declarations + the missing-parent `CONNECTION_FAILED` smoke. IMP-05: the macOS real-driver run incl. the registered prisma-client module. IMP-06: README installs while 2.0.0 was ~15 h old. |
| API-02 | AC-002, BEH-002 | Linux x64, npm 12 consumer, module not built; README npm fix | `run-linux.sh` -> `linux-a-node24.sh` | ENV-1 | Pass | `evidence/API-02-linux-npm12-missing-module.log` | `native module present: 0`; `RESULT failed SQLITE_DRIVER_UNAVAILABLE` and `RESULT failed (cjs) SQLITE_DRIVER_UNAVAILABLE`; `message: The SQLite driver (better-sqlite3) could not load its native module. ... see "Allow the native SQLite build" in the repository_prisma README.`; `diagnostic: SQLITE_DRIVER_UNAVAILABLE \| Could not locate the bindings file`; lazy: `RESULT failed (lazy) Error - \| Could not locate the bindings file` and `(lazy cjs)` likewise; after `npm install-scripts approve better-sqlite3` + `npm rebuild better-sqlite3`: `RESULT ok` ×4 | The lazy path surfaces the driver's raw error (DEC-002) in ESM and CJS. |
| API-03 | AC-002, BEH-002 | Linux x64, wrong ABI: built under Node 24 (ABI 137), run under Node 22 (ABI 127); README rebuild | `linux-b-node22.sh` on the same volume | ENV-1 | Pass | `evidence/API-03-linux-wrong-abi.log` | `RESULT failed SQLITE_DRIVER_UNAVAILABLE` (ESM, cjs), `cause.code = ERR_DLOPEN_FAILED`; lazy: `PrismaClientKnownRequestError ERR_DLOPEN_FAILED` with `NODE_MODULE_VERSION 137 ... requires ... 127`; after `npm rebuild better-sqlite3`: `RESULT ok` ×4 | |
| API-04 | AC-002 | pnpm consumers: not built + README pnpm fix; wrong ABI + README `npm rebuild` vs `pnpm rebuild` | Part 1 macOS pnpm 11; Part 2 macOS pnpm 12 (confounded); Part 3 Linux pnpm 12 built under Node 22, run under Node 24 with three rebuild commands on separate copies | ENV-2, ENV-1 | Pass, with a recorded docs gap (FU-001) | `evidence/API-04-pnpm-consumers.log` | Not built: `better-sqlite3 hoisted ...: no`, `RESULT failed SQLITE_DRIVER_UNAVAILABLE` (ESM, cjs), lazy raw `Could not locate the bindings file`; `pnpm approve-builds better-sqlite3` -> `RESULT ok` ×3 (pnpm 11 and 12). Wrong ABI: `SQLITE_DRIVER_UNAVAILABLE`, `cause.code = ERR_DLOPEN_FAILED`. Rebuild: npm 11.6.2 (Part 1) and bundled npm 11.19.1 (3b, 4b) -> `RESULT ok`; `pnpm rebuild better-sqlite3` (Part 1, 3 rerun 4c) -> `RESULT ok`; npm 12.2.1 on Node 24.22.2 (3 rerun 4a): `9 packages had install scripts blocked ...`, `rebuilt dependencies successfully`, `exit=0`, `does not load: ERR_DLOPEN_FAILED`, `RESULT failed SQLITE_DRIVER_UNAVAILABLE` | The answer to the reviewer's item 2: the README's `npm rebuild better-sqlite3` fixes a pnpm project with each Node line's bundled npm (≤ 11.20 on Node 22/24/25/26, nodejs.org index). With npm 12 it silently does nothing, because a pnpm project has no npm approval. A pnpm user should run `pnpm rebuild better-sqlite3` (FU-001). |
| API-05 | AC-004 | README installs once the newest version is past pnpm's release age (emulated) | `run-ac004-aged.sh` | ENV-3 | Pass | `evidence/API-05-ac004-aged-installs.log` | pnpm 11 and 12, pinned: `+ repository_prisma 2.0.0`; `pnpm-workspace.yaml` contains only `allowBuilds` and `minimumReleaseAge: 60` (no `minimumReleaseAgeExclude`); `RESULT ok` and `RESULT ok (cjs)`. Unpinned control: `+ repository_prisma 2.0.0`. npm 12: `min-release-age config: null`, `installed repository_prisma: 2.0.0`, `RESULT ok` ×2 | Lowering `minimumReleaseAge` is the same gate that a day's passage satisfies. IMP-06 covered the young-version state. |
| API-06 | AC-002 (message), REQ-002 | message, README, DESIGN.md, CHANGELOG | `grep` / diff / path check | ENV-2 | Pass | `evidence/API-06-docs-message-checks.log` | `README.md:38:### Allow the native SQLite build` and anchor `#allow-the-native-sqlite-build`; message cites the heading verbatim; `contains / or \\: false`; DESIGN.md bullet incl. fallback and heading coupling; CHANGELOG `## Unreleased` entries; `version` `2.0.0`; tags `0` | |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-02, IMP-04) | Proven | — |
| AC-002 | Yes | API-01 (IMP-05, macOS npm 12 incl. registered prisma-client), API-02, API-03 (Linux x64, ESM + CJS), API-04 (pnpm 11/12) | Proven. Every README fix restores `RESULT ok`, on default toolchains, for each failure and package manager. Recorded gap: in a pnpm project with npm 12 installed, the README's `npm rebuild` does nothing; `pnpm rebuild better-sqlite3` is needed (FU-001). | — |
| AC-003 | Yes | API-01 (IMP-01, IMP-03) | Proven | — |
| AC-004 | Yes | API-01 (IMP-06, version under a day old), API-05 (version past the gate) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 93% | API-01..06 | The README's ABI remedy for pnpm users holds only with npm ≤ 11 (FU-001) | One README line (FU-001) |
| Changed-boundary execution directness | 90% | 97% | Real driver, packed build, real package managers, explicit and lazy | — | — |
| Cross-boundary integration realism and mock gap | 80% | 94% | Linux x64 (emulated) and macOS; npm 10/11/12, pnpm 11/12 | Electron ABI is guidance only; Windows not run | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | non-root containers; supported Node/npm pairings; the release-age gate set directly | 2.0.0 not literally older than a day at test time (gate emulated) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 96% | missing build, wrong ABI, lazy raw error, `CONNECTION_FAILED` fallback (IMP-02 d, IMP-03), mutations (IMP-04), symptom -> fix -> ok | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI surface | — | — |
| Durable regression coverage quality and relevance | 94% | 94% | `sqlite-driver-unavailable.test.ts` with mutation proof; declaration smoke | Real-driver cases are probes (they cannot run in the repo's own `node_modules`); method recorded in `TESTING.md` | — |

- Overall post-repository confidence: 87%
- Overall final confidence: 94.8%
- Calculation method: simple average of the six applicable categories (93+97+94+95+96+94)/6 = 94.8%
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94.8%). The shortfall comes only from FU-001, a one-line README gap in a non-default toolchain combination (pnpm project with npm 12 installed). More validation cannot close it; the fix is a README line. Recommended: fold it into this ticket's docs sync, or keep it as FU-001.
- Confidence-limiting residual risks: FU-001; Electron ABI (guidance only); no Windows run.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `CLI` (fresh consumers of the packed build; Docker x86_64 and macOS)
- Confidence gap or residual risk it addresses, and the expected gain: unit tests use fake `$connect` rejections; IMP-05 covered macOS npm 12 only. Real-driver behavior on Linux, the pnpm layout, and the README remedies per package manager are now measured.
- Browser validation needed, and why or why not: No.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (no dual code; `CONNECTION_FAILED` stays only for other failures)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Added or updated paths attached for proportional test-code review: `Not Applicable` (no test code changed)
- Diff or repository evidence supplied for removed paths: N/A

## Project Documents

- `TESTING.md` (present) was followed. It is updated with one bullet under "Choosing The Layer": how to test real native-driver failures (throwaway consumer; blocked build; build under one Node and run under another via two containers on one volume), and that README remedies must be checked per package manager, because npm 12 rebuilds nothing in a pnpm project. The design's guidance asked for this line when such a method is introduced.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A version older than pnpm's release age | consumer `minimumReleaseAge: 60` | 2.0.0 is ~15 h old | none for the gate logic |
| Linux x64 host | Docker amd64 emulation | arm64 host | negligible |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/rp7e` (tarball, consumers, pnpm 11 prefix, logs) | Yes | `rm -rf` after copying evidence | Done |
| Docker volumes `rp7e-linux`, `rp7e-pnpm` | Yes | `docker volume rm` | Done |
| Containers | Yes | `--rm` | Removed |
| `/tmp/rp6-npm12-prefix`, `/tmp/rp6-pnpm12-prefix` | No (IR's) | left in place | — |
| `dist/` rebuilt in the worktree | gitignored | not committed | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None. Recorded docs gap FU-001 (pnpm + npm 12 rebuild wording).
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: code reviewer (Pass, architectural risk High)
- Notes: the confidence (94.8%) is just under the 95% default target, solely because of FU-001; the recommendation is above.

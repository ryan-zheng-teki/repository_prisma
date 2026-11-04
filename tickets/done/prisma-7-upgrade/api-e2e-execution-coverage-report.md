# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; code review CRR-002 Pass (code commit `e5d2371`, handoff commit `f91b676`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-04 ran twice. The first run was as root, the container default. Its `test:package` failed at a read-only-file assertion that root bypasses. The rerun used the image's non-root `node` user, which matches the GitHub runner. A control run of base 1.0.10 as root showed the same failure at the same line, so it is pre-existing (FU-005). An extra amd64-emulated non-root rerun was added to match `ubuntu-latest` x64.
  - API-05: the first lazy non-SQLite run used a probe that chained `.then()`. The library throws synchronously at delegate access, which is unchanged lifecycle behavior asserted by the existing durable test `expect(() => rootPrismaClient.user).toThrowError(...)`. That throw escaped the probe. The probe was fixed to use `try { await … }`, as application code would, and rerun. Both runs are in the log.
  - API-08/API-11: an ungated control run was added (a patched copy of the installed package, not shipped code) to show the load probe detects isolation violations.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/evidence/` (case logs `API-*.log`; probe scripts `API-scripts/`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the changed durable test)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `e5d2371` code (+ API-02 test in the working tree) | macOS 26.5.2 arm64 | Node v22.23.1, npm 10.9.8 | worktree `node_modules` from IMP-01; `DATABASE_URL`/`DATABASE_URL_TEST` unset |
| ENV-2 | `git archive HEAD` (`f91b676`, code = `e5d2371`) + API-02 test overlay | Docker `node:20-bookworm`, Linux aarch64 | Node v20.20.2, npm 10.8.2 | `CI=true`; clean checkout, `npm ci`; root run and non-root (`uid=1000(node)`) run |
| ENV-2x | same as ENV-2 | Docker `node:20-bookworm` `--platform linux/amd64` (emulated), Linux x86_64 | Node v20.20.2, npm 10.8.2 | `CI=true`, non-root |
| ENV-3 | packed tarball `repository_prisma-1.0.10.tgz` (sha256 `f0fb025f71c2f2895e28e42a83f726fc65f6ac1ef564d665ff0f524ebcb2152a`, built from the worktree at `e5d2371`) | macOS (consumers in `/tmp/rp-e2e/consumer-*`) and Docker `node:20-bookworm` aarch64 (non-root) | Node 22.23.1 / npm 10.9.8; Node 20.20.2 / npm 10.8.2 | fresh consumer projects; `npm config legacy-peer-deps=false`; registry install of `prisma@7` and the peers (resolved 7.10.1); `better-sqlite3` 12.11.1 |
| ENV-4 | Prisma 5.22.0 scratch writer (`/tmp/rp-e2e/p5-writer`) | macOS | Node 22.23.1; `prisma@5.22.0`, `@prisma/client@5.22.0` | ticket probe schema `probes/datetime-continuity.schema.prisma` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, AC-003, AC-006, AC-007, AC-008, AC-009 | repo suites, smoke, mutations | Reused: IMP-01, IMP-07, IMP-09, IMP-12, IMP-13, IMP-14, IMP-16 | (implementation handoff) | Pass | (implementation handoff Checks Run) | (implementation handoff) | `git diff --name-only e5d2371 f91b676` lists only `tickets/` paths, so the code each check exercised is unchanged. IMP-01, IMP-07 and IMP-09 ran on `a092a60`; the handoff explains why they still hold (manifest, lockfile, adapter path and `timestampFormat` lines unchanged). AC-001 is also re-shown in API-04 (`npm ls`). |
| API-02 | AC-013, AC-007 | gate under concurrent load, public API, real SQLite file | `npx vitest run src/tests/transaction-isolation.test.ts --reporter=verbose`; mutation: `createSqliteDriverAdapter` returns the ungated adapter, then `-t 'loses no writes'`, then restore | ENV-1 | Pass | `evidence/API-02-load-test-verbose.log`, `evidence/API-02-mutation-ungated.log` | `✓ ... keeps concurrent plain requests isolated and loses no writes while transactions commit and roll back`; `Tests  7 passed (7)`. Mutation: `× keeps concurrent plain requests isolated ...`, `AssertionError: expected [ 'tx-1@example.test', …(11) ] to deeply equal []`, `working tree restored` | New durable test: 30 plain requests (repository, `prisma`, `rootPrismaClient`) interleaved with 6 transactions (3 commit, 3 roll back). |
| API-03 | AC-010 (repo), all suites | macOS repo checks after API-02 | `npm run typecheck`; `npm test` (env URLs unset); 10× `npx vitest run src/tests/transaction-isolation.test.ts` | ENV-1 | Pass | `evidence/API-03-typecheck-test.log` | `typecheck-exit=0`; `Test Files  11 passed (11)`; `Tests  113 passed (113)`; `repeat 1:` .. `repeat 10:` each `Tests  7 passed (7)` | No flakiness in 10 repeats. |
| API-04 | AC-010, AC-001, REQ-010, REQ-011, REQ-013 | CI workflow commands on Node 20 Linux from a clean checkout; `prepare` | `api04-ci-node20-nonroot.sh` in `node:20-bookworm` as `node`: `npm ci`, `npm ls`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:package` | ENV-2 (+ ENV-2x) | Pass | `evidence/API-04-ci-node20-nonroot.log`, `evidence/API-04-ci-node20-root.log`, `evidence/API-04-base-1.0.10-root-smoke.log`, `evidence/API-04-ci-node20-amd64.log` | non-root: `> repository_prisma@1.0.10 prepare`, `✔ Generated Prisma Client (v7.10.1)`, `+-- @prisma/adapter-better-sqlite3@7.10.1`, `+-- @prisma/client@7.10.1`, `` `-- prisma@7.10.1 ``, `exit=0 (npm run typecheck)`, `Tests  113 passed (113)`, `exit=0 (npm run build)`, `"result":"pass"` (smoke and interop), `ALL-STEPS-FAILED=0` | Every command in `ci.yml` passes in the root run too (`exit=0` for ci/typecheck/test/build). The root run's `test:package` fails at `cjs-smoke.cjs:49:12` (read-only WAL case). Base `f2ffd5c` fails identically as root, so it is pre-existing, not part of this change: FU-005. amd64 result: see the API-04 amd64 note below. |
| API-05 | AC-012, AC-008, AC-003, AC-009, REQ-015 | fresh ESM consumer: README setup only, packed tarball, default npm peer install | `consumer-setup.sh <tgz> consumer-esm module` (npm init; `npm install <tgz>`; `npm install -D prisma@7`; README schema + own models; README `prisma.config.ts`; `npx prisma generate` with no `DATABASE_URL`; `DATABASE_URL=file:./app.db npx prisma db push`); `node app.mjs`; `node lazy.mjs` with `file:` and `postgresql://` `DATABASE_URL` | ENV-3 (macOS) | Pass | `evidence/API-05-esm-consumer.log`; scripts `evidence/API-scripts/consumer-setup.sh`, `app.mjs`, `app-body.txt`, `lazy.mjs` | `npm config legacy-peer-deps=false`; under `repository_prisma@1.0.10`: `+-- @prisma/adapter-better-sqlite3@7.10.1` and `` `-- @prisma/client@7.10.1 ``; `no adapter import in consumer code`; `{"result":"pass","checks":{...}}` (10 checks); `"message":"repository_prisma supports SQLite datasources only; use a file: URL."`; lazy: `{"DATABASE_URL_kind":"file","outcome":{"ok":true,"count":1}}` and `"code":"UNSUPPORTED_DATASOURCE_PROVIDER" ... "leaks":false` | App code is the README form `initializePrisma({ datasourceUrl: 'file:./app.db' })` with repositories, `runInTransaction` (commit and rollback), the `prisma` proxy and a DateTime row. |
| API-06 | AC-012, AC-008, AC-003, AC-009 | fresh CJS consumer | `consumer-setup.sh <tgz> consumer-cjs commonjs`; `node app.cjs`; `node lazy.cjs` (file / postgresql) | ENV-3 (macOS) | Pass | `evidence/API-06-cjs-consumer.log`; scripts `app.cjs`, `lazy.cjs` | `package type: "commonjs"`; same `npm ls` peers; `{"result":"pass",...}`; lazy file `"ok":true`; lazy postgresql `"code":"UNSUPPORTED_DATASOURCE_PROVIDER"`, `"leaks":false` | |
| API-07 | REQ-014, AC-011, AC-012 | TypeScript consumer code against the packed declarations | `tsc -p tsconfig.json` with `typescript@5.4.5` and `typescript@5` (5.9.3) in consumer-esm (NodeNext) and consumer-cjs (CommonJS/Node10), `experimentalDecorators`; negative control | ENV-3 (macOS) | Pass | `evidence/API-07-ts-consumer-typecheck.log`; `API-scripts/app-types.ts`, `tsconfig.esm.json`, `tsconfig.cjs.json` | `Version 5.4.5` / `Version 5.9.3` each followed by `exit=0` (4 runs); control: `error TS2322: Type 'number' is not assignable to type 'string'.`, `error TS2367 ... '"NOT_A_REAL_CODE"' have no overlap.`, `exit=2` | Covers `@Transactional`, `RunInTransactionOptions`, `PrismaInitializationErrorCode` with the new code, typed delegates. |
| API-08 | AC-013, AC-007 | isolation through the packed ESM entry; sustained concurrent load; DELETE and WAL | in consumer-esm: `node cr01-esm.mjs dbs/cr01.db`; `node load-probe.mjs dbs/load-0.db 0 8000`; `node load-probe.mjs dbs/load-1.db 1 8000`; control on an ungated copy | ENV-3 (macOS) | Pass | `evidence/API-08-packed-esm-isolation-load.log`; `API-scripts/cr01-esm.mjs`, `load-probe.mjs` | `"entry": "file:///private/tmp/rp-e2e/consumer-esm/node_modules/repository_prisma/dist/index.mjs"`, `"seenUncommitted": []`, `"rowsAfter": ["independent-request@example.test"]`; DELETE: `"plainRequests":1023`, `"committed":302,"rolledBack":301,"otherErrors":{}`, `"max":130`, all violations `0`, `"rowCountMatches":true`; WAL: `"journalMode":"wal"`, `"plainRequests":1261`, violations `0`; control: `"result":"FAIL"`, `"lostPlainWrites":1756` | Load: 8 plain-request workers and 4 transaction workers (half roll back) for 8 s. Dirty reads, lost writes and kept rollbacks are counted. The control proves the probe detects them. |
| API-09 | AC-005, REQ-005 (persisted data) | DB created and written by Prisma 5.22, opened by the packed library on 7.10.1; read back by 5.22 | Prisma 5.22: `db push`, `probes/datetime-continuity-write-p5.cjs`, `dt-write-p5-more.cjs`; consumer-dt (README setup, probe schema without `url`): `node dt-read-p7.mjs /tmp/rp-e2e/p5/dt.db`; Prisma 5.22: `node dt-read-p5.cjs` | ENV-4 + ENV-3 (macOS) | Pass | `evidence/API-09-prisma5-datetime.log`; `API-scripts/dt-*.{cjs,mjs}` | `✔ Generated Prisma Client (v5.22.0)`; Prisma 5 rows `t: 'integer'`; 7 checks `PASS` incl. `PASS gt returns old and new rows [{"label":"p5"},{"label":"p5-2026-03"},{"label":"p7-lib"}]`, `PASS all rows stored as integer (at and createdAt)`; `{"result":"pass",...}`; Prisma 5 read-back: `"prisma5GtAfter2025":["p5","p5-2026-03","p7-lib"]` | Also checks an equality filter on a Prisma-5 instant and `@default(now())` columns. |
| API-10 | AC-004, REQ-004 | path handling through the packed ESM entry | cwd `/tmp/rp-e2e/path-probe`: `node /tmp/rp-e2e/consumer-esm/path-probe.mjs` | ENV-3 (macOS) | Pass | `evidence/API-10-packed-paths.log`; `API-scripts/path-probe.mjs` | `PASS relative with spaces + query`, `PASS literal %20 + query ... decodedNameExists=false`, `PASS symlink alias + query: ... main="<cwd>/physical.db"`, `PASS absolute with spaces + query + WAL`; `files whose name contains "?": []` | `%20` stays literal in the file name, as on 1.0.10 (base test "literal percent spelling"). |
| API-11 | AC-012, AC-008, AC-013, AC-004, AC-009, REQ-014 | fresh ESM + CJS consumers on Node 20 Linux; native `better-sqlite3` through the default peer install | `docker run --user node node:20-bookworm sh api11-node20-consumers.sh` (consumer-setup, app, lazy, cr01, load DELETE/WAL 5 s, path probe) | ENV-3 (Linux Node 20) | Pass | `evidence/API-11-node20-consumers.log`; `API-scripts/api11-node20-consumers.sh` | `uid=1000(node)`; `npm config legacy-peer-deps=false`; peers `7.10.1`; `better-sqlite3 native binding present: true`; both `{"result":"pass","checks":...}`; `"seenUncommitted":[]`; load DELETE `"violations":{"rolledBackSeen":0,"uncommittedSeen":0,"lostPlainWrites":0,...}` with `"max":420`, `"maxWaitToStartMs":302`; WAL `"max":112`; path probe `{"result":"pass"}` | Read the result JSON; the `exit=` after `node app.* \| tail -1` is tail's exit. |
| API-12 | AC-004 on Windows | Windows path handling | — | — | Not Tested | — | — | No Windows host or VM is available, and CI has no Windows job. Only the existing mocked-`win32` unit test covers it (IMP-11/API-03). |

API-04 amd64 note: the non-root rerun under `--platform linux/amd64` (`arch x86_64`, Node v20.20.2) passes every step: `exit=0 (npm ci)`, `exit=0 (npm run typecheck)`, `Tests  113 passed (113)`, `exit=0 (npm run build)`, both `"result":"pass"` lines, `ALL-STEPS-FAILED=0` (`evidence/API-04-ci-node20-amd64.log`).

Observation (not a failure): on Node 20, `npm ci` warns `EBADENGINE ... package: '@prisma/streams-local@0.1.11', required: { bun: '>=1.2.0', node: '>=22.0.0' }`. That package is Prisma's own transitive CLI dependency (`prisma@7.10.1 > @prisma/dev@0.24.17 > @prisma/streams-local`, used by `prisma dev`). It is a warning only: every step passes on Node 20, and no library or toolchain flow here uses `prisma dev`. Moving CI off Node 20 is already FU-003.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-01), API-04 | Proven | — |
| AC-002 | Yes | API-01, API-03, API-05, API-06, API-11 | Proven | — |
| AC-003 | Yes | API-03, API-05, API-06, API-11 (lazy `file:`) | Proven | — |
| AC-004 | Yes | API-01 (IMP-07b), API-03, API-10, API-11 | Proven (macOS, Linux). Windows not tested (API-12): residual risk, not user-only | — |
| AC-005 | Yes | API-01 (IMP-07a), API-03, API-05 (DateTime integer), API-09 | Proven, including a real Prisma 5.22-written database | — |
| AC-006 | Yes | API-01 (IMP-12 smoke WAL cases), API-03, API-04 (non-root smoke), API-10 (WAL on a real path) | Proven | — |
| AC-007 | Yes | API-01, API-02, API-03, API-05, API-06 | Proven | — |
| AC-008 | Yes | API-01, API-03, API-05, API-06, API-11 (explicit + lazy, ESM + CJS, no leak) | Proven | — |
| AC-009 | Yes | API-01 (IMP-09, IMP-12), API-04 (smoke on Node 20), API-05, API-06, API-11 | Proven | — |
| AC-010 | Yes | API-03, API-04 | Proven (Node 20 Linux non-root, and Node 22 macOS) | — |
| AC-011 | No | API-05/06 (README setup followed verbatim works), API-07 (TS 5.4), `package.json` `version` 1.0.10, `engines.node`, `git tag --contains e5d2371` empty, CHANGELOG `## Unreleased (breaking: requires a major release)` | Proven for the executable claims; the full prose review stays with delivery's docs sync | — |
| AC-012 | Yes | API-05, API-06, API-07, API-11 | Proven (ESM + CJS, macOS Node 22 and Linux Node 20, no `--legacy-peer-deps`) | — |
| AC-013 | Yes | API-01 (IMP-13/14/16), API-02, API-08, API-11 | Proven, including the packed ESM entry and sustained concurrent load | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | API-01..11 | Windows path behavior (API-12) | A Windows host |
| Changed-boundary execution directness | 85% | 97% | API-05/06/08/09/10/11 run the shipped tarball with real peers, the real native addon and real SQLite files | — | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | real registry install with default peer resolution; a real Prisma 5.22 database; ESM + CJS; Node 20 Linux | No Windows; Linux x64 only through emulation (ENV-2x) | GitHub Actions run on the PR |
| Environment, configuration, identity, and fixture fidelity | 75% | 95% | ENV-1..4; non-root like the CI runner; `CI=true`; clean `git archive` checkout; x86_64 emulated run passes (ENV-2x) | Hosted runner image not used; consumer journeys on Linux ran on arm64 only | GitHub Actions run on the PR |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | rollback, non-SQLite explicit/lazy, reused SCN-007 and `maxWait` P2028 (IMP-14), read-only WAL and missing-directory smoke (API-04), ungated controls | Shutdown with requests queued on the gate is unexercised (CRR C-10, no supported scenario) | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | Library only; no UI, browser or desktop shell in scope (Electron packaging is FU-001) | — | — |
| Durable regression coverage quality and relevance | 92% | 93% | 113 tests, including the new load test with mutation proof (API-02); smoke/interop | The README fresh-install path (no `--legacy-peer-deps`, registry) exists only as probe scripts in evidence, because it needs network access | A CI job that installs the packed tarball into an empty project |

- Overall post-repository confidence: 83%
- Overall final confidence: 95%
- Calculation method: simple average of the six applicable categories (96+97+95+95+95+93)/6 = 95.2%
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` (Windows is a platform residual, not part of an AC's stated forms)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: Windows paths untested on a real host. x64 Linux only emulated. Throughput cost under concurrent transactions is documented: on Linux DELETE mode with 4 transaction workers busy, plain p99 was 406 ms and max 420 ms. The fresh-install journey is not durable in the repo.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `CLI` + `Lifecycle` (real consumer projects installing the packed tarball; Docker Node 20 CI emulation)
- Confidence gap or residual risk it addresses, and the expected gain: repository evidence installs with `--legacy-peer-deps` and symlinked peers, runs only on Node 22 macOS, and fakes Prisma-5 data with raw SQL. Broader validation proved the default npm peer install, both module systems, Node 20 Linux, the native addon, a real Prisma 5.22 database and sustained concurrency.
- Browser validation needed, and why or why not: No. A library with no browser surface.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: a SQLite file created by `prisma db push` 5.22.0 and written by `@prisma/client` 5.22.0: 3 rows with `at` and `createdAt @default(now())`, stored as `integer`
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-09 (plus API-01 IMP-07a, API-03 `datetime-continuity.test.ts`)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: consumer-built clients with the default ISO format (FU-001, documented in the README)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `src/tests/transaction-isolation.test.ts`: `keeps concurrent plain requests isolated and loses no writes while transactions commit and roll back` (plus `BaseRepository`/`Models` imports and a local `UserRepository`) | Added | API-02, API-03 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub Actions `ubuntu-latest` x64 runner | Docker `node:20-bookworm` (arm64 native; amd64 emulated), non-root, `CI=true` | Pushing to trigger CI was not requested | Minor: different image and arch than the hosted runner |
| npm publish of `repository_prisma` | `npm pack` tarball installed by path | No release in this Task | None for install/peer resolution (npm resolves the tarball's peers from the registry the same way) |
| Windows | none | No host available | API-12 Not Tested |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/rp-e2e` (tarball, consumers, Prisma 5 writer, DBs, logs) | Yes | `rm -rf /tmp/rp-e2e` after copying logs and scripts to `evidence/` | Done (see revision record) |
| Docker containers | Yes | `--rm` | Removed on exit |
| Docker image `node:20-bookworm` (arm64 and amd64) | Yes (pulled for this run) | Left in the local image cache (shared cache; other containers are running on this host) | Kept |
| Temporary mutation of `src/lib/client/sqlite-driver-adapter.ts` (API-02) | Yes | Restored from a backup; `git diff --quiet` confirmed | Restored |
| Ungated control copy `/tmp/rp-e2e/consumer-esm-ungated` | Yes | removed with `/tmp/rp-e2e` | Done |
| `test.db`, `dist/` in the worktree | Pre-existing, gitignored | Rebuilt by `npm test`/`npm run build`; not committed | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None. Windows path behavior (API-12) was not tested: a residual platform risk, not a user-only check.
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review of the added durable test)
- Notes: SCN-007 and queued-`maxWait` P2028 behaved as documented (reused IMP-14) and are not failures. The root-only `test:package` failure is pre-existing on 1.0.10 and is outside this ticket (FU-005).

# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/api-e2e-test-progress.md`
- Round and trigger: round 1; code review pass CRR-001 (code `c97eab8`)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why: API-07 dropped the `apps/legacy` CJS workspace app (CJS is proven by API-03 and IMP-08; a CJS workspace adds no new boundary). API-14 (Node 20) added. Both are recorded in the investigation.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `c97eab8` library + this round's test changes, uncommitted (the final API-03 run had exactly `6c950bd`'s code; API-01, API-02 and API-04 ran before the smoke-summary and TESTING.md edits, which those commands do not use) | macOS Darwin 25.5.0 | Node v22.23.1, npm 10.9.8, TypeScript 5.9.3, vitest 4.1.12 | Non-root user `normy`; SQLite files in temp dirs and `test.db` |
| ENV-2 | Packed tarball of the same tree (library `dist` identical to `c97eab8`) installed into `/tmp/rp3-api/mono` | macOS Darwin 25.5.0 | Node v22.23.1, npm 10.9.8; workspace TypeScript 5.9.3 and esbuild 0.25; TypeScript 5.4.5 for API-06 | npm workspaces, `npm install` without `--legacy-peer-deps`; README schema/`prisma.config.ts`/`db.ts`; `skipLibCheck: true`; SQLite `app.db` from `prisma db push` |
| ENV-3 | `6c950bd` via `git archive` | Linux x64 container `node:24-bookworm` (linux/amd64), user `node` (uid 1000) | Node v24.22.2, npm 11.19.1 | `CI=true`; `npm ci --strict-allow-scripts` |
| ENV-4 | `6c950bd` via `git archive` | Linux x64 container `node:20-bookworm` (linux/amd64), user `node` | Node v20.20.2, npm 10.8.2 | `CI=true`; `npm ci` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-008, AC-011, AC-013, REQ-003 | Default + registered typecheck programs, program-content check | `npm run typecheck` (worktree root) | ENV-1 | Pass | `API-01-typecheck.log` | `{"result":"pass","registeredProgramFiles":{"examples/prisma-client-generator":2,"src/tests/prisma-client-generator":2}}`, `exit=0` | T1..T15 compile in the default program; the new test file is in the registered program (2 files; it was 1) and its `@ts-expect-error` lines hold |
| API-02 | AC-002..AC-005, AC-008..AC-010, DC-001 | Whole library, vitest, real SQLite, real generated client | `npm test` (worktree root) | ENV-1 | Pass | `API-02-npm-test.log` | `Test Files  16 passed (16)`, `Tests  147 passed (147)`, `exit=0` | 144 earlier + 3 new (API-04) |
| API-03 | AC-001, AC-002, AC-004..AC-007, AC-009, AC-010, AC-013, REQ-001, QR-002 | Packed tarball, consumers ESM/CJS, declarations, interop | `npm run test:package` as `normy` (uid 501) | ENV-1 | Pass | `API-03-test-package.log` | `"noClientOnImport":"pass"`, `"readonlyWal":"pass"`, `"prismaClientGenerator":"pass"`, `"registeredConsumerTypes":["nodenext","node16","bundler","cjs-node16"]`, interop `{"result":"pass",...}`, `exit=0` | Run twice: the first run passed before the summary listed the consumer modes; the logged run is the second |
| API-04 | AC-009, AC-010, REQ-005, REQ-006 (SCN-A4) | Public API with the real generated client and real SQLite | `DATABASE_URL=file:$PWD/test.db npx vitest run src/tests/prisma-client-generator/registration-recovery.test.ts --reporter=verbose` | ENV-1 | Pass | `API-04-registration-recovery.log`, `API-04-mutation-control.log` | 3 `✓` lines (`registers after initializePrisma failed for a missing client...`, `accepts a different client after initializePrisma failed to connect...`, `accepts a different client after the first lazy use failed...`), `Tests  3 passed (3)`; control: `Tests  3 failed (3)` with `throw new PrismaInitializationError('PRISMA_CLIENT_CONFLICT')` | New durable test. Control: refusing registration in `failed` makes all 3 fail (restored after) |
| API-05 | AC-006, AC-013, QR-002 | Consumer `tsc` against the packed declarations | Part of API-03: registered consumer (valid code + `@ts-expect-error` for unknown field, delegate, model, isolation level, different object) and missing-declaration consumer, each under `NodeNext`, `Node16`, `Bundler`, and a CommonJS `Node16` consumer of the `moduleFormat = "cjs"` client | ENV-1, ENV-3, ENV-4 | Pass | `API-03-test-package.log`, `API-13-linux-ci-parity.log`, `API-14-node20-linux.log` | `"registeredConsumerTypes":["nodenext","node16","bundler","cjs-node16"]` | Updated durable smoke. Each mode controls itself: an unused `@ts-expect-error` fails `tsc`, and the missing-declaration file must fail with TS2345 and the declaration text |
| API-06 | AC-006, AC-013, QR-002 (SCN-A5) | Consumer `tsc` 5.4.5 | `run.sh` section `API-06 TypeScript 5.4`: `tsc` 5.4.5 on `@acme/db`, `apps/api` (nodenext), `apps/worker` (bundler), plus both controls | ENV-2 | Pass | `API-07-monorepo-journey.log`, `API-07-excerpt.log` | `Version 5.4.5`; db/api/worker `exit=0`; control `controls/missing-declaration.ts(5,22): error TS2345 ... 'MissingTypeDeclaration'` naming the declaration, `exit=2`; control `src/no-db-import.ts(9,3): error TS2578` (3 lines), `exit=2` | Temporary probe; the generated client also compiles with 5.4 |
| API-07 | AC-001, AC-002, AC-004..AC-006, AC-013, REQ-002, REQ-009 (SCN-A1, SCN-A2) | npm-workspaces monorepo from the packed tarball: `@acme/db` (README schema, `prisma.config.ts`, README `db.ts` as package entry, compiled with declarations), `apps/api` (ESM, nodenext, compiled), `apps/worker` (bundler resolution, `@acme/db` source via `customConditions`, esbuild bundle) | `evidence/API-07-probe/run.sh <tarball> /tmp/rp3-api` (`npm install`, `prisma generate`, `prisma db push`, `tsc`, `node`, `esbuild`) | ENV-2 | Pass | `API-07-monorepo-journey.log`, `API-07-excerpt.log`, `API-07-probe/` (sources and script) | One `./node_modules/repository_prisma/package.json`; no `node_modules/.prisma/client`; emitted `dist/index.d.ts` keeps `client: typeof generated;`; api program lists `packages/db/dist/index.d.ts`, worker program lists `packages/db/src/index.ts`; `api-main {"journal":"wal","rows":[{"id":1,"email":"ada@mono.test","posts":[{"id":1,"title":"Hello","authorId":1}]}],"models":"User"}`; `worker-bundle [{"title":"Hello"},{"title":"From the bundle"}]`; no-db-import control 3 × `TS2578`, `exit=2` | The declaration reaches the app through the workspace package's compiled `.d.ts` and through its source; it reaches only programs that import the package (control). Rows show the rolled-back and `@Transactional` emails are absent. The bundle contains the library (`registerPrismaClient occurrences: 4`) |
| API-08 | AC-009, REQ-005, README step 4 (SCN-A3) | App import order | `run.sh` section `API-08 load order`: `node dist/wrong-order.js` (repository module reading `Models.User` imported before `@acme/db`), then `node dist/readme-order.js` (same order, README naming) | ENV-2 | Pass | `API-07-monorepo-journey.log`, `API-07-excerpt.log` | `PrismaInitializationError: No generated Prisma client is available. Run \`prisma generate\`, or pass the client your prisma-client generator created to registerPrismaClient().` with `code: 'PRISMA_CLIENT_UNAVAILABLE'`, `exit=1`; then `readme-order 1`, `exit=0` | Message has no path (paths appear only in Node's stack trace). The README-documented behavior holds |
| API-09 | AC-011, AC-012, DEC-007 | Docs and manifest | `git show c97eab8:package.json` / `0a4e824:package.json`; `git diff` of `package.json`; `git tag --contains c97eab8`; README/DESIGN/CHANGELOG greps | ENV-1 | Pass | `API-09-docs-review.log` | `{"version":"2.0.0","peerDependencies":{"@prisma/adapter-better-sqlite3":"^7.10.1","@prisma/client":"^7.10.1"}}` on both commits; only the `typecheck` line differs; `tags-containing-count=0`; README `### Using the prisma-client generator` with schema, `registerPrismaClient(generated)`, `interface PrismaClientRegistry`, `Import it first`, `Prisma.ModelName`, `skipLibCheck`; DESIGN `### DC-002`; CHANGELOG `## Unreleased` | The example's compilation is in API-01 |
| API-10 | AC-011, AC-013, DC-002 | Typecheck program negative controls | Reused `IMP-06` | — | Pass | — | — | `tsconfig*.json` and `check-typecheck-programs.js` are unchanged since `c97eab8`; API-01 shows the checker counts the new file |
| API-11 | BEH-001, AC-001 | P1 reproduction on base, import after the change | Reused `IMP-01`, `IMP-02` | — | Pass | — | — | Base reproduction is fixed history; the import path is unchanged since `c97eab8`, and API-03 `noClientOnImport` reran the assertion |
| API-12 | REQ-009, AC-002, AC-007, AC-011, AC-013 | README fresh consumers ESM (nodenext) and CJS (node16) | Reused `IMP-08` | — | Pass | — | — | Ran on a packed tree equal to `c97eab8`; library and README are unchanged; API-07 repeated the README setup in a workspace |
| API-13 | AC-008, REQ-008, REQ-010 | CI steps on Linux x64, non-root | `git archive 6c950bd \| docker run -i --rm --platform linux/amd64 -e CI=true --user node node:24-bookworm bash -c '<npm ci --strict-allow-scripts; typecheck; test; build; smoke; interop>'` | ENV-3 | Pass | `API-13-linux-ci-parity.log` | `id: uid=1000(node)`, `node v24.22.2 npm 11.19.1`, `"src/tests/prisma-client-generator":2`, `Tests  147 passed (147)`, `"registeredConsumerTypes":["nodenext","node16","bundler","cjs-node16"]`, `ALL-STEPS-OK`, `exit=0` | Strict install needed no new approval |
| API-14 | AC-008, REQ-007, REQ-008 | Lowest engines range (Node ^20.19) | `git archive 6c950bd \| docker run ... node:20-bookworm bash -c '<npm ci; test; build; smoke; interop>'` | ENV-4 | Pass | `API-14-node20-linux.log` | `node v20.20.2 npm 10.8.2`, `Tests  147 passed (147)`, `"prismaClientGenerator":"pass"`, `"readonlyWal":"pass"`, `ALL-STEPS-OK`, `exit=0` | Added during execution |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-03 (`noClientOnImport`, prisma-client consumer `prismaClientFiles()` empty), API-07 (no `.prisma/client`, app imports and runs), API-11 | Proven | — |
| AC-002 | Yes | API-02 (registered-client WAL + `PRAGMA database_list`), API-03, API-07 (`"journal":"wal"`), API-12 | Proven | — |
| AC-003 | Yes | API-02 (`binds the registered client lazily from DATABASE_URL`) | Proven | — |
| AC-004 | Yes | API-02, API-03, API-07 (isolation level, rollback, `@Transactional` rollback with real decorator syntax) | Proven | — |
| AC-005 | Yes | API-02, API-03, API-07 (`"models":"User"`, `forModel(Prisma.ModelName.User)`) | Proven | — |
| AC-006 | Yes | API-05 (4 consumer settings), API-06 (TS 5.4), API-07 (workspace declaration; no-import control) | Proven | — |
| AC-007 | Yes | API-03 (`moduleFormat = "cjs"` client through the CJS build), API-05 (`cjs-node16` types), API-12 | Proven | — |
| AC-008 | Yes | API-01 (T1..T15), API-02, API-03, API-13, API-14 | Proven | — |
| AC-009 | Yes | API-02 (`missing-client`, `client-registration`), API-03 (real missing output, `onDiagnostic` cause `MODULE_NOT_FOUND`), API-04, API-08 | Proven | — |
| AC-010 | Yes | API-02 (conflict in lazy/initializing/ready/shutting-down, malformed `TypeError`), API-03, API-04 (accepted after a failed init/lazy use, real client; mutation control) | Proven | — |
| AC-011 | No | API-01 (example compiles), API-09, API-12 | Proven | — |
| AC-012 | No | API-09 | Proven | — |
| AC-013 | Yes | API-01, API-05 (4 settings), API-06 (TS 5.4), API-07 (`@acme/db` control), API-10 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | Every AC has direct cases: API-01..API-05, API-07..API-09 | AC-011 is a docs review | — |
| Changed-boundary execution directness | 95% | 97% | Real generated client, real SQLite, packed tarball, real npm install, real `tsc` per resolution mode, real bundle (API-02..API-07) | — | — |
| Cross-boundary integration realism and mock gap | 92% | 96% | vitest stubs only the default `@prisma/client` load; API-03 and API-07 have the real absence of prisma-client-js output; API-07 crosses workspace packages and esbuild | pnpm/yarn workspaces not run | pnpm workspace run (judged low value: augmentation is resolved by TypeScript given one library copy) |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | macOS Node 22/npm 10; Linux Node 24/npm 11 strict install (API-13); Linux Node 20 (API-14); TS 5.4 and 5.9 (API-06) | Windows not run | A Windows run (no environment; no path-specific code added) |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 96% | Missing client (stubbed and real), conflict in every state, malformed argument, recovery after failed init and failed lazy use with a real client + mutation control (API-04), load order (API-08), concurrent requests (API-02) | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | Library without UI; the developer-facing surface (compile errors, runtime errors) is scored above | — | — |
| Durable regression coverage quality and relevance | 94% | 95% | New durable recovery test with a negative control; smoke now covers 4 consumer settings in CI; existing tests still valid | Monorepo, bundled app and TS 5.4 are temporary probes (scripts kept in `evidence/API-07-probe/`) | Durable versions would need network installs per smoke run |

- Overall post-repository confidence: 93% (simple average of the six applicable categories)
- Overall final confidence: 96% (simple average of the six applicable categories)
- Calculation method: simple average of applicable categories (N/A excluded)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: Windows and pnpm/yarn workspaces not run; the bundler default path (RSK-002, prisma-client-js apps that bundle the library) is documented in README and was not exercised, because the registered path is the changed scenario and a prisma-client-js app bundling the library has the same `createRequire` limitation described in DESIGN.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Other` (fresh consumer workspace from the packed tarball, CLI builds and Node runs; Linux containers)
- Confidence gap or residual risk it addresses, and the expected gain: after the repository suites (93%), the open risks were consumer layouts the smoke cannot represent (monorepo declaration visibility, bundler resolution with a real bundle, oldest TypeScript), the documented load-order failure, and the Node 20 engines range. API-06, API-07, API-08 and API-14 closed them (96%).
- Browser validation needed, and why or why not: No. A Node library with no browser, renderer or session surface.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No` (the `default-package` source is the user-approved support of a current generator, DQ-002)
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (commit `6c950bd`)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `src/tests/prisma-client-generator/registration-recovery.test.ts` | Added | API-04 (run in API-02, API-13, API-14) | — |
| `scripts/package-smoke/consumer-types.js` | Updated (registered and missing-declaration consumers for `nodenext`, `node16`, `bundler`, `cjs-node16`; returns the list) | API-05 | — |
| `scripts/run-package-smoke.js` | Updated (summary field `registeredConsumerTypes`) | API-03, API-05 | — |
| `TESTING.md` | Updated (vitest and package smoke rows name the new coverage) | — | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| `@prisma/client` default load in `src/tests/prisma-client-generator/*` | `vi.mock('node:module')` makes `createRequire(...)('@prisma/client')` throw `MODULE_NOT_FOUND` | The repository has prisma-client-js output for its other suites; the stub stands for an app without it | None material: API-03 and API-07 run with the real absence |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/rp3-api` (tarball, monorepo workspace, TS 5.4 install, `app.db`) | Yes | `rm -rf /tmp/rp3-api` after the log was copied | Removed |
| `/tmp/lifecycle.ts.bak` and the API-04 mutation in `src/lib/client/lifecycle.ts` | Yes | Restored from the backup; `git diff -- src/lib` empty; backup removed | Restored |
| Docker containers (`node:24-bookworm`, `node:20-bookworm`) | Yes | `--rm` | None running |
| Package-smoke temp roots | Yes (by the smoke) | The smoke removes its temp root | Removed |
| `dist/`, `test.db` in the worktree | Yes (project-normal outputs) | Gitignored; left as the project's normal build/test outputs | Kept, not committed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (pass, `architectural_risk=High`: proportional test-code review)
- Notes: no follow-up was found. Code review's CR-C01 (`console.log(Models)` prints `{}`) was not re-raised: no AC covers debug output.

# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness/requirements.md`
- Investigation Notes: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness/investigation-notes.md`
- Design Spec: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness/design-spec.md`
- Supplemental Solution Artifacts: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness/initialization-api-contract.md`
- Design Review Report: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness/design-review-report.md`
- Implementation Handoff: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness/implementation-handoff.md`
- Code Review Report: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Source/architecture review passed; downstream durable API/E2E/packed validation requested by `code_reviewer`.
- Prior Investigation Reviewed: `N/A — first round`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The reviewed contract requires one lifecycle-owned, explicitly constructed root Prisma client; deterministic datasource precedence and cwd-relative physical SQLite normalization; physical SQLite `main` identity verification; strict WAL activation plus independent verification; safe classified failures with optional diagnostics and fail-closed recovery; conflict/shutdown/rebind semantics; invocation-time forwarding across lifecycle and ALS boundaries; non-SQLite/in-memory isolation; preservation of existing repository, decorator, higher-order, nested-transaction, filter, and provider behavior; and equivalent source, CJS, ESM, declaration, and installed packed-package surfaces. The lifecycle guarantee ends at exported forwarding boundaries and pre-invocation captured handles. Caller-created Prisma-derived surfaces and already-invoked provider return values remain caller-owned.

The implementation handoff reports `Directly Usable — No Migration`, no compatibility mechanism, and local source/build smokes only. The code review passed with no open source finding but identifies durable proxy, identity/platform, deterministic stage/lifecycle failure, provider-isolation, and shipped-surface coverage as the remaining risk.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Root datasource selection/construction | Changed | `REQ-RP-001`–`REQ-RP-003`; `AC-RP-001`–`AC-RP-003` | Exercise environment precedence, explicit override, missing/blank values, cwd-relative normalization, and actual opened identity. |
| Physical SQLite readiness | Added | `REQ-RP-005`–`REQ-RP-006`; `AC-RP-005`–`AC-RP-008` | Directly execute real SQLite identity/WAL success and deterministic classified failure stages. |
| Initialization failure/diagnostic/recovery contract | Changed | `REQ-RP-007`–`REQ-RP-008` | Verify safe public errors, opt-in raw cause, no default console leak, cleanup, blocked access, retry, and shutdown recovery. |
| Lifecycle conflict/concurrency/shutdown/rebind | Changed | `REQ-RP-009`; `AC-RP-009`–`AC-RP-010` | Exercise lazy conflict, same/different/stronger concurrent requests, stage shutdown, cleanup failure, repeated shutdown, and rebind. |
| Root/context forwarding | Changed | `REQ-RP-004`; `AC-RP-004` | Capture nested delegates/methods before invocation and prove current lifecycle/ALS owner, `this`, symbols, values, hooks, and non-thenability. |
| WAL/provider isolation | Changed | `AC-RP-011` | Prove non-WAL physical initialization does not mutate journal mode and non-SQLite/in-memory WAL rejects without SQLite SQL. |
| Existing repository/transaction/filter/provider behavior | Preserved | `AC-RP-012` | Retain all seven existing integration scenarios and inventory filter/provider coverage. |
| Built and installed public surface | Added proof obligation | `REQ-RP-010`; `AC-RP-013` | Build, execute both module formats, compile declaration consumer, inspect/install `npm pack`, and execute installed artifact. |
| Consumer data shape | Preserved | Persisted-data decision in design/handoff | Use a representative existing SQLite table/row through normal current reader without migration or destructive setup. |
| Revocation of derived/already-invoked Prisma values | Preserved guarantee limit | API contract/design/README | Do not add a false revocation assertion; a focused forwarding test will record that invoked returned values remain caller-owned. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Datasource target, lifecycle state, SQLite readiness, forwarding | Existing seven Vitest integration scenarios; implementation smokes | New contract is almost entirely uncovered durably | Real SQLite API/lifecycle tests plus injected deterministic tests |
| API / transport / contract | Yes | Exported Node package API and declarations | Typecheck/build, source review | Installed packed consumer and both loaders not durable | CLI child-process/package smoke |
| Frontend component / state | No | None | N/A | None | None |
| Browser integration / user journey | No | Node/Prisma library has no web surface | N/A | None | None |
| Authentication / session / permissions | No | None | N/A | None | None |
| Desktop renderer / web-equivalent UI | No | None | N/A | None | None |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | Yes | Initialization, failure, shutdown, rebind, concurrent operations | Implementation-only injected smoke | Stage matrix and cleanup failure are not durable | Vitest lifecycle injection and isolated child processes |
| Persisted-data transition | Yes, invariant only | Correct existing DB selected and read without migration | Handoff smoke | Normal reader with representative existing data should be durable | Real SQLite integration |
| Worker / queue / distributed coordination | No | Explicitly out of scope | N/A | Application-owned inter-process coordination remains outside package guarantee | None |
| External integration | Yes | Prisma 5.22 generated client and SQLite engine; npm package installation | Existing integration and build | Pack installation and shipped loader behavior | CLI/package smoke |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness`
- Project type and runtime stack: Node.js TypeScript library; Prisma Client/CLI 5.22; SQLite test datasource; Vitest 4; tsup CJS/ESM/declarations.
- Conflicting, missing, or unclear project instructions: None. README documents `npm test`; no dedicated coverage or packed smoke command exists yet. `npm test` mutates only the dedicated ignored test DB through `prisma db push` and regenerates the ignored local client.
- Required environment variables or secrets available: `N/A`; disposable SQLite paths only, no account or secret.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/AGENTS.md` | Closest repository instruction | README is primary usage/release guide; DESIGN owns architecture; releases are tag-based. |
| `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/README.md` | Usage/test/release authority | `npm test` performs schema sync/generate/tests; datasource precedence and strict readiness are documented; no release without tag flow. |
| `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/package.json` | Script/package authority | `npm test`, `npm run typecheck`, `npm run build`; exports select `dist/index.js`, `dist/index.mjs`, and `dist/index.d.ts`; package files are dist/README/DESIGN. |
| `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/scripts/run-tests.js` | Test environment authority | Normalizes `DATABASE_URL_TEST` or `file:./test.db`, runs `prisma db push --skip-generate`, `prisma generate`, then Vitest. |
| `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/prisma/schema.prisma` | Executable fixture schema | SQLite `User`/`Post`; no schema/migration change allowed. |
| `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tsup.config.ts` | Shipped build authority | CJS, ESM, declarations, sourcemaps; Node ES2018 target; Prisma/dotenv/uuid external. |
| `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tsconfig.json` | Source typecheck authority | Strict TypeScript over `src/**/*` and examples. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Generated Prisma client and dedicated test DB | Worktree root | `npm test` wrapper runs db push/generate | Uses ignored `test.db` unless isolated `DATABASE_URL_TEST` supplied | Prisma CLI success and Vitest start | `shutdownPrisma`; remove API/E2E-owned temp DBs only |
| Built package | Worktree root | `npm run build` | Writes ignored/generated `dist` | CJS/ESM/declaration files exist and smoke loads them | No process; `dist` is project build output and retained |
| Packed installed consumer | API/E2E-owned temp directory | `npm pack` then isolated `npm install` | No publish, tag, version, dependency, schema, or migration action | require/import/type consumer succeeds against installed package | Remove tarball/consumer/temp DB directory |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Current-schema CRUD and ALS data | `scripts/run-tests.js` schema push into dedicated `test.db`; tests create unique emails | Local ignored DB only | Existing tests delete rows and disconnect; test DB is project-owned existing fixture |
| Target/identity/WAL matrices | API/E2E creates unique `mkdtemp` SQLite files; direct PRAGMAs only | No consumer/shared DB; paths remain inside OS temp | Always shutdown and recursively remove owned temp directories |
| Existing-data direct-use row | Create minimal SQLite table/row in API/E2E-owned DB before initialization | No schema rewrite/migration; normal Prisma raw reader only for generic table | Remove owned temp DB after row read |
| Packed consumer peer client | Reuse the repository-generated Prisma 5.22 client for the isolated installed consumer | Exact locked generated client; no registry publish | Remove consumer symlinks/install with parent temp directory |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` “Persisted Data / State Transition Decision”; `implementation-handoff.md` “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: create an owned SQLite database/table/row before package initialization; initialize the current reader against the same physical file; read the existing row and verify identity without schema or record migration.
- Evidence planned for the approved direct-use outcome: durable real-SQLite public initialization test.
- Migration-specific completion/recovery scenarios: `N/A`
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `src/tests/integration.test.ts` decorator commit | Repository writes commit under decorator transaction | `AC-RP-004`, `AC-RP-012` | Still Valid | Approved transaction ownership unchanged; passed upstream | Retain and rerun |
| `src/tests/integration.test.ts` decorator rollback | Repository writes rollback on exception | `AC-RP-004`, `AC-RP-012` | Still Valid | ALS/decorator behavior explicitly preserved | Retain and rerun |
| `src/tests/integration.test.ts` HOF commit/rollback | Repository operations use HOF transaction | `AC-RP-004`, `AC-RP-012` | Still Valid | HOF remains public path | Retain and rerun |
| `src/tests/integration.test.ts` non-transaction operation/CRUD | Root repository operations work | `AC-RP-004`, `AC-RP-012` | Still Valid | Root path must remain usable | Retain and rerun |
| `src/tests/integration.test.ts` nested transaction flattening | Nested decorator reuses outer ALS transaction | `AC-RP-004`, `AC-RP-012` | Still Valid | Design preserves ALS ownership | Retain and rerun |
| `src/lib/filters.ts` behavior | No repository test currently observed for filter helpers | `AC-RP-012` | Needs Update | Acceptance criterion says existing filter behavior remains; no durable assertion exists in inventory | Add focused source test |
| Provider inference helpers | No repository test currently observed | `AC-RP-012` | Needs Update | Changed `database.ts` inference/selection participates in target resolution | Add focused source test |
| Initialization/lifecycle/identity/WAL/forwarding/package contract | No durable coverage | `AC-RP-001`–`AC-RP-011`, `AC-RP-013` | Replace (implementation smoke as evidence only) | Upstream checks were temporary implementation smokes, not repository regression coverage | Add durable files/scripts below |

## Stale Or Obsolete Coverage Decisions

None. No existing scenario asserts the removed best-effort WAL or implicit generated-client datasource behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `E2E-RP-001` | Environment precedence, explicit override, missing/blank selection, actual opened identity | `AC-RP-001`–`AC-RP-003` | `src/tests/public-initialization.test.ts` | Direct real root boundary evidence for the original defect and corrected selection. |
| `E2E-RP-002` | Relative/absolute path, spaces, literal percent, query, symlink/canonical identity, non-leakage | `REQ-RP-003`, `AC-RP-003`, `AC-RP-008` | `src/tests/public-initialization.test.ts`, `src/tests/datasource-readiness.test.ts` | Identity rules are security/correctness critical and platform-sensitive. |
| `E2E-RP-003` | Repository/root/context/getClient/decorator/HOF/nested convergence and ALS invocation-time forwarding | `AC-RP-004`, `AC-RP-012` | Existing integration plus `src/tests/public-initialization.test.ts` | Proves context proxy handles resolve transaction owner at invocation. |
| `E2E-RP-004` | Real physical WAL success, independent read, non-WAL journal preservation | `AC-RP-005`, `AC-RP-011` | `src/tests/public-initialization.test.ts` | Real SQLite provider boundary is available locally and must be used. |
| `E2E-RP-005` | Connection/identity/WAL activation/WAL verification failures, safe diagnostics/output, cleanup, blocked access, corrected retry | `AC-RP-006`–`AC-RP-008` | `src/tests/client-lifecycle.test.ts`, public child-process failure smoke | Deterministic dependency injection is required for every stage; one real provider failure checks output policy. |
| `E2E-RP-006` | Lazy conflict/no-second-file, shutdown/rebind, captured root handle follows replacement | `AC-RP-009`–`AC-RP-010` | `src/tests/public-initialization.test.ts` | Directly proves lifecycle identity and the stale-handle bug fix. |
| `E2E-RP-007` | Non-SQLite and memory provider isolation; WAL unsupported before SQL | `AC-RP-011` | `src/tests/client-lifecycle.test.ts`, `src/tests/datasource-readiness.test.ts` | Real external servers are not required to prove the lifecycle's no-PRAGMA sequencing. |
| `E2E-RP-008` | Same/different/stronger initialization, shutdown during stages, repeated shutdown, cleanup failure, retry | API contract concurrency table; design state machine | `src/tests/client-lifecycle.test.ts` | Lifecycle interleavings require deterministic deferred fakes. |
| `E2E-RP-009` | Nested reflection, current `this`, symbols, values, non-thenability, hooks, caller-owned returned-value limit | `AC-RP-004`; documented guarantee limit | `src/tests/forwarding-proxy.test.ts` | Reflective forwarding is the highest code-review runtime risk. |
| `E2E-RP-010` | Provider/filter and current seven integration regressions | `AC-RP-012` | Existing integration plus `src/tests/database-filter.test.ts` | Changed metadata and preserved helpers need durable relevance. |
| `E2E-RP-011` | Built CJS/ESM runtime and declaration parity | `AC-RP-013` | `scripts/run-package-smoke.js` and `npm run test:package` | Source tests do not prove shipped entrypoints. |
| `E2E-RP-012` | `npm pack` contents, isolated install, require/import, types, real SQLite | `AC-RP-013` | `scripts/run-package-smoke.js` and `npm run test:package` | Package metadata/exports/dependencies must be exercised as installed. |
| `E2E-RP-013` | Representative existing SQLite data is directly readable without migration | Persisted-data decision; `REQ-RP-010` | `src/tests/public-initialization.test.ts` | Directly validates the approved no-migration outcome. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `E2E-RP-003`/`E2E-RP-010` | `src/tests/integration.test.ts` | Retain assertions; add only focused context-handle checks if they fit coherently | `AC-RP-004`, `AC-RP-012` | Prefer separate lifecycle/public files to keep current CRUD suite readable. |
| `E2E-RP-011`/`E2E-RP-012` | `package.json` scripts | Add a non-release package smoke command run after build | `AC-RP-013` | No version/dependency/publication change. |

## Durable Coverage To Remove

None.

Coverage implementation completed as planned. Added durable paths are `src/tests/client-lifecycle.test.ts`, `src/tests/datasource-readiness.test.ts`, `src/tests/forwarding-proxy.test.ts`, `src/tests/public-initialization.test.ts`, `src/tests/database-filter.test.ts`, and `scripts/run-package-smoke.js`; `package.json` adds the self-contained `test:package` script. No existing durable test was edited, disabled, or removed.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `npx vitest run src/tests/client-lifecycle.test.ts src/tests/forwarding-proxy.test.ts src/tests/datasource-readiness.test.ts src/tests/database-filter.test.ts` and focused interleaving rerun | Worktree; test-owned temp SQLite/fakes | Narrow lifecycle, target, forwarding, metadata/filter coverage; corrected test-only macOS `/var` alias expectation | Pass | `tickets/in-progress/explicit-datasource-strict-wal-readiness/evidence/focused-tests-final.log`; `focused-interleavings.log` |
| 2 | `npm test` | Worktree; documented wrapper ran schema sync, generate, and Vitest | All 62 tests: seven existing plus 55 new real/injected scenarios | Pass | `tickets/in-progress/explicit-datasource-strict-wal-readiness/evidence/npm-test-final.log` |
| 3 | `npm run typecheck` | Worktree | Strict source/tests/examples type surface | Pass | `tickets/in-progress/explicit-datasource-strict-wal-readiness/evidence/typecheck-final.log` |
| 4 | `npm run build` | Worktree | CJS, ESM, source maps, `.d.ts`, `.d.mts` | Pass | `tickets/in-progress/explicit-datasource-strict-wal-readiness/evidence/build.log` |
| 5 | `npm run test:package` | Worktree; classified as required broader executable coverage after repository score | Fresh build, pack, isolated install, CJS/ESM/types, live WAL/safe failures | Pass | Recorded in execution report; `tickets/in-progress/explicit-datasource-strict-wal-readiness/evidence/package-smoke-authoritative.log` |
| 6 | `git diff --check` | Worktree | Patch hygiene | Pass | `tickets/in-progress/explicit-datasource-strict-wal-readiness/evidence/git-diff-check.log` (empty because clean) |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | `npm test` directly proves datasource precedence/override, cwd identity, proxy/ALS, strict WAL, failures/recovery, provider sequencing, regressions, and direct-use data | `AC-RP-013` installed packed surface remained outside repository suite at this gate | Run the selected packed-installed consumer |
| Changed-boundary execution directness | 96% | Real Prisma/SQLite public API plus deterministic lifecycle/readiness/forwarding boundaries; 62 tests passed | Real Windows filesystem execution unavailable | Windows CI could improve platform proof |
| Cross-boundary integration realism and mock gap | 92% | Real generated Prisma client, SQLite engine, filesystem, ALS, repositories/decorators/HOF and source public API | Built loaders and installed package not yet crossed; non-SQLite server is intentionally spied | Run packed CJS/ESM consumer; live non-SQLite is not needed for no-PRAGMA sequencing |
| Environment, configuration, identity, and fixture fidelity | 94% | Real cwd-relative files, spaces, literal percent, query, symlink, macOS canonical alias, read-only SQLite, existing row; Windows drive/UNC pure rules emulated | Real NTFS/UNC unavailable | Windows CI runner |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | All classified stages, listener failure, cleanup failure, failed access, retry, conflicts, same/different/stronger requests, repeated shutdown, and shutdown during connect/identity/activation/verification | No material lifecycle gap observed | None required for current host/scope |
| User-surface, browser, and desktop-shell confidence | N/A | No browser/UI/desktop surface exists | None | N/A |
| Durable regression coverage quality and relevance | 96% | Five focused Vitest files plus one package harness add 55 requirement-linked scenarios without changing/removing the seven valid existing scenarios | Real Windows assertions remain environment-conditional/emulated | Windows CI matrix if project supports it |

- Overall post-repository confidence: `94.8%` (`569 / 6`)
- Calculation method: simple average of six applicable categories; UI/browser/desktop category excluded as genuinely inapplicable.
- Every critical acceptance criterion directly proven: `No — AC-RP-013 packed-installed proof remained for broader execution`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `No — 94.8% before broader package execution`
- Material residual risks: installed artifact/loader/declaration parity (selected for broader execution) and real Windows Prisma/filesystem execution.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `CLI` plus `Lifecycle` plus installed-package `Other`
- Specific confidence gap or residual risk addressed: repository source tests alone cannot prove built loader selection, declarations, packed contents/installation, isolated consumer resolution, or process-level safe output.
- Why the selected mode can materially improve confidence: it crosses the actual Node package, Prisma generated-client, filesystem/SQLite, module-loader, declaration, and npm-install boundaries.
- Expected confidence after the selected validation: `>=95% overall with no category below 90%, if all critical scenarios pass; achieved 96.5% in the execution report.`
- Browser-specific decision and rationale: Browser validation is not applicable; this package has no frontend, browser API, or web-equivalent desktop surface.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `N/A`
- If `Blocked`, exact dependency or access: `N/A`

## Desktop Application Validation Decision (When Applicable)

`N/A — not a desktop application.`

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: build; pack to an API/E2E-owned temporary directory; create isolated consumer; install tarball without lifecycle scripts/publish; supply the repository-generated Prisma 5.22 peer; run CJS, ESM, and TypeScript consumer checks.
- Environment choices that materially affect the run: OS temp directories; explicit absolute SQLite file URLs; no remote service, credentials, shared port, or shared database.
- Health / readiness checks: package install exits zero; expected files/exports exist; initialization resolves; `PRAGMA database_list` and `PRAGMA journal_mode` match; shutdown exits.
- Seed data / fixtures: one existing SQLite table/row for direct-use evidence; current generated Prisma client for installed package peer.
- Test identities, authentication, permissions, or session state: `N/A`.
- Requirement-linked journeys or scenarios: `E2E-RP-005`, `E2E-RP-011`, `E2E-RP-012`, `E2E-RP-013`.
- Evidence to capture: command logs, pack JSON/content list, consumer outputs, TypeScript exit, temp cleanup result.
- Owned processes and temporary state to clean up: child Node processes, pack tarball, isolated consumer `node_modules`, temp databases/directories.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `E2E-RP-WIN-001` | Vitest temporarily selected the Win32 path implementation and platform branch | Drive and UNC client spelling plus case-folded internal binding keys | This emulation is retained durably because it protects pure rules, but it does not replace real NTFS/UNC execution. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real Windows Prisma/NTFS drive, UNC, and case execution | Current assigned host is macOS; no Windows runner or UNC share is available locally | Bounded platform residual around physical canonicalization; pure path logic can be emulated but not fully proven | Record confidence impact; recommend CI Windows matrix if maintained by project |
| Real PostgreSQL/MySQL/etc. connection | No service is required to prove that WAL rejects before connect/PRAGMA; provider connectivity itself was not changed | Negligible for scoped WAL isolation; explicit URL remains provider binding identity | Deterministic client spy proves sequencing; no live server needed |
| Caller-created `$extends`/already-invoked value revocation | Explicitly outside guarantee | None if documentation stays scoped | Preserve guarantee limit; do not claim/test revocation |

## Ambiguities Or Reroute Triggers

None. Two initial failures were validated as test-only macOS `/var` versus `/private/var` canonical-path expectations and numeric SQLite raw-value typing; both were corrected locally before authoritative reruns. No source, requirement, or design issue was found.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — added five focused test files and one package harness; updated package scripts; removed none.`
- Post-repository confidence: `94.8%`
- Broader validation decision: `Required — CLI/lifecycle/packed installed consumer`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: No tag, publish, release, version, dependency, Prisma schema, migration, or consumer-data action is authorized or planned.

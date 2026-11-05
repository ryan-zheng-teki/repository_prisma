# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/requirements-doc.md` (SR-005, approved)
- Investigation Notes: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/design-spec.md` (SR-006)
- Supplemental Task Artifacts: `probes/README.md` (P1..P3), `probes/esm-app/*`, `probes/cjs-app/*`, `probes/registered-program/*`, `probes/type-equality.typecheck.ts` (evidence only)
- Design Review Report: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/design-review-report.md` (ARCH-REV-004, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/implementation-revision-record.md` (IR-001)
- Code Review Report: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/code-review-report.md` (CRR-001, Pass, no findings)
- Code Review Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md` in the ticket folder
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer pass, CRR-001 (code `c97eab8`, handoff/evidence `a330e2b`, base `0a4e824`)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

The library must import without any Prisma client module (REQ-001), accept the app's `prisma-client`-generated module once through `registerPrismaClient(generated)` and use it for every runtime feature (REQ-002), follow it in every public type once `PrismaClientRegistry { client: typeof generated }` is declared, with the call failing to compile without the declaration or with a different object (REQ-003), keep prisma-client-js apps unchanged in runtime and types (REQ-004), report a missing client as `PRISMA_CLIENT_UNAVAILABLE` and a different client while bound or binding as `PRISMA_CLIENT_CONFLICT`, accept a different client in `idle`/`failed`, and reject a malformed argument with `TypeError` (REQ-005, REQ-006), for ESM and CJS apps and both generated `moduleFormat`s (REQ-007), with docs (REQ-009) and unchanged peers (REQ-010). QR-002 requires registered types to be enforced with `skipLibCheck: true`, TypeScript >= 5.4 and `moduleResolution` `node16`/`nodenext`/`bundler`. Design DS-001..DS-005 trace these paths through `registerPrismaClient` -> `PrismaClientLifecycle` -> `PrismaClientSource`, `Models` through the facade accessor, and `prisma-types.ts` at compile time. Code review CRR-001 confirmed the implementation matches; its residual risks (bundler/node16 consumers, monorepo declaration visibility, re-registration after a failed `initializePrisma` with a real client, `Models.X` before `db.ts`) are planned below.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (prisma-client-js app), SCN-002 (ESM app on `prisma-client`), SCN-003 (CJS app, `moduleFormat = "cjs"`), SCN-004 (forgot to register), SCN-005 (switching clients).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1 (monorepo): the generated client and `db.ts` live in a workspace package (`@acme/db`) that the app package depends on; the app imports `@acme/db` first and uses `repository_prisma` directly. Trigger: npm workspaces install, `tsc` of each package, `node` run of the app. Risk: whether the `declare module 'repository_prisma'` block reaches the app's program and whether both packages resolve one `repository_prisma` copy.
  - SCN-A2 (bundler-style app): an app typed with `moduleResolution: bundler` that consumes a workspace package through its TypeScript source and is bundled with esbuild for Node. Trigger: `tsc --noEmit`, `esbuild --bundle`, `node` on the bundle. Risk: QR-002 `bundler` typing, and the registered path surviving bundling (RSK-002 says only the default path is affected).
  - SCN-A3 (load order): an app module that reads `Models.User` at evaluation time and is imported before `db.ts`. Trigger: entry file import order. Expected: startup fails with `PRISMA_CLIENT_UNAVAILABLE` (README step 4); the README's `Prisma.ModelName.User` form works in the same order.
  - SCN-A4 (recover after a failed start): an app that forgot to register sees `initializePrisma` fail, then registers and initializes without restarting the lifecycle by `shutdownPrisma()`; and an app whose initialization failed for a connection reason registers another client (REQ-006 "or a failed initialization"). Trigger: public API with the real generated client.
  - SCN-A5 (oldest supported TypeScript): a consumer on TypeScript 5.4 (QR-002 lower bound) with the declaration.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded by the designer. The implementer's hint "registered client with `@prisma/client` absent from `node_modules`" is not a supported setup: `@prisma/client` is a peer and the generated client itself imports `@prisma/client/runtime/client`, so the app cannot run without it. Not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 package import loads no client | Changed | REQ-001, P1, IMP-01/02 | Packed import safety (ESM/CJS) and prisma-client-only consumer import |
| BEH-002 registration, registered runtime and types | Added | REQ-002, REQ-003, REQ-007, DS-001..DS-005 | Real generated client against real SQLite in vitest and in the packed consumers (ESM/CJS); consumer `tsc` with negatives, across resolution modes and TS 5.4; monorepo and bundled apps |
| BEH-003 prisma-client-js unchanged | Preserved | REQ-004, T1..T15 | Existing suites, type-equality program, existing smoke steps |
| BEH-004 `PRISMA_CLIENT_UNAVAILABLE`, `PRISMA_CLIENT_CONFLICT`, `TypeError` | Added | REQ-005, REQ-006 | Stubbed and real missing client; conflict in every lifecycle state; recovery after failure with a real client |
| `Models` read-only view | Changed | DS-003 | View tests; registered `Models`; load-order journey |
| Build target es2020 + CJS `import.meta` shim | Changed | design build settings | Packed CJS/ESM runtime, interop, bundled-app journey |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Lifecycle registration rule, client source, `Models` view | vitest fake-module tests + registered real-client tests | Recovery after a failed init only with fake modules | Durable real-client test (API-04) |
| API / transport / contract | Yes | Public package API and declarations (`registerPrismaClient`, `PrismaClientRegistry`, codes) | Package smoke, consumer types (NodeNext ESM only) | `bundler`/`node16` resolution, CJS consumer types, TS 5.4, workspace packages | Durable smoke extension (API-05); fresh consumer journeys (API-06..API-08) |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | Library only | — | — | None |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Module load order (`createRequire` lazily), lifecycle states vs registration | Import-safety smoke; registered tests | App-level import order (`Models` before `db.ts`) | Journey (API-08) |
| Persisted-data transition | No | `Not Affected` (adapter, DateTime unchanged) | DateTime continuity suite | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Prisma 7 `prisma-client` generator output, `@prisma/client` peer, TypeScript, npm workspaces, esbuild | Real generator output in vitest and smoke | Monorepo layout, bundling, oldest TS | Journeys (API-06..API-08) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3`, branch `codex/repository-prisma-3-prisma-client-generator`
- Project type and runtime stack: TypeScript library (tsup CJS + ESM builds), Prisma 7.10 with SQLite through `@prisma/adapter-better-sqlite3`, vitest 4, TypeScript 5.9; Node `^20.19 || ^22.12 || >=24`
- Project testing guideline path(s): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/TESTING.md` (root; no closer `TESTING*.md`)
- Conflicting, missing, or unclear project instructions: none. Local npm is 10.9.8 (no `--strict-allow-scripts`); the strict install is CI-only and was checked by IMP-07 on Linux.
- Required environment variables or secrets available: `N/A` (no secrets; tests create their own SQLite files)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Testing guideline | `npm run typecheck`, `npm test`, `npm run test:package` (non-root); lifecycle changes need a concurrent-request test; README setup changes need a fresh consumer (packed tarball, no `--legacy-peer-deps`, README setup only, ESM and CJS); evidence in the ticket `evidence/` folder |
| `AGENTS.md` | Repo instructions | README is the usage guide; read TESTING.md first |
| `package.json` | Scripts | `typecheck` runs both programs + `scripts/check-typecheck-programs.js`; `test` = `scripts/run-tests.js` (db push, generate, vitest); `test:package` = build + `scripts/run-package-smoke.js` + interop |
| `tsconfig.json`, `tsconfig.prisma-client-generator.json` | Typecheck programs | Files under `src/tests/prisma-client-generator/` must be in the registered program only (checked) |
| `scripts/package-smoke/*.js` | Package smoke steps | `consumer-types.js` checks consumer declarations (NodeNext); `prisma-client-generator.js` builds the prisma-client consumer used by the registered type check |
| `README.md` "Using the prisma-client generator" | Consumer setup | Schema, `db.ts`, import first, `Prisma.ModelName`, `skipLibCheck: true` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repository suites | worktree root | `npm run typecheck`, `npm test`, `npm run test:package` | `test.db` at the root (gitignored); smoke uses a temp dir it removes | Command exit 0 | Smoke removes its temp root |
| Fresh consumers (journeys) | `/tmp/rp3-api/` (owned by this run) | `npm pack` of the worktree build; `npm install` (no `--legacy-peer-deps`); `prisma generate`; `prisma db push`; `tsc`; `esbuild`; `node` | Registry access for npm install | Exit codes and printed markers | `rm -rf /tmp/rp3-api` after evidence is copied |
| Linux CI parity | Docker `node:24-bookworm`, `--platform linux/amd64`, user `node` | `git archive` of the validated commit; `npm ci --strict-allow-scripts`; typecheck; test; build; smoke; interop | Container removed with `--rm` | `ALL-STEPS-OK` | `--rm` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| SQLite files | Tests create temp files (`mkdtemp`); journeys use `prisma db push` into their own temp dirs | Never an application database | Temp dirs removed |
| Generated `prisma-client` client | `prisma/schema.prisma` second generator -> `generated/prisma-client/` (gitignored); journeys run `prisma generate` in their own projects | — | Removed with the temp dirs |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`. The existing DateTime continuity and integration suites stay in `npm test`; no transition-specific case is needed.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `src/tests/prisma-client-generator/registered-client.test.ts` | Real generated client, real SQLite: WAL init, lazy bind, transactions, `Models`, conflict in lazy/initializing/ready, malformed `TypeError`, concurrent requests; default load stubbed to fail | AC-002..AC-005, AC-010, DC-001 | Still Valid | Code read; IMP-04 | Keep; run |
| `src/tests/client-registration.test.ts` | Source and lifecycle rules with fake modules, incl. different module after failed init | AC-009, AC-010, REQ-006 | Still Valid (fake modules: proves the rule, not the real client) | Code read | Keep; add real-client recovery (API-04) |
| `src/tests/missing-client.test.ts` | Stubbed default load: import ok, init rejects with cause on `onDiagnostic`, lazy then `CLIENT_NOT_READY`, `Models` throws | AC-009, QR-001 | Still Valid | Code read | Keep |
| `src/tests/models-view.test.ts` | `Models` view reads/keys/values/entries/`in`/spread; writes rejected | DS-003, AC-008 | Still Valid | Code read | Keep |
| `src/tests/type-equality.typecheck.ts` | T1..T15 identical to 2.0.0 for prisma-client-js | AC-008 | Still Valid | IMP-03 mutation note | Keep |
| `src/tests/*` (113 pre-existing) | 2.0.0 behavior | AC-008, BEH-003 | Still Valid (constructor call sites updated mechanically) | Code review | Keep |
| `examples/prisma-client-generator/{db,demo}.ts` | README setup compiles in the registered program | AC-011, AC-013 | Still Valid | IMP-03, IMP-06 | Keep |
| `scripts/check-typecheck-programs.js` | Registered files are in the registered program only | AC-011, AC-013, DC-002 | Still Valid | IMP-06 negative controls | Keep; it will also guard the new test file |
| `scripts/package-smoke/import-safety.js` | No `@prisma/client` request/cache, no native addon on import (ESM/CJS) | AC-001, REQ-001 | Still Valid | IMP-05 + base-build negative | Keep |
| `scripts/package-smoke/prisma-client-generator.js` | Packed package in a prisma-client-only consumer, ESM and `moduleFormat = "cjs"` clients through ESM and CJS builds: missing client, `TypeError`, WAL, CRUD, `Models`, transactions, conflict, nothing loaded from `@prisma/client` | AC-001, AC-002, AC-004, AC-005, AC-007, AC-009, AC-010 | Still Valid | Code read | Keep |
| `scripts/package-smoke/consumer-types.js` | prisma-client-js consumer (Node16); registered consumer with negatives and missing-declaration error, `NodeNext` ESM only | AC-006, AC-013, QR-002 | Needs Update | QR-002 names `node16` and `bundler` too; CR residual risk | Extend to `Node16` ESM, `Bundler`, and a CJS consumer (API-05) |
| `scripts/package-smoke/{packed-artifact,logging-policy}.js` | Declaration text checks; logging policy in both formats | AC-006, BEH-003 | Still Valid | IMP-05 | Keep |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-008, AC-011, AC-013, REQ-003 | Both typecheck programs + program-content check (incl. the new test file) | Existing Test | `npm run typecheck` on the validated commit | Rerun: the new durable test file joins the registered program |
| API-02 | AC-002..AC-005, AC-008..AC-010, DC-001 | Library, vitest (real SQLite, real generated client) | Existing Test | `npm test` | Rerun with the new durable test |
| API-03 | AC-001, AC-002, AC-004..AC-007, AC-009, AC-010, AC-013, REQ-001, QR-002 | Packed tarball, consumers ESM/CJS, declarations | Existing Test | `npm run test:package` as non-root user `normy` | Rerun with the extended consumer-types step |
| API-04 | AC-009, AC-010, REQ-005, REQ-006 (SCN-A4) | Public API with the real generated client and real SQLite | Durable | `npx vitest run src/tests/prisma-client-generator/registration-recovery.test.ts` (with `DATABASE_URL` set as `npm test` does) | Recovery after a failed init was only proven with fake modules |
| API-05 | AC-006, AC-013, QR-002 | Consumer `tsc` against packed declarations | Durable | Part of `npm run test:package`: registered + missing-declaration checks under `NodeNext`, `Node16` (ESM), `Bundler`, and a CJS consumer (`Node16`, `moduleFormat = "cjs"` client) | QR-002 names three resolution modes; the smoke only ran NodeNext ESM |
| API-06 | AC-006, AC-013, QR-002 (SCN-A5) | Consumer `tsc` 5.4 against packed declarations | Temporary Probe | In the API-07 workspace: `typescript@5.4` compiles the app and the negative/missing-declaration files | A TS 5.4 install in the repo smoke would need a network download per run; one measurement is enough for the lower bound |
| API-07 | AC-001, AC-002, AC-004..AC-007, AC-013, REQ-009 (SCN-A1, SCN-A2) | Fresh npm-workspaces monorepo from the packed tarball: `@acme/db` (generated client + `db.ts`, compiled with declarations), `apps/api` (ESM, NodeNext, compiled), `apps/worker` (bundler resolution, `@acme/db` source via a custom condition, esbuild bundle) | Journey | `npm install` (no `--legacy-peer-deps`), `prisma generate`, `prisma db push`, `tsc -b`/`tsc --noEmit` per package, `@ts-expect-error` negatives in the apps, missing-declaration control, `node` runs, `esbuild` bundle run | Real layouts that the repo smoke cannot represent; README setup in a workspace |
| API-08 | AC-009, REQ-005, README step 4 (SCN-A3) | App import order | Journey | In `apps/api`: entry that imports a `Models.User` repository module before `@acme/db` -> process fails with `PRISMA_CLIENT_UNAVAILABLE`, safe message; same order with `Prisma.ModelName.User` works | Documented behavior, never executed as a scenario |
| API-09 | AC-011, AC-012, DEC-007 | Docs and manifest | Temporary Probe (review) | `git diff 0a4e824..HEAD -- package.json CHANGELOG.md README.md DESIGN.md TESTING.md`; `git tag --contains c97eab8` | Review criteria |
| API-10 | IMP-06 | DC-002 negative controls | Reused | IMP-06 | `tsconfig*.json` and `check-typecheck-programs.js` are unchanged since `c97eab8`; API-01 reruns the positive check |
| API-11 | IMP-01, IMP-02 | P1 reproduction on base and fix | Reused | IMP-01, IMP-02 | Base reproduction does not change; the import path is unchanged since IMP-02 and API-03 import-safety reruns it |
| API-12 | IMP-08 | README fresh consumers ESM/CJS (NodeNext/Node16) | Reused | IMP-08 | Ran on the packed tree equal to `c97eab8`; library code unchanged since; API-07 repeats the README setup in a workspace |
| API-13 | AC-008, REQ-008, REQ-010 | Linux x64 CI steps as non-root | Existing Test | `git archive <validated commit>` into `node:24-bookworm` as `node`: `npm ci --strict-allow-scripts`, typecheck, test, build, smoke, interop | Rerun on the commit with the new durable tests (IMP-07 ran on `c97eab8`) |
| API-14 | AC-008, REQ-007, REQ-008 | Lowest engines range (Node ^20.19) on Linux x64 as non-root | Existing Test | `git archive <validated commit>` into `node:20-bookworm` as `node`: `npm ci`, test, build, smoke, interop | Added during execution: the change adds `createRequire(import.meta.url)`, es2020 and the CJS shim, and no check had run on Node 20 |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-04 | `src/tests/prisma-client-generator/registration-recovery.test.ts` | REQ-006 ("after a failed initialization a different client is accepted") and SCN-004 recovery with the real generated client; starts unregistered, so it cannot live in `registered-client.test.ts`, which registers at load |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-05 | `scripts/package-smoke/consumer-types.js` | Run the registered and missing-declaration consumers under `NodeNext`, `Node16` and `Bundler`, plus a CJS (`Node16`, `"type": "commonjs"`) consumer of the `moduleFormat = "cjs"` client | Uses the clients `prisma-client-generator.js` already generates; no new download |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: build and `npm pack` the validated commit into `/tmp/rp3-api/pack/`; create `/tmp/rp3-api/mono` workspace; `npm install`; `npx prisma generate` and `npx prisma db push` per db package; `tsc` per package; run apps with `node`; bundle the worker with the repo's esbuild.
- Environment choices that materially affect the run: macOS, Node 22.23.1, npm 10.9.8, non-root; TypeScript 5.9 (and 5.4 for API-06); `skipLibCheck: true` (README).
- Health / readiness checks: exit codes and printed markers.
- Seed data / fixtures: empty SQLite files created by `prisma db push` in the workspace.
- Test identities, authentication, permissions, or session state: none.
- Requirement-linked journeys or scenarios: SCN-A1..SCN-A5 above.
- Evidence to capture: full command transcripts with headers in `evidence/API-*.log`; probe sources in `evidence/API-07-probe/`.
- Owned processes and temporary state to clean up: `/tmp/rp3-api` (removed after evidence is copied); no long-running processes.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Registered client with `@prisma/client` absent | Not a supported setup (peer; generated code imports `@prisma/client/runtime/client`) | None for supported use | No | None |
| pnpm/yarn workspaces | npm workspaces chosen as the representative layout; README install guidance for pnpm is unchanged by this ticket | Low: augmentation is resolved by TypeScript, not the package manager, given one `repository_prisma` copy | No | None |
| Windows | No environment | Low: no path-specific code added | No | None |
| Published-package consumer | Nothing is published in this ticket (DEC-007) | — | No | Delivery/release |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-04 added, API-05 updated)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the reused implementation checks (API-10..API-12) keep their evidence in the implementation handoff's Checks Run.
- Plan changes during execution: API-07 dropped the planned `apps/legacy` CJS workspace app (CJS consumers are proven by API-03's packed CJS runtime and CJS consumer types, and by IMP-08's fresh CJS consumer; a CJS workspace adds no new boundary); API-14 (Node 20) added.

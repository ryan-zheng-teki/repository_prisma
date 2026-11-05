# Implementation Handoff

Ticket `prisma-client-generator` (Project Task `repository-prisma-3`). Worktree `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3`, branch `codex/repository-prisma-3-prisma-client-generator`, base `origin/main` `0a4e824`. Implementation commit `c97eab8`; evidence and these documents are in the commit after it on the same branch.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium / High); ARCH-REV-004 Pass. Handoff rule: `architectural_risk=High` -> `/software_engineering_team/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/requirements-doc.md` (SR-005, approved)
- Investigation notes: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/design-spec.md` (SR-006)
- Supplemental task artifacts: `probes/README.md` (P1..P3), `probes/type-equality.typecheck.ts`, `probes/registered-program/*` (evidence only)
- Design review report: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/design-review-report.md` (ARCH-REV-004, round 4)
- Architecture review revision record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial round)

## Current Implementation Summary

Apps on Prisma 7's `prisma-client` generator call `registerPrismaClient(generated)` once and declare `PrismaClientRegistry { client: typeof generated }`; every runtime feature and public type then follows that client. The package import loads no Prisma client; the prisma-client-js package is loaded lazily on first need. Without the declaration, the `registerPrismaClient` call fails to compile and the message names the declaration to add. prisma-client-js apps keep identical runtime behavior and public types (T1..T15).

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`..`SR-006`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001` — Pass for IR-001, no findings (`code-review-report.md`); the reviewer routed to `/software_engineering_team/api_e2e_engineer`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change stays in the client subsystem, the public facade, the type surface, config, tests, smoke steps and docs, as designed (Medium). It adds a public contract (registration, registry, two codes), changes module loading (lazy `createRequire`, es2020, CJS shim) and the lifecycle's binding rule, and touches every public type (High). No escalation trigger fired: T1..T15 identical; the consumer setup is the registration plus the declaration; no second entry point; `createRequire(import.meta.url)` works in both builds (smoke, fresh consumers, Linux).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High risk goes to Code Review)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Import loads no client module (REQ-001, AC-001) | No module-level `@prisma/client` import remains. `src/lib/client/client-source.ts` `requireDefaultPackage` runs `createRequire(import.meta.url)('@prisma/client')` only inside `current()`; `models.ts` reads per access | Implemented. IMP-02 (P1 consumer imports ESM/CJS), IMP-05 import-safety (no `@prisma/client` request or cached client file, ESM and CJS; fails on the base build, see Notes), prisma-client consumer step |
| BEH-002 | Registered module builds the root client and supplies `Models`; types follow the registry; registration tied to the declaration (REQ-002, REQ-003, REQ-007; AC-002..AC-007, AC-013) | DS-001 `registerPrismaClient` (`client.ts`, param `RegisteredClientModule`) -> `PrismaClientLifecycle.registerClientModule(value: unknown)` -> `assertPrismaClientModule` -> `PrismaClientSource.register`. DS-002 `clientFactoryFrom(source)` in `lifecycle.ts` -> `source.current().PrismaClient`. DS-003 `Models` proxy -> `getPrismaClientModule()` (facade) -> `lifecycle.getClientModule()` -> `source.current()`. DS-005 `src/lib/prisma-types.ts` | Implemented. `src/tests/prisma-client-generator/registered-client.test.ts` (real generated client, real SQLite, default load stubbed to fail), registered typecheck program, smoke prisma-client step (ESM + `moduleFormat = "cjs"` through both builds), registered consumer types (AC-006/AC-013), fresh consumers IMP-08 |
| BEH-003 | prisma-client-js unchanged (REQ-004, AC-008) | Unregistered branches of every alias in `prisma-types.ts` are the exact `@prisma/client` types; `default-package` source kind | Implemented. T1..T15 in `src/tests/type-equality.typecheck.ts` (passed before and after the type move; a mutation fails it); the 113 pre-existing tests and the existing smoke steps pass unchanged in behavior |
| BEH-004 | `PRISMA_CLIENT_UNAVAILABLE`, `PRISMA_CLIENT_CONFLICT`, `TypeError` (REQ-005, REQ-006; AC-009, AC-010) | `initialization-error.ts` (codes, safe messages); `client-source.ts` classifies the load failure as a stage failure with the raw cause; `lifecycle.ts` `failureFrom` in `bindLazyClient` and `initializeNewClient`; `models.ts` converts a stage failure to `PrismaInitializationError` | Implemented. First lazy use throws `PRISMA_CLIENT_UNAVAILABLE`, later lazy use `CLIENT_NOT_READY` (as designed). `client-registration.test.ts`, `missing-client.test.ts`, registered test (conflict in lazy/initializing/ready/shutting-down), smoke prisma-client step |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New: `src/lib/client/client-source.ts` (source state, shape check, lazy default load), `src/lib/prisma-types.ts` (registry and every derived type, `RegisteredClientModule`, `MissingTypeDeclaration` with the spec's hint text), `tsconfig.prisma-client-generator.json`, `scripts/check-typecheck-programs.js`, `scripts/package-smoke/prisma-client-generator.js`, `examples/prisma-client-generator/{db,demo}.ts`, tests `client-registration`, `models-view`, `missing-client`, `type-equality.typecheck.ts`, `prisma-client-generator/registered-client`.
- Changed: `lifecycle.ts` (options-object constructor `{ clientFactory?, clientSource? }`, `getClientModule`, `registerClientModule`, `failureFrom` in both factory catches), `client.ts` (`registerPrismaClient`, internal `getPrismaClientModule`, annotated `rootPrismaClient`), `models.ts` (read-only view), `index.ts` (+ `registerPrismaClient`, `type PrismaClientRegistry`; `ModelName` now from `prisma-types`), type imports in `base-repository`, `repository-factory`, `context`, `decorators`, `prisma-manager`, `prisma-proxy` (annotated), `filters`; local structural types in `client/logging-policy.ts`, `client/sqlite-readiness.ts`; `tsup.config.ts` (es2020, shims); `tsconfig.json` (esnext/bundler, excludes the registered folders); `package.json` `typecheck` script only; `prisma/schema.prisma` (second generator to `generated/prisma-client`); `.gitignore` (`/generated`).
- Smoke: `packed-artifact.js` (declaration checks: `isolationLevel?: TransactionIsolationLevel`, `registerPrismaClient: (module: RegisteredClientModule) => void`, `interface PrismaClientRegistry`, both codes, annotated `prisma`/`rootPrismaClient`; no `PrismaClientModule` or `getPrismaClientModule`), `import-safety.js` (no `@prisma/client` request or cached client file), `logging-policy.js` (ESM cases use the `Module._load` spy; the ESM resolve-hook stub and loader are removed), `consumer-types.js` (registered consumer with `@ts-expect-error` negatives; missing-declaration consumer must fail with the hint text; unregistered consumer also types both new codes), `run-package-smoke.js` (new step before consumer types; summary adds `noClientOnImport`, `prismaClientGenerator`).
- Deleted: `src/lib/types-experiment.ts` (dead, as designed).
- Docs: README (section "Using the prisma-client generator": schema, copy-paste `db.ts`, import first, `Prisma.ModelName`/`BaseRepository<'X'>`, the compile error, `skipLibCheck`, one client per process; codes list; package-loading and bundler note; Testing note), DESIGN (section E client source and registration rule, rewritten ESM/CJS boundary replacing the "no `createRequire`" rule, new section F types/`Models`/two programs, DC-002 appended verbatim), TESTING (Typecheck, vitest and smoke rows), CHANGELOG Unreleased.

## Important Assumptions

- Registered vitest files run in their own module graph per file (vitest default isolation), so the registration in `registered-client.test.ts` does not leak into other files.
- The lifecycle constructor changed from a positional factory to an options object; it is internal (not exported), and all 15 test call sites were updated mechanically.

## Known Risks

- RSK-001..RSK-003 as designed (README documents `skipLibCheck` and the bundler note; declaration aliases are checked by the packed-artifact step and the registered consumer type check).
- Vite transforms files in `src/tests/prisma-client-generator/` without the root `tsconfig.json` (which excludes them), so `experimentalDecorators` does not apply there: decorator syntax fails at runtime with `SyntaxError: Invalid or unexpected token`. The registered test applies `Transactional()` as a function call (comment in the test; noted in TESTING.md). The example uses decorator syntax because it is only type-checked.
- `Models` is now a Proxy: `console.log(Models)` shows the empty proxy target instead of the names (`Object.keys`, spread and `in` work). Not in the AC list; noted for review.
- `getPrismaClientModule` in `client.ts` has an inferred return type (the internal `PrismaClientModule`), so `client.ts` imports nothing from `client-source.ts`, per the dependency rule.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (small)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the client module is an owned input of the lifecycle; `lifecycle.ts` is the only constructor and caller of `PrismaClientSource`; `client.ts` and `models.ts` never touch the source; only `client-source.ts` loads `@prisma/client` at runtime and only `prisma-types.ts` imports its types (grep, see IMP-03 notes).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the `default-package` source kind is the designed, user-approved support for prisma-client-js, DQ-002)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (`types-experiment.ts`; filters' `StringFilter`/`StringFilterWithMode` aliases; the ESM resolve-hook stub and loader in the logging-policy smoke)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (`lifecycle.ts` 448 effective lines; new files under 220; `prisma-client-generator.js` smoke step 218)
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A (adapter and DateTime format unchanged; existing DateTime tests pass)
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- No dependency or peer change; `package.json` changes only the `typecheck` script; version stays 2.0.0.
- `prisma generate` (from `prepare` and `npm test`) now also writes `generated/prisma-client/` (git-ignored, not packed: the packed file list is still 10 files). The strict install on Linux (`npm ci --strict-allow-scripts`, npm 11) needed no new script approval (IMP-07).
- Local npm is 10.9.8, which has no `--strict-allow-scripts`; the strict install was checked in the Linux container instead.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/evidence/`. macOS = Darwin 25.5.0, Node v22.23.1, npm 10.9.8, non-root user.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | P1 on the base package: build, `npm pack`, install into a prisma-client-only consumer, import ESM and CJS | `0a4e824` (base) | macOS | base `dist` | BEH-001 (reproduction) | Fail as expected (reproduced) | `IMP-01-p1-reproduction-base.log` | `Error: Cannot find module '.prisma/client/default'` and `code: 'MODULE_NOT_FOUND'` for both imports |
| IMP-02 | P1 consumer with the new package: ESM and CJS import | working tree that became `c97eab8` (pre-SR-005 parts; import path unchanged since) | macOS | `dist` import path | BEH-001, AC-001 | Pass | `IMP-02-p1-after-change.log` | `esm import ok function`, `cjs import ok function`; `@prisma/client` itself still `MODULE_NOT_FOUND` |
| IMP-03 | `npm run typecheck` | `c97eab8` | macOS | both programs, `check-typecheck-programs.js`, T1..T15, example, registered test types | AC-008, AC-011, AC-013, REQ-003 | Pass | `IMP-03-typecheck.log` | `{"result":"pass","registeredProgramFiles":{"examples/prisma-client-generator":2,"src/tests/prisma-client-generator":1}}` |
| IMP-04 | `npm test` | `c97eab8` | macOS | whole library; new: registration, `Models` view, missing client, registered client incl. concurrent requests | AC-002..AC-005, AC-008..AC-010, DC-001 | Pass | `IMP-04-npm-test.log` | `Test Files  15 passed (15)`, `Tests  144 passed (144)` (113 existing + 31 new) |
| IMP-05 | `npm run test:package` (non-root) | `c97eab8` | macOS | packed `dist` and declarations, all smoke steps incl. prisma-client consumer (ESM/CJS) and registered consumer types | AC-001, AC-002, AC-006, AC-007, AC-009, AC-010, AC-013, REQ-001 | Pass | `IMP-05-test-package.log` | `"noClientOnImport":"pass"`, `"readonlyWal":"pass"`, `"prismaClientGenerator":"pass"`, then the interop `{"result":"pass",...}` |
| IMP-06 | DC-002: `tsc --listFilesOnly` for both programs; negative controls (type error in `demo.ts`; registered config without its `exclude`; empty example folder; both `declare module` blocks removed) | working tree = `c97eab8` | macOS | `tsconfig*.json`, `check-typecheck-programs.js`, `MissingTypeDeclaration` | AC-011, AC-013, DC-002 | Pass | `IMP-06-typecheck-programs-dc002.log` | default program `count: 0`; registered program lists `db.ts`, `demo.ts`, `registered-client.test.ts`; control 1 `registered tsc exit=2`; control 2 `registered tsc exit=0` but `check exit=1` (`... is not in tsconfig.prisma-client-generator.json`); control 3 `has no TypeScript files`, `check exit=1`; control 4 `TS2345 ... 'MissingTypeDeclaration'` with the hint line |
| IMP-07 | CI steps on Linux: `git archive c97eab8` into `node:24-bookworm` (linux/amd64) as user `node`: `npm ci --strict-allow-scripts`, `npm run typecheck`, `npm test`, `npm run build`, package smoke + interop | `c97eab8` | Linux x64 container, Node 24, npm 11 | the whole repository as CI builds it | REQ-008, REQ-010, AC-008 | Pass | `IMP-07-linux-ci-parity.log` | `id: uid=1000(node)`, `node v24.22.2 npm 11.19.1`, strict install without a new approval, `ALL-STEPS-OK`, `exit=0`; vitest `144 passed` (with ANSI color codes); smoke `"readonlyWal":"pass"`, `"prismaClientGenerator":"pass"` |
| IMP-08 | Fresh consumers per README only (packed tarball, `npm install` without `--legacy-peer-deps`, README schema/`prisma.config.ts`/`db.ts`/entry/repositories, `prisma generate`, `db push`, `tsc`, run) in ESM and CJS; plus the missing-declaration compile error | packed working tree = `c97eab8` | macOS | README setup end to end | REQ-009, AC-002, AC-007, AC-011, AC-013 | Pass | `IMP-08-fresh-consumer-readme.log` | `esm [{"id":1,"email":"ada-esm@example.test","posts":[...]}] User`, same for `cjs`, both `exit=0`; `error TS2345 ... 'MissingTypeDeclaration'` naming the declaration |

Notes:
- IMP-05's import-safety assertion was run against the base 2.0.0 tarball: it fails there (CJS `{"clientRequests":2,"clientFiles":[".../@prisma/client/default.js",".../.prisma/client/default.js",...]}`; ESM cache check finds 4 client files), so it detects the old eager load. Probe scripts: `/tmp/rp3-impl/scripts/` (not committed; command lines in this note).
- T1..T15 mutation check: changing `ContainsStringFilter`'s unregistered branch makes `type-equality.typecheck.ts(10,14): error TS2322` (restored after).
- Dependency rules by grep (IMP-03 tree): `@prisma/client` appears only in `prisma-types.ts` (types) and `client/client-source.ts` (the runtime load); `PrismaClientSource` only in `client-source.ts` and `lifecycle.ts`; `client.ts` imports only `lifecycle.ts` from the client folder.

- Not run, and why: the published-package fresh consumer (nothing is published in this ticket); pnpm/yarn fresh consumers (README guidance for them is unchanged); Windows (no environment). Broader API/E2E coverage is left to `api_e2e_engineer`.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: library work with no rendered frontend.

## Downstream Coverage Hints / Suggested Scenarios

- A prisma-client app whose repository module evaluates `Models.User` before `db.ts` runs: expect `PRISMA_CLIENT_UNAVAILABLE` at load (documented; not tested as a scenario).
- A generated client in a separate workspace package (monorepo) registered from another package: the `declare module` must be visible to the consumer's program.
- `moduleResolution: bundler` and `node16` consumers (the smoke uses `NodeNext`; fresh consumers used `nodenext` and `node16`) — QR-002.
- A registered client with `@prisma/client` absent from `node_modules` entirely (only possible without the peer; npm 7+ installs it).
- Re-registration after `initializePrisma` failure (`failed` state) through the public API with a real client.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation of AC-001..AC-013 after code review, including the scenarios above.

# Investigation Notes

## Investigation Meta

- Package identifier: `prisma-client-generator` (Project Task `repository-prisma-3`)
- Request / ticket: repository-prisma-3, "Support Prisma's new prisma-client generator before prisma-client-js is removed" (follow-up FU-002 of repository-prisma-1)
- Workspace root: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3`, branch `codex/repository-prisma-3-prisma-client-generator`
- Resolved base remote / branch / revision: `origin/main`; first `5a731595db5b3084a070d56479242259a11ccbf2` (2026-11-04), rebased on 2026-11-05 onto `0a4e824` (repository-prisma-6 finalization)
- Finalization target remote / branch: `origin/main`
- Bootstrap result: worktree created from refreshed `origin/main`; `npm ci` and `prisma generate` succeeded (Node 22.23.1, npm 10.9.8)
- Bootstrap blocker: None
- Current solution revision ID: `SR-006`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (2026-11-04). Architecture gate: `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md`, project `DESIGN.md` (2026-11-04)
- Investigation status: Complete for requirements and architecture

## Initial Request And Clarifications

- Original request: Task repository-prisma-3 (see requirements doc). Direction is a Solution Designer suggestion, not a user decision: "Design support for Prisma's prisma-client generator (custom output), for example by letting the application supply its generated client class, before moving to a Prisma major that removes prisma-client-js."
- Done when: a design (and, **if the user approves, an implementation**) with tests and updated README/DESIGN, finalized on main. No release.
- Clarifications received: none yet.
- Initial ambiguity: the public API shape; whether existing consumers must change; how types follow a client outside `node_modules`.

## Product And Domain Understanding

- Product area: `repository_prisma` npm library (implicit-transaction repository pattern over Prisma 7, SQLite only).
- Affected actors: Node.js applications that use the library (known consumer: `autobyteus-server-ts`, still on 1.0.x / Prisma 5, FU-001 of repository-prisma-1).
- Terms: **prisma-client-js** = deprecated generator, writes into `node_modules/.prisma/client`, re-exported by `@prisma/client`. **prisma-client** = Prisma 7's default generator, writes TypeScript source to a required `output` path in the application; the generated code imports `@prisma/client/runtime/client`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-04 | Code | `src/lib/client/lifecycle.ts:1,21,68-72` | Who loads the client class | `import PrismaClientPackage from '@prisma/client'` at module load; default factory `new PrismaClientRuntime({ adapter, log })`; the lifecycle already takes a `clientFactory` constructor parameter (test seam) | Design |
| 2026-11-04 | Code | `src/lib/models.ts` | Second runtime load | `Models = PrismaClientPackage.Prisma.ModelName` evaluated at module load | Design |
| 2026-11-04 | Code | `base-repository.ts`, `context.ts`, `decorators.ts`, `prisma-manager.ts`, `prisma-proxy.ts`, `client.ts`, `repository-factory.ts`, `filters.ts`, `client/logging-policy.ts`, `client/sqlite-readiness.ts`, `types-experiment.ts` | Type dependencies | All take `PrismaClient` / `Prisma.*` types from `@prisma/client` | Design |
| 2026-11-04 | Code | `src/lib/types-experiment.ts` | Dead code? | Not exported from `src/index.ts`, not imported anywhere (`grep`); a leftover typing experiment | Design (touched file) |
| 2026-11-04 | Doc | `README.md` "Requirements and Setup", `DESIGN.md` "Package ESM/CommonJS Boundary" | Contracts | README tells consumers to keep `prisma-client-js`. DESIGN: "The package does not add a fallback or `createRequire` path" (decision of the ESM/CJS interop ticket) | Design must revisit |
| 2026-11-04 | Doc | `tickets/done/repository-prisma-esm-cjs-interop/design-spec.md:227,362` | Why createRequire was rejected | Rejected then because a standard default-namespace import solved that problem without module-format logic; no requirement then needed a lazy load | Design |
| 2026-11-04 | Doc | `tickets/done/prisma-7-upgrade/requirements-doc.md` SCN-006, REQ-015, DEC-001; `follow-ups.md` FU-002, FU-004 | Prior decisions | REQ-015 (user, 2026-11-04): "how user use it will still be intuitive and simple" — no new public call required for SQLite consumers on Prisma 7. FU-004 (adapter injection) stays separate | Requirements |
| 2026-11-04 | Web | https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators | Generator contract | `prisma-client` is the default in v7; only `output` is required; `moduleFormat` (`esm`/`cjs`), `importFileExtension`, `generatedFileExtension`, `runtime` optional | Requirements |
| 2026-11-04 | Web | https://www.prisma.io/docs/v6/orm/more/upgrades/to-v7 | Deprecation | `prisma-client-js` "will be removed in future releases" | — |
| 2026-11-04 | Web | https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql | Prisma 8 | Prisma 8 guide is PostgreSQL-only; lists "the `prisma-client` generator, and a driver adapter" as Prisma 7 prerequisites; Prisma 8 code imports a new runtime (`@prisma/orm-postgres`); Node 22.18+/24.11+. Does not mention `prisma-client-js` | Out of scope (Prisma 8) |
| 2026-11-04 | Command | `npm pack` of main into `/tmp/rp3-probe` (prisma-client generator only); `import('repository_prisma')`, `require('repository_prisma')` | Reproduce | Both fail: `MODULE_NOT_FOUND Cannot find module '.prisma/client/default'` | BEH-001 |
| 2026-11-04 | Command | `/tmp/rp3-proto` prototype (see probes) | Feasibility | Runtime, types and CJS/ESM all work; details below | Design |
| 2026-11-05 | Command | `git fetch`; `git rebase origin/main` in the task worktree | Base moved (repository-prisma-6 merged) | New base `0a4e824`. No change to `src/`, `tsup.config.ts`, `tsconfig.json`, `DESIGN.md`; package smoke split into `scripts/package-smoke/*.js`; `TESTING.md` added; CI installs with `npm ci --strict-allow-scripts` | Design file mapping |
| 2026-11-05 | Doc | `TESTING.md` | Project testing guideline | Lifecycle changes need a concurrent-request test; README setup changes need a fresh consumer run (no `--legacy-peer-deps`, README only, ESM and CJS); smoke as non-root | Design guidance |
| 2026-11-05 | Command | `/tmp/rp3-probe`: `npx tsc -p tsconfig.json` with `probes/esm-app/module-type.ts` | One-field registry from the module type | Client and transaction-client types derived from `typeof generated` are assignable both ways with the generated ones (not identical: log-option generic); model names and isolation level identical | Registry shape |
| 2026-11-05 | User | Conversation | Design approval | "i agree with your technical judgement i trust your technical design capalbitiy. lets go" | design-spec approval |
| 2026-11-05 | Doc | `design-review-report.md` (ARCH-REV-001, round 1) | Review result | Fail, Design Impact: AR-001 (`buildContainsFilter` return type not identical for prisma-client-js; AC-008 inventory missing), AR-002 (facade held the lifecycle's internal source) | SR-004 |
| 2026-11-05 | Command | `/tmp/rp3-proto`: `ContainsStringFilter` and `ModelsObject` in `prisma-types.ts`; `probes/type-equality.typecheck.ts` under `src/tests`; `npx tsc -p tsconfig.json`; `npm test` | AR-001 feasibility | All 15 cases identical; 113/113 pass. Without `ModelsObject`, `typeof Models` was not identical (T2 failed) | Design inventory |
| 2026-11-05 | Command | `/tmp/rp3-probe`: `prisma.user.findMany({ where: { email: buildContainsFilter('a', { caseInsensitive: true }) } })` with a registered client, `npx tsc` | Registered filter type | Accepted | Design |
| 2026-11-05 | User | Conversation | Smoothing rough edges | User asked how to make the rough edges smoother; on the proposal (tie registration to the declaration, README guidance, example): "yess please in this ticket directly no need for follow ups, lets have a good design in this one" | SR-005, DEC-008 |
| 2026-11-05 | Command | `/tmp/rp3-probe`, scratch `loud-lib` declaration package with `IsAny<DefaultPrismaClient>` | Can the library's types warn when the declaration is missing? | No: with `@prisma/client` types unresolved, `IsAny<...>` and everything derived is itself `any`; no error surfaces | DEC-008 option B rejected |
| 2026-11-05 | Command | `/tmp/rp3-probe`, scratch `loud-lib` with `registerPrismaClient(module: RegisteredModule)` | Tie the call to the registry | Without the declaration: TS2345 naming the declaration; with it: compiles; a different object: rejected | DEC-008 option C |
| 2026-11-05 | Command | `/tmp/rp3-proto`: P3 (`probes/README.md`) | Two typecheck programs in the repo | Main program T1..T15 identical; registered program (paths to `src/index.ts`) compiles the example with all negative cases; augmentation through the re-export works; 113/113 tests | Design SR-005 |
| 2026-11-05 | Doc | `design-review-report.md` (ARCH-REV-003) | Review of SR-005 | Fail: AR-003 (registered config inherits base `exclude`; P3 compiled nothing), AR-004 (`PrismaClientModule` export no longer fits); MP-002 optional | SR-006 |
| 2026-11-05 | Command | `/tmp/rp3-proto`: `tsc -p tsconfig.prisma-client-generator.json --listFilesOnly` before/after own `exclude`; controls 1-2; MP-002 | Re-measure P3 | Before: 0 example files (false pass confirmed). After: files listed, pass, both controls fail as expected, MP-002 gives `MissingTypeDeclaration`; main program unaffected | AR-003, MP-002 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | App uses only the `prisma-client` generator and imports `repository_prisma` | Package import loads `@prisma/client`, whose `default.js` requires `.prisma/client/default` | Import throws `MODULE_NOT_FOUND` (ESM and CJS); the app cannot use the library at all | P1 Reproduced | High |
| BEH-002 | Contract | Same app type-checks against the library | Library `.d.ts` imports `Prisma`/`PrismaClient` from `@prisma/client`, which has no generated types | skipLibCheck true: all library types silently `any` (no error for `data: { nope: 1 }`). skipLibCheck false: TS2307/TS2305 errors | P1 Measured | High |
| BEH-003 | Contract | App uses `prisma-client-js` (README setup) | No configuration; lazy or explicit initialization builds `new PrismaClient({ adapter, log })` from `@prisma/client`; types from `@prisma/client` | Works (2.0.0 contract, REQ-015 of repository-prisma-1) | Repo suite, package smoke | High |
| BEH-004 | Contract | Initialization errors | Stable `PrismaInitializationError` codes; safe messages without paths/URLs; `onDiagnostic` for raw causes | — | `initialization-error.ts`, README | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `client/lifecycle.ts` | Sole owner of raw root client construction, binding (target, logging policy), readiness, shutdown | The client class is another binding input | Lifecycle should own which client class is bound and the conflict rule |
| `models.ts` | `Models` value from `@prisma/client` at load | `Models` must not load at import | Resolve lazily from the active client source |
| Generated `client.ts` (prisma-client) | Exports `PrismaClient` (value + type), `Prisma` namespace (with `ModelName`, `TransactionIsolationLevel`, `TransactionClient = Omit<DefaultPrismaClient, runtime.ITXClientDenyList>`), `$Enums`, model types | Same runtime shape as `@prisma/client` (`{ PrismaClient, Prisma }`) | The registration input can be "a Prisma client module" `{ PrismaClient, Prisma }`, matching both generators |
| `@prisma/client/runtime/client` | Present for both generators; exports `ITXClientDenyList` type | Library types can depend on it safely | Derive `TransactionClient` from the registered client type |
| Generated `$transaction` | Last overload is the interactive form with `options?: { maxWait, timeout, isolationLevel }` | Isolation level derivable from the client type | Measured identical to `Prisma.TransactionIsolationLevel` |
| Model names | `Prisma.ModelName` values equal model names; delegates are the first letter lower-cased | Lower-case model names exist (`model users`) | Do not derive `ModelName` by `Capitalize<delegate key>`; take it from the registered namespace type |
| `tsup.config.ts` | `target: 'es2018'`, `format: ['cjs','esm']`, externals both peers | — | ESM `import.meta` is emptied at es2018; es2020 keeps it; `shims: true` gives CJS `import.meta.url` |
| `tsconfig.json` | `module: commonjs`, typecheck only (`noEmit`) | — | `import.meta` rejected (TS1343); `module: esnext` + `moduleResolution: bundler` passes and the suite still passes |
| Package smoke (on base 5a73159 one file `scripts/run-package-smoke.js`; on base 0a4e824 a runner plus `scripts/package-smoke/*.js` step modules) | `.d.ts` text checks (`isolationLevel?: Prisma.TransactionIsolationLevel`); ESM logging-policy probe stubs `@prisma/client` with an ESM `resolve` hook | Must keep validating the same behavior | The stub technique must also intercept a `createRequire` load (e.g. a CJS-level stub or registering a stub client) |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: none persisted; `prisma/schema.prisma` (test schema) may gain a second generator block for tests.
- Evidence paths: `prisma/schema.prisma`, probes.

### Structural Surfaces

- Public API (`src/index.ts`): new registration function, new type registry interface, new error codes; existing exports unchanged.
- Package build (`tsup.config.ts` target/shims), typecheck config (`tsconfig.json`), package smoke scripts.
- Lifecycle state (binding gains the client source).

### Potential Structural Impacts To Investigate

- API or external-contract change: Present (additive).
- Persistence schema or invariant change: Absent.
- Security or privacy boundary change: Absent (error messages must stay path/URL-free).
- Concurrency or lifecycle change: Present (registration vs. bound state).
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: Present (lazy peer load reverses a recorded DESIGN rule; build target).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Import packed main in a prisma-client-only app | BEH-001 | `MODULE_NOT_FOUND .prisma/client/default` (ESM, CJS) | Reproduced | REQ-001 | `probes/README.md` P1 |
| `tsc` with packed main | BEH-002 | Types `any` (skipLibCheck true); errors (false) | Measured | REQ-003 | P1 |
| Prototype, repo `npm test` | BEH-003 | 113/113 pass | Measured | REQ-004 | P2 |
| Prototype, `Eq<>` type checks in repo | BEH-003 | Public types identical for prisma-client-js | Measured | REQ-004 | P2 |
| Prototype, ESM app run | SCN-002 | CRUD, WAL, isolation, rollback (HOF + decorator), `forModel`, `Models` work | Measured | REQ-002 | `probes/esm-app/main.ts` |
| Prototype, ESM app `tsc` | SCN-002 | Registry types reject bad fields/models/delegates/isolation | Measured | REQ-003 | `probes/esm-app/types-negative.ts` |
| Prototype, CJS app run | SCN-003 | Works through CJS dist with `moduleFormat = "cjs"` | Measured | REQ-007 | `probes/cjs-app/main.ts` |
| Prototype, no registration | SCN-004 | Import ok; init/lazy -> `CONNECTION_FAILED` (misleading); `Models` throws non-Error | Measured | REQ-005 | `probes/esm-app/forgot.ts` |
| Prototype `.d.ts` | SCN-002 | `prisma`/`rootPrismaClient` declarations got the resolved default type until explicitly annotated | Measured | REQ-003 | P2 |
| Prototype build | REQ-007 | es2018 empties `import.meta` in ESM; es2020 fine; CJS needs shims | Measured | REQ-007 | P2 |
| Prototype `test:package` | REQ-008 | `.d.ts` text check and ESM loader-hook stub must change | Measured | REQ-008 | P2 |

- Temporary diagnostics: None in the worktree. All prototypes ran in `/tmp` copies.
- Reproduction for implementation to start from: `probes/README.md` P1 (consumer import fails), `probes/esm-app/*`, `probes/cjs-app/*`.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (repository-prisma-1 REQ-015) | "how user use it will still be intuitive and simple" | Direct quote | prisma-client-js users must not need changes; new setup must be short | — |
| Task | No user need yet; design first, implementation if the user approves | Task text | Design approval by the user before implementation | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `prisma-client` generator | Prisma 7.10.1 | Output is TS source in the app; imports `@prisma/client/runtime/client`; `moduleFormat` esm/cjs | Probe, docs | App must compile/run TS (tsx, tsc, bundler) — the app's concern |
| `@prisma/client` root | 7.10.1 | `default.js` requires `.prisma/client/default` (prisma-client-js output) | Probe | Throws when only prisma-client is used |
| `@prisma/client/runtime/client` | 7.10.1 | Always present; `ITXClientDenyList` type | Probe | — |
| Node `module.createRequire` | Node >= 12 | Synchronous CJS load from ESM | Probe | Bundlers do not trace `createRequire(import.meta.url)` requests (RSK-002) |
| Prisma 8 | Guide (PostgreSQL only) | New runtime package; not covered | Docs | Separate future work |

## Persisted Data And State Facts

- Affected stored or external subject: none. DateTime format, adapter, connection gate unchanged.

## Product Design Request Context

- Product Design request in the current input: `Not stated` (library work).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/README.md` | Solution Designer | Reproduction and feasibility commands/results | P1, P2 | REQ-001..008 | Current | Evidence only |
| `probes/esm-app/*` (incl. `module-type.ts`), `probes/cjs-app/*` | Solution Designer | Consumer probes to reuse as tests | SCN-002..004 | AC-002..AC-007 | Current | Evidence only |
| `probes/registered-program/*` (prototype `prisma-types`, example `db.ts`/`demo.ts`, second tsconfig) | Solution Designer | P3: registration tied to the declaration; registered typecheck program | — | AC-011, AC-013 | Current | Evidence only |
| `probes/type-equality.typecheck.ts` | Solution Designer | AC-008 type-equality cases measured on the prototype | — | AC-008 | Current | Evidence; implementation turns it into a test |
| `probes/prototype-src.diff` | Solution Designer | Feasibility prototype against main | — | — | Current | Non-authoritative; `design-spec.md` governs |
| `follow-ups.md` | All roles | Out-of-scope findings | — | — | Current | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | prisma-client users with `skipLibCheck: false` get errors from `@prisma/client/default.d.ts` (its own missing generated types) once the library's declarations reference `@prisma/client` for the default-client fallback | Strict type-check configurations | Documented limitation; `skipLibCheck: true` is the `tsc --init` default and Prisma's generated code is `@ts-nocheck` | Accepted (DEC-005) |
| RSK-002 | Risk | Bundlers (esbuild) do not follow `createRequire(import.meta.url)('@prisma/client')`; a fully bundled ESM app without `node_modules` would not find the default client | Only the zero-config prisma-client-js path; registered clients are passed as values | Document; registering the client also avoids it | Accepted (design) |
| RSK-003 | Risk | Declaration bundling may inline the resolved default type instead of the registry alias | Types would silently ignore registration | Explicit annotations + a packaged consumer typecheck test | Design |
| UNK-001 | Unknown | Whether Prisma 8 keeps any of these surfaces | Future major | Out of scope | Open |

## Architecture Investigation Findings

- Construction path today: `client.ts` facade -> `PrismaClientLifecycle` (module singleton) -> `defaultClientFactory(target, logQueries)` -> `new PrismaClientRuntime({ adapter: createSqliteDriverAdapter(target), log })`. Lazy binding (`getClientForOperation` -> `bindLazyClient`) is synchronous; explicit `initialize` builds through `initializeNewClient`. Both call the factory once per binding.
- Factory failure today maps to `CONNECTION_FAILED` (`bindLazyClient` catch; `initializeNewClient` catch).
- Binding conflicts today: `DATASOURCE_CONFLICT`, `LOGGING_POLICY_CONFLICT`; rebinding requires `shutdownPrisma()` (state `idle`). `failed` also accepts a new binding.
- `Models` is the only non-lifecycle runtime use of `@prisma/client`.
- Type surface: `RegisteredPrismaClient` can drive every public type; prototype `Eq<>` checks prove identity for prisma-client-js.
- Synchronous lazy binding rules out `await import('@prisma/client')`; `createRequire` is the Node API for a synchronous load from ESM. `@prisma/client` root is CommonJS, so `require` semantics match its format.
- Alternatives examined (see design spec): subpath entry (`repository_prisma/<x>`) with shared state, and mandatory registration for everyone (breaking).

## Requirement Implications

- BEH-001/002 define the gap; BEH-003 is the preserved contract (no change for prisma-client-js users, REQ-015 of 2.0.0).
- Registration must cover both runtime (client class + model names) and types.
- Missing-client and conflict cases need stable codes, consistent with the existing error contract.

## Notes For Architecture Design

- Scenarios to realize: SCN-001..SCN-005 (requirements doc).
- Keep the lifecycle as the single owner of which client class is bound.
- Keep peers, Node range, adapter, connection gate, DateTime format and error-message safety unchanged.
- Update the recorded DESIGN rule on `createRequire` with the new reason, or choose an alternative.

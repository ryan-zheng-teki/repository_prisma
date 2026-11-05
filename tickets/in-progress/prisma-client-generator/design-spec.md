# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (SR-004 corrected ARCH-REV-001 AR-001/AR-002; SR-005 tied registration to the type declaration, user-approved; SR-006 corrects ARCH-REV-003 AR-003/AR-004 and adopts MP-002)
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (user informed, 2026-11-04).
- Behavior-defining supplements and their approval references: none.
- User approval of the design, when the direction requires it: `Obtained` — the user, 2026-11-05, in the Solution Designer's conversation, after the shorter setup (`registerPrismaClient(generated)` + `PrismaClientRegistry { client: typeof generated }`) was proposed: "thanks for your explanation. i agree with your technical judgement i trust your technical design capalbitiy. lets go". This covers DQ-001 (in its shorter form), DQ-002 and DQ-003 below. SR-005 (registration tied to the type declaration, README guidance, example) was proposed by the Solution Designer and approved by the user, 2026-11-05: "yess please in this ticket directly no need for follow ups, lets have a good design in this one" (requirements DEC-008).
- Design status: `Ready` (SR-006; requirements SR-005 approved by the user; SR-006 changes no intended behavior)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/investigation-notes.md`
- Authorities read: 2026-11-04 `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md` (repository root, incl. Design Cases DC-001); `references/design-examples.md` Example 2 and Case Studies 2, 3 and 4. 2026-11-05 (updated skill): `SKILL.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `references/ticket-scope.md`, `templates/design-spec-template.md`, `templates/project-design-template.md`; project `TESTING.md` (added on main by repository-prisma-6). `DESIGN.md` unchanged on the new base.
- Project design-principle conflicts or discrepancies: `DESIGN.md` "Package ESM/CommonJS Boundary" says "The package does not add a fallback or `createRequire` path". This design adds one `createRequire` load, for a reason that did not exist when that rule was written (see Key Tradeoffs). The user approved replacing the rule (DQ-002); the change rewrites it in `DESIGN.md`.

### User decisions (design approval, 2026-11-05)

| ID | Question | Decision |
| --- | --- | --- |
| DQ-001 | API shape for prisma-client apps | Approved in the shorter form: `registerPrismaClient(generated)` with `import * as generated from './generated/prisma/client'`, plus `declare module 'repository_prisma' { interface PrismaClientRegistry { client: typeof generated } }`. Alternatives B and C (Key Tradeoffs) not chosen |
| DQ-002 | Keep zero-config prisma-client-js support by loading `@prisma/client` lazily with `createRequire` (one rule: registered client, else the default package), replacing the old "no `createRequire`" rule | Approved |
| DQ-003 | Prisma-client-only apps need `skipLibCheck: true` (the `tsc --init` default); documented | Approved |

## Current-State Read

- The library loads the Prisma client module twice at import time: `src/lib/client/lifecycle.ts:1,21` (`PrismaClient` for the root client) and `src/lib/models.ts:1,4,7` (`Prisma.ModelName` for `Models`). `@prisma/client`'s `default.js` requires `.prisma/client/default`, which only `prisma-client-js` generates, so the package import fails in a prisma-client-only app (investigation notes, P1, Reproduced).
- `PrismaClientLifecycle` (`lifecycle.ts:84-438`) is the sole owner of the raw root client: binding (target, logging policy), readiness, failure and shutdown. It already builds clients only through an injected `PrismaClientFactory` (`lifecycle.ts:63-72,87`). A factory error becomes `CONNECTION_FAILED` (`lifecycle.ts:226-229` lazy; `lifecycle.ts:239-244` explicit).
- `client.ts:13-27` is the thin facade that creates the lifecycle singleton and the `rootPrismaClient` forwarding proxy.
- Every public type comes from `@prisma/client` (`base-repository.ts:1,6,8`, `context.ts:2`, `decorators.ts:3`, `prisma-manager.ts:1,8`, `prisma-proxy.ts:1`, `client.ts:1`, `repository-factory.ts:1`, `filters.ts:1,4-5`, `models.ts:2,8`), plus internal uses in `client/logging-policy.ts:1,13` and `client/sqlite-readiness.ts:3`.
- Constraints: SQLite only, one connection gate, DateTime `unixepoch-ms`, stable safe error codes, ESM + CJS builds with both peers external (`tsup.config.ts`), Node `^20.19 || ^22.12 || >=24`.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 15 source files, most of them only switch their type imports to one new types file; 2 new library files; one lifecycle change (client source and registration rule); `models.ts` rewritten; build/typecheck config (2 settings each); 2 smoke scripts extended; new source tests; README/DESIGN/CHANGELOG. All of it stays inside the existing client subsystem and public facade. The prototype diff is 361 lines (`probes/prototype-src.diff`). SR-005 adds a second typecheck config, the `typecheck` script, one example folder and one smoke assertion: still within the same ownership, still Medium.
- Architectural risk: `High`
- Risk rationale and supporting evidence: new public contract (registration function, type registry, two error codes); a changed module-loading contract (lazy `createRequire` load of a peer, build target es2020, CJS `import.meta` shim) that reverses a recorded DESIGN rule; a new lifecycle binding rule; and an impact on every consumer's public types that must stay identical for prisma-client-js (REQ-004).
- Escalation trigger: any public type for prisma-client-js consumers that is no longer identical (type-equality test); a consumer setup that needs more than the registration and the type declaration; a need for a second package entry point; a bundler or runtime where `createRequire(import.meta.url)` fails for the default path.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| P1 reproduction | `probes/README.md` P1 | Import fails without prisma-client-js output; types `any` | Lazy load; type registry | — |
| Generated client | `/tmp/rp3-probe/src/generated/prisma/client.ts`, `internal/prismaNamespace.ts:399,523,785`, `internal/class.ts:183-185` | Module exports `{ PrismaClient, Prisma }`; `TransactionClient = Omit<Client, ITXClientDenyList>`; interactive `$transaction` is the last overload | Registration input = client module; derived types | Shape may change within 7.x (tests cover) |
| Prototype runtime | `probes/esm-app/main.ts`, `probes/cjs-app/main.ts` | All APIs work, ESM and CJS | Overall design | — |
| Prototype types | `probes/esm-app/types-negative.ts`; `Eq<>` checks (P2) | Registered types enforced; prisma-client-js types identical | Type registry with `@prisma/client` fallback | — |
| Declaration emit | P2 | `prisma`/`rootPrismaClient` inlined the resolved default type until annotated | Explicit annotations + packaged type check | — |
| Build | P2 | es2018 empties `import.meta`; es2020 + `shims: true` fine; tsconfig `module: esnext` + `moduleResolution: bundler` typechecks and the suite passes | Build/typecheck settings | — |
| Smoke harness | P2 (on the old single-file smoke); now `scripts/package-smoke/packed-artifact.js:74-99`, `logging-policy.js:15,51-56,153,187`, `import-safety.js:31` | `.d.ts` text checks and the ESM loader-hook stub depend on the old loading | Harness updates | — |
| Interop probe | `node scripts/run-esm-cjs-interop.js` on the prototype build | `{"result":"pass", ...}` | No change needed beyond what the new loading implies | — |
| Missing client | `probes/esm-app/forgot.ts` | Prototype mapped it to `CONNECTION_FAILED`; `Models` threw a non-Error | New code; stage failure mapped correctly | — |
| AR-001 / AR-002 checks (2026-11-05) | `/tmp/rp3-proto` with `ContainsStringFilter`/`ModelsObject`; `probes/type-equality.typecheck.ts`; `/tmp/rp3-probe` filter case | All 15 AC-008 cases identical for prisma-client-js (`npx tsc -p tsconfig.json`), 113/113 tests pass; with a registered client, `buildContainsFilter(...)` is accepted in `prisma.user.findMany({ where: { email } })` | AR-001 correction; AC-008 inventory | — |
| P3 re-measured after ARCH-REV-003 (2026-11-05) | `probes/README.md` P3 (corrected); `probes/registered-program/tsconfig.prisma-client-generator.json` | The SR-005 registered config inherited the base `exclude`: `tsc --listFilesOnly` listed 0 example files, so the first P3 "pass" compiled nothing. With its own `exclude: ["node_modules", "dist"]`: `db.ts` and `demo.ts` listed; passes; control 1 (a deliberate type error in `demo.ts`) fails; control 2 (no declaration) fails with `MissingTypeDeclaration`; MP-002 (`client: generated.PrismaClient`) fails with `MissingTypeDeclaration`; main program lists 0 registered files and T1..T15 stay identical | AR-003 correction; permanent program-content check; MP-002 constraint | — |
| Registration tied to the declaration (P3, 2026-11-05) | `probes/README.md` P3; `probes/registered-program/*` | Main program: T1..T15 still identical. Separate program with `paths` to `src/index.ts`: the `'repository_prisma'` augmentation reaches the re-exported interface; registered example compiles with all negative cases; a different object is rejected. Without the declaration: TS2345 against `MissingTypeDeclaration`, whose property names the line to add. 113/113 tests. A library-side warning based on `@prisma/client` types is impossible (derived types are `any`) | `RegisteredClientModule` parameter; two typecheck programs; generated output at `generated/prisma-client/` | — |
| Registry from the module type | `probes/esm-app/module-type.ts` (`npx tsc -p tsconfig.json`, 2026-11-05) | From `M = typeof import(generated client)`: `InstanceType<M['PrismaClient']>` and the generated `PrismaClient` type are assignable both ways (not identical: the constructor instantiates the log-option generic from its constraint); `Omit<C, ITXClientDenyList>` and `Prisma.TransactionClient` assignable both ways; `M['Prisma']['ModelName'][keyof ...]` identical to `Prisma.ModelName`; derived isolation level identical; unknown fields rejected | One-field registry `client: typeof generated` | — |
| New base | `git rebase origin/main` -> `0a4e824` (repository-prisma-6) | No `src/`, `tsup.config.ts`, `tsconfig.json` or `DESIGN.md` change; the package smoke is now a runner plus step modules in `scripts/package-smoke/`; `TESTING.md` added | Smoke changes mapped to the step modules | — |

## Intended Change

Make the Prisma client module an explicit input of the library: either the application registers the module its `prisma-client` generator produced, or the library uses the default `@prisma/client` module (prisma-client-js), loaded only when it is first needed. Public types follow a type registry that the application can fill in, and fall back to `@prisma/client` types.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Areas: the client subsystem (`src/lib/client/`: new client source, lifecycle registration rule, error codes), the public facade (`client.ts`, `index.ts`), the type surface (new `prisma-types.ts`; type imports in repositories, context, decorators, proxies, filters, models), `models.ts`, build/typecheck config (incl. a second typecheck program and the `typecheck` script in `package.json`), test schema + tests, `examples/prisma-client-generator/`, `.gitignore`, package smoke scripts, README/DESIGN/TESTING/CHANGELOG.
- Derived consumers: `PrismaInitializationErrorCode` feeds `SAFE_ERROR_MESSAGES` (`initialization-error.ts:29-42`; add both messages), README's list of codes (add both), the package smoke's `.d.ts` checks (update). `Models` feeds `examples/implicit-transaction-demo.ts` and three test files (unchanged usage; must keep working). The public types feed the packaged declaration (`dist/index.d.ts`), checked by the new packaged type check.
- Deliberately left alone: driver adapter, connection gate, datasource target, readiness/WAL, logging policy rules, forwarding proxy mechanics, transaction semantics, peers, Node range, `release.yml`/`ci.yml`; non-SQLite support (FU-004 of repository-prisma-1); Prisma 8.
- Follow-ups: None so far.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / ACs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, AC-001 | Package import | Import loads `@prisma/client` (P1) | Import loads no client module | DS-001 (nothing on import) |
| BEH-002 | Contract | REQ-002, REQ-003, REQ-007; AC-002..AC-007 | App startup registration; first database use | No supported path | Registered module builds the root client and supplies `Models`; types follow the registry | DS-001, DS-002, DS-003 |
| BEH-003 | Contract | REQ-004; AC-008 | prisma-client-js app as today | Works (2.0.0) | Unchanged; default module loaded on first need | DS-002, DS-003 |
| BEH-004 | Contract | REQ-005, REQ-006; AC-009, AC-010 | Missing client; conflicting registration | `MODULE_NOT_FOUND` at import | `PRISMA_CLIENT_UNAVAILABLE`, `PRISMA_CLIENT_CONFLICT`, `TypeError` | DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `probes/README.md`, `probes/esm-app/*`, `probes/cjs-app/*` | Reproduction and feasibility | AC-001..AC-010 | Starting point for tests (P1 must turn green) | Evidence |
| `probes/prototype-src.diff` | Feasibility prototype | — | Shows the shape works; this spec governs where they differ (client source as explicit state, error codes, `Models` traps, test seam) | Non-authoritative |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`
- Structural triggers that fire:
  - Several kinds or forms (Principle 1): two client kinds (registered, default package) and four entry forms that reach the client (explicit init, lazy bind, `Models`, types). Each is traced in DS-001..DS-003 and covered by an AC.
  - Behavior by absence (Principle 13): "use `@prisma/client` because nothing was registered" would be a decision by absence. Response: the client source is explicit state (`default-package` | `registered`), set by an explicit rule.
  - Legacy cleanup (Principle 8): the default-package source could look like a legacy fallback. It is not kept for old behavior only: `prisma-client-js` is a supported Prisma 7 generator and REQ-004 (user-backed) requires it. It is one source kind behind one rule, not a dual code path; everything after the source is shared. Listed for the user (DQ-002).
  - Derived data (Principle 11): new error codes feed messages, README and the smoke checks (Change Scope).
  - Ruled out: repeated coordination (registration rule lives only in the lifecycle); authoritative boundary (callers use the facade only); file overload (`lifecycle.ts` is 438 lines; the registration rule adds about 20, still under 500; loading/validation lives in a new file).
- Root cause classification: `Boundary Or Ownership Issue`. Which client module the library uses is a binding input that today is fixed by a module-level import outside the lifecycle's control, in two places (`lifecycle.ts:21`, `models.ts:4`).
- Refactor needed now: `Yes` (small). Make the client module an owned input of the lifecycle and read it from one owner in both places; move public types onto one types file.
- Evidence: `lifecycle.ts:1,21,68-72`; `models.ts:1-8`; P1.
- Design response: `PrismaClientSource` owns the source state and loading; the lifecycle constructs and owns the source, owns the registration rule and is the only reader (`getClientModule()`, used by its default factory and, through the facade, by `models.ts`); `prisma-types.ts` owns the public type derivation, including `registerPrismaClient`'s parameter type.
- Refactor rationale: without it, the second load site (`Models`) and the type surface would keep importing `@prisma/client` directly.
- Intentional deferrals and residual risk: RSK-001 (skipLibCheck false), RSK-002 (bundlers and `createRequire` for the default path).

## Terminology

- **Prisma client module**: the module a Prisma generator produces, with the runtime values `PrismaClient` (class) and `Prisma` (namespace with `ModelName`). `@prisma/client` is the prisma-client-js one; the generated `client.ts` is the prisma-client one. Code type: `PrismaClientModule`.
- **Client source**: where the library takes its Prisma client module from: `default-package` (`@prisma/client`) or `registered` (passed to `registerPrismaClient`).
- **Register** (runtime) / **registry** (types): `registerPrismaClient` registers the module; `PrismaClientRegistry` registers its types. No other meaning.
- No project glossary found.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: module-level `@prisma/client` runtime imports in `lifecycle.ts` and `models.ts`; `@prisma/client` type imports across the library (replaced by `prisma-types.ts`); `src/lib/types-experiment.ts` (dead).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: the `default-package` client source for prisma-client-js apps (REQ-004). It is a supported Prisma 7 generator, not a superseded flow; there is one rule and a single path after it. User approval requested (DQ-002); the design is not valid for implementation without it.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No schema, storage format or DateTime representation changes; the adapter is unchanged.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002, BEH-004 | App startup `registerPrismaClient(module)` | Client source set to `registered` (or rejected) | `PrismaClientLifecycle` | The one place where the client module can change |
| DS-002 | Primary End-to-End | BEH-002, BEH-003, BEH-004 | `initializePrisma()` or first operation through `prisma`/repository/`rootPrismaClient`/transaction | Ready (or lazy-bound) raw root client built from the source's `PrismaClient` | `PrismaClientLifecycle` | Builds the client from the source; maps a missing client to its code |
| DS-003 | Primary End-to-End | BEH-002, BEH-003, BEH-004 | App reads `Models.X` | Model name from the source's `Prisma.ModelName` | `Models` (models.ts), reading through the lifecycle | Second reader of the source; reads through the lifecycle, the source's only owner |
| DS-004 | Bounded Local | BEH-002, BEH-003 | `PrismaClientSource.current()` | Prisma client module or `PRISMA_CLIENT_UNAVAILABLE` | `PrismaClientSource` | Explicit source state and the lazy default load |
| DS-005 | Primary End-to-End (compile time) | BEH-002, BEH-003 | App `declare module` augmentation of `PrismaClientRegistry` (and its `registerPrismaClient` call) | Public declarations resolve to the registered client types, else `@prisma/client` types; `registerPrismaClient` accepts only the declared module | `prisma-types.ts` | Types follow the same client as the runtime; the runtime call and the declaration cannot disagree |

## Primary Execution Spine(s)

- DS-001: `App startup -> registerPrismaClient (client.ts facade) -> PrismaClientLifecycle.registerClientModule -> assertPrismaClientModule -> PrismaClientSource.register`
- DS-002 (explicit): `App -> initializePrisma (facade) -> PrismaClientLifecycle.initialize -> resolveDatasourceTarget -> default client factory -> PrismaClientSource.current() -> new PrismaClient({ adapter: createSqliteDriverAdapter(target), log }) -> $connect -> SQLite readiness -> Ready`
- DS-002 (lazy): `App -> prisma / repository / rootPrismaClient -> forwarding proxy -> PrismaClientLifecycle.getClientForOperation -> bindLazyClient -> default client factory -> PrismaClientSource.current() -> new PrismaClient(...) -> LazyBound`
- DS-003: `App -> Models.X (models.ts proxy) -> getPrismaClientModule (client.ts facade) -> PrismaClientLifecycle.getClientModule -> PrismaClientSource.current() -> Prisma.ModelName.X`
- DS-005: `App augmentation -> PrismaClientRegistry -> RegisteredPrismaClient / ModelName / TransactionClient / TransactionIsolationLevel / ModelsObject / ContainsStringFilter / RegisteredClientModule -> public declarations (BaseRepository, Delegate, prisma, rootPrismaClient, getPrismaClient, getTransactionClient, RunInTransactionOptions, Models, buildContainsFilter, registerPrismaClient)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The app passes its generated module once. The lifecycle checks the shape (`TypeError` if malformed), treats the same module as a no-op, refuses a different one while a client is bound or binding (`PRISMA_CLIENT_CONFLICT`), and otherwise switches the source to `registered`. | client module, client source, binding | `PrismaClientLifecycle` | shape check (client-source file), error codes |
| DS-002 | Unchanged except where the client comes from: the default factory asks the source for the current module and constructs its `PrismaClient`. If the default package cannot be loaded, the stage failure keeps its code `PRISMA_CLIENT_UNAVAILABLE` through both entry forms (lazy throw; explicit reject + `onDiagnostic` with the cause), and the lifecycle moves to `failed` as for any construction failure. | root client, target, binding | `PrismaClientLifecycle` | client source, adapter, readiness, logging policy |
| DS-003 | `Models` is a read-only view of the current source's `Prisma.ModelName`, read per access through the facade accessor and `PrismaClientLifecycle.getClientModule()` (the lifecycle owns the source), so it follows a later registration and never loads at import. A missing client throws `PrismaInitializationError('PRISMA_CLIENT_UNAVAILABLE')`. | model names | `Models` | client source |
| DS-004 | The source holds `{ kind: 'default-package' }` from the start, or `{ kind: 'registered', module }`. `current()` switches on the kind: `registered` returns the module; `default-package` requires `@prisma/client` through `createRequire(import.meta.url)` (Node caches it) and classifies any load failure as `PRISMA_CLIENT_UNAVAILABLE` with the raw cause attached. | client source | `PrismaClientSource` | — |
| DS-005 | Library declarations use registry-derived aliases only. With an augmentation they resolve to the app's generated types; without one they are exactly the `@prisma/client` types (type-identical to 2.0.0). `registerPrismaClient`'s parameter is `RegisteredClientModule = PrismaClientRegistry extends { client: infer M extends GeneratedModule } ? M : MissingTypeDeclaration` (`GeneratedModule` = `{ PrismaClient: constructor; Prisma: { ModelName: Record<string, string> } }`): the declared module type, or, with no declaration or a declaration that is not a generated module (for example `client: generated.PrismaClient`, MP-002, measured), `MissingTypeDeclaration`, an object type whose single property name is the declaration to add, so the call fails to compile with the fix in the message. It references no `@prisma/client` type, so it stays a real type when Prisma's default types are missing (a check based on them would be `any`). | registry, derived types | `prisma-types.ts` | packaged type check |

## Spine Actors / Main-Line Nodes

`registerPrismaClient` / `initializePrisma` facade (client.ts), `PrismaClientLifecycle`, `PrismaClientSource`, `Models`, `prisma-types.ts` (compile time).

## Ownership Map

- `client.ts` (thin facade): composes only the `PrismaClientLifecycle` singleton and exposes `initializePrisma`, `shutdownPrisma`, `registerPrismaClient`, `rootPrismaClient`, plus the internal `getPrismaClientModule()` for `models.ts`, which calls `lifecycle.getClientModule()`. It never holds the source. Owns no policy.
- `PrismaClientLifecycle`: owns its `PrismaClientSource` (constructs the default one; tests may inject one beside the existing factory seam), the registration rule (same/different module vs. lifecycle state), the one read method `getClientModule()`, and, as today, client construction, binding, readiness and shutdown. Nothing outside the lifecycle holds a reference to the source, so `register` is reachable only through the conflict rule.
- `PrismaClientSource`: owns the source state, the shape check of a module, and loading/classifying the default package. It knows nothing about lifecycle states.
- `Models`: owns the read-only model-name view.
- `prisma-types.ts`: owns the type registry and every type derived from it.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `registerPrismaClient` (client.ts) | `PrismaClientLifecycle.registerClientModule` | Public entry | Conflict rule, shape check |
| `Models` (models.ts) | `PrismaClientLifecycle.getClientModule()` via the facade's `getPrismaClientModule()` | Public value | Loading logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `import PrismaClientPackage from '@prisma/client'` + `PrismaClientRuntime` (`lifecycle.ts:1,21`) | Construction reads the source | `PrismaClientSource.current().PrismaClient` in the default factory | — |
| `import PrismaClientPackage` / eager `Models` (`models.ts:1-7`) | `Models` reads the source per access | Read-only `Models` view | — |
| `@prisma/client` type imports in `base-repository.ts`, `context.ts`, `decorators.ts`, `prisma-manager.ts`, `prisma-proxy.ts`, `client.ts`, `repository-factory.ts`, `filters.ts`, `client/logging-policy.ts`, `client/sqlite-readiness.ts` | Types come from the registry | `prisma-types.ts` (public), local structural types (internal) | Only `prisma-types.ts` references `@prisma/client` |
| `src/lib/types-experiment.ts` | Dead: not exported by `src/index.ts`, imported by no file (repo `grep`; only ticket docs mention it); it imports `@prisma/client` types | — | Delete |
| DESIGN rule "no `createRequire` path" | Superseded by the reasoned default-package load | Rewritten DESIGN section | DQ-002 |

## Return Or Event Spine(s)

N/A: errors return synchronously or as rejected promises through existing paths; `onDiagnostic` is unchanged.

## Bounded Local / Internal Spines

- Parent owner `PrismaClientSource`: `current() -> switch(kind) -> registered: module | default-package: requireFromPackage('@prisma/client') -> module | throw InitializationStageFailure('PRISMA_CLIENT_UNAVAILABLE', cause)`.
- Parent owner `PrismaClientLifecycle`, registration: `registerClientModule(module) -> assertPrismaClientModule -> source.holds(module)? return -> state idle|failed? source.register(module) : throw PrismaInitializationError('PRISMA_CLIENT_CONFLICT')`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Error codes and safe messages (`initialization-error.ts`) | DS-001, DS-002, DS-003 | Lifecycle, `Models` | Two new codes + messages | Stable contract | — |
| Driver adapter, readiness, logging policy | DS-002 | Lifecycle | Unchanged | — | — |

## Ownership Boundaries

- Public entrypoints: `registerPrismaClient`, `initializePrisma`, `shutdownPrisma`, `rootPrismaClient`, `prisma`, `Models`, repositories, transactions; and the type `PrismaClientRegistry`.
- Internal: `PrismaClientLifecycle` (behind the facade) and its owned `PrismaClientSource` (constructed and held only by the lifecycle; read through `lifecycle.getClientModule()`, changed only through `lifecycle.registerClientModule()`).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `PrismaClientLifecycle.registerClientModule` (via facade) | `PrismaClientSource.register` | `registerPrismaClient` | Anything else calling `source.register` | Extend the lifecycle method |
| `PrismaClientLifecycle.getClientModule()` | `PrismaClientSource.current()`, default-package load | `Models` (via the facade accessor); inside the lifecycle, its default client factory | The facade or `models.ts` holding or calling the source; any other `require('@prisma/client')`/`import` of the runtime package | Extend the lifecycle's read method |

## Dependency Rules

- Only `client/client-source.ts` loads `@prisma/client` at runtime. Only `prisma-types.ts` (and test files) import `@prisma/client` types.
- `client-source.ts` depends on `initialization-error.ts` only (for `InitializationStageFailure` and the code type). It must not import the lifecycle.
- `models.ts` depends on the facade (`client.ts`) accessor, not on `lifecycle.ts` or `client-source.ts`. `client.ts` depends on `lifecycle.ts` and `prisma-types.ts` (for `RegisteredClientModule`) only, never on `client-source.ts`. Only `lifecycle.ts` constructs or calls `PrismaClientSource`.
- Public declarations reference registry aliases explicitly (annotate exported constants such as `prisma` and `rootPrismaClient`); never a type that the declaration bundler could resolve to the default client.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `registerPrismaClient(module: RegisteredClientModule): void` | Client source | Register the app's generated module | Compile time: exactly the module type declared in `PrismaClientRegistry` (without a declaration: `MissingTypeDeclaration`, a compile error naming the declaration to add). Runtime: checked as `PrismaClientModule` `{ PrismaClient: constructor, Prisma: { ModelName: Record<string, string> } }` (JS callers and casts) | Sync. Malformed -> `TypeError`; same module -> no-op; different while bound/binding/shutting down -> `PrismaInitializationError('PRISMA_CLIENT_CONFLICT')`; accepted in `idle`/`failed`. "Same" = identical `PrismaClient` and `Prisma` references |
| `interface PrismaClientRegistry {}` | Types | Augmentation target | One field `client: typeof generated` (the type of the generated client module, the same object passed to `registerPrismaClient`) | Library derives the client, model-name, transaction-client and isolation-level types from it (DS-005) |
| `PrismaClientModule` (internal, not exported) | Client source | Runtime shape that `assertPrismaClientModule` checks and the source stores | as above | Not public: the public parameter type is `RegisteredClientModule`, and a wrapper typed with `PrismaClientModule` would not compile against it (ARCH-REV-003 AR-004) |
| `PrismaInitializationErrorCode` | Errors | + `PRISMA_CLIENT_UNAVAILABLE`, `PRISMA_CLIENT_CONFLICT` | — | Messages below |

Messages (safe, no paths):
- `PRISMA_CLIENT_UNAVAILABLE`: "No generated Prisma client is available. Run `prisma generate`, or pass the client your prisma-client generator created to registerPrismaClient()."
- `PRISMA_CLIENT_CONFLICT`: "A different Prisma client is already in use; call and await shutdownPrisma() before registering another."

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `registerPrismaClient` | Yes | Yes | Low | — |
| `PrismaClientRegistry` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Same Meaning Everywhere? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Registration | `registerPrismaClient` | Yes | Yes | Low | Name is part of DQ-001 |
| Type registry | `PrismaClientRegistry` | Yes | Yes | Low | — |
| Module shape | `PrismaClientModule` | Yes | Yes | Low | — |
| Source owner | `PrismaClientSource` | Yes | Yes | Low | — |
| Codes | `PRISMA_CLIENT_UNAVAILABLE`, `PRISMA_CLIENT_CONFLICT` | Yes | Follow `*_CONFLICT` pattern | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Binding conflict rule | `PrismaClientLifecycle` (`DATASOURCE_CONFLICT`, `LOGGING_POLICY_CONFLICT`) | Extend | Same kind of rule | — |
| Error codes | `initialization-error.ts` | Extend | Same contract | — |
| Client construction seam | `PrismaClientFactory` | Reuse | Already the construction seam | — |
| Source state + default load | — | Create New (`client/client-source.ts`) | A loading/validation concern that the lifecycle should not own line by line | Lifecycle would grow toward 500 lines with an unrelated concern |
| Public type derivation | — | Create New (`prisma-types.ts`) | One owner for every derived type | Types are spread over 10 files today |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision |
| --- | --- | --- | --- | --- |
| `src/lib/client/` | source, lifecycle, errors | DS-001, DS-002, DS-004 | Lifecycle | Extend |
| `src/lib/` | facade, `Models`, types, repositories, transactions | DS-003, DS-005 | — | Modify |
| `scripts/`, `prisma/`, `src/tests/` | validation | — | — | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping; no shared structure beyond `PrismaClientModule` and the registry types emerged.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Client / transaction / model-name / isolation types | `src/lib/prisma-types.ts` | `src/lib` | Used by 9 files | Yes | Yes (replaces `@prisma/client` imports) | A runtime module |
| `PrismaClientModule` | `src/lib/client/client-source.ts` | client | Lifecycle and source (internal runtime shape) | Yes | Yes | A config bag for future options |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `PrismaClientModule { PrismaClient, Prisma }` | Yes | Yes (only `Prisma.ModelName` is read) | Low | — |
| `PrismaClientRegistry { client }` (module type) | Yes | Yes (one field; everything else derived) | Low | — |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `src/lib/client/client-source.ts` (new) | `PrismaClientSource` | `PrismaClientModule` type; `assertPrismaClientModule` (`TypeError`); source state `default-package`/`registered`; `current()`; `holds(module)`; `register(module)`; default load via `createRequire(import.meta.url)` with `PRISMA_CLIENT_UNAVAILABLE` classification |
| `src/lib/client/lifecycle.ts` | `PrismaClientLifecycle` | Constructs and owns its `PrismaClientSource` (constructor options allow tests to inject a source and, as today, a client factory); default factory built from the source; `getClientModule()` (returns `source.current()`); `registerClientModule(value: unknown)` runs `assertPrismaClientModule` first (the public parameter type is compile-time only, so the facade passes the value on without a cast); `registerClientModule`; factory failures keep a stage-failure code via `failureFrom` in `bindLazyClient` and `initializeNewClient` |
| `src/lib/client/initialization-error.ts` | Errors | Two codes + messages |
| `src/lib/client.ts` | Facade | Composes the lifecycle only; `registerPrismaClient` -> `lifecycle.registerClientModule`; internal `getPrismaClientModule()` -> `lifecycle.getClientModule()`; `rootPrismaClient` annotated with `RegisteredPrismaClient` |
| `src/lib/prisma-types.ts` (new) | Types | `PrismaClientRegistry`; with `client: M` registered: `RegisteredPrismaClient = InstanceType<M['PrismaClient']>`, `ModelName = M['Prisma']['ModelName'][keyof M['Prisma']['ModelName']]`, `ModelsObject = M['Prisma']['ModelName']`; unregistered: exactly the `@prisma/client` types (`PrismaClient`, `Prisma.ModelName`, `typeof Prisma.ModelName`); in both cases `TransactionClient = Omit<RegisteredPrismaClient, ITXClientDenyList>` (from `@prisma/client/runtime/client`) and `TransactionIsolationLevel` from the interactive `$transaction` options; `ContainsStringFilter`: unregistered exactly `Prisma.StringFilter`, registered `{ contains: string; mode?: 'insensitive' }` (because `typeof generated` exposes no type-only namespace members such as `StringFilter`). `ModelsObject` unregistered is exactly `typeof Prisma.ModelName`; `RegisteredClientModule` (DS-005) with `MissingTypeDeclaration`, whose single property name is the hint text: `repository_prisma: declare the generated client module: declare module 'repository_prisma' { interface PrismaClientRegistry { client: typeof generated } }` |
| `src/lib/models.ts` | `Models` | Read-only view over `getPrismaClientModule().Prisma.ModelName`: forwards `get`, `has`, `ownKeys`, `getOwnPropertyDescriptor` (so `Object.keys/values`, `in`, spread work; descriptors reported as configurable, because the proxy target does not own the keys); rejects writes; typed `ModelsObject`; converts a stage failure to `PrismaInitializationError` |
| `src/lib/base-repository.ts`, `repository-factory.ts`, `context.ts`, `decorators.ts`, `prisma-manager.ts`, `prisma-proxy.ts` | — | Type imports from `prisma-types.ts`; `prisma` annotated with `RegisteredPrismaClient` |
| `src/lib/filters.ts` | — | Return type `ContainsStringFilter` from `prisma-types.ts` (exactly `Prisma.StringFilter` unregistered; library-owned `{ contains: string; mode?: 'insensitive' }` registered, measured assignable to a registered client's string `where`) |
| `src/lib/client/logging-policy.ts`, `client/sqlite-readiness.ts` | — | Local structural types (log level union; `{ $queryRawUnsafe }`) |
| `src/index.ts` | Package entry | + `registerPrismaClient`, `type PrismaClientRegistry` (`PrismaClientModule` stays internal) |
| `src/lib/types-experiment.ts` | — | Delete (dead) |
| `tsup.config.ts` | Build | `target: 'es2020'` (ESM keeps `import.meta`), `shims: true` (CJS `import.meta.url`) |
| `tsconfig.json` | Typecheck (default-client program) | `module: 'esnext'`, `moduleResolution: 'bundler'` (allows `import.meta`); `exclude` the registered folders `examples/prisma-client-generator/**` and `src/tests/prisma-client-generator/**`, because a `PrismaClientRegistry` augmentation applies to its whole program and would turn the T1..T15 cases into checks of the registered client |
| `tsconfig.prisma-client-generator.json` (new) | Typecheck (registered program) | Extends `tsconfig.json`; `paths: { "repository_prisma": ["./src/index.ts"] }`; includes `src/lib/**`, `src/index.ts` and the two registered folders, so their `declare module 'repository_prisma'` matches what a consumer writes. It sets its own `exclude: ["node_modules", "dist"]`: TypeScript inherits `include` and `exclude` separately, so without it the base `exclude` would drop exactly the registered folders (ARCH-REV-003 AR-003, reproduced) |
| `package.json` | Scripts | `typecheck` is the single driver: the default program, then the registered program, then the program-content check (`tsc -p tsconfig.json && tsc -p tsconfig.prisma-client-generator.json && node scripts/check-typecheck-programs.js`); nothing else changes (no version bump) |
| `scripts/check-typecheck-programs.js` (new) | Typecheck guard | Runs `tsc --listFilesOnly` for both configs and fails unless every file under `examples/prisma-client-generator/` and `src/tests/prisma-client-generator/` is in the registered program and none is in the default program. A passing `tsc` proves nothing about files outside its program; this keeps AC-011/AC-013 meaningful (DESIGN.md DC-002) |
| `.gitignore` | Repo | Ignore `generated/` (the second generator's output) |
| `examples/prisma-client-generator/db.ts`, `demo.ts` (new) | Example | The README's copy-paste `db.ts` (namespace import, `registerPrismaClient(generated)`, declaration) and a short demo (import `./db` first, repository with `Prisma.ModelName`, a transaction), compiled by the registered program |
| `prisma/schema.prisma` | Test schema | Second generator `provider = "prisma-client"`, `output = "../generated/prisma-client"` (repository root, git-ignored, shared by the registered tests and the example; not in the package `files`); options chosen so both typecheck programs and vitest accept it |
| `src/tests/*` | Tests | New prisma-client tests (AC-002..AC-005, AC-009, AC-010, a concurrent-request case) in `src/tests/prisma-client-generator/` with their own registration and declaration (registered program; deliberate wrong calls for AC-010 use `@ts-expect-error`); lifecycle test updates for the constructor; `Models` view tests; type-equality test for prisma-client-js (AC-008, the cases listed in "AC-008 Type-Equality Inventory") |
| `scripts/package-smoke/packed-artifact.js` | Package validation | `.d.ts` text checks: replace `isolationLevel?: Prisma.TransactionIsolationLevel`; add `registerPrismaClient`, `PrismaClientRegistry`, both new codes; `PrismaClientModule` is not exported |
| `scripts/package-smoke/import-safety.js` | Package validation | Additionally assert that importing CJS and ESM loads no `@prisma/client` at all (REQ-001) |
| `scripts/package-smoke/logging-policy.js` | Package validation | The ESM cases stub `@prisma/client` with an ESM `resolve` hook, which a `createRequire` load does not pass through; intercept the CJS-level load (as the CJS cases do with `Module._load`) so both formats keep covering every policy case |
| `scripts/package-smoke/prisma-client-generator.js` (new step, called by `scripts/run-package-smoke.js`) | Package validation | In the temp consumer: generate a `prisma-client` client (ESM, and `moduleFormat = "cjs"`), compile it with the repo's `tsc`, then run register/init with WAL/CRUD/transaction rollback/`Models` through the ESM and CJS builds (AC-002, AC-007); the missing-client case without registration (AC-009) |
| `scripts/package-smoke/consumer-types.js` | Package validation | Add a registered-consumer type check: `PrismaClientRegistry { client: typeof generated }`, valid code compiles, `@ts-expect-error` lines for an unknown field, model, delegate, isolation level and a different registered object (AC-006, AC-013); add a consumer that calls `registerPrismaClient(generated)` without the declaration and assert that `tsc` fails with the declaration text in its output (AC-013); keep the existing unregistered check |
| `scripts/run-package-smoke.js` | Runner | Call the new step; add its result to the summary line |
| `README.md`, `DESIGN.md`, `TESTING.md`, `CHANGELOG.md` | Docs | DESIGN.md also gets design case DC-002 (section "DESIGN.md Design Case To Add"); TESTING.md's Typecheck row names both programs and the program-content check; REQ-009 (README: schema block, copy-paste `db.ts`, import first, `Prisma.ModelName`/`BaseRepository<'X'>`, the compile error you get without the declaration, `skipLibCheck` and bundler notes); TESTING.md: the Typecheck layer now has two programs and what each proves |

## AC-008 Type-Equality Inventory

Every pre-existing export whose type involves Prisma, compared with its 2.0.0 definition in `@prisma/client` terms, in a test compiled by `npm run typecheck` (`Eq<A, B>` = mutual conditional-type identity). Measured passing on the prototype (`probes/type-equality.typecheck.ts`).

| Case | Export | Must be identical to (2.0.0 definition) |
| --- | --- | --- |
| T1 | `ReturnType<typeof buildContainsFilter>` | `Prisma.StringFilter` |
| T2 | `typeof Models` | `typeof Prisma.ModelName` |
| T3 | `ModelName` | `Prisma.ModelName` |
| T4 | `Delegate<'User'>` | `PrismaClient['user']` |
| T5 | `typeof prisma` | `PrismaClient` |
| T6 | `typeof rootPrismaClient` | `PrismaClient` |
| T7 | `ReturnType<typeof getPrismaClient>` | `PrismaClient \| Prisma.TransactionClient` |
| T8 | `ReturnType<typeof getTransactionClient>` | `Prisma.TransactionClient \| undefined` |
| T9 | `RunInTransactionOptions` | `{ maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }` |
| T10 | `Parameters<typeof defineRepository>[0]` | `Prisma.ModelName` |
| T11 | `Parameters<typeof BaseRepository.forModel>[0]` | `Prisma.ModelName` |
| T12 | `BaseRepository<'User'>['delegate']` | `PrismaClient['user']` |
| T13 | `Parameters<BaseRepository<'User'>['create']>[0]` | `Parameters<PrismaClient['user']['create']>[0]` |
| T14 | `typeof runInTransaction` | `<T>(callback: () => Promise<T>, options?: RunInTransactionOptions) => Promise<T>` |
| T15 | `typeof Transactional` | its 2.0.0 signature (`filters`, `database` and initialization exports have no Prisma types) |

`PrismaInitializationErrorCode` is not in this list: REQ-005/REQ-006 add exactly `PRISMA_CLIENT_UNAVAILABLE` and `PRISMA_CLIENT_CONFLICT`, which the packed-artifact and consumer-types smoke steps check. The new exports (`registerPrismaClient`, `PrismaClientRegistry`) are additions.

## Applied Patterns

- Registry (types): `PrismaClientRegistry` declaration merging, the usual TypeScript pattern for library types that follow an app-defined type.
- Explicit state (source kinds) instead of a lookup fallback.

## Target Subsystem / Folder / File Mapping

Covered by the Final File Responsibility Mapping; the existing layout (`src/lib`, `src/lib/client`) already matches the ownership (public facade and types in `src/lib`, client internals in `src/lib/client`).

## Folder Boundary Check

| Path | Structural Depth | Ownership Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `src/lib/client/` | Off-spine concern of the facade | Yes | Low | Internals of the client subsystem |
| `src/lib/prisma-types.ts` | Mixed justified | Yes | Low | Public type surface beside the public modules that use it |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| App setup (prisma-client) | see below | Passing the client to `initializePrisma` only (lazy users get nothing) | One call covers lazy and explicit use |
| Source decision | `switch (source.kind) { case 'registered': ...; case 'default-package': ... }` | `registered ?? require('@prisma/client')` | Principle 13: explicit rule, not absence |
| Forgotten declaration | `registerPrismaClient(generated)` fails to compile: `... not assignable to parameter of type 'MissingTypeDeclaration'`, naming the block to add | A conditional on `@prisma/client` types (`IsAny<DefaultPrismaClient>`) | It cannot work: with those types missing, every derived type is `any` (measured) |
| Declarations | `export const prisma: RegisteredPrismaClient = createForwardingPrismaProxy<RegisteredPrismaClient>(...)` | Unannotated `export const prisma = createForwardingPrismaProxy(...)` | The declaration bundler inlined the default type (measured) |

```typescript
// prisma/schema.prisma: generator client { provider = "prisma-client"  output = "../src/generated/prisma" }

// src/db.ts — once; the app's entry imports it first
import * as generated from './generated/prisma/client';
import { registerPrismaClient } from 'repository_prisma';

registerPrismaClient(generated);

declare module 'repository_prisma' {
  interface PrismaClientRegistry { client: typeof generated }
}
```

`registerPrismaClient` accepts exactly the module declared in `PrismaClientRegistry`, so the README shows the namespace form only (an object literal such as `{ PrismaClient, Prisma }` does not match `typeof generated`). Forgetting the `declare module` block makes the `registerPrismaClient` line fail to compile with the block's text in the error. For prisma-client apps the README names models with the app's own `Prisma.ModelName.X` or `BaseRepository<'X'>`: `Models.X` resolves on access, so a repository module evaluated before `db.ts` would throw `PRISMA_CLIENT_UNAVAILABLE`.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the eager `@prisma/client` import and wrap it in `try/catch` | Smallest change | Rejected | ESM static imports cannot be caught; replaced by the explicit source |
| A second package entry for prisma-client apps (alternative B) | Avoids `createRequire` | Rejected (recommendation) | See Key Tradeoffs |
| Default-package source for prisma-client-js | REQ-004 | Kept, pending user approval (DQ-002) | Not a legacy path: a supported generator behind one explicit rule |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Start from P1: a packed build imported by a prisma-client-only consumer fails (the new smoke step's first case; it must turn green).
2. Add `prisma-types.ts`; move every public type import onto it; annotate `prisma`/`rootPrismaClient`; add the prisma-client-js type-equality test (must pass before and after).
3. Add `client-source.ts`; the lifecycle constructs and owns the source and exposes `getClientModule()`; default factory from the source; `failureFrom` in both factory catch blocks; registration rule; two codes + messages; facade + index exports.
4. Rewrite `models.ts` as the read-only view; delete `types-experiment.ts`.
5. Build/typecheck config (`es2020`, `shims`, `esnext`/`bundler`); `RegisteredClientModule` as `registerPrismaClient`'s parameter; the second typecheck program and the `typecheck` script; `.gitignore`.
6. Test schema second generator (`generated/prisma-client`); `scripts/check-typecheck-programs.js` in the `typecheck` script; registered source tests in `src/tests/prisma-client-generator/`; the example in `examples/prisma-client-generator/`; update lifecycle tests for the constructor.
7. Smoke step modules: `.d.ts` checks, import safety, ESM logging-policy interception, new prisma-client step (ESM/CJS, missing client), registered consumer type check.
8. README section "Using the prisma-client generator" (schema, `db.ts`, `Prisma.ModelName` note, `skipLibCheck` note, bundler note), codes list; DESIGN (client source, registry, rewritten `createRequire` rule, file list); TESTING.md test-layer table if the new smoke step or source tests change what a layer proves; CHANGELOG Unreleased (non-breaking).

## DESIGN.md Design Case To Add (DC-002)

The Solution Designer's design mistake that ARCH-REV-003 found (AR-003). Implementation is updating `DESIGN.md` in this ticket and appends this case after DC-001, unchanged:

```markdown
### DC-002: A type check that compiled none of the files it was meant to check (prisma-client generator, ARCH-REV-003 AR-003)

- **Problem:** the design added a second typecheck program for the registered example and tests,
  `tsconfig.prisma-client-generator.json`, extending `tsconfig.json` and overriding only `include`.
  TypeScript inherits `include` and `exclude` separately, so the child kept the base `exclude`,
  which named exactly the registered folders. The program compiled none of them, and `tsc` passed.
- **How it was found:** architecture review reproduced it with `tsc --listFilesOnly` and a
  deliberately broken file in the excluded folder; `tsc` still exited 0.
- **Wrong assumption:** the design's feasibility probe read "no errors" as "the files compile",
  without checking which files were in the program.
- **Fix:** the registered config sets its own `exclude`, and `npm run typecheck` runs
  `scripts/check-typecheck-programs.js`, which fails unless each registered file is in the
  registered program and absent from the default one.
- **Lesson:** a passing check proves nothing about inputs it never saw. Before relying on a
  passing type check or test run, confirm the files are in it (`--listFilesOnly`, the test list)
  and run one negative control that must fail.
```

## Key Tradeoffs

- **A (chosen): one entry, registration + lazy default.** Every app imports from `repository_prisma`. prisma-client-js apps change nothing; prisma-client apps add one call and one type declaration. Cost: one `createRequire` load of `@prisma/client` (reversing the old DESIGN rule), `Models` becomes a view, build target es2020.
- **B: second entry point** (e.g. `repository_prisma/<subpath>` that never loads `@prisma/client`). No `createRequire`, but: two import paths that apps must not mix (a root import still crashes a prisma-client app with `MODULE_NOT_FOUND`), shared state across entries needs code splitting (experimental for CJS in tsup) or a package self-reference, and the same registration and type registry are still needed. More packaging for the same user-facing setup.
- **C: registration required for everyone** (no `@prisma/client` runtime load at all, next major 3.0.0). Simplest code, but every current user must change code. That breaks REQ-004 and the 2.0.0 "simple" requirement now, while Prisma 7 still supports prisma-client-js and Prisma 8 will need its own rework anyway.

## Risks

- RSK-001: prisma-client-only apps with `skipLibCheck: false` see errors in `@prisma/client/default.d.ts` (DQ-003; documented).
- RSK-002: esbuild-style bundling of the default path (`createRequire` is not traced); registered clients are unaffected. Documented in README.
- RSK-003: declaration inlining; guarded by annotations and the packaged type check.
- Generated-client shape changes within Prisma 7.x: covered by the real generated-client tests.

## Guidance For Implementation

- Reproduction to start from: `probes/README.md` P1 (import of the packed package in a prisma-client-only consumer fails with `MODULE_NOT_FOUND .prisma/client/default`); `probes/esm-app/*` and `probes/cjs-app/*` are ready-made consumer cases. `probes/prototype-src.diff` shows a working shape but differs from this spec (explicit source kinds, codes, `Models` traps, test seam); follow this spec.
- Keep error messages free of paths; raw causes only through `onDiagnostic`.
- Lazy failure keeps today's semantics: the first lazy use without a usable client throws `PRISMA_CLIENT_UNAVAILABLE` and moves the lifecycle to `failed`; later lazy use throws `CLIENT_NOT_READY` until `initializePrisma()` or `shutdownPrisma()`. AC-009 asserts on the first use.
- Follow `TESTING.md`: `npm run typecheck`, `npm test`, `npm run test:package` (non-root). Because the lifecycle changes, run a concurrent-request test with the registered prisma-client client too (the `transaction-isolation` shape, DC-001). Because the README setup changes, also run a fresh consumer per `TESTING.md` "Choosing The Layer" (packed tarball, no `--legacy-peer-deps`, README setup only, ESM and CJS) for the prisma-client setup.
- Install with `npm ci --strict-allow-scripts` as CI does; the second generator must not need new install-script approvals.
- Do not bump the version, tag or publish.

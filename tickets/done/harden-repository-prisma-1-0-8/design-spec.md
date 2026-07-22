# repository_prisma 1.0.8 Logging and Import Environment Hardening — Design Spec

## Current-State Read

The public package barrel (`src/index.ts`) re-exports the lifecycle facade. The
facade (`src/lib/client.ts`) creates the lifecycle singleton and forwarding root proxy,
but also imports `dotenv/config`; tsup copies that side effect into both published
formats. The lifecycle owner (`src/lib/client/lifecycle.ts`) is otherwise the sole raw
`PrismaClient` constructor and owns the 1.0.7 state machine, target binding,
initialization, SQLite identity/WAL checks, classified failure, shutdown, and rebind.

The constructor currently hard-codes `['query', 'info', 'warn']`. The current import
path does not construct a raw client or require a datasource, but it can mutate
`process.env` by discovering `.env`. Baseline source tests pass 62/62 while visibly
emitting `prisma:query`, confirming an uncovered behavior defect rather than a stale
test expectation. Exact generated and published artifacts reproduce both defects;
see the behavior map and investigation notes.

The target must keep `PrismaClientLifecycle` as the authoritative raw-client owner and
`client.ts` as a thin public facade. A small logging-policy concern is extracted from
the lifecycle constructor literal because it is used by both explicit initialization
and lazy binding. No broad lifecycle, repository, transaction, datasource, SQLite, or
proxy redesign is warranted.

## Intended Change

1. Remove all runtime and repository CLI `dotenv/config` imports. Remove `dotenv` from
   package dependencies, lockfile, and build externalization. The test script and CI
   already provide `DATABASE_URL` explicitly; direct Prisma CLI usage must do the same.
2. Add `logQueries?: boolean` to `InitializePrismaOptions`.
3. Add a pure logging-policy owner that parses `PRISMA_LOG_QUERIES` only when a raw
   client is about to be constructed. Accepted values are trimmed and compared
   case-insensitively against `1`, `true`, `yes`, and `on`; everything else is false.
4. Make an explicitly supplied `logQueries` value override the environment flag.
   Construct a default client with exactly `['info', 'warn', 'error']`, appending
   `query` only for an effective true policy.
5. Record the effective policy in `LazyBound`, `Initializing`, and `Ready` lifecycle
   states. A later initialization without `logQueries` retains the already bound
   policy. A later explicit value that differs from that policy rejects with the new
   stable `LOGGING_POLICY_CONFLICT` code; `shutdownPrisma()` is required before a new
   logging policy is bound. This prevents silent option loss and preserves the existing
   client identity/rebinding contract.
6. Add isolated source and packed-artifact coverage for both conditional entrypoints,
   constructor-level logging options, policy parsing, and all named 1.0.7 regressions.
7. Update `README.md`, `DESIGN.md`, and a new `CHANGELOG.md`; set package metadata to
   1.0.8 and add `CHANGELOG.md` to the `package.json.files` whitelist. Publication
   remains a separate, explicitly authorized delivery action.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BE-RP108-001` | Contract | `REQ-RP108-001`–`REQ-RP108-003`; `AC-RP108-001`–`AC-RP108-004` | Consumer initializes or lazily uses the root client | Lifecycle factory includes `query`; baseline test output emits SQL | Resolve one policy and use info/warn/error by default; query only on explicit opt-in | `DS-RP108-INIT`, `DS-RP108-LAZY`, `DS-RP108-LOG` |
| `BE-RP108-002` | Contract | `REQ-RP108-005`; `AC-RP108-005`–`AC-RP108-007` | Consumer imports conditional ESM or CJS package export | Facade imports `dotenv/config`; canary is loaded on import | Import performs no `.env` discovery/loading or environment mutation | `DS-RP108-IMPORT` |
| `BE-RP108-003` | Contract | `REQ-RP108-004`, `REQ-RP108-006`; `AC-RP108-008`–`AC-RP108-009`, `AC-RP108-015`–`AC-RP108-017` | Consumer imports without using a Prisma surface, then performs supported lazy/explicit access | Import constructs no raw client today; lazy acquisition and explicit datasource are existing contracts | Import does not construct a client or require a datasource; lazy acquisition and explicit datasource support remain intact | `DS-RP108-IMPORT`, `DS-RP108-LAZY` |
| `BE-RP108-004` | Contract | `REQ-RP108-006`; `AC-RP108-018`–`AC-RP108-028` | Consumer performs existing initialization, repository, proxy, transaction, WAL, shutdown, or rebind action | 1.0.7 state machine and proxies are covered by 62 tests | Preserve exact lifecycle behavior, with policy added only to raw construction | `DS-RP108-INIT`, `DS-RP108-LAZY`, `DS-RP108-LIFE`, `DS-RP108-RETURN` |
| `BE-RP108-005` | Contract | `REQ-RP108-007`–`REQ-RP108-009`; `AC-RP108-029`–`AC-RP108-034` | Node resolves package `import`/`require` and consumer packs artifact | tsup generates equivalent formats; 1.0.7 packed artifact has both outputs | Source build produces equivalent 1.0.8 ESM/CJS/declarations and retains peer range | `DS-RP108-IMPORT`, `DS-RP108-PACK` |
| `BE-RP108-006` | Operational | `REQ-RP108-010`; `AC-RP108-035` | Consumer reads usage/release/architecture documentation | Docs describe 1.0.7 but not new logging/import ownership | Document no automatic `.env`, explicit preload, temporary query opt-in, sensitivity warning, and no data migration | `DS-RP108-DOCS` |

## Relevant Supplemental Task Artifacts

None. The requirements, investigation notes, and this design spec contain the complete
intended behavior and evidence. No separate supplement is required.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` plus `Behavior Change`.
- Current design issue found: `Yes`.
- Root cause classification: `Missing Invariant` plus `Boundary Or Ownership Issue`.
- Refactor needed now: `Yes`, narrowly scoped.
- Evidence: query-log policy is an unowned constructor literal, while application
  configuration loading sits in the public import boundary. The existing lifecycle
  owner, datasource resolver, readiness owner, and forwarding boundary remain healthy.
- Design response: introduce one pure logging-policy concern under the client
  capability area; keep all raw construction in the lifecycle; remove dotenv side
  effects from the facade and CLI config; add a policy field to lifecycle states.
- Refactor rationale: this is the minimum structural change that prevents explicit and
  lazy construction from drifting while preserving the 1.0.7 owner model.
- Intentional deferrals and residual risk: no broad lifecycle refactor. A consumer that
  accesses a root surface before initialization must accept the environment-derived
  policy or explicitly shut down before changing it; this is documented and tested.

## Terminology

- **Effective logging policy:** the final boolean after typed `logQueries` precedence
  and environment parsing, captured for one raw client construction.
- **Lazy-bound policy conflict:** an explicit later `logQueries` value differs from the
  policy already captured by a client constructed through lazy root access.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove `import 'dotenv/config'` from `src/lib/client.ts` and
  `prisma.config.ts`.
- Remove the old `['query', 'info', 'warn']` constructor default; do not retain a
  compatibility flag that re-enables implicit query logging.
- Remove `dotenv` from `package.json`, `package-lock.json`, and the tsup external list.
- Do not add a second legacy client factory, old dotenv fallback, or dual logging path.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: Consumer-owned
  Prisma databases; local test SQLite is disposable `test.db`/temporary fixtures.
- Relevant code-model, serialization, semantic, or physical-store change: None. Only
  client constructor logging and import configuration ownership change.
- Normal reader/writer behavior and representative evidence: Existing Prisma readers,
  writers, schema, and SQLite readiness tests remain unchanged; prior 1.0.7 tests read
  existing rows directly without migration.
- Required semantics and invariants under direct use: Preserve all rows and schema;
  yes, directly usable.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints:
  Query logging policy must not cause writes or migrations. All new tests use temporary
  synthetic configuration and data.
- Decision: `Directly Usable — No Migration`.
- Decision rationale: no persisted representation or runtime data contract changes;
  any migration would be unrelated, risky, and prohibited by scope.
- Acceptance criteria or design constraints supported: `AC-RP108-009`–`AC-RP108-011`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-RP108-INIT` | Primary End-to-End | `BE-RP108-001`, `BE-RP108-004` | Consumer `initializePrisma(options)` | Ready lifecycle client available to repositories/proxies | `PrismaClientLifecycle` | Carries target resolution, logging policy, connection/readiness, and publish ordering |
| `DS-RP108-LAZY` | Primary End-to-End | `BE-RP108-001`, `BE-RP108-003`, `BE-RP108-004` | Root/repository operation | Current root proxy invokes the bound raw client | `PrismaClientLifecycle` with public forwarding facade | Ensures lazy acquisition uses the same policy and lifecycle owner |
| `DS-RP108-IMPORT` | Primary End-to-End | `BE-RP108-002`, `BE-RP108-003`, `BE-RP108-005` | Node `import`/`require` | Exported functions/proxies with no raw construction or env file load | `client.ts` thin facade and build pipeline | Makes import safety and CJS/ESM parity observable |
| `DS-RP108-LOG` | Bounded Local | `BE-RP108-001` | Constructor request plus typed/env inputs | `PrismaClient` `log` array | Logging-policy module | Keeps parsing/precedence deterministic and independent of lifecycle sequencing |
| `DS-RP108-LIFE` | Bounded Local | `BE-RP108-004` | Lifecycle request/state transition | Ready, classified failure, shutdown, or rebind | `PrismaClientLifecycle` | Existing concurrency and cleanup invariants must survive the extra policy field |
| `DS-RP108-RETURN` | Return-Event | `BE-RP108-004` | Client connect/readiness/shutdown promise | Safe resolve/reject and diagnostic callback | Lifecycle error/diagnostic owner | Preserves stable errors and optional raw-cause channel |
| `DS-RP108-PACK` | Primary End-to-End | `BE-RP108-005` | Source/build/pack command | Installed consumer imports shipped files | Build/package scripts | Prevents source-only or one-generated-file fixes |
| `DS-RP108-DOCS` | Primary End-to-End | `BE-RP108-006` | Consumer documentation lookup | Correct configuration and release expectations | README/DESIGN/CHANGELOG | Makes security and environment ownership explicit |

## Primary Execution Spine(s)

`Consumer initializePrisma(options) -> public client facade -> lifecycle target resolver -> logging-policy resolver -> raw PrismaClient factory -> connect/SQLite readiness -> Ready lifecycle -> root/repository/proxy operation`

`Consumer import -> conditional package export -> source facade -> lifecycle singleton and forwarding proxies -> no dotenv/file/datasource/client side effect`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-RP108-INIT` | Initialization enters the existing facade and lifecycle. The lifecycle resolves one normalized target, resolves one effective logging policy, constructs the candidate with explicit datasource and log levels, runs existing connection/SQLite checks, and publishes only a ready client. | Public initialization facade; `PrismaClientLifecycle`; raw Prisma client; readiness boundary | `PrismaClientLifecycle` | Datasource target, logging policy, SQLite readiness, safe errors/diagnostics |
| `DS-RP108-LAZY` | A root/repository operation enters the forwarding boundary. If idle, the lifecycle resolves the current datasource and env logging policy and constructs the lazy-bound raw client; the invocation then uses the same owner. Later typed disagreement is rejected rather than silently ignored. | Repository/proxy caller; lifecycle; raw root client; Prisma operation | `PrismaClientLifecycle` | Forwarding proxy, ALS transaction context, target normalization |
| `DS-RP108-IMPORT` | Node selects the ESM or CJS output. Module evaluation creates only pure state/proxy objects; no client factory, datasource resolver, dotenv loader, or process-env mutation is reached. | Node loader; built entrypoint; public facade; lifecycle/proxy definitions | Build output plus thin facade | Conditional exports and external peer loading |
| `DS-RP108-PACK` | A clean build feeds npm pack and an isolated consumer installs the tarball. The consumer exercises both conditional exports and checks runtime behavior, not only source tests. | Source; tsup; npm pack; isolated consumer; ESM/CJS entrypoints | Build/package scripts | Artifact inspection, peer compatibility, synthetic env |

## Spine Actors / Main-Line Nodes

- Consumer initialization or operation caller.
- `src/lib/client.ts` public facade and forwarding root boundary.
- `PrismaClientLifecycle` authoritative raw-client/lifecycle owner.
- `resolveDatasourceTarget` existing datasource target owner.
- `logging-policy.ts` effective query logging policy owner.
- Raw `PrismaClient` and existing SQLite readiness checks.
- Existing forwarding proxy / repository / ALS transaction surfaces.
- tsup and npm packed artifact for module-format validation.

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| Public client facade | Exported initialization/shutdown functions, root forwarding boundary, and no hidden configuration loading. It is thin, not a lifecycle owner. |
| `PrismaClientLifecycle` | Raw client construction, target identity, lifecycle states, sequencing, policy capture, readiness publication, failure cleanup, shutdown, and rebind. |
| Datasource target resolver | Explicit/env target selection, normalization, provider classification, and conflict key. It does not construct clients or load files. |
| Logging-policy owner | Pure truthy parsing, typed-over-env precedence, and creation of the exact Prisma log-level array. It does not own lifecycle or log output. |
| SQLite readiness owner | Existing physical identity/WAL checks. It does not choose logging policy or publish lifecycle state. |
| Forwarding proxies / repository / ALS | Invocation-time routing to current root or transaction client. They must not construct or retain an alternate raw root owner. |
| Build/package scripts | Generate and validate ESM/CJS/declaration/packed outputs. They do not alter runtime behavior. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `src/lib/client.ts` exports and `rootPrismaClient` | `PrismaClientLifecycle` | Stable package API and forwarding root surface | dotenv loading, datasource selection, raw construction, log mutation, readiness state |
| `src/index.ts` | Exported capability modules | Package barrel and type/value exports | Initialization side effects or an alternate lifecycle |
| ESM/CJS generated entrypoints | Source barrel/build pipeline | Node conditional module compatibility | Hand-maintained divergent behavior |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `import 'dotenv/config'` in `src/lib/client.ts` | Package import must not own application configuration | Consumer/application environment preload; `database.ts` reads already-present env at use time | In This Change | No fallback loader |
| `import "dotenv/config"` in `prisma.config.ts` | Repository must not auto-discover `.env` through CLI config | Explicit `DATABASE_URL` from test script, CI, or caller shell | In This Change | Update README test/CLI note |
| Hard-coded `['query','info','warn']` | Unsafe implicit query logging and missing default errors | `logging-policy.ts` plus lifecycle factory | In This Change | Query only explicit opt-in |
| `dotenv` dependency and lock entries | No remaining repository runtime/CLI use | No replacement dependency; explicit env ownership | In This Change | Verify npm pack metadata |
| `dotenv` in `tsup.config.ts` external list | No source import remains | Existing external peer list only | In This Change | Build config hygiene |

## Return Or Event Spine(s) (If Applicable)

`Raw client connect/readiness -> lifecycle state publication or classified failure -> safe promise result; optional onDiagnostic receives raw cause -> caller handles startup/recovery.`

`Shutdown request -> existing state transition and disconnect -> Idle/rejected operation -> later initialize may bind new target/policy.`

The new logging policy emits no events and must not add console output. Prisma's own
query events are controlled only by the constructed `log` array.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `PrismaClientLifecycle`.
- Short chain: `Lifecycle request -> resolve target -> resolve policy -> construct candidate -> connect -> identity/WAL checks -> publish Ready or cleanup/Failed`.
- Why it matters: policy must be resolved before construction, while existing readiness
  and publication ordering remain unchanged.

- Parent owner: `logging-policy.ts`.
- Short chain: `explicit option defined? -> use boolean : parse env string -> build default levels or append query`.
- Why it matters: no import-time reads or mutable global policy; tests can cover every
  truthy/falsey value without a database.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Logging policy resolver | `DS-RP108-INIT`, `DS-RP108-LAZY`, `DS-RP108-LOG` | Lifecycle | Parse env, apply typed precedence, produce levels | Avoid duplicated policy in lazy/explicit branches | Lifecycle becomes a string-policy blob and branches drift |
| Datasource target resolver | `DS-RP108-INIT`, `DS-RP108-LAZY` | Lifecycle | Existing selection/normalization/conflict identity | Keep target semantics centralized | Logging change could accidentally alter datasource behavior |
| SQLite readiness | `DS-RP108-INIT`, `DS-RP108-LIFE` | Lifecycle | Existing physical identity/WAL proof | Provider-specific checks stay isolated | Generic logging change could weaken readiness |
| Safe initialization errors/diagnostics | `DS-RP108-RETURN` | Lifecycle | Existing stable messages/callback causes plus new policy conflict code | Keep raw causes out of default output | Policy code could leak values or alter old codes |
| Forwarding proxy | `DS-RP108-LAZY`, `DS-RP108-LIFE` | Public client/ALS boundaries | Existing invocation-time current-owner routing | Preserve rebinding and transaction safety | Lifecycle would absorb reflection and proxies could bypass owner |
| Import/package safety harness | `DS-RP108-IMPORT`, `DS-RP108-PACK` | Build/package scripts | Child-process env, constructor spy, output and packed checks | Validate actual exports without developer config | Unit-only tests could miss generated entrypoint defects |

## Ownership Boundaries

The authoritative root boundary is `PrismaClientLifecycle`; every raw root client is
constructed there with one normalized datasource and one captured logging policy. The
public facade delegates to it and may expose only forwarding surfaces. The datasource
resolver and logging-policy resolver are pure internal concerns called by the lifecycle;
neither may publish state or construct a client. The existing readiness owner validates
the candidate before publication. ALS and forwarding proxies choose the current root or
transaction surface but do not bypass lifecycle authority.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `PrismaClientLifecycle.initialize/shutdown/getClientForOperation` | Raw `PrismaClient`, lifecycle state, target, policy, readiness, cleanup | `client.ts`, `prisma-manager.ts`, forwarding proxies | Creating a second root `PrismaClient` in facade/repository or calling target resolver independently for root construction | Strengthen lifecycle options/state, not bypass it |
| `logging-policy.ts` pure policy functions | Env parser and level array | Lifecycle factory only | Reading/parsing `PRISMA_LOG_QUERIES` independently in facade, proxy, or tests as production behavior | Expand typed policy API, not duplicate parsing |
| `resolveDatasourceTarget` | Env precedence and normalized identity | Lifecycle | Passing raw env directly to a second client path | Extend target resolver only if target contract changes |
| Forwarding proxy boundaries | Invocation-time root/ALS method/delegate routing | Repositories and public consumers | Returning raw root handles that outlive lifecycle without forwarding | Strengthen proxy forwarding, not expose raw owner |

## Dependency Rules

- `client.ts` may depend on `PrismaClientLifecycle`, forwarding proxy, and public types;
  it must not depend on dotenv or implement policy.
- `lifecycle.ts` may depend on target resolution, logging policy, error mapping, and
  SQLite readiness; it alone may import runtime `PrismaClient` and construct it.
- `logging-policy.ts` may read `process.env.PRISMA_LOG_QUERIES` only when called by a
  construction path; it must not import package facades or mutate env.
- `database.ts` continues to read already-present datasource/provider env values; it
  must not load files.
- Test/package scripts may instrument/stub runtime modules, but production source must
  not contain test loader hooks.
- No caller may combine the public lifecycle boundary with direct access to its raw
  client internals or create a parallel lifecycle singleton.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `initializePrisma(options?: InitializePrismaOptions)` | Root lifecycle | Bind/initialize one target with datasource, WAL, diagnostics, and logging policy | Optional explicit `datasourceUrl`; optional `logQueries` boolean | Explicit typed logging wins over env; mismatch with bound policy is `LOGGING_POLICY_CONFLICT` |
| `shutdownPrisma()` | Root lifecycle | Disconnect and clear lifecycle/policy for explicit rebinding | None | Existing deterministic shutdown/reopen contract |
| `rootPrismaClient` | Root public forwarding boundary | Route operations and `$connect`/`$disconnect` to lifecycle | Prisma-shaped model/method paths | No raw client construction in facade |
| `prisma` / `getPrismaClient()` | ALS-aware access boundary | Route to current transaction or lifecycle root | Prisma model/method path | Existing transaction behavior unchanged |
| `resolveQueryLoggingPolicy(explicit?: boolean)` | Logging policy | Return one effective boolean | Optional boolean plus process env at call time | Internal; no datasource/path identity |
| `queryLogLevels(logQueries: boolean)` | Logging policy | Return `['info','warn','error']` or that list plus `query` | Boolean | Internal immutable result; no output |
| `PrismaClientFactory(target, logQueries)` | Lifecycle construction seam | Construct raw client with explicit datasource and policy | Normalized target plus boolean | Internal test seam; old one-argument callbacks remain assignable in TS |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `initializePrisma` | Yes | Yes | Low | Keep options typed and document policy conflict |
| `rootPrismaClient` | Yes | Yes, Prisma path | Low | Retain forwarding proxy |
| `prisma` / `getPrismaClient` | Yes | Yes, ALS/root path | Low | Retain existing owner boundary |
| `resolveQueryLoggingPolicy` | Yes | Yes, optional boolean/env scalar | Low | Keep pure and internal |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Root lifecycle | `PrismaClientLifecycle` | Yes | Low | Preserve |
| Logging policy | `query logging policy` / `logging-policy.ts` | Yes | Low | Avoid generic `utils`/`helper` |
| Target resolver | `resolveDatasourceTarget` | Yes | Low | Preserve |
| Public facade | `client.ts` | Yes in existing package | Low | Keep thin |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Query logging policy | Root Client Lifecycle | Extend with a focused internal file | Policy is only meaningful at raw client construction and is shared by lazy/explicit paths | N/A |
| Environment datasource selection | Database metadata | Reuse | Existing `database.ts` owns env URL precedence | N/A |
| Lifecycle/error/readiness | Root Client Lifecycle | Reuse | 1.0.7 behavior is the preservation authority | N/A |
| Import/packed coverage | Existing package smoke/test scripts | Extend | Existing script already builds/packs/installs both formats | N/A |
| Changelog | Documentation/release records | Create `CHANGELOG.md` | No current changelog exists and user explicitly requires one | Existing README alone does not provide release history |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Root Client Lifecycle | State, raw construction, target/policy capture, readiness, cleanup | `DS-RP108-INIT`, `DS-RP108-LAZY`, `DS-RP108-LIFE` | `PrismaClientLifecycle` | Extend | No owner change |
| Client Logging Policy | Pure env parsing, option precedence, Prisma log-level list | `DS-RP108-LOG` | Lifecycle | Create New focused file | Not a second lifecycle or logger |
| Database Target Metadata | Existing datasource selection/normalization/provider detection | `DS-RP108-INIT`, `DS-RP108-LAZY` | Lifecycle | Reuse | No dotenv/file loading |
| SQLite Readiness | Existing identity/WAL checks | `DS-RP108-INIT`, `DS-RP108-LIFE` | Lifecycle | Reuse | No changes except regression tests |
| Access Routing | Existing forwarding/ALS/repository boundaries | `DS-RP108-LAZY` | Public/ALS boundaries | Reuse | No raw construction |
| Build / Package Validation | Source build, packed consumer, ESM/CJS parity | `DS-RP108-IMPORT`, `DS-RP108-PACK` | Scripts/CI | Extend | Synthetic env only |
| Documentation / Release Records | README, DESIGN, CHANGELOG | `DS-RP108-DOCS` | Repository maintainers | Extend | Release itself remains separately authorized |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/lib/client/logging-policy.ts` | Client Logging Policy | Internal lifecycle concern | Parse flag, precedence, log-level arrays | One pure policy subject | No |
| `src/lib/client/lifecycle.ts` | Root Client Lifecycle | `PrismaClientLifecycle` | Store policy on states and pass it to factory | Existing lifecycle owner remains coherent | Logging policy |
| `src/lib/client/initialization-error.ts` | Root Client Lifecycle | Public init contract | Add `logQueries` and conflict code/message | Existing public option/error authority | Policy boolean |
| `src/lib/client.ts` | Root Client Lifecycle | Thin facade | Remove dotenv import, preserve exports | Stable public boundary | Lifecycle/proxy |
| `prisma.config.ts` | Repository tooling | CLI config | Remove dotenv import; retain explicit env URL | One CLI config concern | None |
| `package.json` / `package-lock.json` | Package metadata | Build/release boundary | Version 1.0.8, remove dotenv, preserve peer, and whitelist `CHANGELOG.md` in `files` | Metadata must stay synchronized and make the packed docs contract actionable | None |
| `tsup.config.ts` | Build | Source-to-dist boundary | Remove stale dotenv external | Build configuration one concern | None |
| `src/tests/logging-policy.test.ts` | Durable unit coverage | Test policy seam | Every parser/precedence/constructor-level scenario | No database required | Fake factory |
| `scripts/run-package-smoke.js` | Packed coverage | Isolated consumer | Exact ESM/CJS import safety, output, logging artifact checks | Existing packed smoke owns artifact tests | Temporary cwd/fixtures |
| `README.md` / `DESIGN.md` / `CHANGELOG.md` | Documentation | Public docs | New behavior and no-data-change statement | Each file has existing doc role | Requirements/design |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Truthy env parsing and level array construction | `src/lib/client/logging-policy.ts` | Client Logging Policy | Explicit and lazy construction need identical rules | Yes | Yes | A generic environment/config helper |
| Lifecycle state policy field | Existing state union in `lifecycle.ts` | Root Client Lifecycle | Policy is state of the bound raw client | N/A | Yes | A parallel global mutable policy |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `logQueries?: boolean` | Yes | Yes | Low | Keep optional only at public request boundary |
| lifecycle `logQueries: boolean` | Yes: captured policy for this client | Yes | Low | Store in lazy/initializing/ready states |
| Prisma `log` array | Yes: constructor log levels | Yes | Low | Build in one policy function |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/lib/client/logging-policy.ts` | Client Logging Policy | Lifecycle internal | `parseQueryLogFlag`, `resolveQueryLogging`, `queryLogLevels` | Pure, independently testable policy | Public boolean type only |
| `src/lib/client/lifecycle.ts` | Root Client Lifecycle | `PrismaClientLifecycle` | Policy-aware factory and state transitions | Raw construction and lifecycle sequencing remain one authority | Target/error/readiness types |
| `src/lib/client/initialization-error.ts` | Root Client Lifecycle | Public initialization contract | `logQueries`, `LOGGING_POLICY_CONFLICT`, safe message | Existing stable contract authority | None |
| `src/lib/client.ts` | Root Client Lifecycle | Thin public facade | Public functions/proxy, no import side effects | Stable entry boundary | Lifecycle/proxy |
| `prisma.config.ts` | Repository tooling | Prisma CLI | Schema config with caller-provided URL | Separate non-runtime tooling boundary | None |
| `package.json` / `package-lock.json` | Package metadata | Package/release boundary | Version, dependency, peer, and `files` whitelist including `CHANGELOG.md` | npm pack inclusion is controlled by the root metadata whitelist | None |
| `scripts/run-package-smoke.js` | Build/Package Validation | Packed consumer | Build, pack, install, CJS/ESM import and lifecycle probes | Existing script is already the artifact authority | Synthetic fixtures |
| `src/tests/logging-policy.test.ts` | Durable Test Coverage | Lifecycle test seam | Policy behavior and conflict regression | Fast no-DB unit scope | Fake client factory |

## Applied Patterns (If Any)

- Existing authoritative lifecycle owner/state-machine pattern from 1.0.7.
- Existing invocation-time forwarding proxy pattern for root/ALS rebinding.
- Existing safe error plus opt-in diagnostic callback pattern.
- Existing tsup conditional CJS/ESM build and packed consumer smoke pattern.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `src/lib/client/` | Folder | Root Client Lifecycle | Lifecycle internals, target, readiness, errors, logging policy | Existing lifecycle depth is already grouped here | Public repository logic or dotenv loader |
| `src/lib/client/logging-policy.ts` | File | Logging Policy | Pure parse/precedence/level-list functions | Closely scoped to client construction | Lifecycle state or console output |
| `src/lib/client/lifecycle.ts` | File | Lifecycle | State transitions and raw construction | Existing authoritative owner | Duplicate policy parsing or second client |
| `src/lib/client.ts` | File | Public facade | Exports and forwarding root proxy | Existing stable public path | Environment file loading |
| `src/tests/logging-policy.test.ts` | File | Test coverage | Unit policy/constructor seam cases | Isolated from database and import process | Real credentials/queries |
| `scripts/run-package-smoke.js` | File | Packed artifact validation | ESM/CJS child processes, output assertions, and required packed-file assertions including `CHANGELOG.md` | Existing package test harness is the artifact authority | Developer cwd/env |
| `package.json` / `package-lock.json` | Files | Package metadata | `files` whitelist includes `dist`, README, DESIGN, and `CHANGELOG.md`; lock/metadata remain synchronized | npm pack inclusion is otherwise implicit and easy to miss | Source/ticket files |
| `CHANGELOG.md` | File | Documentation/release records | 1.0.8 entry and behavior changes | Required by task; no prior changelog | Implementation details only |

The compact existing layout remains clearer than introducing a new subsystem folder:
the new policy has a real client-construction owner and only one focused file.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/lib/client/` | Main-Line Domain-Control plus provider/off-spine client concerns | Yes | Low | Existing folder already separates lifecycle internals from public facade |
| `src/tests/` | Test/coverage | Yes | Low | Logging unit test belongs beside lifecycle tests |
| `scripts/` | Test/package setup | Yes | Low | Packed import safety is operational harness, not runtime code |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Fresh explicit initialization | `initializePrisma({ datasourceUrl: A, logQueries: true }) -> new PrismaClient({ datasourceUrl: A, log: ['info','warn','error','query'] })` | `initializePrisma(...)` constructs a client with query logs and later removes them | Logging is constructor-scoped; the effective policy is decided once |
| Env fallback | `logQueries === undefined ? parse(process.env.PRISMA_LOG_QUERIES) : logQueries` | `Boolean(process.env.PRISMA_LOG_QUERIES)` | Arbitrary strings such as `false` would incorrectly enable logs |
| Lazy conflict | Lazy access with env false, then `initializePrisma({ logQueries: true })` -> `LOGGING_POLICY_CONFLICT`; shutdown then initialize true | Silently reuse the false-policy client or swap it behind captured handles | Preserves explicit opt-in truth and lifecycle ownership |
| Import | `import/require -> facade/proxy definitions -> no client/datasource/dotenv` | Entrypoint imports `dotenv/config` or eagerly calls `new PrismaClient()` | The package must not own application config or eager connection setup |
| Build parity | One source change -> tsup -> both `dist/index.mjs` and `dist/index.js` -> packed consumer tests | Hand-edit only one ignored dist file | Prevents format drift and release regressions |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old `query` default for existing consumers | Avoid changed log volume | Rejected | Default info/warn/error; explicit env/typed opt-in only |
| Keep `dotenv/config` only in one module format | Preserve old config convenience | Rejected | Remove from shared source so both outputs are safe |
| Retain dotenv as runtime dependency despite no runtime use | Avoid lockfile churn | Rejected | Remove all repository use and dependency/lock entries |
| Ignore typed option after lazy binding | Avoid new error code | Rejected | Capture policy and reject mismatch with `LOGGING_POLICY_CONFLICT` |
| Implicitly swap a lazy client on policy mismatch | Make every later option appear to work | Rejected | Require explicit shutdown/rebind, preserving owner and handle semantics |
| Separate best-effort query flag | Preserve any historical behavior | Rejected | One strict boolean policy, query is off unless explicit |

## Derived Layering (If Useful)

The implementation can be read as: public entry/facade -> lifecycle owner -> pure
target/policy/readiness concerns -> raw Prisma/engine. Repositories and proxies route
through the lifecycle rather than skipping it. This is explanatory only; ownership and
the spines above remain authoritative.

## Change / Refactor Sequence

1. Remove dotenv imports from `client.ts` and `prisma.config.ts`; remove dependency and
   stale build externalization; update package-lock metadata carefully.
2. Add `logging-policy.ts` and the public `logQueries` option plus conflict error code.
3. Thread the effective policy through the lifecycle's raw-client factory and states,
   leaving datasource target, readiness, error cleanup, shutdown, and forwarding code
   unchanged except for added policy comparisons.
4. Add source unit tests for exact default levels, accepted/invalid flag values,
   precedence, explicit lazy conflict, and no connection requirement.
5. Add `CHANGELOG.md` to the `package.json.files` whitelist. Extend packed
   smoke/import safety tests: clean build, inspect both dist files, pack, assert the
   packed file list contains `CHANGELOG.md` alongside README/DESIGN/dist, assert source
   and ticket exclusions remain true, install in a temporary consumer, import exact
   ESM/CJS entrypoints from a child cwd containing only a synthetic canary, spy on
   client construction, and capture output.
6. Run existing lifecycle/restart/reopen/regression tests and add only missing durable
   cases. Confirm schema/migrations are unchanged and tests use temporary fixtures.
7. Update README, DESIGN, and CHANGELOG; bump package metadata to 1.0.8, include
   CHANGELOG.md in the package files whitelist, and verify peer compatibility.
8. Architecture/code/API-E2E/delivery gates execute in team order. If release is later
   authorized, build from clean checkout, pack/inspect, publish exactly 1.0.8 with
   provenance, and record integrity; do not publish during implementation analysis.

## Key Tradeoffs

- A focused policy file adds one internal module but prevents lazy and explicit policy
  drift and makes malformed-value behavior unit-testable.
- `LOGGING_POLICY_CONFLICT` is more explicit than silently ignoring a typed option and
  safer than replacing a possibly-used lazy client. It requires shutdown for a policy
  change, matching existing datasource rebinding semantics.
- Removing dotenv from Prisma CLI config intentionally makes direct CLI use require an
  explicit environment. This consistently establishes application/command ownership
  and keeps the published package free of file discovery.
- Query logging uses Prisma's standard `log` array; no custom logger or redaction layer
  is introduced because log retention/redaction belongs to consumers.

## Risks

- Consumers that relied on implicit query logs will see less output; documentation and
  a temporary explicit opt-in address intentional debugging.
- Consumers or local CLI users that relied on `.env` discovery must preload env values;
  the task expressly requires this behavior change.
- The published package must be built after source changes; ignored generated files can
  otherwise mask an incomplete release. Packed artifact checks are mandatory.
- Real Windows path behavior remains a 1.0.7 residual risk, not introduced by this
  change; lifecycle regression coverage must remain intact.
- npm publication/provenance is not evidenced until delivery and explicit release
  authorization.

## Guidance For Implementation

- Keep `PrismaClientLifecycle` as the only runtime `new PrismaClient` owner.
- Pass a boolean to the factory and build the log array in one helper. Do not read the
  env flag in `client.ts`, module top level, or multiple lifecycle branches.
- Treat `logQueries: false` as defined; use `options.logQueries !== undefined`, not
  truthiness, for precedence.
- Capture `logQueries` in every state that carries a constructed client. For a bound
  client, undefined later means retain its captured policy; an explicitly differing
  value returns `LOGGING_POLICY_CONFLICT`.
- Preserve existing error behavior and cleanup. `LOGGING_POLICY_CONFLICT` must be safe,
  contain no target/path/value, and must not invoke raw-cause diagnostics unless the
  existing error helper contract intentionally treats it as a classified request.
- Remove `dotenv` from package metadata only after `npm test`, Prisma CLI setup, and
  `npm pack` are verified with explicit env. Do not update unrelated dependencies.
- Ensure README documents: `PRISMA_LOG_QUERIES=true` temporary opt-in, accepted values,
  `initializePrisma({ logQueries: true })`, typed-over-env precedence, sensitive query
  warning, application-owned env loading, and no schema/migration/data change.

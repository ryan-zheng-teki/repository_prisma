# Explicit Datasource and Strict SQLite WAL Readiness — Design Spec

## Document Status

- Status: `Ready for architecture review`
- Requirements basis: Approved by user on 2026-07-13, conditional on best-practice design
- Canonical workspace: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness`
- Task branch: `codex/explicit-datasource-strict-wal-readiness`
- Reviewed base: `origin/main` at `cc58bca56f561f828d7afc16b7892cc9231c5030`

## Current-State Read

The public database surfaces all eventually reach the exported `rootPrismaClient` proxy:

- repositories call `getPrismaClient()` and receive the active ALS transaction client or `rootPrismaClient`;
- `runInTransaction` and `@Transactional()` call `rootPrismaClient.$transaction`;
- the context-aware `prisma` proxy reads the currently selected client;
- consumers can use `rootPrismaClient` directly.

The root boundary is only a thin proxy over private state in `src/lib/client.ts`. Its `getOrCreateRootClient()` creates `new PrismaClient(...)` without a datasource override, so generated-client environment resolution is authoritative. Separately, `src/lib/database.ts#getDatabaseUrl()` selects `DATABASE_URL_TEST` under test. That is a mixed-authority boundary: callers can observe one selected target while the root client opens another.

`initializePrisma()` also owns unrelated concerns in one function: client construction, connect, SQLite WAL activation, failure logging, and failure policy. The WAL branch does not verify database identity or the final mode, subscribes Prisma's raw error output to stdout, catches the provider error, prints it again, and resolves. The root client may already have been created through a proxy before initialization, and proxy property reads return bound raw methods/delegates that callers can retain across later lifecycle transitions.

The current repository/ALS ownership remains sound for this scope: repositories own CRUD delegation; `context.ts` owns ALS transaction context; decorators/HOFs own transaction entry; provider/filter helpers remain separate. The design problem is localized to root-client lifecycle authority, provider-specific readiness, and proxy revocability. The target design must preserve current public repository/transaction shapes and optional lazy access while removing mixed datasource authority and fail-open readiness.

## Intended Change

Introduce one internal `PrismaClientLifecycle` as the authoritative owner of root-client construction, bound datasource identity, initialization sequencing, readiness, failure state, concurrency, and shutdown. Keep `src/lib/client.ts` as the thin public facade. Resolve each target once, pass it explicitly through Prisma's supported `datasourceUrl` constructor option, and retain a normalized binding key.

Move physical SQLite identity/WAL operations into a dedicated readiness concern invoked only by the lifecycle owner. Make the existing `enableWAL: true` path strict and current-only: identity must match, activation must succeed, and an independent read must report `wal` before the lifecycle publishes readiness.

Replace raw-client-exposing proxy behavior with reusable forwarding proxies. Captured method and model-delegate handles resolve the current lifecycle or ALS client when invoked. Special root `$connect` and `$disconnect` operations route through `initializePrisma` and `shutdownPrisma` so they cannot bypass lifecycle state. Normal lazy operations remain compatible but bind their target through the same resolver.

## Supplemental Solution Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness/initialization-api-contract.md` | Fix public initialization, lifecycle, readiness, failure, and diagnostic semantics | `REQ-RP-001`–`REQ-RP-010`; `AC-RP-001`–`AC-RP-013` | Authoritative external behavior; this design supplies the internal ownership and sequencing that fulfills it | Approved by user — 2026-07-13 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` plus `Behavior Change`.
- Current design issue found: `Yes`.
- Root cause classification: `Missing Invariant` plus `Boundary Or Ownership Issue`.
- Refactor needed now: `Yes`.
- Evidence: `database.ts` selects a target that `client.ts` does not use; proxy access can construct the client before configuration; initialization has no target identity; the WAL catch logs and resolves; raw proxy properties can retain a stale client beyond lifecycle state.
- Design response: establish `PrismaClientLifecycle` as the sole root-client owner; keep public client/proxy files thin; attach datasource resolution, SQLite readiness, safe diagnostic mapping, and forwarding proxy behavior as named concerns serving that owner.
- Refactor rationale: adding only `datasourceUrl` to the existing function would fix the A/B reproduction but would leave pre-access conflicts, in-flight exposure, stale captured handles, fail-open reuse, and shutdown bypass unresolved. Those are the same lifecycle invariant, not unrelated cleanup.
- Intentional deferrals and residual risk: general Prisma query/info/warn logging policy is deferred; only raw initialization error emission is removed. Prisma APIs that intentionally return a new extended client (for example `$extends`) can create caller-owned client surfaces outside this library's root lifecycle and remain an advanced-use risk; README will not promise lifecycle revocation for caller-created extended clients. Non-SQLite physical identity cannot be verified portably, so the explicitly supplied normalized URL remains that provider's binding identity.

## Terminology

- **Root lifecycle**: the internal owner that creates, binds, verifies, publishes, and disconnects the one non-transaction Prisma Client.
- **Bound target**: the normalized datasource identity retained by the lifecycle for conflict checks.
- **Lazy-bound**: a compatible state in which a normal operation created the explicit-target client without a prior readiness request.
- **Ready**: connection and all requested checks completed; `walReady` records whether strict WAL was verified.
- **Forwarding proxy**: a stable public proxy whose method/delegate invocations resolve the current underlying lifecycle or ALS client rather than returning a retained raw root handle.
- **Candidate client**: the internal client being initialized and not yet publishable as ready.

## Design Reading Order

1. Persisted-data decision: no transformation.
2. Root initialization, lazy-operation, failure-return, and shutdown spines.
3. Root lifecycle owner with a bounded internal state machine.
4. Datasource, SQLite readiness, safe diagnostic, and forwarding-proxy concerns.
5. Concrete file and folder projection.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The public optional initialization and lazy-access shapes are retained because they remain valid current behavior, not through wrappers or dual implementations.
- The old best-effort WAL semantics are removed cleanly. There is no `bestEffortWAL`, second initializer, warning-and-resolve fallback, or version branch.
- Generated-client implicit datasource selection is removed from all root-client construction.
- The old proxy binding implementation is replaced, not retained behind the forwarding proxy.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: consumer-owned databases of unknown shape/volume; the package owns no persisted application records or migration ledger.
- Relevant code-model, serialization, semantic, or physical-store change: connection/readiness semantics only; no Prisma schema, table, record, or serialized model change.
- Normal reader/writer behavior and representative evidence: repository/proxy/transaction paths use the root or ALS transaction client. Disposable probes required no table transformation and proved only target selection and journal-mode behavior.
- Required semantics and invariants under direct use: all existing records remain directly usable when the correct database is selected; no rewrite is required.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: wrong-file access or journal-mode mutation is unacceptable; no destructive SQL is allowed; physical SQLite must be writable for strict WAL.
- Decision: `Directly Usable — No Migration`.
- Decision rationale: there is no stored-shape change and therefore no migration benefit. A rewrite would add I/O, downtime, corruption, and recovery risk without improving correctness.
- Acceptance criteria or design constraints supported by this decision: `AC-RP-001`–`AC-RP-011`; verify only connection identity/readiness and preserve all consumer data.

No migration plan is applicable.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-RP-001` | `Primary End-to-End` | Consumer calls `initializePrisma` | Safe resolve or classified rejection | `PrismaClientLifecycle` | Governs explicit target binding and readiness truth |
| `DS-RP-002` | `Primary End-to-End` | Repository/proxy operation without active ALS transaction | Selected database operation/result | `PrismaClientLifecycle` | Preserves lazy compatibility while forcing one explicit root identity |
| `DS-RP-003` | `Primary End-to-End` | Consumer calls `shutdownPrisma` | Lifecycle returns to idle and can bind another target | `PrismaClientLifecycle` | Prevents stale identity across reinitialization |
| `DS-RP-004` | `Return-Event` | Provider/readiness failure | Safe public error plus optional diagnostic callback | `PrismaClientLifecycle` | Keeps default errors safe while retaining intentional diagnostics |
| `DS-RP-005` | `Bounded Local` | Current lifecycle state and command | Next valid lifecycle state | `PrismaClientLifecycle` | Makes concurrency, exposure, failure, and recovery rules explicit |
| `DS-RP-006` | `Bounded Local` | Captured public method/delegate invocation | Current root/ALS client method invocation | Forwarding proxy concern serving the relevant client boundary | Prevents retained stale root or transaction bypass |

## Primary Execution Spine(s)

### Explicit initialization (`DS-RP-001`)

`Consumer Startup -> client.ts Public Facade -> PrismaClientLifecycle -> Datasource Target Resolver -> Candidate PrismaClient -> SQLite Readiness (when applicable) -> Ready Lifecycle / Safe Result`

### Lazy root operation (`DS-RP-002`)

`Repository or Public Proxy Caller -> Forwarding Proxy / getPrismaClient -> client.ts Root Boundary -> PrismaClientLifecycle -> Explicitly Bound PrismaClient -> Database -> Caller Result`

### Shutdown and rebind (`DS-RP-003`)

`Consumer Shutdown -> client.ts Public Facade -> PrismaClientLifecycle -> PrismaClient.$disconnect -> Cleared Idle State -> Later Target Resolution`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-RP-001` | The facade delegates one request to the lifecycle. The lifecycle resolves/binds the target, constructs one candidate, connects, verifies physical SQLite identity, optionally activates/verifies WAL, and publishes ready only after all requested checks pass. | Public client facade, root lifecycle, Prisma client, database | `PrismaClientLifecycle` | Datasource target resolution, SQLite readiness, safe diagnostics |
| `DS-RP-002` | A normal repository/proxy call resolves ALS first; without a transaction, the stable public proxy asks the lifecycle for the current usable root. Idle acquisition resolves and binds one explicit target; later calls reuse it. | Repository/proxy boundary, client selection boundary, root lifecycle, Prisma client | `PrismaClientLifecycle` | Forwarding proxy, ALS lookup, datasource target resolution |
| `DS-RP-003` | Shutdown changes state before disconnect, prevents new operations, disconnects the retained client, and clears all target/failure/in-flight data in a finally-equivalent completion path. | Public client facade, root lifecycle, Prisma client | `PrismaClientLifecycle` | Safe cleanup sequencing |
| `DS-RP-004` | An internal failure is mapped to one stable safe code; registered opt-in callbacks receive the raw cause, callback failures are ignored, candidate cleanup completes, and the caller receives only the safe public error. | Provider/readiness concern, root lifecycle, public caller | `PrismaClientLifecycle` | Error classification, diagnostic delivery |
| `DS-RP-005` | Every command is evaluated against a discriminated lifecycle state; only defined transitions can expose or clear a client. | Lifecycle state, command, next state | `PrismaClientLifecycle` | None; this is the lifecycle owner's bounded internal control flow |
| `DS-RP-006` | A captured public method/delegate wrapper resolves its owner at invocation time, then calls the current raw method with the correct `this`; no raw root delegate is retained by the wrapper. | Public proxy handle, resolver, current client/delegate | Public root or context-aware Prisma boundary | Reflective invocation adapter |

## Spine Actors / Main-Line Nodes

| Node | Role On Spine | Concrete Ownership |
| --- | --- | --- |
| `client.ts` public facade | Thin entry boundary | Public function/proxy/type exposure only |
| `PrismaClientLifecycle` | Governing root owner | Client instance, target identity, state, initialization/shutdown sequencing, publishability, concurrency |
| Datasource target | Main initialization subject value | Normalized client URL, conflict identity, provider/SQLite physical identity metadata |
| Candidate/active `PrismaClient` | Provider boundary | Prisma connection and database operations; never public as the root raw instance |
| SQLite readiness operation | Provider-specific checkpoint | `main` identity, WAL activation, final mode verification |
| Repository/context-aware proxy | Operation entry | Resolve active ALS client or authoritative root boundary for each invocation |

## Ownership Map

- `src/lib/client.ts` remains a thin public facade. It does not store lifecycle state or issue PRAGMAs.
- `PrismaClientLifecycle` is the authoritative boundary behind every root client path. It alone constructs/disconnects raw root clients and decides whether one is usable.
- Datasource target resolution owns selection, validation, relative-file normalization, provider classification, and the semantically tight bound-target value.
- SQLite readiness owns only physical SQLite `database_list`/journal-mode interactions and result parsing. It never publishes clients or logs failures.
- Initialization error mapping owns stable public classifications and opt-in diagnostic invocation. It never selects targets or cleans up clients.
- Forwarding proxy construction owns dynamic invocation routing and correct method binding. It never owns lifecycle/ALS state.
- `context.ts`, `prisma-manager.ts`, repositories, and decorators retain their current transaction responsibilities and depend on the public root boundary rather than lifecycle internals.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `initializePrisma` / `shutdownPrisma` in `client.ts` | `PrismaClientLifecycle` | Stable public API | State transitions, target parsing, PRAGMAs, failure logging |
| `rootPrismaClient` | `PrismaClientLifecycle` | Prisma-shaped stable root surface | Raw client lifetime or cached raw delegates |
| `prisma` | ALS lookup plus authoritative root boundary | Context-aware Prisma-shaped surface | Transaction lifetime, raw delegate retention, root construction |
| `src/index.ts` | Exported subsystem boundaries | Package entrypoint | Business/lifecycle policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `rootClient` and `getOrCreateRootClient` policy in current `client.ts` | State/client construction need one explicit lifecycle owner | `client/lifecycle.ts` | In This Change | Facade keeps no parallel state |
| Generated-client implicit datasource selection | Causes A/B divergence | `client/datasource-target.ts` plus `PrismaClient({ datasourceUrl })` | In This Change | No environment mutation fallback |
| WAL `try/catch -> console.warn -> resolve` | Falsely reports readiness and leaks raw cause | `client/sqlite-readiness.ts` plus lifecycle failure mapping | In This Change | No best-effort branch |
| Prisma configured `error` stdout level for root construction | Emits raw provider error before catch | Lifecycle-owned client factory log configuration | In This Change | General query/info/warn policy remains |
| Per-file proxy code that binds raw methods/delegates at property access | Captures stale root/transaction owners | `forwarding-proxy.ts` | In This Change | Used by root and context-aware proxies |
| Direct root `$connect`/`$disconnect` bypass | Can desynchronize lifecycle state | Special forwarding routes to initialize/shutdown | In This Change | Same Prisma-shaped public methods |

## Return Or Event Spine(s) (If Applicable)

`Provider / SQLite Failure -> Stage Classification -> Candidate Disconnect -> Failed Lifecycle State -> Optional Diagnostic Callback(cause) -> PrismaInitializationError(code, safe message) -> Startup Caller`

Successful return:

`Verified Candidate -> Ready State(target, client, walReady) -> initializePrisma Promise Resolution -> Startup Caller`

No diagnostic event is emitted on success. Diagnostic callback exceptions are swallowed without console output and do not replace the stable failure.

## Bounded Local / Internal Spines (If Applicable)

### Lifecycle state machine (`DS-RP-005`)

- Parent owner: `PrismaClientLifecycle`.
- Chain: `Current State -> Validate Command/Target/Readiness -> Reserve Transition -> Run Provider Work -> Publish Next State or Cleanup -> Resolve/Reject`.
- States:
  - `Idle`: no target, client, failure, or in-flight task.
  - `LazyBound`: explicit target and raw client exist; compatible normal operations may use it, but initialization readiness has not been asserted.
  - `Initializing`: target/client/in-flight request/diagnostic listener set exist; public operations are blocked.
  - `Ready`: target/client exist and base connection/identity checks passed; `walReady` identifies strict WAL readiness.
  - `Failed`: no usable client; public operations reject until explicit retry or shutdown.
  - `ShuttingDown`: disconnect/clear is in flight; public operations and initialization reject.

| Current State | Command | Guard | Next State / Result |
| --- | --- | --- | --- |
| `Idle` | Lazy operation | Effective target resolves | `LazyBound`; return client |
| `Idle` | Initialize | Effective target resolves | `Initializing -> Ready` or cleanup to `Failed` |
| `Idle` | Missing target | None | `Failed`; reject `DATABASE_URL_MISSING` |
| `LazyBound` | Normal operation | None | Remain `LazyBound`; return same client |
| `LazyBound` | Initialize same target | None | `Initializing -> Ready` or cleanup to `Failed` |
| `LazyBound` | Initialize different target | Binding keys differ | Remain `LazyBound`; reject `DATASOURCE_CONFLICT` |
| `Ready` | Initialize same target, already sufficient readiness | Requested WAL is false or `walReady=true` | Remain `Ready`; resolve idempotently |
| `Ready` | Initialize same target, WAL upgrade | `walReady=false`, request true | `Initializing -> Ready(walReady=true)` or cleanup to `Failed` |
| `Ready` | Initialize different target | Binding keys differ | Remain `Ready`; reject `DATASOURCE_CONFLICT` |
| `Initializing` | Same target and identical readiness request | Same binding and WAL request | Register diagnostic listener and share in-flight result |
| `Initializing` | Different/stronger request or normal operation | Request cannot be proven by current in-flight contract | Remain `Initializing`; reject `DATASOURCE_CONFLICT` for different target or `CLIENT_NOT_READY` otherwise |
| `Initializing` | Shutdown | None | Mark shutdown-requested; initialization never publishes ready; disconnect then `Idle` |
| `Failed` | Normal operation | None | Remain `Failed`; reject `CLIENT_NOT_READY` |
| `Failed` | Initialize | New request resolves | `Initializing -> Ready` or cleanup to `Failed` |
| `Failed` | Shutdown | None | `Idle` |
| `LazyBound` / `Ready` | Shutdown | None | `ShuttingDown -> Idle` in finally-equivalent cleanup |
| `ShuttingDown` | Operation or initialize | None | Remain `ShuttingDown`; reject `CLIENT_NOT_READY` |

The state value is a discriminated union. Impossible combinations such as `Ready` without a client/target, or `Failed` with a published usable client, are not representable.

### Forwarding invocation (`DS-RP-006`)

- Parent owners: public root boundary and context-aware `prisma` boundary.
- Chain: `Proxy Property -> Stable Wrapper -> Invocation-Time Resolver -> Current Raw Owner -> Reflect.apply -> Result`.
- Root `$connect` delegates to initialization; root `$disconnect` delegates to shutdown. Model delegates are nested forwarding proxies. Symbol and non-call property access must not create a thenable or retain a raw root delegate.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Datasource target resolver | `DS-RP-001`, `DS-RP-002` | `PrismaClientLifecycle` | Select, normalize, classify, and key one datasource | Makes construction and conflict identity deterministic | Lifecycle becomes a URL/path parsing blob |
| SQLite readiness | `DS-RP-001`, `DS-RP-004` | `PrismaClientLifecycle` | Verify `main`, activate WAL, verify final mode | Keeps provider-specific SQL isolated | Generic lifecycle becomes SQLite-specific and harder to extend safely |
| Safe error/diagnostic mapping | `DS-RP-004` | `PrismaClientLifecycle` | Stable code/message and opt-in cause delivery | Separates safe public failure from raw diagnostics | Provider errors leak or lifecycle owns presentation policy inline |
| Forwarding proxy adapter | `DS-RP-002`, `DS-RP-006` | Root and context-aware client boundaries | Invocation-time resolution and `this` binding | Revokes stale raw handles across lifecycle/ALS changes | Lifecycle or repositories absorb reflection code |
| Canonical filesystem path comparison | `DS-RP-001` | SQLite readiness via resolved target | Compare expected/actual across symlinks/platform aliases | Physical identity needs more than string equality | File/path details leak into public facade |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Environment URL precedence/provider inference | `src/lib/database.ts` | Extend | Existing owner already defines `getDatabaseUrl` and provider detection | N/A |
| Root client lifecycle | Current `src/lib/client.ts` | Refactor/Extend | Same capability but current file must become a thin facade over an explicit owner | N/A |
| SQLite identity/WAL | Inline WAL branch in `client.ts` | Create New owned concern | Provider-specific readiness is coherent and independently testable | `database.ts` is metadata/selection, not live SQL sequencing |
| Dynamic proxy forwarding | Current `client.ts` and `prisma-proxy.ts` duplicate shallow binding | Create New shared adapter | One invocation-time adapter prevents two divergent proxy policies | Neither existing file should become the other's internal helper |
| ALS transaction choice | `context.ts` / `prisma-manager.ts` | Reuse | Ownership is already correct | N/A |
| Stable lifecycle errors | None | Create New owned concern | Safe codes/messages/diagnostics are a public contract and reused across lifecycle stages | Inline error literals would duplicate policy |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Root Client Lifecycle | Target binding, client construction, state machine, initialization, failure cleanup, shutdown | `DS-RP-001`–`DS-RP-005` | `PrismaClientLifecycle` | Extend/refactor | Authoritative root boundary |
| Database Target Metadata | Environment selection and URL provider inference | `DS-RP-001`, `DS-RP-002` | Root lifecycle | Extend | Pure; no client state or SQL |
| SQLite Readiness | Physical identity and WAL proof | `DS-RP-001`, `DS-RP-004` | Root lifecycle | Create New | Internal provider-specific concern |
| Client Access Routing | Root/context-aware forwarding proxies and ALS selection | `DS-RP-002`, `DS-RP-006` | Root boundary and `prisma` boundary | Extend/refactor | Does not construct raw root client |
| Repository / Transaction | CRUD and ALS transaction lifecycle | `DS-RP-002` | Existing repository/context owners | Reuse | No ownership change |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/lib/client.ts` | Root Client Lifecycle | Thin public boundary | Export public functions/proxy/types and delegate to singleton | One stable public entry | Yes, lifecycle and forwarding proxy |
| `src/lib/client/lifecycle.ts` | Root Client Lifecycle | `PrismaClientLifecycle` | State machine and provider-work sequencing | One governing owner | Yes, resolved target/errors/readiness |
| `src/lib/client/datasource-target.ts` | Database Target Metadata | Target resolver | Build tight normalized target union | One transformation subject | Extends `database.ts` inference |
| `src/lib/client/sqlite-readiness.ts` | SQLite Readiness | Provider-specific concern | Physical identity/WAL SQL and parsing | One provider readiness subject | Uses resolved SQLite target |
| `src/lib/client/initialization-error.ts` | Root Client Lifecycle | Safe failure concern | Codes, safe messages, diagnostics | One public failure contract | Used across stages |
| `src/lib/forwarding-proxy.ts` | Client Access Routing | Proxy adapter | Invocation-time method/delegate resolution | Shared reflective mechanism | Used by two public proxies |
| `src/lib/prisma-proxy.ts` | Client Access Routing | Context-aware public boundary | Configure proxy with ALS/root resolver | One thin boundary | Yes, forwarding proxy |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Root/context-aware dynamic forwarding | `src/lib/forwarding-proxy.ts` | Client Access Routing | Both proxies need invocation-time resolution and correct `this` binding | Yes | Yes; one adapter replaces two handlers | Lifecycle owner or generic untyped utility bag |
| Target URL/provider/path data | `src/lib/client/datasource-target.ts` | Database Target Metadata | Lifecycle and SQLite readiness need the same identity | Yes | Yes; discriminated union avoids optional-field soup | Raw env snapshot or public credential-bearing DTO |
| Lifecycle state | `src/lib/client/lifecycle.ts` | Root Client Lifecycle | Every command must use one state authority | Yes | Yes; discriminated variants replace parallel booleans | Exported global mutable state |
| Error codes/messages/diagnostics | `src/lib/client/initialization-error.ts` | Root Client Lifecycle | Every failure stage must classify identically | Yes | Yes | Raw-error wrapper that exposes cause by default |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ResolvedDatasourceTarget` discriminated union | Yes | Yes | Low | Store only normalized `clientUrl`, safe internal `bindingKey`, provider/kind, and expected path only for physical SQLite |
| `LifecycleState` discriminated union | Yes | Yes | Low | Put client/target/in-flight fields only on variants that require them; do not add parallel `isReady` booleans |
| `InitializationRequest` | Yes | Yes | Low | Target + requested WAL + diagnostic listeners; no duplicate env/raw URL fields |
| `PrismaInitializationError` | Yes | Yes | Low | Stable code/name/message only; no `cause`, URL, path, or provider payload |

Recommended target union shape:

```ts
type ResolvedDatasourceTarget =
  | {
      kind: 'sqlite-file';
      clientUrl: string;
      bindingKey: string;
      expectedPath: string;
    }
  | {
      kind: 'sqlite-memory';
      clientUrl: string;
      bindingKey: string;
    }
  | {
      kind: 'other';
      provider: DatabaseProvider;
      clientUrl: string;
      bindingKey: string;
    };
```

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/lib/client.ts` | Root Client Lifecycle | Thin public facade | Stable exports and root forwarding proxy configured against lifecycle | Keeps public import stable and policy-free | Yes |
| `src/lib/client/lifecycle.ts` | Root Client Lifecycle | Authoritative `PrismaClientLifecycle` | State transitions, raw client factory, initialization, conflict, cleanup, shutdown | Core sequencing belongs together | Yes |
| `src/lib/client/datasource-target.ts` | Database Target Metadata | Target resolver | Selection, cwd-relative SQLite normalization, binding key, physical target metadata | One coherent transformation boundary | Yes |
| `src/lib/client/sqlite-readiness.ts` | SQLite Readiness | Readiness verifier | `database_list`, canonical comparison, WAL activation/final verification | Provider-specific SQL is cohesive | Yes |
| `src/lib/client/initialization-error.ts` | Root Client Lifecycle | Safe failure boundary | Public types/class, safe message mapping, callback delivery | One contract | Yes |
| `src/lib/forwarding-proxy.ts` | Client Access Routing | Shared adapter | Nested proxy/method wrappers resolved at invocation | Avoids duplicated shallow proxy defects | No external shared data |
| `src/lib/database.ts` | Database Target Metadata | Public metadata helper | Existing URL selection and pure provider inference callable with an explicit URL | Existing owner remains right | No |
| `src/lib/prisma-proxy.ts` | Client Access Routing | Thin context-aware wrapper | Instantiate forwarding proxy using `getPrismaClient` | Public subject stays distinct from root facade | Yes |
| `src/lib/prisma-manager.ts` | Client Access Routing | ALS/root selection | Existing transaction-or-root choice | Healthy current owner | Uses root forwarding proxy |
| `src/index.ts` | Package boundary | Public exports | Export functions, error class, option/code/diagnostic types | One package surface | Yes |
| `README.md` | Usage/release documentation | User guide | Document target precedence, strict WAL, cwd-relative paths, errors/recovery, no release action | Primary guide per AGENTS.md | N/A |
| `DESIGN.md` | Architecture documentation | Durable rationale | Add lifecycle owner/state/proxy/readiness rationale and update initialization flow | Architecture owner per AGENTS.md | N/A |

Durable test files are finalized by `api_e2e_engineer` after implementation source review. Expected coverage locations are existing `src/tests/integration.test.ts` plus focused lifecycle/proxy process tests if the coverage investigation finds separation necessary; production file boundaries must not be distorted solely to force one test layout.

## Ownership Boundaries

The public authoritative root entry is `src/lib/client.ts`; its governing owner is the internal lifecycle singleton. Upstream callers (`context.ts`, `prisma-manager.ts`, decorators, package consumers) use the public facade/proxy and must not import `client/lifecycle.ts`.

Within the lifecycle boundary, target resolution and SQLite readiness are internal owned mechanisms. They provide values/checks but cannot construct, publish, switch, or disconnect the root client. The lifecycle calls them; upstream callers cannot combine the lifecycle facade with those internals.

The context-aware `prisma` boundary remains distinct because its subject is “current operation client,” which can be an ALS transaction. It may select the current operation client through `getPrismaClient`, but it cannot construct the root client or inspect lifecycle state.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `client.ts` root lifecycle facade/proxy | Lifecycle singleton, target resolver, SQLite readiness, raw root client, failure state | `context.ts`, `prisma-manager.ts`, decorators, repositories indirectly, consumers | Import lifecycle singleton or construct `PrismaClient` alongside root boundary | Add a singular facade method/type; do not expose internals |
| `prisma` context-aware proxy | ALS/root selection and forwarding adapter | Ad-hoc operation callers | Capture raw delegate at property access or call root internals separately | Strengthen forwarding behavior |
| `PrismaClientLifecycle` internal owner | State union and candidate/active raw client | Public client facade only | SQLite helper publishes/disconnects client; datasource resolver mutates state | Add lifecycle-owned sequencing method |
| SQLite readiness | Prisma PRAGMAs/path comparison | Lifecycle only | Public initializer issues PRAGMA directly | Extend readiness interface under lifecycle |

## Dependency Rules

Allowed:

- `src/index.ts -> src/lib/client.ts` and other public subsystem files.
- `src/lib/client.ts -> client/lifecycle.ts`, `client/initialization-error.ts`, `forwarding-proxy.ts`.
- `client/lifecycle.ts -> datasource-target.ts`, `sqlite-readiness.ts`, `initialization-error.ts`, `@prisma/client`.
- `datasource-target.ts -> database.ts` pure URL/provider functions and Node URL/path APIs.
- `sqlite-readiness.ts -> ResolvedDatasourceTarget` types, `PrismaClient`, Node filesystem/path APIs.
- `prisma-proxy.ts -> prisma-manager.ts` and `forwarding-proxy.ts`.
- `prisma-manager.ts/context.ts/decorators.ts -> client.ts` public root boundary.

Forbidden:

- No caller above `client.ts` imports the lifecycle singleton or SQLite readiness internals.
- No file other than `client/lifecycle.ts` constructs a raw root `PrismaClient`.
- No environment mutation (`process.env.DATABASE_URL = ...`) is used to configure Prisma.
- No SQLite PRAGMA appears in the public facade, repository, decorator, context, or manager.
- No error/diagnostic concern publishes or disconnects a client.
- No forwarding proxy caches a raw client, method binding, or model delegate across invocations.
- No legacy best-effort WAL branch, dual initializer, or target fallback remains.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `initializePrisma(options?)` | Root readiness request | Bind/verify one target and readiness level | Optional explicit datasource URL; otherwise one environment-selected target | Public facade; `Promise<void>` |
| `shutdownPrisma()` | Root lifecycle | Disconnect/clear lifecycle | Current lifecycle singleton only | Public facade; clears in finally path |
| `rootPrismaClient` | Root operation client | Prisma-shaped forwarding surface | Current bound root target | `$connect/$disconnect` route lifecycle |
| `getPrismaClient()` | Current operation client | Select ALS transaction or root forwarding surface | Active ALS scope or root lifecycle | Existing public boundary |
| `resolveDatasourceTarget(explicit?)` | Datasource target | Produce normalized discriminated target | One explicit/current-env URL | Internal pure boundary |
| `verifySqliteIdentity(client, target)` | Physical SQLite main database | Prove expected/actual canonical match | `sqlite-file` target | Internal readiness boundary |
| `enableAndVerifySqliteWal(client)` | SQLite journal readiness | Activate then independently verify WAL | Verified physical SQLite client | Internal readiness boundary |
| `createForwardingPrismaProxy(resolveClient, hooks?)` | Dynamic client operation | Resolve owner at invocation | Resolver function; explicit lifecycle hooks | Internal reusable adapter |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `initializePrisma` | Yes | Yes | Low | Explicit URL wins; otherwise one documented resolver |
| Root proxy | Yes | Yes | Low | Root subject only; does not guess transaction identity |
| Context-aware `prisma` proxy | Yes | Yes | Low | ALS selection is its explicit subject |
| Datasource resolver | Yes | Yes | Low | Discriminated target union |
| SQLite readiness functions | Yes | Yes | Low | Accept only `sqlite-file` target/client |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Root lifecycle owner | `PrismaClientLifecycle` | Yes | Low | Do not call it generic `Manager`/`Helper` |
| Target value | `ResolvedDatasourceTarget` | Yes | Low | Use discriminated variants, not `config` bag |
| SQLite provider check | `SqliteReadiness` functions/file | Yes | Low | Keep live SQL out of `database.ts` metadata |
| Safe public error | `PrismaInitializationError` | Yes for approved contract | Low | Do not expose raw provider error as this type |
| Dynamic adapter | `createForwardingPrismaProxy` | Yes | Medium | Keep it Prisma-specific; do not become generic proxy utility |

## Applied Patterns (If Any)

- **Authoritative lifecycle boundary**: one owner governs root identity and lifecycle.
- **Discriminated state machine**: lifecycle state variants make invalid client/state combinations unrepresentable.
- **Candidate then publish**: readiness work occurs before a newly initialized client is marked ready.
- **Forwarding/revocable proxy**: stable public shape resolves the live owner at invocation.
- **Provider-specific off-spine concern**: SQLite SQL stays behind the generic lifecycle.
- **Safe public error plus opt-in diagnostics**: stable non-sensitive API separated from raw operational cause.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `src/lib/client/` | Folder | Root Client Lifecycle subsystem | Internal structural depth behind public client facade | Makes lifecycle/provider concerns readable without moving public import | Repository/ALS CRUD concerns |
| `src/lib/client.ts` | File | Thin public root boundary | Public facade and root forwarding proxy | Preserves established import path | Mutable lifecycle fields or PRAGMAs |
| `src/lib/client/lifecycle.ts` | File | `PrismaClientLifecycle` | Governing state/sequencing/raw client | Core owner | URL parsing details or raw console logging |
| `src/lib/client/datasource-target.ts` | File | Datasource target resolver | Selection/normalization/binding value | Coherent off-spine transformation | Prisma state or SQL |
| `src/lib/client/sqlite-readiness.ts` | File | SQLite readiness | Identity/WAL SQL and canonical comparison | Provider-specific off-spine concern | Public lifecycle state |
| `src/lib/client/initialization-error.ts` | File | Safe failure boundary | Codes/messages/diagnostics | Public contract concern | Client cleanup or target selection |
| `src/lib/forwarding-proxy.ts` | File | Client Access Routing | Shared invocation-time Prisma forwarding | Used across root/context proxies | Lifecycle or ALS ownership |
| `src/lib/prisma-proxy.ts` | File | Context-aware public boundary | Configure current-operation forwarding proxy | Existing subject remains coherent | Raw delegate caching |
| `src/lib/database.ts` | File | Database Target Metadata | Env selection and provider inference | Existing responsibility | Live readiness SQL/client state |
| `src/index.ts` | File | Package boundary | Export approved public surface | Existing entrypoint | Internal lifecycle types/state |
| `README.md` | File | Usage guide | Observable contract and release note context | Required by AGENTS.md | Undocumented internal details |
| `DESIGN.md` | File | Architecture guide | Lifecycle/readiness/proxy rationale | Required by AGENTS.md | Release commands beyond existing guide |

The compact `src/lib` layout remains appropriate for existing public subsystem files. The new `client/` folder reflects real internal lifecycle depth; further one-folder-per-concern splitting would over-structure this small package.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/lib/client/` | Main-Line Domain-Control plus owned provider concern | Yes | Low | Internal root-lifecycle subsystem with three cohesive off-spine files |
| `src/lib/` | Mixed Justified | Yes | Low | Existing compact public capability files remain readable; only lifecycle internals gain depth |
| `src/tests/` | Off-Spine Concern | Yes | Medium | API/E2E coverage investigation decides durable split; do not mirror production folders mechanically |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Explicit target authority | `target = resolve(...); new PrismaClient({ datasourceUrl: target.clientUrl })` | Call `getDatabaseUrl()` for helpers but let Prisma read env independently | Prevents A/B divergence |
| Strict WAL | `identity -> set WAL -> query mode -> publish ready` | `try PRAGMA; catch console.warn; resolve` | Initialization success becomes truthful |
| Boundary encapsulation | `initializePrisma -> lifecycle -> sqliteReadiness` | Consumer/facade calls lifecycle and PRAGMA helper separately | Keeps one readiness owner |
| State | `Initializing { target, client, task } -> Ready | Failed` | `rootClient`, `isReady`, `isInitializing`, `lastError` independent mutable globals | Discriminated state prevents impossible combinations |
| Proxy | `capturedUser.findMany()` resolves current delegate when called | Return `client.user` at property access and retain it after shutdown | Prevents stale client escape |
| Target switch | `await shutdownPrisma(); await initializePrisma({ datasourceUrl: B })` | Mutate env or silently replace A while active | Makes identity transition explicit |
| Diagnostics | Safe error code to caller; raw cause only to callback | Include raw Prisma error/path as public `cause` or console output | Enforces privacy-safe default |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Retain best-effort `enableWAL` and add `strictWAL` | Avoid tightening failure behavior | Rejected | Existing flag becomes strict; old catch/warn path removed |
| Mutate `DATABASE_URL` to match `DATABASE_URL_TEST` | Quick fix for generated client | Rejected | Pass supported explicit `datasourceUrl` |
| Create a second configured Prisma singleton | Preserve current lazy singleton | Rejected | One lifecycle owns one target/client |
| Keep old proxy handler behind new initializer | Minimize files changed | Rejected | Replace with forwarding proxy so lifecycle cannot be bypassed by stale handles |
| Catch new safe error and retry old behavior | Ease rollout | Rejected | Caller handles stable rejection or explicitly shuts down/retries |
| Add a legacy initializer wrapper | Preserve fail-open call semantics | Rejected | One current initializer/API contract |

## Derived Layering (If Useful)

For explanation only:

1. Package/public boundary: `index.ts`, `client.ts`, `prisma-proxy.ts`.
2. Governing lifecycle/control: `client/lifecycle.ts`.
3. Owned target/readiness/failure mechanisms: `datasource-target.ts`, `sqlite-readiness.ts`, `initialization-error.ts`, `forwarding-proxy.ts`.
4. Provider dependency: generated `PrismaClient` and database.

The lifecycle boundary must not be skipped: public callers never combine the facade with layer-3 internals.

## Change / Refactor Sequence

1. Add safe initialization error/code/diagnostic types and the tight `ResolvedDatasourceTarget` resolver. Extend `database.ts` only with pure URL-based provider inference needed by the resolver.
2. Add SQLite readiness functions with typed `database_list`/journal-mode parsing and canonical path comparison. No lifecycle state or logging belongs there.
3. Implement `PrismaClientLifecycle` with the discriminated state union, injected/default raw-client factory, exact transition guards, candidate cleanup, conflict behavior, same-request sharing, shutdown coordination, and default root log configuration excluding provider `error` stdout.
4. Add the shared invocation-time forwarding proxy. Replace both current proxy handlers; route root `$connect`/`$disconnect` through lifecycle facade operations.
5. Reduce `client.ts` to the public facade/proxy and update `prisma-manager.ts`/`prisma-proxy.ts` only as needed to depend on that boundary. Delete all replaced inline state/WAL/proxy code in the same change; no temporary dual path remains.
6. Update `src/index.ts` public exports and generated declaration expectations.
7. Update README.md with usage, target precedence, explicit option, cwd-relative SQLite meaning, strict WAL/error handling, diagnostics, recovery, and release-no-impact statement. Update DESIGN.md with lifecycle/state/proxy/readiness rationale.
8. Implementation engineer runs implementation-scoped typecheck/build and focused smoke checks, then hands source to code review. It does not own durable API/E2E test authoring.
9. After source review, API/E2E engineer performs coverage investigation and owns durable source/dist/packed scenarios, environment setup, cleanup, and evidence. Any durable tests use the final public contract and internal lifecycle dependency boundary without adding production compatibility seams.

## Key Tradeoffs

- **Compatibility versus mandatory initialization**: retaining lazy access avoids an unnecessary major break. The lifecycle still makes target construction explicit and records that lazy state is usable but not readiness-proven. Callers needing startup proof must initialize.
- **Cwd-relative SQLite versus Prisma schema-relative behavior**: normalizing before client construction intentionally makes relative identity deterministic and caller-understandable, at the cost of changing uninitialized relative-path placement. README and child-process coverage make this visible.
- **Strict existing flag versus second mode**: tightening `enableWAL` can surface new startup errors, but it removes a misleading success contract and avoids permanent dual policy.
- **Forwarding proxy versus shallow proxy**: nested invocation routing is more implementation work, but it is required for lifecycle/ALS authority and prevents stale delegate capture. The public Prisma-shaped type remains.
- **Safe error versus raw `cause`**: omitting raw cause protects URLs/paths by default. Opt-in callbacks preserve diagnostics at an explicit trust boundary.
- **Physical verification scope**: SQLite supports a concrete `database_list` proof. Other providers retain explicit URL binding without pretending a portable identity query exists.

## Risks

- Proxy reflection errors can break `this` binding, symbol access, transaction routing, or model delegate typing. Use one adapter, invocation-time resolution, `Reflect.get`/`Reflect.apply`, and durable CJS/ESM tests.
- `$extends` and other Prisma APIs returning client-like values can create caller-owned surfaces outside lifecycle revocation. Document the boundary and do not claim those derived clients are managed.
- Relative file URLs with percent-encoding, query parameters, symlinks, macOS `/var` aliases, and Windows casing require careful normalization. Compare canonical filesystem paths after connection and never include them in errors.
- Initialization/shutdown interleaving can publish a client after shutdown was requested. The `Initializing` state must carry a shutdown-requested marker checked before publication.
- Disconnect can itself fail. State must still clear in a finally-equivalent path; an initialization failure keeps its original stable code and must not be replaced by cleanup failure.
- Removing Prisma's `error` stdout level affects general root-client error logging. This is necessary for the approved safe-default contract; README should state callers receive thrown errors rather than implicit provider error output.
- Public npm consumers are not locally observable. Preserve valid lazy/API shapes and document strict WAL rejection clearly before any later tag.

## Guidance For Implementation

- Keep all authoritative mutable lifecycle state in one singleton instance and one discriminated union field.
- Inject a raw client factory into the lifecycle class for deterministic focused validation, but export only the configured singleton through `client.ts`; do not expose a public multi-client factory.
- Do not assign a candidate to a usable state until connection, SQLite identity, and requested WAL checks have completed.
- Compute and retain one `ResolvedDatasourceTarget`; do not re-read environment variables for the same client.
- For physical SQLite, normalize to an absolute file URL before Prisma construction and compare real/canonical expected and actual paths after connection. Preserve supported query parameters in the client URL, not in the filesystem comparison.
- Parse PRAGMA rows defensively and case-insensitively. Treat missing/malformed/multiple-main results as identity or verification failure; never infer success from the activation command alone.
- Construct public errors from fixed code-to-message mapping without `cause`. Invoke each explicitly registered diagnostic callback inside a guarded block and never log callback/provider failures.
- Omit Prisma's provider `error` stdout level from root client construction; remove the current raw `console.warn`. Do not broaden this task into an unrelated logging redesign.
- Forwarding wrappers resolve the client/delegate at invocation, bind the method to its current owner, and never cache raw delegates. Route root `$connect` to initialization and `$disconnect` to shutdown.
- Keep `context.ts` and repository transaction semantics unchanged unless compilation proves a narrow import adjustment is required.
- Do not add compatibility flags, environment mutation, fallback clients, version branches, or dual paths.
- Do not modify Prisma schema/data, bump/tag/publish a version, or release. README/DESIGN changes are required; release execution requires separate explicit user instruction.

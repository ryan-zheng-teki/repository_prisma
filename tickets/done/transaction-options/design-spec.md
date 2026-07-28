# repository_prisma Interactive Transaction Options — Design Spec

## Current-State Read

`src/lib/context.ts` owns the higher-order-function transaction path. Its public
`runInTransaction(callback)` entrypoint detects an active
`AsyncLocalStorage<Prisma.TransactionClient>` store, reuses that client for nested
calls, or asks the lifecycle-backed `rootPrismaClient` forwarding boundary to open one
Prisma interactive transaction. `BaseRepository`, the context-aware `prisma` proxy,
and `getPrismaClient()` join the active transaction without receiving a transaction
argument.

The owner and layering are healthy for the requested feature, but the HOF exposes only
Prisma's callback and cannot pass the callback-overload settings supported by the
current `@prisma/client:^5.22.0` peer contract. Application code needing reviewed
`maxWait` or `timeout` behavior would otherwise have to bypass the library's implicit
context boundary. The decorator is a separate existing public transaction entry style
and does not accept settings; its parameters and runtime path are unchanged by this
ticket.

The target must preserve the existing lifecycle owner, ALS reuse rule, one-argument
call shape, commit/rollback behavior, and package formats. No datasource, client
lifecycle, repository, schema, migration, logging, WAL, or peer-version change is
needed. Evidence and exact current paths are recorded in `investigation-notes.md`.

## Intended Change

1. Define and export a tight `RunInTransactionOptions` type with optional `maxWait`,
   `timeout`, and `isolationLevel` fields matching Prisma's interactive callback
   transaction overload.
2. Add that type as the optional second argument to the existing
   `runInTransaction(callback, options?)` HOF.
3. When no ALS transaction exists, pass the exact caller-owned options object to
   Prisma as `$transaction`'s second argument. When options are omitted, retain the
   one-argument Prisma call so Prisma's defaults remain wholly authoritative.
4. When an ALS transaction exists, reuse it and ignore any nested options because an
   already-open transaction cannot be reconfigured. The outer boundary remains the
   sole physical transaction and settings authority.
5. Extend focused source, real SQLite integration, built declarations, ESM, CommonJS,
   and installed-package coverage.
6. Document the contract, add the `1.0.9` changelog entry, update package/lock
   metadata to `1.0.9`, and leave tag creation/publication to the delivery stage after
   integrated-state and user-verification gates.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Approved In-Scope Use Case(s) | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | `UC-001`, `UC-002`, `UC-004` | `Contract` | `REQ-001`–`REQ-003`; `AC-001`–`AC-004` | Consumer calls the public HOF with no active ALS transaction | `src/lib/context.ts`; existing HOF commit/rollback tests; investigation behavior row | Add a typed optional settings argument and forward it only when opening the outer transaction; preserve callback result/error, ALS routing, commit/rollback, and the no-options path | Consumer -> `runInTransaction` -> root `$transaction` -> ALS -> repositories/proxy -> Prisma -> commit/rollback; `DS-001`, `DS-003` |
| `BEH-002` | `UC-003`, `UC-004` | `Contract` | `REQ-002`, `REQ-004`; `AC-003`, `AC-005` | Consumer calls the HOF while an ALS transaction is active | Nested branch in `src/lib/context.ts`; existing nested transaction evidence | Reuse the same transaction client; do not start or reconfigure a transaction; ignore inner settings and retain outer authority | Outer callback -> nested `runInTransaction` -> active ALS client -> nested callback -> outer completion; `DS-002`, `DS-003` |
| `BEH-003` | `UC-005` | `Operational` | `REQ-005`–`REQ-007`; `AC-006`–`AC-009` | Maintainer builds/tests/releases and consumers resolve package import/require/types | `package.json`, tsup config, package-smoke script, tag workflow, README release section | Ship one public options type and one HOF signature through declarations, ESM, and CJS; document/version/release through the existing tag flow | Source -> build/pack -> isolated consumer -> integrated branch -> `v1.0.9` publish; `DS-004` |

The behavior map defines the supported contract. The following spines describe how the
target structure carries that contract without inventing another transaction API.

## Material Design Premises (Only When Needed)

| Premise ID | Related Behavior ID(s) | Initiating Basis Kind (`User`/`System`/`Operational`/`Contract`) | Independent Product-Supported Trigger Or Applicable Contract And Support Evidence | Forward Production Path To Claimed State | Lifecycle Preconditions And Material Consequence | Reachability (`Reachable`/`Not Reachable`/`Unclear`) | Design Consequence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MP-001` | `BEH-002` | `Contract` | Nested HOF calls are an existing supported contract; `context.ts` and integration coverage deliberately flatten them | Outer HOF opens transaction and binds ALS -> callback invokes inner HOF -> inner HOF observes the store | Prisma settings are fixed when the outer interactive transaction opens; the inner call is reached after that point | `Reachable` | Inner options are ignored, not forwarded and not treated as a request for a second transaction; docs and tests name outer authority explicitly |
| `MP-002` | `BEH-001` | `Contract` | Current generated Prisma 5.22 callback overload accepts `maxWait`, `timeout`, and `isolationLevel` | HOF receives typed object -> root forwarding boundary invokes Prisma `$transaction(callback, options)` | Library must have no independent deadline timer or retry lifecycle | `Reachable` | Use a narrow explicit type and pass-through only; Prisma remains the enforcement owner |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: The scoped HOF already owns outer-versus-nested sequencing, ALS binding,
  and return/error propagation in `src/lib/context.ts`. `rootPrismaClient` remains the
  correct lifecycle-backed root boundary, and repository/proxy client selection remains
  correctly behind `getPrismaClient()`/ALS. The missing capability is one argument on
  this existing public owner.
- Design response: Extend `runInTransaction` and its root export directly. Do not add a
  second HOF, settings service, timer, retry loop, or client owner.
- Refactor rationale: Existing owner, boundary, file placement, callback shape, and ALS
  data structure remain coherent. Extracting a three-field type to another module or
  rerouting the unaffected decorator would add indirection without improving ownership.
- Intentional deferrals and residual risk, if any: The existing `Transactional()`
  decorator remains a separate no-settings entry style. This ticket does not promise
  decorator-level settings. Prisma governs the runtime meaning and supported database
  behavior of `isolationLevel`; repository_prisma only forwards the typed value.

## Terminology

- **Outer transaction:** The physical Prisma interactive transaction opened when no
  transaction client is present in ALS.
- **Nested HOF call:** A `runInTransaction` call made while the outer transaction's
  client is already present in ALS; it shares the outer commit/rollback boundary.
- **Transaction options:** Only Prisma callback-overload settings: `maxWait`,
  `timeout`, and `isolationLevel`.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- No active legacy implementation is replaced. The current one-argument form is the
  approved live contract, not a legacy path, and remains the same function signature
  with an optional second argument.
- Do not introduce an alias such as `runInTransactionWithOptions`, overload-specific
  wrapper, local patch, or dual implementation. The one existing HOF is the clean-cut
  public surface.
- No file becomes obsolete in this small additive change.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Consumer-owned
  Prisma databases; no repository_prisma-owned stored subject changes.
- Relevant code-model, serialization, semantic, or physical-store change: Public
  TypeScript function/type surface only; no schema or serialization change.
- Normal reader/writer behavior and representative evidence: Existing repositories and
  Prisma client readers/writers are unchanged; existing integration tests cover
  commit/rollback.
- Required semantics and invariants under direct use: Successful work commits, thrown
  work rolls back, and all ALS-aware operations use one physical transaction.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints:
  Optioned tests use the existing disposable SQLite test database. No migration or
  data rewrite may be introduced.
- Decision: `Not Affected`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption,
  recovery, and rollout cost: There is no stored representation change, so migration
  has no benefit and would add unrelated write/corruption risk.
- Acceptance criteria or design constraints supported by this decision: `AC-003`,
  `AC-004`, `AC-006`, `AC-008`.

### Migration Plan

N/A — persisted data is not affected.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | `BEH-001` | Consumer HOF invocation without active transaction | Callback result after commit or callback error after rollback | `runInTransaction` plus Prisma for physical enforcement | Carries optional settings and implicit client routing through the actual transaction boundary |
| `DS-002` | `Bounded Local` | `BEH-002` | Nested HOF invocation inside outer callback | Nested callback result/error returned to outer callback | Outer `runInTransaction` boundary | Makes one-client reuse and outer-options authority explicit |
| `DS-003` | `Return-Event` | `BEH-001`, `BEH-002` | Callback resolution or rejection | Consumer receives result/error after Prisma commit/rollback | Prisma interactive transaction with HOF propagation | Protects atomicity and exact result/error behavior |
| `DS-004` | `Primary End-to-End` | `BEH-003` | Source public API and package metadata | Installed consumer resolves CJS/ESM/declarations from published `1.0.9` | Build/package/release workflow | Prevents a source-only change that downstream applications cannot consume |

## Primary Execution Spine(s)

`Consumer runInTransaction(callback, options?) -> HOF checks ALS -> rootPrismaClient.$transaction(callback, options?) -> ALS binds TransactionClient -> BaseRepository/getPrismaClient/prisma operations -> Prisma datasource -> commit or rollback`

`Source and root exports -> typecheck/test/build -> npm pack -> isolated ESM/CJS/TypeScript consumer -> integrated main commit -> v1.0.9 tag workflow -> published package`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | With no active store, the HOF builds the existing transaction callback, opens one Prisma transaction, binds Prisma's callback client in ALS, and executes application work. A supplied object is passed by identity/value as Prisma's second argument; omission retains Prisma defaults. | Consumer; HOF; root forwarding boundary; ALS; transaction-aware repository/proxy; Prisma | HOF for sequencing; Prisma for transaction enforcement | Public typing, lifecycle forwarding, datasource behavior |
| `DS-002` | With an active store, the HOF does not reach the root transaction opener. It runs the inner callback in the same transaction context; supplied inner settings have no effect because the outer transaction already owns the boundary. | Outer callback; inner HOF; active ALS client; inner callback | Outer HOF transaction boundary | Nested contract documentation and exact call-count coverage |
| `DS-003` | Callback fulfillment returns through Prisma, which commits before the HOF fulfills. Callback rejection returns through Prisma, which rolls back before the same error is propagated. Nested results/errors feed this same outer boundary. | Callback; Prisma transaction; HOF; consumer | Prisma and outer HOF | No local timers, retries, or error translation |
| `DS-004` | The root barrel emits one value export and one type export into both built formats/declarations. The package smoke installs the tarball and compiles/loads those surfaces before delivery integrates, tags, and publishes the version. | Source barrel; tsup; pack script; consumer; Git tag workflow; npm | Existing build/release workflow | Version metadata, changelog, docs, tag availability |

## Spine Actors / Main-Line Nodes

- Consumer calling `runInTransaction`.
- The `runInTransaction` public HOF in `src/lib/context.ts`.
- The lifecycle-backed `rootPrismaClient` transaction method.
- Prisma's callback transaction and `Prisma.TransactionClient`.
- ALS transaction context.
- Context-aware repositories/proxy operations.
- Build, pack, and tag-based publication workflow.

## Ownership Map

| Main-Line Node | Ownership |
| --- | --- |
| `runInTransaction` | Public HOF contract, outer-versus-nested branch, optional settings forwarding, ALS callback binding, and result/error propagation. It does not implement option semantics. |
| Prisma interactive transaction | Runtime validation/enforcement of `maxWait`, `timeout`, `isolationLevel`, physical begin/commit/rollback, and database/provider behavior. |
| `prismaContext` / `runInTransactionContext` | Internal async-scope storage and callback binding for the active transaction client. |
| `rootPrismaClient` / lifecycle | Current root-client acquisition and forwarding. It does not own transaction option policy. |
| `BaseRepository` / `getPrismaClient` / `prisma` proxy | Resolve and use the current ALS transaction client; no new parameters or transaction creation. |
| Package barrel/build/release | Public export, emitted module/type surfaces, versioned availability, and publication evidence. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `src/index.ts` export of `runInTransaction` and `RunInTransactionOptions` | `src/lib/context.ts` | Stable package-root import path | A second implementation, defaults, timers, or option normalization |
| `rootPrismaClient` forwarding proxy | `PrismaClientLifecycle` and raw Prisma client | Prevent callers from retaining a stale raw root and preserve lifecycle checks | ALS state, new client lifecycle, or repository_prisma-specific timeout enforcement |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Parallel HOF/alias proposal (`runInTransactionWithOptions` or equivalent) | Optional settings fit the existing authoritative HOF | `runInTransaction(callback, options?)` in `src/lib/context.ts` | `In This Change` | Prohibited rather than introduced and later retained |
| Local timer/retry/settings-normalizer proposal | Prisma already owns these interactive transaction semantics | Direct typed pass-through to Prisma | `In This Change` | No hidden policy or duplicate deadline behavior |
| Existing files/code paths | N/A; no active file becomes obsolete | N/A | `Follow-up` | No removal required for the approved additive scope |

## Return Or Event Spine(s) (If Applicable)

`Application callback result -> Prisma commit -> HOF fulfillment -> consumer result`

`Application callback error, including nested callback error -> Prisma rollback at the outer boundary -> unchanged HOF rejection -> consumer error`

There is no new event channel, error wrapper, timeout event, or retry signal.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: outer `runInTransaction`.
- Chain: `inner runInTransaction(callback, innerOptions) -> getTransactionClient() returns active tx -> runInTransactionContext(activeTx, callback) -> nested result/error -> outer callback`.
- Why it matters: this branch must never invoke root `$transaction`; it proves the
  outer options and commit/rollback boundary remain authoritative.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Public type declaration | `DS-001`, `DS-004` | HOF/package boundary | Restrict settings to the callback overload's three fields | Prevent batch-overload or arbitrary-object leakage | Runtime normalizer or generic settings bag would duplicate Prisma semantics |
| Lifecycle-backed root proxy | `DS-001` | HOF | Resolve current raw root safely and invoke `$transaction` | Preserve initialization/shutdown/rebinding contract | Direct raw-client ownership would split lifecycle authority |
| Focused transaction harness | `DS-001`, `DS-002`, `DS-003` | HOF | Observe exact root call count/options and ALS client identity | Real DB tests cannot reliably expose invocation arguments | Production code might gain test-only hooks |
| SQLite integration fixture | `DS-001`, `DS-003` | Transaction/repository path | Prove real multi-repository commit/rollback with settings | Mock-only success cannot prove atomic persistence | Database-specific assertions could be mistaken for option semantics |
| Package smoke | `DS-004` | Public package | Inspect declarations and consume installed CJS/ESM/types | Source tests do not prove shipped artifacts | Runtime transaction logic would be duplicated in packaging code |
| Documentation/changelog | `DS-004` | Consumer/release boundary | Explain outer authority, Prisma-owned enforcement, and release use | Prevent timeout or nesting misinterpretation | Documentation must not define a second behavioral contract |

## Ownership Boundaries

The package-root export is the authoritative consumer boundary. `context.ts` owns HOF
sequencing and ALS binding. Prisma owns the meaning and enforcement of the option
values. The lifecycle/root proxy owns root-client availability, not transaction-option
defaults. Repositories and the context-aware proxy must continue to obtain their client
through the existing context routing rather than accepting or retaining a transaction
client directly.

`runInTransactionContext` and `prismaContext` remain internal mechanisms. The new
public type describes only input accepted at the HOF boundary and must not expose ALS
or raw-client details.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `runInTransaction(callback, options?)` | Active-client detection, root transaction opening, ALS binding, nested reuse | Functional-style service/application transaction callers | Direct raw Prisma `$transaction` plus manual `tx` propagation solely to obtain settings | Extend this same typed API, as designed |
| `getPrismaClient()` / BaseRepository / `prisma` proxy | ALS-versus-root client selection | Repository and context-aware query code | Root-client query inside the HOF callback | Add a tight repository/query capability, not raw-client capture |
| `rootPrismaClient` lifecycle facade | Raw root construction/readiness/rebinding | HOF's outer branch and supported root operations | New retained `PrismaClient` owned by context code | Extend lifecycle only for lifecycle needs; none exist here |

## Dependency Rules

- `context.ts` may depend on Prisma types and the existing `rootPrismaClient` facade.
- `runInTransaction` may pass the caller's options only to the outer callback-overload
  `$transaction` invocation.
- The nested branch may depend only on the active ALS client and callback; it must not
  invoke root `$transaction`, merge options, or compare options.
- `src/index.ts` re-exports the HOF value and options type; it contains no behavior.
- Repositories/proxies depend on context-aware client selection and remain unaware of
  transaction options.
- Prisma remains the only runtime owner of wait/timeout/isolation behavior.
- Forbidden: parallel HOFs, untyped dictionaries, overload extraction that accidentally
  selects array `$transaction`, local timers/retries, raw-client construction, decorator
  API changes, peer upgrades, or backend edits.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `runInTransaction<T>(callback, options?)` | One implicit interactive transaction scope | Open/reuse the scope, bind ALS, return/rethrow callback outcome | Callback identity plus optional `RunInTransactionOptions` value | Inner options are intentionally ignored when a scope already exists |
| `RunInTransactionOptions` | Prisma interactive callback settings | Typed pass-through contract | `{ maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }` | No index signature, retry fields, or batch-transaction fields |
| `getTransactionClient()` | Current async transaction context | Return active Prisma transaction client or `undefined` | Current async execution context | Existing API unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `runInTransaction` | `Yes` | `Yes` | `Low` | Keep callback first and one narrow optional object second |
| `RunInTransactionOptions` | `Yes` | `Yes` | `Low` | Explicitly name all three callback-overload fields |
| `getTransactionClient` | `Yes` | `Yes` | `Low` | No change |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Public transaction HOF | `runInTransaction` | `Yes` | `Low` | Retain |
| Public settings type | `RunInTransactionOptions` | `Yes` | `Low` | Use consistently in source, docs, and declarations |
| ALS binding helper | `runInTransactionContext` | `Yes` | `Low` | Keep internal; do not confuse it with the public HOF |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Open/reuse optioned implicit transaction | Context/transaction HOF | `Extend` | It already owns the exact branch and ALS scope | N/A |
| Enforce max wait, timeout, isolation | Prisma interactive transaction | `Reuse` | Prisma already defines and enforces these values | N/A |
| Root client availability | Existing lifecycle/forwarding proxy | `Reuse` | No lifecycle change is needed | N/A |
| Public type/value availability | Existing root barrel and tsup outputs | `Extend` | One type export is sufficient | N/A |
| Artifact validation | Existing Vitest integration and package-smoke capability | `Extend` | Existing harnesses cover real DB and packed outputs | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Transaction context (`src/lib/context.ts`) | Options type, outer forwarding, nested reuse, ALS binding | `DS-001`–`DS-003` | `runInTransaction` | `Extend` | Keep compact; no new folder/file for three fields |
| Public package boundary (`src/index.ts`) | Root type/value exports | `DS-004` | Package consumer contract | `Extend` | Type-only export |
| Source executable coverage (`src/tests`) | Exact branch behavior and real atomicity | `DS-001`–`DS-003` | HOF/Prisma path | `Extend` | Focused unit plus existing integration |
| Package/release capability | Built declaration/module smoke, docs, version, tag workflow | `DS-004` | Package public surface | `Extend` | No release-process redesign |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/lib/context.ts` | Transaction context | HOF/ALS owner | Define type and extend outer/nested HOF branches | Type is meaningful only at this boundary | Uses Prisma isolation type |
| `src/index.ts` | Public package boundary | Root barrel | Export HOF value and options type | Existing package export owner | Yes |
| `src/tests/transaction-context.test.ts` | Focused coverage | HOF branch contract | Spy exact outer options/call count and nested ALS identity | Isolates control-flow evidence from real DB fixture | Uses public/context types |
| `src/tests/integration.test.ts` | Integration coverage | Real repository transaction path | Optioned commit/rollback across repositories | Existing SQLite integration owner | Uses HOF/options |
| `scripts/run-package-smoke.js` | Package coverage | Packed consumer | Inspect declarations and compile/load installed API | Existing artifact harness | Uses emitted exports |
| `README.md`, `DESIGN.md`, `CHANGELOG.md` | Documentation | Consumer/architecture/release contract | Usage, ownership, release delta | Existing docs authorities | Yes |
| `package.json`, `package-lock.json` | Package metadata | Versioned package | Set `1.0.9` consistently | npm-owned metadata pair | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Interactive settings shape used by HOF and consumers | Keep `RunInTransactionOptions` in `src/lib/context.ts` | Transaction context | One exported source type is reused by root declarations/tests/consumers | `Yes` | `Yes` | Generic Prisma configuration bag or copy of all `$transaction` overloads |
| Transaction callback wrapper | Keep local inside `runInTransaction` | Transaction context | Used once; extraction would add empty indirection | `Yes` | `Yes` | Public/test hook |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `RunInTransactionOptions` | `Yes` | `Yes` | `Low` | Keep exactly `maxWait`, `timeout`, and callback-overload `isolationLevel`; no index signature |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/lib/context.ts` | Transaction context | HOF/ALS owner | `RunInTransactionOptions`; outer forwarding; nested reuse | All are one transaction-context policy | Canonical options type |
| `src/index.ts` | Public package boundary | Package barrel | Value/type export only | Existing root export authority | Canonical options type |
| `src/tests/transaction-context.test.ts` | Focused coverage | HOF control flow | Exact supplied/omitted/nested invocation and ALS assertions, including type-negative checks | One bounded behavior suite | Canonical options type |
| `src/tests/integration.test.ts` | Integration coverage | Real transaction path | Add optioned multi-repository commit/rollback while retaining no-options cases | Existing database transaction suite | Canonical HOF |
| `scripts/run-package-smoke.js` | Package coverage | Installed artifact | Declaration field checks, consumer TypeScript checks, and runtime export checks in CJS/ESM | Existing end-to-end package harness | Emitted options type/HOF |
| `README.md` | Usage/release docs | Consumer guide | Optional settings example, outer-authority note, Prisma enforcement, 1.0.9 release command | Existing primary guide | Canonical names |
| `DESIGN.md` | Architecture docs | Design rationale | HOF option ownership and nested rule | Existing architecture authority | Canonical names |
| `CHANGELOG.md` | Release record | Version history | New 1.0.9 entry; no schema/peer/lifecycle changes | Existing release record | N/A |
| `package.json`, `package-lock.json` | Package metadata | npm package | Version `1.0.9`, otherwise preserve peer/export metadata | npm consistency requires both | N/A |

## Applied Patterns (If Any)

- **Implicit transaction context:** Existing ALS pattern; application repositories join
  the active Prisma transaction without `tx` prop drilling.
- **Outer boundary authority:** Existing nested-flattening pattern; the first physical
  transaction owns settings and commit/rollback.
- **Typed pass-through:** The library narrows the supported input contract but delegates
  enforcement to Prisma rather than duplicating it.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `src/lib/context.ts` | `File` | Transaction context/HOF | Public options type and HOF branch logic | Existing transaction-context owner | Timer, retry, normalization, raw client construction |
| `src/index.ts` | `File` | Package barrel | Re-export value and type | Existing consumer boundary | Behavior |
| `src/tests/transaction-context.test.ts` | `File` | Focused HOF coverage | Controlled root/ALS observations and type assertions | New behavior has a distinct bounded contract | Production test hooks or database fixture |
| `src/tests/integration.test.ts` | `File` | Real repository integration | SQLite optioned atomicity | Existing end-to-end transaction suite | Mock-only forwarding assumptions |
| `scripts/run-package-smoke.js` | `File` | Packed artifact coverage | Installed CJS/ESM/declaration checks | Existing package validation owner | Alternative runtime implementation |
| `README.md`, `DESIGN.md`, `CHANGELOG.md` | `File` | Documentation authorities | Consumer use, architecture, release delta | Required by repository instructions | Conflicting option semantics |
| `package.json`, `package-lock.json` | `File` | Package metadata | Version consistency | Existing npm package authority | Peer upgrade or export redesign |

The current compact layout remains clearer than a new transaction folder: one small
HOF, its ALS mechanism, and one tight type form a single owner without structural
depth that would justify more modules.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/lib` | `Mixed Justified` | `Yes` | `Low` | Small library capability files already have explicit responsibilities; keep the option type with context owner |
| `src/tests` | `Off-Spine Concern` | `Yes` | `Low` | Separate focused HOF behavior from real database integration |
| `scripts` | `Off-Spine Concern` | `Yes` | `Low` | Existing installed-package validation belongs here |
| Repository root docs/metadata | `Off-Spine Concern` | `Yes` | `Low` | Existing documented authorities and npm conventions |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Public API | `runInTransaction(work, { maxWait: 2_000, timeout: 10_000 })` | `runInTransactionWithOptions(work, settings)` | One owner and no compatibility alias |
| Nested authority | `runInTransaction(() => runInTransaction(work, inner), outer)` opens once and uses `outer` | Starting a second physical transaction or merging `inner` into an open transaction | Makes the reachable nested rule unambiguous |
| Type shape | `{ maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }` | `Record<string, unknown>` or batch-overload extraction | Protects the intended interactive overload |
| Runtime semantics | Pass settings unchanged to Prisma | `Promise.race`, local timeout timers, retry loops, or numeric normalization | Prisma, not this library, owns enforcement |

Target signature and branch shape:

```ts
export type RunInTransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

export const runInTransaction = <T>(
  callback: () => Promise<T>,
  options?: RunInTransactionOptions
): Promise<T> => {
  const existing = getTransactionClient();
  if (existing) {
    return runInTransactionContext(existing, callback);
  }

  const execute = (tx: Prisma.TransactionClient) =>
    runInTransactionContext(tx, callback);

  return options === undefined
    ? rootPrismaClient.$transaction(execute)
    : rootPrismaClient.$transaction(execute, options);
};
```

The explicit `undefined` branch preserves the existing one-argument call rather than
turning omission into a library-owned defaults object. An empty supplied object is
still forwarded because it was explicitly supplied.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Second HOF/alias for callers needing options | Could avoid changing the existing signature | `Rejected` | Add one optional second argument to the same HOF |
| Overload retaining a separate callback-only implementation | Could model both source call forms | `Rejected` | One implementation with optional argument; callback-only calls remain naturally valid |
| Local consumer patch or unpublished wrapper | Could unblock backend before release | `Rejected` | Complete, test, version, tag, and publish `repository_prisma` first |
| Preserve no-options behavior | This is an active approved contract, not legacy compatibility | `N/A` | Retain the same HOF and Prisma one-argument branch |

## Derived Layering (If Useful)

`Application/service -> repository_prisma public HOF -> transaction-context owner
(outer/nested sequencing + ALS) -> lifecycle-backed Prisma root / active transaction
client -> Prisma transaction engine -> datasource`

The options type belongs at the public HOF boundary. Enforcement belongs below it in
Prisma. Repositories remain above the active client and do not receive transaction
configuration.

## Change / Refactor Sequence

1. Add `RunInTransactionOptions` and the optional HOF argument in `context.ts`. Retain
   the existing one-argument root invocation for omission and the current nested branch.
2. Export the type from `src/index.ts`.
3. Add focused control-flow/type coverage proving exact outer forwarding, omitted
   settings, one physical nested transaction, same ALS client, and outer authority.
4. Add real optioned multi-repository commit and rollback cases without removing the
   existing no-options integration cases.
5. Extend packed declaration inspection, TypeScript consumer compilation, and CJS/ESM
   runtime export smoke.
6. Update README and DESIGN with the target contract; prepend the 1.0.9 changelog and
   update package/lock versions while preserving the peer range and exports.
7. Run implementation checks (`npm run typecheck`, focused/full tests, build, package
   smoke) and hand source to review. Do not edit the dependent backend.
8. After source review, API/E2E coverage execution, and proportional test review,
   delivery refreshes `origin/main`, integrates any new base state, reruns affected
   checks, updates delivery records, obtains the required user verification, merges,
   creates annotated `v1.0.9`, pushes through the existing workflow, and records npm
   publication evidence. Do not tag from a non-integrated ticket-only state.

No temporary compatibility seam or data migration exists.

## Key Tradeoffs

- An explicit options type duplicates three stable fields from the supported Prisma
  peer declaration, but it avoids fragile overload introspection and accidental
  inclusion of array-transaction settings.
- Silently ignoring nested options preserves the established flattening contract.
  Throwing would make a harmless nested helper fail, while applying them is impossible
  after the outer transaction opens.
- Keeping the type in `context.ts` avoids an unnecessary one-type module. If the public
  transaction contract later grows materially, a transaction capability folder may
  become warranted; it is not warranted now.
- Retaining the one-argument Prisma call on omission adds one small conditional but
  provides the clearest proof that repository_prisma has not created default values.

## Risks

- A future Prisma peer major could change callback settings. The current peer remains
  `^5.22.0`; package type smoke and normal dependency updates must detect drift before a
  peer-range change.
- Isolation levels differ by provider. Tests should prove typing/forwarding without
  claiming every value works on every database; SQLite integration should use safe
  timeout/wait settings.
- Mock-only forwarding tests can miss atomic persistence; real integration coverage is
  required. Real integration alone cannot observe exact options/call count; focused
  controlled coverage is also required.
- `v1.0.9` or `origin/main` may change before delivery. Delivery must refresh and verify
  external state rather than assuming bootstrap state is still current.

## Implementation Readiness (Mandatory)

- Status: `Implementation Ready`
- Approved use-case and behavior-map coverage: `Pass` — `UC-001`–`UC-005` are covered
  by `BEH-001`–`BEH-003`; each row links requirements and acceptance criteria.
- Production-path and data-flow-spine coverage for every mapped use case and behavior:
  `Pass` — outer execution, nested bounded-local reuse, return/rollback, and
  build-to-publication paths are covered by `DS-001`–`DS-004`.
- Complete shared-design-principles validation: `Pass` — the design extends the
  existing owner, keeps Prisma/lifecycle/ALS authority explicit, uses one tight public
  structure, forbids bypass/parallel APIs, preserves the current production spine,
  records no-data-transition and removal decisions, and is proportionate to the change.
- Corrections made and affected checks repeated: Requirements approval/status was
  recorded; release expectation was tightened to `1.0.9`; nested reachability and outer
  authority were made explicit; the no-options one-argument Prisma branch and concrete
  source/package coverage were specified. Behavior, spine, ownership, interface,
  dependency, file, removal, transition, and proportionality checks were then repeated.
- Remaining non-blocking risks: Provider-specific isolation support, future Prisma peer
  drift, and delivery-time tag/base freshness; each has an explicit test or delivery
  control.
- Blocking requirement, evidence, or design gaps: `None`

## Guidance For Implementation

- Work only in
  `/Users/normy/autobyteus_org/autobyteus-worktrees/repository-prisma-transaction-options`
  on `codex/transaction-options`.
- Keep `RunInTransactionOptions` explicit and type-only where imported/exported. Do not
  derive it from the overloaded `$transaction` method unless the result is demonstrably
  the callback overload across the peer range.
- Compare `options === undefined`; an explicitly supplied empty object should reach
  Prisma, while omission should retain the current one-argument call.
- Do not validate/clamp/copy/freeze settings. Forward the exact supplied object to the
  outer call. Do not implement timers, retries, or error translation.
- In nested coverage, prove the root `$transaction` call count is one, the outer object
  is the only forwarded object, and both callbacks observe the same transaction client.
- Preserve existing no-options integration tests and add separate optioned
  multi-repository commit/rollback cases.
- Add invalid-key and invalid-value compile assertions with `@ts-expect-error`, and
  ensure the packed consumer imports `type RunInTransactionOptions`.
- Keep source tests deterministic and clean temporary package/database artifacts.
- Do not change `Transactional()`, BaseRepository, lifecycle, peer versions, schema,
  migrations, or the paused AutoByteus backend ticket.
- Do not create/push the release tag during implementation; delivery owns integration,
  final user verification, tag publication, and release evidence.

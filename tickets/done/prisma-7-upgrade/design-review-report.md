# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/requirements-doc.md` (Approved, SR-005)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed: `probes/README.md` (including § CR-001), the probe files, `probes/cr01-connection-gate-prototype.ts.txt`, `probes/cr01-edge-cases.cjs`, `probes/cr01-root-in-transaction.cjs`, `probes/feasibility-patch.diff`, `follow-ups.md`; as context, `code-review-report.md` (CRR-001, CR-001) and `evidence/CR-01-tx-isolation-probe.{cjs,log}`
- Relevant Solution Revision IDs: SR-002 (requirements approval), SR-003 (initial design), SR-004 (AC-006/AC-008 correction and design revision), SR-005 (connection gate D7, AC-013, SCN-007; triggered by code review CR-001)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: Revised package from the Solution Designer at SR-005 (commit `779fcb0`, handoff.md "Round 3 Changes"), after code review CRR-001 failed IR-001 (`a092a60`) with CR-001 (Design Impact: transaction isolation on a single SQLite connection)
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Pass at SR-004)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `codex/prisma-7-upgrade` at `779fcb0` (base `f2ffd5c`; IR-001 at `a092a60`). Round 3 read the SR-005 diff (`f1df63b..779fcb0`) and checked the gate design against these sources (all under `/tmp/prisma7-probe/node_modules`, 7.10.1):
  - `@prisma/adapter-better-sqlite3` `dist/index.js:515-545` (`queryRaw`/`executeRaw` go through `performIO`/`executeIO` and take no mutex) and `:633-651` (`startTransaction` takes the private mutex, then `BEGIN`).
  - `@prisma/adapter-libsql` `dist/index-node.js:286-401` (one mutex shared by `performIO`, `executeScript` and `startTransaction`).
  - The `@prisma/client` runtime `client.js` transaction manager: default `maxWait` 2000 ms; `startTransaction` is raced against `maxWait`; a transaction that starts late is discarded through `ROLLBACK` + `rollback()`.
  - `src/lib/{context,decorators,prisma-manager,base-repository}.ts`: nested `runInTransaction`/`@Transactional` reuse the ALS transaction, and repositories use `getPrismaClient()`.
  Round 2: Round 2 re-read the SR-004 diff and re-checked the cited `lifecycle.ts:103-121`, `:132-150`, `:283-288` and `logging-policy.test.ts:81-104` against the code. Round 1 read: Read: `src/lib/client/{lifecycle,datasource-target,initialization-error,sqlite-readiness}.ts`, `src/lib/{database,client,models}.ts`, `src/index.ts`, `src/tests/{client-lifecycle,datasource-readiness,public-initialization,logging-policy}.test.ts`, `scripts/*`, `prisma/schema.prisma`, `prisma.config.ts`, `package.json`, `tsup.config.ts`, `.github/workflows/{ci,release}.yml`, README. Adapter source `@prisma/adapter-better-sqlite3@7.10.1` `dist/index.js` (in `/tmp/prisma7-probe`): `timestampFormat` at `:412-419`, `createBetterSQLite3Client` at `:677-683`, the package `exports` with both `require` and `import`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: about 14 files within existing ownership, with no new subsystem (Medium). Public contract changes: the peer move, a new native-addon peer, a new error code and narrower provider support, a Node minimum, a persisted-representation invariant and packaging externals (High). Both values match the definitions.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Upgrade to 7.10.1 with the same SQLite public API (REQ-003..007, REQ-015), non-SQLite rejected (DEC-001), DateTime continuity (REQ-005), and the query string ignored for the opened file (REQ-004).
- Relevant existing behavior and evidence confirmed: Yes. There is one production construction site (`lifecycle.ts:67-71`). The three target kinds are at `datasource-target.ts:90-131`. `failureFrom` keeps the stage code (`lifecycle.ts:73-81`) and is used by both `initialize` (`:111-120`) and `bindLazyClient` (`:210-218`).
- Scope guardrail confirmed: Yes (UC-001..004; out of scope: FU-001..003, schema migration and the consumer upgrade; preserved boundary and review authority as stated).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes. The only blocking finding, ARCH-001, is a `Requirement Gap`.
- Remaining material ambiguity: None.
  - AC-006 covers SQLite targets only; AC-008 covers every non-SQLite form and lifecycle state (DEC-001).
  - AC-013 makes REQ-007's preserved isolation between concurrent requests testable.
  - SCN-007 is classified Technically Possible but Unsupported. The README already says to avoid `rootPrismaClient` in transactional flows (README "Advanced: Root Client Access"), and its new consequence is documented, not required.
- Statements about existing code the design relies on, opened at their cited lines:
  - `lifecycle.ts:67-71` factory: confirmed.
  - `datasource-target.ts:91-100`, `:102-111`, `:115-131`: confirmed.
  - `failureFrom` `:73-81`, `initialize` `:114-121`, `bindLazyClient` `:210-229`: confirmed.
  - "`clientUrl` only non-test reader is `lifecycle.ts:69`": confirmed by grep.
  - "`SAFE_ERROR_MESSAGES` is a `Record`, so the compiler enforces it": confirmed (`initialization-error.ts:28`).
  - "434 lines": the file has 437. Trivial; it does not affect any decision.
  - "Removal plan lists every test asserting non-SQLite success": complete at SR-004, now including `logging-policy.test.ts:81-104`. The `file::memory:` rewrite is sound: memory targets skip the identity check (`lifecycle.ts:296`), so the fake client needs no identity rows.
  - Precedence at SR-004: resolution (`:111-121`) runs after only the shutting-down check (`:103-109`) and before the conflict (`:132-135`, `:147-150`), logging-policy and WAL (`:283-288`) checks. A resolution failure sets `failed` only from `idle`/`failed` (`:116-118`). All confirmed.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | Resolved (ARCH-001): AC-006 is SQLite-only, and the non-SQLite + WAL outcome moves to AC-008 |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Data | Pass | Pass | Pass | Confirmed | Adapter source `:412-419` confirms that `unixepoch-ms` binds `Date` as `getTime()` |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | The precedence and the bound-client outcome are stated with citations; the AC-008 test plan has 5 cases |
| BEH-008 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | Contract | Pass | Pass | Pass | Confirmed | SR-005: the CR-001 contradiction is addressed by D7. Every library transaction entry (`runInTransaction` `context.ts:31-43`, `@Transactional` `decorators.ts:18-28`) reuses an existing ALS transaction before starting one, and repositories and `prisma` use `getPrismaClient()`. So no library path calls the gated root connection from inside its own transaction; only SCN-007 (direct `rootPrismaClient`) does. |
| BEH-010 | Contract | Pass | Pass | Pass | Confirmed | The adapter package exports both `require` and `import` |
| BEH-011/012 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-013 | Contract | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/README.md` + probe files | Pass | Pass | Pass | Pass (it states that the patch's `:memory:` mapping of non-SQLite is not the design) | Pass (evidence only) | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior Change, triggers listed | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`. There is one factory seam, and `failureFrom` already carries the stage codes (verified). | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No refactor; FU-002/FU-004 deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | One new owned file, a tighter type, one new code | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Explicit init | Pass | Pass | Pass | Pass | Pass (minor: the WAL-provider gate `lifecycle.ts:283` comes before `$connect` and is omitted, but it is unchanged) | Pass | Pass |
| DS-002 | Lazy bind | Pass | Pass | Pass | Pass | Pass | Pass (the gate sits inside the adapter policy, off the main line) | Pass |
| Gate (bounded local) | Lock lifecycle inside the adapter connection | Pass (in the Off-spine row, the Interface row and the Guidance release paths, not in the Bounded Local Spines section) | Pass | N/A | Pass | Pass. Plain call: acquire, run, release in `finally`. Transaction: acquire, inner `startTransaction` (release on throw), pass-through queries, then `commit`/`rollback` with the release exactly once. | Pass | Pass |
| DS-003 | Package load | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Toolchain | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `client.ts` -> `PrismaClientLifecycle` | Pass | Pass | Pass | Pass | The target types are internal (not exported from `src/index.ts`), so removing `OtherDatasourceTarget` changes no public export |
| `sqlite-driver-adapter.ts` | Pass | Pass | Pass | Pass | Only the lifecycle imports it. Tests build their own fixture adapters. |
| `sqlite-connection-gate.ts` | Pass (`gateSqliteConnection(factory)`) | Pass (the lock and the transaction wrapper are private) | Pass (only `sqlite-driver-adapter.ts` applies it; the lifecycle factory is unchanged) | Pass | No ALS, lifecycle, target or SQL knowledge (forbidden in the design) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| lifecycle -> sqlite-driver-adapter -> adapter package | Pass | Pass | Pass | Pass | — |
| datasource-target -> initialization-error, database | Pass | Pass | Pass | Pass | No adapter dependency |
| sqlite-driver-adapter -> sqlite-connection-gate | Pass | Pass (the gate must not know ALS, lifecycle or targets) | Pass | Pass | Gate types come from the adapter package, so there is no new dependency. The prototype imports `@prisma/driver-adapter-utils`, a transitive dependency; the design rightly does not adopt that. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `createSqliteDriverAdapter(target)` | Pass | Pass | Pass (the union narrows to file and memory) | Low | Pass |
| `resolveDatasourceTarget(explicitUrl?)` | Pass | Pass | Pass | Low | Pass |
| `PrismaInitializationErrorCode` + `UNSUPPORTED_DATASOURCE_PROVIDER` | Pass | Pass | N/A | Low | Pass |
| `PrismaClientFactory` seam | Pass | Pass | Pass | Low | Pass (signature unchanged) |
| `gateSqliteConnection(factory)` | Pass (one SQLite connection) | Pass | Pass | Low | Pass. It forwards `provider`, `adapterName`, `getConnectionInfo`, `dispose`, savepoints and `options`. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Adapter construction | Pass | Pass | Pass (it owns the path/memory mapping and the timestamp-format rule) | Pass | — |
| Rejection + code | Pass | Pass | N/A | Pass | Extends the existing classification and catalog |
| Generation in toolchain | Pass | Pass | N/A | Pass | `prepare` covers local, CI and release `npm ci` |
| Transaction isolation on one connection | Pass. The options were the libsql adapter, proxy/ALS gating, two clients, and accepting the break. | Pass. The rejection reasons are evidence-backed: `:memory:` loss in libsql's local `transaction()`, and proxy gating misses internal and batch transactions and turns `PrismaPromise` into `Promise`. | Pass. It follows Prisma's own libsql rule (verified, `index-node.js:286-401`). | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/lib/client/` | Pass | Pass | Pass | Pass | Both entry forms (explicit, lazy) and all three URL kinds are traced |
| Package/toolchain | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Test seed adapters | Pass | N/A (local test helper) | Pass | Pass | The AC-005 "new row" goes through the library's root client, so the test checks the production policy rather than the fixture copy |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SqliteFileDatasourceTarget` | Pass | Pass | Pass | N/A | Pass | `bindingKey` keeps its exact former value |
| `SqliteMemoryDatasourceTarget` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. `logging-policy.test.ts` was added at SR-004 (ARCH-002 resolved).

Each domain word keeps one meaning (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `sqlite-driver-adapter.ts` (Add) | Pass | Pass | N/A | Pass | Applies the gate |
| `sqlite-connection-gate.ts` (Add, SR-005) | Pass | Pass | N/A | Pass | — |
| `src/tests/transaction-isolation.test.ts` (Add, SR-005) | Pass | Pass | N/A | Pass | AC-013 cases 1-4, plus gate unit tests with a fake inner adapter |
| `datasource-target.ts` | Pass | Pass | N/A | Pass | — |
| `lifecycle.ts` | Pass | Pass | N/A | Pass | Stays under 500 lines |
| `initialization-error.ts` | Pass | Pass | N/A | Pass | — |
| Toolchain/scripts/workflow files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/lib/client/sqlite-driver-adapter.ts` | Pass | Pass | Low | Pass | — |
| `src/lib/client/sqlite-connection-gate.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `OtherDatasourceTarget` + branch | Pass | Pass | Pass | Pass | — |
| `clientUrl` | Pass | Pass | Pass | Pass | Grep evidence given |
| `datasourceUrl` construction, schema `url`, `--skip-generate`, CI step + env | Pass | Pass | Pass | Pass | Removing the env is safe: `npm test` sets its own `DATABASE_URL` (`run-tests.js:21-25`) |
| Tests for removed behavior | Pass | Pass | Pass | Pass | `logging-policy.test.ts:81-104` was added at SR-004 (ARCH-002 resolved) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Prisma 5 construction, URL engine parameters, `other` kind | No | Pass | Pass | Rejection log is explicit |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Consumer SQLite `DateTime` columns | Directly Usable — No Migration | Pass (Measured: both formats read Prisma-5 rows, and the adapter source binds `Date` as `getTime()` under `unixepoch-ms`) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Manifest -> schema -> runtime -> toolchain -> tests -> docs -> fresh `npm ci` evidence | Pass | Pass (none) | Pass | Pass |
| SR-005 delta on top of IR-001: add the gate, apply it in `createSqliteDriverAdapter`, add AC-013 and gate unit tests, update docs | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Factory / adapter policy / ESM imports / README setup | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `PREM-001` — A transaction queued behind another longer than its `maxWait` leaks the gate lock

- Related approved requirement or established contract: REQ-007, AC-013 ("two concurrent transactions both complete")
- Relevant behavior ID(s): BEH-009
- Initiating basis kind: `System`
- Independent product-supported initiating trigger: two concurrent requests in a consumer server, each calling `runInTransaction`/`@Transactional` (SCN-001), where the first transaction runs longer than the second's `maxWait` (default 2000 ms)
- Support evidence: a supported normal workflow (requirements SCN-001, AC-013)
- Forward path: B calls `$transaction`. Prisma's transaction manager races `adapter.startTransaction` against `maxWait`, and the gate's `startTransaction` waits for A's lock. `maxWait` expires and B rejects with P2028 "Unable to start a transaction in the given time". When A releases, B's late `startTransaction` resolves, and Prisma's discard path runs `executeRaw(ROLLBACK)` and then `rollback()` on it (`client.js` transaction manager, verified).
- Lifecycle preconditions and material consequence: the gate's transaction wrapper releases the lock on `rollback()`. So the lock is not leaked, provided the wrapper releases on rollback even when the inner rollback throws (the design requires exactly this). B fails with P2028, where on Prisma 5 it could have succeeded on another pooled connection.
- Reachability: `Reachable`
- Review consequence / proportionate response: there is no design defect, because the required release-on-rollback path covers it. AC-013's "both complete" holds only when the first transaction ends within the second's `maxWait`. This is recorded as a residual risk with a docs/test recommendation; it is not a blocking finding.

### `PREM-002` — `rootPrismaClient` used inside a transaction callback (SCN-007)

- Related approved requirement or established contract: README "Advanced: Root Client Access" ("Avoid using it inside transactional flows")
- Relevant behavior ID(s): BEH-009
- Initiating basis kind: `User` (application code)
- Independent trigger: an application calls `rootPrismaClient` directly inside a `runInTransaction` callback
- Support evidence: the README discourages the pattern. FU-001 records that the known consumer must audit for it.
- Forward path: the root query goes to the gated connection, which waits for the enclosing transaction. Prisma's `timeout` expires and the transaction fails.
- Lifecycle preconditions and material consequence: the enclosing transaction fails; the root client works afterwards (Measured, `probes/cr01-root-in-transaction.cjs`).
- Reachability: `Reachable`, but the scenario is `Technically Possible but Unsupported` (requirements SCN-007)
- Review consequence: no in-scope machinery is required. With one connection, the only alternatives are to join the transaction (the CR-001 leak) or to wait. The consequence is documented in README and CHANGELOG, and the consumer audit is in FU-001.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| AC-006 vs DEC-001/AC-008 (ARCH-001) | API/E2E would validate an outcome that the approved DEC-001 rules out | Corrected at SR-004 | Resolved |

## Review Decision

`Pass`

## Findings

None open. ARCH-001 and ARCH-002 stay resolved (ARCH-REV-002). SR-005 adds no new finding (see ARCH-REV-003).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer receives an informational notification.

## Residual Risks

These are non-blocking recommendations for the implementer and the Solution Designer:

- **Queued transactions and `maxWait` (PREM-001).** Under the gate, transactions run one at a time. A queued transaction fails with Prisma's P2028 "Unable to start a transaction in the given time" once its `maxWait` (default 2000 ms) expires.
  - README/DESIGN should say this, next to the "plain operations wait" text, and point to `runInTransaction(fn, { maxWait })`.
  - Recommended extra gate test: a queued transaction times out at `maxWait`. Afterwards a plain query and a new transaction succeed, which proves Prisma's discard path released the lock.
- **SCN-007 (PREM-002).** A direct `rootPrismaClient` call inside a transaction now makes that transaction time out. On 1.0.10, a read ran outside the transaction. The known consumer must audit for this pattern (FU-001).
- **Bounded Local Spines section.** The design's Bounded Local Spines section still names only the lifecycle state machine. The gate's lock lifecycle is fully specified elsewhere (Off-spine row, Interface row, Guidance release paths). That is sufficient, but listing it there would help readers.
- **Throughput.** Plain operations now wait while any transaction is open, and read-only transactions no longer run in parallel. This trade-off is documented, and it matches Prisma's own libsql adapter.
- **Earlier risks.** RSK-001 (consumer-built clients with ISO timestamps, FU-001) and RSK-002 (native addon on consumer platforms) remain as recorded.
- **Escalation.** It remains as the design states. If implementation finds a Prisma 7 path that issues a plain adapter query while that same request's transaction holds the gate, it returns a `Design Impact`. That would be a deadlock until timeout. The prototype's 96/96 tests and the libsql precedent indicate no such path.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (PREM-001 is Reachable, with no defect, because the required release-on-rollback covers it; PREM-002 is Reachable but Unsupported and documented)
- Notes: The SR-005 connection gate is the right layer: the narrowest one that sees every database access, including Prisma-internal and batch transactions. Its ownership is clean (inside the adapter policy, with no ALS or lifecycle knowledge), and it matches Prisma's own libsql rule. AC-013 is a valid testable form of the preserved REQ-007. The design is ready for the implementation revision at SR-005 (commit `779fcb0`).

# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed: `probes/README.md`, the probe files, `probes/feasibility-patch.diff`, `follow-ups.md`
- Relevant Solution Revision IDs: SR-002 (requirements), SR-003 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Architecture Design Complete from the Solution Designer (handoff.md, 2026-11-04)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/prisma-7-upgrade` at `2339722` (base `f2ffd5c`). Read: `src/lib/client/{lifecycle,datasource-target,initialization-error,sqlite-readiness}.ts`, `src/lib/{database,client,models}.ts`, `src/index.ts`, `src/tests/{client-lifecycle,datasource-readiness,public-initialization,logging-policy}.test.ts`, `scripts/*`, `prisma/schema.prisma`, `prisma.config.ts`, `package.json`, `tsup.config.ts`, `.github/workflows/{ci,release}.yml`, README. Adapter source `@prisma/adapter-better-sqlite3@7.10.1` `dist/index.js` (in `/tmp/prisma7-probe`): `timestampFormat` at `:412-419`, `createBetterSQLite3Client` at `:677-683`, the package `exports` with both `require` and `import`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: about 14 files within existing ownership, with no new subsystem (Medium). Public contract changes: the peer move, a new native-addon peer, a new error code and narrower provider support, a Node minimum, a persisted-representation invariant and packaging externals (High). Both values match the definitions.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Contradicted` (one row, BEH-004/AC-006; see ARCH-001)
- Approved requirements / intended behavior understood: Yes. Upgrade to 7.10.1 with the same SQLite public API (REQ-003..007, REQ-015), non-SQLite rejected (DEC-001), DateTime continuity (REQ-005), and the query string ignored for the opened file (REQ-004).
- Relevant existing behavior and evidence confirmed: Yes. There is one production construction site (`lifecycle.ts:67-71`). The three target kinds are at `datasource-target.ts:90-131`. `failureFrom` keeps the stage code (`lifecycle.ts:73-81`) and is used by both `initialize` (`:111-120`) and `bindLazyClient` (`:210-218`).
- Scope guardrail confirmed: Yes (UC-001..004; out of scope: FU-001..003, schema migration and the consumer upgrade; preserved boundary and review authority as stated).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes. The only blocking finding, ARCH-001, is a `Requirement Gap`.
- Remaining material ambiguity: AC-006 conflicts with DEC-001/AC-008 for `enableWAL: true` on a non-SQLite URL (ARCH-001).
- Statements about existing code the design relies on, opened at their cited lines:
  - `lifecycle.ts:67-71` factory: confirmed.
  - `datasource-target.ts:91-100`, `:102-111`, `:115-131`: confirmed.
  - `failureFrom` `:73-81`, `initialize` `:114-121`, `bindLazyClient` `:210-229`: confirmed.
  - "`clientUrl` only non-test reader is `lifecycle.ts:69`": confirmed by grep.
  - "`SAFE_ERROR_MESSAGES` is a `Record`, so the compiler enforces it": confirmed (`initialization-error.ts:28`).
  - "434 lines": the file has 437. Trivial; it does not affect any decision.
  - "Removal plan lists every test asserting non-SQLite success": incomplete. `logging-policy.test.ts:81-104` is missing (ARCH-002).
  - "BEH-004 unchanged": false for the non-SQLite + WAL input (ARCH-001).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Fail | Pass | Unclear | Needs Correction | ARCH-001: today, non-SQLite + `enableWAL` yields `WAL_UNSUPPORTED_PROVIDER` (`lifecycle.ts:283-288`, test `client-lifecycle.test.ts:162-178`). AC-006 keeps that outcome, but the design produces `UNSUPPORTED_DATASOURCE_PROVIDER`. |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Data | Pass | Pass | Pass | Confirmed | Adapter source `:412-419` confirms that `unixepoch-ms` binds `Date` as `getTime()` |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | The precedence over the conflict and WAL checks must be stated (part of ARCH-001) |
| BEH-008/009 | Contract | Pass | Pass | Pass | Confirmed | — |
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
| DS-002 | Lazy bind | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Package load | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Toolchain | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `client.ts` -> `PrismaClientLifecycle` | Pass | Pass | Pass | Pass | The target types are internal (not exported from `src/index.ts`), so removing `OtherDatasourceTarget` changes no public export |
| `sqlite-driver-adapter.ts` | Pass | Pass | Pass | Pass | Only the lifecycle imports it. Tests build their own fixture adapters. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| lifecycle -> sqlite-driver-adapter -> adapter package | Pass | Pass | Pass | Pass | — |
| datasource-target -> initialization-error, database | Pass | Pass | Pass | Pass | No adapter dependency |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `createSqliteDriverAdapter(target)` | Pass | Pass | Pass (the union narrows to file and memory) | Low | Pass |
| `resolveDatasourceTarget(explicitUrl?)` | Pass | Pass | Pass | Low | Pass |
| `PrismaInitializationErrorCode` + `UNSUPPORTED_DATASOURCE_PROVIDER` | Pass | Pass | N/A | Low | Pass |
| `PrismaClientFactory` seam | Pass | Pass | Pass | Low | Pass (signature unchanged) |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Adapter construction | Pass | Pass | Pass (it owns the path/memory mapping and the timestamp-format rule) | Pass | — |
| Rejection + code | Pass | Pass | N/A | Pass | Extends the existing classification and catalog |
| Generation in toolchain | Pass | Pass | N/A | Pass | `prepare` covers local, CI and release `npm ci` |

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

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Fail`. `logging-policy.test.ts` resolves a `postgresql://` target and is not listed (ARCH-002).

Each domain word keeps one meaning (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `sqlite-driver-adapter.ts` (Add) | Pass | Pass | N/A | Pass | — |
| `datasource-target.ts` | Pass | Pass | N/A | Pass | — |
| `lifecycle.ts` | Pass | Pass | N/A | Pass | Stays under 500 lines |
| `initialization-error.ts` | Pass | Pass | N/A | Pass | — |
| Toolchain/scripts/workflow files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/lib/client/sqlite-driver-adapter.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `OtherDatasourceTarget` + branch | Pass | Pass | Pass | Pass | — |
| `clientUrl` | Pass | Pass | Pass | Pass | Grep evidence given |
| `datasourceUrl` construction, schema `url`, `--skip-generate`, CI step + env | Pass | Pass | Pass | Pass | Removing the env is safe: `npm test` sets its own `DATABASE_URL` (`run-tests.js:21-25`) |
| Tests for removed behavior | Fail | Pass | Fail | Fail | `logging-policy.test.ts:81-104` is missing (ARCH-002) |

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

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Factory / adapter policy / ESM imports / README setup | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

None. Both findings rest on code paths that run in production today (`lifecycle.ts:111-120` before `:283`) and on existing tests. Neither depends on an assumed scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| AC-006 vs DEC-001/AC-008 (ARCH-001) | API/E2E would validate an outcome that the approved DEC-001 rules out | Solution Designer corrects AC-006 and states the precedence in the design | Open |

## Review Decision

`Fail`

## Findings

### ARCH-001: AC-006 contradicts DEC-001 for non-SQLite URLs; the design does not state the resulting outcome changes

- Type: `Requirement Gap` (an internal inconsistency in the approved requirements, mirrored by the design's "Unchanged")
- Severity: Medium (blocking)
- Protected IDs: AC-006, REQ-006, BEH-004; DEC-001, REQ-008, AC-008; AC-002 (alternate outcome)
- Scope status: `Requirement Gap`. It can be corrected within the already approved DEC-001; no new behavior is proposed.
- Changes approved behavior: No. DEC-001 already rejects non-SQLite at initialize and bind, so the correction only makes AC-006 consistent with it. No new user approval is expected unless the Solution Designer judges otherwise.
- Affected behavior: `initializePrisma({ datasourceUrl: <non-SQLite>, enableWAL: true })`, and `initializePrisma` with a non-SQLite URL while a SQLite client is bound.
- Evidence:
  - AC-006 says "`enableWAL: true` on file/memory/**non-SQLite** … Same codes and outcomes as today".
  - Today that input reaches the WAL gate in `performInitialization` and rejects with `WAL_UNSUPPORTED_PROVIDER` (`lifecycle.ts:283-288`). The test `client-lifecycle.test.ts:162-178` asserts this for `postgresql://…`.
  - The design moves rejection into `resolveDatasourceTarget`, which `initialize` calls first (`lifecycle.ts:111-120`). The same input therefore now yields `UNSUPPORTED_DATASOURCE_PROVIDER`.
  - The same precedence turns today's `DATASOURCE_CONFLICT` for "bound SQLite, then a non-SQLite URL" (`lifecycle.ts:147-150`, `:132-135`) into `UNSUPPORTED_DATASOURCE_PROVIDER`. The bound client stays usable because a resolution failure only sets `failed` from `idle`/`failed` (`:116-118`).
  - The design's map says BEH-004 is "Unchanged" and records neither change. README line 145 says WAL is unsupported "for non-SQLite", and that sentence will need the new wording.
- Required update:
  - (a) Requirements: correct AC-006 so that non-SQLite inputs follow DEC-001/AC-008. Either drop non-SQLite from its precondition, or state that it yields `UNSUPPORTED_DATASOURCE_PROVIDER`.
  - (b) Design: state in the BEH-004/BEH-007 rows and the DS-001 narrative that resolution precedes the conflict and WAL checks. A non-SQLite URL therefore yields `UNSUPPORTED_DATASOURCE_PROVIDER` in every lifecycle state, and a bound client is left untouched.
  - (c) Design: name the `client-lifecycle.test.ts:162-178` WAL case and the bound-then-non-SQLite case in the test plan, with their new expected codes.
- Why proportionate: these are text corrections that stop API/E2E from validating a contradicted outcome. No mechanism changes.
- Recommended recipient: Solution Designer

### ARCH-002: Test change inventory omits `logging-policy.test.ts`

- Type: `Design Impact`
- Severity: Low. It does not block on its own; fix it in the same revision.
- Protected IDs: REQ-010 (full suite passes), AC-010; Principle 11 (derived consumers)
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Evidence: `src/tests/logging-policy.test.ts:81-104` lazy-binds and initializes `postgresql://user:password@localhost:5432/logging` through a fake factory. After the change, resolution rejects it, so the test fails. The Removal plan and the File mapping list only `datasource-readiness`, `client-lifecycle` and `public-initialization`.
- Required update: add `logging-policy.test.ts` to the test inventory, rewritten on a SQLite file or memory target with the same logging-policy intent.
- Why proportionate: one line in the inventory.
- Recommended recipient: Solution Designer

## Classification

`Requirement Gap` (ARCH-001, blocking), with one `Design Impact` (ARCH-002, Low) to fix in the same revision.

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`)

## Residual Risks

These are non-blocking and need no finding:

- The `package.json` devDependencies shape is left conditional ("plus the two peers only if `npm ls` shows npm does not install root peers"). Either shape satisfies AC-001. Recommendation: decide one shape in the design, for example listing both peers in `devDependencies` so the lockfile is deterministic.
- README sentences that become false must be rewritten in the docs pass, not only extended:
  - "The selected value is always passed explicitly to the root `PrismaClient`"
  - "Query parameters are preserved"
  - "This behavior-only release does not change the Prisma schema"
  - the `PRISMA_DATASOURCE_PROVIDER=sqlite|postgresql|mysql` hint, now that only SQLite clients can be built
- AC-005 fixture: a test on a fresh temp file has no table pushed by the CLI. Creating `"Event"` by raw SQL (as the existing tests do for `User`), with a `DATETIME` column, matches what `db push` produces.
- RSK-001 and RSK-002, and the single connection per client, stay as recorded by the Solution Designer.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (no assumed premises)
- Notes: The architecture is sound. Ownership, the adapter-policy file, the target-type tightening, the persisted-data decision, `prepare`, and the packaging externals all pass. The fail comes only from the AC-006 inconsistency (ARCH-001) and one missing test-inventory entry (ARCH-002). A focused revision should pass.

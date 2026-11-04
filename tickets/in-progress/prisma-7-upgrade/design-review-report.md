# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/requirements-doc.md` (Approved, SR-004)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed: `probes/README.md`, the probe files, `probes/feasibility-patch.diff`, `follow-ups.md`
- Relevant Solution Revision IDs: SR-002 (requirements approval), SR-003 (initial design), SR-004 (AC-006/AC-008 correction and design revision)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Revised package from the Solution Designer at SR-004 (commit `614bac4`, handoff.md "Round 2 Changes")
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail: ARCH-001, ARCH-002)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/prisma-7-upgrade` at `614bac4` (base `f2ffd5c`). Round 2 re-read the SR-004 diff and re-checked the cited `lifecycle.ts:103-121`, `:132-150`, `:283-288` and `logging-policy.test.ts:81-104` against the code. Round 1 read: Read: `src/lib/client/{lifecycle,datasource-target,initialization-error,sqlite-readiness}.ts`, `src/lib/{database,client,models}.ts`, `src/index.ts`, `src/tests/{client-lifecycle,datasource-readiness,public-initialization,logging-policy}.test.ts`, `scripts/*`, `prisma/schema.prisma`, `prisma.config.ts`, `package.json`, `tsup.config.ts`, `.github/workflows/{ci,release}.yml`, README. Adapter source `@prisma/adapter-better-sqlite3@7.10.1` `dist/index.js` (in `/tmp/prisma7-probe`): `timestampFormat` at `:412-419`, `createBetterSQLite3Client` at `:677-683`, the package `exports` with both `require` and `import`.

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
- Remaining material ambiguity: None. AC-006 now covers SQLite targets only. AC-008 covers every non-SQLite form and lifecycle state, in line with DEC-001.
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

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. `logging-policy.test.ts` was added at SR-004 (ARCH-002 resolved).

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

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Factory / adapter policy / ESM imports / README setup | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

None. No finding or mechanism depends on an assumed scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| AC-006 vs DEC-001/AC-008 (ARCH-001) | API/E2E would validate an outcome that the approved DEC-001 rules out | Corrected at SR-004 | Resolved |

## Review Decision

`Pass`

## Findings

None open. ARCH-001 and ARCH-002 are resolved at SR-004 (see ARCH-REV-002 in `architecture-review-revision-record.md`).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer receives an informational notification.

## Residual Risks

These are non-blocking:

- The AC-008 test-plan header says "all expect `UNSUPPORTED_DATASOURCE_PROVIDER`". Case 5 (shutting-down) expects `CLIENT_NOT_READY`, as its own text and AC-008 say. Follow the case text.
- The devDependencies shape, the AC-005 raw-SQL fixture and the five README rewrites are now decided in the design.
- RSK-001 (consumer-built clients with ISO timestamps, FU-001), RSK-002 (native addon on consumer platforms) and the single connection per client stay as the Solution Designer recorded them.
- Escalation remains as the design states. If implementation finds Prisma 7 behavior that breaks REQ-005/REQ-006 beyond the probes, or a CJS-entry failure, it returns a `Design Impact`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (no assumed premises)
- Notes: The behavior basis is confirmed and every structural check passes. The design is ready for implementation at SR-004 (commit `614bac4`).

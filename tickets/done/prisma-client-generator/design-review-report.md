# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/requirements-doc.md` (SR-005 approved; unchanged in SR-006)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/design-spec.md` (SR-006)
- Supplemental Task Artifacts Reviewed: `probes/README.md` (P3 with the SR-006 correction), `probes/registered-program/tsconfig.prisma-client-generator.json`, `probes/registered-program/prisma-types.prototype.ts`, plus the round 1-3 probes
- Relevant Solution Revision IDs: SR-001..SR-006 (delta under review: SR-006)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: Solution Designer re-review request (SR-006) answering ARCH-REV-003 AR-003 and AR-004
- Prior Review Round Reviewed: 3 (`ARCH-REV-003`, Fail, Design Impact)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: source tree unchanged at `0a4e824` for the reviewed design (implementation edits in the worktree are not under review). Round 4 read `handoff.md` "SR-006 corrections" and SR-006 in `solution-revision-record.md`. It re-read in `design-spec.md`: the evidence row for re-measured P3, DS-005, the interface rows for `registerPrismaClient` and `PrismaClientModule`, Dependency Rules, the rows for `tsconfig.json`, `tsconfig.prisma-client-generator.json`, `package.json`, `scripts/check-typecheck-programs.js`, `src/index.ts`, `packed-artifact.js` and docs, Change Sequence step 6, and "DESIGN.md Design Case To Add (DC-002)". It also read the P3 correction in `probes/README.md` and the corrected probe config (own `exclude: ["node_modules", "dist"]`, `infer M extends GeneratedModule`). Overriding `exclude` in the child config is the documented and reproduced counterpart of the round 3 reproduction.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: SR-005 adds a second typecheck program, an example folder and a type-level parameter contract on the public `registerPrismaClient`. It stays inside the same subsystems. The public-contract part keeps the risk High.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. SR-005 adds the following. Registration and the type declaration cannot silently disagree: calling `registerPrismaClient` without the declaration is a compile error naming the declaration, and passing a different object is a compile error (REQ-003, AC-013, DEC-008). AC-006's fallback is narrowed to apps that neither declare nor register. The README gets a copy-paste `db.ts`, import-first and `Prisma.ModelName` guidance, and an example that `npm run typecheck` compiles (REQ-009, AC-011).
- Approval: the SR-005 delta was approved by the user on 2026-11-05 (quote recorded in `requirements-doc.md` and SR-005). This is a user change to intended behavior, so it is not reviewer-authored. Accepted.
- Relevant existing behavior and evidence confirmed: Yes (rounds 1-2; source unchanged).
- Scope guardrail confirmed: Yes; SR-005 stays within UC-001 and UC-003.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no open findings; round 3's AR-003 cited REQ-003, REQ-009, AC-011, AC-013).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on: `tsconfig.json` has no `exclude` today and `include: ["src/**/*", "examples/**/*"]`. `.gitignore` ignores `/src/generated/prisma`. `prisma/schema.prisma` has only the `prisma-client-js` generator. `scripts/run-tests.js` runs `prisma generate` before vitest, so the second generator's output exists for tests. There is no vitest config, so the default per-file isolation keeps the lifecycle singleton separate between registered and default test files. All match.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass (`RegisteredClientModule` parameter realizes REQ-003/AC-013) | Pass | Pass (round 4: the registered program owns its `exclude`, and the program-content guard keeps AC-011/AC-013 non-vacuous) | Confirmed | — |
| BEH-003 | Contract | Pass (T1..T15 stay in the default program; prisma-client-js apps never call `registerPrismaClient`) | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass (runtime shape check kept through `registerClientModule(value: unknown)`) | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/README.md` P3 | Pass | Pass | Pass | Pass (SR-006 correction: the first run is marked a false pass; re-measured with the registered config's own `exclude`, files listed, two negative controls fail as required) | Pass (Evidence) | — |
| `probes/registered-program/*` | Pass | Pass | Pass | Pass (corrected config; `infer M extends GeneratedModule`) | Pass (Evidence) | — |
| `probes/type-equality.typecheck.ts`, other probes | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; SR-005 adds the "forgotten declaration" edge with a measured alternative (library-side warning impossible) | — |
| Root-cause classification is explicit and evidence-backed | Pass | Unchanged | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | — | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | ARCH-REV-002 wording cleanups applied (health response, Change Sequence step 3, DS-005) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 register | Primary | Pass | Pass | Pass (facade passes the value; the lifecycle runs the shape check) | Pass | Pass | Pass | Pass |
| DS-002 bind | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 `Models` | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 source | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 type registry (+ `RegisteredClientModule`) | Primary (compile time) | Pass | Pass | N/A | Pass | Pass | Pass | Pass. `MissingTypeDeclaration` references no `@prisma/client` type, so it stays real when the default types are `any`, as measured. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `PrismaClientLifecycle` | Pass | Pass | Pass | Pass | `registerClientModule(value: unknown)` keeps the runtime check at the owner; the compile-time type stays on the public facade |
| `PrismaClientSource` | Pass | Pass | Pass | Pass | — |
| `client.ts` facade | Pass | — | — | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `client-source.ts`, `lifecycle.ts`, `models.ts`, `prisma-types.ts` | Pass | Pass | Pass | Pass | — |
| `client.ts` | Pass | Pass | Pass | Pass | Depends on `lifecycle.ts` and `prisma-types.ts` (`RegisteredClientModule`) only (AR-004 resolved) |
| Typecheck programs | Pass | Pass | Pass | Pass | The default program excludes the registered folders, so the augmentation cannot leak into T1..T15 |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `registerPrismaClient(module: RegisteredClientModule)` | Pass | Pass | Pass (compile time: the declared module type; runtime: `PrismaClientModule` shape) | Low | Pass |
| `PrismaClientModule` (internal, not exported) | Pass | Pass (runtime shape for `assertPrismaClientModule` and the source) | Pass | Low | Pass (AR-004 resolved) |
| `PrismaClientRegistry`, error codes, `ContainsStringFilter` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Registered type checking | Pass | Pass (`tsc` programs; no new tool) | Pass (second program needed because an augmentation is program-wide) | Pass | — |
| Example | Pass (`examples/` already in typecheck) | Pass | Pass | Pass | — |
| Consumer type checks | Pass (`consumer-types.js` step) | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/lib/`, `src/lib/client/` | Pass | Pass | Pass | Pass | — |
| Typecheck config (`tsconfig*.json`, `package.json` script, `scripts/check-typecheck-programs.js`) | Pass | Pass | Pass (registered program owns its file set; program-content guard) | Pass | AR-003 resolved |
| `examples/prisma-client-generator/`, `generated/prisma-client/`, `src/tests/prisma-client-generator/` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Registry-derived types incl. `RegisteredClientModule`, `MissingTypeDeclaration` | Pass | Pass (`prisma-types.ts`) | Pass | Pass | — |
| Generated test/example client (`generated/prisma-client/`) | Pass | Pass (one output shared by tests and example) | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `PrismaClientRegistry { client }` | Pass | Pass | Pass | N/A | Pass | — |
| `PrismaClientModule` (internal runtime shape) vs `RegisteredClientModule` (public compile-time parameter) | Pass | Pass | Pass (one public parameter type) | N/A | Pass | AR-004 resolved |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` (`.d.ts` smoke checks, consumer-types step, README, TESTING.md).

Each domain word keeps one meaning, and each concept one name (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `prisma-types.ts` | Pass | Pass | Pass | Pass | — |
| `lifecycle.ts`, `client.ts`, `client-source.ts`, `models.ts`, `filters.ts` | Pass | Pass | N/A | Pass | — |
| `tsconfig.json` | Pass | Pass | N/A | Pass | — |
| `tsconfig.prisma-client-generator.json` | Pass | Pass (own `exclude: ["node_modules", "dist"]`, reason stated) | N/A | Pass | AR-003 resolved |
| `package.json`, `.gitignore`, example, schema, tests, `consumer-types.js`, docs | Pass | Pass | N/A | Pass | `.gitignore` pattern `generated/` (no leading slash) also matches nested `generated` folders; `/generated/` is narrower (optional) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `examples/prisma-client-generator/` | Pass | Pass | Low | Pass | — |
| `src/tests/prisma-client-generator/` | Pass | Pass | Low | Pass | — |
| `generated/prisma-client/` (repo root, git-ignored, not in `files`) | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Rounds 1-2 items | Pass | Pass | Pass | Pass | — |
| `PrismaClientModule` public export | Pass (removed from `src/index.ts` and `.d.ts` expectations) | Pass | Pass | Pass | AR-004 resolved |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `default-package` source; unregistered type branches | No | Pass | Pass | Unchanged |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Database contents | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1-8 | Pass | Pass | Pass | Pass |
| Typecheck split (steps 5-6) | Pass (`typecheck` = default program -> registered program -> `scripts/check-typecheck-programs.js`) | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| App `db.ts` | Yes | Pass | Pass (forgotten declaration -> compile error; `IsAny` approach rejected with reason) | Pass | — |
| Second typecheck config | Yes | Pass (corrected probe config; DC-002 records the lesson) | Pass (DC-002) | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — Bundled prisma-client-js deployment loses the default client (RSK-002)

Unchanged from round 1: `Not Reachable` as a supported scenario; README note suffices.

### `MP-002` — An app declares the registry with a wrong type (e.g. `client: PrismaClient`, the instance type)

- Related approved requirement or established contract: REQ-003 ("cannot silently disagree")
- Relevant behavior ID(s): BEH-002
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: none. The README gives one copy-paste block, `client: typeof generated`, and a wrong declaration is a deviation from the documented setup.
- Forward production path / consequence, if it occurred: the derived types fall back to `@prisma/client` (loose), and `RegisteredClientModule` becomes the declared type. `registerPrismaClient(generated)` then fails to compile, so the disagreement is still loud, not silent; only the message does not name the fix.
- Reachability: `Not Reachable` as a supported scenario
- Review consequence: no finding. Optional hardening: constrain `RegisteredClientModule`'s `infer M` with the same `GeneratedModule` shape so a wrong declaration also yields `MissingTypeDeclaration`.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. AR-003 and AR-004 are resolved in the current canonical artifacts, MP-002's optional hardening is adopted, and the behavior basis (SR-005 requirements) is confirmed. Round 3 verdicts marked `Fail` for AR-003/AR-004 are superseded by this round: Supplemental Artifact Coherence (P3 corrected and re-measured with two negative controls), Dependency Direction (`client.ts` -> `lifecycle.ts`, `prisma-types.ts` only), Interface Boundary (`PrismaClientModule` internal), Shared Structure Tightness (one public parameter type), Subsystem Allocation, File Responsibility (registered config owns its `exclude`), Removal (no unused public export), Change Safety (`typecheck` = default program -> registered program -> program-content check) and Example Adequacy (corrected probe config). All now `Pass`. Every other round 3 verdict stands.

## Findings

None open. AR-003 and AR-004 are resolved; see `ARCH-REV-004` in the revision record.

Implementation notes (non-blocking):

- `scripts/check-typecheck-programs.js` should also fail when either registered folder has no files. "Every file is in the registered program" is otherwise vacuously true for an empty or renamed folder, the same failure shape as DC-002.
- DC-002 is to be appended to `DESIGN.md` verbatim by implementation, as specified in the design spec.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`); informational notification to the Solution Designer.

## Residual Risks

- RSK-001, RSK-002/MP-001, RSK-003 as accepted in rounds 1-2. For RSK-003, the hand-written `module: RegisteredClientModule` annotation keeps the alias in the emitted `.d.ts`. The packaged AC-013 negative consumer (declaration missing -> `tsc` fails with the declaration text) is the guard against inlining it as `MissingTypeDeclaration` at library build time.
- MP-002 (wrong declaration type) stays loud; optional hardening noted.
- The SR-004 parts not touched by SR-005 remain as passed in ARCH-REV-002. The implementation engineer is holding only the SR-005-affected parts.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 Not Reachable. MP-002 Not Reachable as a supported scenario; its optional hardening is adopted and measured.)
- Notes: ARCH-REV-004 covers SR-006 on top of SR-001..SR-005; classification Medium / High. The full package (SR-004 base + SR-005 delta + SR-006 corrections) is ready for implementation.

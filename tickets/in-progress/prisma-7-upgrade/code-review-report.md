# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-004)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections only, through the design spec)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (navigation only)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, Ready; the working-tree copy, which adds the AC-008 case-5 header note)
- Supplemental Task Artifacts Reviewed As Context: `probes/README.md` (evidence only)
- Relevant Solution Revision IDs: `SR-004`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation engineer handoff of IR-001 (commit `a092a60`, range `614bac4..a092a60`, base `f2ffd5c`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Failure Evidence Paths: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes` (High risk)
- Classification evidence or correction required: confirmed. Four runtime files (one new), manifest/toolchain, tests and docs within existing ownership (`Medium`); public contract, peer, native-addon, persisted-data and packaging changes (`High`). CR-001 does not change the classification.

## Review Scope

- Changed implementation and behavior reviewed: the whole range `614bac4..a092a60`. Runtime construction through the driver adapter, SQLite-only target resolution, the new error code, manifest/lockfile, schema, tsup externals, test runner, package smoke and interop harness, CI, tests and docs.
- Files / areas reviewed: `src/lib/client/{sqlite-driver-adapter,datasource-target,lifecycle,initialization-error}.ts`, `src/lib/database.ts` (provider inference, unchanged), `prisma/schema.prisma`, `prisma.config.ts` (unchanged), `package.json`, `tsup.config.ts`, `scripts/{run-tests,run-package-smoke,run-esm-cjs-interop}.js`, `.github/workflows/{ci,release}.yml`, the five changed/new test suites, `README.md`, `DESIGN.md`, `CHANGELOG.md`, and the installed `@prisma/adapter-better-sqlite3@7.10.1` `dist/index.js` (transaction and connection handling).
- Explicit exclusions: `package-lock.json` content (verified only through IMP-01 `npm ls`); the uncommitted round-2 edits of the architecture reviewer and Solution Designer in the ticket folder (their owners' documents).
- Checks run by this review: only the CR-01 probe (no recorded check covered concurrent transaction isolation). The recorded IMP-01..IMP-09 checks were not rerun: the code they exercise is unchanged since they ran.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Prisma 7.10.1 for SQLite with the same public API and preserved behavior (REQ-003, REQ-006, REQ-007), non-SQLite rejection (DEC-001), DateTime continuity (REQ-005).
- Design-spec behavior map verified against the implementation: Yes, row by row (table below).
- Design review report and round confirmed: ARCH-REV-002 Pass at SR-004.
- Behavior-basis status: `Contradicted` for BEH-009 (REQ-007); `Confirmed` for all others.
- Changed or newly discovered behavior: none new. BEH-009 is an existing approved behavior that the change breaks (CR-001).
- Remaining material ambiguity: none in the requirements. REQ-007 says transaction behavior is unchanged; the design treated the adapter's single connection as a throughput risk only (design-spec "Risks"), so it did not address isolation.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `package.json` peers/dev `^7.10.1`; IMP-01 `npm ls` 7.10.1 | — |
| BEH-002 | Confirmed | `lifecycle.ts:68-72` factory `{ adapter: createSqliteDriverAdapter(target), log }`; both paths share it | — |
| BEH-003 | Confirmed | `sqlite-driver-adapter.ts:18` memory -> `:memory:`; memory + WAL still `WAL_UNSUPPORTED_PROVIDER` (`lifecycle.ts:284`) | — |
| BEH-004 | Confirmed | readiness unchanged; identity only for `sqlite-file` (`lifecycle.ts:297`) | — |
| BEH-005 | Confirmed | adapter opens `expectedPath`; `bindingKey` keeps `file:<path><query>`; Windows key value identical (`normalizeBindingPath` lower-cases as the former inline code did) | — |
| BEH-006 | Confirmed | `timestampFormat: 'unixepoch-ms'`; `datetime-continuity.test.ts`; IMP-07a mutation | — |
| BEH-007 | Confirmed | `datasource-target.ts:100-105` rejects before any client exists; carried by `failureFrom` on both paths; `initialize` leaves a bound client untouched (`lifecycle.ts:116-118`) | — |
| BEH-008 | Confirmed | logging policy unchanged; tests moved to SQLite memory URLs | — |
| BEH-009 | Contradicted | `runInTransaction` / `@Transactional` -> `rootPrismaClient.$transaction` -> adapter `startTransaction` takes a mutex and runs `BEGIN` on the adapter's single better-sqlite3 connection. Non-transactional queries (`queryRaw`/`executeRaw` on `PrismaBetterSqlite3Adapter`) do not take that mutex and run on the same connection. | CR-01 probe: an independent request without a transaction reads another request's uncommitted row, and its own write is rolled back with that request's transaction. On 1.0.10/Prisma 5.22 the same request sees no uncommitted row and its write persists. |
| BEH-010 | Confirmed | tsup `external` adds the adapter; smoke asserts external import/require, no bundling markers, `process.dlopen` count 0 on import (IMP-04/05/09) | — |
| BEH-011/012 | Confirmed | `prepare: prisma generate`; schema without `url`; `db push` without `--skip-generate`; CI step and env removed (`npm test` sets its own `DATABASE_URL`) | — |
| BEH-013 | Confirmed | `engines.node`; README TS >= 5.4 | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-002..009, REQ-003..007 | System | Consumer server app (e.g. `autobyteus-server-ts`) | Start and serve on Prisma 7 with an existing SQLite DB | `initializePrisma`, repositories, `runInTransaction` / `@Transactional` | Normal | init -> ready -> repository and transaction operations | Same results as on Prisma 5 | requirements SCN-001 | Supported Normal Scenario | Use |
| SCN-001-C | BEH-009, REQ-007 | System / Contract | Consumer server handling two requests at once | One request runs a unit of work in a transaction; another request does an ordinary repository write | `runInTransaction` / `@Transactional` in request A; repository or `prisma` proxy call outside any transaction in request B | Normal | A: `runInTransaction` -> ALS tx client -> adapter `BEGIN` (mutex held) -> statements with an `await` between them. B: `prisma` proxy -> `getPrismaClient()` (no ALS tx) -> root client -> adapter `executeRaw` on the same connection | B sees only committed data; B's write is independent of A's outcome | The library's governing contract: ALS holds "the transaction context ... for the request" (README:93; DESIGN.md:9-19), which exists so concurrent async flows share one root client with isolated transaction contexts. A server serving concurrent requests is the ordinary operating condition for SCN-001. | Supported Normal Scenario | Use |
| SCN-002..005 | as requirements | — | — | — | — | — | — | — | requirements | as requirements | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | A non-transactional query runs inside another flow's open transaction (dirty read; its write is rolled back with that transaction) | SCN-001-C, REQ-007, BEH-009 | Two concurrent consumer requests, one inside `runInTransaction`/`@Transactional` with any `await` between statements | See SCN-001-C. Consequence: B reads uncommitted data, and B's write, which B saw succeed, is silently lost when A rolls back. On Prisma 5 the engine pool gave B its own connection. | `evidence/CR-01-tx-isolation-probe.log` (base vs branch); adapter `dist/index.js:620-651` (mutex only in `startTransaction`), `:667-681` (one Database per `connect()`) | Promote -> CR-001 | This ticket (a regression this change causes; REQ-007 is in scope) | The design classified the single connection as throughput only. A Solution Designer decision is needed (see CR-001). |
| C-02 | Throughput change from one connection | design-spec Risks | — | — | design-spec Risks | Reject (as a separate finding) | — | Already an accepted, documented design risk; the isolation part is C-01. |
| C-03 | `WAL_UNSUPPORTED_PROVIDER` now only covers memory targets, so its name says "provider" | REQ-006 | — | — | `lifecycle.ts:284` | Reject | — | An existing public code whose meaning REQ-006 preserves; renaming it would break the contract. The message ("requires a physical SQLite datasource") stays accurate. |
| C-04 | `file:x?mode=memory&cache=shared` now opens a private `:memory:` per client | BEH-003 | — | — | `sqlite-driver-adapter.ts:18` | Reject | — | There is one root client per process. No supported scenario shares a memory DB across clients. |
| C-05 | README `prisma.config.ts` snippet reads `process.env.DATABASE_URL` without loading `.env` | REQ-015, AC-012 | — | — | README setup section | Reject | — | Consistent with the documented stance that applications own environment provisioning. AC-012 assigns the fresh-consumer check to API/E2E. |
| C-06 | Smoke parses `npm pack --json` from the first line that starts with `[` | REQ-010 | — | — | `run-package-smoke.js:60` | Reject | — | Needed because npm runs `prepare` during pack. If the marker is missing, it fails loudly (JSON parse error), not silently. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The single factory seam took the adapter; `failureFrom` carries the new code on both paths | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None are behavior-defining | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..004 match the code | — |
| Ownership boundary preservation and clarity | Pass | Only `lifecycle.ts` imports `sqlite-driver-adapter.ts`; no other `src/lib` module imports the adapter package | — |
| Off-spine concern clarity | Pass | Adapter policy in its own file; it knows no lifecycle state | — |
| Existing capability/subsystem reuse check | Pass | Extends `src/lib/client/`, `datasource-target.ts`, the error catalog and npm scripts | — |
| Reusable owned structures check | Pass | The test seed helper is local to the test file, as the design specifies | — |
| Shared-structure/data-model tightness check | Pass | `{ kind, bindingKey, expectedPath }` / `{ kind, bindingKey }`; `other` and `clientUrl` removed | — |
| Repeated coordination ownership check | Pass | One provider check in resolution | — |
| Empty indirection check | Pass | `createSqliteDriverAdapter` owns path, memory and timestamp policy | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | `lifecycle -> sqlite-driver-adapter -> @prisma/adapter-better-sqlite3`; `datasource-target` has no adapter dependency | — |
| Authoritative Boundary Rule check | Pass | Callers still use `client.ts` only | — |
| File placement check | Pass | — | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API boundary clarity | Pass | `createSqliteDriverAdapter(target)` with a discriminated `kind` | — |
| Naming quality and one vocabulary | Pass | `normalizeBindingPath` now names its only use; "driver adapter" is Prisma's own term | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | `grep -rn "clientUrl\|'other'" src` is empty; `DatabaseProvider` import removed | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | AC-004/005/008 tests assert outcomes, not internals; mutation checks IMP-07 show that the guards bite. No test covers concurrent transaction isolation (see CR-001). | Add a test with the CR-001 resolution |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests retained | Pass | Non-SQLite success tests removed; postgres-based conflict/rebind tests moved to SQLite memory URLs with the same intent | — |
| API/E2E readiness for the next workflow stage | Fail | CR-001 breaks a preserved behavior (REQ-007) in the main consumer scenario | Resolve CR-001 first |

Implementer decisions 1-5 (handoff "Key Files Or Areas"):

1. The provider check `inferDatabaseProviderFromUrl(url) !== 'sqlite'` is accepted. `database.ts:33-40` lower-cases the URL and returns `sqlite` for any `file:` prefix or `.db` suffix, so `/^file:/i ||` was redundant and the accepted set is unchanged.
2. The rename to `normalizeBindingPath` is accepted. The win32 key equals the former `clientPath.toLowerCase()`, and the unchanged Windows test still pins it.
3. The smoke and interop changes are accepted. The postgres probes would now reject. Keeping the `repository-prisma-synthetic` marker preserves the no-URL-leak assertions. The added dlopen counter, no-`?`-file check and packaged rejection assertions trace to AC-009, AC-004 and AC-012.
4. The extra AC-008 coverage (the `initializing` state, public explicit and lazy) is accepted, because AC-008 names those states.
5. The README release edit is accepted. It stays within the design's "keep that edit minimal" guidance and prevents re-creating the published `v1.0.10` tag.

## Source File Size And Structure Audit

| Source File | Non-Empty Lines Before (base) | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/lib/client/lifecycle.ts` | 404 | 405 | Pass | Pass (+1) | Pass | Pass | — | — |
| `src/lib/client/datasource-target.ts` | 114 | 93 | Pass | Pass | Pass | Pass | — | — |
| `src/lib/client/initialization-error.ts` | 73 | 76 | Pass | Pass | Pass | Pass | — | — |
| `src/lib/client/sqlite-driver-adapter.ts` | 0 (new) | 19 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No Prisma 5 path, no URL-parameter translation, no ISO fallback |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration` through `unixepoch-ms` |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: The docs are updated and match the reviewed behavior, apart from CR-001. Whatever CR-001 resolves to (restored isolation, or an approved behavior change) must be reflected in README "Transactions" / DESIGN.md §A-E and the CHANGELOG.
- Files or areas likely affected: `README.md`, `DESIGN.md`, `CHANGELOG.md`.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| design-spec "Risks": one better-sqlite3 connection per client is a throughput concern "outside the library's contract" | Reclassified | It also changes transaction isolation for concurrent requests (CR-01 probe), and REQ-007 is inside the contract. |

### `MP-CR-001` — One adapter connection shares open transactions with concurrent non-transactional operations

- Origin: `Reclassified from` the design-spec "Risks" single-connection premise
- Related approved requirement or established contract: REQ-007 (transaction behavior unchanged); the ALS per-request transaction context (README:93, DESIGN.md:9-19)
- Relevant behavior ID(s): BEH-009
- Coherent product goal or governing event: a consumer server serves concurrent requests, one of them inside a library transaction
- Scenario validity: `Supported Normal Scenario`
- Initiating basis kind: `System` / `Contract`
- Independent trigger: two concurrent requests to a consumer server (SCN-001)
- Support evidence: the library's ALS transaction design exists to isolate concurrent async flows that share one root client. Interactive transactions with an `await` between statements are the documented `runInTransaction`/`@Transactional` usage.
- Forward path: A `runInTransaction` -> `rootPrismaClient.$transaction` -> adapter `startTransaction` (mutex, `BEGIN` on the shared connection) -> await. B `prisma.user.create` outside ALS -> root client -> adapter `executeRaw` on the same connection (no mutex) -> joins A's open transaction.
- Lifecycle preconditions and material consequence: `ready` (or `lazy-bound`) root client. B reads A's uncommitted rows. B's write is committed or rolled back with A, so when A fails, data B already reported as saved is lost silently.
- Reachability: `Reachable` (reproduced through the built package; Prisma 5 baseline differs)
- Review consequence: CR-001, `Design Impact`.

## Review Scorecard (Mandatory)

- Overall score: `9.0/10` (simple average; the decision follows CR-001, not the average)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001..004 are implemented as designed; one construction site | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Adapter policy owned in one file; resolution owns the provider rule; no bypass | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | No new public option; one new code with a safe message | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.5 | — | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | Target types tightened | — | — |
| `6` | `Naming Quality and Local Readability` | 9.4 | Clear names and comments | `WAL_UNSUPPORTED_PROVIDER` name is inherited (C-03, not a deduction) | — |
| `7` | `API/E2E Readiness` | 7.0 | Strong harness and evidence | A preserved behavior in the main scenario is broken (CR-001) | Resolve CR-001, with a concurrency test |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 6.0 | Construction, identity, WAL, DateTime and rejection are correct and well tested | Concurrent requests lose isolation (dirty reads, silently lost writes) | Restore isolation, or obtain approval for the change and document it |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean cut | — | — |
| `10` | `Cleanup Completeness` | 9.5 | `other`/`clientUrl`/`--skip-generate`/CI env removed | — | — |

## Findings

### CR-001 — Concurrent non-transactional operations join an open transaction on the shared adapter connection (blocking)

- Protects: REQ-007 / BEH-009 (transaction behavior unchanged), SCN-001; candidate C-01, premise MP-CR-001.
- Evidence: `evidence/CR-01-tx-isolation-probe.log` and `evidence/CR-01-tx-isolation-probe.cjs`. Same script, same scenario:
  - 1.0.10 / Prisma 5.22: request B sees `[]` uncommitted rows; after A rolls back, B's row persists.
  - `a092a60` / Prisma 7.10.1: request B sees A's uncommitted `in-tx` row; after A rolls back, B's row is gone (`rowsAfter: []`).
- Cause: `PrismaBetterSqlite3AdapterFactory.connect()` opens one better-sqlite3 `Database` per client (`node_modules/@prisma/adapter-better-sqlite3/dist/index.js:667-681`). `startTransaction` takes a mutex and runs `BEGIN` on that connection (`:633-651`). Plain `queryRaw`/`executeRaw` do not take the mutex (`:523-545`), so any non-transactional statement issued while a transaction is open runs inside it. The library builds exactly this adapter for its one root client (`sqlite-driver-adapter.ts`), and the design classified the single connection as a throughput risk only (design-spec "Risks").
- Consequence: In a consumer server, any request outside a transaction that runs while another request's `runInTransaction`/`@Transactional` awaits between statements reads uncommitted data. Its writes then commit or roll back with the other request's transaction. A rollback silently discards data the first request already reported as saved.
- Why `Design Impact`: the reviewed design missed this, and the right response is a design decision (and possibly a requirements decision), not a local code fix. Options for the Solution Designer, not prescriptions:
  - (a) A library-owned wrapper around the driver adapter that makes non-transactional queries wait for an open transaction to finish. This restores isolation and is closest to Prisma 5's lock-wait behavior. Consider a root-client call made *inside* a transaction callback: with this option it would wait for the transaction's own timeout, where Prisma 5 gave an immediate read or a busy-timeout write.
  - (b) Accept the change, which changes REQ-007's preserved behavior and needs renewed approval. Document it in README/DESIGN/CHANGELOG and probably flag it in FU-001 for `autobyteus-server-ts`.
  - (c) Another construction, such as a separate connection for transactions, if Prisma 7 allows it.
- Required action: the Solution Designer decides, updates requirements and design as needed, and adds an executable guard for the chosen behavior (the CR-01 probe shape is a ready test).

## Follow-ups

- Follow-ups this review added: None

## Classification

- `Design Impact` (CR-001). If the Solution Designer chooses to accept the behavior change instead of restoring isolation, that choice is a `Requirement Gap` on REQ-007 and needs renewed approval.

## Recommended Recipient

- Solution Designer (owner of `Design Impact`), at the address `get_handoff_rules` returns.

## Residual Risks

- The recorded checks ran on Node 22 only. CI on Node 20, a real Windows host and the AC-012 fresh-consumer install are still open for API/E2E.
- The handoff notes that `npm pack`/`npm publish` now run `prepare`; any tool that parses `npm pack --json` must expect leading output.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (C-01 promoted; C-02..C-06 rejected)
- Material-Premise Gate: `Pass` (MP-CR-001 reachable and supported)
- Score Summary: 9.0/10 overall; `Runtime Correctness And Behavioral Fidelity` 6.0 and `API/E2E Readiness` 7.0 are below 9.2; all other categories are 9.4 or higher.
- Failure Origin: N/A (implementation review)
- Recommended Recipient: Solution Designer (`Design Impact`, CR-001)
- Notes: Apart from CR-001, the implementation is clean and matches the design. Implementer decisions 1-5 are accepted. Once CR-001 is resolved, the next round can be a targeted delta review unless the fix reshapes construction across files.

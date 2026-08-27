# API/E2E Coverage Investigation — ESM/CommonJS Prisma Peer Interop

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/interop-probe-results.md`
- Design Review Report: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/code-review-revision-record.md`
- Current Investigation Round: `1`
- Trigger: Code review `CRR-001` passed for implementation `IR-001`.
- Prior Investigation Reviewed: `None`; this is the mandatory initial coverage investigation.
- Latest Authoritative Investigation: This file, after execution results are appended.

## Current Requirement And Design Basis

The reviewed bug fix changes only the external CommonJS `@prisma/client` peer import boundary. The ESM
package entry must load under Node 22 when the peer's runtime properties are not statically detectable
as CommonJS named exports (`REQ-001`, `AC-001`), while the CJS entry and public exports remain usable
(`REQ-003`, `AC-002`, `AC-003`). Runtime `PrismaClient` and `Prisma` values must be obtained from the
peer's default namespace; type-only peer references must remain compile-time-only (`REQ-002`, `AC-005`).
The existing lifecycle, AsyncLocalStorage transaction routing, repository behavior, Prisma-backed
operations, declarations, and package metadata must remain unchanged (`REQ-004`–`REQ-006`, `AC-004`,
`AC-006`, `AC-007`). No compatibility fallback, peer-range change, schema/migration change, or persisted
data transition is approved.

The primary validation spines are `DS-001` (ESM consumer -> package ESM artifact -> synthetic CJS peer
-> existing lifecycle/model owners -> package initialization), `DS-002` (CJS consumer -> package CJS
artifact -> existing public API and Prisma operation), `DS-004` (source -> emitted artifacts -> package
consumer), and the release-preparation portion of `DS-005`. The reviewed implementation handoff and
`CRR-001` report state that the local macOS ARM64 checks passed but exact downstream Linux ARM64/Vitest
consumer execution remains unverified.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BE-001` / ESM peer loading | Changed | `requirements.md`, `design-spec.md`, `interop-probe-results.md`; unsafe named imports replaced by default namespace/destructure. | Must run emitted ESM audit and the dynamic CommonJS-peer executable probe through the built artifact. |
| `BE-002` / type-only peer references | Changed | `design-spec.md`, implementation handoff, source import inventory. | Typecheck, declaration smoke, and source/emitted import audit must confirm no accidental runtime peer edge. |
| `BE-003` / CJS entry and public exports | Preserved | Requirements `REQ-003`; existing `run-package-smoke.js` and CJS path. | Run packed/install CJS consumer and full package smoke. |
| `BE-004` / lifecycle, transaction, repository, persistence behavior | Preserved | Requirements `REQ-004`; implementation handoff legacy and persisted-data checks are clean. | Run full Vitest suite plus packed Prisma-backed CJS/ESM operation smoke. |
| `BE-005` / patch-release preparation | Changed | Requirements `REQ-006`; `package.json`, `CHANGELOG.md`, README/DESIGN updates. | Verify metadata and packed files; do not claim npm publication without registry evidence. |
| No compatibility or persisted-data path | Removed / Preserved | Reviewed design and implementation handoff explicitly reject fallback and migration work. | Audit for no dual path/fallback; record persisted data as `Not Affected`. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? (`Yes`/`No`) | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | No domain or repository logic changed; only imports in lifecycle/model owners. | Full Vitest integration and package smoke. | A consumer-provided peer can still differ from the generated local peer. | None beyond package consumer probe. |
| API / transport / contract | Yes | Published `exports.import`/`exports.require` package boundary and public export shape. | Packed CJS/ESM consumer scripts and declaration smoke. | Exact external Linux/Vitest resolver behavior is not available locally. | CLI consumer probe; downstream Linux/Vitest if available. |
| Frontend component / state | No | No frontend exists or changed. | N/A. | None in scope. | None. |
| Browser integration / user journey | No | Library package has no browser/UI journey. | N/A. | None in scope. | None. |
| Authentication / session / permissions | No | No identity or auth boundary. | N/A. | None in scope. | None. |
| Desktop renderer / web-equivalent UI | No | No desktop renderer. | N/A. | None in scope. | None. |
| Desktop shell / Electron-specific integration | No | No desktop shell. | N/A. | None in scope. | None. |
| Process / lifecycle | Yes | Root Prisma client construction/readiness and shutdown are reached after package import. | Full lifecycle tests and packed CJS/ESM SQLite smoke. | Linux ARM64 native Prisma engine/runtime is not locally exercised. | Lifecycle/CLI consumer probe; downstream Linux runtime. |
| Persisted-data transition | No | Schema, migrations, query semantics, and stored representation are unchanged. | Existing schema and integration tests; implementation persisted-data check. | No transition-specific risk should exist; consumer database platform remains external. | None; document `Not Affected`. |
| Worker / queue / distributed coordination | No | No workers or distributed components. | N/A. | None in scope. | None. |
| External integration | Yes | External CommonJS `@prisma/client` peer supplied by consumers. | Synthetic dynamic CJS peer probe plus generated local peer package smoke. | Exact reported Linux ARM64/Vitest dependency graph is unavailable. | Local CLI probes are sufficient for boundary; Linux/Vitest remains deferred downstream. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop`
- Project type and runtime stack: TypeScript Node package; tsup emits externalized CJS/ESM; Vitest tests; Prisma 5.22 SQLite schema; Node 22 local runtime.
- Conflicting, missing, or unclear project instructions: No conflicts. The repository has no browser, service, Docker, or API-server setup. Exact Linux ARM64/Vitest consumer workspace is unavailable locally, as recorded upstream.
- Required environment variables or secrets available: `N/A` for the selected local checks. `scripts/run-tests.js` supplies an isolated worktree `DATABASE_URL`; no credentials are needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `AGENTS.md` | Repository instructions | README is the primary usage/release guide; DESIGN covers architecture/rationale. |
| `README.md` | User/API and release guide | Package has import/require entrypoints; package imports do not load `.env`; tag-based release; no migration for this fix. |
| `DESIGN.md` | Architecture/rationale | Lifecycle and ALS owners must remain authoritative; ESM must use default CJS namespace; no fallback/compatibility layer. |
| `package.json` | Manifest/scripts/exports | Run `typecheck`, `build`, `test`, `test:package`; `exports.import` is `dist/index.mjs`, `exports.require` is `dist/index.js`; peer is `@prisma/client:^5.22.0`. |
| `tsconfig.json` | Typecheck | Strict TypeScript, CommonJS compiler mode, decorator support, no emit. |
| `tsup.config.ts` | Build | CJS and ESM, declarations and sourcemaps, `@prisma/client` and `uuid` externalized. |
| `prisma/schema.prisma` | Test persistence setup | SQLite `User`/`Post` schema; no schema edit is in scope. |
| `scripts/run-tests.js` | Test setup | Normalize `DATABASE_URL_TEST` or worktree `test.db`; run Prisma db push/generate, then Vitest. |
| `scripts/run-package-smoke.js` | Installed-package boundary coverage | Pack, install into a temporary consumer, test CJS/ESM/declarations, SQLite lifecycle/transaction/WAL/failure and safe output, then delete temp root. |
| `scripts/run-esm-cjs-interop.js` | Focused durable regression | Build output audit; load copied ESM package with dynamic CommonJS peer; exercise `Models`, initialization, shutdown, and named-export failure absence; delete temp root. |
| `.github/workflows/release.yml` | Release evidence | Pushed `v*.*.*` tags build and publish; local checks do not establish npm publication. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| TypeScript/tsup/Vitest/Prisma CLI | Worktree root | `npm ci` already completed upstream; commands use local `node_modules`. | Node 22; Prisma generated client is local dependency. | Command exit status and test/build output. | No persistent service; generated/temp state belongs to this worktree. |
| SQLite test database | Worktree root | `npm test` runs `prisma db push --skip-generate` and `prisma generate`. | Uses `DATABASE_URL_TEST` or `file:./test.db`; no migration. | Prisma push/generate output and Vitest pass. | Do not touch other worktrees; retain normal ignored local DB state. |
| Temporary packed consumers | OS temp directory | Started and owned by package smoke scripts. | Uses copied packed dist and local generated peer; no network service. | Consumer process markers and assertions. | Script `finally` removes its temp root. |
| Synthetic dynamic CJS peer | OS temp directory | Started and owned by `run-esm-cjs-interop.js`. | No database or network connection; stub exposes runtime properties through dynamic object assignment. | ESM consumer marker and absence of named-export link error. | Script `finally` removes its temp root. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| `User`/`Post` SQLite data | `scripts/run-tests.js` schema push and existing integration tests; package smoke creates temp DBs. | Worktree/OS-temp databases only; no production or shared database. | Existing tests clean rows; smoke scripts remove temp roots. |
| CommonJS peer shape that defeats named-export detection | Focused `scripts/run-esm-cjs-interop.js` fixture. | Synthetic only; no secrets and no network. | Removed in script `finally`. |
| Consumer package install | `npm pack` and temporary `npm install --legacy-peer-deps`. | Local tarball, generated peer symlink, no registry publication. | Temporary consumer and package dirs removed. |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: `design-spec.md` persisted-data decision and `implementation-handoff.md` persisted-data transition check both state no schema, migration, query, or stored-representation change.
- Representative existing-data setup and required behavior: Not required for this import-only fix; existing integration/lifecycle tests and package SQLite smoke continue using normal readers/writers.
- Evidence planned for the approved outcome: Verify no schema/migration diff, run existing integration/lifecycle tests and packed Prisma-backed operations, and record no migration/rebuild/write transformation was performed.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/run-esm-cjs-interop.js` | Audits emitted ESM and loads it with a dynamic CommonJS peer; asserts `Models`, initialization, shutdown, and no named-export link error. | `REQ-001`, `REQ-002`, `REQ-005`; `AC-001`, `AC-005`; `DS-001`/`DS-004`. | Still Valid | Added in `IR-001`; explicitly verified by `CRR-001`. | Run unchanged. |
| `scripts/run-package-smoke.js` | Packs/installs package; checks shipped files/declarations; runs CJS and ESM consumers against generated Prisma peer, transaction, WAL, safe errors, and cleanup. | `REQ-003`–`REQ-006`; `AC-002`–`AC-004`, `AC-006`, `AC-007`; `DS-002`/`DS-004`. | Still Valid | Existing package boundary coverage retained and code review passed. | Run unchanged. |
| `scripts/run-tests.js` + `src/tests/integration.test.ts` | Prisma-backed CRUD, HOF/decorator transactions, rollback, nested context, option forwarding and repository behavior. | `REQ-004`, `AC-004`, `AC-006`; `DS-001`/`DS-002`. | Still Valid | Implementation only removed an unused import; behavior assertions remain current. | Run unchanged. |
| `src/tests/public-initialization.test.ts` | Real local Prisma client lifecycle, datasource readiness, captured handles, SQLite existing-data use, transaction routing and rollback. | `REQ-004`, `AC-004`, `AC-006`; `DS-001`. | Still Valid | Runtime import was updated to reviewed safe form; assertions remain approved. | Run unchanged. |
| `src/tests/transaction-context.test.ts` | Mocked HOF transaction routing/options and transaction type/value bindings. | `REQ-002`, `REQ-004`, `AC-005`, `AC-006`; design mixed-binding guidance. | Still Valid | Runtime/type import updated without assertion change; mock covers context policy, not peer module linking. | Run unchanged; interpret as indirect for interop. |
| `src/tests/client-lifecycle.test.ts` | Lifecycle state, readiness, errors, concurrency, shutdown and recovery with fake clients. | `REQ-004`, `AC-004`, `AC-006`; lifecycle owner in `DESIGN.md`. | Still Valid | No lifecycle logic changed; fake-client tests remain regression evidence. | Run unchanged. |
| `src/tests/datasource-readiness.test.ts` | Target normalization and SQLite readiness SQL behavior with typed fake clients. | `REQ-004`, `AC-004`, `AC-006`. | Still Valid | No readiness logic changed. | Run unchanged. |
| `src/tests/forwarding-proxy.test.ts` | Stable forwarding boundaries and captured-handle lifecycle behavior. | `REQ-004`, `AC-004`, `AC-006`; `DESIGN.md`. | Still Valid | No proxy logic changed. | Run unchanged. |
| `src/tests/logging-policy.test.ts` | Lifecycle logging policy/defaults/conflict behavior with fake clients. | `REQ-004`, `AC-004`, `AC-006`. | Still Valid | No logging logic changed. | Run unchanged. |
| `src/tests/database-filter.test.ts` | SQLite-safe filter helper behavior. | Preserved public behavior; outside the interop boundary. | Out Of Scope | No changed imports or runtime path relevant to the fix. | No special execution beyond full suite. |

## Stale Or Obsolete Coverage Decisions

No stale or obsolete durable coverage was found. The removed `integration.test.ts` import was unused
and did not remove a scenario or assertion; it is already recorded in the implementation handoff and
`CRR-001`. No test asserts the intentionally removed unsafe named-import behavior, and no compatibility-
only test may be added or retained.

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | No stale assertion identified. | Requirements/design prohibit retaining unsafe named-import behavior. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | None | The implementation already added and code review verified the focused regression. | None | No additional durable test is justified before executing the reviewed coverage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | None | No update planned. | Existing paths are valid and implementation review passed. | Do not change repository-resident coverage after `CRR-001` unless execution exposes a coverage gap. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | No stale scenario found. | Unsafe behavior is not asserted by existing tests. | No removal. |

## Repository Coverage Execution Plan And Results

The plan followed the package scripts and the code-review evidence. Commands 1, 2, 4, and 6 are the
repository-level evidence used for the post-repository score; commands 3 and 5 are the selected
broader CLI/package-consumer validation and are reflected in the final execution report.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `npm run typecheck` | Worktree root; `tsconfig.json` | Type-only/runtime import separation and unchanged type contracts. | Pass | `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/api-e2e-typecheck.log` — exit 0. |
| 2 | `npm run build` | Worktree root; `tsup.config.ts` | CJS/ESM/declaration artifact emission. | Pass | `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/api-e2e-build.log` — CJS/ESM/DTS build success. |
| 3 | `node scripts/run-esm-cjs-interop.js` | Worktree root; built `dist/` | `AC-001`/`AC-005`, dynamic non-detectable CJS peer through ESM. | Pass | `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/api-e2e-interop.log` — dynamic peer and emitted import audit pass; temp cleanup reported. |
| 4 | `npm test` | Worktree root; harness prepares Prisma schema/client and Vitest | Existing lifecycle, transaction, repository, persistence and public behavior. | Pass | `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/api-e2e-npm-test.log` — 8 files / 83 tests passed. |
| 5 | `npm run test:package` | Worktree root; pack/install temp consumer | Packed CJS/ESM/declarations and Prisma-backed consumer path. | Pass | `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/api-e2e-package.log` — build, 10-file package smoke, CJS/ESM/declarations, lifecycle/transaction/WAL/failure, and interop pass; temp cleanup reported. |
| 6 | `git diff --check` plus metadata/schema/import audits | Worktree root; no service | Release metadata, peer range, no schema/migration change, no unsafe named import. | Pass | `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/api-e2e-audits.log` — Node 22.23.1/macOS ARM64, version 1.0.10, peer unchanged, unsafe ESM imports absent, no schema/migration diff, diff check pass. |
| 7 | Exact Linux ARM64/Vitest consumer workspace | Not available in assigned environment. | Reported downstream consumer platform. | Not Tested | Upstream limitation; no local artifact. |

## Post-Repository Confidence Scorecard (Mandatory)

These are the post-repository scores after commands 1, 2, 4, and 6, before the targeted package
consumer commands were counted as broader validation. The missing direct ESM consumer evidence is
intentional at this stage and is the reason broader validation is required.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 86% | Typecheck, build, full Vitest suite, metadata/import audits passed; AC-001's external consumer link is not yet counted. | Direct ESM execution against a non-detectable CJS peer and packed consumer behavior remain to be counted. | Execute `run-esm-cjs-interop.js` and `npm run test:package`. |
| Changed-boundary execution directness | 86% | Build output audit is direct for the artifact; lifecycle tests execute the unchanged owner. | No current-round external consumer had yet been counted at this score stage. | Execute the focused ESM peer probe and packed consumers. |
| Cross-boundary integration realism and mock gap | 78% | Full tests use generated local peer and some lifecycle tests use fakes. | External package resolution and dynamic CJS namespace boundary are not covered by these repo-level checks alone. | Execute the synthetic-peer and installed-package consumers. |
| Environment, configuration, identity, and fixture fidelity | 90% | Deterministic worktree-local Node 22/Prisma 5.22/SQLite setup and metadata audits passed. | Local macOS ARM64 differs from reported Linux ARM64. | Downstream native Linux ARM64 run if available. |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 83 Vitest tests cover lifecycle, rollback, recovery and forwarding; package smoke not yet counted here. | Packed-consumer failure/WAL evidence remains outside this stage. | Count package smoke and interop execution. |
| User-surface, browser, and desktop-shell confidence | N/A | This is a Node package with no UI, browser, or desktop shell. | None in scope. | None. |
| Durable regression coverage quality and relevance | 95% | Focused dynamic-peer script and existing package smoke are narrow, deterministic, and code-review verified. | Exact downstream consumer remains unverified. | Downstream consumer execution can increase boundary confidence, not test structure. |

- Overall post-repository confidence: 88% (simple average of 86%, 86%, 78%, 90%, 94%, and 95%; `N/A` excluded, rounded from 88.2%).
- Calculation method: Simple average across applicable categories; `N/A` is excluded.
- Every critical acceptance criterion directly proven: `No` at this staged point — direct package-consumer proof is intentionally pending.
- Any applicable category below 90%: `Yes` — requirement proof, changed-boundary directness, and cross-boundary realism.
- Default clean-confidence target of 95% met: `No`.
- Material residual risks: Linux ARM64/Vitest consumer workspace and registry publication evidence are unavailable/local-out-of-scope.

## Broader Validation Decision (Mandatory)

- Decision: `Required` and completed locally (targeted CLI/package-consumer validation; exact Linux ARM64/Vitest run remains `Not Tested` locally).
- Selected execution mode: `CLI` / `Lifecycle` / `Other` — temporary CJS and ESM consumers through packed and built package artifacts.
- Specific confidence gap or residual risk addressed: Prove the real package consumer boundary rather than relying on unit mocks, including a CJS peer shape that defeats named-export heuristics and generated-peer CJS/ESM package use.
- Why the selected mode can materially improve confidence: The defect occurs at module linking before tests execute; only an external consumer loading the emitted artifact can prove this boundary.
- Expected confidence after selected validation: At least 95% locally if all critical scenarios pass; platform-specific residual risk remains explicit.
- Browser-specific decision and rationale: Not applicable; no browser or web-equivalent UI exists.
- If `Not Required`, evidence proving the real changed boundary without broader execution: Not applicable; broader CLI validation is required.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: Linux ARM64/Vitest workspace is unavailable, but local synthetic/package consumer validation was safe and executable; therefore this is not a blocked overall run.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: None.
- Relevant README or development instructions: `README.md` describes a Node package, not a desktop app.
- Web-equivalent behavior: None.
- Shell-specific or lifecycle behavior: None; Prisma client lifecycle is a library lifecycle and is covered by CLI/package tests.
- Chosen validation approach and why it fits the project: No desktop validation; use Node CJS/ESM consumers and lifecycle probes.
- Server/frontend setup when browser validation is used: Not applicable.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: None for desktop scope.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: No persistent service. Build first; the interop and package-smoke scripts create their own temporary consumer processes and SQLite files.
- Environment choices that materially affect the run: Node executable is local Node 22; package smoke unsets datasource/logging variables for import safety and uses temporary SQLite paths for operations.
- Health / readiness checks: Child-process exit status, explicit output markers, Prisma `$connect()`, SQLite database identity, WAL mode, and shutdown assertions.
- Seed data / fixtures: Existing `User`/`Post` test schema; package smoke creates its own temp DB; interop probe uses a dynamic synthetic peer and no database.
- Test identities, authentication, permissions, or session state: None.
- Requirement-linked journeys or scenarios: `API-001` dynamic CJS ESM load; `API-002` packed CJS/ESM/declarations; `API-003` existing Prisma-backed lifecycle/transaction path; `API-004` emitted import/type/release audits.
- DOM, screenshot, log, API, process, or other evidence to capture: Command output, child-process markers, assertions, built artifact text audit, Vitest count, package smoke JSON; no screenshots.
- Owned processes and temporary state to clean up: Child consumers/temp dirs created by scripts; worktree-local generated SQLite/client state is owned by this run.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `API-001` | `node scripts/run-esm-cjs-interop.js` with a temp package copy and dynamic CommonJS peer. | Direct ESM package linking, `Models`, initialization and shutdown without named-export failure. | It is already the smallest appropriate durable repository script; this execution uses its temporary fixture only. |
| `API-002` | `npm run test:package` with temp packed consumer, generated peer symlink and temp SQLite DBs. | Actual packed CJS/ESM/declaration and Prisma-backed package behavior. | Consumer install/DB scaffolding is intentionally ephemeral and owned by the script. |
| `API-003` | `npm test` with worktree test DB and generated Prisma client. | Existing lifecycle, repository, transaction, persistence, and recovery behavior. | Test runner owns standard repository test setup; no extra harness needed. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Exact downstream Linux ARM64 + Vitest consumer | No matching workspace/host is available in this environment; local platform is macOS ARM64. | Native platform-specific resolver/Prisma-engine differences could remain. | If a Linux ARM64 consumer is supplied, rerun `API-001`/`API-002` there; otherwise delivery records the limitation without claiming it passed. |
| npm publication of `1.0.10` | No release/tag operation is in this API/E2E stage. | Registry availability is unproven. | Delivery/release workflow must provide registry evidence; no publication claim here. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before execution. | N/A | Requirements, design, implementation handoff, and `CRR-001` are aligned. | None |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (the focused script and existing smoke are already reviewed and valid).
- Post-repository confidence: `88%` before broader validation; final confidence after broader validation is `96%`.
- Broader validation decision: `Required` and completed through targeted local CLI/package-consumer mode.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: `N/A`.
- Notes: This artifact was created before final execution as required and updated with all results. Exact Linux ARM64/Vitest execution remains a recorded platform limitation, not a fabricated pass; no durable coverage changed after `CRR-001`.

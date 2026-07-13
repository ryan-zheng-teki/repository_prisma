# Explicit Datasource and Strict SQLite WAL Readiness — Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Deep investigation complete; requirements/API contract approved; design complete and ready for architecture review`
- Investigation Goal: Determine whether current `repository_prisma` can connect a different database than `getDatabaseUrl()` selects and whether WAL failure is fail-open/raw-logged; then refine the public lifecycle/readiness requirements for design.
- Scope Classification: `Medium`
- Scope Classification Rationale: Small source surface, but public lifecycle API, root-client identity, module-format build output, generic database compatibility, documentation, and release semantics are affected.
- Scope Summary: Explicit datasource identity, strict SQLite WAL/file readiness, safe failure behavior, lifecycle cleanup, tests, README/DESIGN updates, and build/package parity. Release publication is not authorized in this ticket.
- Primary Questions To Resolve: Architecture review of the lifecycle owner, bounded state machine, proxy revocation, target normalization, SQLite readiness, and failure/recovery design.

## Request Context

The repository and dedicated ticket worktree were bootstrapped by an earlier investigation. The current user explicitly asked this software-engineering team to continue in `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness`, but only if the reported issue is true, and to follow the solution-designer workflow. This investigation independently re-read the source and repeated both disposable failure probes before refining requirements.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness`
- Task Artifact Folder: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness`
- Current Branch: `codex/explicit-datasource-strict-wal-readiness`
- Current Worktree / Working Directory: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness`
- Bootstrap Base Branch: `origin/main` at `cc58bca56f561f828d7afc16b7892cc9231c5030`
- Remote Refresh Result: Fresh SSH clone during bootstrap; `git fetch --prune origin` repeated on 2026-07-13 and succeeded. `origin/main` remains `cc58bca56f561f828d7afc16b7892cc9231c5030`, the task branch merge base.
- Task Branch: `codex/explicit-datasource-strict-wal-readiness`
- Expected Base Branch: `origin/main`
- Expected Finalization Target: `main`. A tag-based release is a later separately authorized action.
- Bootstrap Blockers: None.
- Investigation Runtime: Node `v24.4.1`, npm `11.4.2`, SQLite CLI `3.39.5`.
- Notes For Downstream Agents: Continue only in this dedicated worktree. The refined requirements and supplemental API contract require user approval before design. Do not publish or tag a release without a later explicit user instruction.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related Requirement / Acceptance-Criteria IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/explicit-datasource-strict-wal-readiness/initialization-api-contract.md` | Public initialization/lifecycle contract | Target precedence, lazy binding, strict WAL, safe errors/diagnostics, failure recovery, and concurrency semantics | `REQ-RP-001`–`REQ-RP-010`; `AC-RP-001`–`AC-RP-013` | `Approved by user — 2026-07-13` | Keep aligned through design and architecture review. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-13 | Command | `git clone git@github.com:ryan-zheng-teki/repository_prisma.git /Users/ryan-zheng/autobyteus-org/repository_prisma` | Place requested repository under Ryan's account/directory | Clone succeeded as `ryan-zheng` | No |
| 2026-07-13 | Command | `git fetch --prune origin`; `git worktree add -b codex/explicit-datasource-strict-wal-readiness ... origin/main` | Fresh isolated ticket context | Worktree created from `cc58bca` | No |
| 2026-07-13 | Code | `src/lib/client.ts` | Inspect client/WAL lifecycle | Lazy root client uses generated `DATABASE_URL`; WAL catch logs raw error and resolves | Runtime probe required |
| 2026-07-13 | Code | `src/lib/database.ts` | Inspect target selection | `getDatabaseUrl()` prefers truthy `DATABASE_URL_TEST` under `NODE_ENV=test` | Compare with client target |
| 2026-07-13 | Code | `src/lib/context.ts`, `prisma-manager.ts`, `prisma-proxy.ts`, `decorators.ts` | Map root-client consumers | Repository, proxy, transactions, and decorator converge on root proxy | Preserve one initialized client |
| 2026-07-13 | Doc | `AGENTS.md`, `README.md`, `DESIGN.md` | Learn repo and release contracts | README primary guide; DESIGN rationale; releases tag-based; current docs call WAL optional | Update if behavior/API changes |
| 2026-07-13 | Command | `git log --oneline --decorate -n 15`; `package.json` | Establish version history | main is version 1.0.7; `v1.0.6` tag predates lazy-client commits | Verify registry state before release |
| 2026-07-13 | Setup | `npm ci` | Reproduce from checked-in lockfile | 152 packages installed; npm audit reported 6 dependency vulnerabilities | Separate team should assess without unrelated bulk upgrades |
| 2026-07-13 | Command | `npm test && npm run typecheck && npm run build` | Establish current baseline | 7 integration tests, typecheck, CJS/ESM/DTS build all passed | Add missing lifecycle cases without regressing baseline |
| 2026-07-13 | Probe | Disposable process with `NODE_ENV=test`, `DATABASE_URL=file:<tmp>/a.db`, `DATABASE_URL_TEST=file:<tmp>/b.db`; import `dist/index.mjs`, call helper/init, query `PRAGMA database_list` | Verify helper/client identity | Helper selected B; root client opened A; only `a.db` existed | Defect confirmed |
| 2026-07-13 | Probe | Connect root proxy with A before initialize, change `DATABASE_URL` to B, call initialize and inspect `database_list` | Bound lazy-client timing | Root remained pinned to A | API must prevent/detect preconfiguration access or define compatible semantics |
| 2026-07-13 | Probe | Create SQLite DB in `delete` mode, chmod file 0444 and directory 0555, capture warning, call `initializePrisma({enableWAL:true})`, query mode | Verify WAL failure semantics | Prisma raw error emitted; warning captured raw stack; initialize resolved; mode remained `delete` | Defect confirmed; strict path must reject and suppress raw default output |
| 2026-07-13 | Probe | Initialize A, shutdown, change env to B, initialize again, query identity | Check healthy reset baseline | Second initialization opened B | Preserve working reinitialization while strengthening failure cleanup |
| 2026-07-13 | Command | `npm view repository_prisma version dist-tags --json`; `git tag --sort=-version:refname` | Establish published version | npm latest and newest tag are 1.0.6; main package says 1.0.7 | New release version/tag decision remains downstream |
| 2026-07-13 | Command | `git fetch --prune origin`; `git rev-parse HEAD origin/main`; `git merge-base HEAD origin/main` | Revalidate the user-supplied worktree before continuing | Remote refresh succeeded; `origin/main` remains `cc58bca`; ticket branch still has the correct base and only bootstrap artifacts | No |
| 2026-07-13 | Code | Installed `node_modules/.prisma/client/index.d.ts` lines 798–806 | Verify a supported explicit datasource constructor boundary for locked Prisma 5.22 | `PrismaClientOptions` supports both `datasources` and `datasourceUrl`; the latter is singular and fits this ticket | Use `datasourceUrl` in target design |
| 2026-07-13 | Probe | `new PrismaClient({ datasourceUrl: B })` with `DATABASE_URL=A`, then `$connect` and `PRAGMA database_list` | Prove explicit override feasibility independently of library code | Client opened B; A remained absent | No |
| 2026-07-13 | Probe | Run built ESM from a temporary cwd with `DATABASE_URL=file:./relative-probe.db`; inspect `PRAGMA database_list` | Establish current relative SQLite base | Prisma opened `<worktree>/prisma/relative-probe.db`, proving unmodified relative URLs are schema-location-relative, not cwd-relative | Contract needs a deterministic library-owned base; temp artifact removed |
| 2026-07-13 | Probe | Repeat split A/B environment and read-only WAL probes against current built ESM | Independently reconfirm bootstrap claims | B was selected while A opened; WAL failure emitted raw provider output plus warning, initialization resolved, final mode was `delete` | Defects confirmed |
| 2026-07-13 | Probe | Direct Prisma client with log levels `query`, `info`, `warn` but not `error`, then force read-only WAL failure | Determine source of implicit raw output | The exception was catchable without Prisma's raw `prisma:error` output; current configured `error` level is the provider-output source | Exclude implicit provider error emission on initialization path |
| 2026-07-13 | Command | Filtered `rg` across `/Users/ryan-zheng/autobyteus-org` excluding dependencies, builds, tickets, and validation logs | Audit observable local consumers | Active AutoByteus workspace declares `repository_prisma@^1.0.6`; no runtime source import was found outside a logging-policy test. A pnpm patch changes only built logging policy | Preserve lazy public API where coherent; public npm consumers remain unknown |
| 2026-07-13 | Doc | Solution designer `design-principles.md` and state-machine/interface examples in `references/design-examples.md` | Validate the user-approved best-practice condition | Design needs one authoritative lifecycle owner, a named bounded state machine, explicit interface identity, off-spine SQLite readiness, and no boundary bypass | Applied in `design-spec.md` |
| 2026-07-13 | Probe | Initialize A, capture `rootPrismaClient.$queryRawUnsafe`, shutdown, initialize B, invoke current and captured methods | Determine whether shallow proxy binding can bypass reinitialization | Current root queried B while the captured bound method reconnected/queryed A | Forwarding/revocable invocation is required in scope |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Consumer imports `repository_prisma` and either accesses the root proxy/repository or calls `initializePrisma`.
- Current execution flow: `initializePrisma -> getOrCreateRootClient -> new PrismaClient(log...) -> $connect -> optional PRAGMA WAL -> swallowed warning -> resolve`.
- Ownership or boundary observations: `getDatabaseUrl` owns environment selection for provider helpers, but `client.ts` independently relies on generated Prisma environment resolution. `initializePrisma` does not accept a datasource identity.
- Current behavior summary: Lazy construction fixes import-time environment capture only. It does not align `DATABASE_URL_TEST` with the root client, bind later explicit configuration, prevent target conflicts, or make connection/identity/WAL success verifiable.

## Design Health Assessment Evidence

- Change posture: `Bug Fix` plus `Behavior Change`.
- Candidate root cause classification: `Missing Invariant` plus `Boundary Or Ownership Issue`.
- Refactor posture evidence summary: Client creation, explicit configuration, readiness verification, and failure policy need one lifecycle owner; repository/ALS boundaries otherwise appear reusable.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `src/lib/database.ts` vs `client.ts` | Two independent datasource policies | Selected target is not authoritative | Reproduce and redesign boundary |
| `client.ts:43-48` | WAL error is warned and ignored | Resolution cannot mean WAL-ready | Define best-effort vs strict API |
| Root proxy consumers | Access can instantiate client before initialize | Explicit config may arrive too late | Preserve lazy access through the same resolver, record its bound identity, and reject later conflicting initialization |
| `shutdownPrisma` | Disconnect resets `rootClient=null` only after success | Cleanup/reinitialize behavior needs failure tests | Probe different datasource after shutdown |
| Installed Prisma 5.22 constructor type and runtime probe | Singular `datasourceUrl` override is supported and opens the requested file | No factory replacement or environment mutation is needed | Use the supported constructor option |
| Relative URL probe | Prisma resolves an unmodified relative SQLite target from generated schema location | Expected physical identity cannot be derived from cwd unless the library normalizes before construction | Make cwd-relative normalization explicit and approval-visible |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `src/lib/client.ts` | Lazy root client, initialize, WAL, shutdown | Core defect surface | Likely governing lifecycle owner |
| `src/lib/database.ts` | Provider and URL selection | Selection is not fed into client | May be reused or narrowed |
| `src/lib/context.ts` | ALS transaction creation | Uses root proxy | Must remain on initialized client |
| `src/lib/prisma-manager.ts` | Transaction/root selection | Returns proxy outside transaction | May need readiness guard semantics |
| `src/lib/prisma-proxy.ts` | Dynamic model access | Delegates to manager | Regression coverage required |
| `src/lib/decorators.ts` | Transactional decorator | Starts root transaction | Regression coverage required |
| `src/tests/integration.test.ts` | Current behavior coverage | WAL success only; no split-env/failure/identity test | Expand durably |
| `README.md` / `DESIGN.md` | Public contract/rationale | Describes optional WAL but not failure behavior or explicit datasource | Update with chosen API |
| `tsup.config.ts` / `src/index.ts` | Dist/public exports | CJS/ESM/types must agree | Packed artifact test needed |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-13 | Test | `npm test` | Existing 7 integration tests pass and show unconditional Prisma info/query output | Current suite lacks target/failure assertions; logging is a separate visible contract |
| 2026-07-13 | Probe | Split A/B environment process against built ESM output | `selected=b.db`; actual `main=a.db`; directory contained only A | Reported URL divergence is true on current main, not only published 1.0.6 |
| 2026-07-13 | Probe | Pre-access root proxy, mutate env, then initialize | Actual main stayed A after env changed to B | Lazy construction helps only before first proxy use; initialization is not configuration authority |
| 2026-07-13 | Repro | Read-only DB with `journal_mode=delete` | WAL query error was raw-logged; initialize resolved; final mode `delete` | Reported WAL fail-open behavior is true and directly observable |
| 2026-07-13 | Probe | Shutdown A, change env, reinitialize B | Actual main changed from A to B | Successful shutdown currently resets root identity; preserve this behavior |
| 2026-07-13 | Build | `npm run typecheck && npm run build` | Typecheck plus CJS, ESM, and both declarations succeeded | Future coverage must execute built/packed outputs, not only source |
| 2026-07-13 | Probe | `PrismaClient({ datasourceUrl: B })` while environment names A | Actual main was B; only B was created | Supported fix path is feasible on the locked peer version |
| 2026-07-13 | Probe | Built ESM imported from a disposable cwd with `file:./relative-probe.db` | Actual main resolved under the generated schema directory | Normalize before client construction if the library promises cwd-relative identity |
| 2026-07-13 | Probe | WAL failure with Prisma `error` log level omitted | No raw `prisma:error` provider block was emitted; caught error remained programmatically available | Safe default output needs both removal of library warning and exclusion of implicit provider error logging |
| 2026-07-13 | Probe | Captured root method across shutdown/rebind | Captured method used A after current lifecycle moved to B | Shallow proxy violates lifecycle authority; invocation-time forwarding is not optional cleanup |

Exact split-target reproduction:

```bash
TMP="$(mktemp -d)"
DATABASE_URL="file:$TMP/a.db" DATABASE_URL_TEST="file:$TMP/b.db" NODE_ENV=test \
node --input-type=module <<'EOF'
const repo = await import('./dist/index.mjs')
console.log('selected', repo.getDatabaseUrl())
await repo.initializePrisma({ enableWAL: true })
console.log('actual', await repo.rootPrismaClient.$queryRawUnsafe('PRAGMA database_list;'))
await repo.shutdownPrisma()
EOF
rm -rf "$TMP"
```

Exact WAL failure setup:

```bash
TMP="$(mktemp -d)"; DB="$TMP/readonly-secret.db"
sqlite3 "$DB" 'PRAGMA journal_mode=DELETE; CREATE TABLE probe(id INTEGER);'
chmod 444 "$DB"; chmod 555 "$TMP"
DATABASE_URL="file:$DB" node --input-type=module <<'EOF'
const repo = await import('./dist/index.mjs')
await repo.initializePrisma({ enableWAL: true }) # resolved despite Prisma error
console.log(await repo.rootPrismaClient.$queryRawUnsafe('PRAGMA journal_mode;')) # delete
await repo.shutdownPrisma()
EOF
chmod 755 "$TMP"; chmod 644 "$DB"; rm -rf "$TMP"
```

## External / Public Source Findings

- No web source is required to determine the reported behavior or locked-version constructor capability; authoritative evidence is this repository, installed generated Prisma 5.22 types, and disposable Prisma/SQLite execution.
- Registry/publication state was checked during bootstrap only to understand compatibility context. Publication is outside the currently authorized scope.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None; disposable local SQLite files only.
- Required config, feature flags, env vars, or accounts: Conflicting `DATABASE_URL`/`DATABASE_URL_TEST`, `NODE_ENV=test`, generated Prisma Client.
- External repos, samples, or artifacts cloned/downloaded for investigation: Only the requested repository clone.
- Setup commands that materially affected the investigation: Fresh SSH clone, remote fetch, dedicated worktree creation, `npm ci`, test-driven Prisma generation, and `npm run build`.
- Cleanup notes for temporary investigation-only setup: All disposable temp DB directories and generated root `test.db` artifacts were removed. Exploratory `prisma/:memory:` and `prisma/relative-probe.db` artifacts created by schema-relative URL behavior were also removed. No consumer database was touched.

## Findings From Code / Docs / Data / Logs

1. The reported source-level URL split is real on current main: helper selection and client construction are separate.
2. The reported WAL fail-open/raw-log path is real on current main.
3. Main already contains a lazy-client change after v1.0.6, so the future team must design from 1.0.7 source rather than copying a consumer patch made against 1.0.6 dist.
4. The generic library should not absorb application-specific migration locks or startup orchestration.
5. Default Prisma logging (`query`, `info`, `warn`, `error`) caused the provider error to be printed even before the library's own `console.warn`; redaction cannot be achieved by removing only that warning.
6. Current shutdown/reinitialize across two datasources works after a successful disconnect and should remain a regression invariant.
7. The installed Prisma 5.22 generated client has a singular supported `datasourceUrl` constructor option, and a runtime probe proved it opens the override rather than `DATABASE_URL`.
8. Relative SQLite URLs are not cwd-relative when passed through unchanged. Normalizing against a documented cwd base before client construction makes client target and identity verification deterministic.
9. Omitting Prisma's configured `error` stdout level suppresses the provider's implicit raw error block while preserving a caught error for an explicit diagnostic callback.
10. npm latest remains 1.0.6 while main declares 1.0.7; no version/tag/publish action is authorized by this ticket request.
11. Current shallow proxy binding is a concrete lifecycle bypass: a captured root method can reconnect the old database after shutdown/rebind. The target proxy must resolve the current client at invocation time.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume: Consumer-owned Prisma databases; unknown and outside library ownership.
- Relevant change: Connection/readiness semantics only; no model/schema change.
- Normal readers and writers: Consumer repositories/proxy/transactions using the root client.
- Representative direct-read or compatibility evidence: Disposable A/B `PRAGMA database_list` inspection proved current divergence; no tables/data were required or transformed.
- Required semantics and invariants preserved by direct use: `Yes` for stored data if the correct client identity is enforced; no migration is needed.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Wrong-file connection or WAL mutation is unacceptable; tests must be disposable.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No migration candidate exists.
- Existing migration framework or lifecycle constraints: Out of scope for this library ticket.

## Constraints / Dependencies / Compatibility Facts

- Package `repository_prisma` version on main: 1.0.7.
- Peer Prisma Client: `^5.22.0`; dev Prisma: `^5.22.0`.
- Public root proxy and initialization API can have consumers not visible locally. The local AutoByteus workspace declares the dependency but its active source does not exercise the runtime API outside a logging test.
- Both ESM and CJS are produced by tsup; declarations ship in the npm package.
- Query logging is currently always enabled in source; general log-policy changes remain out of scope. Preventing raw initialization-error output is explicitly in scope and requires removing the configured provider `error` output plus the catch warning.
- Installed Prisma 5.22 supports `datasourceUrl`; no Prisma upgrade is needed.
- A relative SQLite URL passed unchanged resolves from Prisma's generated schema context. The proposed contract instead normalizes it against `process.cwd()` before construction.

## Open Unknowns / Risks

- The user approved the recommended compatible optional-explicit API, strict WAL semantics, cwd-relative SQLite normalization, and opt-in diagnostics conditional on best-practice design.
- Cross-platform canonical path comparison must account for symlinks and `/var` versus `/private/var`-style aliases without leaking either value.
- Concurrent initialize/shutdown/access behavior needs an explicit lifecycle state machine in design.
- Public npm consumers remain unobservable; tightened failure behavior needs clear README/DESIGN documentation before any later release.

## Notes For Architecture Reviewer

The defect is confirmed and the requirements basis plus API contract are approved. `design-spec.md` demonstrates the best-practice condition through one authoritative lifecycle boundary, explicit bounded state transitions, forwarding proxies that cannot retain stale root clients, SQLite readiness as an off-spine concern, safe error/diagnostic separation, and removal of the best-effort WAL path. Architecture review should verify the full package and either pass it or return a concrete design/requirement issue. Do not tag or publish without later explicit release approval.

# Explicit Datasource and Strict SQLite WAL Readiness — Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Bootstrap investigation complete; defects confirmed; ready for a separate solution-design team`
- Investigation Goal: Determine whether current `repository_prisma` can connect a different database than `getDatabaseUrl()` selects and whether WAL failure is fail-open/raw-logged; preserve evidence in a ticket another team can continue.
- Scope Classification: `Medium`
- Scope Classification Rationale: Small source surface, but public lifecycle API, root-client identity, module-format build output, generic database compatibility, documentation, and release semantics are affected.
- Scope Summary: Explicit datasource identity, strict SQLite WAL/file readiness, safe failure behavior, lifecycle cleanup, tests, docs, and a future tag-based release.
- Primary Questions To Resolve: Runtime reproducibility on current main; client creation timing; reinitialize behavior; exact compatible API; strict-vs-best-effort default; CJS/ESM/dist parity; consumer impact.

## Request Context

The user asked to clone `git@github.com:ryan-zheng-teki/repository_prisma.git` under `/Users/ryan-zheng/autobyteus-org`, analyze the source, and—only if the reported issue is real—bootstrap a ticket for another software-engineering team. The clone completed as the local `ryan-zheng` account at `/Users/ryan-zheng/autobyteus-org/repository_prisma`.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness`
- Task Artifact Folder: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness/tickets/in-progress/explicit-datasource-strict-wal-readiness`
- Current Branch: `codex/explicit-datasource-strict-wal-readiness`
- Current Worktree / Working Directory: `/Users/ryan-zheng/autobyteus-org/repository_prisma/.worktrees/explicit-datasource-strict-wal-readiness`
- Bootstrap Base Branch: `origin/main` at `cc58bca56f561f828d7afc16b7892cc9231c5030`
- Remote Refresh Result: Fresh SSH clone followed by `git fetch --prune origin` on 2026-07-13; succeeded.
- Task Branch: `codex/explicit-datasource-strict-wal-readiness`
- Expected Base Branch: `origin/main`
- Expected Finalization Target: `main`, followed by the repository's tag-based release process after full review.
- Bootstrap Blockers: None.
- Investigation Runtime: Node `v24.4.1`, npm `11.4.2`, SQLite CLI `3.39.5`.
- Notes For Downstream Agents: Continue only in this dedicated worktree. Requirements remain Draft; perform consumer/compatibility review before locking API shape or publishing a version.

## Supplemental Solution Artifact Inventory

None.

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

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Consumer imports `repository_prisma` and either accesses the root proxy/repository or calls `initializePrisma`.
- Current execution flow: `initializePrisma -> getOrCreateRootClient -> new PrismaClient(log...) -> $connect -> optional PRAGMA WAL -> swallowed warning -> resolve`.
- Ownership or boundary observations: `getDatabaseUrl` owns environment selection for provider helpers, but `client.ts` independently relies on generated Prisma environment resolution. `initializePrisma` does not accept a datasource identity.
- Current behavior summary: Lazy construction fixes some env timing, but it does not align `DATABASE_URL_TEST` with the root client and does not make WAL success verifiable.

## Design Health Assessment Evidence

- Change posture: `Bug Fix` plus `Behavior Change`.
- Candidate root cause classification: `Missing Invariant` plus `Boundary Or Ownership Issue`.
- Refactor posture evidence summary: Client creation, explicit configuration, readiness verification, and failure policy need one lifecycle owner; repository/ALS boundaries otherwise appear reusable.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `src/lib/database.ts` vs `client.ts` | Two independent datasource policies | Selected target is not authoritative | Reproduce and redesign boundary |
| `client.ts:43-48` | WAL error is warned and ignored | Resolution cannot mean WAL-ready | Define best-effort vs strict API |
| Root proxy consumers | Access can instantiate client before initialize | Explicit config may arrive too late | Decide guard/detection/compatibility |
| `shutdownPrisma` | Disconnect resets `rootClient=null` only after success | Cleanup/reinitialize behavior needs failure tests | Probe different datasource after shutdown |

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

- No web source is required to determine the reported behavior; authoritative evidence is this repository at current `origin/main` plus disposable Prisma/SQLite execution.
- Registry/publication freshness remains for the downstream release team to verify before choosing the next tag.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None; disposable local SQLite files only.
- Required config, feature flags, env vars, or accounts: Conflicting `DATABASE_URL`/`DATABASE_URL_TEST`, `NODE_ENV=test`, generated Prisma Client.
- External repos, samples, or artifacts cloned/downloaded for investigation: Only the requested repository clone.
- Setup commands that materially affected the investigation: Fresh SSH clone, remote fetch, dedicated worktree creation, `npm ci`, test-driven Prisma generation, and `npm run build`.
- Cleanup notes for temporary investigation-only setup: All disposable temp DB directories and generated root `test.db` artifacts were removed. An exploratory `file::memory:` value created `prisma/:memory:` because Prisma treated it as a schema-relative filename; that artifact was also removed. No consumer database was touched.

## Findings From Code / Docs / Data / Logs

1. The reported source-level URL split is real on current main: helper selection and client construction are separate.
2. The reported WAL fail-open/raw-log path is real on current main.
3. Main already contains a lazy-client change after v1.0.6, so the future team must design from 1.0.7 source rather than copying a consumer patch made against 1.0.6 dist.
4. The generic library should not absorb application-specific migration locks or startup orchestration.
5. Default Prisma logging (`query`, `info`, `warn`, `error`) caused the provider error to be printed even before the library's own `console.warn`; redaction cannot be achieved by removing only that warning.
6. Current shutdown/reinitialize across two datasources works after a successful disconnect and should remain a regression invariant.
7. npm latest remains 1.0.6 while main declares 1.0.7; the separate team must decide the next publishable version rather than assuming 1.0.7 is already released.

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
- Public root proxy and initialization API have existing consumers; compatibility audit is required.
- Both ESM and CJS are produced by tsup; declarations ship in the npm package.
- Query logging is currently always enabled in source; log-policy changes should be explicitly scoped rather than smuggled into WAL repair.

## Open Unknowns / Risks

- Whether the next release should preserve best-effort `enableWAL` and add a distinct strict option, or deliberately change existing semantics.
- Whether explicit datasource should be required, optional, or provided by a configure/factory API.
- How root proxy access before initialization should behave.
- Whether raw diagnostic causes can be retained programmatically without accidental console leakage.
- Registry publication status of 1.0.7 and next safe version number.

## Notes For Architecture Reviewer

This ticket is intentionally bootstrapped, not design-approved. A separate team should refine requirements, audit real consumers (especially AutoByteus), choose the public lifecycle/API compatibility boundary, produce the design spec, pass architecture review, implement, test packed CJS/ESM artifacts, update README/DESIGN, and publish only after explicit release approval.

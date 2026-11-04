# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record keeps the initial baseline and one entry per later implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-002 | Implemented at `a092a60`; local checks IMP-01..09 pass; to code review |
| IR-002 | Code reviewer CRR-001 (CR-001) -> Solution Designer SR-005 -> architecture reviewer ARCH-REV-003 (pass) | CR-001 | `Design Impact` | SR-005, ARCH-REV-003, CRR-001 | Connection gate at `e5d2371`; IMP-10..16 pass; to code review |

## Revision Entries

### IR-001 — Prisma 7.10.1 with a library-owned SQLite driver adapter

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-review-report.md`, round 2 (ARCH-REV-002 Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: the design spec (SR-004) is implemented at commit `a092a60` on `codex/prisma-7-upgrade`, with `task_size = Medium` and `architectural_risk = High` confirmed.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..013; REQ-001..015; AC-001..012 (local checks only; API/E2E pending).
- Implementation delta:
  - New `createSqliteDriverAdapter`: file target -> `expectedPath`, memory -> `:memory:`, `timestampFormat: 'unixepoch-ms'`.
  - `defaultClientFactory` uses `{ adapter, log }`.
  - `resolveDatasourceTarget` rejects non-SQLite with `UNSUPPORTED_DATASOURCE_PROVIDER`. The `other` kind and `clientUrl` are removed. `normalizeClientPath` is renamed `normalizeBindingPath`, with identical binding keys.
  - New error code and safe message.
  - Peers and dev deps at `^7.10.1`, `prepare: prisma generate`, `engines.node`.
  - Schema without `url`, plus the `Event` test model.
  - tsup externalizes the adapter; `db push` runs without `--skip-generate`; the CI step and env are removed.
  - Smoke/interop: adapter symlink, SQLite policy-probe URLs, `npm pack` JSON parsed after the `prepare` output, external-adapter, no-native-load-on-import and no-`?`-file assertions, packaged non-SQLite rejection.
  - Tests per the Removal plan, plus AC-004/005/008 (and the `initializing` state).
  - README, DESIGN and CHANGELOG (Unreleased, breaking). Version unchanged.
- Changed files or areas: `src/lib/client/{sqlite-driver-adapter (new),datasource-target,lifecycle,initialization-error}.ts`; `src/tests/{client-lifecycle,datasource-readiness,logging-policy,public-initialization,datetime-continuity (new)}.test.ts`; `package.json`, `package-lock.json`, `prisma/schema.prisma`, `tsup.config.ts`, `scripts/{run-tests,run-package-smoke,run-esm-cjs-interop}.js`, `.github/workflows/ci.yml`; `README.md`, `DESIGN.md`, `CHANGELOG.md`.
- Local validation and result: IMP-01 fresh `npm ci` (prepare generates 7.10.1), IMP-02 typecheck, IMP-03 `npm test` 96/96, IMP-04 build with the adapter external, IMP-05 `test:package`, IMP-06 `git diff --check`, IMP-07 mutation checks (AC-004/AC-005 guards fail under mutation), IMP-08 verbose changed suites 68/68, IMP-09 dlopen spy sanity. All pass; evidence in `evidence/`.
- Next recipient or routing: code review (architectural_risk High), per `get_handoff_rules`.
- Remaining limitations or risks: not run on Node 20 (CI) or a real Windows host; the AC-012 fresh-consumer install without `--legacy-peer-deps` is left to API/E2E; RSK-002 native addon on consumer platforms; `npm pack`/`publish` run `prisma generate` through `prepare`.

### IR-002 — SQLite connection gate for transaction isolation (CR-001)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer` (ARCH-REV-003 Pass at SR-005, commit `779fcb0`), after code review `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/code-review-report.md` round 1 (CRR-001)
- Triggering finding IDs: CR-001
- Classification: `Design Impact` (resolved upstream at SR-005, D7; implemented here)
- Prior authoritative result: IR-001 (`a092a60`). Concurrent requests shared the adapter's single connection without isolation. A plain query from another request read uncommitted rows, and its write was rolled back with the open transaction (`evidence/CR-01-tx-isolation-probe.log`).
- Current authoritative result: `e5d2371`. The adapter is gated; the CR-01 probe gives the 1.0.10 result (IMP-13). `task_size = Medium`, `architectural_risk = High` confirmed.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: implement design-spec "SR-005 Decision D7" and its Guidance for CR-001.
- Approved behavior or requirement IDs affected: BEH-009, REQ-007, AC-007, AC-013, SCN-007.
- Implementation delta:
  - New `gateSqliteConnection(factory)`: one FIFO lock per connection with no timeout of its own. Plain `queryRaw`/`executeRaw`/`executeScript` hold it per call. `startTransaction` takes it, and the transaction releases it exactly once on commit or rollback (`finally`, so also when they throw), or at once if starting fails. Transaction statements pass through.
  - The gate forwards `provider`, `adapterName`, `options`, `getConnectionInfo`, savepoints and `dispose`. Its types derive from `PrismaBetterSqlite3`; no new dependency.
  - `createSqliteDriverAdapter` returns the gated factory; `lifecycle.ts` is unchanged.
  - Tests: 10 gate unit tests (fake adapter) and 6 AC-013 tests on a real file: the CR-01 shape, concurrent transactions, nested and batch writes during an interactive transaction, SCN-007 (`P2028` expired transaction), and a queued transaction past `maxWait` (`P2028`) followed by successful plain and transactional work.
  - Docs: README (queueing, `maxWait`, root client inside a transaction), DESIGN §E (the gate), CHANGELOG.
- Changed files or areas: `src/lib/client/sqlite-connection-gate.ts` (new), `src/lib/client/sqlite-driver-adapter.ts`, `src/tests/sqlite-connection-gate.test.ts` (new), `src/tests/transaction-isolation.test.ts` (new), `README.md`, `DESIGN.md`, `CHANGELOG.md`.
- Local validation and result: IMP-10 typecheck; IMP-11 `npm test` 112/112; IMP-12 `test:package`; IMP-13 CR-01 probe on the gated `dist`; IMP-14 gate and isolation suites 16/16; IMP-15 `git diff --check`; IMP-16 mutations (no gate: 2 isolation tests fail; rollback without release: 2 gate tests fail). All pass.
- Next recipient or routing: code review (architectural_risk High), per `get_handoff_rules`.
- Remaining limitations or risks: throughput (plain work waits during transactions; transactions are serial); SCN-007 now times out (documented; FU-001 consumer audit); a short script with no other event-loop handle can exit while waiting (Prisma timer behavior). Not run: Node 20, a real Windows host, AC-012 fresh consumer, AC-013 through the packed ESM entry.

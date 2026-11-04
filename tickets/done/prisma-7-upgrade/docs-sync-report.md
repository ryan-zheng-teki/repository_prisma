# Docs Sync Report

## Scope

- Ticket: `prisma-7-upgrade` (Project Task `repository-prisma-1`); `task_size = Medium`, `architectural_risk = High`, route `Reviewed` (architecture review, code review, API/E2E, proportional test-code review)
- Trigger: code reviewer handoff after CRR-003 Pass (proportional test-code review); source review CRR-002 Pass (IR-002); API/E2E API-REV-001 Pass at 95% final confidence
- Bootstrap base reference: `origin/codex/repository-prisma-esm-cjs-interop@f2ffd5c` (released 1.0.10, tag `v1.0.10` = `5c57ebd`)
- Integrated base reference used for docs sync: `f2ffd5c` (refreshed 2026-11-04: `origin/codex/repository-prisma-esm-cjs-interop` = `f2ffd5c`, `origin/main` = `8ab582f`, an ancestor of the branch; neither advanced). Ticket branch head `53a633b`.
- Post-integration verification reference: `evidence/DE-01-delivery-integrated-rerun.log` (typecheck, `npm test` 113/113, build, `test:package` pass on `53a633b`)

## Why Docs Were Updated

- Summary: Prisma 7 changes the consumer contract. The peers move to 7.x, with a new adapter peer. Only SQLite is supported. The schema has no `url`; `prisma.config.ts` holds it, and `prisma generate` must be run explicitly. Node and TypeScript minimums rise. The single-connection gate changes concurrency: plain work waits during an open transaction, transactions queue up to `maxWait`, and SCN-007 applies to `rootPrismaClient` calls inside a transaction callback. AGENTS.md requires README/DESIGN to follow behavior and API changes. The implementation engineer wrote these updates in `a092a60` and `e5d2371`. Delivery reviewed them against the final code (`53a633b`) and found them accurate and complete, so it made no further edits.
- Why this should live in long-lived project docs: consumers upgrading from 1.0.x need the setup steps, the breaking changes and the concurrency rule. Maintainers need the adapter/gate ownership and rationale (DESIGN.md).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Primary usage and release guide (AGENTS.md) | Updated (in this change; verified by delivery) | "Requirements and Setup (Prisma 7)" matches `package.json` (`engines.node ^20.19 \|\| ^22.12 \|\| >=24`, peers `^7.10.1`). The setup was followed verbatim in API-05/06/11. The concurrency section (one transaction at a time, `P2028`/`maxWait`) matches `sqlite-connection-gate.ts`. The SCN-007 warning is in "Root Client Access". The SQLite-only, query-string and DateTime notes are there. The release section says the Unreleased changes need a major version. "How it Works" names `sqlite-driver-adapter.ts`. |
| `DESIGN.md` | Architecture and rationale | Updated (in this change; verified by delivery) | The lifecycle builds the client with `createSqliteDriverAdapter`. The ownership of `datasource-target.ts`, `sqlite-driver-adapter.ts` and `sqlite-connection-gate.ts` matches the code. The sequence diagram, the "Package ESM/CommonJS Boundary" (both peers external) and the `prepare`/`prisma.config.ts` toolchain notes are updated. |
| `CHANGELOG.md` | Release notes for the next major | Updated (in this change; verified by delivery) | `## Unreleased (breaking: requires a major release)` lists every breaking contract change and the gate behavior. Version stays `1.0.10` (REQ-012). |
| `AGENTS.md` | Project instructions | No change | Still accurate. |
| `examples/implicit-transaction-demo.ts` | Example code could use Prisma 5-only APIs | No change | Uses only the library API. It is included in `tsconfig.json`, and `npm run typecheck` passes (DE-01). |
| `.github/workflows/ci.yml` | Docs-adjacent CI commands | Updated (in this change) | `--skip-generate` removed; Node 20 stays (FU-003). |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | Usage / contract (implementation commits `a092a60`, `e5d2371`) | New "Requirements and Setup (Prisma 7)" section; concurrency rule under transactions; SCN-007 warning; SQLite-only provider note; release section notes a major is required; Testing notes `prepare` | Breaking consumer contract (REQ-012, REQ-015, AC-011, AC-012) |
| `DESIGN.md` | Architecture | Driver-adapter construction, provider rule ownership, adapter and connection-gate responsibilities and rationale, peers external, CLI config | Durable design knowledge (D1–D7) |
| `CHANGELOG.md` | Release notes | Unreleased breaking entry | REQ-012 |
| (delivery) | None | Delivery made no further long-lived doc edits | The docs already match the final integrated state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| SQLite driver adapter | The library builds `PrismaBetterSqlite3` itself from the resolved physical path (query string ignored), with `timestampFormat: 'unixepoch-ms'` for Prisma-5 data continuity | `design-spec.md` (D2–D5), `probes/README.md` | `DESIGN.md` § client lifecycle; `README.md` setup "Good to know" |
| Connection gate | One FIFO lock per connection. A transaction holds it until commit/rollback. Plain queries hold it per call. It covers internal and batch transactions; P2028 comes after `maxWait`; SCN-007 | `design-spec.md` § SR-005 D7, `code-review-report.md` CR-001 | `DESIGN.md`; `README.md` transactions section; `CHANGELOG.md` |
| Supported providers | SQLite only; `UNSUPPORTED_DATASOURCE_PROVIDER`, checked at target resolution before conflict/WAL checks; `CLIENT_NOT_READY` precedence while shutting down | `requirements-doc.md` DEC-001, AC-008 | `DESIGN.md`; `README.md` |
| Toolchain | No schema `url`; `prisma.config.ts`; `prepare` runs `prisma generate` | `investigation-notes.md` | `DESIGN.md`; `README.md` Testing |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `new PrismaClient({ datasourceUrl })` | `new PrismaClient({ adapter: createSqliteDriverAdapter(target), log })` | `DESIGN.md` client lifecycle |
| Schema `datasource.url = env(...)` | `prisma.config.ts` `datasource.url` | `README.md` setup; `DESIGN.md` |
| Non-SQLite support (`WAL_UNSUPPORTED_PROVIDER` for non-SQLite, `DATASOURCE_CONFLICT` for bound SQLite then non-SQLite) | `UNSUPPORTED_DATASOURCE_PROVIDER` | `README.md`; `DESIGN.md`; `CHANGELOG.md` |
| Prisma 5 engine connection pool isolation | Library-owned SQLite connection gate | `DESIGN.md`; `README.md` |
| `prisma db push --skip-generate` in CI | `prisma db push` + `prepare` generate | `CHANGELOG.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: not applicable. The docs were updated in this change; delivery found no further edits were needed.
- Rationale: see above.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence, ticket archive, repository finalization into `main`
- Notes: AC-011's prose review is complete with this report. One out-of-scope observation: the README "Release (Tag-Based)" section is the release guide, and it does not name its finalization target or a release-notes requirement. That is recorded in the release/deployment report as a proposed guide fix, not as a follow-up, because it changes nothing in the product.

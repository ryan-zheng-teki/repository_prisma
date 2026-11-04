# Prisma 7 Feasibility Probes (supplement, Solution Designer, 2026-11-04)

Disposable scratch environments were used. Nothing here touched the task worktree's sources, the
shared checkout, or any user data. The probes are kept so implementation can re-run them.

| Probe | Environment | Command | Result |
| --- | --- | --- | --- |
| `construct-options.cjs` | `/tmp/prisma7-probe` = `git archive` of `f2ffd5c` + `prisma@7.10.1 @prisma/client@7.10.1`, schema `url` removed, `prisma generate` | `NODE_PATH=/tmp/prisma7-probe/node_modules DATABASE_URL=file:/tmp/prisma7-probe/test.db node construct-options.cjs` | `Prisma.ModelName` and `Prisma.TransactionIsolationLevel` present. `new PrismaClient({ datasourceUrl })` -> `PrismaClientConstructorValidationError: Unknown property datasourceUrl`. `new PrismaClient({})` -> `PrismaClient requires a driver adapter`. |
| `adapter-readiness.mjs` | same + `@prisma/adapter-better-sqlite3@7.10.1` (better-sqlite3 12.11.1) | run from a script dir whose `node_modules` symlinks to the probe's | For `file:/abs`, `/abs`, and `file:./rel`: `PRAGMA database_list` reports the expected `main` file, `PRAGMA journal_mode = WAL` then `PRAGMA journal_mode` -> `wal`, interactive `$transaction(fn, { maxWait, timeout, isolationLevel: Serializable })` works, and `log` query events are emitted (5). For `file:/abs/test.db?connection_limit=1`, the adapter created a **new file literally named `test.db?connection_limit=1`**. |
| `datetime-continuity-write-p5.cjs` + `datetime-continuity.schema.prisma` | `/tmp/prisma5-probe` with `prisma@5.22.0 @prisma/client@5.22.0`, `DATABASE_URL=file:/tmp/dt-continuity.db`, `prisma db push` | `node datetime-continuity-write-p5.cjs` | Prisma 5.22 stores `DateTime` columns as SQLite `integer` (unix epoch ms). |
| `datetime-continuity-read.mjs` | `/tmp/prisma7-dt` (7.10.1 client for the same schema, url removed) | `node datetime-continuity-read.mjs` | Both adapter formats read the Prisma-5 row correctly. With the adapter default `timestampFormat: 'iso8601'`, new rows are stored as `text`, and `where: { at: { gt: 2025-01-01 } }` **misses the Prisma-5 row dated 2026-01-02**. With `'unixepoch-ms'`, new rows are `integer` and the same filter returns every row. |
| `feasibility-patch.diff` | `/tmp/prisma7-probe` | `npm run typecheck`; `DATABASE_URL_TEST=file:/tmp/prisma7-probe/test.db npm test -- --run`; `npm run test:package` | Typecheck passed. **8 files / 83 tests passed** on 7.10.1 with only the lifecycle factory using the adapter, the two test seed clients using the adapter, and `--skip-generate` removed from `scripts/run-tests.js`. `test:package` initially failed because tsup bundled the adapter and better-sqlite3 into `dist/index.mjs` (`Dynamic require of "fs" is not supported`). After the adapter was externalized and the smoke consumer could resolve it, `run-package-smoke.js` passed. `run-esm-cjs-interop.js` then failed only because its synthetic consumer cannot resolve `@prisma/adapter-better-sqlite3` (harness dependency). |

The feasibility patch is not the design. In particular, it maps every non-SQLite target to
`:memory:` purely to let the suite run. It shows feasibility, not the intended behavior.

CLI facts reproduced with 7.10.1:

- `prisma generate` with `url = env("DATABASE_URL")` in the schema datasource fails with `P1012`:
  "The datasource property `url` is no longer supported in schema files."
- `prisma db push --skip-generate` is rejected (the flag was removed). `prisma db push` no longer
  runs `generate`.
- `prisma-client-js` still generates into `node_modules/.prisma/client` and is importable as
  `@prisma/client` (CJS `default.js`), so the 1.0.10 default-namespace import keeps working.

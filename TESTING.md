# Testing

How this project is tested: which test layers exist and what each proves, how
to run them, the environments and data they need, and the rules every test run
follows. Read it before planning or running validation. The README's Testing
section is the short maintainer version; this file is the guideline.

## Setup

- Node.js `^20.19 || ^22.12 || >=24` (`engines`). CI uses Node 24 (npm 11.19.1).
- Install from the repository root with `npm ci`. The `prepare` script runs
  `prisma generate`. Installing needs no `DATABASE_URL`.
- Install scripts follow `package.json` `allowScripts`. Only `better-sqlite3`
  is approved, pinned to its version, because the tests need its native module.
  `esbuild`, `prisma`, `@prisma/engines` and `fsevents` are denied. CI runs
  `npm ci --strict-allow-scripts`. After upgrading `better-sqlite3`, run
  `npm install-scripts approve better-sqlite3` (npm 11.16+) and commit
  `package.json`, or the strict install fails with `ESTRICTALLOWSCRIPTS`.
- On npm 12+, an install without that approval leaves `better-sqlite3` without
  `build/Release/better_sqlite3.node`, and every real-SQLite test fails.

## Test Layers

| Layer | What it proves | Command |
| --- | --- | --- |
| Typecheck | Two programs, because a `PrismaClientRegistry` declaration applies to a whole program. `tsconfig.json`: `src/` and `examples/` compile against the prisma-client-js client, and `src/tests/type-equality.typecheck.ts` proves its public types are identical to 2.0.0. `tsconfig.prisma-client-generator.json`: `examples/prisma-client-generator/` and `src/tests/prisma-client-generator/` compile against the `prisma-client` generator's client (`generated/prisma-client/`) with the declaration, and their `@ts-expect-error` lines prove the registered types are enforced. `scripts/check-typecheck-programs.js` then fails unless every file in those two folders is in the registered program and none is in the default one (DESIGN.md DC-002) | `npm run typecheck` (both `tsc` runs, then the program-content check) |
| Unit and integration (vitest) | Library behavior: lifecycle, datasource resolution, readiness, logging policy, transactions (including concurrent requests on one SQLite file), repositories, DateTime storage. `public-initialization`, `datetime-continuity`, `transaction-isolation` and `integration` use real SQLite files. `client-lifecycle`, `client-registration`, `logging-policy`, `sqlite-connection-gate`, `sqlite-driver-unavailable`, `forwarding-proxy` and `transaction-context` use fake clients, client modules or adapters (in part), so they do not prove the real driver. `missing-client` stubs the `@prisma/client` load to stand for an app without prisma-client-js output. `prisma-client-generator/registered-client` registers the real generated `prisma-client` client against real SQLite files, with the `@prisma/client` load stubbed to fail, so every case runs on the registered client (including concurrent requests); `prisma-client-generator/registration-recovery` starts with nothing registered and registers after a failed start. Vitest transforms that folder without the root `tsconfig.json` (which excludes it), so tests there apply decorators as function calls. | `npm test` (runs `prisma db push` to `test.db`, `prisma generate`, then vitest) |
| Build | tsup emits `dist` (CJS, ESM, declarations) with the Prisma packages external | `npm run build` |
| Package smoke | Runs the build, then the packed tarball as a consumer gets it: the packed file list and `dist` text, import safety (no `.env`, no `@prisma/client` load, no native addon on import), the logging policy, the CJS and ESM runtime (WAL, transactions, identity, safe failures, read-only WAL), the consumer declarations (`tsc`: a prisma-client-js consumer, a registered prisma-client consumer whose `@ts-expect-error` lines must all be errors, and one without the declaration that must fail with the declaration in the message, each under `NodeNext`, `Node16` and `Bundler` resolution and as a CommonJS consumer), a consumer on the `prisma-client` generator without prisma-client-js output (ESM and `moduleFormat = "cjs"` clients through the ESM and CJS builds: missing client, registration, WAL, CRUD, transactions, `Models`, conflict) and ESM/CJS interop | `npm run test:package` (`scripts/run-package-smoke.js` runs the steps in `scripts/package-smoke/`, then `scripts/run-esm-cjs-interop.js`) |

There are no gated suites: no layer needs a service, key or account.

## Choosing The Layer

- A change in `src/` needs `npm run typecheck` and `npm test`. A change in
  transactions or the client lifecycle also needs a concurrent-request test,
  because sequential tests do not show isolation problems (DESIGN.md DC-001).
- A change to packaging, `exports`, tsup config, peers or anything consumers
  import needs `npm run test:package`.
- The package smoke installs the tarball with `--legacy-peer-deps` and
  symlinks the Prisma peers from this repository. So it does not prove how a
  real consumer resolves peers or builds `better-sqlite3`. For install,
  peer-range or README setup changes, also run a fresh consumer project:
  - install the packed tarball (or the published version) with the package
    manager under test, without `--legacy-peer-deps`;
  - follow only the README setup;
  - run `initializePrisma` plus a query, in ESM and CJS.
- Toolchain or CI changes (Node, npm, workflows, install policy) need the CI
  steps in a clean Linux x64 checkout as a non-root user (see Environments).
- `release.yml` cannot be run outside a real release. Its steps can be checked
  up to `npm publish --dry-run`.

## Environments, Credentials And Data

- Tests use only SQLite files they create, in temp directories or `test.db`
  at the repository root. `DATABASE_URL_TEST` overrides `test.db`; prefer an
  absolute `file:/...` URL. Never point a test at an application's database.
- No credentials are needed. Never publish from a test. For a publish dry run
  of an already published version, bump the version only in a throwaway copy,
  for example a container.
- Linux x64 as on CI: `git archive` the commit into
  `docker run --platform linux/amd64 -e CI=true --user node node:24-bookworm`.
  Use the non-root `node` user for CI parity.
- Package-manager versions change install behavior:
  - npm 12+ and pnpm 10+ block dependencies' install scripts by default;
  - npm 12 prints `npm pack --json` as an object, while npm 10/11 print an
    array;
  - pnpm 11+ does not resolve versions younger than its minimum release age
    (about a day). To test a just-published release, add a test-only
    `minimumReleaseAgeExclude` entry in the consumer's `pnpm-workspace.yaml`.

## Rules

- Run `npm run test:package` as a non-root user for full coverage. As root,
  the read-only WAL case is skipped, because root ignores file permissions. The
  smoke then prints the reason and reports `"readonlyWal":"skipped-root"`.
- Test the build of the current source (`npm run build`, then pack it), not an
  installed copy of the published package. The exception is when the published
  package itself is the subject, such as README guidance for consumers.
- Move-only refactors of the smoke must keep its output: compare the
  normalized `npm run test:package` output before and after. tsup builds CJS
  and ESM in parallel, so compare its build lines as a set.

## Evidence

- Ticket validation evidence goes in the ticket's `evidence/` folder
  (`tickets/<state>/<ticket>/evidence/`), with probe scripts next to the logs.
- Never commit `dist/`, `test.db` (or any `*.db`), `.env` or `node_modules`;
  they are gitignored.

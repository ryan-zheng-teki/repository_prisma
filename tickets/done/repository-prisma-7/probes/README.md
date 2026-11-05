# Probes (Solution Designer, 2026-11-05)

Consumer: `/tmp/drv-probe` = copy of a fresh npm 12.2.1 consumer of the published `repository_prisma@2.0.0` (Node 22.23.1, macOS arm64), with `better-sqlite3` approved and built.

| Probe | How | Observation |
| --- | --- | --- |
| Missing native module | move `node_modules/better-sqlite3/build` away; `node driver-failure-inspect.mjs explicit / lazy` | Explicit: `PrismaInitializationError` `CONNECTION_FAILED`; `onDiagnostic` cause = plain `Error`, no `code`, message `Could not locate the bindings file. Tried:` + 13 absolute paths. Lazy: the first query throws that raw `Error` (paths in the message) |
| Native module built for another Node ABI | built under Node 22 (ABI 127), run with Node 24.22.2 (ABI 137) | Explicit: `CONNECTION_FAILED`; cause `Error` `code: 'ERR_DLOPEN_FAILED'`, message `The module '<abs path>/better_sqlite3.node' was compiled against a different Node.js version ...`. Lazy: `PrismaClientKnownRequestError` with `code: 'ERR_DLOPEN_FAILED'` |
| Adapter `connect()` throwing a plain uncoded Error (dist patched in the probe copy only) | missing module, lazy and explicit | Lazy: reaches the caller unchanged. Explicit: becomes `CONNECTION_FAILED`, cause = that error |
| Adapter `connect()` throwing a `PrismaInitializationError` (coded) | `lazy-coded-error-inspect.mjs` | Lazy: Prisma rewraps it into `PrismaClientKnownRequestError` (`code` copied, not `instanceof PrismaInitializationError`) |
| pnpm minimum release age, pinned major | 2026-11-05T05:5xZ, `2.0.0` published 2026-11-04T15:10Z (~15 h); fresh dirs; `pnpm add repository_prisma@2 @prisma/client@7` with pnpm 11.28.9 and 12.16.1 | Both: "Added 1 entry to minimumReleaseAgeExclude in pnpm-workspace.yaml ... repository_prisma@2.0.0" and install `^2.0.0` (then stop at the expected `ERR_PNPM_IGNORED_BUILDS` for better-sqlite3). Unpinned on 2026-11-04 (repository-prisma-6 `evidence/API-07-pnpm11-consumer.log`): silently installed `repository_prisma 1.0.10` |
| npm release-age setting | `npx npm@12.2.1 config ls -l` | `min-release-age = null` (off by default) |

All dist patches were made in `/tmp` copies only and reverted.

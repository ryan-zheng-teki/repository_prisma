# repository_prisma 1.0.7

## Summary

This release makes root Prisma datasource selection explicit and turns SQLite WAL initialization into a truthful fail-closed readiness boundary.

## Highlights

- Bind every root-client path to one lifecycle-owned datasource identity.
- Add optional `datasourceUrl` and `onDiagnostic` initialization options.
- Normalize relative physical SQLite URLs against `process.cwd()` and verify the connected `main` database identity.
- Make `enableWAL: true` activate WAL and independently verify the effective journal mode before initialization resolves.
- Export `PrismaInitializationError` plus stable error and diagnostic types.
- Prevent raw provider causes, datasource URLs, credentials, and filesystem paths from being logged by default during initialization.
- Forward exported Prisma methods and delegates at invocation time so pre-invocation handles follow the current root/transaction owner across lifecycle changes.
- Add durable lifecycle, datasource/readiness, forwarding, public API, regression, and installed-package coverage.

## Behavior Changes

- `enableWAL: true` is now strict. Applications that previously continued after a warning must handle initialization rejection before serving traffic.
- Initializing a different normalized datasource while a root client is already bound rejects with `DATASOURCE_CONFLICT`; call and await `shutdownPrisma()` before rebinding.
- A failed readiness attempt blocks root/repository use until a corrected explicit initialization succeeds or shutdown clears the lifecycle.
- Strict WAL is supported only for physical SQLite datasources; non-SQLite and in-memory SQLite targets reject with `WAL_UNSUPPORTED_PROVIDER`.
- Relative physical SQLite file URLs are resolved from the application process's current working directory.

## Public Initialization Errors

The stable codes are `DATABASE_URL_MISSING`, `DATASOURCE_CONFLICT`, `CONNECTION_FAILED`, `DATABASE_IDENTITY_MISMATCH`, `WAL_UNSUPPORTED_PROVIDER`, `WAL_ACTIVATION_FAILED`, `WAL_VERIFICATION_FAILED`, and `CLIENT_NOT_READY`.

Raw causes are available only through the explicitly supplied `onDiagnostic` callback and may contain provider-sensitive information.

## Upgrade and Data Notes

- Package version: `1.0.7`
- Persisted-data outcome: `Directly Usable — No Migration`
- No Prisma schema, dependency, migration, or stored-data representation change is included.
- Consumers using strict WAL must provide a writable physical SQLite database and await initialization before accepting traffic.

## Validation

- Repository tests: 62/62 passed.
- Typecheck passed.
- Fresh build, npm pack, isolated install, CJS, ESM, declarations, live SQLite success/failure, and cleanup smoke passed.
- Durable test-code review passed with no findings.
- Validation confidence: 96.5%.
- Residual risk: real Windows Prisma/NTFS/UNC execution was unavailable; pure Win32 path behavior passed deterministic emulation.

## Release Method

Publish by pushing annotated tag `v1.0.7` after the finalized `main` branch is current. The repository's GitHub Actions release workflow builds and publishes `repository_prisma@1.0.7` to npm using trusted publishing.

## Rollback

If a release-blocking regression is found, stop adoption of `1.0.7`, install the previously published `repository_prisma@1.0.6`, and revert the release change on `main`. No database migration rollback is required.

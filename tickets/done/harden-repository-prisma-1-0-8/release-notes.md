# repository_prisma 1.0.8 Release Notes

## Highlights

- Query logging is now off by default; opt in with `PRISMA_LOG_QUERIES=1|true|yes|on` or `initializePrisma({ logQueries: true })`.
- Typed `logQueries` takes precedence over the environment flag, and a differing policy after lazy binding returns `LOGGING_POLICY_CONFLICT` until shutdown/rebind.
- Package imports and Prisma CLI configuration no longer load `.env`; callers provide environment configuration explicitly.
- ESM, CommonJS, declaration, packed-consumer, SQLite/WAL, lifecycle, and regression coverage passed.

## Compatibility / Operations

- No Prisma schema, migration, or persisted-data representation changed. Existing consumer data is directly usable without migration.
- Query logs can contain SQL text or sensitive values. Enable them temporarily and apply application-owned redaction and retention controls.
- The package metadata is already `1.0.8`; the documented release flow is an explicitly authorized annotated `v1.0.8` tag. No tag, publication, provenance, or deployment action was performed in this task.

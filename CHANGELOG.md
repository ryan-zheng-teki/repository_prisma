# Changelog

## 1.0.9

- Add exported `RunInTransactionOptions` support for Prisma interactive-transaction
  `maxWait`, `timeout`, and `isolationLevel` settings.
- Forward an explicitly supplied options object unchanged when the outer HOF
  transaction opens while preserving Prisma's one-argument defaults when omitted.
- Keep nested HOF calls on the existing AsyncLocalStorage transaction; inner options
  do not reconfigure the outer transaction.
- No Prisma peer-range, schema, migration, persisted-data, decorator, repository, or
  client-lifecycle changes are included.

## 1.0.8

- Make Prisma query logging opt-in with `PRISMA_LOG_QUERIES` or the typed
  `initializePrisma({ logQueries })` option; defaults are `info`, `warn`, and `error`.
- Remove automatic `.env` loading from package imports and Prisma CLI configuration.
  Applications, scripts, and CI must provide environment values explicitly.
- Reject a differing logging policy after lazy binding with
  `LOGGING_POLICY_CONFLICT`; shut down before rebinding.
- No Prisma schema, migration, or persisted-data changes are included.

Query logs may contain SQL text or sensitive values. Enable them temporarily and use
application-owned redaction and retention controls.

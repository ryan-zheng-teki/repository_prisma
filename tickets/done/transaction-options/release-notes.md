# repository_prisma 1.0.9 Release Notes

## Highlights

- Add the exported `RunInTransactionOptions` type with optional `maxWait`,
  `timeout`, and `isolationLevel` fields.
- Allow `runInTransaction(callback, options)` to forward an explicitly supplied
  options object unchanged when opening the outer Prisma interactive transaction.
- Preserve `runInTransaction(callback)` and Prisma's existing defaults when options
  are omitted.
- Keep nested HOF calls on the active AsyncLocalStorage transaction. Inner options do
  not open or reconfigure a transaction; the outer boundary remains authoritative.

## Compatibility / Operations

- Prisma continues to own wait behavior, timeout and isolation enforcement, commit,
  and rollback. This package adds no timer, retry, or nested-transaction mechanism.
- The Prisma peer range remains `@prisma/client:^5.22.0`.
- No schema, migration, datasource, persisted-data, logging, client-lifecycle,
  decorator, or BaseRepository change is included.
- Existing callback-only callers remain source and runtime compatible.

## Validation

- Implementation source review: `Pass`.
- API/E2E: `Pass` at 98.3% confidence, covering `TXO-001` through `TXO-010`.
- Proportional durable test-code review: `Pass`; no unresolved findings.
- Delivery integrated-state verification: `npm run typecheck` passed and isolated
  `npm test` passed with 8 files / 83 tests.
- Finalized-main verification repeated typecheck and the isolated 83-test suite, then
  passed fresh build/pack/install smoke for TypeScript declarations, CommonJS, and
  ESM consumers.

## Release Method And Current State

Package and lock metadata are `1.0.9`. The user explicitly verified the ticket and
authorized finalization and release. Finalized `main` commit `634bb2b` carries
annotated tag `v1.0.9`; the tag-triggered GitHub Actions workflow published through
npm trusted publishing.

Registry verification confirms `repository_prisma@1.0.9` is available as npm
`latest`, retains peer dependency `@prisma/client:^5.22.0`, and has integrity
`sha512-LY1ZkCpUQyj3kSUC7dBYjyBdezvscCOTTMNMNQFsy4g3InKlWii04hHFNMcIriDU4pQVsexx59+rDTPfN+S7YQ==`.

## Rollback

Before publication, withhold finalization if the callback-only contract, exact outer
option forwarding, nested reuse, atomic commit/rollback, or installed package surface
fails user verification. After publication, stop adoption of 1.0.9, direct consumers
back to 1.0.8, revert the finalized change on `main`, and publish a new corrective
patch rather than moving or reusing `v1.0.9`. No data-migration rollback is required.

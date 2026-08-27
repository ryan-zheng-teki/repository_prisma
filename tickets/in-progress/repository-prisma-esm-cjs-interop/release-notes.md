# repository_prisma 1.0.10 Release Notes

## Highlights

- Fix ESM package loading when `@prisma/client` is a CommonJS-generated peer whose named exports are not detectable by Node.
- Read runtime `PrismaClient` and `Prisma` values from the peer's default namespace and keep package-source Prisma type references explicitly type-only.
- Preserve the existing `import` and `require` package conditions, public exports, Prisma behavior, and peer range `@prisma/client:^5.22.0`.

## Compatibility / Operations

- No Prisma schema, migration, datasource, persisted-data, repository, transaction, lifecycle, or public API change is included.
- No fallback, `createRequire` adapter, dual runtime path, or broadened peer-version promise is introduced.
- Exact Linux ARM64/Vitest consumer execution was unavailable and remains explicitly `Not Tested`; local macOS ARM64 Node 22 synthetic-peer and packed generated-peer checks passed.

## Validation

- Implementation source review: `Pass` (`CRR-001`).
- API/E2E validation: `Pass` at `96%` final confidence (`API-REV-001`); direct dynamic CommonJS-peer ESM probe, packed CJS/ESM/Prisma smoke, full 83-test suite, and audits passed.
- Proportional API/E2E test-code review: `Not Applicable` with no findings (`CRR-002`); no repository-resident durable test file changed after `CRR-001`.
- Delivery integrated-state refresh: `origin/main` remained at `8ab582f`; the ticket branch was already current, no merge was required, and the reviewed candidate diff check passed.

## Release Method And Current State

Package and lock metadata are prepared at `1.0.10`. The repository documents the annotated tag flow: after explicit user verification and repository finalization, create and push `v1.0.10` so the tag-triggered GitHub Actions release workflow can publish through npm trusted publishing. No tag creation, npm publication, or deployment has been attempted or claimed in this delivery round.

## Rollback

Before publication, withhold finalization and release if user verification or the required final-target refresh/check exposes a regression or materially changed state. After publication, stop adoption of `1.0.10`, direct consumers to `1.0.9`, revert the finalized change on `main`, and publish a new corrective patch rather than moving or reusing the immutable `v1.0.10` tag. No data-migration rollback is required.

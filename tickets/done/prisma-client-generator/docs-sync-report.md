# Docs Sync Report — prisma-client-generator (repository-prisma-3)

## Scope

- Ticket: `prisma-client-generator`, Project Task `repository-prisma-3`
- Trigger: CRR-002 Pass (test-code review after API-REV-001), from `/software_engineering_team/code_reviewer`
- Bootstrap base reference: `origin/main@0a4e824`
- Integrated base reference used for docs sync: `origin/main@0a4e824` (fetched 2026-11-05; not advanced, branch already current)
- Post-integration verification reference: `evidence/DE-01-integrated-rerun.log`, `evidence/DE-02-prisma-client-tests-verbose.log` (branch head `2222ebb`)

## Why Docs Were Updated

- Summary: the change adds a public contract (`registerPrismaClient`, `PrismaClientRegistry`, two error codes), changes module loading (no `@prisma/client` load at import; `createRequire` default load), and adds a second typecheck program. The implementation commit `c97eab8` and the API/E2E commit `6c950bd` already updated every long-lived doc. Delivery checked each against the final code and found it accurate, so it made no further edits.
- Why this should live in long-lived project docs: app developers on Prisma 7's `prisma-client` generator need the one-time setup and the failure modes. Maintainers need the client-source ownership, the reversed "no `createRequire`" rule, the two-program typecheck and DC-002.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Usage guide (AGENTS.md) | Updated (in `c97eab8`) | `### Using the prisma-client generator`: schema, copy-paste `db.ts`, import first, `Prisma.ModelName`, the compile error, `skipLibCheck` (RSK-001), bundling (RSK-002). Testing section names the two typecheck programs and `generated/prisma-client/`. Matches DE-01/DE-02 and API-07/API-08 output |
| `README.md` § "Release (Tag-Based)" | Release guide (AGENTS.md) | No change | Steps still hold: `npm run typecheck` now runs both programs plus the program check (DE-01 exit 0); `npm ci` runs `prepare` (`prisma generate`), which writes both clients; the packed file list is unchanged (`files`: dist, README, DESIGN, CHANGELOG; smoke `packedFiles: 10`) |
| `DESIGN.md` | Architecture and rationale | Updated (in `c97eab8`) | Client source / registration rule, `createRequire` loading replacing the earlier rule, `prisma-types.ts` and `Models` view, two programs, DC-002. Checked against `src/lib/client/client-source.ts`, `lifecycle.ts`, `prisma-types.ts`, `models.ts` |
| `TESTING.md` | Testing guideline | Updated (in `c97eab8`, `6c950bd`) | Typecheck row (two programs, program check); vitest row names the prisma-client tests incl. recovery; package smoke row names `prisma-client-generator` and the four consumer modes. Commands confirmed by DE-01 |
| `CHANGELOG.md` | Release notes source | Updated (in `c97eab8`) | `## Unreleased` entry for the generator support, lazy default load, new codes, es2020 build |
| `AGENTS.md` | Doc index | No change | Still names README, DESIGN, TESTING and the release section correctly |
| `examples/prisma-client-generator/` | Documented example | Updated (added in `c97eab8`) | Compiled by the registered program (API-01, DE-01 `"examples/prisma-client-generator":2`) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | New section + testing note (by implementation) | prisma-client generator setup and limits | New public setup |
| `DESIGN.md` | Component rewrite + DC-002 (by implementation) | Client source, loading rule, types registry, two programs | Durable architecture |
| `TESTING.md` | Row updates (by implementation, API/E2E) | Typecheck, vitest, smoke rows | New test layers |
| `CHANGELOG.md` | Unreleased entry (by implementation) | Feature, codes, build target | DEC-007: no release |

Delivery made no edits; it verified the above against the final integrated state.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Client source and registration rule | `default-package` vs `registered`; conflict in bound states, accepted in `Idle`/`Failed` | `design-spec.md` | `DESIGN.md` |
| Lazy default load | `createRequire(import.meta.url)('@prisma/client')`; bundlers must keep `@prisma/client` external for the default path | `design-spec.md`, `investigation-notes.md` | `DESIGN.md`, `README.md` |
| Type registry | `PrismaClientRegistry`; `MissingTypeDeclaration` compile error | `design-spec.md`, `probes/README.md` | `DESIGN.md`, `README.md` |
| DC-002 | A type check that compiled none of its files; the program-content check | `design-spec.md` | `DESIGN.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Rule "the package adds no `createRequire` path"; static default-namespace import of `@prisma/client` | Lazy `createRequire` load in `PrismaClientSource` | `DESIGN.md` (loading section) |
| `src/lib/types-experiment.ts` | Deleted as dead code (never exported or imported, and never in the long-lived docs); the library's Prisma types now come from `src/lib/prisma-types.ts` | `DESIGN.md` § F (for `prisma-types.ts`) |
| Single `npm run typecheck` program | Two programs + `scripts/check-typecheck-programs.js` | `TESTING.md`, `DESIGN.md`, `README.md` Testing |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A: the docs were updated in this change.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification, archive, finalization into `origin/main`
- Notes: no follow-up found by delivery.

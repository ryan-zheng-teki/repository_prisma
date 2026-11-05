# Handoff: prisma-client-generator (repository-prisma-3)

- Status: `Architecture Design Complete`
- Package identifier: `prisma-client-generator`; Project Task `repository-prisma-3` (project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`)
- Current SR: `SR-006` (ARCH-REV-003 corrections on SR-005, the user-approved change on top of SR-004)
- Workspace: worktree `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3`, branch `codex/repository-prisma-3-prisma-client-generator`, base `origin/main` @ `0a4e824756e692a0f537e743549f5a4c1479d7ea` (rebased 2026-11-05 from `5a73159`), finalization target `origin/main`. Ticket documents are uncommitted in the worktree (`tickets/in-progress/prisma-client-generator/`); no source changed.
- Ticket folder: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/`

## Original request

Task repository-prisma-3 (FU-002 of repository-prisma-1): support Prisma's `prisma-client` generator before `prisma-client-js` is removed. Done when a design (and, if the user approves, an implementation) exists with tests and updated README/DESIGN, finalized on main. No release.

## Goals and constraints

- Apps on Prisma 7's `prisma-client` generator (ESM and CJS) can use every library feature with full types after a one-time setup.
- Apps on `prisma-client-js` change nothing; runtime and public types identical to 2.0.0.
- Peers, Node range, SQLite-only rule, adapter, connection gate, DateTime format, error-message safety unchanged. No version bump, tag or publish.

## Result

- Reproduced: with only the `prisma-client` generator, `import 'repository_prisma'` fails (`MODULE_NOT_FOUND .prisma/client/default`) and the library's types become `any` (`probes/README.md` P1).
- Requirements SR-001: approved by the Solution Designer within the direction (user informed).
- Design SR-002/SR-003: explicit client source (`default-package` | `registered`) owned by `PrismaClientSource`; registration rule owned by `PrismaClientLifecycle`; `Models` as a read-only view of the source; public types from `prisma-types.ts`, driven by the one-field registry `PrismaClientRegistry { client: typeof generated }` with `@prisma/client` fallback; default package loaded lazily via `createRequire(import.meta.url)`; new codes `PRISMA_CLIENT_UNAVAILABLE`, `PRISMA_CLIENT_CONFLICT`; build `es2020` + `shims`; typecheck `esnext`/`bundler`; tests with a real generated client; smoke step modules updated and one added.
- App setup (approved): `import * as generated from './generated/prisma/client'; registerPrismaClient(generated); declare module 'repository_prisma' { interface PrismaClientRegistry { client: typeof generated } }`.
- Feasibility: prototype passed the existing 113 tests, kept prisma-client-js types identical, ran ESM and CJS prisma-client apps end to end; registry-from-module-type derivation verified with `tsc`.
- Classification: `task_size` Medium; `architectural_risk` High (new public contract, module-loading change reversing a recorded DESIGN rule, lifecycle binding rule).

## SR-004 corrections (ARCH-REV-001 round 1)

- AR-001: `buildContainsFilter` returns `ContainsStringFilter` from `prisma-types.ts`, which is exactly `Prisma.StringFilter` when nothing is registered and the library-owned `{ contains: string; mode?: 'insensitive' }` for a registered client. `ModelsObject` is likewise exactly `typeof Prisma.ModelName` when nothing is registered. design-spec "AC-008 Type-Equality Inventory" lists T1..T15. Measured on the prototype: all identical, 113/113 tests pass (`probes/type-equality.typecheck.ts`). REQ-004 wording clarified, intent unchanged.
- AR-002: `PrismaClientLifecycle` constructs and owns its `PrismaClientSource` and exposes `getClientModule()`; `client.ts` composes only the lifecycle; `Models` -> facade accessor -> lifecycle -> source. Ownership Map, Boundary Encapsulation Map, Dependency Rules, DS-003 and the file rows updated.

## SR-005 delta (user-approved 2026-11-05)

- `registerPrismaClient(module: RegisteredClientModule)`: its parameter type is the module declared in `PrismaClientRegistry`; without a declaration it is `MissingTypeDeclaration`, so the call fails to compile and the message names the `declare module` block to add; a different object is rejected. Runtime check unchanged. A warning in the library's own types was measured impossible (P3 notes).
- `npm run typecheck` compiles two programs: `tsconfig.json` (excludes the registered folders; T1..T15) and new `tsconfig.prisma-client-generator.json` (`paths` `repository_prisma` -> `src/index.ts`; registered example and tests). The second generator writes to `generated/prisma-client/` (git-ignored).
- `examples/prisma-client-generator/` (copy-paste `db.ts` + demo); README guidance (copy-paste `db.ts`, import first, `Prisma.ModelName`, the compile error); TESTING.md typecheck layer; consumer-types smoke adds AC-013.
- Requirements: REQ-003, REQ-009, AC-006, AC-011, new AC-013, DEC-008. ARCH-REV-002's optional wording cleanups are included.
- The implementation engineer was asked to hold the affected parts until the re-reviewed package arrives.

## SR-006 corrections (ARCH-REV-003)

- AR-003: `tsconfig.prisma-client-generator.json` sets its own `exclude: ["node_modules", "dist"]`; `npm run typecheck` = default program, registered program, then `scripts/check-typecheck-programs.js` (fails unless the registered files are in the registered program and absent from the default one). P3 re-measured: the SR-005 run was a false pass (0 files); now files listed, pass, both negative controls fail as they must.
- AR-004: `PrismaClientModule` stays internal (not exported; not in the `.d.ts` checks); Dependency Rules corrected.
- MP-002 adopted: `RegisteredClientModule` uses `infer M extends GeneratedModule`, so declaring the instance type also gets the `MissingTypeDeclaration` hint (measured).
- Design case DC-002 (this mistake) is given verbatim in design-spec for implementation to append to `DESIGN.md`.

## Approval basis

- Requirements: Solution Designer within the direction, user informed (2026-11-04).
- Design: the user, 2026-11-05: "i agree with your technical judgement i trust your technical design capalbitiy. lets go" (DQ-001 shorter form, DQ-002, DQ-003).

## Evidence and blockers

- Evidence: `investigation-notes.md`, `probes/` (README, esm-app incl. `module-type.ts`, cjs-app, prototype diff).
- Blockers: none. Follow-ups: none.

## Open risks

RSK-001 (prisma-client apps with `skipLibCheck: false`; documented, user-approved), RSK-002 (bundlers do not trace the `createRequire` default load; registered clients unaffected), RSK-003 (declaration inlining; guarded by annotations and the registered consumer type check).

## Expected output

Architecture re-review of AR-003 and AR-004 (SR-006); on pass, the reviewer's route to implementation (which already holds the SR-004 package).

## Artifacts

- `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/requirements-doc.md`
- `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/investigation-notes.md`
- `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/design-spec.md`
- `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/solution-revision-record.md`
- `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-3/tickets/in-progress/prisma-client-generator/probes/README.md`

## Route record

- 2026-11-04: held for the user's design approval.
- 2026-11-05: user approved; handoff rule `architectural_risk=High` -> `/software_engineering_team/architecture_reviewer`.
- 2026-11-05: ARCH-REV-001 round 1 Fail (AR-001, AR-002) -> SR-004 -> back to `/software_engineering_team/architecture_reviewer` for re-review.
- 2026-11-05: ARCH-REV-002 Pass (SR-004; report `design-review-report.md`, record `architecture-review-revision-record.md`). The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`; not repeated here. Optional wording cleanups it noted (design-health response and Change Sequence step 3 still use SR-003 source wording; DS-005 does not list `buildContainsFilter`) are left as they are: the file mapping, ownership sections and AC-008 inventory are authoritative.
- 2026-11-05: ARCH-REV-002 Pass routed to implementation. The user then approved SR-005 (registration tied to the declaration, README guidance, example). The implementation engineer was asked to hold the affected parts; SR-005 goes to `/software_engineering_team/architecture_reviewer` for re-review.
- 2026-11-05: ARCH-REV-003 Fail (AR-003, AR-004) -> SR-006 -> back to `/software_engineering_team/architecture_reviewer`.
- 2026-11-05: ARCH-REV-004 Pass (SR-006; report `design-review-report.md`). The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`, with the note that the program-content check should also fail when a registered folder is empty; not repeated here.

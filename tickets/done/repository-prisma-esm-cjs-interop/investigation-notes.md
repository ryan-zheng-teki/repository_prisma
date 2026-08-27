# Investigation Notes

## Bootstrap Context

- Repository: `repository_prisma`
- Workspace root: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop`
- Repository mode: Git repository
- Current branch/worktree: `codex/repository-prisma-esm-cjs-interop` in the dedicated worktree above
- Resolved base: `origin/main` after `git fetch origin --prune`
- Base commit: `8ab582f docs: record repository_prisma 1.0.9 release`
- Expected finalization target: this ticket branch, then the repository's normal release/tag workflow; no direct finalization onto `main` from this worktree
- Local platform: macOS ARM64; reported consumer platform is Linux ARM64 and was not available locally

## Investigation Status

`Complete for design review`. The reported defect class is confirmed by the emitted baseline artifact plus a synthetic CommonJS peer probe. The exact downstream Linux/Vitest workspace was not available, so the investigation distinguishes local native success from portable compatibility evidence.

## Sources Consulted

| Source | Type | Material Finding |
| --- | --- | --- |
| `AGENTS.md` | Repository instruction | README is primary usage/release guide; DESIGN documents architecture/rationale. |
| `README.md` | Repository documentation | Package usage, behavior-preservation constraints, and tag-based release procedure. |
| `DESIGN.md` | Repository design | Existing lifecycle, transaction, repository, and forwarding-proxy ownership boundaries. |
| `package.json` | Package manifest | Version `1.0.9`; ESM import points to `dist/index.mjs`; CJS require points to `dist/index.js`; `@prisma/client` is a `^5.22.0` peer. |
| `tsconfig.json` | Build/type configuration | TypeScript source uses CommonJS module mode with `esModuleInterop: true`; type-only imports can be erased. |
| `tsup.config.ts` | Build configuration | tsup emits externalized CJS and ESM bundles from `src/index.ts`, with `@prisma/client` external. |
| `src/lib/client/lifecycle.ts` | Runtime owner | Named runtime `PrismaClient` import constructs the raw root client. |
| `src/lib/models.ts` | Runtime public value | Named runtime `Prisma` import provides `Models = Prisma.ModelName`. |
| `src/lib/base-repository.ts`, `context.ts`, `prisma-manager.ts`, `repository-factory.ts`, `types-experiment.ts` | Type/source modules | Several named imports are type-only and should be explicit `import type`. |
| `scripts/run-package-smoke.js` | Package validation | Existing pack/install/CJS/ESM/declaration smoke coverage; synthetic interop regression is not present. |
| `scripts/run-tests.js` and `src/tests/*` | Local test harness | Prisma schema generation and Vitest coverage; runtime test imports include named Prisma values in three tests. |
| `.github/workflows/release.yml` | Release workflow | A pushed `v*.*.*` tag builds and publishes through npm trusted publishing. |
| `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/interop-probe-results.md` | Supplemental runtime evidence | Baseline emitted imports, local native/Vitest results, synthetic CJS failure, registry metadata, and complete import inventory. |
| npm registry metadata for `repository_prisma@1.0.9` | Published artifact evidence | Version `1.0.9` and peer `@prisma/client:^5.22.0` are published; baseline tarball carries unsafe named ESM imports. |

## Commands / Setup

- `git fetch origin --prune`
- `git worktree list`
- `git worktree add -b codex/repository-prisma-esm-cjs-interop /Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop origin/main`
- `node --version` -> `v22.23.1`
- `pnpm --version` -> `10.28.2`
- `npm ci`
- `npm run build`
- `rg -n "@prisma/client|PrismaClient|Prisma\\." src examples scripts dist package.json tsconfig.json tsup.config.ts`
- `node` probes for CommonJS namespace keys and ESM import behavior
- `npx vitest run src/interop-repro.test.ts --no-watch` using a temporary test file; it passed with the locally generated client and the file was removed
- Node `--experimental-loader` probe mapping `@prisma/client` to a temporary dynamic CommonJS stub; it failed current ESM output with the named-export error and temporary files were removed
- `npm view repository_prisma@1.0.9 version dist.tarball dist.integrity peerDependencies --json`
- `npm pack repository_prisma@1.0.9`

## Stable Relevant Behavior Inventory

| Behavior ID | Supported Trigger / Contract | Current Path / Verified Absence | Desired / Preserved Outcome | Evidence Status |
| --- | --- | --- | --- | --- |
| `BE-001` | ESM consumer imports package entrypoint under package `exports.import` | Consumer -> `dist/index.mjs` -> external `@prisma/client`; emitted named imports at lifecycle/models fail when peer named exports are not detectable. | ESM entrypoint uses the peer's CJS default namespace and loads without named-export heuristics. | Confirmed by `interop-probe-results.md` synthetic-peer failure. |
| `BE-002` | Source compiler builds type-only Prisma references | `base-repository.ts`, `context.ts`, `prisma-manager.ts`, `repository-factory.ts`, `types-experiment.ts` use regular imports even where values are never read. | Type-only imports erase from runtime output; declarations preserve type surface. | Confirmed by source read; target to validate after build. |
| `BE-003` | CJS consumer requires package entrypoint | `dist/index.js` uses `require('@prisma/client')`; baseline CJS probe succeeds. | CJS entrypoint and public export shape remain successful. | Baseline and existing package smoke. |
| `BE-004` | Prisma-backed consumer initializes/repositories execute after import | Existing source integration path uses lifecycle -> PrismaClient -> repositories/proxy; reported downstream failure occurs before tests run. | Module load completes and the existing path reaches initialization/query execution. | Reported downstream symptom plus existing package smoke/integration coverage. |
| `BE-005` | Release contract publishes pushed `v*.*.*` tags | `package.json`/tag `v1.0.9` represent unsafe release; workflow publishes build output on tag. | Prepare version `1.0.10`; only claim publication with registry evidence. | Confirmed by manifest, tag, and workflow read. |

## Relevant Production Path / Spine Evidence

### Primary ESM load spine (`DS-001`)

`ESM consumer/Vitest loader -> package exports.import -> dist/index.mjs -> lifecycle/models runtime values -> external CommonJS @prisma/client namespace -> package public exports -> consumer's Prisma-backed initialization/query`

The edited segment is the runtime import boundary, but the spine extends through the package public surface and a meaningful Prisma-backed operation so the design can preserve the actual blocked behavior.

### CommonJS load spine (`DS-002`)

`CommonJS consumer -> package exports.require -> dist/index.js -> require('@prisma/client') -> package public exports -> existing Prisma-backed operation`

### Return/error spine (`DS-003`)

`Peer module link/load result -> package initialization or module-load error -> consumer test runner observes load success or genuine downstream failure`

### Bounded local build/validation spine (`DS-004`)

`source imports -> tsup externalized CJS/ESM artifacts -> npm pack/install -> synthetic peer and generated-peer probes -> assertions`

## Current-State Architecture Findings

- This is a public package boundary bug, not a repository or transaction-ownership redesign.
- `src/index.ts` is a thin export barrel. The runtime owner for `PrismaClient` is `PrismaClientLifecycle`; the runtime owner for `Prisma.ModelName` is the `Models` value in `models.ts`.
- `@prisma/client` is correctly externalized because each consumer must provide its generated peer. That makes ESM/CJS import form part of the package's compatibility contract.
- The CJS artifact already uses `require` and does not depend on ESM named-export linking. The ESM artifact is unsafe because externalized named imports depend on Node/Vitest's CJS static-export detection.
- No boundary bypass, duplicated transaction policy, or ownership drift is exposed by this change. No broad refactor is needed.
- Type-only imports should be made explicit to prevent future bundler settings from accidentally retaining runtime peer imports.

## Root-Cause Classification

- Change posture: `Bug Fix` with a small packaging/runtime compatibility correction.
- Current design issue: `Yes`, localized at the external CommonJS peer boundary.
- Root cause: `Legacy Or Compatibility Pressure` / local implementation defect — the ESM bundle uses named imports against a CommonJS peer and relies on heuristic named-export detection.
- Refactor posture: `Refactor needed now` only for the import boundary cleanup; no subsystem or ownership refactor.
- Deferred refactor: None required for the in-scope path.

## Reproduction / Runtime Findings

See the canonical supplement `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/interop-probe-results.md` for commands and output.

Summary:

1. Baseline build emits `import { PrismaClient } from "@prisma/client"` and `import { Prisma } from "@prisma/client"` in `dist/index.mjs`.
2. Native Node and a direct local Vitest probe pass with the locally generated Prisma client because that client exposes statically detectable names.
3. Replacing the peer with a dynamic CommonJS `module.exports` object makes the current ESM artifact fail at module linking with `The requested module '@prisma/client' does not provide an export named 'Prisma'`.
4. Therefore the issue is real as a portability/reliability defect even though local native behavior is green; the exact reported Linux ARM64 workspace was not available.

## External / Upstream Findings

- `@prisma/client@5.22.0` is a CommonJS-generated client with `main: default.js`; its generated implementation exports properties through CommonJS assignment. Node can synthesize named exports from some static assignment shapes, but the package contract is a default CommonJS namespace for reliable interop.
- The npm registry currently reports `repository_prisma@1.0.9`; no patched version was found during this investigation.

## Persisted Data / State Analysis

- Stored subject/location: consumer Prisma databases and generated schema state.
- Relevant change: JavaScript import syntax, generated distribution, tests, docs, and release metadata only.
- Normal readers/writers: unchanged Prisma repositories/client lifecycle.
- Required semantics/invariants: transaction atomicity, repository CRUD, client lifecycle, and all persisted values remain unchanged.
- Physical-store/operational constraints: no database access or migration should be introduced by this fix.
- Decision: `Not Affected`.

## Supplemental Artifact Inventory

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Status / Approval Applicability |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/interop-probe-results.md` | Durable baseline/synthetic-peer runtime evidence and source import inventory | `REQ-001`, `REQ-005`; `AC-001`, `AC-005` | Complete / `N/A` — evidence only |

## Open Unknowns / Risks

- The exact downstream Vitest module-resolution configuration and Linux-generated client file shape were not available; the synthetic peer proves the underlying unsafe assumption, but final validation should include the emitted package and any available consumer-like probe.
- npm publication credentials or the user's desired release authorization may not be available. The repository workflow can prepare `1.0.10`; publication must remain an evidence-gated delivery step.
- A default import still requires the peer to provide the expected `Prisma`/`PrismaClient` properties at runtime; this is the existing declared peer contract and is not silently normalized or polyfilled.

## Notes For Architecture Reviewer

- Requirements are `Design-ready` and user-approved by the explicit “if true lets fix it” direction.
- The intended fix is deliberately narrow: safe default import/destructure for runtime values, explicit `import type` for type-only references, a synthetic CommonJS-peer regression check, and patch release metadata.
- No compatibility wrapper, fallback branch, schema/data migration, peer-range change, or downstream application edit is authorized.

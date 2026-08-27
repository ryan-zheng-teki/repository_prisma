# Requirements Doc

## Status

`Design-ready` — the user's request explicitly authorizes fixing the issue if investigation confirms it. The evidence confirms the defect class and the scoped clean-cut fix below.

## Goal / Problem Statement

Validate and correct the ESM/CommonJS interop failure reported for `repository_prisma` when consumed by Node 22 and Vitest 4 with the CommonJS-generated `@prisma/client` 5.22.0. The package must remain usable through its published import and require entrypoints without changing Prisma behavior.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BE-001` | The built ESM entrypoint contains named runtime imports from `@prisma/client` for `PrismaClient` and `Prisma`. Native Node may detect those names in one generated CommonJS shape, but a CommonJS peer without detectable named exports fails module linking before package initialization. | The ESM entrypoint loads using the CommonJS namespace default and destructures required runtime values, so loading does not depend on CJS named-export detection. | Public package exports and Prisma-backed behavior remain unchanged. | `REQ-001`, `REQ-002`; `AC-001`, `AC-005` |
| `BE-002` | Type-only Prisma references are written as regular imports in several source files, leaving runtime-import ambiguity even where no value is needed. | Type-only references use explicit `import type`; only the two required runtime values use the interop-safe default import. | TypeScript type contracts and generated declarations remain unchanged. | `REQ-002`, `REQ-005`; `AC-005`, `AC-006` |
| `BE-003` | The CommonJS package entrypoint uses `require('@prisma/client')` and is loadable in the baseline environment. | CommonJS loading and all existing public exports remain successful after the source import cleanup. | Existing CJS behavior and public API. | `REQ-003`, `REQ-004`; `AC-002`, `AC-003` |
| `BE-004` | Prisma-backed consumers can fail during package loading, before tests execute, blocking integration/E2E validation. | Prisma-backed consumers reach package initialization and Prisma-backed execution; any later failure is a genuine consumer/database/test failure. | Repository semantics, transaction routing, lifecycle behavior, and persisted data are unchanged. | `REQ-004`, `REQ-005`; `AC-004` |
| `BE-005` | Version `1.0.9` is published and its tag-based release has the unsafe ESM artifact. | A new patch version is prepared according to the tag-based release workflow; publication is claimed only with registry evidence. | Peer range remains `@prisma/client:^5.22.0`; no release shortcut or compatibility wrapper is retained. | `REQ-006`; `AC-006` |

## Requirements

| Requirement ID | Requirement |
| --- | --- |
| `REQ-001` | The package's ESM runtime entrypoint must load successfully in Node 22 with `@prisma/client` 5.22.0 resolved as CommonJS, without relying on named-export detection from that CommonJS module. |
| `REQ-002` | All runtime Prisma/PrismaClient imports in package source must use an interop-safe default import of `@prisma/client` followed by explicit destructuring; all references that are only types must use `import type` and must not create runtime imports. |
| `REQ-003` | The package's CommonJS runtime entrypoint and existing public exports must remain loadable and functionally compatible. |
| `REQ-004` | Prisma-backed repository functionality, lifecycle behavior, transaction behavior, and public export shape must remain unchanged after the interop correction. |
| `REQ-005` | Focused automated checks must exercise the built ESM and CommonJS entrypoints, including an ESM probe with a CommonJS peer whose properties are not statically detectable as named ESM exports, and must retain package/type smoke coverage. |
| `REQ-006` | The package metadata/changelog must identify the next patch release (`1.0.10`) and the final handoff must distinguish a prepared release from a version actually published to npm. |

## Acceptance Criteria

| Acceptance Criteria ID | Scenario / Expected Outcome | Related Requirements / Behaviors |
| --- | --- | --- |
| `AC-001` | A Node 22 ESM consumer imports the built package successfully when `@prisma/client` is supplied as a CommonJS namespace whose `Prisma` and `PrismaClient` properties are not exposed as statically detectable ESM named exports. No `Named export 'Prisma' not found`/`does not provide an export named` error occurs. | `REQ-001`, `REQ-005`; `BE-001` |
| `AC-002` | A CommonJS consumer requires the built package successfully and can access its existing public exports. | `REQ-003`; `BE-003` |
| `AC-003` | Existing package smoke coverage builds and installs the package, validates packed files/declarations, and exercises both CJS and ESM consumers with the generated Prisma peer. | `REQ-003`, `REQ-005`; `BE-003` |
| `AC-004` | A Prisma-backed package operation or existing integration path reaches execution after module loading, with no interop-induced API shape or repository behavior change. | `REQ-004`, `REQ-005`; `BE-004` |
| `AC-005` | Emitted ESM contains no unsafe named runtime import from `@prisma/client`; only a default namespace import is used for runtime values, and type-only sources emit no peer runtime import. | `REQ-002`; `BE-001`, `BE-002` |
| `AC-006` | `npm run typecheck`, focused Vitest/package smoke checks, and the existing test suite pass after the change; the peer range remains unchanged and release metadata identifies `1.0.10`. | `REQ-002`–`REQ-006`; `BE-002`, `BE-003`, `BE-005` |
| `AC-007` | The final handoff reports the prepared tag/package state and does not claim npm publication unless registry evidence confirms `repository_prisma@1.0.10` is available. | `REQ-006`; `BE-005` |

## Persisted Data Outcome

- Decision: `Not Affected`.
- Stored subject/location: None changed by this module-loading fix.
- Required outcome: Consumer databases and Prisma schema/migrations remain untouched; no migration, rebuild, or data rewrite is permitted.
- Unacceptable loss: Any change to repository persistence, transaction atomicity, or lifecycle semantics caused by the interop fix.

## Scope Guardrail

### In-Scope Use Cases

- `UC-001`: An ESM consumer imports the package through the published `exports.import` path under Node 22/Vitest 4 with CommonJS `@prisma/client`.
- `UC-002`: A CommonJS consumer requires the package through `exports.require` and uses existing exports.
- `UC-003`: A Prisma-backed consumer initializes and executes existing repository/transaction functionality after package loading.
- `UC-004`: The package build, packed artifact, declarations, and patch-release metadata are validated.

### Out of Scope

- Changing Prisma schema, generated client behavior, repository semantics, token-usage pricing rules, or GraphQL application code outside this package.
- Supporting arbitrary Prisma major versions beyond the declared peer dependency.
- Changing package export names, adding an alternate compatibility wrapper, or retaining dual runtime import paths.
- Rewriting persisted data or changing database migrations.
- Claiming or performing npm publication without the repository's release operation and evidence.

### Preserved Behavior Boundary

- Existing public exports, TypeScript declarations, repository operations, transaction semantics, client lifecycle/readiness, forwarding proxies, and CommonJS consumers remain functionally unchanged.
- The package continues to expose separate `import` and `require` entrypoints as declared by `package.json`.
- Only module-loading mechanics, explicit type-only import annotations, regression coverage, documentation, and patch-release metadata may change.

### Review Authority

- This requirements basis plus `investigation-notes.md` and `interop-probe-results.md` are authoritative for the fix. The design spec derives the implementation structure from them.
- Architecture review must confirm the design without expanding scope. A new compatibility promise, peer-version policy, or downstream application change is a requirement gap rather than an automatic design correction.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-001` |
| `REQ-002` | `UC-001`, `UC-002`, `UC-004` |
| `REQ-003` | `UC-002`, `UC-003` |
| `REQ-004` | `UC-003` |
| `REQ-005` | `UC-001`–`UC-004` |
| `REQ-006` | `UC-004` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Synthetic CommonJS peer ESM-link probe with no named-export detection. |
| `AC-002` | Built CJS require probe and export-shape assertion. |
| `AC-003` | Existing installed-package smoke for packed CJS/ESM/declarations. |
| `AC-004` | Existing package/integration operation reaches Prisma execution. |
| `AC-005` | Emitted-artifact import audit and type-only import verification. |
| `AC-006` | Full local quality and unchanged peer/release checks. |
| `AC-007` | Release/publication evidence status. |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop/interop-probe-results.md` | Durable baseline and synthetic-peer runtime evidence | `REQ-001`, `REQ-005`; `AC-001`, `AC-005` | Evidence confirms the defect class and constrains the fix; it does not add intended behavior. | Complete / `N/A` — evidence only |

## Approval Status

`Approved by user direction` — the request says to fix the issue if analysis confirms it; investigation confirms it. The intended scope is therefore locked for design review, subject to architecture-review findings that trace to these IDs.

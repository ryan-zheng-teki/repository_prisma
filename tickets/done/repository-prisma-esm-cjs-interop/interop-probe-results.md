# ESM/CommonJS Interop Probe Results

## Purpose

Retain the runtime evidence for the reported `repository_prisma` package-load failure. This is an evidence supplement, not an additional behavior authority; approval applicability is `N/A`.

## Environment

- Repository worktree: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-esm-cjs-interop`
- Node: `v22.23.1`
- Vitest: `4.0.18`
- Installed peer: `@prisma/client@5.22.0`
- Local platform: macOS ARM64 (`vitest/4.0.18 darwin-arm64`); the reported failure platform is Linux ARM64 and was not available locally.
- Package baseline: source at `origin/main` commit `8ab582f`, package version `1.0.9`, tag `v1.0.9`.

## Commands And Findings

### 1. Baseline build emits named ESM imports

```text
npm ci
npm run build
rg -n 'from "@prisma/client"|import \\{ Prisma|import \\{ PrismaClient' dist/index.mjs
```

Observed emitted runtime imports:

```text
109: import { PrismaClient } from "@prisma/client";
808: import { Prisma } from "@prisma/client";
```

The CJS artifact uses `require("@prisma/client")`, so the format split itself is not symmetric: only the ESM artifact relies on CJS named-export detection.

### 2. Local native Node and Vitest probes with the generated peer

```text
node esm-prisma-probe.mjs
node esm-repository-probe.mjs
npx vitest run src/interop-repro.test.ts --no-watch
```

The local generated Prisma client exposes statically detectable `Prisma` and `PrismaClient` names, so native Node and the focused local Vitest probe passed. This does not establish a portable contract: CommonJS named exports in an ESM import are heuristic/static-analysis interop, not ESM exports guaranteed by the peer package.

### 3. Synthetic CommonJS peer with no statically detectable named exports

A temporary peer stub used dynamic assignment:

```js
class PrismaClient {}
const Prisma = { ModelName: {} };
const client = { PrismaClient, Prisma };
module.exports = client;
```

The loader mapped `@prisma/client` to that stub and ran:

```text
node --no-warnings --experimental-loader ./interop-loader.mjs ./interop-cjs-peer.mjs
```

Current `dist/index.mjs` failed before package initialization:

```text
SyntaxError: The requested module '@prisma/client' does not provide an export named 'Prisma'
```

This is the same failure class as the reported `Named export 'Prisma' not found` error. A default import would receive the complete CommonJS `module.exports` object and avoid this named-export link failure.

### 4. Published baseline confirmation

```text
npm view repository_prisma@1.0.9 version dist.tarball dist.integrity peerDependencies --json
npm pack repository_prisma@1.0.9
```

The registry reports `repository_prisma@1.0.9` with peer dependency `@prisma/client:^5.22.0`; its unpacked `dist/index.mjs` contains the same named imports at `src/lib/lifecycle` and `src/lib/models` output locations.

## Source Runtime-Import Inventory

Runtime-relevant imports in the package source:

| Source | Current Import Kind | Runtime Need | Target |
| --- | --- | --- | --- |
| `src/lib/client/lifecycle.ts` | Named `PrismaClient` import | Yes; constructs root client | Default-import package, destructure `PrismaClient` |
| `src/lib/models.ts` | Named `Prisma` import | Yes; reads `Prisma.ModelName` | Default-import package, destructure `Prisma` |
| `src/lib/base-repository.ts` | Named `Prisma`, `PrismaClient` | No; type-only | Convert to `import type` |
| `src/lib/context.ts` | Named `Prisma` | No; type-only | Convert to `import type` |
| `src/lib/prisma-manager.ts` | Named `PrismaClient`, `Prisma` | No; type-only | Convert to `import type` |
| `src/lib/repository-factory.ts` | Named `Prisma` | No; type-only | Convert to `import type` |
| `src/lib/types-experiment.ts` | Named `PrismaClient`, `Prisma` | No; unused type experiment | Convert to `import type` |
| `src/lib/client.ts`, `src/lib/client/sqlite-readiness.ts`, `src/lib/client/logging-policy.ts`, `src/lib/filters.ts`, `src/lib/prisma-proxy.ts`, `src/lib/decorators.ts` | Type-only imports | No | Preserve type-only form |

Tests that use runtime Prisma values are test-only and are not emitted into the package; they will be changed to the same default-import/destructure style where they import runtime values so the repository's own Vitest sources do not preserve unsafe named runtime imports.

## Assessment

The report is substantively true. The current package is loadable in the local generated-client environment only because Node/Vitest happen to detect named properties in that generated CommonJS shape. The published ESM artifact has an unsafe dependency on that detection. The proportionate fix is to remove runtime named imports from the package and use the CommonJS namespace default, while making all type-only imports explicit and adding a synthetic-peer regression probe.

## Approval Applicability

`N/A` — evidence supplement only; intended behavior remains in `requirements.md`.

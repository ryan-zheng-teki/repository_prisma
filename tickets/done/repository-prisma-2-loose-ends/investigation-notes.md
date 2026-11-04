# Investigation Notes

## Investigation Meta

- Package identifier: `repository-prisma-2-loose-ends` (Project Task `repository-prisma-2`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Request: five small follow-ups from repository-prisma-1 and repository-prisma-5
- Workspace root: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends`
- Repository mode: `Git`
- Task worktree / branch: the workspace root above, branch `codex/repository-prisma-2-loose-ends` (no upstream)
- Resolved base: `origin/main@aa933e0a6d6a89d685d95ed2642438282d5b39e3` (after `git fetch origin --prune`, 2026-11-04; published 2.0.0 = `c308d3c` is its ancestor)
- Finalization target: `origin/main`
- Bootstrap result: Completed
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md` (all read in full in this conversation on 2026-11-04)
- Investigation status: Complete

## Initial Request

Task repository-prisma-2 (Project Task Manager, on behalf of the user). Items:

1. CI and release workflows on Node 20 (EOL 2026-04-30) -> Node 22 LTS or 24.
2. `npm run test:package` fails as root (read-only WAL step) -> skip with a logged reason, or another technique.
3. README release guide: name `main` as the finalization target and list the pre-tag checks.
4. `DESIGN.md`: add a "Design cases" section with the transaction-isolation case.
5. (comment) `npm audit` reports 9 advisories -> update the tooling, remove the unused `uuid`, record in the CHANGELOG.

Done when: all items are done, CI is green on `main`, the change is merged and cleaned up, no release.

## Source Log

| Date | Type | Source / Command | Finding |
| --- | --- | --- | --- |
| 2026-11-04 | Code | `.github/workflows/ci.yml`, `release.yml` | Both `node-version: 20`, `actions/checkout@v4`, `actions/setup-node@v4`. Release: `npm i -g npm@11.5.1`, then `npm ci`, build, `npm publish --provenance --access public` |
| 2026-11-04 | Code | `scripts/run-package-smoke.js:522-552` | Non-Windows CJS case: chmod 0444 db / 0555 dir, then `initializePrisma({ enableWAL: true })` must reject `WAL_ACTIVATION_FAILED` without a cause, with a diagnostic carrying the cause. Root ignores the permissions (upgrade evidence `API-04-ci-node20-root.log`). |
| 2026-11-04 | Code | `src/tests/client-lifecycle.test.ts:123` | `WAL_ACTIVATION_FAILED` mapping is also covered in vitest (fake client), independent of uid |
| 2026-11-04 | Code | `grep -rn uuid package.json tsup.config.ts src scripts examples` | `uuid` only in `dependencies`, `@types/uuid` in devDependencies, `'uuid'` in tsup `external`; no import anywhere |
| 2026-11-04 | Command | `npm audit --json` (worktree, after `npm ci`) | 9 advisories; all `fixAvailable: true` within semver: vitest (critical, direct), vite, rollup, postcss, nanoid, picomatch, source-map-js (high), @vitest/mocker, uuid 13.0.0 (moderate, direct) |
| 2026-11-04 | Doc | `README.md` "Release (Tag-Based)" | Tag must match version; `git tag -a vX.Y.Z`; `git push origin main --follow-tags`; no pre-tag checks; no finalization target named |
| 2026-11-04 | Doc | `tickets/done/release-2-0-0/release-deployment-report.md` | Practice used for 2.0.0: release commit on `main`; fresh `npm ci`, typecheck, test, build, test:package (non-root); CI green on `main` before tagging; tag; workflow; `npm view` check; propagation lag ~50 s |
| 2026-11-04 | Web/API | `gh api repos/actions/{checkout,setup-node}/releases`, `action.yml@v5` | Latest majors v7. v5 (5.1.0, 2026-07-20) runs on `node24`. setup-node v7 "Remove dummy NODE_AUTH_TOKEN export"; checkout v6 persists credentials to a separate file |

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established |
| --- | --- | --- | --- |
| `/tmp/rp2-probe` (`git archive aa933e0`), `npm uninstall uuid @types/uuid`; `npm audit fix` with npm 10.9.8 | dependency fix | npm 10.9.8 crashes: `TypeError: Cannot read properties of null (reading 'edgesOut')` at arborist `build-ideal-tree.js:1289` (`#loadPeerSet`); `npm update` crashes the same way | Reproduced |
| same, `npx npm@11 audit fix` (11.21.1) | dependency fix | `found 0 vulnerabilities`. Resolves vitest 4.1.12, @vitest/mocker 4.1.12, vite 8.3.5, rollup 4.67.5, postcss 8.5.32, nanoid 3.3.20, picomatch 4.0.7, source-map-js 1.2.2. package.json ranges unchanged apart from the uuid removal. | Measured |
| same, then `rm -rf node_modules && npm ci` (npm 10.9.8, Node 22.23.1), typecheck, `npm test`, `npm run test:package` | new lockfile with the repo's current toolchain | `npm ci` ok, 0 vulnerabilities; 11 files / 113 tests; both package checks `"result":"pass"`; `uuid` occurs 0 times in `dist/index.{js,mjs}` | Reproduced |
| official Node v24.22.2 darwin-arm64 (SHA-256 verified), bundled npm 11.19.1, in `/tmp/rp2-probe`: `npm ci`, typecheck, test, build | CI on Node 24 | `npm ci` warns that install scripts of `fsevents` and `prisma` (preinstall) are not approved; `prepare` still runs `prisma generate`; typecheck ok; 113/113; build ok | Reproduced |

Temporary diagnostics: none. All probes ran in `/tmp`.

## Persisted Data And State Facts

Not affected. No schema, runtime source or data change.

## Notes For Architecture Design

- The workflow change can only be proven on GitHub (CI on push). The release workflow can only be proven at the next release (not in this Task).
- The npm 10 arborist crash means the lockfile update must be produced with npm 11. The resulting lockfile installs fine with npm 10 (Measured).

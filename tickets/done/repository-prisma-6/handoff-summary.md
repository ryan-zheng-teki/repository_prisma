# Delivery Handoff Summary — repository-prisma-6

## Status

Verified from evidence and merged into `main` (`5a73159..1fa3292`, pushed). Post-merge CI run `41878633972` passed, with `npm ci --strict-allow-scripts` succeeding (AC-005). Cleanup is done. No release, tag or version bump (version stays `2.0.0`).

## Classification And Route

- `task_size = Medium`, `architectural_risk = Low`, route `Direct`
- Architecture review and code review: `N/A — not applicable`. Test-code review: not required.
- API/E2E: API-REV-001 Pass, final confidence 95% (every category ≥ 94%)

## Candidate

- Repository: `/Users/normy/autobyteus_org/repository_prisma`
- Ticket worktree (removed after finalization): `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6`
- Branch: `codex/repository-prisma-6-smoke-split-install-scripts`; base `origin/main@5a73159`
- Code: `8ef7b77`, `23b23f3`, `b87252c`, `7047cdf`. IR handoff: `72ef918`. API/E2E and TESTING.md: `157f5ee`.
- Finalization target: `origin/main` (fast-forward)

## What Changed

- Package smoke split into a 43-line runner and 8 modules (largest 222 lines). Output is unchanged, and the smoke now reads npm 12's `npm pack --json` object shape.
- `package.json` `allowScripts` approves only `better-sqlite3@12.11.1` and denies `esbuild`, `prisma`, `@prisma/engines` and `fsevents`. CI runs `npm ci --strict-allow-scripts`.
- README: consumer native-build steps for npm 12+, pnpm 11+ and pnpm 10; pnpm adds `@prisma/client` directly; the maintainer policy.
- CHANGELOG `## Unreleased` updated. New `TESTING.md`, named in `AGENTS.md`.

## What Reaches Consumers

- Nothing until the next release: the published 2.0.0 is unchanged.
- The README guidance is visible on GitHub now, and on npm with the next release.
- The `allowScripts` field ships in `package.json` with the next release, but npm reads it only from the root project, so it has no effect on consumers (API-08, API-11).
- Releasing a patch is a separate user decision. It would also ship the `uuid` removal from repository-prisma-2.

## Delivery-Stage Integration

- `git fetch origin` (2026-11-04 ~17:30Z): `origin/main` = `5a73159`, not advanced. Method: `Already current`.
- DE-01 on `157f5ee` (macOS arm64, Node 22.23.1, non-root):
  - `npx npm@11.19.1 ci --strict-allow-scripts` (CI's npm) exits 0, with 0 install-script warnings and the native module built.
  - typecheck 0; tests 113/113; build 0; `test:package` (npm 10.9.8) both pass with `"readonlyWal":"pass"`; diff-check ok.

## Verification From Evidence

Sufficient. Every critical AC is proven: AC-001, 002, 003, 004 and 006 directly; AC-005 up to the merge, with the post-merge CI run in the release report. The per-criterion table is in `release-deployment-report.md`. No user check is needed.

## Residual Risks

- No Windows consumer was run.
- FU-003: pnpm 11+/12 resolve the previous major for about a day after each release, because of pnpm's minimum release age.
- FU-001: a missing native module surfaces only as a generic `CONNECTION_FAILED`; the cause is visible only through `onDiagnostic`.
- FU-002: the consumer autobyteus-server-ts lacks `better-sqlite3` in `onlyBuiltDependencies`; it was already sent.
- The smoke-size follow-up from repository-prisma-2 (its FU-001) is resolved in substance by this split; the largest file is 222 lines.

## Follow-ups

`follow-ups.md`: FU-001..FU-003. The Solution Designer sends the unsent ones.

## Artifact Package (archived)

Folder: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/repository-prisma-6/`. It holds requirements, investigation, design, solution history, probes, implementation handoff and record, API/E2E documents, delivery documents, `evidence/` (IMP-*, API-*, DE-*) and `follow-ups.md`. Project documents: `/Users/normy/autobyteus_org/repository_prisma/TESTING.md` (created) and `AGENTS.md`.

# Handoff: release-2-0-0 — Release Requested

- Package identifier: `release-2-0-0` (Project Task `repository-prisma-5`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Classification: `Release Requested` (merged work, no software change)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Route: `/software_engineering_team/delivery_engineer` (Release Requested rule), 2026-11-04

## The User's Request

The user, 2026-11-04: "release the Prisma version." The Prisma 5.22 -> 7.10.1 upgrade (repository-prisma-1) is merged on `main` at `f091ee1` but not released; npm `latest` is `1.0.10`. Releasing it unblocks the consumer upgrade autobyteus-382 (autobyteus-server-ts).

- Release kind: stable, published to npm (`latest`).
- Version: **2.0.0**. Confirmed by the Solution Designer. `CHANGELOG.md` "Unreleased (breaking: requires a major release)" lists 3 explicitly breaking public changes:
  - Prisma 7 peers, including the new `@prisma/adapter-better-sqlite3`;
  - SQLite only, with `UNSUPPORTED_DATASOURCE_PROVIDER`;
  - an `engines.node` declaration and the TS minimum.
  It also lists behavior changes: transaction serialization (P2028 after `maxWait`; `rootPrismaClient` inside a transaction callback times out) and SQLite URL engine parameters no longer effective. Semantic versioning requires a major bump from 1.0.10, which matches the team's recommendation. No different choice to report.
- Include: everything on `main` at `f091ee1`. Leave out: nothing.

## Constraints (from the Task)

- Follow README "Release (Tag-Based)" only (annotated `vX.Y.Z` tag matching `package.json` `version`; push triggers `.github/workflows/release.yml` with npm trusted publishing). No other publish route.
- This publishes to npm for real. Verify tests, build and package checks pass before tagging. Stop and ask the user if anything unexpected appears.
- Only the release changes the flow requires: `package.json` `version` (and the lockfile's root version) to `2.0.0`, and the CHANGELOG "Unreleased" section moved under `## 2.0.0`, plus any doc text that states the version. No other code changes. The README release-guide improvement (finalization target, pre-tag checks) belongs to repository-prisma-2, not here.

## Done When (from the Task)

- Tag pushed and the release workflow succeeds; `npm view repository_prisma` shows `latest` = 2.0.0.
- `main` contains the release commit.
- A fresh install of the published package works for a SQLite consumer (evidence).
- Cleanup (worktrees, branches) done; the version and any problems reported.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/worktrees/codex/release-2-0-0`, branch `codex/release-2-0-0` (no upstream)
- Base: `origin/main@f091ee11bff94ff0b429939ea345dd64e96d83e5` (refreshed 2026-11-04; `git fetch origin` works)
- Finalization target: `origin/main`, then tag `v2.0.0` on the release commit
- State checked at bootstrap: `package.json` version `1.0.10`; npm `latest` `1.0.10`; no `v2*` tag on origin.

## Context

- Upgrade archive: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/prisma-7-upgrade/` (`release-deployment-report.md`, `handoff-summary.md`, `follow-ups.md`).
- Known non-blockers from that delivery:
  - `npm run test:package` fails when run as root (FU-005, pre-existing); run it as a normal user.
  - Node 20 EBADENGINE warning from `@prisma/streams-local`, and the deprecation of Node 20 on GitHub Actions (FU-003); `release.yml` uses Node 20 and `npm ci` runs `prepare: prisma generate`.
- Untracked files in the shared checkout `/Users/normy/autobyteus_org/repository_prisma` (`pnpm-lock.yaml`, `.claude/`) are the user's and must stay untouched.

## Expected Output

`Delivery Completed` back to the Solution Designer with release evidence: the version, tag, workflow run, npm view output, the fresh SQLite consumer install, finalization and cleanup.

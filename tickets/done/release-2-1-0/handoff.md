# Handoff: release-2-1-0 — Release Requested (repository-prisma-7 Part B)

- Package identifier: `release-2-1-0` (Project Task `repository-prisma-7`, Part B; project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Classification: `Release Requested` (merged work, no software change)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Route: `/software_engineering_team/delivery_engineer` (Release Requested rule), 2026-11-05

## The User's Request

The user, 2026-11-05 (Task comment): "merge the clearer-error/README-pin items and the release into this one Task and work on it now. The release (Part B) is merged in here." Task Part B: "The user decided: release. Recommended version 2.1.0 (minor) ... confirm with the CHANGELOG evidence ... Follow the README 'Release (Tag-Based)' flow and the pre-tag checks it lists (the 7 checks and the post-publish npm view check; fix forward, never move tags). Move the CHANGELOG 'Unreleased' section under the new version. ... the release workflow is now Node 24 with npm ^11.5.1 and provenance, and was only dry-run checked, so this is its first real run: stop and ask the user if anything unexpected appears."

- Release kind: stable, npm `latest`.
- Version: **2.1.0**, confirmed by the Solution Designer from the final CHANGELOG on `main@145c1ed`. All `## Unreleased` entries are additive (`registerPrismaClient`/`PrismaClientRegistry`; codes `PRISMA_CLIENT_UNAVAILABLE`, `PRISMA_CLIENT_CONFLICT`, `SQLITE_DRIVER_UNAVAILABLE`), internal (lazy `@prisma/client` load, es2020 bundles within the supported Node range, unused `uuid` removed, tooling, CI) or docs/repository-only. The CHANGELOG states public types are identical to 2.0.0, checked by `src/tests/type-equality.typecheck.ts`. Nothing is breaking, so it is a minor release. No different choice to report.
- Include: everything on `main` at `145c1ed`. Leave out: nothing. Minor release, so the README's pinned `@2` stays.

## Constraints

- README "Release (Tag-Based)" only: the 7 pre-tag checks on the release commit, the annotated `v2.1.0` tag pushed with `git push origin main --follow-tags`, then the Release workflow and `npm view` checks. Fix forward; never move a tag or unpublish.
- Release changes only: `version` 2.1.0 in `package.json`/`package-lock.json`, and CHANGELOG `## Unreleased` -> `## 2.1.0`.
- First real run of `release.yml` (Node 24, `npm i -g npm@^11.5.1`, `npm ci` with `allowScripts`, provenance). If anything unexpected appears, before or after the tag, stop and ask the user.
- `TESTING.md` rules apply: `test:package` as a non-root user. pnpm 11+ won't resolve a version younger than about a day, so a fresh pnpm registry consumer right after publishing needs a test-only `minimumReleaseAgeExclude` entry (or relies on the pinned `@2` behavior).
- Leave the user's untracked `pnpm-lock.yaml` and `.claude/` in the shared checkout untouched.

## Done When (Task)

- Tag pushed; Release workflow succeeded with provenance; `npm view repository_prisma` `latest` = 2.1.0.
- `main` contains the release commit.
- A fresh SQLite consumer installed from the registry works for ESM and CommonJS (following the README; e.g. npm 12, plus a pnpm check).
- Cleanup (worktrees, branches); the version and any problems reported.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/worktrees/codex/release-2-1-0`, branch `codex/release-2-1-0` (no upstream)
- Base: `origin/main@145c1eddd8bd98928b49436cb464edf6a412c2ef` (Part A merged; CI runs 41979919260 and 41980054063 green)
- Finalization target: `origin/main`, then tag `v2.1.0` on the release commit
- State at bootstrap: `package.json` 2.0.0; npm `latest` 2.0.0; no `v2.1.0` tag on origin

## Context

- Part A archive: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/repository-prisma-7/`
- Previous release: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/release-2-0-0/`
- autobyteus-382 (server-ts upgrade, on hold) will use this version.

## Expected Output

`Delivery Completed` to the Solution Designer with the evidence: version, tag, workflow run (provenance), `npm view`, fresh ESM/CJS registry consumers, finalization and cleanup.

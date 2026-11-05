# Handoff: release-2-1-1 — Release Requested (repository-prisma-8)

- Package identifier: `release-2-1-1` (Project Task `repository-prisma-8`; project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Classification: `Release Requested` (merged work, no software change)
- Requested by: the user, directly in the Solution Designer's conversation (Task delegated by `/project_task_manager`, run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`)
- Route: `/software_engineering_team/delivery_engineer` (Release Requested rule), 2026-11-05

## The User's Request

The user, 2026-11-05: "yess. since noboday needs it nyet. lets keep it in todo task, and do one release for the current ticket".
- Part B (the application-supplied driver adapter) is not built; it is kept as a TODO Task. The decision record, `part-b-decision.md` in this folder, is committed with this release ticket.
- Release what this Task merged.

## Release Kind And Version

- Stable, npm `latest`.
- Version: **2.1.1** (patch), chosen by the Solution Designer.
  - `git diff --stat v2.1.0 origin/main -- . ':!tickets'` shows only `.github/workflows/ci.yml` and `release.yml` (setup-node@v6), `TESTING.md` and `CHANGELOG.md`.
  - No library code, types, peers or `dist` input changed. The published package differs from 2.1.0 only in version and CHANGELOG (`TESTING.md` isn't in `files`).
  - A minor or major isn't warranted.
- The user has been told that the package content is the same as 2.1.0. The release's practical value is the first real run of the release workflow with `actions/setup-node@v6`, which repository-prisma-8 Part A could not prove (its AC-A4).
- Include: `main` at `deb0764`. Leave out: nothing.

## Constraints

- README "Release (Tag-Based)": the 7 pre-tag checks on the release commit (test:package as non-root), the annotated `v2.1.1` tag pushed with `git push origin main --follow-tags`, then the Release workflow and `npm view` checks. Fix forward; never move a tag or unpublish.
- Release changes only: `version` 2.1.1 in `package.json`/`package-lock.json`; CHANGELOG `## Unreleased` -> `## 2.1.1`. Minor/patch, so the README's `@2` pin stays.
- This is the first real run with setup-node v6. Confirm and record:
  - no `Unknown user config "always-auth"` warning in the release log;
  - `npm publish --provenance` succeeds with a signed provenance statement;
  - `npm view` shows the attestation.

  If the publish fails because of the v6 change, the documented rollback is: pin `actions/setup-node@v5` in `release.yml` and publish the next patch. That is a code change, so stop and ask the user before it. Stop and ask the user if anything else unexpected appears.
- Fresh registry consumers: npm, ESM and CJS following the README. For pnpm within a day of publishing, use a test-only `minimumReleaseAgeExclude` entry and an empty pnpm metadata cache (`pnpm_config_cache_dir=<tmp>`), as TESTING.md now says.
- Leave the user's untracked `pnpm-lock.yaml` and `.claude/` untouched.

## Done When

- Tag pushed; Release workflow succeeded with provenance and no always-auth warning; `npm view` `latest` = 2.1.1.
- `main` contains the release commit.
- A fresh SQLite consumer installed from the registry works in ESM and CommonJS.
- Cleanup done; the version and any problems reported.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/worktrees/codex/release-2-1-1`, branch `codex/release-2-1-1` (no upstream)
- Base: `origin/main@deb076430714b7922a7b095abd6271bce6047c3e` (CI runs 41991159003 and 41991327796 green)
- Finalization target: `origin/main`, then tag `v2.1.1` on the release commit
- State at bootstrap: `package.json` 2.1.0; npm `latest` 2.1.0; no `v2.1.1` tag on origin

## Context

- repository-prisma-8 Part A archive: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/repository-prisma-8/` (AC-A4: the unproven part)
- Previous release: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/release-2-1-0/`

## Expected Output

`Delivery Completed` to the Solution Designer with the release evidence (version, tag, workflow run with no always-auth warning and with provenance, `npm view`, fresh ESM/CJS consumers, finalization, cleanup).

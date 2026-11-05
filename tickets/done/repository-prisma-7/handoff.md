# Handoff: repository-prisma-7 Part A — Architecture Design Complete

- Package identifier: `repository-prisma-7` (Project Task `repository-prisma-7`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Classification: `Architecture Design Complete`, `task_size = Small`, `architectural_risk = High` (public error-code contract change)
- Route applied: `/software_engineering_team/architecture_reviewer` (rule: High risk), 2026-11-05
- Solution revision: `SR-001`

## Original Request

User, 2026-11-05: merge the clearer startup error, the install guidance and the release into one Task and work on it now.
- Part A:
  - (FU-001) Give a missing SQLite native binding its own stable code or message (no paths), pointing to the README's native-build step.
  - (FU-003) Decide whether to pin the major in the README install lines, and document pnpm's minimum-release-age pitfall.
- Part B (after Part A is merged and CI is green): release, recommended 2.1.0, via the README tag-based flow. This is the first real run of the Node 24 release workflow; stop and ask the user if anything unexpected appears.

## Decisions (Part A)

- New code `SQLITE_DRIVER_UNAVAILABLE` on explicit `initializePrisma` when the connect step fails with the `bindings` "Could not locate the bindings file" error or Node's `ERR_DLOPEN_FAILED` (also as a nested `cause`). Everything else stays `CONNECTION_FAILED`.
- The lazy path is unchanged (Prisma rewraps coded adapter errors, Reproduced) and documented.
- README install lines pin the major (`@2`); the pnpm release-age behavior is documented (Measured); the release guide gets a reminder to update the pin on a major.

## Workspace

- Worktree `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7`
- Branch `codex/repository-prisma-7-driver-error-and-release`
- Base `origin/main@32f003d`
- Finalization target `origin/main`

## Part B Plan

After Part A's `Delivery Completed`, the Solution Designer verifies it and classifies Part B as `Release Requested` to the delivery engineer. The version is re-confirmed from the final CHANGELOG.

## Expected Output

Independent architecture review of `design-spec.md` against `requirements-doc.md`.

## Artifacts

`handoff.md`, `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `probes/` in `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-7/tickets/in-progress/repository-prisma-7/`

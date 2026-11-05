# Handoff: repository-prisma-8 Part A — Architecture Design Complete

- Package identifier: `repository-prisma-8` (Project Task `repository-prisma-8`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Classification: `Architecture Design Complete` (Part A), `task_size = Small`, `architectural_risk = Low`, direct implementation route
- Route applied: `/software_engineering_team/implementation_engineer` (rule: Small/Medium and Low), 2026-11-05
- Solution revision: `SR-001`

## Original Request

Task repository-prisma-8 (user, 2026-11-05: merge repository-prisma-4 into this Task and work on it now).
- Part A:
  - (release-2-1-0 FU-001) Remove the `always-auth` warning in `release.yml`, keeping trusted publishing.
  - (FU-002) TESTING.md: pnpm metadata cache advice.
- Part B: the application-supplied driver adapter. It is being decided with the user (DEC-B1) and is **not part of this handoff**.

Constraints: no release or tag; SQLite behavior and public types stay as in 2.1.0; say what in A1 remains unproven until a real release.

## Decisions (Part A)

- `actions/setup-node@v6` in both workflows, inputs unchanged. v6.1.0 removed always-auth handling, and v6 keeps v5's token handling (Read in the action's source). `checkout` stays at v5.
- TESTING.md bullet: pnpm also caches registry metadata. Use an empty cache (`npm_config_cache_dir=<tmp dir>`) or check `pnpm cache view <pkg>`.
- CHANGELOG `## Unreleased` line.

## Workspace

Worktree `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-8`, branch `codex/repository-prisma-8`; base `origin/main@4a2f312`; finalization target `origin/main`.

## Expected Output

Implementation per `design-spec.md` (Part A) with the container replica evidence (AC-A1, including the always-auth control), CI green, then delivery: merge to `main`, cleanup, no release. Report what stays unproven (AC-A4).

## Artifacts

`handoff.md`, `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `probes/` in `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-8/tickets/in-progress/repository-prisma-8/`

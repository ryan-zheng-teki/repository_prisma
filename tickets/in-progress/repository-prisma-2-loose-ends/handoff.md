# Handoff: repository-prisma-2-loose-ends — Architecture Design Complete

- Package identifier: `repository-prisma-2-loose-ends` (Project Task `repository-prisma-2`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Classification: `Architecture Design Complete`, `task_size = Small`, `architectural_risk = Low`, selected route: direct implementation
- Route applied: `/software_engineering_team/implementation_engineer` (rule: Small/Medium and Low), 2026-11-04
- Solution revision: `SR-001`

## Original Request

Task repository-prisma-2. Items:
1. CI and release workflows on Node 20 (EOL) -> Node 22 LTS or 24.
2. `test:package` fails as root -> skip with a logged reason, or another technique.
3. README release guide: name `main` and list the pre-tag checks.
4. DESIGN.md: a "Design cases" section.
5. (comment) Clear the 9 `npm audit` advisories, remove the unused `uuid`, record in the CHANGELOG.

Done when: all done, CI green on `main`, merged, cleaned up, no release or tag. A patch release for the `uuid` removal is a separate decision.

## Approval Basis

Requirements approved by the Solution Designer within the Task's direction (user informed); no `Needs user` decision. Decisions:
- Node 24.
- `actions/checkout@v5` and `setup-node@v5` (Node 24 runtime; v7 deferred because its token change can't be proven before a release).
- `npm@^11.5.1` in the release workflow, to avoid downgrading.
- Skip the read-only WAL case as root, with a printed reason and a JSON field.
- `npm audit fix` run with npm 11 (npm 10.9.8 crashes).
- A CHANGELOG `## Unreleased` entry; no version bump.

## Workspace

- Worktree `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends`, branch `codex/repository-prisma-2-loose-ends`; base `origin/main@aa933e0`; finalization target `origin/main`.

## Evidence Summary

- Scratch probes in `/tmp/rp2-probe`:
  - The npm 11 audit fix gives 0 vulnerabilities.
  - The new lockfile installs with npm 10 and passes typecheck, 113 tests and both package checks; `uuid` does not appear in `dist`.
  - Node 24.22.2 + npm 11.19.1 passes `npm ci`, typecheck, tests and build. Prisma's preinstall is skipped with a warning, but `prepare` still generates the client.
- Details: `investigation-notes.md`.

## Expected Output

Implementation per `design-spec.md` "Final File Responsibility Mapping / Target Changes", with the evidence logs (including a root run of `test:package`), then the team's normal validation and delivery. Merge to `main`, green CI on Node 24, cleanup, no release.

## Follow-ups

FU-001: the package smoke script is over the 500-line limit (pre-existing). Sent by the Solution Designer when the ticket leaves the team.

## Artifacts

- `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/handoff.md`
- `.../requirements-doc.md`, `.../investigation-notes.md`, `.../design-spec.md`, `.../solution-revision-record.md`, `.../follow-ups.md` (same folder)

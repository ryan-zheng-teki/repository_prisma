# Handoff: repository-prisma-6 — Architecture Design Complete

- Package identifier: `repository-prisma-6` (Project Task `repository-prisma-6`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Classification: `Architecture Design Complete`, `task_size = Medium`, `architectural_risk = Low`, direct implementation route
- Route applied: `/software_engineering_team/implementation_engineer` (rule: Small/Medium and Low), 2026-11-04
- Solution revision: `SR-001`

## Original Request

Task repository-prisma-6:
1. Split the 739-line `scripts/run-package-smoke.js` into owned files, keeping the behavior and output of `npm run test:package`.
2. Decide and record install-script approvals for the `better-sqlite3` native build, and add a README note for consumers if their package manager would block it.

Done when: both done; test:package, typecheck, tests and build pass; CI green on `main`; item 2's decision recorded with evidence; merged and cleaned up. No release; say what reaches consumers.

## Approval Basis And Decisions

Requirements approved by the Solution Designer within the direction (user informed). Decisions DEC-001..006 are in `requirements-doc.md`:
- Split into a runner plus 8 step/helper modules.
- Approve only `better-sqlite3` (pinned) and explicitly deny `esbuild`, `prisma`, `@prisma/engines`, `fsevents`.
- CI installs with `--strict-allow-scripts`.
- The README consumer note covers npm 12, pnpm 10 and pnpm 11+, plus pnpm's direct `@prisma/client`.
- The README maintainer note and a CHANGELOG `## Unreleased` entry record the policy.

## Key Evidence (`investigation-notes.md`, `probes/`)

- npm 12.2.1 is npm `latest`.
- A fresh npm 12 consumer of the published 2.0.0 fails with `CONNECTION_FAILED` ("Could not locate the bindings file"). `npm install-scripts approve better-sqlite3` fixes it. pnpm 12 errors with `ERR_PNPM_IGNORED_BUILDS`; `pnpm approve-builds better-sqlite3` plus a direct `@prisma/client` fixes it.
- The repo on npm 12 without approvals: 19 tests fail. With the approvals: quiet install and all green on macOS arm64 and Linux x64 (`node:24-bookworm`). npm 10 ignores the field.
- npm 11.19.1 `--strict-allow-scripts`: passes; a stale pin gives `ESTRICTALLOWSCRIPTS`.

## Workspace

Worktree `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6`, branch `codex/repository-prisma-6-smoke-split-install-scripts`; base `origin/main@5a73159`; finalization target `origin/main`.

## Consumer Reach

The README note reaches npm only with a release. `allowScripts` ships in the manifest but npm ignores it for dependencies. A patch release is a separate user decision.

## Follow-ups

- FU-001: a clearer library error for a missing native binding.
- FU-002 (urgent for autobyteus-382): the consumer must add `better-sqlite3` to `pnpm.onlyBuiltDependencies`. Sent early to `/project_task_manager` because it blocks an active related Task.

## Expected Output

Implementation per `design-spec.md` ("Final File Responsibility Mapping", "Change Sequence", "Guidance"), with evidence logs; then validation and delivery; merge to `main`, CI green, cleanup, no release.

## Artifacts

`handoff.md`, `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `probes/` in `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/`

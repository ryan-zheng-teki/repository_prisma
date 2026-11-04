# Handoff: prisma-7-upgrade — Architecture Design Complete

- Package identifier: `prisma-7-upgrade` (Project Task `repository-prisma-1`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Requested by: `/project_task_manager` (run `project_task_manager_843e78c72f40444ca701a6c2c0dfe98c`) on behalf of the user
- Classification: `Architecture Design Complete`. `task_size = Medium`, `architectural_risk = High`.
- Current solution revision: `SR-003` (requirements approved at `SR-002`; design at `SR-003`)
- Route applied: `/software_engineering_team/architecture_reviewer` (rule: architectural_risk=High). Recorded 2026-11-04.

## Original Request And Goals

User (2026-11-04): "the available prisma is 7. or something but our library is still old, please check. we need to upgrade." Direction: latest stable 7.x (7.10.1), not 8.0 RC. Constraints: AGENTS.md (README/DESIGN updates), no release/tag/publish in this Task, keep public API behavior unless Prisma 7 forces a change (report it). Done when: 7.10.1 in manifests/lockfile, with generation, build and the full suite passing (evidence recorded), the peer range and docs updated, and the work merged to `main`, verified, cleaned up, with follow-ups recorded.

Later user messages (2026-11-04): "why wait here?"; "regarding these technical things, i trust you have good architecture technical understanding for this project"; "at the same time, since its a library, how user use it will still be intuitive and simple" (added REQ-015/AC-012).

## Approval Basis

Requirements `Approved` at SR-002 by the Solution Designer within the direction, user informed. The user explicitly delegated the technical decisions. Decided: DEC-001 SQLite only (non-SQLite -> new code `UNSUPPORTED_DATASOURCE_PROVIDER`); DEC-002 peers `@prisma/client ^7.10.1` + `@prisma/adapter-better-sqlite3 ^7.10.1`; DEC-005 `timestampFormat: 'unixepoch-ms'`; DEC-006 the adapter opens the resolved path (query string ignored); DEC-007 `package-lock.json` only; DEC-007b leave the untracked `pnpm-lock.yaml` in the shared checkout alone; DEC-008 base = released 1.0.10 line, merged into `main`. No user approval of the design is required.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade`, branch `codex/prisma-7-upgrade` (no upstream)
- Base: `origin/codex/repository-prisma-esm-cjs-interop@f2ffd5c` (published 1.0.10, tag `v1.0.10` = `5c57ebd`). `origin/main@8ab582f` (1.0.9) is its ancestor.
- Finalization target: `origin/main`. The merge fast-forwards `main` over the released 1.0.10 commits (DEC-008).
- Note: `git fetch origin` fails here (`git@github.com: Permission denied (publickey)`); `git ls-remote origin` works via the `github.com-ryan` alias. Delivery must confirm fetch/push access.

## Key Evidence (details in investigation-notes.md and probes/README.md)

- Prisma 7 rejects `new PrismaClient({ datasourceUrl })`; a driver adapter is required (Reproduced).
- Schema `url` -> P1012; `db push --skip-generate` removed; no client postinstall, so the build fails without `prisma generate` (Reproduced).
- better-sqlite3 adapter: identity/WAL/logging/transactions work. A URL query string becomes part of the filename. The default ISO timestamps break range filters over Prisma-5 INTEGER rows; `unixepoch-ms` keeps them (Measured).
- Scratch patch: 83/83 tests and typecheck pass on 7.10.1; package smoke passes with the adapter external.
- npm 10 auto-installs declared peers (Measured).

## Public Contract Changes Prisma 7 Forces (to be reported in docs)

Peer move 5 -> 7; new peer `@prisma/adapter-better-sqlite3` (native better-sqlite3); non-SQLite datasources rejected with `UNSUPPORTED_DATASOURCE_PROVIDER`; SQLite URL engine parameters have no effect; Node `^20.19 || ^22.12 || >=24`, TS >= 5.4. SQLite consumer code is unchanged.

## Open Risks

RSK-001 (consumer-built clients with the ISO default; FU-001), RSK-002 (native addon on consumer platforms), single connection per client (behavior of the adapter).

## Follow-ups (not yet sent; sent by the Solution Designer when the ticket leaves the team)

FU-001 consumer `autobyteus-server-ts` upgrade; FU-002 `prisma-client` generator support; FU-003 CI/release Node 20 EOL; FU-004 adapter injection for non-SQLite (if ever needed).

## Expected Output

Independent architecture review of `design-spec.md` against the approved requirements. Pass -> implementation per the reviewer's handoff rules. Findings -> back to the Solution Designer.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/handoff.md`
- `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/requirements-doc.md`
- `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/investigation-notes.md`
- `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/design-spec.md`
- `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/solution-revision-record.md`
- `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/probes/README.md` (+ probe files, `feasibility-patch.diff`)
- `/Users/normy/autobyteus_org/worktrees/codex/prisma-7-upgrade/tickets/in-progress/prisma-7-upgrade/follow-ups.md`

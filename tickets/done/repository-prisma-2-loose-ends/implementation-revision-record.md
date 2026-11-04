# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record keeps the initial baseline and one entry per later implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete, direct route) | N/A | `Initial Baseline` | SR-001 | Implemented at `e213742`; IMP-01..08 pass; to API/E2E |

## Revision Entries

### IR-001 — Node 24 workflows, root-safe smoke, release guide, design cases, uuid removal and audit fixes

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-2-loose-ends/tickets/in-progress/repository-prisma-2-loose-ends/handoff.md`, initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented at `e213742` on `codex/repository-prisma-2-loose-ends`; `task_size = Small`, `architectural_risk = Low` confirmed.
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..005; REQ-001..007 (REQ-008 after merge); AC-001..006.
- Implementation delta:
  - Workflows: Node 24 with checkout/setup-node v5; release npm step `npm i -g npm@^11.5.1`.
  - Smoke: the parent decides `readonlyWal` (pass, skipped-root or skipped-win32), prints the root reason, guards the child case, asserts the child's `readonly-wal-ok` marker when the case should run, and reports `readonlyWal` in the JSON.
  - README: release guide. DESIGN.md: Design Cases with DC-001. CHANGELOG: Unreleased.
  - Dependencies: `uuid`, `@types/uuid` and the tsup external removed; lockfile from `npx npm@11 uninstall uuid @types/uuid` and `npx npm@11 audit fix`.
- Changed files or areas: `.github/workflows/{ci,release}.yml`, `scripts/run-package-smoke.js`, `README.md`, `DESIGN.md`, `CHANGELOG.md`, `package.json`, `package-lock.json`, `tsup.config.ts`.
- Local validation and result:
  - IMP-00 reproduction: 9 advisories before the change.
  - IMP-01: fresh `npm ci` with npm 10; audit 0; no `uuid` installed.
  - IMP-02 typecheck; IMP-03 113/113 tests.
  - IMP-04 non-root `test:package` (`readonlyWal: pass`, 0 `uuid` in `dist`).
  - IMP-05: packed manifest has no dependencies, version 2.0.0.
  - IMP-06 node:24 container: as root, everything passes and the case is skipped with the reason printed; as uid 1000, the case passes.
  - IMP-07 reproduction: the base fails as root.
  - IMP-08 `git diff --check`.
- Next recipient or routing: direct API/E2E (Small/Low), per `get_handoff_rules`.
- Remaining limitations or risks: GitHub CI on Node 24 is verified only after push or merge; the release workflow is untested until the next release; there was no x86_64 Linux run; CI logs will show the npm 11 install-script warnings.

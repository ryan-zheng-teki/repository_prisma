# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record keeps the initial baseline and one entry per later implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete, Part A, direct route) | N/A | `Initial Baseline` | SR-001 | Part A implemented at `e44ea62`; IMP-01..03 pass; to API/E2E |

## Revision Entries

### IR-001 — setup-node v6 in both workflows; TESTING.md pnpm cache guidance (Part A)

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-8/tickets/in-progress/repository-prisma-8/handoff.md`, initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Part A implemented at `e44ea62`; `task_size = Small`, `architectural_risk = Low` confirmed. Part B is not part of this work (pending DEC-B1).
- Related solution revision IDs: SR-001
- Related architecture-review, code-review, API/E2E, delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-A1, REQ-A2; AC-A1..AC-A4.
- Implementation delta:
  - `setup-node@v5` -> `@v6` in `release.yml` and `ci.yml`, inputs unchanged.
  - TESTING.md pnpm metadata-cache sub-bullet, naming `pnpm_config_cache_dir` / `--cache-dir` instead of the requirement's example `npm_config_cache_dir`, which pnpm 11 and 12 ignore (measured; recorded deviation).
  - CHANGELOG `## Unreleased` line.
- Changed files or areas: `.github/workflows/release.yml`, `.github/workflows/ci.yml`, `TESTING.md`, `CHANGELOG.md`.
- Local validation and result:
  - IMP-01: pnpm cache setting check.
  - IMP-02: release npm-steps replica. With the v6 `.npmrc` there are 0 always-auth warnings and the dry-run publish succeeds; the v5 control warns on every command.
  - IMP-03: CI steps on Linux x64 as non-root, 167 tests.
  - All pass.
- Next recipient or routing: direct API/E2E (Small/Low), per `get_handoff_rules`.
- Remaining limitations or risks: GitHub CI with v6 is verified after push or merge; the OIDC/provenance publish under v6 is unproven until the next release (AC-A4).

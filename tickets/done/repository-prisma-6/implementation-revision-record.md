# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record keeps the initial baseline and one entry per later implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete, direct route) | N/A | `Initial Baseline` | SR-001 | Implemented in `8ef7b77`..`7047cdf`; IMP-01..11 pass; to API/E2E |

## Revision Entries

### IR-001 — Package smoke split, install-script approvals with strict CI, README native-build guidance

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6/tickets/in-progress/repository-prisma-6/handoff.md`, initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented on `codex/repository-prisma-6-smoke-split-install-scripts`. Commits:
  - `8ef7b77` split
  - `23b23f3` approvals + CI
  - `b87252c` npm 12 pack parsing
  - `7047cdf` docs

  `task_size = Medium`, `architectural_risk = Low` confirmed.
- Related solution revision IDs: SR-001
- Related architecture-review, code-review, API/E2E, delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..004; REQ-001..005; AC-001..007 (AC-005 after push/merge).
- Implementation delta:
  - The runner plus 8 step modules, made by moving line ranges verbatim (checked by script).
  - `allowScripts` written by `npm install-scripts approve` and `deny`.
  - `ci.yml`: `npm ci --strict-allow-scripts`.
  - Packed-artifact step accepts npm 12's `npm pack --json` object shape (a design deviation within AC-003; see handoff).
  - README setup and Testing sections; CHANGELOG Unreleased.
- Changed files or areas: `scripts/run-package-smoke.js`, `scripts/package-smoke/{harness,packed-artifact,consumer-install,import-safety,logging-policy,cjs-runtime,esm-runtime,consumer-types}.js`, `package.json`, `.github/workflows/ci.yml`, `README.md`, `CHANGELOG.md`.
- Local validation and result:
  - IMP-01/02: baselines, macOS non-root and Linux x64 root.
  - IMP-03/04: after the split.
  - IMP-05: identical normalized output.
  - IMP-06: mutations (b) and (c) fail in their steps; (a) is not a break, explained in the log.
  - IMP-07: approval commands.
  - IMP-08: npm 12 on macOS, plus a no-approval control.
  - IMP-09: Linux x64: npm 11 strict, stale pin `ESTRICTALLOWSCRIPTS`, npm 12 full.
  - IMP-10: README consumers on npm 12, pnpm 12 and pnpm 10, plus the symptom check.
  - IMP-11: npm 10 regression and `git diff --check`.
  - All pass.
- Next recipient or routing: direct API/E2E (Medium/Low), per `get_handoff_rules`.
- Remaining limitations or risks: GitHub CI is verified after push or merge; no pnpm 11 or Windows run; pnpm 11+'s minimum release age hides new releases for a while (2.0.0 resolved to 1.0.10 on pnpm 12 without an exclusion).

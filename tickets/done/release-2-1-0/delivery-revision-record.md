# Delivery Revision Record — release-2-1-0

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release Requested (repository-prisma-7 Part B) | N/A | 2.1.0 published to npm `latest` with provenance; `main` contains release commit `9645020` | `release-deployment-report.md`, `follow-ups.md`, `evidence/REL-01..06`, `evidence/REL-scripts/` |

## Revision Entries

### DR-001 — repository_prisma 2.1.0 released

- Delivery round and trigger: round 1. `Release Requested` from `/software_engineering_team/solution_designer`, 2026-11-05 (Project Task `repository-prisma-7`, Part B).
- Triggering upstream report, verification, or evidence: `handoff.md` (version 2.1.0 confirmed; base `main@145c1ed`)
- Prior authoritative result (`N/A` for `DR-001`): N/A
- Current authoritative result:
  - Release commit `9645020`, tagged `v2.1.0`.
  - Release run `41980513362` succeeded; it was the first real Node 24 release run, with provenance.
  - npm `latest` = 2.1.0.
  - Fresh registry consumers pass: npm 12 on 2.1.0; pnpm 11 on 2.1.0 with the test-only exclusion, and on 2.0.0 with the README as written while 2.1.0 is under a day old.
- Docs sync report: N/A (release request)
- Handoff summary: N/A (release request)
- Release/publication/deployment report: `release-deployment-report.md`
- Integration and post-integration verification: `Already current` (`origin/main@145c1ed`); pre-tag checks 1–6 (REL-01) passed non-root; check 7, CI `41980411283`, passed
- Verification (evidence judgement or user check) and finalization state:
  - The release guide's checks and the Task's checks are all proven; no user check was needed.
  - `main` was fast-forwarded `145c1ed..9645020` and pushed, with the tag on `9645020`.
  - The ticket archive commit was then pushed to the branch and to `main` (fast-forward).
  - Cleanup: worktree removed and pruned, local branch deleted, `/tmp/rel210-*` removed.
- Terminal return to the Solution Designer: `Sent`
- Terminal return message/reference: `Delivery Completed`, 2026-11-05
- Why this baseline or delivery revision was recorded: first completed delivery round for this release request
- Next recipient/action: Solution Designer (terminal)
- Remaining blockers, rollback concerns, or untested scope:
  - None blocking.
  - FU-001: the release workflow's `always-auth` warning.
  - FU-002: the TESTING.md pnpm metadata-cache note.
  - pnpm users get 2.1.0 about a day after publishing.
  - Never move the tag; fix forward.

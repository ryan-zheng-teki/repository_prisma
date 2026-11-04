# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Project Task repository-prisma-6 | N/A | N/A | Requirements Approved; design Ready | REQ-001..005 | Medium / Low; direct implementation |

## Revision Entries

### SR-001 — Smoke split and install-script approvals

- Phase and classification: Mixed, `Initial Baseline`
- Triggering input: Task repository-prisma-6 (FU-001 and FU-002 of repository-prisma-2)
- Prior status: N/A
- Current status: requirements Approved (Solution Designer within the direction; user informed), design Ready
- Key evidence: npm 12 is npm `latest` (12.2.1); fresh npm 12 and pnpm consumers of the published 2.0.0 fail at startup until `better-sqlite3` is approved (Reproduced); the repo's tests fail on npm 12 without the approval (Reproduced)
- Intended behavior changed: `Yes` for repo install policy, CI enforcement and README guidance; the smoke's behavior is preserved
- Approval impact: within the direction; no `Needs user` decision
- Classification: `task_size = Medium`, `architectural_risk = Low`
- Applied handoff-rule outcome: see `handoff.md`
- Next action: implementation

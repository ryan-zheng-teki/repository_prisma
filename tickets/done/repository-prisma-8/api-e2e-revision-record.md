# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation engineer, `implementation-handoff.md` IR-001, round 1 (Part A) | SR-001, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: setup-node v6 proven with the action's own code; pnpm cache guidance confirmed

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), API/E2E round 1, Part A
- Triggering finding or case IDs: none
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, IR-001
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: none
- Cases added, changed, removed, or rechecked:
  - API-01 reused IMP-01..03;
  - API-02, 03, 04, 04b and 05 Pass (API-04b was added during execution);
  - API-06 (GitHub run on `main`) is post-merge for delivery;
  - API-07 (AC-A4) is unproven until the next release, by requirement.
- Commands, environment, fixture, or broader-validation delta: `actions/setup-node` v6 (`2499707`, v6.5.0) and v5 (`a0853c2`) executed in `node:24-bookworm` amd64 as `node` with runner environment variables; pnpm 11.28.11 and 12.16.1 on macOS.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md` (new); `evidence/API-*`, `evidence/API-scripts/`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (post-repository 88%)
- New or remaining failure IDs: none
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: GitHub CI with v6 (post-merge); OIDC provenance publish under v6 (next release, AC-A4); Part B not in this round.

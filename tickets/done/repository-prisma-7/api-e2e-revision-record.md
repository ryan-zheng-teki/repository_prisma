# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer, `code-review-report.md` CRR-001, round 1 (Part A) | SR-001, IR-001, CRR-001 | N/A | Pass / 94.8% |

## Revision Entries

### API-REV-001 — Baseline: SQLITE_DRIVER_UNAVAILABLE proven with the real driver on Linux and with pnpm; README pin proven past the release-age gate

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001), API/E2E round 1
- Triggering finding or case IDs: none (reviewer's open items 1-4)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, IR-001, CRR-001
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result (Part A)
- Coverage decisions or durable test paths changed: none in the test suite. `TESTING.md` gained a bullet on testing real native-driver failures.
- Cases added, changed, removed, or rechecked:
  - API-01 reused IMP-01..06; API-02..06 Pass.
  - API-04 was extended to Linux after a confounded macOS run (npm 12 on Node 25).
- Commands, environment, fixture, or broader-validation delta: Docker amd64 `node:24-bookworm` and `node:22-bookworm` on shared volumes (user `node`); macOS pnpm 11.28.9/12.16.1, Node 22/25; consumer `minimumReleaseAge: 60` for the post-gate state.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md` (new);
  - `follow-ups.md` (new, FU-001);
  - `evidence/API-*`, `evidence/API-scripts/`;
  - `TESTING.md`.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94.8% (post-repository 87%)
- New or remaining failure IDs: none
- Recommended owner: code reviewer (then delivery)
- Remaining risks, blocked evidence, or untested scope: FU-001 (pnpm + npm 12 rebuild wording); Electron ABI guidance only; no Windows run; Part B not in this round.

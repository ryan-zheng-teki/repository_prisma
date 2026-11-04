# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: smoke split preserved, install-script policy proven on CI's toolchain and with npm 12 / pnpm 11 consumers

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), API/E2E round 1 (direct route)
- Triggering finding or case IDs: none (handoff "Open": AC-005 GitHub run, pnpm 11, Windows)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, IR-001
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: none in the test suite. The smoke split was validated by output comparison at HEAD, an independent move check and mutations in the four unmutated steps. `TESTING.md` was created and `AGENTS.md` updated (skill update, 2026-11-04).
- Cases added, changed, removed, or rechecked: API-01 (reused IMP-01,02,06..11); API-02..09 and API-11 Pass. API-11 was added during execution (release steps with `allowScripts`). API-10 (AC-005 GitHub run on `main`) is post-merge, handed to delivery.
- Commands, environment, fixture, or broader-validation delta:
  - Docker `node:24-bookworm` amd64 with the GitHub runner's measured toolchain (Node 24.22.2, npm 11.19.1), run non-root and as root;
  - npm 12.2.1 and pnpm 11.28.9 from temporary prefixes;
  - published 2.0.0 consumers, with a test-only pnpm release-age exclusion.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md` (new);
  - `follow-ups.md` (FU-003);
  - `evidence/API-*`, `evidence/API-scripts/`;
  - `TESTING.md` and `AGENTS.md` (repository root).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (post-repository 89%)
- New or remaining failure IDs: none
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: AC-005 GitHub run (post-merge); FU-003 pnpm release-age pitfall; no Windows consumer.

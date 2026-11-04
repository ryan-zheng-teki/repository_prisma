# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-005, ARCH-REV-003, IR-002, CRR-002 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: Prisma 7 package proven through fresh consumers, Node 20 CI, a real Prisma 5.22 database and concurrent load

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-002, implementation review round 2), API/E2E round 1
- Triggering finding or case IDs: none (handoff "Not run" items: AC-012 fresh install, Node 20 CI, AC-013 via packed ESM + load, AC-005 with a Prisma-5 database, AC-004 via the package, Windows)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-005, ARCH-REV-003, IR-002, CRR-002
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: added the durable load case `keeps concurrent plain requests isolated and loses no writes while transactions commit and roll back` to `src/tests/transaction-isolation.test.ts`. A mutation (ungated adapter) makes it fail. All other existing tests are `Still Valid`.
- Cases added, changed, removed, or rechecked: API-01 (reused IMP-01/07/09/12/13/14/16) and API-02..API-11 Pass. API-12 (Windows) Not Tested.
- Commands, environment, fixture, or broader-validation delta: broader validation `Required` and executed: fresh consumers from the packed tarball without `--legacy-peer-deps` (macOS Node 22, Linux Node 20), Docker `node:20-bookworm` CI emulation (arm64 non-root and root, amd64 emulated non-root), a Prisma 5.22.0 writer.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (new), `api-e2e-execution-coverage-report.md` (new), `api-e2e-test-progress.md` (new), `follow-ups.md` (FU-005 added), `evidence/API-*` and `evidence/API-scripts/`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (post-repository 83%)
- New or remaining failure IDs: none. FU-005 (root-only package smoke failure, pre-existing on 1.0.10) is a follow-up, not a failure of this ticket.
- Recommended owner: code reviewer (proportional test-code review of the added test)
- Remaining risks, blocked evidence, or untested scope: Windows paths (no host). x64 Linux only emulated. Gate throughput cost under concurrent transactions (documented). Prisma CLI 7.10.1's transitive `@prisma/streams-local` warns `EBADENGINE` (node >=22) on Node 20; this is a warning only, every step passes (see FU-003). The README fresh-install journey is not a durable repo test (it needs the registry).

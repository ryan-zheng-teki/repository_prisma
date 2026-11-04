# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation engineer, `implementation-handoff.md` IR-001, round 1 | SR-001, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: Node 24 workflows, root-safe smoke and uuid removal proven on x86_64 and in a real consumer

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), API/E2E round 1 (direct route)
- Triggering finding or case IDs: none (handoff "Still open": AC-001 GitHub run, release workflow, x86_64)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, IR-001
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: none. The smoke's `readonlyWal`/marker guard (implementation) was exercised and shown to fail under mutation.
- Cases added, changed, removed, or rechecked: API-01 (reused IMP-01..06, IMP-08) and API-02..API-08 Pass. API-09 (AC-001 GitHub run on `main`) is post-merge, handed to delivery with the baseline.
- Commands, environment, fixture, or broader-validation delta: Docker `node:24-bookworm` `--platform linux/amd64` (Node 24.22.2, npm 11.19.1), non-root and root; actionlint; `gh api` action runtimes; consumer install of the packed tarball; container-only prerelease bump for the dry-run publish.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md` (new); `follow-ups.md` (FU-002); `evidence/API-*`, `evidence/API-scripts/`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95% (post-repository 87%)
- New or remaining failure IDs: none
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: the AC-001 GitHub run on `main` (post-merge, delivery); the real OIDC `--provenance` publish (next release); FU-002 npm install-script approval.

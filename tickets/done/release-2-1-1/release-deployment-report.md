# Delivery / Release / Deployment Report — release-2-1-1

## Release / Publication / Deployment Scope

Release request (`Release Requested`, Project Task `repository-prisma-8`): publish `main@deb0764` as `repository_prisma` **2.1.1** (patch, stable, npm `latest`). The user asked on 2026-11-05: "do one release for the current ticket". Version 2.1.1 was chosen by the Solution Designer.

- Since `v2.1.0`, only `ci.yml`, `release.yml` (setup-node@v6), `TESTING.md` and `CHANGELOG.md` changed. The published package differs from 2.1.0 only in version and CHANGELOG, and the user was told this.
- The release's purpose is the first real run of the release workflow with `actions/setup-node@v6` (repository-prisma-8 AC-A4).
- The ticket also carries the Solution Designer's `part-b-decision.md`: the driver adapter is deferred to a TODO Task.
- Docs sync, the handoff summary and verification from evidence do not apply to a release request; the release guide's checks are the verification.

## Project Release Guide

- Release guide path and revision: `README.md` § "Release (Tag-Based)", named by `AGENTS.md`, at `deb0764`
- Deviations from the guide and why: `None`. Check 1 was also run CI's way (`npx npm@11.19.1 ci --strict-allow-scripts`).
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: not applicable (release request); the request is in `handoff.md`
- Handoff summary status: N/A
- Delivery revision record: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/release-2-1-1/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/main@deb0764`
- Latest tracked remote base reference checked: `origin/main@deb0764` (fetched 2026-11-05 ~08:42Z, and again before the merge)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Not needed`
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (the guide's pre-tag checks)
- Post-integration verification result: `Passed`
- No-rerun rationale: N/A
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: REL-01..04 below.

| Check | Evidence | What You Saw | Judgement |
| --- | --- | --- | --- |
| 1. Fresh install, plus CI's strict install | REL-01 | `npm ci` exit 0; `npm@11.19.1 ci --strict-allow-scripts` exit 0, 0 install-script warnings, `found 0 vulnerabilities` | Proven |
| 2. typecheck | REL-01 | `{"result":"pass",...}`, exit 0 | Proven |
| 3. npm test | REL-01 | `Test Files 17 passed (17)`, `Tests 167 passed (167)` | Proven |
| 4. build | REL-01 | exit 0 | Proven |
| 5. test:package, non-root (uid 501) | REL-01 | both `"result":"pass"`, `"readonlyWal":"pass"` | Proven |
| 6. `npm pack --dry-run` | REL-01 | `repository_prisma@2.1.1`, 10 files; the `dist` file sizes are identical to 2.1.0 (no library change) | Proven |
| 7. CI green on `main` for the release commit | CI run `41996707604` | `f527c0a`: every step success, including `Run actions/setup-node@v6` and `npm ci --strict-allow-scripts` | Proven |
| Tag matches `package.json` | REL-02 | `v2.1.1` (annotated `32f442b`) → `f527c0a`; `version` `2.1.1` | Proven |
| **setup-node v6 first real release: no always-auth warning** | REL-02, run `41996833453` | runner downloaded `actions/setup-node@v6 (SHA:249970729cb0…)`; **0 `always-auth` lines** in the whole log (2.1.0 under v5 warned at every npm step); 0 install-script lines; npm 11.19.1 → 11.21.2 | Proven |
| **Signed provenance** | REL-02 | `npm notice publish Signed provenance statement with source and build information from GitHub Actions`; `transparency log: https://search.sigstore.dev/?logIndex=3692950121`; `+ repository_prisma@2.1.1` | Proven |
| **`npm view`: latest and attestation** | REL-02 | `{"latest": "2.1.1"}`; gitHead `f527c0a`; peers `^7.10.1`; no `dependencies`; engines; `dist.attestations` with `predicateType: https://slsa.dev/provenance/v1` | Proven |
| Fresh registry consumer, npm 12 (README only, pinned `@2`) | REL-03 | npm 12.2.2: `installed repository_prisma: 2.1.1`; README approve and rebuild; `no adapter import`; ESM and CJS `{"result":"pass"}` (10 checks each); lazy `file:` ok (ESM, CJS); `postgresql` → `UNSUPPORTED_DATASOURCE_PROVIDER` | Proven |
| Fresh registry consumer, pnpm 11 (README + TESTING.md: test-only `minimumReleaseAgeExclude` + empty `pnpm_config_cache_dir`) | REL-04 | pnpm 11.28.11: `+ repository_prisma 2.1.1`; the expected `ERR_PNPM_IGNORED_BUILDS` then `pnpm approve-builds better-sqlite3` → `install: Done`; ESM and CJS `{"result":"pass"}`; lazy ok; non-SQLite rejected; the isolated cache shows `latest: 2.1.1` | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`
- User check reference, when needed: N/A
- Re-verification after later re-integration: `Not needed`

Unexpected items: none. The log's only notice is npm's informational "npm tokens that bypass 2FA are being restricted ...", already seen at 2.1.0. Trusted publishing uses OIDC, not a token. The registry showed `latest` 2.1.0 until ~08:46:34Z (propagation, about 90 s after publishing).

repository-prisma-8 AC-A4 ("the OIDC `npm publish --provenance` under setup-node v6 is unproven until the next real release") is now proven by this run.

## Release Decision

- Decision: `Stable` (npm `latest`), version 2.1.1
- Decided by: the user, 2026-11-05 ("do one release for the current ticket"), in the Solution Designer's conversation; version 2.1.1 chosen by the Solution Designer (`handoff.md`)

## Docs Sync Result

- Docs sync artifact: not applicable (release request)
- Docs sync result: N/A. Release edits only: `CHANGELOG.md` `## Unreleased` → `## 2.1.1`. The README pin `@2` stays (patch).
- Docs updated: `CHANGELOG.md`
- No-impact rationale (if applicable): N/A

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes` (including the Solution Designer's `part-b-decision.md`)
- Archived ticket path: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/release-2-1-1/`

## Version / Tag / Release Commit

- Release commit: `f527c0a` `chore(release): 2.1.1`: `package.json` `version` and `package-lock.json` root `version`/`packages[""].version` 2.1.0 → 2.1.1; CHANGELOG heading. 3 files, +4/−4.
- Tag: annotated `v2.1.1` (object `32f442b`) → `f527c0a`, pushed with `git push origin main --follow-tags`.

## Repository Finalization

- Bootstrap context source: `handoff.md` (finalization target `origin/main`, then tag `v2.1.1`)
- Ticket branch: `codex/release-2-1-1` (handoff `d954604`, release `f527c0a`)
- Ticket branch commit result: `Completed`
- Ticket branch push result: `Completed` (new remote branch `origin/codex/release-2-1-1`)
- Finalization target remote: `origin`
- Finalization target branch: `main`
- Target advanced after verification / acceptance: `No` (`origin/main` = `deb0764` at merge time)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`
- Merge into target result: `Completed`: fast-forward `deb0764..f527c0a` in the shared checkout
- Push target branch result: `Completed`: `deb0764..f527c0a  main -> main`. The ticket archive commit follows on the branch and on `main` (fast-forward).
- Repository finalization status: `Completed`
- Blocker (if applicable): None

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide` (Git tag → GitHub Actions `release.yml` → npm trusted publishing with provenance)
- Method reference / command: `git tag -a v2.1.1 -m "2.1.1" f527c0a`; `git push origin main --follow-tags`
- Pipelines triggered and their results:
  - CI run `41996707604` (`main` push of `f527c0a`): success, before tagging.
  - Release run `41996833453` (tag `v2.1.1`): success. setup-node@v6 `2499707`; Node v24.22.2; npm 11.19.1 → 11.21.2; `npm ci`; build; `npm publish --provenance --access public`. 0 always-auth lines.
  - CI on the archive commit: watched after the push; result in the terminal message.
- Published artifacts checked against what the release should produce: `Yes`. 10 files (publish log `total files: 10`, matching check 6). Version 2.1.1, gitHead `f527c0a`, peers, no `dependencies`, engines, SLSA provenance, `latest` = 2.1.1.
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required` (`CHANGELOG.md` `## 2.1.1` ships in the tarball)
- Blocker (if applicable): None

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/worktrees/codex/release-2-1-1`
- Worktree cleanup result: `Completed` (after the archive commit was pushed)
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed`
- Remote branch cleanup result: `Not required` (`origin/codex/release-2-1-1` kept, as for earlier tickets)
- Temporary items: `/tmp/rel211-*` (tools, scripts, consumers, isolated pnpm cache) removed; the machine's pnpm cache was not modified.
- Blocker (if applicable): None

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

N/A

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `Not required` (`CHANGELOG.md` `## 2.1.1`)
- Archived release notes artifact used for release/publication: N/A
- Release notes status: `Not required`

## Deployment Steps

None (npm library).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none (no library change)
- Delivery action required: `None`

## Verification Checks

REL-01 (pre-tag 1–6), CI 41996707604 (7), REL-02 (tag, Release 41996833453, AC-A4 log checks, npm view), REL-03 (npm 12 consumer), REL-04 (pnpm 11 consumer).

## Rollback Criteria

- Never move or delete `v2.1.1` or unpublish; fix forward with 2.1.2.
- The setup-node@v5 rollback is not needed: v6 published successfully with provenance.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (`Completed`)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`, after the archive commit was pushed and cleanup finished
- Terminal message/reference: `Delivery Completed` to the Solution Designer address from `get_handoff_rules`, 2026-11-05

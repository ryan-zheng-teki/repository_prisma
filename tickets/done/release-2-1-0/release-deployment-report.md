# Delivery / Release / Deployment Report — release-2-1-0

## Release / Publication / Deployment Scope

Release request (`Release Requested`, Project Task `repository-prisma-7` Part B): publish `main@145c1ed` (Part A merged, CI green) as `repository_prisma` **2.1.0** (stable, npm `latest`). The version was confirmed by the Solution Designer from the final CHANGELOG: every entry is additive, internal or docs-only, and the public types are identical to 2.0.0, so this is a minor release and the README pin `@2` stays. This was the first real run of the Node 24 release workflow (npm `^11.5.1`, `allowScripts`, provenance). Docs sync, the handoff summary and verification from evidence do not apply to a release request; the release guide's checks are the verification.

## Project Release Guide

- Release guide path and revision: `README.md` § "Release (Tag-Based)", named by `AGENTS.md`, at `145c1ed`
- Deviations from the guide and why: `None`. Check 1 was also run CI's way (`npx npm@11.19.1 ci --strict-allow-scripts`).
- Proposed guide fixes, and whether the user agreed: `None` for the release guide. A testing-guideline improvement is follow-up FU-002 (not applied: release-only Task).

## Handoff Summary

- Handoff summary artifact: not applicable (release request); the request is in `handoff.md`
- Handoff summary status: N/A
- Delivery revision record: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/release-2-1-0/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/main@145c1ed`
- Latest tracked remote base reference checked: `origin/main@145c1ed` (fetched 2026-11-05 ~06:24Z, and again before the merge)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Not needed`
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (the guide's pre-tag checks, below)
- Post-integration verification result: `Passed`
- No-rerun rationale: N/A
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker (if applicable): None

## Verification

Release request: the release guide's 7 pre-tag checks and post-publish checks, plus the Task's fresh registry consumers.

- Evidence judged: `Sufficient`
- Evidence relied on: REL-01..06 below.

| Check | Evidence | What You Saw | Judgement |
| --- | --- | --- | --- |
| 1. Fresh install (`rm -rf node_modules && npm ci`), plus CI's strict install | REL-01 | `exit=0`; `npm@11.19.1 ci --strict-allow-scripts` exit 0, 0 install-script warnings, `found 0 vulnerabilities` | Proven |
| 2. typecheck | REL-01 | `{"result":"pass",...}`, exit 0 | Proven |
| 3. npm test | REL-01 | `Test Files 17 passed (17)`, `Tests 167 passed (167)` | Proven |
| 4. build | REL-01 | exit 0 | Proven |
| 5. test:package, non-root (uid 501) | REL-01 | both `"result":"pass"`, `"readonlyWal":"pass"` | Proven |
| 6. `npm pack --dry-run` | REL-01 | `repository_prisma@2.1.0`, 10 files: `CHANGELOG.md`, `DESIGN.md`, `README.md`, `dist/*` (6), `package.json` | Proven |
| 7. CI green on `main` for the release commit | CI run `41980411283` | `9645020`: every step success, including `npm ci --strict-allow-scripts` | Proven |
| Tag matches `package.json` | REL-02 | `v2.1.0` (annotated `2906718`) → `9645020`; `version` `2.1.0` | Proven |
| Release workflow with provenance | REL-02, run `41980513362` | every step success; npm `11.19.1` → `11.21.2`; `npm ci` with 0 install-script warnings; `Signed provenance statement ... GitHub Actions`; `transparency log: ...logIndex=3692722298`; `+ repository_prisma@2.1.0` | Proven |
| npm `latest` = 2.1.0 | REL-02 | `{"latest": "2.1.0"}`; gitHead `9645020`; peers `^7.10.1`; no `dependencies`; engines; SLSA provenance attestation | Proven |
| Fresh registry consumer, npm 12 (README only, pinned `@2`) | REL-03 | npm 12.2.2: `installed repository_prisma: 2.1.0`, uuid not installed; README approve and rebuild; `no adapter import`; ESM and CJS `{"result":"pass"}` (10 checks each); lazy `file:` `ok:true` (ESM, CJS); `postgresql` → `UNSUPPORTED_DATASOURCE_PROVIDER`, no leak | Proven |
| Fresh registry consumer, pnpm 11 | REL-06a, REL-06b (REL-04/05 superseded) | Isolated empty metadata cache. (a) README as written: pnpm 11.28.11 installs **2.0.0** (auto-adds `minimumReleaseAgeExclude: repository_prisma@2.0.0`; every 2.x is under a day old), and the app passes in ESM and CJS. (b) With the test-only exclusion `repository_prisma@2.1.0` (TESTING.md): installs **2.1.0**; ESM and CJS `{"result":"pass"}`, lazy ok, non-SQLite rejected | Proven (2.1.0 under pnpm via (b)) |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`
- User check reference, when needed: N/A
- Re-verification after later re-integration: `Not needed`

Observations (not failures):
- pnpm and a just-published minor. With the README's pinned `@2`, pnpm 11 keeps installing an older 2.x until 2.1.0 is past pnpm's minimum release age (about a day, so until about 2026-11-06 06:29Z). The README promises the major, not the newest minor, so this is consistent with it. npm consumers get 2.1.0 at once.
- REL-04 and REL-05 ran with the machine's pnpm metadata cache, which predated the publish (`cachedAt` 06:15Z, `latest: 2.0.0`, no 2.1.0). So both installed 2.0.0, even with the 2.1.0 exclusion. They are kept as evidence for FU-002 and superseded by REL-06a/b.
- Release run warnings, with no effect on the outcome:
  - `npm warn Unknown user config "always-auth" ... will stop working in the next major version of npm`, from setup-node@v5's default `always-auth: false` in `.npmrc` (FU-001).
  - npm's notice that 2FA-bypassing tokens are being restricted. Trusted publishing uses OIDC, not a token.
  - setup-node's `punycode` DEP0040 warning.

## Release Decision

- Decision: `Stable` (npm `latest`), version 2.1.0
- Decided by: the user, 2026-11-05 (Task comment: "The user decided: release"), via `/project_task_manager`; version 2.1.0 confirmed by the Solution Designer from the final CHANGELOG (`handoff.md`)

## Docs Sync Result

- Docs sync artifact: not applicable (release request)
- Docs sync result: N/A. Release edits only: `CHANGELOG.md` `## Unreleased` → `## 2.1.0`. No other doc states the version: the README pin `@2` stays for a minor.
- Docs updated: `CHANGELOG.md`
- No-impact rationale (if applicable): N/A

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/release-2-1-0/`

## Version / Tag / Release Commit

- Release commit: `9645020` `chore(release): 2.1.0`: `package.json` `version` and `package-lock.json` root `version`/`packages[""].version` 2.0.0 → 2.1.0; CHANGELOG heading. 3 files, +4/−4.
- Tag: annotated `v2.1.0` (object `2906718`) → `9645020`, pushed with `git push origin main --follow-tags`.

## Repository Finalization

- Bootstrap context source: `handoff.md` (finalization target `origin/main`, then tag `v2.1.0`)
- Ticket branch: `codex/release-2-1-0` (handoff `5a74b01`, release `9645020`)
- Ticket branch commit result: `Completed`
- Ticket branch push result: `Completed` (new remote branch `origin/codex/release-2-1-0`)
- Finalization target remote: `origin`
- Finalization target branch: `main`
- Target advanced after verification / acceptance: `No` (`origin/main` = `145c1ed` at merge time)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`
- Merge into target result: `Completed`: fast-forward `145c1ed..9645020` in the shared checkout
- Push target branch result: `Completed`: `145c1ed..9645020  main -> main`. The ticket archive commit follows on the branch and on `main` (fast-forward).
- Repository finalization status: `Completed`
- Blocker (if applicable): None

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide` (Git tag → GitHub Actions `release.yml` → npm trusted publishing with provenance)
- Method reference / command: `git tag -a v2.1.0 -m "2.1.0" 9645020`; `git push origin main --follow-tags`
- Pipelines triggered and their results:
  - CI run `41980411283` (`main` push of `9645020`): success, before tagging.
  - Release run `41980513362` (tag `v2.1.0`): success. Node v24.22.2; npm 11.19.1 → 11.21.2; `npm ci` (both Prisma clients generated by `prepare`); build; `npm publish --provenance --access public`.
  - CI on the archive commit: watched after the push; result in the terminal message.
- Published artifacts checked against what the release should produce: `Yes`. 10 files (publish log `total files: 10`, matching REL-01 check 6). Version 2.1.0, gitHead `9645020`, peers `^7.10.1`, no `dependencies` (the `uuid` removal reached consumers), engines, SLSA provenance, `latest` = 2.1.0. The registry served `latest` 2.0.0 until ~06:29Z (propagation).
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required`. The guide requires no release-notes artifact; `CHANGELOG.md` `## 2.1.0` ships in the tarball.
- Blocker (if applicable): None

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/worktrees/codex/release-2-1-0`
- Worktree cleanup result: `Completed` (after the archive commit was pushed; see the delivery revision record)
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed`
- Remote branch cleanup result: `Not required` (`origin/codex/release-2-1-0` kept, as for earlier tickets)
- Temporary items: `/tmp/rel210-*` (tools, scripts, consumers, isolated pnpm caches) removed. The machine's own pnpm cache was not modified.
- Blocker (if applicable): None

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

N/A

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `Not required` (`CHANGELOG.md` `## 2.1.0`)
- Archived release notes artifact used for release/publication: N/A
- Release notes status: `Not required`

## Deployment Steps

None (npm library).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none (no persisted-data change in 2.1.0)
- Delivery action required: `None`
- Result and evidence: registry consumers store DateTime as INTEGER ("DateTime stored as integer and read back": pass)

## Verification Checks

REL-01 (pre-tag 1–6), CI 41980411283 (7), REL-02 (tag, Release 41980513362, npm view), REL-03 (npm 12 consumer), REL-06a/b (pnpm 11 consumers), REL-04/05 (stale-cache runs, FU-002).

## Rollback Criteria

- Never move or delete `v2.1.0` or unpublish; fix forward with 2.1.1.
- If 2.1.0 is broken for consumers, publish a fix-forward patch. If needed, `npm deprecate repository_prisma@2.1.0 "<reason>"` (user decision); 2.0.0 stays installable via `@2.0.0`.
- Signals: consumer reports, autobyteus-382 (server-ts upgrade) failures.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (`Completed`)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`, after the archive commit was pushed and cleanup finished
- Terminal message/reference: `Delivery Completed` to the Solution Designer address from `get_handoff_rules`, 2026-11-05

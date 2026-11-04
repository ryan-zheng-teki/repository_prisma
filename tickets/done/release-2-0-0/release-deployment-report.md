# Delivery / Release / Deployment Report — release-2-0-0

## Release / Publication / Deployment Scope

Release request (`Release Requested`, Project Task `repository-prisma-5`): publish the Prisma 7 upgrade already merged on `main@f091ee1` as `repository_prisma` **2.0.0** (stable, npm `latest`). The version was confirmed by the Solution Designer: semantic versioning requires a major version because the CHANGELOG lists breaking public changes. No software change. Docs sync, the handoff summary and verification from evidence do not apply to a release request; the release guide's checks are the verification.

## Project Release Guide

- Release guide path and revision, or `No project release guide`: `README.md` § "Release (Tag-Based)" (`AGENTS.md`), at `f091ee1`
- Deviations from the guide and why: `None`. An annotated `v2.0.0` tag matching `package.json` was pushed with `git push origin main --follow-tags`, which triggered `release.yml` (trusted publishing).
- Proposed guide fixes, and whether the user agreed: `None` new. The finalization-target and pre-tag-check improvements belong to repository-prisma-2.

## Handoff Summary

- Handoff summary artifact: not applicable (release request). The request is in `handoff.md`.
- Handoff summary status: N/A
- Delivery revision record: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/release-2-0-0/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/main@f091ee1`
- Latest tracked remote base reference checked: `origin/main@f091ee1` (fetched 2026-11-04 ~15:00Z, and again before the merge)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Not needed`
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (the release preflight, below)
- Post-integration verification result: `Passed`
- No-rerun rationale: N/A
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker (if applicable): None

## Verification

Release request: the release guide's checks plus the Task's pre-tag checks are the verification.

- Evidence judged: `Sufficient`
- Evidence relied on:
  - `evidence/REL-01-preflight.log`: run as non-root uid 501 (FU-005 of the upgrade), macOS arm64, Node v22.23.1, from a fresh `npm ci`. `npm ls` shows the 7.10.1 peers; typecheck exit 0; `npm test` 11 files / 113 tests passed; build exit 0; `test:package` (smoke and interop) both `"result":"pass"`; `git diff --check` ok.
  - `evidence/REL-02-pack-and-audit.log`: `npm pack --dry-run` gives `repository_prisma@2.0.0`, 10 files (`dist/`, README, DESIGN, CHANGELOG, `package.json`).
  - CI on `main@c308d3c` (run `41853928151`, success; hosted ubuntu, Node 20) before tagging.

| Check | Evidence | What You Saw | Judgement |
| --- | --- | --- | --- |
| Tests, build, package checks before tagging | REL-01, CI 41853928151 | All exit 0; 113/113; smoke and interop pass | Proven |
| Tag matches `package.json` | REL-05 | `v2.0.0` (annotated `75d00bc`) → `c308d3c`; `package.json` `2.0.0` | Proven |
| Release workflow | REL-05, run 41854285574 | All steps `success`, incl. `npm publish --provenance --access public` | Proven |
| npm `latest` = 2.0.0 | REL-05 | `{"latest": "2.0.0"}`; version 2.0.0, gitHead `c308d3c`, peers `^7.10.1`, engines, SLSA provenance attestation | Proven |
| Fresh SQLite consumer install of the published package | REL-03 (ESM), REL-04 (CJS) | `npm install repository_prisma@2.0.0` resolved from `registry.npmjs.org/.../repository_prisma-2.0.0.tgz`; `legacy-peer-deps=false`; peers `@prisma/adapter-better-sqlite3@7.10.1` and `@prisma/client` auto-installed; README setup only; `{"result":"pass"}` (10 checks: CRUD, transaction commit/rollback, DateTime INTEGER, non-SQLite rejected without leaking the URL); lazy `file:` `ok:true`; lazy `postgresql` `UNSUPPORTED_DATASOURCE_PROVIDER`, `leaks:false` | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`
- User check reference, when needed: N/A
- Re-verification after later re-integration: `Not needed`

## Release Decision

- Decision: `Stable` (npm `latest`), version 2.0.0
- Decided by: the user, 2026-11-04: "release the Prisma version" (via `/project_task_manager`, Project Task `repository-prisma-5`); version 2.0.0 confirmed by the Solution Designer (`handoff.md`).

## Docs Sync Result

- Docs sync artifact: not applicable (release request)
- Docs sync result: N/A. The release edits included the one doc sentence that would become false on release (README release section: "The `Unreleased` changes ... need a major version before they are released"). It was removed, as the handoff allowed ("any doc text that states the version").
- Docs updated: `CHANGELOG.md` (`## Unreleased (breaking: requires a major release)` → `## 2.0.0`), `README.md` (that sentence)
- No-impact rationale (if applicable): N/A

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/release-2-0-0/`

## Version / Tag / Release Commit

- Release commit: `c308d3c` `chore(release): 2.0.0`. It changes `package.json` `version` and `package-lock.json` root `version`/`packages[""].version` (1.0.10 → 2.0.0), the CHANGELOG heading and the README sentence. 4 files, +6/−7.
- Tag: annotated `v2.0.0` (object `75d00bc`) → `c308d3c`, pushed with `git push origin main --follow-tags`.

## Repository Finalization

- Bootstrap context source: `handoff.md` § Workspace (finalization target `origin/main`, then tag `v2.0.0`)
- Ticket branch: `codex/release-2-0-0` (handoff commit `57a104d`, release commit `c308d3c`)
- Ticket branch commit result: `Completed`
- Ticket branch push result: `Completed` (new remote branch `origin/codex/release-2-0-0`)
- Finalization target remote: `origin`
- Finalization target branch: `main`
- Target advanced after verification / acceptance: `No` (`origin/main` = `f091ee1` at merge time)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`
- Merge into target result: `Completed`: fast-forward `f091ee1..c308d3c` in the shared checkout
- Push target branch result: `Completed`: `f091ee1..c308d3c main -> main`. The ticket archive commit follows on the branch and on `main` (fast-forward).
- Repository finalization status: `Completed`
- Blocker (if applicable): None

## Release / Publication / Deployment

- Applicable: `Yes`
- Method: `Project Release Guide` (Git tag → GitHub Actions `release.yml` → npm trusted publishing)
- Method reference / command: `git tag -a v2.0.0 -m "2.0.0" c308d3c`; `git push origin main --follow-tags`
- Pipelines triggered and their results:
  - Release run `41854285574` (tag `v2.0.0`, `c308d3c`): `success`. Steps: checkout, setup-node (Node v20.20.2), npm 11.5.1, `npm ci` (Prisma Client 7.10.1 generated; known EBADENGINE warning), build, `npm publish --provenance --access public`. The log shows `+ repository_prisma@2.0.0` and a signed provenance statement in the sigstore transparency log.
  - CI run `41853928151` on the `main` push of `c308d3c`: `success` (before tagging).
  - CI on the later archive commit (ticket documents only): watched after the push, with its result given in the terminal message to the Solution Designer.
- Published artifacts checked against what the release should produce: `Yes`. 10 files, matching the preflight `npm pack` listing. Version 2.0.0, gitHead `c308d3c`, peers `@prisma/client ^7.10.1` and `@prisma/adapter-better-sqlite3 ^7.10.1`, `engines.node ^20.19 || ^22.12 || >=24`, SLSA provenance attestation, `dist-tags.latest` = `2.0.0`. Note: the registry served `latest` = 1.0.10 for about 50 s after publish (propagation lag), and 2.0.0 from 15:10:17Z.
- Release/publication/deployment result: `Completed`
- Release notes handoff result: `Not required`. The guide requires no release-notes artifact; `CHANGELOG.md` `## 2.0.0` is the published release notes, and it ships in the tarball.
- Blocker (if applicable): None

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/worktrees/codex/release-2-0-0`
- Worktree cleanup result: `Completed` (after the archive commit was pushed; see the delivery revision record)
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed`
- Remote branch cleanup result: `Not required`. `origin/codex/release-2-0-0` is kept, as for earlier tickets.
- Temporary consumers `/tmp/rel-200` and `/tmp/de-rerun`: removed.
- Blocker (if applicable): None

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

N/A

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `Not required` (`CHANGELOG.md` `## 2.0.0`)
- Archived release notes artifact used for release/publication: N/A
- Release notes status: `Not required`

## Deployment Steps

None (npm library).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (from the upgrade, prisma-7-upgrade)
- Delivery action required: `None`
- Result and evidence: the registry consumers store DateTime as INTEGER (REL-03/04 check "DateTime stored as integer and read back")
- Migration completion, validation, recovery, and rollout evidence, only when `Migration Required`: N/A

## Verification Checks

REL-01 (preflight), REL-02 (pack and audit), CI 41853928151, Release 41854285574, REL-05 (publication), REL-03/REL-04 (fresh registry consumers, ESM and CJS).

Audit note: `npm audit` on the repository lockfile reports 9 advisories (REL-02). They are identical on the published 1.0.10 line and all but `uuid` are dev-only. The published package's consumers get `uuid@13.0.2` and `found 0 vulnerabilities`. Judged not a release blocker; recorded as follow-up FU-001 in `follow-ups.md`.

## Rollback Criteria

- Never move or delete the `v2.0.0` tag, and do not unpublish. Fix forward with 2.0.1 (or 2.1.0).
- If 2.0.0 proves broken for consumers, publish a fix-forward patch. If needed, `npm deprecate repository_prisma@2.0.0 "<reason>"`; this needs the user's decision. Prisma-5 consumers stay on 1.0.10, which remains installable.
- Signals: consumer upgrade autobyteus-382 failures, or GitHub/npm issue reports.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (`Completed`)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`, after the archive commit was pushed and cleanup finished
- Terminal message/reference: `Delivery Completed` to the Solution Designer address from `get_handoff_rules`, 2026-11-04

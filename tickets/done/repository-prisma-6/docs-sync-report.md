# Docs Sync Report — repository-prisma-6

## Scope

- Ticket: `repository-prisma-6` (Project Task `repository-prisma-6`); `task_size = Medium`, `architectural_risk = Low`, route `Direct` (architecture review and code review `N/A — not applicable`)
- Trigger: API/E2E API-REV-001 Pass (95%), handed off by the API/E2E engineer
- Bootstrap base reference: `origin/main@5a73159`
- Integrated base reference used for docs sync: `origin/main@5a73159` (refreshed 2026-11-04 ~17:30Z, not advanced; the ticket branch is a fast-forward of it). Ticket head `157f5ee`.
- Post-integration verification reference: `evidence/DE-01-delivery-rerun.log`

## Why Docs Were Updated

- Summary: the change adds an install-script approval policy and CI strict mode, guidance for consumers on npm 12+/pnpm 10+, and a split package smoke. The docs were updated in the change: README setup and Testing (`7047cdf`), CHANGELOG `## Unreleased`, plus the new testing guideline `TESTING.md` and its `AGENTS.md` line (API/E2E, `157f5ee`). Delivery checked all three project documents and the README against the final code and evidence. They are accurate, so delivery made no further edits.
- Why this should live in long-lived project docs: consumers on current npm/pnpm need the native-build step, or the library fails with `CONNECTION_FAILED`. Maintainers need the approval policy, the re-approve step after an upgrade, and how to test (TESTING.md).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design document | No change | It describes the library's runtime architecture and package boundary, not the test scripts or install policy. Its toolchain note (`prepare` runs `prisma generate` after `npm install`/`npm ci`) is still true under the allowScripts policy: `prepare` is the root project's script, not a dependency install script (API-06 `✔ Generated Prisma Client` with a strict install). |
| `TESTING.md` (testing guideline; created in this ticket by API/E2E) | Testing guideline | Created (in this change; verified) | Checked against the final code. The test files listed exist in `src/tests`. The smoke runner/steps layout matches `scripts/run-package-smoke.js` plus `scripts/package-smoke/`. `--legacy-peer-deps` is in `consumer-install.js:18`. The approval policy matches `package.json` `allowScripts`. CI strict install matches `ci.yml`. The npm 12 pack JSON shape and the root skip match the code and evidence. No discrepancy is recorded in the ticket reports. |
| `README.md` § Release (Tag-Based) (release guide per `AGENTS.md`) | Release guide | No change | Still accurate. DEC-004 kept `release.yml` unchanged; the strict install is enforced by step 7 (CI green on `main`). The release workflow's `npm ci` reads `allowScripts` with npm 11.21.1: 0 warnings, native module built, dry-run publish passes (API-11). |
| `README.md` setup and Testing | Consumer and maintainer guidance | Updated (in this change; verified) | Every consumer fix was executed as written: npm 12 (API-08, IMP-10), pnpm 11 (API-07), pnpm 12 and 10 (IMP-10). The maintainer policy matches `package.json` and `ci.yml`. |
| `CHANGELOG.md` `## Unreleased` | Change record | Updated (in this change; verified) | Three bullets match the change; `version` `2.0.0`. |
| `AGENTS.md` | Project instructions | Updated (in this change; verified) | One line names `TESTING.md` and when to read it, as the team's project-documents rule asks. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | Consumer setup; maintainer Testing | pnpm direct `@prisma/client`; the "Allow the native SQLite build" steps per package manager; the approval policy | REQ-004, REQ-005 |
| `CHANGELOG.md` | Unreleased | README guidance, repository policy and strict CI, smoke split | REQ-005 |
| `TESTING.md` | New testing guideline | Layers, commands, install policy, environments, package-manager behaviors, rules | Team project-documents rule (missing guideline) |
| `AGENTS.md` | Pointer | Names `TESTING.md` | Same |
| (delivery) | None | No further edits | Docs already match the final state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Install-script policy | Approve only `better-sqlite3` (pinned) and deny the rest. CI is strict. Re-approve after upgrading. | `requirements-doc.md` DEC-002..004, IMP-07..09 | `README.md` Testing; `TESTING.md` Setup |
| Consumer native build | npm 12+ and pnpm 10+ skip it, giving `CONNECTION_FAILED` "Could not locate the bindings file". Fix per package manager. pnpm needs a direct `@prisma/client`. | `investigation-notes.md`, IMP-10, API-07/08 | `README.md` setup |
| Package smoke structure | A runner plus one module per check area. Output equivalence is the move-only rule. npm 12 pack JSON shape. | `design-spec.md`, API-02/03 | `TESTING.md` |
| pnpm minimum release age | Test-only `minimumReleaseAgeExclude` for just-published versions | API-07 | `TESTING.md`; the consumer-facing side is FU-003 |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Monolithic `scripts/run-package-smoke.js` (739 lines) | 43-line runner + `scripts/package-smoke/*.js` (8 modules, largest 222 lines) | `TESTING.md` Test Layers |
| README "npm 7+ and pnpm install the peers automatically" | npm 7+ only; pnpm adds `@prisma/client` directly | `README.md` setup |
| CI `npm ci` | `npm ci --strict-allow-scripts` | `README.md` Testing; `TESTING.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: merge to `main`, then verify the post-merge CI run (AC-005)
- Notes: none

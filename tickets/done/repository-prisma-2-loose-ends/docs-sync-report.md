# Docs Sync Report — repository-prisma-2-loose-ends

## Scope

- Ticket: `repository-prisma-2-loose-ends` (Project Task `repository-prisma-2`); `task_size = Small`, `architectural_risk = Low`, route `Direct` (architecture review and code review `N/A — not applicable`)
- Trigger: API/E2E API-REV-001 Pass (95%), handed off by the API/E2E engineer
- Bootstrap base reference: `origin/main@aa933e0`
- Integrated base reference used for docs sync: `origin/main@aa933e0` (refreshed 2026-11-04 ~16:48Z, not advanced; the ticket branch is a fast-forward of it). Ticket head `b11d678`, code `e213742`.
- Post-integration verification reference: `evidence/DE-01-delivery-rerun.log`

## Why Docs Were Updated

- Summary: the change updates the release guide (finalization target `main`, 7 ordered pre-tag checks, post-publish check, never move a tag) and adds a DESIGN "Design Cases" section with DC-001. It also records the consumer-visible `uuid` removal and the tooling/CI changes under CHANGELOG `## Unreleased`. These were written by the implementation engineer in `e213742`. Delivery checked them against the final code and found them accurate, so delivery made no further edits.
- Why this should live in long-lived project docs: AGENTS.md makes README the release guide, and future deliveries follow it. Design cases are durable lessons for reviewers.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` § Release (Tag-Based) | Release guide (REQ-004) | Updated (in this change; verified) | It matches the steps 2.0.0 used. Step 5's root note matches the smoke output (`skip: read-only WAL case ...`, `"readonlyWal":"skipped-root"`, API-03). The step 6 file list matches the 10 packed files. |
| `README.md` (rest) | Node/CI mentions, `uuid` | No change | Consumer requirement `^20.19 \|\| ^22.12 \|\| >=24` is unchanged and still right; no `uuid` mention. |
| `DESIGN.md` § Design Cases | REQ-005 | Updated (in this change; verified) | DC-001 matches the 2.0.0 upgrade's CR-001 record and section E. |
| `CHANGELOG.md` `## Unreleased` | REQ-007 | Updated (in this change; verified) | The package versions named match the lockfile (API-08). `version` is still `2.0.0`. |
| `.github/workflows/*.yml` | Docs-adjacent | Updated (in this change) | Node 24, actions v5, `npm@^11.5.1` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | Release guide | Finalization target, pre-tag checks, post-publish check | REQ-004 |
| `DESIGN.md` | Design cases | New section + DC-001 | REQ-005 |
| `CHANGELOG.md` | Unreleased entry | uuid removal, audit fixes, Node 24 workflows, root smoke skip | REQ-007 |
| (delivery) | None | No further edits | Docs already match the final integrated state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Release procedure | Finalize on `main`; 7 checks before tagging; verify the registry after publishing; fix forward | `design-spec.md`; release-2-0-0 report | `README.md` |
| Root smoke skip | As root the read-only WAL case is skipped and reported; non-root must run it (the marker assertion enforces this) | `design-spec.md` DEC-004 | `README.md` step 5; `CHANGELOG.md` |
| Design case DC-001 | Single-connection transaction isolation lesson | prisma-7-upgrade CR-001 | `DESIGN.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `uuid` runtime dependency, `@types/uuid`, tsup `uuid` external | Nothing (unused) | `CHANGELOG.md` Unreleased |
| Node 20, `actions/*@v4`, `npm@11.5.1` pin | Node 24, `actions/*@v5`, `npm@^11.5.1` | workflows; `CHANGELOG.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: merge to `main`, then verify the post-merge CI run (AC-001)
- Notes: none

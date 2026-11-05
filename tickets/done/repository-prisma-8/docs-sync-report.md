# Docs Sync Report — repository-prisma-8 Part A

## Scope

- Ticket: `repository-prisma-8` Part A (Project Task `repository-prisma-8`); `task_size = Small`, `architectural_risk = Low`, route `Direct` (architecture review and code review `N/A — not applicable`). Part B (application-supplied driver adapter, DEC-B1) is not part of this delivery.
- Trigger: API/E2E API-REV-001 Pass (95%), handed off by the API/E2E engineer
- Bootstrap base reference: `origin/main@4a2f312`
- Integrated base reference used for docs sync: `origin/main@4a2f312` (refreshed 2026-11-05 ~08:00Z, not advanced; the ticket branch is a fast-forward of it). Ticket head `6465d44`, code `e44ea62`.
- Post-integration verification reference: no local rerun needed (see the release report). The post-merge GitHub CI run is AC-A2.

## Why Docs Were Updated

- Summary:
  - TESTING.md now says that pnpm caches registry metadata, and how to test a just-published version: an empty cache via `pnpm_config_cache_dir` or `--cache-dir`, or `pnpm cache view`.
  - CHANGELOG `## Unreleased` records the setup-node v6 move.
  - Both were written in `e44ea62`. Delivery verified them against the evidence and made no further edits.
- Correction recorded: release-2-1-0's FU-002 proposed `npm_config_cache_dir`. IR-001 found, and API-04 confirmed, that pnpm 11 and 12 ignore it (0 files written). Delivery's release-2-1-0 runs worked only because they also set `pnpm_config_cache_dir`. The TESTING.md text uses the working settings.
- Why this should live in long-lived project docs: the next release's pnpm consumer check follows TESTING.md.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design document | No change | No workflow or test-environment content |
| `TESTING.md` (testing guideline) | Testing guideline | Updated (in this change; verified) | The new bullet matches API-04 (the `pnpm_config_cache_dir` and `--cache-dir` settings work; `npm_config_cache_dir` is ignored, on pnpm 11.28.11 and 12.16.1) and API-04b (`pnpm cache view` shows a stale cache without 2.1.0; an empty cache lists it). It does not suggest `pnpm cache view --cache-dir`, which pnpm 11 rejects. |
| `README.md` § Release (Tag-Based) (release guide per `AGENTS.md`) | Release guide | No change | It names no action versions. Its steps are unchanged: the workflow still runs `npm ci`, build and `npm publish --provenance` after setup-node. |
| `README.md` (rest) | Mentions of the workflows | No change | No mention of setup-node or always-auth |
| `CHANGELOG.md` `## Unreleased` | Change record | Updated (in this change; verified) | One repository line; version `2.1.0`; no tag contains `e44ea62` (API-05) |
| `AGENTS.md` | Project instructions | No change | Still accurate |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | Testing guideline | pnpm metadata-cache bullet | REQ-A2 (release-2-1-0 FU-002) |
| `CHANGELOG.md` | Unreleased | setup-node v6 line | REQ-A1 |
| (delivery) | None | No further edits | Docs already match |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| pnpm metadata cache | A stale cache hides a just-published version, even with `minimumReleaseAgeExclude`. Use `pnpm_config_cache_dir`/`--cache-dir`, not `npm_config_cache_dir`. | release-2-1-0 REL-05/06; API-04/04b | `TESTING.md` § Environments |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `actions/setup-node@v5` (wrote `always-auth=false`) | `actions/setup-node@v6` (same inputs; no always-auth line) | workflows; `CHANGELOG.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive, merge to `main`, post-merge CI (AC-A2)
- Notes: none

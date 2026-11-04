# Investigation Notes

## Investigation Meta

- Package identifier: `repository-prisma-6` (Project Task `repository-prisma-6`, project `project_75b2027e-1264-44a0-99d7-92b5838eae81`)
- Workspace root: `/Users/normy/autobyteus_org/worktrees/codex/repository-prisma-6`
- Repository mode: `Git`
- Task branch: `codex/repository-prisma-6-smoke-split-install-scripts` (no upstream)
- Resolved base: `origin/main@5a731595db5b3084a070d56479242259a11ccbf2` (fetched 2026-11-04)
- Finalization target: `origin/main`
- Bootstrap result: Completed
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`, `architecture-design.md`, `design-principles.md`, project `DESIGN.md` (all read in full in this conversation on 2026-11-04)
- Investigation status: Complete

## Request

Task repository-prisma-6:
1. Split the 739-line `scripts/run-package-smoke.js` into owned files, keeping the behavior and output of `npm run test:package`.
2. Decide and record install-script approvals (better-sqlite3 native build); add a README note for consumers if their package manager would block the adapter's native install.

Constraints: no release; README per AGENTS.md; say if changes reach consumers.

## Source Log

| Date | Type | Source / Command | Finding |
| --- | --- | --- | --- |
| 2026-11-04 | Code | `scripts/run-package-smoke.js` (739 lines) | Sections: harness 1-52; packed-artifact checks 54-148; consumer install 149-182; import safety (constructor/native spy, CJS+ESM) 184-281; logging-policy matrix 283-497; CJS runtime smoke incl. read-only WAL and root skip 499-605; ESM runtime smoke + no-query-string-file check 608-649; consumer TypeScript declaration check 651-718; final JSON 720-735; cleanup `finally` |
| 2026-11-04 | Code | `package.json:20` | `test:package` = `npm run build && node scripts/run-package-smoke.js && node scripts/run-esm-cjs-interop.js` (interop script 118 lines, out of scope) |
| 2026-11-04 | Command | `npm help install-scripts` (npm 11.19.1, Node 24.22.2 official build) | `allowScripts` field in the project's `package.json`; `npm install-scripts approve <pkg>` writes pinned `pkg@version: true`; `deny` writes `name: false`; `--no-allow-scripts-pin` for name-only |
| 2026-11-04 | Command | `npm view npm dist-tags` | npm `latest` = **12.2.1** (12.0.0 on 2026-07-08); `next-11` = 11.21.1 |
| 2026-11-04 | Web | GitHub community discussion 198547 "Preparing for npm v12"; npm/cli PR 9838 | npm 12: dependency install scripts are off by default; skipped with a warning, install succeeds; `strict-allow-scripts` turns this into a hard error; only the root project's approvals apply ("Your downstream users won't run your scripts by default in v12") |
| 2026-11-04 | Code | `autobyteus-workspace-superrepo/package.json:23-37` | Consumer uses `pnpm@10.28.2`; its `pnpm.onlyBuiltDependencies` lists `@prisma/client`, `@prisma/engines`, `prisma`, `esbuild`, ... but **not `better-sqlite3`** |

## Runtime, Probe, Or Reproduction Findings

Probe files: `probes/` in this ticket folder.

| Method | Scenario | Observation | Established |
| --- | --- | --- | --- |
| Fresh consumer `/tmp/npm12-consumer`, `npx npm@12.2.1 install repository_prisma@2.0.0` + `-D prisma@^7.10.1`, `prisma generate`, `node consumer-app.mjs` | Published 2.0.0 on npm 12 | `better-sqlite3@12.11.1` install script blocked; no `build/Release/*.node`. App: `initializePrisma` rejects `CONNECTION_FAILED`, with the diagnostic cause "Could not locate the bindings file" | Reproduced |
| same, `npm install-scripts approve better-sqlite3` -> `allowScripts: {"better-sqlite3@12.11.1": true}`, `npm ci`, generate, app | Fix for npm 12 consumers | native module built; app `count 0`, `RESULT ok`. `prisma`/`@prisma/engines` scripts still blocked; not needed | Reproduced |
| Fresh consumer, `pnpm@12.16.1 add repository_prisma@2.0.0` | pnpm 12 | Fails: `ERR_PNPM_IGNORED_BUILDS: Ignored build scripts: better-sqlite3@12.11.1` | Reproduced |
| same, `pnpm approve-builds better-sqlite3` -> `pnpm-workspace.yaml` `allowBuilds: better-sqlite3: true`; then `prisma generate` | pnpm 12 fix | Native module built. `prisma generate` then fails "Could not resolve @prisma/client" (pnpm installs the peer but does not link it at the project root). After `pnpm add @prisma/client@^7.10.1`: generate OK, `RESULT ok` | Reproduced |
| Fresh consumer, local `pnpm@10.28.2 add repository_prisma@2.0.0` | pnpm 10 | "Ignored build scripts: better-sqlite3"; no native module. `pnpm approve-builds` is interactive. `pnpm-workspace.yaml` `onlyBuiltDependencies: [better-sqlite3]` + `pnpm install` builds it | Reproduced |
| Repo copy `/tmp/rp6-npm12` (`git archive 5a73159`), `npx npm@12.2.1 ci`, no approvals | Repo on npm 12 | 5 packages blocked (`@prisma/engines`, `better-sqlite3`, `esbuild`, `fsevents`, `prisma`). `prepare` still generates; typecheck OK; build OK; **19 tests fail**: "Could not locate the bindings file" | Reproduced |
| same, `allowScripts` = approve `better-sqlite3@12.11.1`, deny `esbuild`, `prisma`, `@prisma/engines`, `fsevents` (`probes/repo-allowScripts.json`); npm 12 `ci` | Repo with approvals, macOS arm64 | No install-script warnings; 113/113 tests; build; both `test:package` checks pass | Reproduced |
| same tree, npm 10.9.8 `ci` | Unknown field on older npm | Ignored; native module built; normal install | Reproduced |
| same tree, Node 24.22.2 / npm 11.19.1 `npm ci --strict-allow-scripts` | CI enforcement | Passes with full coverage. With the approval changed to a stale pin `better-sqlite3@12.10.0`: `npm error code ESTRICTALLOWSCRIPTS`, nothing installed | Reproduced |
| same tree in `node:24-bookworm` (linux/amd64, Docker 29.0.1), `npm i -g npm@12.2.1`, `npm ci`, `npm test`, build | Linux x64 with denials | No warnings; native module built; `@prisma/engines` contains `schema-engine-debian-openssl-3.0.x` without its postinstall; 113/113; build OK | Reproduced |

Temporary diagnostics: none. All probes ran in `/tmp`.

## Persisted Data And State Facts

Not affected.

## Requirement Implications

- Consumers on npm 12 (npm's `latest`) or pnpm 10+ get a broken install of the published 2.0.0 unless they approve `better-sqlite3`. This is a present problem, not a future one. The README note is required, and its pnpm instructions must also cover adding `@prisma/client` directly; without that, the pnpm setup still fails at `prisma generate`.
- A library cannot approve scripts for its consumers; only the root project's approvals apply.
- The repo itself fails its tests on npm 12 without approvals. Only `better-sqlite3` needs approval.

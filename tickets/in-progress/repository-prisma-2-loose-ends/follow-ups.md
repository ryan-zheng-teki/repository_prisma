# Follow-ups: repository-prisma-2-loose-ends

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, design-spec.md | `scripts/run-package-smoke.js` is 729 lines, over the team's 500-line limit, and mixes pack checks, several generated consumer scripts (ESM/CJS import safety, policy, CJS smoke) and result reporting | `wc -l scripts/run-package-smoke.js` = 729 at `aa933e0` | Pre-existing; this ticket adds only a few lines | No | Split the package smoke into owned files (e.g. one per generated consumer scenario plus a small runner), keeping `npm run test:package` behavior and output. | |

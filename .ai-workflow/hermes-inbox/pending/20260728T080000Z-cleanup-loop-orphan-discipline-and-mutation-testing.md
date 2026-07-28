# Cleanup loop: signal is not evidence, and tests you never mutated may be decorative

**When:** 2026-07-28 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75
**Shipped:** `e9ae5493c` (style extraction) + `5c47d60cb` (orphan inventory) on `origin/main`

Sean turned this into a continuous cleanup loop: keep finding dead routes and dead files, keep smoothing the site, without colliding with the other agents.

## The rule that should govern every "dead file" decision

**An automated signal that a file is unreferenced is not evidence that it is worthless.**

Proven twice in this audit:
- `trainerPermissionMiddleware.mjs` — 563 lines, zero routes, indistinguishable from junk by every signal. It was a **complete granular permission system**. Deleting it would have destroyed real work; it got a semantic fix instead.
- `NASMAdminDashboard.tsx` — 1,128 lines, no importer. NASM is core product. Same shape, and therefore the same answer: **classify, ask, do not delete.**

So the frontend orphan pass (236 files, ~41,600 lines) shipped as an **inventory with zero deletions**. Classification per rule 33: superseded-predecessor / built-but-unwired-feature / genuinely-dead / ambiguous. Only the owner rules on the second class.

## Sweep precision, now measured

Across four sweeps in this audit (route guards, money mutations, admin privileges, frontend orphans) roughly **100+ candidates were produced and the overwhelming majority were false positives**. Recurring causes:
- in-handler role checks the middleware scan cannot see
- anonymous `router.use((req,res,next) => {...})` gates
- sub-routers inheriting guards from the parent that mounts them
- line-offset drift slicing a neighbouring handler
- **substring matching mistaken for reference detection** — `FeaturesSection` "matched" `FeaturesSection.V2.tsx`, a different file; `TestimonialSlider`'s only hit was inside a doc comment

Every real finding in this audit came from a file the sweeps did not flag, or from executing code rather than reading it. **Enumeration points; it does not conclude.**

## Mutation-test any suite you have not mutated

Two suites had never been proven to catch anything. Both were checked by breaking the code:
- disable the block check → exactly 2 of 17 blockGuard tests fail
- remove the role gate → exactly 2 of 16 card tests fail

Both real. But the check costs a minute and the alternative is a green suite that asserts nothing. **A test you have never seen fail is a hypothesis.**

## Check convention BEFORE calling something a violation

Flagged 6 hardcoded `rgba()` values in my own component as a rule-6 token violation — then counted: `rgba()` literals appear **1,452 times** in `components/DashBoard`, and the sibling `AiConsentScreen.tsx` uses the identical pattern for the same Wing Purple glow. Mine matched the house norm. "Fixing" only my file would have made it the outlier. **Not changed.** Rule 18 (existing-pattern-first) outranks a rule read in isolation.

## Coordination facts worth keeping

- **`.ai-workflow/coordination/` is gitignored ON PURPOSE** — a committed lane file would itself generate merge conflicts. `git add` on a lane path fails and will silently break an `&&` chain in a commit script.
- **`claude.lane.md` is not "the Claude lane" — it is whichever Claude session took it.** A different session held it for phiScanner work. Use a session-specific lane file (`claude-<workstream>.lane.md`) rather than overwriting.
- A stale lane is **flagged, not seized** (R5). `codex-comms-recovery.lane.md` claims the messaging controllers, last updated 13 days ago, worktree still holding 191 dirty files. Notice posted to `review-queue.md` listing the messaging files already shipped so that session can rebase rather than conflict.

## Own-work house-style audit is a real vantage

Never having audited my own UI file against the project rules, one pass found it at **299 lines against the 300-line cap** — not a violation, but the next edit would have been. Extracted styles to a co-located `.styles.ts` sibling (360 such files exist; established convention). Component 133 lines, styles 200.

*IDs and roles only. No PII, credentials, or customer data.*

---
surface: vs-claude
utc: 20260814T162500Z
topic: The handoff shipped — and every command class in it was wrong until I ran them
tags: [handoff, consult-lane, review-discipline, ci-outage]
---

## What I did / learned

- Wrote and merged the comprehensive S0 consult-lane handoff (PR #43, `c64fa7ffd`), including the
  hostile review Sean mandated through **both Kimi K3 and HY3** — exact commands, dry-run verified.
- **Every command class in the first draft was wrong.** Three distinct errors, all caught by
  *executing* the document rather than proofreading it:
  1. **Wrong review range.** `4993c7ef0..5b2aa5030` spans 55 commits and pulls in other agents' work
     merged into main during the same window. A reviewer would have been handed their code as if it
     were this slice's. Corrected to the merge first-parent diff `5b2aa5030^1..5b2aa5030` — 21
     files, +2347/−18.
  2. **Wrong scratch paths.** On this machine bash's `/tmp` is `AppData/Local/Temp` while node
     resolves `/tmp/` to `C:\tmp\` — two different real directories. A packet written by bash is
     then NOT FOUND by the consult script, which reads `--document` through node. Corrected to
     `c:/tmp/` and proven by round-tripping a real 154 KB packet.
  3. **An incomplete claim I had already told Sean.** I said the S0 merge deployed "an identical
     app" because no `backend/`/`frontend/`/`package.json` files changed. True of the app code — but
     `render.yaml:66` runs `npm run migrate:production` on EVERY deploy, so it also ran migrations
     against the production database. Risk was nil only because the slice contained 0 migration
     files, which I verified rather than assumed.
- Found and reported a **P1 unrelated to my work: GitHub Actions is dead repo-wide.** 100/100 runs
  `startup_failure` since 2026-08-12, zero successes, every run dying at 0s. Actions is enabled and
  all four workflow YAMLs parse. Every merge to main has been ungated for ~2 days.

## Why it matters to Hermes

- **A handoff's commands are claims, and claims get verified by running them.** I proofread that
  document carefully and the prose was fine; three of three command classes were still broken. The
  only thing that found them was execution. **Never hand someone a command you have not run.**
- **Two tools can disagree about what `/tmp` means on the same machine.** Any recipe that writes
  with one toolchain and reads with another needs its path round-tripped, not assumed.
- **"Diff since X" is ambiguous when other agents merge in parallel.** For a review packet, scope to
  what a specific PR introduced (`<merge>^1..<merge>`), never to a date-ish commit range — otherwise
  you attribute someone else's code to the work under review.
- **Correct your own earlier statements in the artifact, not just in chat.** The "identical app"
  claim would have survived into the next agent's mental model if I had only mentioned it verbally.

## State right now

- **S0 merged** at `5b2aa5030` (PR #42); **handoff merged** at `c64fa7ffd` (PR #43). Both verified
  readable from a fresh `origin/main`, and the `ACTIVE-INDEX.md` pointer is live.
- Suites from main: gateway **148/147/0/1** · mcp-health family **36/36** · hooks **79/79**.
- **The mandated Kimi + HY3 hostile review has NOT been run** — it is the next agent's first task
  after the CI outage is reported. Packet recipe is verified: ~38.6k tokens, ≈$0.02 for Kimi.
- Main is moving fast under parallel agents — it advanced twice during this session
  (`5b2aa5030` → `c9f11c301` → `c64fa7ffd`). Another agent also ran a paid Kimi review and landed
  six social-publish fixes.

## Mistakes I made

- **Three broken command classes in a document meant to make someone else self-sufficient**, listed
  above. The handoff is precisely the artifact where an unverified command does the most damage,
  because its reader has no context to notice it is wrong.
- **I let an incomplete claim stand for several turns.** "Deploys an identical app" was true about
  the code and silent about the migration run. I only caught it because another agent's handoff
  asserted the migration behaviour and I verified their claim.
- **My cleanup echoed success it had not achieved.** `git worktree remove` printed `Permission
  denied`, and my unconditional `echo "removed"` on the next line reported success anyway. Caught
  because I checked the filesystem afterwards. Same false-success shape I have been documenting all
  day, this time in my own shell plumbing.

## Linear tracking

- **N/A — board unreachable.** `node scripts/check-mcp-health.mjs linear` → exit 1,
  `CONFIGURED BUT TOKEN REJECTED`, verified live this session. Not fabricating an SWA id.
- Queue is now **seven** items, filable the moment the token is rotated: **CI startup_failure (P1)**
  · run the mandated Kimi+HY3 hostile review · Sol price drift in `providers.mjs` · route HY3
  through the receipt lane · repo-wide test runner · reconcile the duplicate consult-kimi fix with
  agent `s9ae724a6` · decide whether `auth|login|privacy` leave the Kimi ceiling.

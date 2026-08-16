# Handoff v3 + a GLM-5.3 packet — and a bug I found in my own tool first

**Agent:** Opus 5 · **Landed:** `c87c90620`, `9df9c9bbc` on main

## For Hermes

Next agent's mission: get GLM-5.3 to hostile-review the schema-truth + system-graph
campaign, then fix what survives verification.

- Packet: `docs/ai-workflow/AI-HANDOFF/PACKET-GLM53-schema-graph-2026-08-15.md`
- Handoff: `docs/ai-workflow/AI-HANDOFF/CAMPAIGN-HANDOFF-V3-2026-08-15.md`

**The load-bearing instruction is Step 2, not Step 1.** The mission says VERIFY every
finding before fixing it. In this campaign several confident external findings were
flatly wrong — one reviewer called the backup "absent" when it had restore-tested
three times, and the auditor "never run against production" after four runs. Both
were artifacts of an incomplete packet. Fixing unverified findings would have cost a
day. Reviewer output is a hypothesis (Rule 30); verification is the real work.

GLM transport here is Sean-mediated by established pattern (a sibling session used
the same shape in CREATOR-PIPELINE-HANDOFF-GLM53). No GLM model id is wired into the
repo. The scripted path exists but spends money and is Rule-16 gated — ask first.

## Mistakes I made

- **Committed an absolute path containing the local username** in
  `export-system-graph.mjs` (`C:/Users/<user>/.../backend/.env`). It made the tool
  unrunnable on every other machine, agent, and CI runner, and wrote a local
  filesystem layout into the repo. I caught it only because I hostile-checked my own
  code before handing it to an external reviewer — one grep I should have run before
  the original commit, not two days later. Fixed in `c87c90620`: env-first, then
  SWAN_ENV_FILE, then `.env` resolved RELATIVE to the script.
- **I shipped that file believing "read-only means safe."** Read-only was true about
  writes and told me nothing about portability, which is where the actual defect was.
  A safety property proven on one axis says nothing about the others.
- Flagged A8 (self-referencing FKs handled inconsistently between the map and the
  CLI) as a suspicion and nearly shipped it that way. Testing it took one command and
  turned "I suspect" into "6 self-FKs exist, 0 tables have only a self-FK, so the
  divergence is latent." Suspicions in a review packet waste the reviewer's budget.

## External-model calibration

None fired this turn — the GLM call is Sean's to make. Running calibration for this
campaign: Kimi K3 produced 7 findings on the challenges merge, 3 worth fixing
immediately, 4 answerable from evidence — high signal. HY3 produced several
architecture findings that were false due to packet omissions — its accuracy tracked
packet completeness, not model quality. One packet per reviewer, complete state.

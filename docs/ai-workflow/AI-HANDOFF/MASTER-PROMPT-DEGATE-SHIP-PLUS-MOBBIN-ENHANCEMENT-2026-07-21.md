---
status: ACTIVE — Fable 5 executing as /loop
date: 2026-07-21
decision: Fable takes over SWA-30 from Codex; two-arc loop (ship de-gate, then Mobbin enhancement run)
supersedes: MASTER-HANDOFF-degate-design-overhaul-2026-07-21.md (execution ownership only — its gates and do-not-do list remain law for Arc A)
owner: Fable 5 (Final Decider, in-session) + Kimi K3 (co-designer, Arc B)
---

# Master Prompt — De-gate Ship + Mobbin Enhancement Loop (Enhanced)

Sean's original prompt asked: take the de-gate work from Codex, run it as a nonstop /loop through every
phase with the dry-loop (CLEAN×2) protocol, then enhance the app using the Swan design brain and the
Mobbin MCP intelligence, consulting Kimi at creative/important forks. This enhanced version fills the
gaps his prompt didn't state and corrects one sequencing hazard.

## Gaps filled (what Sean's prompt didn't say, made explicit)

1. **The Fable gate is satisfied in-session.** The handoff blocked on "Sean pastes the S5 packet into his
   Fable subscription." This session IS claude-fable-5. Fable reads the packet + worktree directly and
   renders the Final Decider verdict itself. No API, no OpenRouter, no Village — the handoff's constraint
   ("manual subscription only") is honored because this is Sean's subscription session.
2. **Two arcs, never mixed.** Sean's own 2026-07-21 law: design surfaces never gate, and NO redesign/new
   features in the de-gate release. Therefore Mobbin/design-brain feature work CANNOT ride in the SWA-30
   batch. Arc A ships the de-gate exactly per the existing handoff. Arc B starts only after SWA-30 is
   live-verified and closed, on a FRESH worktree off the de-gated main. This preserves rollback sanity
   and the release's evidence chain.
3. **Main drift is real: origin/main is 45 commits ahead** of baseline eb4bbdd63 (SWA-32 ADW fusion,
   pre-commit frontend guards, Rule 73 /swan-gate, recovery-compass prep, etc.). Gate C integration must
   rebase/merge and re-run the FULL gate suite — and the new pre-commit guards (frontend-guards.mjs:
   MUI/recharts imports, Galaxy palette, raw hex outside var-fallback = BLOCKED) now apply to every
   commit this loop makes.
4. **Rule 73 applies to Arc B.** Substantial build slices route through /swan-gate (validator writes the
   gate BEFORE build). Arc A is a release continuation (gates already defined by its handoff); Arc B
   slices are new substantial product work and MUST trial /swan-gate (SWA-40 requirement).
5. **Kimi consult points (explicit):** `node scripts/consult-kimi.mjs` fires at — (a) Arc A: only if the
   Fable verdict surfaces a genuinely contested design/UX judgment; (b) Arc B: candidate-list ranking
   (which Mobbin patterns to adopt), each concept direction before build (Rule 40 ideation gate), and any
   fork where creativity or product taste materially changes the outcome. Kimi verdicts are recorded in
   the Arc B tracker doc. Kimi is advisory; Fable arbitrates (Rule 46 as amended).
6. **Mobbin/design-brain sources of record for Arc B:** `docs/ai-workflow/design-brain/`
   `external-reference-mcp.md` (§5 in-brand HTML report workflow), `mobbin-learning-system.md`,
   `swan-element-intelligence.md`, `website-archetypes.md`, plus live `mcp__mobbin__search_*` pulls for
   fresh pattern evidence. All visual work routes through `swan-design-router` (Rule 40) and the
   SWAN-CINEMATIC-DESIGN-SYSTEM. The design overhaul PARK (2026-07-21) is respected: Arc B enhances the
   ORIGINAL canonical surfaces additively — it does not resurrect the rejected vNext pages or flags.
7. **Dry-loop law on both arcs.** Every build slice ends with hostile rounds until two consecutive fresh
   rounds find nothing fixable; closeouts end `DRY-LOOP: CLEAN×2 (rounds: N)`.
8. **Linear:** SWA-30 carries Arc A evidence (verdict, repairs, clean rounds, commit, deploy, live
   matrix). SWA-31 (photography) stays blocked; it does NOT auto-start. Arc B gets its own issue(s)
   created at Arc B kickoff with the ranked adoption list.
9. **Batch cadence (Rule 70):** commit per slice locally, one push per batch, one Render deploy + one
   deploy verification per batch. Arc A is its own batch; Arc B batches by feature group.
10. **Loop mechanics:** work continuously (no idle pacing); ScheduleWakeup only as fallback while an
    external wait (Render deploy) is genuinely in flight.

## Arc A — Ship SWA-30 (execution contract = existing master handoff, unchanged)

Gate A: Fable renders verdict on `docs/receipts/de-gate-2026-07-21/S5-final-decider-packet.md`,
validating every finding against the current worktree. → Gate B: post-verdict CLEAN×2 from fresh
vantages. → Gate C: rebase onto moved main, re-run full gate suite, stage explicit paths, commit S5.
→ Gate D: non-force push, monitor both Render services to the exact commit. → Gate E: owner env
checklist (Sean action, documented not performed). → Gate F: live verification (health, public-flags
= exactly 3, six public routes mount originals, Design Studio admin-only with 7 read-only previews,
34-entry sidebar pass). → Gate G: SWA-30 evidence + close.

All do-not-do items from the master handoff remain in force verbatim.

## Arc B — Mobbin Enhancement Run (new, after SWA-30 closes)

1. Fresh worktree off de-gated origin/main.
2. **Harvest:** sweep the design-brain Mobbin docs + live Mobbin MCP for patterns applicable to the
   canonical original surfaces (Home V4, StoreV3, About V4, ContactV3, VideoLibraryV3, GalleryPage,
   UniversalDashboardLayout). Produce a ranked candidate list: pattern → surface → Product-Core-Loop /
   Rule 62 justification → effort → risk.
3. **Kimi ranking consult** on the candidate list; Fable arbitrates the final adoption set; Sean sees
   the ranked plan in the loop narrative (he can redirect any tick).
4. **Build** adoption set as numbered slices: /swan-gate → swan-design-router concept gate (2-3
   directions for anything net-new) → build → per-slice gates → hostile rounds → CLEAN×2.
5. Batch push, single deploy verification, Linear closeout, hermes-inbox memo.

Non-goals for Arc B: no un-parking vNext pages, no new runtime design flags (forever-law), no
photography runtime work (SWA-31's lane), no Launch Control expansion.

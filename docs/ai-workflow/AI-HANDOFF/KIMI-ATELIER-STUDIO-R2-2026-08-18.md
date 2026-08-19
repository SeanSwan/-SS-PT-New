# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-ATELIER-STUDIO-R2-DECISIONS-PACKET-2026-08-18.md
**Seed:** (none)
**Tokens:** 8235 in / 3076 out | **Cost:** ~$0.0708 | **Wall:** 118.3s | **finish_reason:** stop

---

# KIMI K3 — ROUND 2

## REMIT 1 — THE FOUR DECISIONS

### DECISION 1 — N-number: **Agree with 4 + levers + wave-2. Strengthening, not dissent.**
The synthesis is right, and §3.4 is the evidence that settles it — breadth moved to a zero-cost axis. Two sharpenings:
1. **Lever values must be rejection-log-bounded.** If levers explore freely, Sean can tweak a survivor back into known-rejected space and the log's only remaining job (feeding the brief, D1 remnant) is bypassed. Lever enums are drawn from the same filtered space as the brief.
2. **Wildcards don't compose with levers.** The wildcard's value is its alienness; giving it density/accent levers domesticates it into a reskin of the house style. Levers on the 3 skeletons, wildcard judged raw. [Assumption: levers are per-artboard config, so this is free.]

### DECISION 2 — Sequencing: **Confirm recall-first.** 
New argument, not repetition: A7 is the only module whose failure mode is *detectable by the shipped 73-test suite*. Every other module's failure mode is "Sean's eye." Ship the module with a mechanical definition of done first; it also proves the generated-artifact pattern (C6) that A0's plate references and A2b's fingerprints will reuse. **For one-session visible results:** cut A2b entirely (4 variants, dedupe by eye), cut wave-2 logic, cut the routing tests to one positive control. A7-skeleton → construction archetype → A0 → manual 4-up. Everything cut returns in week two.

### DECISION 3 — Spine gaps: **Mostly agree, one re-scope.**
- **Interpolation: in-program, but NOT as a Studio module.** It's a media-pipeline fix wearing a design-tool costume. Ship it as **A0-adjacent (A0b), scoped to the scroll-video homepage only**, with its own definition of done (60fps output verified). Putting it in A2–A6 contaminates the divergence engine's definition of done with video-plumbing risk. Small scope, hard gate.
- **Reference depth:** agreed, blocked on Sean. Note: the P-mode cap rationale being `[UNKNOWN]` means nobody can verify the cap is still load-bearing — flag for Sean with commit `9599539d8` attached.
- **Pixel-convergence delivered-by-Studio:** agreed, and say so in the ledger so it stops appearing on gap lists.

### DECISION 4 — D4/URL boundary: **The task-thread boundary does NOT hold as proposed. Partial HY3 vindication, and a fix that saves my firewall.**

I called the principles-only firewall legally coherent in round 1, and at the *intake* layer I still think it is: a URL as working note, principles in the ledger — the durable artifact is clean. But the remit question exposes the real hole, and it is exactly HY3's laundering worry relocated one step later: **handoff docs quote task threads, handoff docs are committed, therefore the URL enters the durable record at commit time regardless of what the ledger holds.** The boundary was defined conversationally ("thread vs. ledger") when the actual legal boundary is **git-tracked vs. not git-tracked**. My original analysis defended the wrong line.

**Revised ruling:** redefine durability as version control, not conversation.
1. Task threads live in a **gitignored worktree** (or equivalent); anything git-tracked is durable, full stop.
2. Handoff-doc generation includes a **scrub step**: URLs and quoted third-party snippets are stripped or replaced with principle references before commit. This is mechanical, ~10 lines, no taste.
3. The ledger keeps **license verdicts + component identifiers** for sniped components ("aceternity/shimmer-button, MIT verified 2026-08-18") — provenance without the URL. Identifier + license is what indemnity actually needs; the URL was convenience, not evidence. [Assumption: D4's "no URLs in ledger" extends to provenance metadata; if Fable permits URLs as bare facts, keep them — but the identifier+verdict scheme works under the strict reading, so prefer it.]
4. Per-component license verification at intake stays, as the synthesis says.

This concedes HY3's mechanism (laundering happens) while showing its location was commit, not intake — and the fix is cheaper than either of us proposed. **The sniping corpus is usable now under this scheme.**

---

## REMIT 2 — HOSTILE PASS

### 1. Synthesis errors
- **D2 (instrument) — I concede, with one correction GLM's "zero new machinery" overclaims and the plan should not repeat:** the canvas emits winner and kill order *implicitly* (which artboard survived), but it does **not emit reasons**. Sticky captions are authored *before* judgment; the reason a variant died exists only in Sean's head. The log needs a 4-field post-pick ritual — winner id, kill order, reason codes, lever state at pick — that is ~10 lines but is *not zero*. Still not my instrument; still right to cut it. But §0's "let the picking itself be the measurement instrument" is only true if A5's schema exists. Specify it in A5 or the instrument silently ships empty.
- **D1 (sieve) — GLM was right, full concession.** The Goodhart catch was correct and I have no new argument.
- **C8 vs. §5.1 internal contradiction:** the plan criticizes "cents" as unmeasured, then prints "cheap / cents" in its own cost table. §10 confesses it; the table still asserts it. Strike the adjectives or attach metering to step 4 with a number.
- **Wave-2 seeding logic is a placeholder.** "Seeded from shortlisted-but-unpicked, conditioned on wave-1 reactions" names inputs but no rule. Minimum viable rule: wave 2 = the killed variant whose kill reason was *execution* ("nice structure, wrong density"), re-skeletoned — never the ones killed on *concept*. Without this, wave 2 regenerates the strongest loser, which is usually the one Sean most disliked.
- **A2b fingerprint as specified is too weak.** Normalized tag sequence + section order will call "Field Report" and "Ledger" duplicates if both are `header/main/section×3/footer`. But A2 already hand-specifies the distinguishing features (nav model, hero mechanics, chapter count). **Fingerprint = the skeleton contract fields themselves** — near-free, and it makes dedupe a contract-compliance check instead of a heuristic. [Assumption: skeleton contracts are structured data, not prose.]

### 2. A0–A7 enhancements, ranked by value left on the table
1. **A5 null-winner capture format** (highest). "Re-diverge with what was learned" is vapor without a schema: `{killed: [ids], kill_reasons: [codes], axes_to_flip: [...]}`. The modal outcome deserves a defined artifact, not a vibe. This is the same correction as the kill-order log, which is why it's cheap.
2. **A2b fingerprint = skeleton-contract diff** (above). Turns C4 from heuristic into compliance check.
3. **A0 plate briefs should specify aspect + plate role** (hero-bleed / texture / proof), not just "3–5 plates" — composition divergence is only a clean test (GLM's insight) if material is *role-matched* across variants, else you re-confound material with composition.
4. **A3 captions: enforce the anti-rigging rule mechanically** — every artboard must carry ≥1 stated tradeoff; canvas seeding refuses an empty tradeoff field. The skill's doctrine demands it; make it a gate, not a hope.
5. **A6 fidelity checkpoint needs a drift budget** (e.g., spacing/token mismatches enumerated, not "looks faithful") or it becomes another unmeasured assertion.
6. **A1 question budget: hard cap 5, with silent-default fallbacks.** §10 names the 40-question failure shape but assigns no number.
7. **A7: version the routing table** (hash of source monolith) so rot is detectable at load, not at wrong-routing time.

### 3. v2/v3 deferrals
- **v2:** wave-2 auto-seeding from accumulated kill logs (needs ≥N logged sessions to have signal); motion-tier judging via interpolated previews (depends on A0b shipping); multi-page flows (v1 is single-surface; graft across pages multiplies the fragility C3 already flags).
- **v3:** a taste model trained on the accumulated kill-order logs. This is my sieve, resurrected *legitimately* — "kill authority is earned, not assumed" was always the argument, and v1's logging is precisely how it gets earned. Attempting it in v1 with zero data is the Goodhart bait GLM killed; with a year of logs it is the whole point of having logged.
- **v3, explicitly not v2:** cross-project plate library — needs asset-rights hygiene (D4-adjacent) that v1 must not touch.

### 4. The one thing for the master prompt
> **"Step 4 (5-up smoke test on a toy brief) is a hard gate. If any two rendered variants share a skeleton-contract fingerprint, HALT, report the collision, and do not build A2b/A3/A4 on top. Infrastructure may only be built on divergence that has been observed, not assumed."**

Everything else in the plan degrades gracefully; C1/C2 is the single load-bearing empirical claim the entire engine rests on, and it is currently a prediction.

# SwanStudios Fable Final-Decider

**Reviewer:** OpenRouter `anthropic/claude-fable-5`
**Document:** docs\ai-workflow\AI-HANDOFF\GLM-REPAVE-FIXPLAN-PACKET.md
**Seed:** (none)
**Tokens:** 6486 in / 7237 out · **Cost:** ~$0.4267 · **Wall:** 107.0s · **finish_reason:** stop

---

# FABLE 5 — FINAL RULING: DESIGN BRAIN REPAVE

**Note on format:** the packet demands tables-first (§0). I am the final authority; my ruling structure governs. Tables are embedded where they carry weight.

---

## VERDICT: **LOCK-WITH-CHANGES**

The gate is real, the scan discipline is better than anything else in this repo, and §5.2 is honest work. But the packet contains one **false load-bearing claim** that would make a worker-bot freeze the wrong thing, one **verification hole in the exact shape of the bug class it exists to catch**, and one open decision (§3.1) framed so badly it manufactures a migration crisis that does not exist. Fix those, then this locks.

---

## (a) ATTACK — WEAKEST LOAD-BEARING CLAIMS

| ID | Sev | Claim under attack | Evidence | Ruling |
|---|---|---|---|---|
| F-1 | **CRITICAL** | §3.1: "Reconciling changes button and card geometry on **every surface in the app**." | §3.1's own verified grep: scales appear in **7 documents and 0 lines of code**; `check-token-discipline.mjs` checks hex only | **FALSE.** Nothing shipped reads either scale. Reconciling the *docs* ships zero visual regression. This claim, if believed, makes a worker-bot treat a one-commit doc fix as an app-wide migration and defer it — which is exactly how the schism survives long enough for future code to fork on it. Strike the sentence. |
| F-2 | **HIGH** | §2: "positive control per class" | §2 self-admits D3/D6 uninjected; §4.5 admits three case-comparison bugs pass "only because every filename in the corpus is lower-case" | The 73/73 suite is green over a **known-latent bug class**. Per the packet's own law (§1), 73/73 is a property of the fixtures, not the checker. And **D6's "dated 5-file baseline" is a hardcoded allowlist — the same silent-decay shape this whole workstream exists to kill.** A baseline nobody re-derives is §4.4 wearing a gate's costume. Before lock: inject D3+D6, add one MixedCase fixture file, add one multi-defect-aggregation test. |
| F-3 | **HIGH** | §5.2: "hypothesis largely DISCONFIRMED" | Scanner reuses gate regexes verbatim (§5.1); §5.3(b) admits prose/title citations "completely unmeasured"; §1: "a count is a property of the instrument" | This is §4.2 recommitted in the same document that documents §4.2. You validated the instrument against **one control in one citation form**, then declared a negative across **all** forms. Correct statement: *disconfirmed for the `file.md §N` form only.* The scanner inherits every blind spot of the gate, including the dialect category-errors of §5.3(a). Reword, or a worker-bot closes Question 2 as answered. |
| F-4 | **HIGH** | §5.3(d): external refs "confirmed to exist" | Gate "explicitly does not parse their sections" — 6 live `§N` pointers with zero validation | Existence-check-without-section-parse is exactly the failure of §1: pointer resolves, target unverified. These are live doctrine (`SWAN-CINEMATIC-DESIGN-SYSTEM.md` etc.). Cheap fix, mandatory. |
| F-5 | **MED** | §5.2 row E: 111 handoff refs "expected and harmless" | Handoffs are agent-loaded context | An agent re-citing a quoted defect (`design.md §99`) has no quarantine marker telling it it's a test vector. Require a fenced-block or `DEFECT-QUOTE:` convention in AI-HANDOFF, excluded by the scanner *by marker*, not by directory. |
| F-6 | **MED** | Unscanned: `frontend/src/**` (§5.3(c)) | Packet's own admission | This is the **only unscanned surface where a dead doctrine pointer directly steers a worker-bot's build output** (code comments citing `design.md §N` next to the component they govern). Higher priority than `.github/` or backend. |
| F-7 | **LOW** | House-rule cross-check | Canon spacing scale `4 8 12 16 24 32 48 72 108 160 240` — no 44 step | Neither scale encodes the **44px touch-target floor**. Whichever wins, control-height minimums must be asserted independently of the spacing scale or a worker-bot will "snap to scale" at 32/48 and ship 32px targets. Add one line to canon §9. |

Where the design is **already right** (per §7's demand): the startup self-check (gate refuses to run on undocumented D-classes) is the best mechanism in this packet; the mandatory instrument-validation-before-reporting-absence rule in §5.1 is correct and should be promoted to house doctrine.

---

## (b) RULINGS ON EVERY OPEN DECISION

| # | Decision | **RULING** | Reason |
|---|---|---|---|
| §3.1 | Token schism | **OVERRIDE the framing; canon wins outright.** `design.md §9` is sole authority; `typography-grid.md §5` is amended to a one-line pointer at canon. No "satellite documents the exception" — two canons IS the defect class of §1. Zero code migration needed (F-1: 0 lines of code affected). Fully reversible (git). | Cheapest reversible fix; the crisis was fictional. |
| §3.2 | `design.html` | **RETIRE — attic it.** Maintaining honestly = second source of truth; regenerating requires building §3.3's fictional mechanism first. Atticking makes any surviving consumer a D6 defect the gate now *catches* — the retirement self-audits. | Never keep a wrong-target generator alive "honestly." |
| §3.3 | `pnpm canon:build` fiction | **DELETE the claim.** Do not build the mechanism: the repo doesn't use pnpm and §3.2 just retired the artifact it would generate. One-line canon edit. | A fictional mechanism's cheapest fix is truth, not construction. |
| §3.4 | Rule 40 `§18` | **FIX NOW via the reviewed constitution path.** "Governed separately" is a process, not an excuse — these are the only 2 real dead refs in live doctrine outside the brain (§5.2), sitting in the files every agent loads *first*. File the guarded one-character edit today. | Highest-visibility dead pointer in the estate. |
| §3.5 | `adapters/knowledge.md` | **RETIRE — attic it.** Its entire Policy column routes to the attic and its header routes to two hollowed directories (one index file each). Restore only if an owner claims obsidian/graphify; none has. Bonus: this empties the D6 baseline to zero, killing the rot-prone allowlist from F-2. | A routing table to nowhere is worse than no table. |
| §5.3(a) | Dialect problem — normalize headings? | **NO mass renumbering.** Renumbering canon is the original sin of §1; doing it corpus-wide would recreate the defect at 28-file scale. Instead: ship a **dialect manifest** (file → heading grammar) consumed by the gate; new class **D7: citation-form category error** (numeric `§N` aimed at lettered/T-prefixed/unnumbered files = FAIL). This makes `anti-patterns.md §27`-type defects impossible without touching a single heading. | Fix the resolver, not the corpus. |
| §6 | Next slice: enforcement-claim sweep? | **OVERRIDE order** (see sequence). And the sweep as proposed fails its own acceptance criterion — prose claims cannot be re-checked mechanically. **Mandate an annotation convention instead:** every "enforced by / generated by" claim must carry a backticked script path; new class **D8** verifies the path exists in the repo and in `package.json` scripts. One-time grep converts existing claims; D8 keeps it true forever. That is a gate, not an audit in a gate's costume. | Mechanize the claim format, then checking is trivial. |
| §5.3(b) | Prose-reference measurement | **DEFER, but with a method:** build a title-alias table (canonical phrase → file+section: "Two-speed law", "Taste Bible", "accessibility floor") as part of the dialect manifest; a report-only scanner counts alias hits and flags aliases whose targets moved. Not a lock blocker. | Unmeasured ≠ unmeasurable; give it an instrument first, per §1. |
| §2 | Verification sufficiency | **INSUFFICIENT — see F-2.** D3/D6 injection + MixedCase fixture + aggregation test are lock conditions. | The omission the author invited attack on: yes, it matters, for D6 especially. |

---

## (c) CHANGE BEFORE BUILD

1. **Strike the false migration claim in §3.1** (F-1) and record the "canon wins, 0-code-impact" finding in its place.
2. **D3 + D6 positive-control injections; one MixedCase.md fixture; one multi-defect aggregation test** (F-2). Suite must go red on all before it counts.
3. **Reword §5.2** to "disconfirmed for the `file.md §N` form" (F-3).
4. **Add the 44px-floor independence note to canon §9** (F-7).
5. **File the Rule 40 constitution edit** through the guard, in parallel — it gates nothing else.

---

## (d) FINAL LOCKED SEQUENCE

1. **S1 — Truth commits (one day, all reversible):** §3.4 constitution fix (guarded path) ∥ delete §3.3 fictional claim ∥ attic `design.html` (§3.2) ∥ attic `adapters/knowledge.md` + empty D6 baseline (§3.5).
2. **S2 — Kill the schism:** amend `typography-grid.md §5` to defer to `design.md §9`; add scale values to `check-token-discipline.mjs` in **report-only** mode.
3. **S3 — Harden the gate:** F-2 test debt (D3/D6/case/aggregation), then external-file section parsing (F-4).
4. **S4 — D7 dialect manifest + category-error class** (§5.3(a) ruling). This is the root-cause fix and lands *before* the sweep.
5. **S5 — D8 enforcement-claim annotations** + one-time conversion sweep (§6, as overridden).
6. **S6 — Extend scanner to `frontend/src/**`** (F-6), then `.github/`, hooks, skill frontmatter; handoff quarantine markers (F-5).
7. **S7 — Prose-alias table, report-only** (§5.3(b)).

Rationale for the reorder: the packet proposed the fiction-sweep next (§6); I put **truth deletions and the schism first** because they are the only items a worker-bot can build the wrong thing from *today*, and they are all one-commit reversible.

---

## SINGLE HIGHEST RISK + DE-RISK

**The token schism (§3.1) — the only item in this packet that ships wrong pixels rather than wrong doctrine.** Two canonical geometry scales, zero enforcement, and a packet framing that actively discourages fixing it by inventing an app-wide regression. The moment any worker-bot builds UI while both scales are live, it forks the app's geometry on a coin-flip of which doc it loaded — and *both* choices are "evidence-backed."

**De-risk before any UI build:** land S2 as a single commit — canon declared sole authority, satellite reduced to a pointer, scale values wired into `check-token-discipline.mjs` in report-only, promoted to FAIL after one clean week. Cost: hours. Reversibility: total. Blast radius if skipped: every surface in the app, permanently ambiguous.

**This plan is LOCKED on completion of pre-build items 1–5.** — Fable 5

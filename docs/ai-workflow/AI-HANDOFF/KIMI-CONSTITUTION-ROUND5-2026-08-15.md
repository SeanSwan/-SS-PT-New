# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs\ai-workflow\AI-HANDOFF\CONSTITUTION-HARDENING-ROUND5-PACKET-2026-08-15.md
**Seed:** (none)
**Tokens:** 1654 in / 1292 out · **Cost:** ~$0.0243 · **Wall:** 22.5s · **finish_reason:** stop

---

**(a) VERDICT: SHIP-WITH-CHANGES** — one real defect in the new scan code; everything else holds.

**(b) DEFECTS**

**D1 — Polarity scan crosses clause boundaries (item 2, confirmed constructible).** The forward window of 4 tokens does not state that it stops at clause punctuation. Breaking scenario:

> Old: "avoid large commits, keep them small"
> New: "keep commits small"

Forward scan from `avoid`: large(1), commits(2), keep(3) — `keep` acquires NEGATIVE polarity from a verb in a *different clause*. In the new body `keep` survives with no polarity → the F1 deletion branch fires → **false block on an honest rewording**. This is exactly the failure class you fixed for the passive case (round-2 reasoning: false blocks breed `--no-verify`), re-introduced through the window edge. The backward-3/forward-4 asymmetry makes it worse: the same sentence scanned from the other direction behaves differently, so the check is not even deterministic under rewording of clause order. If the scanner already breaks on `,;:.` this is moot — but the packet doesn't say so, and three rounds of defects-in-the-fix say unverified assumptions are where this lives.

**(c) FIVE ITEMS**

1. **Direction model:** `only` and `except` as NEGATIVE are correct — both are restrictors whose deletion *loosens*, and deletion is caught. No hole found. `may` in STRENGTH is safe because "may not" still carries `not`. No misclassification found that opens a hole.
2. **Window:** see D1 — the defect is clause-crossing, not the 3/4 asymmetry per se.
3. **Partition:** holds. Survives-without-polarity → deletion branch; vanishes → shrink checks. The "both" case (word vanishes *and* was the sole polarity) is correctly routed to shrink alone, since you can't attribute intent to a deletion the shrink gate already permits. The "neither" case (survives, polarity swapped for opposite direction) is inversion, already covered. No gap.
4. **Rounds 1–4 FIXED items:** nothing in the packet contradicts a prior fix; the re-opened hole from the direction refactor was caught and pinned by its own test. NONE found.
5. **Dry?** One clause-boundary fix away from dry.

**(d) HIGHEST-IMPACT CHANGE:** Make the polarity scan clause-bounded (stop at `, ; : . —` and conjunctions opening a new clause) in both directions, with one test: the "avoid large commits, keep them small" → "keep commits small" rewording must PASS, and "never commit X, always review Y" → drop `never` must still BLOCK. After that lands with a test, this work is DRY — and I will say so with no further rounds.

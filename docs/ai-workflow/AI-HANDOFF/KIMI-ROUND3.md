# SWAN BRAIN — round 3: the round-2 fixes, and three decisions — reviewed by Kimi K3

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs\ai-workflow\AI-HANDOFF\SWAN-BRAIN-ROUND3-PACKET.md
**Seed:** (none)
**Tokens:** 2292 in / 2349 out · **Cost:** ~$0.0421 · **Wall:** 78.6s · **finish_reason:** stop

---

## Findings

| ID | severity | claim | evidence | proposed fix |
|---|---|---|---|---|
| R3-1 | MEDIUM | Palette assertion is scope-blind: `/#[0-9A-Fa-f]{6}\b/g` runs over the **entire** `designMd` — code fences, prose examples, struck-through retired palettes all count toward the 20 floor. It can pass for the wrong reason (retired hex still present in a strikethrough block while the live palette shrank) and fail for the wrong reason later. Margin is also thin: real file yields 23 unique vs floor 20 — a legitimate 4-token palette revision trips the gate despite canon being healthy. Side note (HYPOTHESIS, unverifiable without the file): the trailing `\b` excludes 8-digit `#RRGGBBAA` tokens; if any live tokens are 8-digit they are silently uncounted, shrinking the real margin further. | §3.1 prompt itself; diff line `bundle.designMd ?? ''` with no section scoping; "23 unique" vs "≥20" stated in §1. | Scope the match to the palette section/table of `design.md` (or strip fenced code + strikethrough before matching), and set the floor from the intended canonical palette size with a comment, not a round number below the observed count. |
| R3-2 | LOW | Em-dash sentinel is a **verbatim tripwire, not a semantic guard** — but that matches the realistic threat model (resurrection of the retired tier happens via copy-paste from git history / old docs, which preserves the literal string; a paraphrased reintroduction would flow through the doctrine gate anyway). Not false comfort *if* it is understood as a regression tripwire. The risk is future readers crediting it with more coverage than it has. | §3.2; sentinel regex `/Tier 3 — Reduced motion/i`. | Keep it. One-line comment sharpening: "verbatim tripwire for history-resurrection; paraphrase-evasion accepted — doctrine review owns that." Optionally add the colon variant (`Tier 3: Reduced motion`) since that is the single most likely editorial normalization; do not generalize further. |
| R3-3 | LOW | Non-fixes (a) and (c) rest on unenforceable promises ("same session follow-up", "post-merge dedup") with **no tracked issue**, while the external-reference contract — the same class of deferred work — *was* filed as a tracked issue. Inconsistent deferral hygiene; (a) in particular has a concrete failure mode (Rule 40 contradicts `ACTIVE-INDEX.md` at every session startup from the moment A merges until the follow-up lands). | §1 table (ROUTED row) vs §2(a)/(c). | File both as tracked issues **before** merging A, and put "(a) follow-up commit" on the same-session checklist as a blocking item for ending the session, not a nice-to-have. |

Checked and **no finding**: (1) both new checks push into `errors` inside `auditWorldEngineBundle` ahead of the existing `requirePattern` calls — no reordering or mutation of prior assertions, consistent with the unchanged 9/2 and 4/0 baselines (counts HYPOTHESIS-verified only as stated, not re-run). (2) `?? ''` guards against missing `designMd` identically in both checks — a missing file now yields two loud errors rather than a crash, which is the intended failure mode. (3) Set-based dedup is correct for a uniqueness floor. (4) Non-fix (b) holds: the retired check guarded `design.md`↔`design.html`; no equivalent coverage was lost by its deletion, and mechanically defining "ADAPTS" is genuinely a doctrine call — recording the gap is sufficient. (5) Non-fix (c) is correct in substance: a shared module is impossible until the branches meet on main. (6) Em-dash literal matches the retired-contract string it was re-homed from; proven both ways per §1.

## Merge table

| branch | safe to merge? | blocking | checklist |
|---|---|---|---|
| A `claude/design-brain-repave-20260816` @ `78dfd53c6` | Yes, conditionally | File tracked issues for §2(a) and §2(c) first (R3-3). R3-1 is not blocking but should be fixed in the same follow-up pass as (a), since both touch this area. | ☑ fixes proven both ways · ☑ pass/fail baselines unchanged · ☐ tracked issue: Rule 40 refs · ☐ tracked issue: header-logic dedup · ☐ same-session (a) commit scheduled |
| B `claude/constitution-s18-20260816` @ `bd8d0a96c` | Yes | None new — B carries no diff in this packet; its Rule 40 exposure is covered by the (a) follow-up, which must touch both constitutions. | ☐ confirm (a) follow-up covers **both** constitutions' Rule 40 |

## Prose

The two added assertions are correct as code: properly guarded, properly homed, non-interfering with existing counts. The substantive weakness is R3-1 — the palette check answers "does this file contain 20 hex-looking strings anywhere" rather than "does the palette section yield a palette." That is exactly the class of defect this workstream keeps shipping (checks that pass for the wrong reason), and it deserves a scoped match, though the current state is strictly better than the silent gap round 2 found, so it does not block.

The sentinel question resolves in the fix's favor: the realistic resurrection path is verbatim, and verbatim is what a literal string catches. R3-2 is a documentation nit, not a defect.

On the sequencing call (a): the call itself is right — holding a 70-behind branch for a two-file edit that can be cut cleanly from post-A main is worse than the alternative. What is wrong is that the obligation currently lives only in this packet. The same packet demonstrates the correct pattern in its own ROUTED row. Apply it.

Nothing from round 2 appears unfixed *and* unrecorded; the ACCEPTED regex trap is documented with a stated rationale. **Round verdict: no blocking findings; merge A and B after filing the two tracked follow-ups.**

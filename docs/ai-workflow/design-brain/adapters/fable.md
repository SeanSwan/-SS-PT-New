# Fable Adapter — Design Direction & Arbitration

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL for Fable doing design direction, review, or arbitration
- **Scope:** Fable as design-synthesis and final-arbitration brain (rule 46 Final Decider; registry §6). Fable is not an unsupervised implementer — build slices belong to `builders.md` consumers unless Sean explicitly assigns Fable the build.

---

## 1. Load order

1. `../design.md` → `../anti-patterns.md` → `../qa-gates.md` (same discipline as builders — arbitration from memory is drift)
2. `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B/§B2/§C — the grammar, arc templates, and pattern library directions must cite
3. `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` — when the direction implies generated media
4. `../obsidian/design-decision-log-policy.md` — cite prior decisions instead of re-litigating them
5. The grill-me / chromie brainstorm doc for the surface, if one exists (rule 64/65) — direction work must match Sean's extracted intent, not Fable's taste
6. `../external-reference-mcp.md` + the external-reference receipt for net-new pages, major redesigns, or Sean-requested Mobbin/Mobbin-like research; if unavailable, carry `[MOBBIN UNAVAILABLE]` truth into the directions

## 2. The concept-direction ideation gate (net-new pages & major redesigns — MANDATORY, rule 40)

Before any build starts, Fable produces **2–3 distinct concept directions**. One direction is a decision denied to Sean; four is noise. Small polish tasks skip this gate.

**Direction format (each of the 2–3):**

| Field | Requirement |
|---|---|
| **Name** | Evocative, ≤4 words (e.g. "Frozen Vault Reveal") — a handle Sean can pick in one word |
| **Emotional job** | One primary target per act/phase (awe, trust, momentum, calm, aspiration, celebration, intimacy) |
| **B2 narrative arc** | The 4-act (marketing) or 4-phase (dashboard) arc written out per design system §B2.3 — act, emotional target, section content |
| **C-pattern families** | Which C1–C12 patterns carry each act, with tier-2/tier-3 fallbacks named |
| **External-reference influence** | What Mobbin/Mobbin-like research changed, or `[MOBBIN UNAVAILABLE]` / not applicable; include at least one rejected pattern for major redesigns |
| **Signature moment** | The one memorable move, placed in Act 1 / Phase 1; its asset archetype + Seedance brief stub |
| **Responsive risks** | Where this direction is most likely to break (320px stacking, 2560 sprawl, reduced-motion gutting the signature moment) and the planned mitigation |

Directions must be genuinely divergent (different arcs or different signature families), not one idea with three color tweaks. Each must be buildable inside the §2 build contract of `builders.md` — a direction requiring Tailwind, new tokens without proposal, or fake metrics is invalid on arrival.

**Output:** one direction doc in the task thread (and, for major surfaces, `../obsidian/` per the decision-log policy), ending with Fable's recommendation + one-line reason. **Sean picks.** Fable recommends; it does not pre-empt.

## 3. Arbitration protocol (Gemini concept vs Swan doctrine)

Gemini 3.1 Pro is Lead Design Authority on aesthetics (Co-Orchestrator Hierarchy), but **doctrine wins over authority**:

1. **Identify the conflict class.** Token violation (retired Galaxy-Swan hex, non-token color), rule violation (LILA-class purple-glow ban vs Dual-Button Glow, MUI/Tailwind suggestion, rule 9 language), pattern violation (banned generic pattern from §B), or pure taste disagreement.
2. **Doctrine conflicts: doctrine wins, automatically.** CLAUDE.md rules and `SWAN-CINEMATIC-DESIGN-SYSTEM.md` outrank any model's vision (rule 46: "CLAUDE.md rules win"). Fable rejects the conflicting element — not "adapts" it — and keeps whatever in the concept survives without it.
3. **Taste disagreements: Fable arbitrates as Final Decider.** Preserve Gemini's direction where it doesn't collide; override where it does; never split the difference into mush.
4. **Document every override.** Log entry per `../obsidian/design-decision-log-policy.md`: what Gemini proposed, which rule/doctrine it hit, what Fable decided, what survived. An undocumented override invites the same fight next session.
5. **Never bypass the router.** Arbitration output still flows through `swan-design-router` discipline (rule 40) and builders still run their own hostile critique — Gemini direction is not a substitute for production QA (Premium Design Critique Loop §6).

## 4. Hand to builders vs build spec-only

| Situation | Fable does |
|---|---|
| Net-new page / major redesign | Direction gate (§2) → Sean picks → hand chosen direction + arc + asset briefs to builders; Fable reviews the builder receipt against the direction |
| Contested review / rule-46 verdict | Arbitrate (§3), log, return APPROVE/REVISE/REJECT with file:line evidence |
| Spec-only request (no build authorized) | Produce direction doc + Seedance briefs + acceptance criteria; explicitly mark **T1 — no code**; route via `cinematic-site-generator.md` handoff templates when it's a full site |
| Sean explicitly assigns Fable the build | Fable becomes a `builders.md` consumer and owes every artifact in that adapter, including the builder receipt |

Every Fable design artifact carries acceptance criteria + a verification plan (operator bridge §6, Fable policy) — a direction a reviewer can't check is an opinion, not a spec.

## 5. Verification before done

- [ ] 2–3 genuinely divergent directions for net-new work, each with all seven format fields (§2); polish tasks explicitly exempted in-thread
- [ ] Every direction cites real C-patterns + B2 arc and violates zero bans in `../anti-patterns.md` / design system §B
- [ ] Sean's pick recorded; Fable recommended but did not decide the pick
- [ ] External-reference receipt included for Mobbin/Mobbin-like research requests; external patterns were translated into Swan principles, not copied
- [ ] Any Gemini/doctrine conflict resolved doctrine-first and logged per the decision-log policy
- [ ] Handoff state explicit: who builds, what they receive, what acceptance criteria gate them
- [ ] No production code written unless Sean assigned the build — and then `builders.md` was obeyed in full

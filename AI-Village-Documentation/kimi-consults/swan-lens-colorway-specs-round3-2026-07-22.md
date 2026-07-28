# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/brainstorms/swan-lens-kimi-round3-colorway-specs-2026-07-22.md
**Seed:** AI-Village-Documentation/kimi-consults/swan-lens-gallery-refactor-round2-2026-07-22.md
**Tokens:** 5459 in / 5812 out · **Cost:** ~$0.1036 · **Wall:** 224.2s

---

# Kimi K3 — HOSTILE DESIGN + FRONT-END REVIEW (Round 3 Brief)

## (a) VERDICT: **SEND-BACK**

The brief is well-structured and correctly locks rounds 1–2, but it orders the generation of ~8 colorways against a schema that **cannot express the variety classes it mandates**, defines a cyan ban it **cannot enforce**, and drops the ΔE distinctness gate that was the entire point of the refactor. Data generated to this spec ships flat, un-glowable, and unauditable. Fix the schema and the audit criteria *first* — the tables are the cheap part.

---

## (b) DESIGN WEAKNESSES (most severe first)

**1. `PremiumThemeSpec` cannot express two of its three mandated variety classes — and mandates the third by accident.**
The brief requires new colorways to span `gradient-forward`, `clean-flat`, and `light-glass`, and assigns them to a family literally named **Jewel Gradients** — but the 17-field schema contains **zero gradient fields** (no `gradientFrom/gradientTo/gradientAngle`), **zero glass fields** (no `glassOpacity`, `backdropBlur`, `glassBorder`), and **zero depth fields** (no `border`, `borderSubtle`, `shadowColor`). The round-2 glass contract I pinned — `blur(12px)` max on `elevated` only, `@supports` fallback to 92% opacity, worst-case-black-backdrop audit — has **no data home**. So "gradient-forward" colorways will get their gradients hardcoded by the builder downstream (instant house-rule violation: hardcoded values outside the token system), and "light-glass" colorways ship as ordinary flat darks with a marketing adjective. You are generating data for a rendering contract that doesn't exist in the schema.

**2. No glow or focus tokens — the Dual-Button Glow is unimplementable from this data.**
House rule: blue bg → purple glow, purple bg → cyan glow. The schema has `primary`, `primaryBlue`, `primaryDeep`, `primaryLight` — and no `glowPrimary`, `glowSecondary`, or `focusRing`. Every new colorway's buttons will either inherit Crystalline's glow (brand bleed — a Ruby Forge button glowing Crystalline purple) or get a hardcoded glow hex (rule violation). A focus ring with no token means the builder picks one per-theme by feel, and the contrast matrix doesn't test focus-ring vs surface, so it can ship invisible. This is the single most brand-critical interaction state on the site and the data layer is silent on it.

**3. The retired-cyan ban has no numeric definition — it's a vibe audit.**
"Flag for retired-cyan review (quote the offending hex if it leaks `#00FFFF`/aqua)" — leaks *by what measure*? `#00FFFF` is one exact hex; "aqua" is undefined. Is `#40E0D0` cyan? `#00D4FF`? `#7FFFD4` is literally named aquamarine. Ice Wing `#60C0F0` and Arctic Cyan `#50A0F0` are exempted by name, but nothing stops a new colorway from proposing `#55C8F8` and getting a pass because nobody defined the boundary. Pin it: **retired-cyan = hue angle 175°–200° in OKLCH at chroma ≥ 0.10 and lightness ≥ 0.60, or ΔE < 12 to `#00FFFF`** — plus an explicit allowlist of exempt tokens by hex, not by name. As written, three different auditors produce three different Table 1 verdicts. An audit criterion that requires judgment is not an audit criterion.

**4. Archive-but-not-dup ids "still selectable" contradicts the retired ban.**
Table 3 instructs that archived non-dup ids map to themselves and remain selectable in the Archive drawer. So `tron-grid` — if it leaks `#00FFFF`, a color this program declares reject-on-sight — **stays user-selectable forever**, one drawer deeper. That's not retirement; that's shelving. The migration map must route *every* retired-cyan id to a live replacement (e.g., `tron-grid → indigo-pulse` or whatever survives), full stop. Archive-as-selectable is acceptable only for dup consolidation and heritage preservation of *compliant* colorways. Otherwise you've built a drawer labeled "brand violations, click here."

**5. The ΔE distinctness gate — the refactor's reason to exist — is absent from acceptance criteria.**
Settled context mentions "per-family lens derivation with ΔE gate," then Table 2's acceptance requirements list only three contrast ratios. Nothing requires the 6–8 new colorways to be a minimum perceptual distance from the 38 existing ones. Round 1's diagnosis was "26 themes feel identical"; this brief can produce a new colorway 4 ΔE from Ruby Forge and it *passes*. Require: each new colorway ≥ **15 ΔE (OKLab)** from every kept colorway and ≥ **10 ΔE** from every other new colorway, reported per row in Table 2. Without this, Table 1 deletes duplicates while Table 2 manufactures fresh ones.

**6. "Heritage" family is undefined, and "cover the families that are thin after the audit" is circular.**
What makes a colorway Heritage vs Apex Darks? `crystalline-default` vs `crystalline-dark` vs `obsidian-black` — which bucket and why? The brief demands every id get a family but never defines family membership criteria. And Table 2 must "cover thin families" while Table 1 — which determines thinness — is produced in the same pass by the same author with no stated minimum family size. Pin: each family ≥ 4 members post-audit; state the per-family counts in Table 1's output; define Heritage = "brand-history Crystalline lineage and its direct descendants."

**7. Naming voice applies only to the new 6–8 — the kept registry still reads like a CTF scoreboard.**
`cyberpunk-edgerunners` (display: "Cyberpunk Cyan"), `midnight-mango`, `vapor-dream` sit in the same tray as `Velvet Hour`. If they survive the audit, the curated tray's editorial voice is broken by the legacy entries. The brief needs a rename-on-keep rule: surviving colorways get display names in the settled voice (ids stay stable for migration). Also: no guard against banned vocabulary — a generated name like "Zen Garden" or "Meditation Mist" would violate the house yoga/meditation ban and nothing in the brief would catch it. Add the banned-word list to the naming constraints.

**8. The count is still additive with no pinned tray math.**
38 + 6–8 with verdicts but no required output stating final tray size. Round 2 pinned a curated tray of 16–20. This brief should require a closing count: kept / archived / new / **tray total**, so the builder isn't the one discovering the tray is 26.

---

## (c) IMPLEMENTATION-FIDELITY ATTACKS

1. **`rgba()` surfaces make the contrast audit order-dependent and unreproducible.** Ruby Forge's `surface: rgba(38,12,20,0.82)` composites differently over `bg` vs over a photo vs over another glass layer. The rule says "text vs surface ≥ 4.5" — *which surface, composited over what*? Pin: all alpha surfaces are audited as composited over their own colorway's `bg` (worst case: over `#000000` for glass class). State the compositing formula or every audit run is a coin flip.

2. **The pair matrix regressed from round 2.** This brief's six pairs drop two I mandated and the doc adopted: **button-label vs `primary` ≥ 4.5** and **focus-ring vs `surface` ≥ 3.0**. It also never tests `textSecondary` or `muted` against `elevated` — where secondary text actually lives (cards). A colorway can pass all six stated checks while its card body text fails 4.5. Restore the full matrix.

3. **`muted` at ≥ 3.0 sanctions unreadable text.** 3.0 is a large-text/UI-component floor. `muted` is used for captions, timestamps, helper text — body-size copy. If the schema treats `muted` as text, it must be ≥ 4.5; if it's decorative-only, the brief must say so and forbid its use for content. Right now it blesses sub-WCAG body text in writing. The house rule is 4.5:1 — no asterisk.

4. **`danger/success/warning` optional = state colors by builder improvisation.** 8 new colorways × 3 missing state colors = up to 24 hardcoded hex decisions made ad hoc at build time, downstream of every token rule. Either make them required, or pin the derivation (e.g., fixed hue anchors at constant chroma, lightness derived from `text` luminance) and require the derived values in the spec block.

5. **No data-viz palette — Victory charts will break the token rule.** House rule: Victory only, colors via tokens. The schema has no categorical series palette (`chart1..chart6` or equivalent), so every themed chart either ignores the colorway or hardcodes hexes. The colorway system theming everything *except* the charts is a visible seam on every analytics surface.

6. **`textSecondary`/`muted` as `rgba()` strings force every consumer to composite.** Mixed `hex6` and `rgba()` in the same schema means every audit tool and every consumer needs two parse paths. Cleaner: store all fields hex6 + a small set of alpha *steps* (`alpha84: 'D6'`, `alpha62: '9E'`) or full hex8. One format, one parser, one audit.

7. **Deliverable format invites transcription errors.** "Tables + code blocks" in markdown that "a builder pastes in" — 8 colorways × 17+ fields hand-transcribed from a markdown doc into `UniversalThemePremiumThemes.ts` is how `#FB7185` becomes `#FB718B`. Require **one machine-readable JSON or TS registry block** as the canonical artifact; the tables are the human-readable diff view, not the source of truth.

8. **No id-format or collision rule.** Ids are kebab-case by example only. Require: `^[a-z0-9]+(-[a-z0-9]+)*$`, unique across all 46 ids including Archive, and no id reuse of retired ids ever (migration map keys are immutable).

---

## (d) THE ONE HIGHEST-IMPACT CHANGE

**Add the depth-and-interaction token layer to `PremiumThemeSpec` before a single hex is generated.** Concretely, extend the schema from 17 to 24 fields:

```
border, borderSubtle, glowPrimary, glowSecondary, focusRing,
gradientFrom, gradientTo, chart1..chart3 (min)
```

Why this one: every other flaw is a spec-tightening exercise; this one determines whether the output is *paint* or *design*. Right now the 6–8 new colorways will arrive as flat fills — no hairline borders (round 2's family-separator rule referenced `var(--border-subtle)` that **doesn't exist in this schema**), no glows (Dual-Button Glow house rule dead on arrival), no focus rings (a11y state by builder guesswork), no gradients (a family named *Jewel Gradients* and a variety class named *gradient-forward* with zero gradient data). Premium dark themes are made of exactly the things missing: luminous edges, restrained glow, and one signature gradient. Generate the data without these fields and the builder will invent them per-theme, per-component, in hardcoded hex — and the entire token discipline this program exists to enforce is breached by its own deliverable. Fix the schema first; the tables write themselves after.

---

## (e) WHAT A DESIGN-SAVVY COMPETITOR OUT-BUILDS HERE

1. **They ship a distance matrix, not three ratios.** Their Table 2 includes pairwise ΔE from every kept colorway per row — a visible proof of distinctness that doubles as marketing ("every theme ≥15 ΔE apart"). This brief asks for three contrast numbers and calls it an audit.
2. **Their state colors are derived, not optional.** Danger/success/warning generated by pinned formula, present in every spec — zero improvisation surface. Here they're a parenthetical.
3. **They define their bans in math.** "Cyan" as an OKLCH hue window with a written allowlist — an audit a CI job can run, not a human squinting at hex. This brief's ban can't survive contact with `#40E0D0`.
4. **They retire by redirect, not by drawer.** Banned colorways map forward to replacements; the Archive holds history, not policy violations. This brief keeps reject-on-sight colors purchasable from the back room.
5. **Their registry artifact is code, not prose.** One canonical TS/JSON block with a schema-validating test; tables generated *from* it. This brief's source of truth is a markdown table a human retypes.

**Bottom line:** lock the extended 24-field schema, restore the full round-2 contrast matrix with pinned compositing, define retired-cyan numerically, require pairwise ΔE in Table 2, and route every banned id to a replacement — then generate. As written, this brief produces 8 beautifully-named, contrast-passing, flat, un-glowable themes that reintroduce the sameness problem with better paperwork.

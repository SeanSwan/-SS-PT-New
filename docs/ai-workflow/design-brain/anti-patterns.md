# anti-patterns.md — The Banned List (with WHY)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (expands `design.md` §14; bans inherited from `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B "explicit bans" win all conflicts)
- A PR that reintroduces any item below fails visual QA regardless of how good it looks.

---

## Stack & token bans

| Ban | Why |
|---|---|
| **Material UI** (rule 1) | Foreign design language + bundle weight; has broken production before. styled-components only |
| **Tailwind/shadcn for new Swan UI** | Utility-class drift erodes the token system; components stop reading as Swan |
| **Retired Galaxy-Swan tokens** `#0a0a1a` `#00FFFF` `#7851A9` | Retired brand. Gemini sometimes still proposes them — reject on sight |
| **Hardcoded hex without `var(--token, #fallback)`** (rule 6) | Kills theming and drift detection; the fallback IS the contract |
| **Arctic Cyan `#50A0F0` on buttons/glow** | It is the DATA color; on controls it collapses the chart-vs-action distinction |
| **Cyberforest tokens on client-facing surfaces** | Operator mode is Sean-only (design.md §5); leakage blurs the product/operator boundary |
| **The quarantined "LILA BAN"** (design-taste-frontend's purple-glow ban) | Directly contradicts the Dual-Button Glow rule. Swan doctrine wins; the skill stays quarantined |

## Layout & composition bans

| Ban | Why |
|---|---|
| **Generic SaaS template feel** (centered hero → 3-up features → logo row → CTA) | The #1 AI tell; Swan pages follow a named B2 arc with editorial asymmetry |
| **`repeat(4, 1fr)` equal card grids as default** | Equal weight says nothing is important; use weighted `minmax` columns (design.md §10) |
| **Center-everything symmetry** | Kills hierarchy and rhythm; source §B mandates asymmetry and negative space |
| **Cards inside cards** | Double chrome, wasted padding, muddy elevation story; flatten to sections within one panel |
| **Hero-style dashboards** | Dashboards are Phase 1–4 working surfaces, not brand pages; decorative banners bury the data |
| **Stretched cards filling 4K** | Wide monitors get MORE columns, not bigger cards (design.md §10) |
| **Identical card grids with no hierarchy** | If everything is a medium card, nothing is the next best action |

## Truth & content bans

| Ban | Why |
|---|---|
| **Fake/mock metrics presented as real** | Violates the Data-truth rule; mock data is a labeled gap, never dressed as proof |
| **Lorem ipsum shipping** | Placeholder copy in production is an integrity failure; write real SwanStudios-voice copy or a designed empty state |
| **Bare "No data" empty states** | Empty states are onboarding moments: Cormorant italic explanation + a CTA to create the first real thing (design.md §12) |
| **Yoga/meditation language** (rule 9) | Brand rule — use "stretching"/"flexibility" |
| **"NASM-certified" claims** | Credentials rule: "26+ years training experience," "NASM workshop-trained," "NASM-protocol" |
| **Calling Swan Coach "AI" user-facing** | Product naming rule (design.md §14) |

## Interaction bans

| Ban | Why |
|---|---|
| **Hover-only controls** | Touch devices never see them; keyboard users can't reach them |
| **Sub-44px touch targets** (rule 2) | 44px + 8px gaps is the floor, not the goal |
| **Color as the only signal** | Tier badges, states, deltas always pair color with text/icon (a11y; design.md §15) |
| **Hidden controls on data cards** | Swan Card Standard: client/trainer/admin cards expose their actions; discovery-by-hover is a desktop myth |
| **Emoji glyphs as control icons** | Repo standard is lucide-react (the 2026-07-03 cart slice replaced emoji with lucide); emoji render inconsistently across platforms and can't be sized/labeled reliably |
| **Two stacked modals** | Decision-on-decision; use drawer + modal or sequence the flow (design.md §11) |
| **Destructive action adjacent to submit** | One mis-tap from data loss; separate spatially and by variant (Danger has no glow — destruction isn't celebrated) |

## Motion & atmosphere bans

| Ban | Why |
|---|---|
| **Motion without purpose / dead decorative loops** | Fails the earned-motion test (`motion.md`); burns GPU and attention |
| **Neon overload / chaotic glow** | Glow is a discipline system with recipes (C12); more glow = less premium |
| **Ambient motion in calm zones** | Operator panels, data cards, forms — the data is the show (`motion.md` calm zones) |
| **Flat gray shadows** | Swan elevation is glass + tinted glow (design.md §9); gray drop-shadows read as 2015 Bootstrap |
| **Flat depthless backgrounds on hero/marketing** | Source §B atmospheric rules require layered atmosphere; add gradient depth + 2–5% grain |
| **Ungated animation (missing reduced-motion)** | Accessibility failure AND a rule-25 violation; DUAL gating (CSS + JS) per `motion.md` |

## Process bans

| Ban | Why |
|---|---|
| **Inventing new tokens/components inside a slice** | New tokens are PROPOSALS to Sean (design.md §1); silent invention = drift |
| **Updating design.html without design.md (or vice versa)** | They ship together; divergence makes the mirror a liar (README enforcement contract) |
| **Skipping the mounted-surface receipt before a UI fix** | Rule 26 — you may be styling a dormant component |
| **"Looks good" as a QA verdict** | qa-gates.md verdicts are binary gates with receipts, not vibes (rule 19) |

## Pass/fail gate

PASS = zero hits from this list in the diff, checked against BOTH the rendered surface and the source. One hit = FAIL — fix, or get Sean's explicit written exception logged per `obsidian/design-decision-log-policy.md`.

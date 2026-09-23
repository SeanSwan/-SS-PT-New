# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (medium)
**Document:** ./SWAN-FORGE-PACKET.md
**Seed:** (none)
**Tokens:** 2742 in / 3479 out | **Cost:** ~$0.0022 | **Wall:** 122.1s | **finish_reason:** stop

---

**Tencent HY3 — Divergent Interaction Designer**
*Owning UI/UX for Swan Forge (describe → picture → video)*

All designs below obey Swan constraints:
- styled-components only, no MUI
- 44px minimum touch targets
- dark-first Crystalline Swan tokens (`var(--cs-*, #fallback)` – no raw hex in practice)
- WCAG AA contrast
- Victory-only for any charts (none needed here)
- file cap 300 lines (components described, not written)
- zero PII
- Dual-Button Glow: blue bg → purple glow / purple bg → cyan glow
- calm motion (LAW 6): opacity/translate ≤8px, never cinematic
- reduced-motion handled in JS (`useReducedMotion()` hook disables shimmer)

---

## §3 — Ten Questions, Concrete Wireframes

### Q1 — Where does this live?
**Desktop:** Content Studio gets a new left-rail item **Forge** (icon: prism). Selecting it opens a dedicated workspace, not a modal. Trainers see it only if role-flagged.

```
[Content Studio]
  ├─ Projects
  ├─ Media
  ├─ Forge          <-- new, admin now, trainer later
  └─ Settings
[Main]  ┌──────────────────────────────┐
        │ Forge  | Brief | Directions | Video │
        └──────────────────────────────┘
```

**375px phone:** Bottom tab bar (44px) adds **Forge** as 4th tab. Opens full-screen route `/forge`.

```
[bottom nav: Home | Studio | Forge | Me]
──────────────────────────────
| Forge
| (full-screen surface)
```

---

### Q2 — Input affordance?
Hybrid: free-text primary, facet chips, voice dictation.

**Desktop wire:**
```
┌─────────────────────────────────────────┐
│ Describe your shot… (textarea, 44px)    │
│ "A swan of glass on a neon lake"        │
│ [🎤 Voice]  [+ Style] [+ Mood] [+ Lens] │
│ [Generate 3 Directions] (blue→purple)   │
└─────────────────────────────────────────┘
```
Chips insert tokens into text. Voice uses Web Speech API into same box.

**375px:**
```
┌───────────────┐
│ Describe…     │
│ (textarea)    │
│ [🎤] [+Add]   │
│ [Generate]    │
└───────────────┘
```
Mic button 44px right-aligned.

---

### Q3 — 3 directions presentation?
**Desktop:** 3 cards side-by-side, each 300px.

```
┌────────┐ ┌────────┐ ┌────────┐
│ img    │ │ img    │ │ img    │
│ Dir A  │ │ Dir B  │ │ Dir C  │
│ "ice"  │ │ "fire" │ │ "fog"  │
│ [Pick] │ │ [Pick] │ │ [Pick] │ (purple→cyan)
└────────┘ └────────┘ └────────┘
```

**375px:** vertical stack / swipe carousel with dots.
```
[ Card 1 full width ]
< ● ○ ○ >
tap card → expand facets
[Pick] (44px)
```

---

### Q4 — Convergence loop as actual interface (Round 1→2→3 cap)
We design a **Refine Rail** that appears after pick.

**Desktop:**
```
┌─── Refine (Round 2/3) ───────────┐
│ Based on Dir C "fog"             │
│ Chips: [fog] [cold] [wide lens]  │
│ "more like this but colder" [+]  │
│ [Regenerate Variants] (cost $)   │
│ Progress: ●●○ (cap 3)            │
└──────────────────────────────────┘
```
After round 3, Regenerate disabled, only "Approve for Video".

**375px:**
```
Refine 2/3
[chips wrap]
[text input]
[Regen] (44px)
●●○
```

---

### Q5 — Cost without taxi meter
Static estimate badge, not running counter.

**Both:** Near action button: `Est. $0.02` in muted token. On click, bottom-sheet (phone) / dialog (desktop) confirms: "Spend $0.02 from admin budget? [Cancel] [Confirm]". Calm fade.

---

### Q6 — Still→video promotion (one-way door)
From approved still:

**Desktop modal:**
```
┌─ Promote to Video ────────────┐
│ 480p test ($0.5) [Generate]   │
│ (preview plays)               │
│ [Approve → 1080p ($1.5)]     │
│ (purple bg → cyan glow)       │
└───────────────────────────────┘
```
Text-only call blocked: button disabled with tooltip "Image-first law".

**375px:** full-screen sheet, same steps stacked.

---

### Q7 — Empty / loading / error / partial
- **Empty:** prism icon + "Describe to begin".
- **Loading:** shimmer blocks (opacity pulse, JS respects reduced-motion). Text: "Compiling prompt via Forge core…".
- **Error (fail-closed):** "Provider not configured – no media fabricated" + [Retry].
- **Partial:** grid shows succeeded, failed tile with [Retry] (44px).

---

### Q8 — `forge_explain` UI
Under each image: **Why this?** disclosure (accordion).

```
▸ Why this?
  Compiled: "swan glass neon --law4 optics"
  Facets: [Crystalline] [Neon]  LAW: killed "creature"
```
Teaches Sean craft over time.

---

### Q9 — Mobile viability
Fully phone-viable for brief, review, refine, promote. Generation may warn "slow on cellular". Desktop-first for heavy art direction, but not excluded.

---

### Q10 — Relation to Content Studio IA
Forge is a **route sibling** under `/studio/forge`, shares header & project picker. Not a bolted tab; uses same `ProjectContext`.

---

## Convergence Loop – Actual Interface Spec
1. Brief submit → `forge_direction` returns 3.
2. Pick → `forge_image` (round 1) shows stills.
3. Refine Rail (round n) calls `forge_variants` with overrides.
4. Cap at 3 rounds; UI locks Regen, reveals Video door.
5. All rounds logged in `forge_explain` history.

---

## Architecture Stress-Test (HY3 review)

1. **Determinism (behavior #6):** Depends on provider seed support (§4 risk 4). If Seedance ignores seed, same brief+seed yields drift → untestable. *Must verify live; UI should show "seed honored" only if adapter confirms.*
2. **Fail-closed inheritance:** Good, but UI must never show placeholder media. Our error state covers it.
3. **MCP registry gate (§4-5):** If unregistered, Forge core unreachable → entire UI dead. Need registry entry before slice.
4. **One brain, three consumers:** Solves drift, but versioning critical. If CLI uses v1, backend v2, prompt divergence returns. Pin semantic version in all adapters.
5. **Capability declaration:** If `honorsNegativePrompt` falsely true, LAW filter may be ignored → banned facets slip. Live probe required.
6. **480p→1080p ladder:** Enforced in adapter; UI must reflect two-step confirm. If caller bypasses, cost blows. Our modal enforces.
7. **Phone reduced-motion:** JS hook needed; CSS-only fails on some engines. We specified.
8. **Image-first law:** `forge_video` refuses text; UI disables. But if MCP tool called directly by agent, law must also live in core, not just UI.
9. **Partial failure at scale:** 3 directions × variants = many calls; one fail shouldn't block all. Our partial grid handles.
10. **Spend authority:** Admin-only initially; UI role-gate needed or trainers see disabled buttons.

**Smallest first slice:** Desktop Forge route → free-text → `forge_direction` → 3 cards → pick → `forge_image` (Gemini) → explain. No video, no MCP yet. Proves one brain.

**Breaks first:** Provider seed determinism & registry gate. Fix those before launch.

**Missing entirely (ranked):**
1. Live provider capability probe (high)
2. Registry entry for MCP (high)
3. Voice dictation polish (med)
4. Trainer role UI (med)
5. Victory chart for cost history (low)

— HY3, signed.

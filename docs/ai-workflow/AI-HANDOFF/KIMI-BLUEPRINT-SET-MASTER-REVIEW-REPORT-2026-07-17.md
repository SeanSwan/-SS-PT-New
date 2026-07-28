# Master Blueprint Review Report — the SwanStudios KIMI design set (2026-07-17)
**ONE consolidated report synthesizing all 15 Kimi-K3 blueprints, so the final-decider panel (Fable + Sol + Kimi-design) reviews a single document instead of 15. Every claim cites its source blueprint. Purpose: a go/no-go on the set + the build order, before building.**

---

## 1. Executive verdict
The set is **strong in direction, uneven in build-readiness** — and that unevenness is the single most important thing for the panel to rule on. Two tiers:
- **Build-exact NOW (real files, tokens, values, slices):** Swan Lens, Dashboard System, Store. These are executable verbatim.
- **SEND-BACK on the BRIEF (diagnosis is elite, the build-exact design is NOT yet present):** Home, About, Contact, Video. Kimi flagged each with the *same* critique: *"a disciplined process brief that makes zero design decisions itself — the signature moment, the tokens, and the CTA hierarchy are all delegated"* (HOME §a; near-verbatim in ABOUT/CONTACT/VIDEO). These four cannot be built verbatim yet.
- **SHIP-WITH-CHANGES (direction + fixes, near-ready):** Cover/Gallery (SEND-BACK, needs Core-Loop rewiring), Photography (rename + de-Galaxy + reveal-not-gate).

**Why the split exists (root cause):** the marketing-surface packets told Kimi "be premium" without supplying a **canonical token sheet** or the **Crystallize mechanics**. Kimi correctly refused to invent the brand's signature artifact from a parenthetical. The heavy-surface packets (lens/dashboards/store) were grounded enough to produce real specs. **This is fixable and the fix is already in the set — see §2.**

## 2. THE KEYSTONE FINDING — the Swan Lens unblocks everything
The Swan Lens blueprint is not just one of 15; it is the **foundation the other 14 depend on**, and it already contains the two things every other blueprint said was missing:
1. **The canonical token sheet.** `--lens-core-*` (18 required tokens: bg/surface-1/2/3, text-1/2/3, border, accent-primary/secondary/rare, focus-ring, selection-bg/text, danger/success/warning, shadow-color) with **actual values** (`--lens-core-bg #060B16`, `--lens-core-surface-1 #0A1224`, `--lens-core-surface-2 #101A33`, focus-ring `#8FE8FF`, …), plus `--lens-geo-*` (9), `--lens-fx-*` (8), `--lens-elev-*` (5). The **11 existing `--world-*` names are preserved verbatim and projected 1:1 from core tokens in one place**; 12 new `--world-*` are additive. (SWAN-LENS §W4/tiers/rules.)
2. **The Crystallize, defined once:** `SL/motion/useCrystallizeTransition.ts` (≤160) + `SL/motion/CrystallizeOverlay.tsx` (≤120), two-speed-law-enforced, reduced-motion = instant facet + opacity. (SWAN-LENS §C4.)

**Consequence for the whole set:** build the Swan Lens FIRST. Its token sheet becomes the *published values* that resolve the #1 gap on every other surface, and its Crystallize becomes the shared component every surface *consumes* rather than reinvents. **The 4 SEND-BACK marketing blueprints become buildable the moment they can reference the lens's token sheet + Crystallize — they likely need one focused re-pass with those as input.**

## 3. Cross-surface themes the panel must confirm (each cited)
**A. The Crystallize is the shared signature — must be built once (in the lens) and consumed, never reinvented.** Every surface assigns it a role: Store → the 12-month block crystallizes on first reveal (STORE §concept); Video → free-video completion crystallizes the card, all-complete crystallizes the gate open (VIDEO §d); Cover/Gallery → empty state "Crystallize your first PR" + milestone cards (COVER §weakest/decomp); Contact → "The Crystallize Submit" on send (CONTACT §d); Dashboards → `MilestoneTile`/`CrystallizeOverlay` (DASH §2.2). Risk if not centralized: 6 divergent Crystallizes = no signature.

**B. Galaxy-Swan de-risk is universal and under-operationalized in the briefs.** A CI grep gate is mandatory on every surface, and it must catch the palette **in disguise**, not just the hex: `#0a0a1a|#00FFFF|#7851A9` (case-insensitive, **including inside `var()` fallbacks**) AND channel literals `rgba(0,255,255,·)` / `rgba(120,81,169,·)` / `rgba(10,10,26,·)` / `hsl()` equivalents (PHOTO §2; HOME §5; CONTACT §3; COVER §c). Named carriers: **Store** ("Galaxy themed" route), **Photography** ("Cosmic **Gate**" — rename now; codenames leak into flags/classes/analytics), **Cover** ("Observatory" starfield = highest-risk carrier), **Contact** (1193-line monolith), **Dashboards** (`.theme.ts` static objects with residue). Starfields/nebulae are the galaxy idiom — **banned in spirit even in new colors** (PHOTO §2).

**C. WCAG has one recurring, concrete failure the token sheet must prevent.** Wing-purple as **text** on obsidian ≈ 3.3:1 — **fails 4.5:1** (PHOTO §8; ABOUT). The enhanced Design Brain fixes this by construction ("the purple button passes contrast because the failing hex can no longer hold text" — BRAIN §bottom-line). The token sheet must declare **which tokens are text-legal vs decorative-only**, or AA is aspirational. Focus indicators need 3:1 adjacency (1.4.11), not just "visible."

**D. Reversibility is consistent — with one real gotcha to standardize.** Every surface = next-version component + feature flag + additive-only backend (correct). But: **Vite env flags are BUILD-TIME** — "flip the flag" means rebuild/redeploy, not a runtime toggle; and side-by-side versions **must be `lazy()`-loaded** or the bundle carries both and doubles what you're reverting to escape (ABOUT §reversibility-precision). Store handles this well: `StoreGate.tsx` + ErrorBoundary→V3 fail-closed (STORE §flag). **Recommendation: adopt Store's gate pattern as the house standard, and add a runtime-config option where instant revert matters.**

**E. New backend surfaces (the real full-stack work — no mocks):** Contact → honeypot/timing anti-spam + 429 rate-limit + response contract `200{id}/422{fieldErrors}/429+Retry-After` (CONTACT §backend); Photography → server-side watermark rendition IF deterrence is real (PHOTO §5); Video → watch-progress endpoint driving card/gate crystallize (VIDEO §d); Cover/Gallery → chunked/resumable upload replacing the 100MB + dual-write race (COVER §3). All additive, flag-gated.

**F. Two-speed + reduced-motion must be named explicitly per marketing surface:** "transform/opacity only" stated outright (HOME notes its absence janks the scroll story), and the Crystallize must ship a **designed static reduced-motion final frame** (HOME §9, ABOUT, CONTACT). In-app (dashboards) stays calm by the two-speed law.

## 4. Per-surface build-readiness
| Surface | Verdict | Build-ready? |
|---|---|---|
| **Swan Lens** | Lens 2.0 "Crystalline Core" — full spec + token sheet + Crystallize | ✅ YES — build first |
| **Dashboard System** | shell spine + 4 role densities, lens-tied, gold budget, testids | ✅ YES |
| **Store** | StoreV4 beside V3, gate + fail-closed, jeweler's-case concept | ✅ YES (design-only; payment path untouched) |
| **Cover/Gallery** | SEND-BACK — Core-Loop rewire, Crystallize, real upload, decomposition | ⚠ near-ready, strong direction |
| **Photography** | SHIP-WITH-CHANGES — rename, de-Galaxy transplant, reveal-not-gate, 2219→<300 split | ⚠ near-ready |
| **Home** | SEND-BACK — needs token sheet + signature mechanics + royalty-free backup hero | ❌ re-pass w/ lens tokens |
| **About** | SEND-BACK — needs token sheet + the "swan logomark from light caustics" signature | ❌ re-pass |
| **Contact** | SHIP-WITH-CHANGES — Crystallize Submit + de-Galaxy gate + 1193→<300 split | ⚠ near-ready |
| **Video** | SEND-BACK — needs the "Refraction System" signature + real perf/CTA/gate design | ❌ re-pass |
| **Design Skill (redo)** | encodes the laws (Enchantment Ratio, gold allowlist, Crystallize, two-speed, Dual-Button Glow) | ✅ candidate — review before swap |
| **Design Brain (enhance)** | fixes 2 "physically illiterate rainbows" + a mandated WCAG violation + pointer-rot | ✅ candidate — review before swap |

## 5. Revised build order (driven by the keystone finding)
1. **Swan Lens** (token sheet + Crystallize + worldId/World-tab) — unblocks all.
2. **Dashboard System** (consumes lens; the core product loop).
3. **Store** (StoreV4 gate; de-Galaxy; money-path untouched).
4. **Cover/Gallery + Contact + Photography** (near-ready; consume lens tokens + Crystallize).
5. **Home/About/Video** — after a focused re-pass supplying them the lens token sheet + the Crystallize spec (they SEND-BACK'd for exactly this).
6. Swap the Design Skill + Brain candidates only after Sean approves.

## 6. Go/no-go questions for the final-decider panel (Fable + Sol + Kimi-design)
1. Is the **keystone strategy** right — build the Swan Lens first, treat its token sheet + Crystallize as the single source, and re-pass the 4 SEND-BACK marketing surfaces with those as input? Or fold the token sheet into a standalone "design tokens" artifact first?
2. Is **Store's gate pattern** (version + flag + ErrorBoundary fail-closed + lazy-load) the correct house reversibility standard for all surfaces, given the Vite build-time-flag gotcha?
3. Any **cross-surface inconsistency** the per-surface reviews missed (token names, Crystallize contract, de-Galaxy regex completeness, backend-flag coverage)?
4. Does anything here violate a house rule or the two-speed law as consolidated?
5. Green-light to build in the §5 order, or adjust?

---
*Fidelity note: this report is a synthesis of the 15 committed blueprints on `origin/main` (see `KIMI-BLUEPRINT-SET-INDEX-2026-07-17.md`); every §3 claim cites its source. It does not replace the blueprints — the builder still follows each surface's own blueprint verbatim; this report is for the panel's cross-surface go/no-go.*

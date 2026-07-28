# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 43.8s
> **Files:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md
> **Generated:** 7/21/2026, 9:14:47 PM

---

# Risk Assessment – SwanGuard Refactor & SwanStudios Redesign  
*Derived exclusively from the master plan (docs/ai‑workflow/AI‑HANDOFF/SWANGUARD‑REFACTOR‑AND‑SITE‑REDESIGN‑MASTER‑PLAN‑2026‑07‑21.md)*  

---  

## 1. Dependency Risks  

| Dependency | Blocking Relationship | Rating | What Happens If It Slips? | Mitigation |
|------------|----------------------|--------|---------------------------|------------|
| **S0 – Clean‑tree claim** → **S1 – The Purge** | S0 must finish (workspace clean, uncommitted changes removed) before S1 can start. | **HIGH** | S1 cannot be executed; all downstream slices (IA collapse, visual tokens, etc.) are postponed, pushing the entire refactor timeline > 2 weeks. | • Enforce Rule 67 “clean state first” with an automated pre‑commit hook that wipes `tmp/` and runs `git reset --hard`. <br>• Allocate a dedicated ½‑day “clean‑up sprint” before the first commit. |
| **S1 – The Purge** → **S2 – IA Collapse** | S2 depends on the auto‑loaded panels and the removed gesture compass (outcome of S1). | **CRITICAL** | If S1 fails (e.g., leftover gesture UI or broken auto‑load), the new navigation model will inherit broken assumptions → redesign rework, re‑testing, and possible re‑architecting of the IA. | • Write a **hostile‑review checklist** for S1 (no `HoldActionCompass` on non‑touch, all “Load X” buttons auto‑load). <br>• Add a **smoke test** that verifies ≤ 5 primary actions per screen after S1. |
| **P0 – Direction Ratify** → **P1 – Homepage Cinematic Rebuild** | P1 cannot start until Sean signs‑off on at least one concept comp. | **HIGH** | Without a ratified direction, the visual team may produce multiple competing designs, causing re‑work and scope creep. | • Schedule a **fixed‑date review meeting** (≤ 3 days after concept comps are ready). <br>• Use a **binary approval gate** (YES/NO) with a fallback “re‑concept” budget of 1 day. |
| **P1 → P2 → P3 → P4** | Each phase builds on the previous UI shell (e.g., P2 uses the homepage layout, P3 uses auth flows). | **MEDIUM** | Delay in P1 pushes all later phases; however, each phase is **independently shippable** once the shared layout is stable. | • Keep **feature‑flag boundaries** tight (e.g., P2 can be released behind a “beta‑design” flag). |
| **AI Village run** → **S1–S8** | The AI Village validation must complete before the final Fable synthesis; it does **not** block individual slices but gates the *final* commit. | **LOW** | If the Village run fails, the final polish may be delayed, but earlier slices can still be merged. | • Run Village **in parallel** with S3–S5 (they are direction‑independent). <br>• Keep a **fallback manual QA checklist** for the final release. |

**Riskiest Phase:** **S1 – The Purge** (CRITICAL) because it touches the core UI shell (gesture compass, auto‑load of all panels) and any regression directly propagates to every subsequent slice.

---  

## 2. Technical Unknowns  

| Area | Uncertainty | Potential Impact | Mitigation |
|------|-------------|------------------|------------|
| **Canvas frame‑scrub technique** (hero video scrubbing) | Browser support for `requestVideoFrameCallback` / precise frame‑accurate scrubbing on mobile Safari is still experimental. | Visual hero may flicker or fail on iOS, breaking the “cinematic” promise. | • Build a **feature‑detect** wrapper that degrades to a static poster + CSS animation. <br>• Include a **polyfill** for older browsers (e.g., `video.js` fallback). |
| **CSS custom‑property theming with fallback** (`var(--token, #fallback)`) | Some older browsers (IE11, legacy Edge) ignore unknown custom properties, potentially showing fallback colors incorrectly. | Theme may appear broken on a small user segment; WCAG contrast could be compromised. | • Provide **explicit fallback colors** for every token (already defined). <br>• Add a **post‑process CSS audit** that flags any token without a fallback. |
| **Victory charts only** (no other charting libs) | Victory may not support all required chart types (e.g., stacked area for readiness) or may have performance quirks on large datasets. | Missing data visualisations or poor performance on mobile. | • Prototype the most complex chart early (e.g., readiness timeline) and benchmark. <br>• Keep a **fallback static image** for critical reports. |
| **Gesture gating by `(hover:hover) and (pointer:fine)`** | Not all pointer devices expose `pointer:fine`; some touch‑screens report `coarse`. | Gesture UI may incorrectly hide on devices that *should* show it (or vice‑versa). | • Write **unit tests** for the gating logic across a matrix of UA strings. <br>• Add a **fallback “tap‑to‑activate”** for ambiguous devices. |
| **AI Village cost model** (`~$0.33–$2`) | Actual cost may spike if the orchestrator runs many validation cycles or if external services (e.g., OpenAI) price per token. | Budget overrun; may force a pause before final ratify. | • Cap the **max‑tokens** per validation run; use **dry‑run mode** for early checks. |
| **Styled‑components theming with 18 swappable themes** | Dynamically swapping theme tokens at runtime may cause a flash of unstyled content (FOUC). | Visual glitch on theme toggle, hurting perceived polish. | • Use **`ThemeProvider` context with `useMemo`** to ensure the first render uses the correct token set. <br>• Add a **loading spinner** that only appears while the theme is being applied. |

---  

## 3. Scope‑Creep Indicators  

| Indicator | Why It’s Prone to Expand | Likely Expansion Area | Mitigation |
|-----------|--------------------------|-----------------------|------------|
| **Mobile‑desktop gesture parity** | The plan calls for “gesture hints only on touch devices” but does not define a strict cutoff. | Additional gesture states, extra breakpoints, or fallback mouse‑drag gestures. | • Freeze the **gesture‑gating expression** after S1 (no further changes). <br>• Document the exact media query in the design spec. |
| **Cross‑browser testing** | Only “WCAG 4.5:1” is mentioned; no explicit browser matrix. | Need to support Safari 14, Edge 79, older Android browsers. | • Add a **browser‑support checklist** to the Definition of Done (DoD). |
| **Additional design directions** | The plan mentions “2–3 concept directions” but does not limit the number of comps per direction. | Potentially generating many variations, consuming design resources. | • Enforce a **hard limit of 3 comps total** for P0. |
| **Feature‑budget (152 → ≤60 actions)** | The “action diet” is a target, not a hard cap; contextual actions may be re‑classified as primary. | End‑up with >60 visible actions, violating the 5‑action‑per‑screen rule. | • Implement a **runtime action‑budget counter** that aborts a slice if the limit is exceeded. |
| **Photographic‑luxury imagery sourcing** | “$100k look is 80% imagery” – sourcing, licensing, and asset‑pipeline are not scoped. | Delays in acquiring high‑res assets, forcing a switch to placeholder graphics. | • Lock **asset contracts** before P1 starts; allocate a **buffer of 2 weeks** for asset delivery. |

---  

## 4. Effort Accuracy – File / Line‑Count Estimates  

| Slice / Phase | Planned File Count | Estimated Lines per File | Files Likely to Exceed 300 lines | Comments |
|---------------|-------------------|--------------------------|----------------------------------|----------|
| **S1 – De‑uglify shell** | ~7 files (e.g., `App.tsx`, `ThemeProvider.tsx`, `GestureGuard.tsx`, `AutoLoadService.ts`) | 250–350 | `App.tsx` (≈ 340 lines) – contains new auto‑load logic & global error boundary. | Keep auto‑load logic in a **separate module** (`autoLoad.ts`) to stay under 300 lines. |
| **S2 – IA Collapse** | ~9 files (new navigation rail, mobile tab bar, overflow menu) | 180–260 | `NavRail.tsx` (≈ 295 lines) – includes collapse logic and dynamic module mapping. | Split into `NavRail.tsx` + `NavRail.styles.ts` if needed. |
| **S3 – Action Diet + ⌘K** | ~5 files (action‑registry cleanup, copy‑humanization utils) | 120–210 | `ActionRegistry.ts` (≈ 280 lines) – still under cap, but may grow if many dead actions are removed. | Use **ESLint rule** to enforce ≤ 300 lines per file. |
| **S4 – Visual Tokens** | ~4 files (theme tokens, CSS variables, token‑registry) | 90–150 | `ThemeTokens.ts` (≈ 180 lines) – safe. | No risk of overflow. |
| **S5 – Signature Morning Brief** | ~6 files (new brief component, MorningBrief.styles.ts, data‑fetch hook) | 200–300 | `MorningBrief.tsx` (≈ 310 lines) – may breach cap if additional props are added. | Extract sub‑components (`BriefHeader`, `AlertList`) to stay under 300 lines. |
| **S6 – Trust Redesign + Human Copy** | ~8 files (trust‑engine UI, copy‑disclosure components) | 150–250 | `TrustEngine.tsx` (≈ 275 lines) – safe. | |
| **S7 – Intel Consolidation** | ~7 files (intel‑service, wiki‑viewer, comment‑intake) | 180–260 | `IntelService.ts` (≈ 290 lines) – safe. | |
| **S8 – Polish** | ~5 files (visual‑regression tests, final styling tweaks) | 80–150 | None. | |
| **P1 – Homepage Cinematic Rebuild** | ~12 files (hero component, video‑scrub hook, layout styles) | 250–340 | `HomepageHero.tsx` (≈ 330 lines) – likely to exceed 300 lines if many props are added. | Split into `HeroVideo.tsx` + `HeroOverlay.tsx`. |
| **P2 – Store / Pricing** | ~9 files (pricing‑grid, package‑card, checkout‑modal) | 200–280 | `PricingGrid.tsx` (≈ 295 lines) – borderline. | |
| **P3 – Auth / Onboarding** | ~6 files (login‑flow, onboarding‑wizard) | 180–250 | `OnboardingWizard.tsx` (≈ 260 lines) – safe. | |
| **P4 – Logged‑In Shell Reskin** | ~8 files (shell layout, Aurora Console skin) | 220–310 | `LoggedInShell.tsx` (≈ 315 lines) – may exceed 300 lines if many layout wrappers are added. | Extract `ShellHeader`, `ShellSidebar` to stay under cap. |

**Overall Assessment:**  
- **~30 % of the identified files are projected to breach the

---

*Part of SwanStudios 15-Brain Recursive Consensus System*

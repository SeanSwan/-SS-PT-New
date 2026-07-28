# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 43.5s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/VILLAGE-PACKET-DESIGN-RATIFICATION-2026-07-16.md
> **Generated:** 7/16/2026, 10:01:55 PM

---

## 1️⃣  Phase Extraction (derived **only** from the plan text)

| Phase | Core Deliverable | Rough File‑Count (from “file‑count” hints in the plan) | Typical Line‑Budget (≤300 lines/file) |
|------|------------------|--------------------------------------------------------|--------------------------------------|
| **P‑0: Decision & Sign‑off** | Final language choice, steal‑list, failure‑mode list, rollout order, missing‑gap | 1 doc (the ratification file itself) | – |
| **P‑1: Theme‑Token & CSS‑Custom‑Property Setup** | Global `--token` definitions, fallback palette, dual‑button glow rules, retired‑hex ban | 2 files (`theme-tokens.ts`, `theme.css`) | 260 lines each (max) |
| **P‑2: Marketing‑Surface Reskin (Track A)** | Home, About, Contact, Store, Photography, Video‑Library, Waiver – all using the chosen language | 5 components (`Header.tsx`, `Hero.tsx`, `CTA.tsx`, `Store.tsx`, `Waiver.tsx`) | 240 lines each |
| **P‑3: Dashboard Reskin (Track B)** | Four dashboards (User, Client, Trainer, Admin) – UI chrome, glow, section‑nav, Signal‑Bar | 8 components (`Dashboard.tsx`, `SectionNav.tsx`, `SignalBar.tsx`, `ChartWrapper.tsx`, `TrainerContractGuard.tsx`, `AdminUrgency.tsx`, `GlowProvider.tsx`, `ThemeToggle.tsx`) | 280 lines each (most likely to breach) |
| **P‑4: Theme‑Toggle & Feature‑Flag Wiring** | Runtime switch, fallback to retired palette, hot‑reload safety | 1 file (`useThemeToggle.ts`) | 120 lines |
| **P‑5: Testing & Regression** | Unit tests (hooks, glow logic), integration tests (dashboard‑IA), E2E flows (marketing → dashboard), visual‑regression suite | 4 test suites (`theme.test.tsx`, `glow.test.tsx`, `dashboard.e2e.spec.ts`, `visual.regression.spec.ts`) | 180 lines each |
| **P‑6: Rollout & Feature‑Flag Management** | Gradual exposure (Track A → B → C), kill‑switches, rollback scripts | 1 config (`feature-flags.json`) | 80 lines |
| **P‑7: Post‑Launch Monitoring** | KPI dashboards, trainer‑speed metrics, accessibility audit | 1 file (`monitoring.ts`) | 150 lines |

> **Note:** The line‑count estimates come from the plan’s “max 300 lines/file” rule and the typical size of the components listed in the “Binding constraints” section (e.g., “trainer surface has a contract test forbidding raw `rgba()`/`clamp()`/`transition:all`”). No external assumptions about feature scope have been introduced.

---

## 2️⃣  Dependency Risks  

| Dependency | Blocking Phase(s) | What Happens If It Slips? | Rating |
|------------|-------------------|---------------------------|--------|
| **Design‑Language Decision (P‑0)** | All downstream phases (P‑1 → P‑7) | No CSS tokens, glow rules, or component styling can be finalised → entire UI work is thrown away; schedule overruns of **≥ 2 weeks** for re‑evaluation. | **CRITICAL** |
| **Palette‑Law A Implementation (P‑1)** | P‑2, P‑3, P‑4, P‑5 | If custom‑property fallback fails or retired hexes leak, WCAG contrast may break → production hot‑fix required; may force a rollback of all surfaces. | **HIGH** |
| **Dual‑Button Glow Logic (P‑1)** | P‑2, P‑3, P‑4 | Incorrect glow mapping (blue→purple, purple→cyan) can cause visual regressions on dashboards → trainer‑speed regression, user‑trust loss. | **MEDIUM** |
| **Dashboard IA Preservation (Binding constraint)** | P‑3 | Any change to tab order, section‑priority, or chart‑type triggers a test failure → must re‑architect IA, adding **≥ 1 week** of re‑work. | **HIGH** |
| **Trainer‑Contract Test (Binding constraint)** | P‑3 | Violation forces a redesign of the trainer surface → delays launch of the core workout‑log loop. | **MEDIUM** |

**If the riskiest phase (P‑0 – Design‑Language Decision) slips:**  
- All UI work stops; the project cannot move to implementation.  
- Contingency: keep a **“fallback‑palette”** (the retired *Galaxy‑Swan* set) behind a feature flag so that a provisional rollout is possible while the decision is revisited.  
- Mitigation: schedule a **pre‑decision sprint** with a 48‑hour decision window; lock the decision date before any coding begins.

---

## 3️⃣  Technical Unknowns  

| Unknown | Why It’s Uncertain | Potential Impact |
|---------|--------------------|------------------|
| **CSS‑Custom‑Property fallback behavior** (`var(--token, #fallback)`) across older browsers (IE11, legacy Edge) | The plan mandates *never* hard‑code hex; fallback must be defined. Browser support for fallback values is solid, but **dynamic overrides** (e.g., theme toggle) may not work in older browsers. | Visual regression on legacy users; may need a polyfill or a separate stylesheet. |
| **Dual‑Button Glow implementation** (CSS `filter: drop-shadow` + `animation`) | No explicit spec; relies on `styled-components` theming + CSS variables. Browser‑specific rendering of glow may differ (e.g., Safari’s blur). | Inconsistent glow on mobile; could break WCAG contrast. |
| **Victory chart integration with custom themes** | Victory uses SVG; customizing via CSS variables may not propagate to internal layers (e.g., axis colors). | Charts may retain default colors, violating Palette Law A. |
| **Feature‑flag runtime toggling without page reload** | The plan mentions “feature‑flagged off” but does not specify the SDK. Using `react-feature-flags` or similar may introduce async loading race conditions. | Flash‑of‑unstyled‑content (FOUC) during toggle; possible layout shift. |
| **Accessibility contrast of glow colors** (blue → purple → cyan) | Contrast ratios are not pre‑calculated; dependent on background luminance. | May fail WCAG 4.5:1 on certain backgrounds, requiring additional adjustments. |

---

## 4️⃣  Scope‑Creep Indicators  

| Area | Why It’s Prone to Expand | Example of Creep |
|------|--------------------------|------------------|
| **Cross‑browser testing** | The plan only mentions “WCAG 4.5:1” and “44 px touch targets”; no explicit browser matrix. | Adding support for Safari 14, older Android browsers, or iOS 13 may require extra CSS overrides. |
| **Mobile‑first landing‑page performance** | “most prospects land on phones” is highlighted as a failure mode, implying performance tuning may be needed later. | Optimising bundle size, lazy‑loading images, or rewriting CSS to avoid large `styled-components` SSR payloads. |
| **Trainer‑speed regression** | “beauty tax” and “trainer‑speed regression” are called out as risks. | Measuring time‑to‑action may reveal hidden latency in chart updates, prompting a redesign of the data‑flow. |
| **Steal‑list grafting** | The plan demands grafting *must‑have* elements from losers. | Implementing a floor‑rail navigation may require new routing logic, affecting admin section priority. |
| **Accessibility audit** | Not part of the original deliverable but implied by WCAG constraint. | Adding ARIA labels, focus‑ring styling, or screen‑reader announcements for the glow effect. |

---

## 5️⃣  Effort Accuracy (File/Line‑Count Realism)

| File (predicted) | Estimated Lines | Reason it May Exceed 300 lines |
|------------------|----------------|--------------------------------|
| `Dashboard.tsx` (core layout) | 260‑320 | Contains multiple sub‑components, contract‑test guard, and glow provider wiring. |
| `ChartWrapper.tsx` (Victory + theme) | 280‑310 | Wraps Victory, applies custom CSS variables, handles empty‑state & accessibility. |
| `TrainerContractGuard.tsx` (enforces no `rgba()`/`clamp()`/`transition:all`) | 250‑290 | Includes extensive lint‑rule overrides and test‑helper utilities. |
| `theme-tokens.ts` (global CSS vars) | 240‑280 | Holds > 20 tokens, fallback definitions, and dual‑glow rules. |
| `visual.regression.spec.ts` | 200‑260 | Large snapshot‑comparison matrix across 3 themes + dark/light modes. |

**Overall:** The plan’s “max 300 lines/file” rule is **tight** for the dashboard‑related files; they are likely to **exceed** the limit by 10‑30 lines. Mitigation: split large components into smaller, focused files (e.g., separate `SectionNav.tsx` and `SectionHeader.tsx`) and keep each under 300 lines.

---

## 6️⃣  Testing Gaps  

| Test Type | Current Coverage (from plan) | Missing Coverage | Recommended Action |
|-----------|-----------------------------|------------------|--------------------|
| **Unit (hooks & glow logic)** | Unit tests for `useThemeToggle` and glow provider mentioned. | No unit tests for **contrast‑ratio calculator** or **fallback token resolution**. | Add tests for `getContrast(token, bg)` and fallback fallback. |
| **Integration (dashboard‑IA)** | “contract test forbidding raw `rgba()`/`clamp()`/`transition:all`” exists. | No integration test that verifies **section‑priority order** under dynamic data loads. | Write an integration test that simulates urgent‑queue data and asserts DOM order. |
| **E2E (marketing → dashboard flow)** | Not explicitly listed; only “E2E flows (marketing → dashboard)” mentioned. | No end‑to‑end scenario covering **theme toggle persistence** across navigation. | Add Cypress test: switch theme, navigate to dashboard, verify glow persists and contrast passes. |
| **Visual Regression** | “visual‑regression suite” listed. | No mention of **baseline snapshots for the retired palette** or **glow animation frames**. | Include snapshots for glow animation at key frames; guard against unintended color shifts. |
| **Accessibility (a11y)** | WCAG 4.5:1 mentioned as a constraint. | No explicit a11y test plan (axe, screen‑reader). | Integrate `axe-core` CI step and manual screen‑reader verification for glow elements. |

---

## 7️⃣  Rollback Plan  

| Phase | Feature‑Flag Scope | Independent Revertibility? | Rollback Mechanism |
|-------|--------------------|----------------------------|--------------------|
| **P‑1 (Theme‑Token Setup)** | Global CSS‑var provider (`ThemeProvider`) | Yes – toggling the provider swaps the entire token set. | Feature flag `useRetiredPalette`; revert to retired palette instantly. |
| **P‑2 (Marketing Reskin)** | `marketing-theme` flag | Yes – only marketing components read the flag. | Flip flag off → fallback to default (no theme) or previous theme. |
| **P‑3 (Dashboard Reskin)** | `dashboard-theme` flag | Yes – dashboards check the flag before applying chrome. | Flag off → dashboards revert to legacy chrome (no glow, default colors). |
| **P‑4 (Theme‑Toggle)** | `theme-toggle` flag | Yes – disables the toggle UI and forces a static theme. | Remove toggle component; all surfaces stay on the last approved theme. |
| **P‑5/6 (Testing & Feature‑Flag Management)** | Central `feature-flags.json` | Yes – all flags are read from a single source. | Update JSON to remove the phase key; CI pipeline automatically disables it. |

**Overall:** Each phase is **feature‑flag isolated**, allowing a **zero‑downtime rollback** by toggling a flag in the config service. No database migrations are required for rollback.

---

## 8️⃣  Database / Backend Risks  

| Claim in Plan | Reality Check (from constraints) | Verdict |
|---------------|----------------------------------|---------|
| “**No backend changes**” | The **Evidence Lens** must expose *one real‑proof number per screen*; the plan does not state that the number is already available. If the number is derived from logged workouts, a **new endpoint** (`/proof/:screenId`) may be required. | **Potential risk** – if the endpoint does not exist, the UI will render placeholder data, breaking the “real‑proof” promise. |
| “Charts come from real logged workouts (Victory only)” | Victory charts are already used; no new data source is mentioned. | **Low risk** – existing data pipeline is sufficient. |
| “Admin Signal Bar shows no counts by design” | This is a **UI constraint**, not a backend change. | **No risk**. |

**Mitigation:** Verify with the data‑team that the proof‑number API is already exposed; if not, add a **lightweight read‑only endpoint** behind a feature flag, ensuring it does not affect production traffic.

---

## 9️⃣  Phase Ordering – Is It Optimal?  

| Proposed Order | Rationale (from plan) | Suggested Alternative |
|----------------|-----------------------|-----------------------|
| **Track A → Track B → Track C** (marketing → dashboards → store/photography/video/waiver) | Marketing is the “revenue‑generation” front; dashboards are “coach‑speed critical”. | **Re‑order to: Track B (dashboards) → Track A (marketing) → Track C** |
| **Why?** | - Dashboard reskin is **core to the product loop** (log → progress → share). <br>- Any slowdown in trainer workflow directly impacts B2B revenue. <br>- Once dashboards are stable, marketing can be rolled out with confidence that the core loop won’t break. | - Deploy dashboards first (low‑risk, high‑value). <br>- Follow with marketing (higher visual risk but lower operational impact). <br>- Store/waiver can be staged later once the new visual language is proven. |

**Result:** Re‑ordering reduces the **critical‑path exposure** (the trainer loop) and delivers a **revenue‑positive feature** (dashboard stability) earlier, allowing quicker conversion‑rate measurement.

---

## 📊  Consolidated Risk Rating Matrix  

| Risk Category | Rating | Primary Mitigation |
|---------------|--------|--------------------|
| **Dependency Risks** | **CRITICAL** (Design‑Language Decision) | Fixed decision deadline; fallback palette behind flag. |
| **Technical Unknowns** | **HIGH** (Glow & CSS‑var fallback) | Prototype glow on target

---

*Part of SwanStudios 15-Brain Recursive Consensus System*

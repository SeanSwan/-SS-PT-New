# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 58.2s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/WORLD-SWITCHER-MARKETING-REDESIGN-PLAN-2026-07-17.md
> **Generated:** 7/17/2026, 12:24:21 PM

---

## 📋 Executive Summary  

| Item | Verdict / Answer |
|------|------------------|
| **Architecture Verdict** | **Adopt with Mods** – keep the *World = Setting* / *Chrome = Crystalline Swan* separation, but **hard‑code the default world to a true‑Crystalline palette** (fix the drift) and **expose the picker as an upgraded `UniversalThemeToggle`** (still a cycle button for compact fallback). |
| **Single biggest risk** | **Combinatorial visual‑regression explosion** (N worlds × pages × breakpoints). *Mitigation*: test a **representative world matrix** + **CSS‑token snapshot tests**; rely on the 300‑line file cap to keep each layer isolated. |
| **“Wow” moment** | The **first‑time visitor sees the Swan video hero instantly colour‑graded to the selected world** (e.g., glacial scrim under *Glacier Cathedral*), creating a *personalised cinematic splash* that feels “made for me”. |
| **Sequencing recommendation** | 1️⃣ Fix P0 build & retired‑purple cleanup (must land first). 2️⃣ Implement **WorldLayer** & **ChromeLayer** (core primitives). 3️⃣ Build **World Switcher UI** (picker + fallback cycle). 4️⃣ Roll out **per‑page rebuilds** in the order: *Contact → About → Home → Store/Gallery/Video/Library → Waiver* (each page is a self‑contained slice). |
| **Blind‑spot** | The plan assumes **“no backend changes”** but the **world‑selection persisted to a user profile** will eventually need a tiny API surface; treat it as a future‑phase flag, not a current blocker. |

---  

## 1️⃣ Risk Register (derived from the plan)

| # | Risk Category | Description (derived from plan) | Rating | Mitigation |
|---|---------------|--------------------------------|--------|------------|
| 1 | **Dependency Risks** | • **P0 build break** (`@zxing/browser` missing from lockfile) blocks *any* deployment. <br>• **Retired Galaxy‑Swan purple** is live in ~10 CSS files; must be removed before token changes. | **CRITICAL** | • Add the missing dependency to `package.json` and regenerate `package-lock.json` **before** any theme work. <br>• Create a dedicated cleanup PR that replaces all `rgba(120,81,169,…)` with the brand‑fallback token (`var(--token, #fallback)`). |
| 2 | **Technical Unknowns** | • **World‑layer CSS/SVG generation** uses CSS custom properties that must be injected at runtime; browser support for `env()`‑based particle layers on low‑end mobiles is untested. <br>• **`resolveMotionTier`** currently maps licence → capability; future licence changes could break the tier‑capping logic. | **HIGH** | • Prototype the particle/gradient layer on **Chrome 115**, **Safari 17**, and **Edge 120** with a feature‑detect polyfill. <br>• Add a unit test that asserts `resolveMotionTier` never exceeds the licence tier; guard future licence changes with a contract test. |
| 3 | **Scope Creep Indicators** | • **World‑preview thumbnails** (tiny live previews) may require extra assets and accessibility work. <br>• **Cross‑browser reduced‑motion handling** for the video poster‑first fallback could expand to many edge cases. | **MEDIUM** | • Scope the preview to **static SVG placeholders** (no network request). <br>• Write a reduced‑motion E2E test that verifies the poster appears and the video never autoplays audio. |
| 4 | **Effort Accuracy** | • **`WorldLayer.tsx`** and **`ChromeLayer.tsx`** are expected to be **≤ 300 lines** each, but the spec calls for **palette‑token injection, motion‑tier handling, and particle‑layer composition** – likely to exceed 300 lines. <br>• **World catalog → theme registry bridge** will need a mapping table for 10 worlds plus fallback logic. | **HIGH** | • Split each layer into **two files** (`WorldLayer.core.tsx` ≤ 150 lines, `WorldLayer.visual.tsx` ≤ 150 lines). <br>• Keep the registry as a **JSON constant** (≤ 30 lines) and load it via `import`. |
| 5 | **Testing Gaps** | • No explicit **visual‑regression strategy** for the combinatorial world‑matrix. <br>• **Unit tests** for `WorldLayer` hooks are mentioned but not detailed. <br>• **E2E** coverage for the picker UI and world‑layer overlay is absent. | **MEDIUM** | • Add a **Storybook suite** that renders each world on the four act breakpoints and runs **Chromatic** visual regression. <br>• Write **unit tests** for `useWorldContext` (token injection) and **integration tests** for `WorldSwitcher` with React Testing Library. |
| 6 | **Rollback Plan** | • Each phase (build fix, cleanup, WorldLayer, Switcher, per‑page rebuild) must be **feature‑flaggable**. <br>• The plan does not yet define a **feature‑flag schema** for the picker. | **MEDIUM** | • Introduce a **`flags.ts`** with flags: `FEATURE_WORLD_LAYER`, `FEATURE_SWITCHER_PICKER`, `FEATURE_WORLD_PREVIEW`. <br>• Wrap each new component in a conditional render behind its flag; flip via LaunchDarkly or a simple `process.env` toggle. |
| 7 | **Database / Backend Risks** | • The plan claims **“no backend changes”**, yet **persisting the selected world** to a user profile will eventually need a **new endpoint** (`/api/user/preferences`). <br>• No schema migration is described for storing a `selectedWorldId`. | **LOW** (but watch) | • Defer persistence to a **future phase**; initially store only in `localStorage`. <br>• When the need arises, add a **non‑breaking POST `/api/user/preferences`** that returns 200 OK for legacy clients. |
| 8 | **Phase Ordering** | • **Phase 1 (P0 build fix)** must be completed before any theme work. <br>• **Phase 2 (cleanup retired purple)** is a prerequisite for token changes. <br>• **Phase 3 (WorldLayer & ChromeLayer)** depends on the clean token environment. <br>• **Phase 4 (World Switcher UI)** can be built in parallel to Phase 3 but must wait for the layer primitives. | **MEDIUM** | • Create a **Kanban board** with explicit “Ready” columns for each dependency. <br>• Schedule a **daily stand‑up** focused on dependency blockers; if any slip, re‑prioritise the backlog immediately. |

---  

## 2️⃣ Architectural Review  

### 2.1 Dependency Risks  
- **P0 build break** is a *gate*; without a working CI, no theme work can be merged.  
- **Retired purple** must be removed **before** any token changes, otherwise the brand‑fallback contract (`var(--token, #fallback)`) will be violated.  

### 2.2 Technical Unknowns  
- **World‑layer visual generation** (particles, gradients) uses CSS features that may not be fully supported on older Android browsers.  
- **Motion‑tier resolution** (`resolveMotionTier`) currently caps at the licence tier; future licence upgrades could unintentionally raise the tier and break the “M0‑only” contract for checkout/waiver.  

### 2.3 Scope Creep  
- Adding **live preview thumbnails** and **keyboard‑operable grouping** expands the UI surface beyond the 44 px touch‑target guarantee.  
- The **world‑matrix** (10 worlds × 7 pages × 4 breakpoints) is a *testing nightmare*; the plan relies on a “representative matrix” which may miss edge cases.  

### 2.4 Effort Accuracy  
- The **WorldLayer** and **ChromeLayer** are each expected to stay under **300 lines**. Given the required token injection, motion‑tier handling, and particle layer, they will likely exceed this unless split.  
- The **theme registry** will need a **type‑safe mapping** (≈ 15 lines) but may grow if new worlds are added later.  

### 2.5 Testing Gaps  
- No concrete **visual‑regression plan** for the full world‑matrix.  
- **Unit tests** for the new hooks (`useWorldContext`, `useMotionTier`) are only mentioned, not scoped.  
- **E2E** coverage for the picker UI and world‑layer overlay is missing.  

### 2.6 Rollback Plan  
- Each phase must be **feature‑flaggable**. The plan does not yet define a flag system; we must introduce one now.  

### 2.7 Database / Backend Risks  
- The claim of “no backend changes” is **technically inaccurate** if user‑level world persistence is desired. For now, stick to `localStorage`; plan a future non‑breaking API.  

### 2.8 Phase Ordering  
- **Optimal order**:  
  1. **Fix P0 build** (mandatory).  
  2. **Cleanup retired purple** (ensures brand‑fallback compliance).  
  3. **Implement WorldLayer & ChromeLayer** (core primitives).  
  4. **Build World Switcher UI** (picker + fallback).  
  5. **Roll out per‑page rebuilds** (Contact → About → Home → Store/Gallery/Video/Library → Waiver).  

  This order delivers **value early** (build fix → clean token → visible world atmosphere) while keeping each slice **independently revertible**.  

---  

## 3️⃣ Mitigation Summary (by risk)

| Risk | Mitigation (concise) |
|------|----------------------|
| **P0 build break** | Add missing `@zxing/browser` to `package.json`, regenerate lockfile, run `npm ci` locally, CI gate before merge. |
| **Retired purple** | Search/replace all `rgba(120,81,169,…)` with `var(--token, #fallback)`; add a contract test that no raw hex appears in compiled CSS. |
| **World‑layer visual unknowns** | Prototype on target browsers; add feature‑detect polyfills; keep particle layer behind a feature flag. |
| **Motion‑tier cap** | Unit test `resolveMotionTier` against a mock licence map; guard future licence changes with a contract test. |
| **Scope creep (previews, cross‑browser)** | Limit preview to static SVG; enforce 44 px touch target; write reduced‑motion E2E test. |
| **File‑count overruns** | Split layers into core + visual; keep registry JSON small; enforce line‑count CI check. |
| **Testing gaps** | Add Storybook + Chromatic matrix; write unit & integration tests; add visual‑regression baseline for world matrix. |
| **Rollback** | Introduce `flags.ts`; wrap each new component behind a flag; use LaunchDarkly or env var for toggling. |
| **Backend persistence** | Defer to future phase; store only in `localStorage` now; design API contract for later addition. |
| **Phase ordering** | Maintain a dependency‑aware Kanban board; daily stand‑up to surface blockers; re‑prioritise immediately. |

---  

## 4️⃣ Open‑Question Answers (as requested)

1. **Architecture Verdict** – **Adopt with Mods** (see above).  
2. **Single biggest risk** – *Combinatorial visual‑regression*; mitigated by matrix testing + line‑count enforcement.  
3. **Wow moment** – The **first‑load world‑graded Swan video hero** that instantly reflects the user’s selected atmosphere (e.g., glacial scrim under *Glacier Cathedral*).  
4. **Sequencing recommendation** – Fix build → cleanup → WorldLayer/ChromeLayer → Switcher UI → per‑page rebuilds (Contact → About → Home → Store/Gallery/Video/Library → Waiver).  
5. **Blind‑spot** – The plan assumes **no backend changes**, yet user‑level world persistence will need a tiny API; treat it as a future‑phase flag, not a current blocker.  

---  

## 5️⃣ Recommendations & Action Items  

| Action | Owner | Due |
|--------|-------|-----|
| **Add missing `@zxing/browser` dependency** | Front‑end lead | Immediately (before any PR merge) |
| **Remove all retired‑purple hex values** | CSS maintainer | PR #123 (target merge by 2026‑07‑20) |
| **Create `flags.ts` and wrap new components** | Architecture team | Sprint 1 (by 2026‑07‑25) |
| **Prototype WorldLayer visual layer on all supported browsers** | UI engineer | Spike by 2026‑07‑28 |
| **Write unit tests for `useWorldContext` & `resolveMotionTier`** | QA lead | Sprint 2 (by 2026‑08‑05) |
| **Set up Storybook + Chromatic matrix for world‑layer** | Front‑end lead | Sprint 2 (by 2026‑08‑07) |
| **Define Kanban board with dependency columns** | Project manager | Today |
| **Plan for future persistence API (deferred)** | Backend lead | Document in backlog (target Q4 2026) |

---  

*All mitigations respect the constraints: **Palette Law A** (Chrome = Crystalline Swan tokens never hard‑coded), **calm zones** (checkout/waiver stay M0), **function preservation** (no breaking changes to existing APIs), and the **P0 build break** must be resolved before any theme work proceeds.*

---

*Part of SwanStudios 15-Brain Recursive Consensus System*

# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 43.1s
> **Files:** docs/ai-workflow/brainstorms/inception-morph-engine-plan-2026-07-08.md
> **Generated:** 7/8/2026, 12:48:04 AM

---

## Inception Canvas / Lens Foundry – File‑Organization Review  

Below is a **structured critique** of the (implied) file layout that would support the plan, followed by a **concrete proposal** that respects the 300‑line‑per‑file rule, keeps concerns separated, and avoids import‑graph pitfalls.

---  

### 1. Decomposition – Is the plan’s file breakdown right?  

| Area mentioned in the plan | Current implied files | Assessment | Suggested change |
|----------------------------|----------------------|------------|------------------|
| **Component Registry** | `src/components/registry/*.tsx` (Header, Hero, …) + inner anchors | Good granularity – each morph block maps 1‑to‑1 to a `data‑morph` anchor. Inner anchors (`title`, `card`, `stat`) are tiny (<30 LOC) and could be **inlined** into their parent block to avoid over‑fragmentation. | Merge `inner/` into the block files (e.g., `Hero.tsx` contains its own `Title`/`Card`/`Stat` as private sub‑components). |
| **AI Harness (protocol adapter)** | `src/engine/aiHarness.ts` | Single responsibility – fine. | Keep as‑is. |
| **Inception Router (morph/state engine)** | `src/engine/inceptionRouter.ts` | Central state machine; likely to grow beyond 300 LOC if effect‑tier logic lives here. | Split **router** (transition triggers) from **effect‑tier/audit** (see Trust Layer). |
| **Trust Layer (effect tiers T0‑T4)** | `src/engine/trustLayer.ts` | Contains approval gating, audit receipts – moderate size. | Keep separate; if it exceeds 300 LOC, extract `approvalGate.ts` and `auditLogger.ts`. |
| **Morph Grammar / Motion helpers** | `src/utils/morphGrammar.ts` + `src/utils/viewTransitionHelper.ts` | Small, pure‑functions – fine. | Keep. |
| **Lens snapshot/store** | `src/lenses/lensFactory.ts`, `src/lenses/lensStore.ts` | Factory (generation) vs persistence – clean split. | Keep. |
| **Marketplace helpers** | `src/marketplace/marketplaceApi.ts` + `src/marketplace/marketplaceTypes.ts` | Thin but logical; could be merged if < 150 LOC combined. | Merge into a single `marketplace.ts` (still < 300 LOC). |
| **Styling system** | `src/styles/tokens.ts`, `src/styles/globals.ts`, `src/styles/theme.ts`, `src/styles/utils.ts` | Tokens and theme are core; globals/utils are tiny. | Consider merging `utils.ts` into `tokens.ts` (helper for `var(--token, #fallback)`). |
| **Routing / App shell** | `src/App.tsx`, `src/main.tsx` | Standard – fine. | Keep. |
| **Types** | `src/types/*.ts` | Schema definitions – fine. | Keep. |

**Verdict:** The decomposition is largely sound; only the **inner anchor components** and possibly the **marketplace** split are over‑fragmented. Merging those will reduce file count without hurting clarity.

---  

### 2. Styles / Organization  

| File | Purpose | Size risk | Recommendation |
|------|---------|-----------|----------------|
| `tokens.ts` | Declares all CSS custom properties (`--bg-base`, `--accent-1…3`, `--font-display`, …) plus fallback helpers. | Low – mostly constants. | Keep. |
| `globals.ts` | Global reset, `@font-face`, body styles, dark‑first base. | Low. | Keep. |
| `theme.ts` | `ThemeContext` provider, 18‑theme switcher, consumes `tokens.ts`. | Medium – theme switcher logic can grow. | If > 200 LOC, split `themeContext.ts` (provider) + `themeSwitcher.tsx` (UI toggle). |
| `utils.ts` (styles) | Tiny helpers like `getToken(varName, fallback)`. | Very low. | **Merge into `tokens.ts`** – eliminates an unnecessary barrel. |

**Result:** A lean `styles/` folder with three files (`tokens.ts`, `globals.ts`, `theme.ts`) is sufficient. No need for a `styles/index.ts` barrel unless you want a named import (`import { tokens } from '@/styles'`), which is optional.

---  

### 3. Hooks – Separation of Concerns  

| Hook | Responsibility | Concern type | Comments |
|------|----------------|--------------|----------|
| `useIntent.ts` | Transcribes voice → intent enum, optionally calls STT service. | **Data‑fetch** (external STT) + light UI‑state (intent value). | Could be merged with API orchestration because both talk to the agent harness. |
| `useApiOrchestration.ts` | Calls MCP‑UI / AG‑UI adapters, normalises payloads. | **Data‑fetch** (agent → engine). | Keep separate from UI‑state; pure data layer. |
| `useStateDocument.ts` | Builds/updates the intermediate Lens JSON state document from intent + API results. | **Business‑logic** (state transformation). | Good isolation. |
| `useMorphEngine.ts` | Orchestrates Inception Router + Trust Layer (effect‑tier checks, audit). | **Business‑logic** (orchestration). | Slightly thick; consider splitting router vs trust‑layer calls. |
| `useRender.ts` | Takes state doc, queries Component Registry, returns array of `<Block />` elements. | **UI‑state** (derived UI) + **business‑logic** (registry lookup). | Could be split into `useRegistryLookup.ts` (pure) + `useRenderFromState.ts` (UI). |
| `useViewTransitions.ts` | Wraps Framer Motion + View Transitions API, returns motion props. | **UI‑state** (animation props). | Fine as‑is. |

**Suggested refactor:**  

1. **Data‑fetch layer** – `useAgent.ts` (combines STT + MCP‑UI/AG‑UI).  
2. **Business‑logic layer** – `useLensState.ts` (state document) + `useMorphOrchestrator.ts` (router + trust).  
3. **UI‑state layer** – `useRender.ts` (registry lookup) + `useViewTransitions.ts`.  

This yields a clean **data → logic → UI** flow and keeps each hook under ~150 LOC.

---  

### 4. 300‑Line Budget – Files at Risk & Proposed Splits  

| File (current) | Estimated LOC (based on responsibilities) | Risk? | Split proposal |
|----------------|--------------------------------------------|-------|----------------|
| `src/engine/inceptionRouter.ts` | ~260‑300 (state machine + effect‑tier hooks) | **Borderline** | Separate: <br>• `inceptionRouter.ts` – pure transition triggers (events → new state). <br>• `effectTier.ts` – T0‑T4 gating, audit receipts. |
| `src/engine/trustLayer.ts` | ~180‑220 (approval UI, audit logging) | Low‑medium | Keep; if > 250 LOC, extract `approvalGate.tsx` (UI) and `auditLogger.ts` (pure). |
| `src/components/layout/Canvas.tsx` | ~200‑260 (grid layout, resize observer, context providers) | Low‑medium | Keep; if > 260, move resize logic to `useResizeObserver.ts` hook. |
| `src/hooks/useRender.ts` | ~150‑210 (registry mapping, lazy‑load, fallback) | Low‑medium | Split: <br>• `useRegistryLookup.ts` (pure lookup). <br>• `useRenderFromState.ts` (JSX assembly). |
| `src/utils/morphGrammar.ts` | ~80‑120 (mapping zoom/flip/fold/crystallize to motion props) | Low | Keep. |
| `src/styles/theme.ts` | ~150‑210 (18‑theme switcher, ThemeContext) | Low‑medium | If > 200, split `themeContext.ts` + `themeSwitcher.tsx`. |
| `src/lenses/lensFactory.ts` | ~120‑180 (AI‑generated snapshot, deterministic JSON) | Low | Keep. |
| `src/marketplace/marketplaceApi.ts` | ~100‑150 (fetch/publish helpers) | Low | Keep (or merge with types). |

**Action:** Apply the splits above *only* if a file exceeds ~260 LOC after initial implementation; otherwise keep as‑is to avoid over‑fragmentation.

---  

### 5. Import Graph – Dependency Tree & Circular‑Risk Check  

```
src/App.tsx
   ├─ src/styles/theme.ts (ThemeProvider)
   ├─ src/layout/Canvas.tsx
   │    ├─ src/hooks/useRender.ts
   │    │    ├─ src/engine/componentRegistry.ts
   │    │    │    └─ src/types/lens.ts
   │    │    └─ src/hooks/useViewTransitions.ts
   │    │         ├─ src/utils/viewTransitionHelper.ts
   │    │         └─ src/utils/morphGrammar.ts
   │    └─ src/hooks/useMorphEngine.ts
   │         ├─ src/engine/inceptionRouter.ts
   │         │    ├─ src/engine/aiHarness.ts
   │         │    └─ src/engine/trustLayer.ts
   │         │         └─ src/types/engine.ts
   │         └─ src/hooks/useLensState.ts
   │              ├─ src/hooks/useAgent.ts
   │              │    └─ src/engine/aiHarness.ts
   │              └─ src/types/stateDocument.ts
   ├─ src/lenses/lensStore.ts
   │    └─ src/types/lens.ts
   └─ src/marketplace/marketplaceApi.ts
        └─ src/types/marketplace.ts
```

**Observations**

* **Directionality:** All imports flow

---

*Part of SwanStudios 15-Brain Recursive Consensus System*

# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 31.8s
> **Files:** AI-Village-Documentation/PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md
> **Generated:** 7/12/2026, 2:48:47 PM

---

# Risk Assessment & Feasibility Review  
**Project:** SwanStudios – “Enchanted Apex: Crystalline Swan” SaaS platform  
**Plan under review:** `AI-Village-Documentation/PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md`  

---  

## 1. Dependency Risks  

| Dependency | Blocking Relationship | Rating | What Happens If It Slips | Mitigation |
|------------|----------------------|--------|--------------------------|------------|
| **§3 Lens Finalization → §4 Lens Rollout** | Rollout cannot adopt the Golden‑Pair pattern until the *Lens Finish Pack* is completed and documented. | **CRITICAL** | The rollout stalls; P0 surfaces (workout logger, planner, etc.) lose the visual polish and theming consistency required for client‑facing surfaces. | • Treat the Lens Finish Pack as a **hard gate** – schedule a fixed delivery date and lock the repository before any rollout work begins. <br>• Build a thin “stub” implementation that satisfies the contract (e.g., placeholder recipe) so downstream work can proceed while the final pack is polished. |
| **§5 Swan Coach “Jarvis” → Backend Grant System** | Coach’s monetisation & access‑control rely on the existing *feature‑grant* infrastructure. | **HIGH** | If the grant system cannot be extended fast enough, the Coach subscription flow will be blocked, breaking the revenue‑first mandate. | • Prototype the grant extension in a sandbox branch early (research spike). <br>• Keep the change **backwards‑compatible** (add new grant types, don’t modify existing tables). |
| **§6 Agent‑Ready Platform → External Agent SDKs** | Agent Gateway must expose a stable API before any third‑party agent can be onboarded. | **MEDIUM** | Delays in spec finalisation push back wear‑able integrations and future AI‑agent revenue streams. | • Draft the **Swan Agent Gateway spec** in parallel with research (Section 6) and lock the contract (OpenAPI + MCP schema) before any implementation. |
| **§7 Swan World → 3‑D Engine Integration** | World depends on React‑Three‑Fiber and the existing device‑matrix; any breakage in the rendering pipeline blocks the long‑term vision. | **MEDIUM** | If R3F integration fails on mobile, the “E0‑E2” phases cannot be released, limiting early revenue hooks. | • Build a **minimal R3F sandbox** that mirrors the device‑matrix constraints; run it against the top‑20 phone list early. |
| **§7b Full‑Site Sweep → Completion of P0 Core** | The sweep is explicitly *not* built until the workout core is client‑usable. | **LOW** | No direct blocker, but if the core slips, the sweep timeline is forced to move later, potentially compressing the release window. | • Keep the sweep **documented only** (backlog, rank) until the core is marked “Done”. |

---  

## 2. Technical Unknowns  

| Unknown / Assumption | Potential Impact | Rating | Mitigation |
|----------------------|------------------|--------|------------|
| **Browser support for CSS custom‑property‑based theming at runtime** (especially older Safari/Edge) | Theme toggle may fall back to hard‑coded fallbacks, breaking the “brand fallback” rule. | **HIGH** | • Feature‑detect `CSS.supports('--foo', '#000')` and provide a JS fallback that injects a static stylesheet if needed. <br>• Keep a **static fallback theme** (e.g., `theme--fallback.css`) that can be swapped without JS. |
| **Victory chart rendering on low‑end devices** (44 px touch targets, 300‑line file limit) | Charts may become unusable on some phones, violating WCAG and mobile‑first goals. | **MEDIUM** | • Add a **lightweight fallback chart component** (e.g., simple bar SVG) for devices that can’t render Victory. <br>• Profile chart render time on the device‑matrix early. |
| **MCP / Agent Gateway authentication model** (OAuth2 scopes, token revocation) | If the spec does not align with existing Hermes bridge, agents may be rejected by the platform. | **HIGH** | • Conduct a **spike** on the top‑3 agent frameworks (LangChain‑Agent, Auto‑GPT, Llama‑Agents) to map their auth patterns to the existing T0‑T4 bridge. <br>• Draft an **OpenAPI contract** before coding. |
| **Stripe integration for per‑user token budgets & cost guardrails** | Incorrect billing could lead to unexpected charges or legal exposure. | **MEDIUM** | • Use the existing **feature‑grant** flow as a template; add a “cost‑budget” flag that can be toggled per user. <br>• Run a sandbox billing simulation before production launch. |
| **Fitbit / Google Fit OAuth consent flow** (scope creep, token refresh) | Data‑minimisation rule (Rule 62) may be violated if too many scopes are requested. | **MEDIUM** | • Limit initial integration to **steps** and **heart‑rate** only; expand later only after explicit consent UI. |
| **React‑Three‑Fiber performance on 30 + phones** (60 fps target) | Mobile‑first promise breaks; visual fidelity drops. | **MEDIUM** | • Implement **progressive degradation**: low‑poly assets + 2D fallback for < 60 fps devices. <br>• Use the device‑matrix budgets to cap polygon count per device class. |

---  

## 3. Scope‑Creep Indicators  

| Area | Why It Can Expand | Likely Over‑run | Mitigation |
|------|-------------------|----------------|------------|
| **Custom‑Chart Builder** | Conversational UI can evolve into a full‑featured chart designer (drag‑drop, infinite palettes). | **+30 %** on wireframe & implementation time. | • Freeze the **minimum viable flow**: “Ask → Propose → Save → Pin”. <br>• Treat any extra UI as a **future P2** item. |
| **Swan World (E‑phases)** | “Anti‑gripe” research may uncover new feature requests (e.g., mod‑support, multi‑room). | **+50 %** on world‑building effort. | • Keep **E0‑E2** as the *shippable* slice; defer E3‑E5 to later phases. <br>• Document “future‑gripe” list but **do not commit** to implementation now. |
| **Full‑Site Sweep ( §7b )** | “Every remaining surface” can be interpreted broadly; polishing may become endless. | **+20 %** on backlog items. | • Use the **ranked backlog** (value × effort) and lock the top‑N items for the current sprint; defer the rest. |
| **Theme‑Toggle Implementation** | Adding “18 swappable themes” may tempt the team to create a full theme‑engine rather than the required CSS‑custom‑property approach. | **+15 %** on CSS work. | • Stick to the **brand‑fallback + var(--token)** contract; any extra theme must be a **pre‑built CSS file** that respects the 300‑line limit. |
| **Agent‑Gateway Spec** | The spec may be expanded to cover “future AI‑features” (e.g., voice‑only commands). | **+25 %** on documentation. | • Define a **strict “must‑have”** list (T0 reads, T1 proposals, auth, rate‑limit). Anything else goes to a later **research** bucket. |

---  

## 4. Effort Accuracy (File / Line Count)  

| Pack / Deliverable | Estimated Files | Estimated Lines (per file) | Files Likely > 300 lines | Comments |
|--------------------|----------------|----------------------------|--------------------------|----------|
| **§3 Lens Finish Pack** | 6 (flow diagram, wireframes, component blueprint, recipe pipeline, docs, test plan) | 120‑250 | **Blueprint** (component map + contracts) – may hit 350 lines if exhaustive. | Keep the blueprint concise; split into `blueprint.md` + `blueprint.contracts.md`. |
| **§4 Lens Rollout Pack** | 5 (manifest spec, naming‑registry, audit script, receipt template, docs) | 150‑200 | Unlikely to exceed 300. | |
| **§5 Swan Coach “Jarvis” Pack** | 7 (coach UI spec, custom‑chart schema, dashboard‑pin spec, monetisation flow, receipts, auth flow, integration guide) | 180‑260 | **Dashboard‑pin spec** could breach 300 if detailed. | Split into `pin-card.md` + `pin-card.contracts.md`. |
| **§6 Agent‑Ready Platform Pack** | 8 (research brief, gateway spec, auth contract, rate‑limit table, wearables plan, docs, sample MCP server, audit trail schema) | 200‑320 | **Gateway spec** and **wearables plan** may exceed 300 lines. | Use separate markdown files per sub‑topic; keep each < 300 lines. |
| **§7 Swan World Master Plan** | 9 (foundation audit, E0‑E5 phases, mermaid diagrams, wireframes, asset budget, revenue milestones, architecture diagram) | 250‑350 | **Master‑plan** and **E2‑E3 wireframes** are prime candidates for > 300 lines. | Break into `foundation-audit.md`, `e0-foundation.md`, `e1-web-fluid.md`, etc. |
| **§7b Full‑Site Sweep Pack** | 6 (route inventory, sweep cards, rank‑backlog, logic/ease‑use/polish checklists, tap‑count receipts) | 150‑210 | Unlikely to exceed 300. | |

**Overall Verdict:** The **Lens Finish Pack** and **Swan World Master Plan** are the most likely to breach the 300‑line limit. Mitigate by splitting large markdown files into logical sub‑files and using front‑matter sections.

---  

## 5. Testing Gaps  

| Test Type | Current Coverage in Plan | Missing / Under‑Specified | Recommended Action |
|-----------|--------------------------|---------------------------|--------------------|
| **Unit (hooks / logic)** | Mentioned in “receipts culture” and “computed‑signature”. | No explicit list of which hooks (e.g., `useThemeToggle`, `useCustomChart`) need unit tests. | • Create a **unit‑test matrix** per pack (e.g., `themeToggle.test.ts`, `chartBuilder.test.ts`). <br>• Enforce 80 % coverage via CI. |
| **Integration** | “Receipts” imply end‑to‑end data flow verification. | No description of integration test scenarios (e.g., theme toggle across devices, grant‑grant flow). | • Draft **integration test suites** using React Testing Library + Jest for each surface (logger, planner, coach). |
| **E2E** | Not mentioned. | Entirely absent. | • Add **Cypress** (or Playwright) specs for critical flows: <br>1. Theme toggle on all device‑matrix breakpoints. <br>2. Workout‑logger → planner → schedule navigation. <br>3. Coach subscription purchase & access grant. |
| **Visual Regression** | “Screenshots at P1/1440” referenced. | No tooling or baseline repository defined. | • Adopt **Storybook + Chromatic** or **Percy** for visual regression; lock baselines per theme version. |
| **Accessibility (WCAG 4.5:1)** | Mentioned in style guide. | No concrete test plan (axe, Lighthouse). | • Integrate **axe‑core** CI checks for every PR; enforce 4.5:1 contrast on all components. |
| **Performance (44 px touch targets, 300‑line file limit)** | Mentioned as rule. | No automated lint rule for file size/line count. | • Add **ESLint rule** (`max-lines-per-file: 300`) and **CSS‑touch‑target** validator in CI. |

---  

## 6. Rollback Plan  

| Phase | Feature‑Flag Strategy | Independent Revertability | Production Impact if Failed |
|-------|----------------------|---------------------------|-----------------------------|
| **§3 Lens Finish** | Flag `lens.finish.v2` (default = off). | Yes – toggle off reverts to legacy v1 lenses. | Users see old theme; no functional breakage. |
| **§4 Lens Rollout** | Flag `rollout.enable` per surface (e.g., `logger.rollout`). | Yes – each surface can be turned off individually. | Only the affected surface reverts; core workout flow stays intact. |
| **§5 Swan Coach “Jarvis”** | Flag `coach.enabled` (default = off). | Yes – can be disabled without touching other services. | Paid Coach features disappear; free tier unchanged. |
| **§6 Agent‑Ready Platform** | Flag `agent.gateway.enabled`. | Yes – gateway can be disabled while keeping existing T0‑T4 bridge. | No new agents can connect; existing agents continue to work. |
| **§7 Swan World** | Flag `world.enabled` (off by default). | Yes – world assets can be unmounted. | No impact on core SaaS; only long‑term vision delayed. |
| **§7b Full‑Site Sweep** | Flag `sweep.enabled` (off until core is client‑usable). | Yes – sweep components are isolated modules. | No immediate impact; only polish work delayed. |

**General Rollback Mechanism:**  
- All flags are stored in a **central `featureFlags.ts`** (typed, persisted in config).  
- Flags are **read‑only at runtime**; toggling requires a **hot‑reload** of the front‑end (no server restart).  
- Each flag has a **fallback state** that restores the previous UI/endpoint, ensuring graceful degradation.

---  

## 7. Database / Backend Risks  

| Claim in Plan | Reality Check | Risk Rating | Mitigation |
|---------------|---------------|------------|------------|
| “No backend changes” (for P0 core) | The workout logger, planner, client‑management, and custom‑chart endpoints will need **new tables** (e.g., `workout_logs`, `plan_library`, `custom_chart_entities`) and **new API routes**. | **HIGH** | • Treat the “no changes” claim as **marketing language**; schedule a **schema‑migration spike** early. <br>• Use **Sequelize migrations** with versioned files; keep them reversible. |
| “Reuse existing feature‑grant system” | Grants must now support **cost‑budget** and **subscription** tiers. | **MEDIUM** | • Extend the grant model with a `grant_type` enum and a `budget_limit` column; keep backward compatibility. |
| “Stripe integration for $9.99/mo” | Requires **new billing cycles**, **webhook handling**, and **entitlement checks**. | **MEDIATE** | • Build a **sandbox Stripe test** early; abstract the billing layer behind a `billing.service.ts` that can be swapped. |
| “Fitbit OAuth consent” | New OAuth client IDs, scopes, and token refresh logic. | **MEDIUM** | • Implement a **generic OAuth wrapper** that can be reused for other providers; keep scopes configurable. |
| “Data‑scoping to user‑only for custom charts” | Must enforce **row‑level security** in Sequelize queries. | **MEDIUM** | • Add a **global query filter** (e.g., `where: { userId: currentUser.id }`) in the chart repository. |

---  

## 8. Phase Ordering – Is It Optimal?  

| Current Order (as per §9 RUN ORDER

---

*Part of SwanStudios 15-Brain Recursive Consensus System*

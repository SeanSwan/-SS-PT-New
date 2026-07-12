# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 51.7s
> **Files:** AI-Village-Documentation/PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md
> **Generated:** 7/12/2026, 2:48:47 PM

---

We are given a plan document (the Super Prompt) and we are to review the file organization as implied by the plan.
 However, note that the plan document does not explicitly list the file structure. We must infer the necessary files and folders from the described features and constraints.

 Steps:
 1- We are to output a structured markdown with a proposed file tree and line budget.

Constraints from the plan and the initial instructions:
- The project is SwanStudios: a personal training SaaS (React + TypeScript + styled-components frontend; Node.js + Express + Sequelize + PostgreSQL backend).
- Theme: "Enchanted Apex: Crystalline Swan" — dark-first, 18 swappable themes via a theme toggle, so EVERY color must be a CSS custom property with a brand fallback (var(--token, #fallback)) — never hardcode hex except as the fallback.
- Palette: [list of colors provided]
- Dual-Button Glow: blue bg -> purple glow, purple bg -> cyan glow.
- RETIRED Galaxy-Swan theme — never use.
- Stack rules: styled-components only (NO Material-UI); Victory charts only; 44px min touch targets; max 300 lines/file; WCAG 4.5:1.
- Production: sswanstudios.com.

We are reviewing the plan document (the Super Prompt) and must derive every feature-specific detail from the plan content.

The plan document is divided into sections. We are particularly interested in the workstreams (A-F) and the global build standards.

However, note that the plan does not explicitly state the file structure. We must infer:

1. What files/folders/hooks are proposed by the plan? (We have to deduce from the features described)
2. Then we review that proposed organization.

But note: the plan does not give a file tree. Therefore, we must create a proposed file tree based on the features and the constraints (like 300 lines/file, separation of concerns, etc.) and then critique it.

However, the instruction says: "Review this plan's file organization. Derive the actual proposed files/folders/hooks from the plan"

Since the plan does not explicitly list files, we must interpret the plan's implications for file organization.

Let's break down the plan by workstream and global standards to infer necessary components.

Global Build Standards (§8) (§8) imply:
- We must use styled-components, Victory charts, device-matrix, contrast supreme, 44px touch targets, voice-first, etc.
- We must have a design system with tokens (CSS custom properties) for the 18 themes.

We are also told that the theme system must use CSS custom properties with fallbacks.

Approach:

We will infer the necessary frontend structure from the features described in the plan, especially the P0 items (which are the immediate priority) and the global standards.

We note that the plan mentions:
- Smart Lens (v1 and v2) is already live and we are to perfect it (Workstream A) and roll it out (Workstream B).
- Workout core (logger, planner, schedule, client progress, client management) is P0.
- Swan Coach (Jarvis) is P0-critical and lives on the home page.
- Agent Gateway and Wearables (Workstream D) are non-primary for now (but we are to produce a plan pack for them).
- Swan World (Workstream E) and Full-Site Sweep (Workstream F) are also non-primary for now.

However, for the purpose of this review, we are to focus on the file organization as implied by the plan for the entire project, but we must remember that the immediate build is the workout core and the lens rollout.

We are to output:
- A proposed file tree (for the frontend, since the backend is less detailed in the plan) with line budget estimates.
- And then answer the 6 specific questions.

But note: the plan does not give a file tree, so we are creating one based on best practices and the features described.

Let's propose a frontend file structure that adheres to the constraints and the features:

We'll assume a standard React/TipoScript project structure, but we must adjust for:
- Themed design system (using styled-components and CSS custom properties)
- Device matrix
- Lens system (with v1 and v2)
- Workout core features
- Swan Coach
- etc.

We are also constrained by 300 lines per file.

We'll break down by feature areas:

1. **Design System and Theme**
   - We need a theme provider that sets up the CSS custom properties for the 18 themes.
   - We need a way to switch themes (theme toggle).
   - We need to define the tokens (colors, spacing, etc.) as CSS custom properties with fallbacks.

   Given the constraint of 300 lines/file, we might split:
   - `src/styles/theme.ts`: Defines the theme tokens (as a JavaScript object for styled-components) and also generates the CSS custom properties string? 
     But note: we must use CSS custom properties in the styles. So we might have:
     - A file that defines the token names and their fallbacks (for the 18 themes) and then a theme provider that injects the current theme's values as inline styles on a root element? 
     However, the plan says: "EVERY color must be a CSS custom property with a brand fallback (var(--token, #fallback))"

   Alternatively, we can have:
   - A global styles file that sets the :root variables for the default theme and then overrides for each theme via a class on the body or a provider.

   But note: we have 18 swappable themes. We cannot have 18 separate global style blocks without causing a lot of CSS.

   Better approach: use a theme provider that sets the CSS custom properties on a root element (like :root or a specific container) via inline styles. Then we can switch themes by changing the inline styles.

   We can have:
   - `src/styles/themeTokens.ts`: Defines the 18 themes as objects mapping token names to hex values (with the fallbacks being the hex values, but note: we are to use the fallback only when the variable is not set? Actually, the plan says: var(--token, #fallback). So the fallback is the hex value we provide.

   However, we are to never hardcode hex except as the fallback. So in our styled-components, we will use:
      color: var(--token-name, #fallbackHex);

   And we will set the --token-name via inline styles on a root element for the current theme.

   We can have a theme context that provides the current theme name and a setter, and then a global style component that sets the CSS custom properties on :root based on the current theme.

   Proposed files:
   - `src/styles/theme.ts`: 
        - Defines the token names and the 18 themes (as an object: themeName => { token1: hex, token2: hex, ... })
        - Exports a function to get the CSS custom properties string for a given theme.
        - This file might be around 50-100 lines.

   - `src/styles/ThemeProvider.tsx`: 
        - A React component that uses context to provide the current theme and a setter.
        - It also renders a GlobalStyle (from styled-components) that sets the CSS custom properties on :root.
        - This file might be around 50-100 lines.

   - `src/styles/global.ts`: 
        - Global styles (like reset, body styles) that use the CSS custom properties.
        - This file might be around 50 lines.

   - `src/styles/themeToggle.tsx`: 
        - A component for the theme toggle button.
        - This file might be around 50 lines.

   However, note: we are to avoid hardcoding hex. The theme tokens file will have the hex values as fallbacks, but that is allowed.

2. **Device Matrix**
   - The plan mentions: `frontend/src/styles/device-matrix/` with top-20 phones, P1-P12 buckets, media builders, safe-area, lens-aware SwanGrid.
   - We are to use this for everything.

   Proposed:
   - `src/styles/device-matrix/index.ts`: Barrel export for the device matrix.
   - `src/styles/device-matrix/breakpoints.ts`: Defines the breakpoints for the top-20 phones and P1-P12 buckets.
   - `src/styles/device-matrix/mediaBuilders.ts`: Functions to generate media queries.
   - `src/styles/device-matrix/safeArea.ts`: Handles safe area insets.
   - `src/styles/device-matrix/SwanGrid.tsx`: A grid component that is lens-aware and uses the device matrix.

   Each of these should be under 300 lines.

3. **Lens System (Smart Lens)**
   - The plan says Smart Lens v1 and v2 are already live, but we are to perfect it (Workstream A) and roll it out (Workstream B).
   - We have:
        - LensPlanFrame (the ONLY recipe→DOM boundary)
        - lensRepresentationStyles
        - stable lens2-* hooks
        - Compare Engine toggle (v1|v2)

   We are also to build an ADD-A-STYLE PIPELINE (for Workstream A) but that is for the finish-agent and not part of the main app? Actually, the plan says: "Deliverable for the finish-agent (produce FIRST in next chat): a single diagram-pack doc ...". So the pipeline is documented but not necessarily code we are to write now? However, we are to make it portable.

   For the main app, we need to use the lens system.

   Proposed files for the lens system in the app:
   - `src/lens/`: 
        - `lensContext.tsx`: Provides the current lens recipe and state.
        - `lensPlanFrame.tsx`: The component that is the boundary between recipe and DOM (as per plan).
        - `lensPrimitives.tsx`: The primitive components that are used by the lens (like Box, Text, etc.) but built with styled-components and using the lens tokens.
        - `lensHooks/`: 
             - `useLensRecipe.ts`: Hook to get the current recipe.
             - `useLensComparison.ts`: Hook for the compare engine toggle.
             - ... etc.
        - `lensRecipes/`: 
             - This would be where the recipe files live (but note: the plan says the recipes are in `core/style-lens-os/v2/` for v2, and there are adapters). However, for the app, we might have:
             - `src/lens/recipes/v1/`: For v1 recipes (25 of them) - but note: we are not to build new v1 lenses? The plan says we are to perfect v1 and v2 and make v2 default.
             - `src/lens/recipes/v2/`: For v2 recipes.

        However, note: the plan says the lens system is already live. So we are not to change the structure drastically? We are to perfect it.

   But we are reviewing the plan's implied file organization. The plan does not specify the exact file structure for the lens, so we have to infer a reasonable one.

   Given the 300-line limit, we must break down the lens components.

   However, note: the plan says that the LensPlanFrame is the ONLY recipe→DOM boundary. So we should have one file for that? But it might be complex.

   Let's assume:
   - `src/lens/LensPlanFrame.tsx`: This file might be complex because it has to handle both v1 and v2 recipes and produce the DOM. We must be cautious of line count.

   We are also to have a Compare component that toggles between v1 and v2.

   Proposed:
   - `src/lens/LensComparator.tsx`: Handles the toggle and shows two views.

   We are also to have the Lab (for testing lenses) but that is a separate tool? The plan says the Lab works but needs perfection. However, the Lab is mentioned as being live. We are to fix the Lab in Workstream A.

   So we might have:
   - `src/lens/lab/`: 
        - `LabContainer.tsx`
        - `StyleDetailCard.tsx` (to fix the dead space and glyph collision)
        - `Catalog.tsx` (to fix the chip grouping, search, and pinning)
        - `CompareView.tsx` (to fix the identical panes and make v2 default)
        - `ApplyOutcome.tsx` (to fix the strip and add morph beat and confirmation chip)
        - `SafetyCopy.tsx` (to deduplicate the safety copy)

   But note: the plan says the Lab is not to be feature-built, only perfected. So we are to fix existing files.

   However, for the purpose of this review, we are to propose a file structure that would support the lens system as described.

   Given the complexity, we might have to split the lens lab into multiple files, each under 300 lines.

4. **Workout Core (P0)**
   - The plan lists:
        1. Workout Logger (client + trainer log-workout paths)
        2. SwanStudios Workout Planner (+ admin "Plan Library" — SAME surface)
        3. Exercise/Workout Rolodex
        4. Universal Master Schedule ("My Schedule")
        5. Clients & Team (client management)
        6. Client progress section (charts — via Chart Charter §5, Victory theme bridge; Vitals row assembly rides this)
        7. Bootcamp Creator

   And P0 side-quests for #2: Naming Streamline and Build-Plans Audit.

   We are to convert these to use the lens system (Golden Pair pattern: capability manifest per surface + LensPlanFrame/LensPrimitives).

   So each of these surfaces will have:
        - A capability manifest (which might be a JSON file or a TypeScript file that describes the lens capabilities for that surface)
        - Then the surface itself, built using LensPrimitives and the lens tokens.

   We are also to have a naming streamline: one canonical-names table.

   Proposed structure for workout core:

   - `src/features/workout/`: 
        - `logger/`: 
             - `LoggerContainer.tsx`
             - `LoggerForm.tsx` (for logging a workout)
             - `WorkoutHistory.tsx`
             - ... etc.
        - `planner/`: 
             - `PlannerContainer.tsx` (which serves both client and admin for Plan Library)
             - `PlanBuilder.tsx`
             - `PlanLibrary.tsx`
             - ... and we must fix the naming: so we might have a `naming.ts` file that exports the canonical names.
        - `rolodex/`: 
             - `RolodexContainer.tsx`
             - `ExerciseCard.tsx`
             - ... etc.
        - `schedule/`: 
             - `ScheduleContainer.tsx`
             - `DayStrip.tsx` (as mentioned in the plan: Schedule Day Strip)
             - ... etc.
        - `clientManagement/`: 
             - `ClientManagementContainer.tsx`
             - `ClientList.tsx`
             - `ClientProfile.tsx`
             - ... etc.
        - `progress/`: 
             - `ProgressContainer.tsx`
             - `VitalsRow.tsx` (assembles the vitals)
             - `ChartsContainer.tsx` (using Victory charts and the lens-aware chart theme)
             - ... etc.
        - `bootcampCreator/`: 
             - `BootcampCreatorContainer.tsx`
             - ... etc.

   Each of these containers and components should be under 300 lines.

   We also need to have the capability manifests. Where to put them?
        - Perhaps in `src/features/[feature]/lensManifest.ts`? 
        - Or in a central `src/lens/manifests/` directory?

   The plan says: "capability manifest per surface". So one per surface.

   We'll put them in the feature directory: `src/features/workout/logger/lensManifest.ts`, etc.

5. **Swan Coach "Jarvis" (Workstream C)**
   - Lives on the home page (client + trainer home top section).
   - Persistent chat with full conversation history, resumable threads, voice-first (dictate by default, type second), TTS replies.
   - Charts-in-chat: SafeChart inside chat bubbles, image-export fallback.
   - Custom chart builder: clients create custom charts conversationally -> Coach proposes -> client saves -> pinned to dashboard as a first-class card.

   Proposed:
   - `src/features/coach/`: 
        - `CoachContainer.tsx`: The main coach component that lives on the home page.
        - `chat/`: 
             - `ChatWindow.tsx`
             - `MessageBubble.tsx` (which can render text, charts, etc.)
             - `ChatInput.tsx` (with voice input by default)
             - `ChatHistory.tsx`
        - `customChartBuilder/`: 
             - `CustomChartBuilderDialog.tsx` (opened from the chat)
             - `CustomChartSpec.ts`: Schema for the custom chart.
             - `CustomChartCard.tsx`: The card that gets pinned to the dashboard.
        - `chartInChat/`: 
             - `SafeChart.tsx`: A Victory chart wrapper that is safe for chat bubbles (with image export fallback).
        - `voice/`: 
             - `useVoiceInput.ts`: Hook for voice input.
             - `useTTS.ts`: Hook for text-to-speech.

   We also need to integrate with the existing Aurora Bridge (which already has presence states).

6. **Agent Gateway and Wearables (Workstream D)**
   - This is non-primary for now, but we are to produce a plan pack. However, for the file structure, we might want to have a place for it.
   - We are to build an authenticated agent surface (MCP-style server + REST) but note: this is backend? The plan says: "Swan Agent Gateway spec" — an authenticated agent surface.

   However, the plan is mostly about the frontend. The backend is Node.js + Express + Sequelize.

   We are to focus on the frontend for the file tree? The plan does not specify backend file structure.

   Since the initial instructions say: "Default project = SwanStudios: a personal training SaaS (React + TypeScript + styled-components frontend; Node.js + Express + Sequelize + PostgreSQL backend)", and we are reviewing the plan which is mostly about the frontend (with some backend mentions like Agent Gateway), we will focus on the frontend.

   For the Agent Gateway, we might have:
   - `src/features/agentGateway/`: 
        - `AgentGatewayContainer.tsx`: For managing agent connections and API keys.
        - `agentApi.ts`: Wrapper for the agent gateway endpoints.

   But note: the plan says this is non-primary and

---

*Part of SwanStudios 15-Brain Recursive Consensus System*

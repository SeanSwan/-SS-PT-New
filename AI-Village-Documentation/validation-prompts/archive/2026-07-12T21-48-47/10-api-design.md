# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 32.3s
> **Files:** AI-Village-Documentation/PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md
> **Generated:** 7/12/2026, 2:48:47 PM

---

We are given a plan document and we must review the API surface based on the plan.
 The plan document is provided in the prompt. We are to derive every feature-specific detail from the plan.

 Steps:
 1. We are to review the plan's API surface and derive the actual endpoints (existing + new) from the plan.
 2. We must answer 8 specific questions (1-8) for each surface.

 However, note that the plan document does not explicitly list API endpoints. We must infer from the plan what features are being discussed and what API they would require.

 Let's break down the plan by workstreams and see what features are mentioned that would require API changes.

 Important: The plan states that we are to derive from the plan content provided and not assume any particular feature.

 We are to focus on the plan document provided, which is the "VILLAGE PLAN-REVIEW INPUT — Jarvis Swan OS Super Prompt (v1.0 + Sean's 2026-07-12 amendment)".

 We note that the plan is divided into sections. We are particularly interested in sections that describe features that would require backend changes.

 Let's go through the plan and note any feature that implies an API endpoint:

 Section §3: Workstream A — Lens Finalization
   - This is about the Smart Lens system. It mentions:
        * ADD-A-STYLE PIPELINE: the "new style in minutes" recipe: 1 recipe file + 1 visuals entry + 1 CSS block (v1) or 0 CSS (v2) + auto-gates.
        * PORTABILITY FINAL DOCS: extraction contract per ultra-prompt Track-2 P7.

   However, note that the lens system is primarily frontend (styled-components, CSS custom properties). The plan does not mention any backend changes for the lens system itself.

 Section §4: Workstream B — Lens Rolloout Across Swan
   - This is about converting existing surfaces to use the lens system. It lists P0 surfaces (the money core) that need to be converted.

   The P0 surfaces are:
      1. Workout Logger (client + trainer log-workout paths)
      2. SwanStudios Workout Planner (+ admin "Plan Library" — SAME surface)
      3. Exercise/Workout Rolodex
      4. Universal Master Schedule ("My Schedule")
      5. Clients & Team (client management)
      6. Client progress section (charts — via Chart Charter §5, Victory theme bridge; Vitals row assembly rides this)
      7. Bootcamp Creator

   And P0 side-quests bundled with #2:
      - NAMING STREAMLINE (mandatory): admin dashboard is the leading naming method; produce ONE canonical-names table ...
      - BUILD-PLANS AUDIT: the "Build Plans" section appears to schedule rather than build ...

   This workstream is about frontend conversion (using the lens system) and does not explicitly mention new API endpoints. However, note that some of these surfaces might require API changes if they are being modified in functionality.

   But the plan says: "Adopt the Golden Pair pattern (capability manifest per surface + LensPlanFrame/LensPrimitives, NEVER component forks) across the app."

   This suggests that the backend might not need to change for the lens rollout, because the lens system is a frontend theming system.

 Section §5: Workstream C — Swan Coach "Jarvis" Program (P0-critical)
   - This is critical and requires backend changes.

   Features mentioned:
      * Coach lives ON the home page — persistent chat with full conversation history, resumable threads, voice-first (dictate by default, type second), TTS replies.
      * Charts-in-chat + CUSTOM CHART BUILDER:
          - Coach can render live charts inline in the transcript (SafeChart inside chat bubbles; image-export fallback for share).
          - Clients CREATE custom charts conversationally ("chart my squat volume vs sleep") → Coach proposes → client saves → pinned to their dashboard as a first-class card.

      * Monetization + cost guardrails:
          - Different tiers: Admin/trainers (ON, house-paid), SwanStudios clients (upgrade option $9.99/mo), public tier (paid tier only), Move Fitness clients (OFF, with admin toggle for paid/free).
          - Cost guardrails: per-user monthly token budgets, model tiering, response cache, admin cost dashboard.

   This implies several API endpoints:

      1. Chat endpoints: to send and receive messages (with voice input, TTS output).
      2. Custom chart builder: to create, save, and retrieve custom charts (and pin them to dashboard).
      3. Feature access: to check if a user has access to Swan Coach (based on tier and payment).
      4. Cost tracking: to track token usage per user and enforce budgets.
      5. Admin cost dashboard: to view cost metrics per user.

 Section §6: Workstream D — Agent-Ready Platform (Hermes first, everyone eventually)
   - Deliverable: Swan Agent Gateway spec — an authenticated agent surface (MCP-style server + REST) exposing:
        T0 reads (my workouts, my charts, my schedule)
        T1 draft proposals (log-workout draft, plan suggestions)

   This implies new API endpoints for the agent gateway.

   Specifically:
      - T0 reads: endpoints to get workouts, charts, schedule (read-only).
      - T1 draft proposals: endpoints to create draft workouts and plan suggestions (which are then reviewed by the user/trainer before committing).

   Also mentioned: Wearables integration (Fitbit first, then Apple Health/Google Fit as aggregators) — this would require endpoints for OAuth consent, data import, etc.

 Section §7: Workstream E — Swan World (the Sims heir)
   - This is a separate AAA-grade plan and is not to be built now (non-primary workstream). However, note that the plan says: "Deliverable: `docs/ai-workflow/brainstorms/swan-world-master-plan-<date>.md`"

   Since it's non-primary, we don't build it now, but we note that it might require API endpoints in the future. However, for the current review (which is about making the LIVE site work 100% for paying clients), we focus on the primary mission.

 Section §7b: Workstream F — Full-Site Fable Sweep
   - This is about polishing the rest of the site (storefront, checkout, etc.) but is to be built AFTER the workout core is client-usable.

   It does not specify new API endpoints, but rather frontend and UX improvements.

 Now, we must answer the 8 questions for each surface (feature) that we identified as requiring API changes.

 We have identified:

   A. Swan Coach (Workstream C) -> requires:
        - Chat API
        - Custom Chart Builder API
        - Feature access (for Coach) API
        - Cost tracking API
        - Admin cost dashboard API

   B. Agent Gateway (Workstream D) -> requires:
        - T0 reads endpoints (workouts, charts, schedule)
        - T1 draft proposals endpoints (log-workout draft, plan suggestions)
        - Wearables integration endpoints (consent, data import, etc.)

 However, note that the plan says for Workstream D: "Hermes connects day one; strangers' agents = later, same contract."

 We must also consider if any of the existing endpoints are sufficient.

 Let's go through each:

 1. Existing API sufficiency — For each surface, does an existing endpoint already return enough data, or is a new endpoint required?

    For Swan Coach:
        - Chat: The plan does not mention an existing chat system. So we likely need new endpoints for chat.
        - Custom Chart Builder: The plan mentions that custom charts are built conversationally and then saved. We assume there is no existing endpoint for saving custom charts (as a first-class card on dashboard). However, note that the plan says: "pinned to their dashboard as a first-class card". We might need to extend the dashboard widget system.
        - Feature access: The plan says: "Reuse the existing feature-access grant system + Stripe". So we might not need a new endpoint for feature access, but we might need to extend the existing grant system to include Swan Coach.
        - Cost tracking: The plan mentions "per-user monthly token budgets", "response cache", and "admin cost dashboard". These are new, so we need new endpoints for tracking token usage and for the admin dashboard.
        - Admin cost dashboard: New endpoint.

    For Agent Gateway:
        - T0 reads: The plan says "T0 reads (my workouts, my charts, my schedule)". We assume that there are existing endpoints for getting workouts, charts, and schedule (since these are core features). However, note that the agent gateway might require a different shape or additional data? The plan says: "ALL writes stay review-gated per the existing Hermes↔Swan bridge doctrine". So for reads, we might be able to use existing endpoints, but we might need to create a new agent-specific endpoint that aggregates or filters data appropriately? Or we might expose the existing endpoints under an agent gateway with authentication via agent API keys.
        - T1 draft proposals: The plan says "T1 draft proposals (log-workout draft, plan suggestions)". We assume that there are no existing endpoints for draft proposals (since they are drafts and not committed). So we need new endpoints for creating draft workouts and plan suggestions.
        - Wearables: The plan mentions integrating Fitbit, Apple Health, Google Fit. We assume there are no existing endpoints for wearables consent and data import, so we need new endpoints.

 2. Search / query needs — Where the plan filters client-side, is that adequate at scale, or is server-side search/pagination needed (and when)?

    We need to look for any client-side filtering mentioned in the plan.

    In Swan Coach:
        - The custom chart builder: when creating a custom chart conversationally, the client might filter data (e.g., "chart my squat volume vs sleep"). This filtering might be done client-side if the data set is small (user's own data). However, if the user has a lot of data (years of workouts), we might need server-side filtering and pagination.

        But note: the plan says "data scoped to THEIR data only". So the data set is limited to one user. The number of workouts per user might be in the thousands (if they log every day for a few years). We might need to paginate or allow time-range filtering on the server.

        However, the custom chart builder is initiated by the user via conversation. The Coach would propose a chart based on the user's request. The user might specify a time range (e.g., "last 3 months"). We should design the API to accept time-range parameters.

    In Agent Gateway T0 reads:
        - When an agent requests "my workouts", it might want to filter by date, type, etc. We should support server-side filtering and pagination to avoid sending too much data.

    Therefore, for endpoints that return lists of user-specific data (workouts, charts, schedule, etc.), we should implement server-side pagination and filtering.

 3. New endpoint design — For each new endpoint the plan proposes, is the REST shape correct (verbs, resource nesting, payload, multipart if uploads)?

    We'll design the endpoints we identified.

    Swan Coach:

        Chat:
          - We need to send and receive messages. We might have:
                POST /api/coach/chat   -> to send a message (with possible voice input as multipart/form-data or base64 in JSON? but note: voice-first, so we might get audio)
                GET /api/coach/chat/:conversationId -> to get the chat history (with pagination)

          However, note: the plan says "persistent chat with full conversation history". We might store the chat history in the backend.

          For voice input: the client might record audio and send it. We might need to handle multipart uploads for audio.

          Alternatively, we might have the client convert voice to text on the client (using Web Speech API) and then send text. But the plan says "voice-first", so we might want to support audio upload.

          Let's assume we do audio upload:

                POST /api/coach/chat
                  Content-Type: multipart/form-data
                  Fields: 
                    conversationId (string, optional for new conversation)
                    audio (file)   [or alternatively, we might have a separate endpoint for speech-to-text?]

          However, to keep it simple and follow REST, we might have:

                POST /api/coach/conversations   -> to start a new conversation (returns conversationId)
                POST /api/coach/conversations/:conversationId/messages
                  - can accept either text (in JSON) or audio (multipart)

          But note: the plan says "resumable threads", so we need to be able to continue a conversation.

        Custom Chart Builder:
          - The client creates a custom chart conversationally. The Coach proposes a chart definition. The client then saves it.

          We might have:
                POST /api/coach/custom-charts
                  Body: { 
                    name: string,
                    description: string,
                    chartConfig: { ... }, // the configuration for the chart (data sources, type, etc.)
                    dashboardPosition: { ... } // optional, for where to pin it
                  }

          And then to get the user's custom charts:
                GET /api/coach/custom-charts   -> returns list of custom charts for the user

          And to update/delete:
                PATCH /api/coach/custom-charts/:id
                DELETE /api/coach/custom-charts/:id

        Feature access for Coach:
          - We are reusing the existing feature-access grant system. So we might not need a new endpoint, but we might need to add a new feature flag for "swan_coach" in the existing grant system.

          However, we might need an endpoint to check if the user has access to Coach (for the frontend to show/hide the Coach section). But if we are reusing the existing system, then the existing endpoint for feature grants might already return this.

          So we assume no new endpoint for feature access, but we will extend the existing grant system to include the Coach feature.

        Cost tracking:
          - We need to track token usage per user per month.

          We might have:
                POST /api/coach/usage   -> to log token usage (called by the backend after each Coach interaction)
                  Body: { userId, tokensUsed, timestamp }

          And for the user to check their usage:
                GET /api/coach/usage/:userId?month=YYYY-MM   -> returns usage for the month

          And for the admin cost dashboard:
                GET /api/coach/admin/usage   -> returns aggregated usage data (with filtering by user, date range, etc.)

        Admin cost dashboard:
          - As above, we have an endpoint for admin to view usage.

    Agent Gateway:

        T0 reads:
          - We want to expose existing data (workouts, charts, schedule) but under an agent gateway with agent API key authentication.

          We might create a new base path for the agent gateway, e.g., `/api/agent`.

          Then:
                GET /api/agent/workouts   -> returns paginated list of user's workouts (with filtering by date, type, etc.)
                GET /api/agent/charts     -> returns user's charts (including custom charts? note: the plan says "my charts")
                GET /api/agent/schedule   -> returns user's schedule

          We must ensure that the data returned is scoped to the user (via the agent API key, which is tied to a user).

        T1 draft proposals:
          - For log-workout draft:
                POST /api/agent/workouts/draft   -> creates a draft workout (not committed to the main log)
                  Body: { ... workout data ... }

                GET /api/agent/workouts/draft/:id -> get a specific draft
                PATCH /api/agent/workouts/draft/:id -> update a draft
                DELETE /api/agent/workouts/draft/:id -> delete a draft

                And then when the user approves, we might have:
                POST /api/agent/workouts/draft/:id/commit   -> converts the draft to a real workout (and deletes the draft)

          - For plan suggestions:
                POST /api/agent/plans/suggestion   -> creates a suggested plan (not committed)
                ... similarly for GET, PATCH, DELETE, and commit.

        Wearables:
          - We need endpoints for consent and data import.

          For Fitbit (OAuth):
                GET /api/wearables/fitbit/auth   -> redirects to Fitbit for OAuth
                GET /api/wearables/fitbit/callback -> handles the callback from Fitbit (exchanges code for token, stores token)

          Then to import data:
                POST /api/wearables/fitbit/sync   -> triggers a sync of Fitbit data (or we might do it in the background after auth)

          Similarly for Apple Health and Google Fit, but note: the plan says they are aggregators, so we might treat them similarly.

          However, note: the plan says "Integrations are ENRICHMENT, never source of truth (Rule 62)". So we are only reading from wearables, not writing.

          We might also need endpoints to revoke access:
                DELETE /api/wearables/fitbit   -> revokes Fitbit access

 4. Multimodal / large payloads — If the plan sends images/audio/large bodies, how should the contract handle them (inline field vs upload-then-reference)?

    In Swan Coach:
        - Voice input: audio files can be large. We should not send them inline in JSON (base64 would be inefficient and might hit payload limits). Instead, we should use multipart/form-data for audio uploads.

        - For chat messages that are text, we can use JSON.

        - For custom chart builder: the chart configuration is likely small (JSON), so we can send it inline.

        - For the agent gateway: the data being sent (workout drafts, etc.) is likely small, so inline JSON is acceptable.

 5. Rate limiting — For each new operation, what rate limits are appropriate?

    We consider:

        Swan Coach Chat:
          - Since it's a conversational AI, we don't want to overwhelm the model. We might limit the number of messages per minute per user.
          - Example: 10 messages per minute.

        Custom Chart Builder:
          - Creating a custom chart is not something done very frequently. We might allow 5 per hour per user.

        Feature access check:
          - This is likely done on page load, so we can be generous: 100 per hour.

        Cost tracking usage logging:
          - This is done by the backend after each Coach interaction, so we don't rate limit the endpoint (it's internal). But we might rate limit the user-facing usage check: 10 per hour.



---

*Part of SwanStudios 15-Brain Recursive Consensus System*

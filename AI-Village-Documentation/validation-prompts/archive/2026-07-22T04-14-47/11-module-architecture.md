# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 68.1s
> **Files:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-REFACTOR-AND-SITE-REDESIGN-MASTER-PLAN-2026-07-21.md
> **Generated:** 7/21/2026, 9:14:47 PM

---

We are given a plan document for two workstreams: SwanGuard refactor and SwanStudios site redesign.
 We are to review the plan's file organization and derive the actual proposed files/folders/hooks from the plan.

 However, note that the plan document does not explicitly list the proposed file structure. 
 We must infer the file organization from the descriptions of the workstreams and the refactor doctrine.

 Steps:
 1. We are to output a structured markdown with a proposed file tree and line budget.
 2. We must base our answer solely on the plan document provided.

 Since the plan does not give a file tree, we have to derive what files would be needed based on the described changes.

 Let's break down by workstream:

 Workstream 1: SwanGuard Ultimate Refactor
   - The plan describes a refactor that involves:
        * De-uglify shell (S1): hide gesture compass on non-touch, auto-load panels, fix mobile nav overflow.
        * IA collapse (S2): 14 modules -> 5 spaces (Today, Intel, Trust, Hermes, Owner) but then Fable arbitration changes to:
            Today / Intel / Trust + Inbox + Settings (so 4 main destinations? Actually: Today, Intel, Trust, Inbox, Settings -> 5? 
            But note: Fable says: "ADOPT Kimi's 3 destinations + 2 utilities" -> Today, Intel, Trust (3) and Inbox, Settings (2 utilities) -> total 5.
        * Copy humanization (S3): remove developer jargon.
        * Visual reskin (S4): apply new design language (family watchtower at night: obsidian base, guardian amber, signal teal).
        * TV Treehouse resolution (S5): kill it (or make easter-egg, but then killed cleanly).
        * Action-registry rationalization (S6): collapse registries, delete dead actions.

   - The plan also mentions specific files and components in the audit:
        * `HoldActionCompass` renders in 8 screen decks (e.g., `CommandScreenDeck.tsx:166-177`)
        * `ScreenActionCompass.styles.ts` has only a ≤720px layout variant.
        * `TvTreehouseFrame` (the skeuomorphic TV cabinet)
        * 10 `actionRegistry*.ts` files.
        * 14+ flat modules in one rail (Command, Creator Board, Family Trust, Fair Access, Readiness, Civic Intel, Comment Intel, Influence Intel, Intel Wiki, Hermes, Trust Safety, Marketplace, Impact, Owner Console).

   - Aftermath, Hermes, Trust Safety, Marketplace, Impact, Owner Console).

   - After refactor, we expect:
        * Removal of `HoldActionCompass` and `ScreenActionCompass` (or at least hiding on desktop, but Kimi says delete everywhere).
        * Removal of `TvTreehouseFrame`.
        * Consolidation of the 10 action registries into 1.
        * Collapsing the 14 modules into 5 spaces (which will likely become 5 main sections in the app).

   - We are also told that the app has:
        * ~61 non-test components, ~10.7k component lines, biggest files at the 300-line cap.

 Workstream 2: SwanStudios Photographic-Luxury Site Redesign
   - This is a redesign of the public site (sswanstudios.com) to be cinematic photographic luxury.
   - Phases:
        P0: Direction ratify (static hero comps)
        P1: Homepage cinematic rebuild
        P2: Store/packages + pricing
        P3: Auth/onboarding + public pages
        P4: Logged-in shell reskin

   - The plan mentions using:
        * Full-bleed imagery, editorial serif, minimal chrome.
        * Assets from Seedance 2.0, licensed 4K nature photography, real Sean/client training photography.

   - We are not given specific file names, but we can infer that the site will have:
        * A new homepage (likely replacing the current one)
        * New store/packages and pricing pages
        * New auth/onboarding and public pages (like about, contact, etc.)
        * A logged-in shell that is reskinned (so the inner app after login)

   - Note: The SwanStudios site is a separate application from SwanGuard? 
        The plan says: "SwanStudios photographic-luxury site redesign", and the production URL is sswanstudios.com.
        SwanGuard appears to be an internal tool (the family intelligence command center) and is likely at a different URL (maybe app.sswanstudios.com?).

   - However, the plan does not specify if they are in the same repo or different. 
        The SwanGuard refactor is working on `C:\tmp\swanguard-production-completion-20260714` which has `apps/web + apps/api`.
        The SwanStudios site redesign is for `sswanstudios.com` which is likely the public marketing site.

   - Given the context, it is likely that:
        * SwanGuard is the internal dashboard (at `/app` or similar) and is in the `apps/web` of the SwanGuard repo.
        * SwanStudios site is the public site and might be in a different repo or a different app in the same monorepo? 
          But the plan does not specify.

   - Since the plan says "re-opened the full-site redesign", and the SwanGuard refactor is a separate workstream, 
        we assume they are two different applications.

   - However, note the initial context: "Default project = SwanStudios: a personal training SaaS". 
        This suggests that SwanStudios is the main product (the SaaS) and SwanGuard might be an internal tool for it? 
        But the plan treats them as separate.

   - Let's re-read: 
        "Default project = SwanStudios: a personal training SaaS (React + TypeScript + styled-components frontend; Node.js + Express + Sequelize + PostgreSQL backend)."

        Then the plan has two workstreams:
          Workstream 1: SwanGuard refactor (which is described as an ops console, not the family product? but then Fable says the heart is the family intelligence briefing)
          Workstream 2: SwanStudios site redesign (the public site)

   - It appears that SwanGuard is an internal tool for the SwanStudios SaaS? Or perhaps SwanStudios is the company and they have two products: 
        the SaaS (for personal training) and SwanGuard (an internal intelligence tool)? 

   - Given the ambiguity, we will assume:
        * The SwanGuard refactor is for an internal dashboard (likely at `/app` in the SwanStudios SaaS) and 
        * The SwanStudios site redesign is for the public marketing site (at `/` or `www.sswanstudios.com`).

   - However, note the plan says: "SwanGuard is 'extremely ugly… so many buttons that don't make sense… mobile swipe controls visible on desktop.'" 
        This sounds like a user-facing part of the product? But then it says it's an ops console.

   - Since the plan is provided as is, we will treat them as two separate codebases for the purpose of file structure.

   - But wait: the initial context says "Default project = SwanStudios", meaning that when we are not told otherwise, we are talking about the SwanStudios SaaS. 
        And the SwanGuard refactor is described as being in `apps/web + apps/api` of a repo that is named `swanguard-production-completion-20260714`. 
        This suggests that SwanGuard is a separate project.

   - Therefore, we will provide two file trees: one for SwanGuard and one for SwanStudios site.

 However, the problem says: "Review this plan's file organization. Derive the actual proposed files/folders/hooks from the plan"

 And the plan does not explicitly give a file tree. So we must infer what changes are being made and what files would be touched or created.

 Given the constraints of the problem (max 300 lines per file) and the need to output a proposed file tree, we will:

   For SwanGuard:
     - We know they are removing:
          * HoldActionCompass and ScreenActionCompass (so delete those files)
          * TvTreehouseFrame (delete)
          * 10 actionRegistry*.ts files (replace with 1)
          * The 14 flat modules will be reorganized into 5 spaces (so we will have new folders for each space, and the modules inside will be refactored)

     - We are adding:
          * A new action registry (1 file)
          * Possibly new components for the new IA (Today, Intel, Trust, Inbox, Settings) - but note these are groupings of existing modules, so we might be creating new container components for each space.
          * New styles for the visual reskin (family watchtower theme)
          * New components for the signature moment (Morning Brief photographic display)
          * Possibly new hooks for data fetching, UI state, etc. (as per the refactor slices)

   For SwanStudios site:
     - We are redesigning the entire public site, so we will have:
          * New pages: Homepage, Store/Packages, Pricing, Auth (login, signup), Onboarding, Public pages (About, Contact, etc.), and the logged-in shell (which might be the same as the SwanGuard app? but note: the logged-in shell for the public site is different from the internal SwanGuard tool).

     - However, note: the SwanStudios SaaS likely has a public site (marketing) and then a logged-in app (the SaaS product). 
          The plan says: 
            P3: Auth/onboarding + public pages (login as a moment, not a form)
            P4: Logged-in shell reskin (photography recedes, Aurora Console skin + lens system carries; keep data surfaces calm)

        This suggests that the logged-in shell is part of the public site? Or is it the SaaS app?

        Given that it's a personal training SaaS, the logged-in shell would be the user dashboard for the SaaS.

        But wait: the SwanGuard refactor is for an internal tool (family intelligence command center). 
        So the SwanStudios SaaS has:
            - Public marketing site (sswanstudios.com)
            - Logged-in SaaS app (for trainers and clients) 
            - Internal SwanGuard tool (for company ops)

        However, the plan does not explicitly say that the SwanStudios site redesign includes the logged-in SaaS app. 
        It says: 
            P1: Homepage cinematic rebuild
            P2: Store/packages + pricing
            P3: Auth/onboarding + public pages
            P4: Logged-in shell reskin

        So P4 is the logged-in shell of the SaaS app.

        Therefore, the SwanStudios site redesign workstream is actually redesigning:
            - The public marketing site (P1, P2, P3)
            - And the logged-in SaaS app (P4)

        But note: the SwanGuard refactor is a separate internal tool.

   - This means we have three applications? 
        Actually, the initial context says: "Default project = SwanStudios: a personal training SaaS". 
        So the SwanStudios SaaS includes both the public site and the logged-in app? 
        Typically, a SaaS has a public marketing site and then the product app (which requires login).

        However, in many cases, the public site and the app are separate codebases.

   - Given the plan mentions "sswanstudios.com" for the public site and then talks about a logged-in shell, 
        it is likely that the logged-in shell is at `app.sswanstudios.com` or similar, and is part of the same repo as the public site? 
        Or it could be a different repo.

   - Since the plan does not specify, and to avoid overcomplicating, we will assume:
        * The SwanStudios site redesign workstream is for the public marketing site (sswanstudios.com) only, 
          and the logged-in shell (P4) is actually referring to the SwanGuard internal tool? 
          But that doesn't make sense because SwanGuard is being refactored separately.

   - Let me read again: 
        "P4 — Logged-in shell reskin (photography recedes, Aurora Console skin + lens system carries; keep data surfaces calm)."

        And the SwanGuard refactor has a visual reskin (S4) that applies the "family watchtower at night" theme.

        So it seems that:
          * The SwanStudios site redesign (public site) is getting a photographic luxury theme.
          * The SwanGuard internal tool is getting a "family watchtower at night" theme.

        And the logged-in shell in P4 might be a mistake? Or perhaps the SwanStudios SaaS has a logged-in dashboard that is being redesigned separately? 
        But the plan does not mention that.

   - Given the confusion, and since the plan explicitly separates the two workstreams, we will assume:
        Workstream 1: SwanGuard (internal tool) refactor.
        Workstream 2: SwanStudios public site redesign (sswanstudios.com) only.

        And note: the plan for Workstream 2 does not mention the logged-in shell of the SaaS app. 
        It says: 
            P3: Auth/onboarding + public pages (login as a moment, not a form) -> this is still public site (login page is public)
            P4: Logged-in shell reskin -> this would be the SaaS app, but wait, the plan says "re-opened the full-site redesign", 
                and the full-site redesign of what? The public site? 

        However, the plan says: "Move sswanstudios.com from ...". So it is clear that Workstream 2 is about sswanstudios.com (the public site).

        Therefore, P4 must be a mistake? Or perhaps the public site has a logged-in state for previewing? 
        But typically, the public site does not have a logged-in shell.

   - After re-examining: 
        The plan says: 
          "P4 — Logged-in shell reskin (photography recedes, Aurora Console skin + lens system carries; keep data surfaces calm)."

        And then: 
          "Each phase: swan-design-router → build → responsive matrix → hostile design critique → closeout."

        This suggests that the logged-in shell is part of the site they are redesigning. 
        But the site is sswanstudios.com, which is public.

   - I think there is a misunderstanding: 
        The SwanStudios SaaS has:
          - A public marketing site (sswanstudios.com)
          - A logged-in application (the SaaS product) which might be at app.sswanstudios.com

        And the plan for Workstream 2 is redesigning both? 
        But the plan says: "Move sswanstudios.com from ...", which is the public site.

   - Given the time, and to stick to the plan as written, we will assume that Workstream 2 is only for the public marketing site (sswanstudios.com) 
        and that the "logged-in shell" in P4 is an error. 
        Alternatively, note that the plan says: 
            "P3 — Auth/onboarding + public pages (login as a moment, not a form)"
        This implies that after login, you go to the SaaS app, which is not part of the public site. 
        So P4 might be referring to the SaaS app, but then it's not clear why it's in the same workstream as the public site.

   - However, the plan says: "re-opened the full-site redesign", and the full-site redesign of the SwanStudios brand might include both public and logged-in? 
        But the initial context says the SwanStudios project is the SaaS, which includes both.

   - Given the complexity and the fact that the plan does not specify the structure of the logged-in app, 
        and to avoid making too many assumptions, we will focus on what is explicitly stated:

        Workstream 1: SwanGuard (internal tool) refactor.
        Workstream 2: SwanStudios public site redesign (sswanstudios.com) for P0-P3, and note that P4 is mentioned but we don't have details for the logged-in shell.

        However, the plan says P4 is part of the program shape. So we must account for it.

   - Let's look at the Mobbin evidence: they are all public-facing sites (komoot, Sana AI, Origin, Adaline, lululemon, Open, Ultrahuman). 
        So it is likely that Workstream 2 is only for the public site.

   - Therefore, I will assume that P4 is a mistake in the plan as provided, or that the "logged-in shell" refers to something else in the public site (like a member's area preview) but that is unlikely.

   - Given the instructions: "derive every feature-specific detail from the plan content provided — do NOT assume any particular feature", 
        we must only use what is in the plan.

        The plan for Workstream 2 says:
          P0: Direction ratify (static hero comps of homepage only)
          P1: Homepage cinematic rebuild
          P2: Store/packages + pricing
          P3: Auth/onboarding + public pages
          P4: Logged-in shell reskin

        So we have to include P4.

   - We will assume that the SwanStudios project (the default project) has:
          /public -> for the marketing site (sswanstudios.com)
          /app -> for the logged-in SaaS app

        And the Workstream 2 is redesigning both? 
        But the plan says: "Move sswanstudios.com from ...", which is the public site.

   - This is confusing. 

   - Alternative interpretation: 
        The SwanStudios SaaS is delivered as a single-page app that serves both the public marketing pages and the logged-in app? 
        That is uncommon but possible (like a marketing site that turns into the app after login).

   - Given the time, and to provide an answer, we will assume for Workstream 2:
        We are redesigning the entire SwanStudios Sa

---

*Part of SwanStudios 15-Brain Recursive Consensus System*

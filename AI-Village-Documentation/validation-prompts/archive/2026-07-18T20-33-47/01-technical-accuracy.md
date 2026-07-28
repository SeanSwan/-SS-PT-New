# Technical Accuracy — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 | **Duration:** 95.3s
> **Files:** docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-AESTHETIC-UPGRADE-MASTER-2026-07-18.md
> **Generated:** 7/18/2026, 1:33:47 PM

---

# Technical Review: SWAN-DESIGN-BRAIN-AESTHETIC-UPGRADE-MASTER-2026-07-18.md

**Reviewer:** Senior Technical Reviewer, SwanStudios Platform
**Review Date:** 2026-07-18
**Document Status:** DRAFT — direction locked

---

## Executive Summary

This document is primarily a **design-vision and workflow-governance artifact**, not a codebase QA report. Accordingly, most findings concern **architectural accuracy, factual correctness about the stack, and internal consistency** rather than feature-score fairness (no 1–10 scores are present to audit). The document is generally well-structured and internally coherent. However, several technical inaccuracies, false gaps, missing caveats, and one CRITICAL compliance issue require correction before this becomes a build-authoritative reference.

**Finding count:** 3 CRITICAL · 5 HIGH · 7 MEDIUM · 4 LOW

---

## CRITICAL Findings

---

### CRITICAL-1

**Severity:** CRITICAL
**Section:** §7.5, Sean's Answer to Q5 / §7.6 Fable C1
**Issue: ESA/Webb licensing characterization is still technically incomplete after Fable's correction**

Fable's C1 note states "ESA/Webb + ESA/Hubble imagery is typically CC BY(-SA)." This is partially correct but imprecise in a way that could cause a compliance failure at asset-ingestion time.

The actual licensing landscape is:

- **NASA imagery:** Generally U.S. Government public domain (17 U.S.C. §105), but NASA has specific media-use guidelines that prohibit implying NASA endorsement of a commercial product. SwanStudios is a commercial SaaS. This is not a blanket "free path."
- **James Webb Space Telescope (JWST) imagery:** JWST is a joint NASA/ESA/CSA mission. Images released through STScI (Space Telescope Science Institute) carry a **Creative Commons Attribution 4.0 (CC BY 4.0)** license — attribution required, commercial use permitted. This is *more permissive* than Fable stated (not CC BY-SA), but attribution is still mandatory.
- **ESA Hubble imagery:** Typically CC BY 4.0 as well, not CC BY-SA as Fable stated. The SA (ShareAlike) clause would be a significant restriction for a commercial product; stating it incorrectly could cause the team to either over-restrict usage or under-comply.
- **ESA general imagery (non-Hubble/Webb):** Varies; some assets are CC BY-SA-IGO 3.0 (the IGO variant has specific commercial-use nuances).

The document's proposed resolution (credit manifest) is correct and sufficient, but the underlying license characterization feeding that decision is wrong in ways that matter for a production commercial platform.

**Correction:**
Replace the Fable C1 note with the following precise characterization:

> NASA imagery: U.S. Government PD under 17 U.S.C. §105; commercial use permitted but NASA endorsement must not be implied (NASA Media Guidelines). JWST imagery via STScI: CC BY 4.0 — attribution required, commercial use permitted, no ShareAlike restriction. ESA Hubble: CC BY 4.0 (same). ESA general: verify per asset; some carry CC BY-SA-IGO 3.0 which has IGO-specific commercial nuances. Credit manifest (Fable C1 resolution) is correct and mandatory. The world-gate CI check must validate that every ingested cosmos asset has a recorded license string and attribution text before merge.

The credit manifest resolution stands. The license strings in the manifest must be accurate.

---

### CRITICAL-2

**Severity:** CRITICAL
**Section:** §4.6, "Experience tech" / §4.6 Freedom Sandbox (EXPLORE lane)
**Issue: Three.js / R3F described as "already sanctioned for small surgical moments" — this overstates current production status and creates a false build baseline**

The document states Three.js/R3F is "already sanctioned for 'small surgical moments'" as if this is an established, tested production pattern in the SwanStudios codebase. Based on the declared stack (React 18 + TypeScript + styled-components + Victory charts + Render), **Three.js/R3F is not a declared production dependency** of SwanStudios. The phrase "already sanctioned" implies it has been reviewed for bundle impact, LCP budget compliance (Rule 25), and mobile perf on the actual Render deployment — none of which is evidenced in this document.

This matters because:

1. Three.js adds ~600KB+ to the bundle before tree-shaking; R3F adds further overhead. On a fitness SaaS where the primary surfaces are dashboards and workout logs, this is a non-trivial LCP risk.
2. The document's own Rule 25 mandates LCP budget compliance and 2D/reduced-motion fallbacks. Sanctioning Three.js without a documented perf gate contradicts this rule.
3. Downstream builders reading "already sanctioned" will treat this as permission to add Three.js to production surfaces without the discipline pass the document itself requires.

**Correction:**
Change "already sanctioned for 'small surgical moments'" to:

> Three.js/R3F is a **candidate technology for the EXPLORE sandbox only** and has not been validated against SwanStudios' production LCP budget or Render deployment constraints. Before any Three.js/R3F code crosses the translation gate into a production surface, it requires: (a) bundle-impact audit (code-split + lazy-load mandatory), (b) LCP measurement on a representative low-end mobile device against the existing budget, (c) a documented 2D/CSS fallback that passes all a11y gates independently of the 3D layer, and (d) explicit sign-off in `qa-gates.md`. The sandbox may use it freely; production requires the discipline pass.

---

### CRITICAL-3

**Severity:** CRITICAL
**Section:** §6c, Mobbin Research Round 1 — Principle 2 / §6c Principle 8
**Issue: "Ice Wing rings" streak visualization and "reduced-motion toggle as first-class pattern" are described as if they are existing built components — they are not**

Principle 2 states: "→ Ice Wing rings + reduced-motion static fallback." Principle 8 states: "→ validates rule 25; make the toggle a first-class pattern."

The arrow notation (→) throughout §6c is used to indicate "this maps to a Swan pattern." However, the document conflates two distinct states: (a) patterns that **exist in the codebase** and (b) patterns that **should be built**. "Ice Wing rings" as a streak visualization component does not appear in the declared component library (C1–C12 in SWAN-CINEMATIC-DESIGN-SYSTEM.md). A "celebration motion toggle" as a first-class UI component is similarly not documented as existing.

If builders read this document as a QA/handoff reference and treat these as existing components, they will spend time searching for code that does not exist, or worse, assume it exists and skip building it.

**Correction:**
Add explicit build-status tags to every Principle in §6c:

> Each principle is tagged **[EXISTING]** if it maps to a currently built and tested component, or **[TO BUILD]** if it is a new pattern derived from research. Principle 2 Ice Wing rings streak visualization: **[TO BUILD]** — new component, requires design spec before implementation. Principle 8 reduced-motion toggle: **[TO BUILD]** — new first-class pattern, requires component spec, accessibility audit (focus management, `prefers-reduced-motion` media query integration), and `qa-gates.md` entry before shipping.

---

## HIGH Findings

---

### HIGH-1

**Severity:** HIGH
**Section:** §1, Stack Declaration
**Issue: Stack description omits the authentication layer and payment infrastructure, which are material to the design system**

The compact site summary lists: "React 18 + TypeScript + styled-components · Node/Express/Sequelize/PostgreSQL · Victory charts · Render." For a design-brain document that governs UI patterns across user/trainer/admin/Swan Coach surfaces, the omission of the auth layer (likely JWT + refresh tokens or a session-based system) and payment infrastructure (Stripe or equivalent, given "payments, payouts" are core to the B2B2C model) is a gap.

This matters for the design brain because:
- Auth-gated surfaces have distinct loading states, skeleton patterns, and error states that must be in the component library.
- Payment flows (checkout, payout dashboards) have specific WCAG and PCI-DSS display requirements that interact with the token system.
- The trainer payout surface is explicitly called out as a core product surface but has no design-system coverage noted.

**Correction:**
Extend the stack line to include: "Auth: [JWT/session — confirm actual implementation] · Payments: [Stripe or equivalent — confirm] · Payout surface: requires dedicated component spec in `components.md` covering payment-state skeletons, error states, and PCI display constraints."

---

### HIGH-2

**Severity:** HIGH
**Section:** §4.6, "Self-verification" tooling
**Issue: Playwright MCP described as "LIVE" — verify this is actually integrated and not just installed**

The document states "Playwright MCP (LIVE) + `agent-browser` + `webapp-testing`" as if these are fully operational in the CI/CD pipeline. "LIVE" is a strong claim. The distinction between "the MCP server is running locally in Sean's dev environment" and "Playwright tests run in CI on every PR against the Render deployment" is significant.

If Playwright is only running locally or on-demand, describing it as "LIVE" in a build-authoritative document will cause downstream agents to assume CI coverage exists when it may not, leading to skipped manual QA steps.

**Correction:**
Clarify the operational status:

> Playwright MCP status: [LOCAL/CI — confirm]. If local-only, note that CI integration is a prerequisite before the world-gate contrast checks (Fable C8) can be considered automated. Document the actual test runner location (local MCP, GitHub Actions, Render preview hooks) before treating Playwright as a CI gate.

---

### HIGH-3

**Severity:** HIGH
**Section:** §4.5(b), Era Style-Packs
**Issue: Era style-packs are described as "mixable" but no conflict-resolution protocol is defined for token collisions**

The document defines seven era style-packs as "selectable, mixable accents layered over the base system." The layer model is: `identity + subject + style-pack (era) + system`. However, several era packs directly conflict with Crystalline Swan's token floor:

- **80s synthwave:** "neon grid, chrome, sunset gradients" — sunset gradients would require warm-spectrum tokens that don't exist in the Crystalline Swan palette (Midnight Sapphire, Royal Depth, Ice Wing, Arctic Cyan, Gilded Fern, Frost White, Swan Lavender, Wing Purple, Obsidian Black, Carbon, Graphite). Introducing warm sunset colors as an era accent without a defined token-extension protocol risks either (a) hardcoded hex values violating the CSS custom property rule, or (b) token namespace collisions.
- **70s earth tones:** Same issue — warm film grain and earth tones have no home in the current token set.
- **90s bold primary blocks:** Primary red/yellow/blue blocks would fail WCAG 4.5:1 against the dark-first obsidian backgrounds without explicit contrast testing.

The document says era packs "never replace the Crystalline Swan token floor" but provides no mechanism for how era-specific tokens are namespaced, scoped, and validated against the floor.

**Correction:**
Add a token-extension protocol for era packs:

> Era style-pack tokens must be namespaced as `--era-{id}-{property}` (e.g., `--era-80s-accent-warm: #FF6B35`). Every era token must: (a) be declared in the identity config file for that era, (b) pass WCAG 4.5:1 contrast validation against the Crystalline Swan background tokens it will appear on, (c) never override a core Swan token (only extend the namespace), and (d) be absent from production surfaces unless the surface explicitly opts into that era pack via `styleLensId`. The era token file is the single source of truth; no era hex values appear in component code.

---

### HIGH-4

**Severity:** HIGH
**Section:** §2, Design Brain Refresher — "24 markdown files"
**Issue: The file count and structure description cannot be verified from this document and may be stale**

The document states the brain "lives at `docs/ai-workflow/design-brain/` — 24 markdown files." This is stated as a current fact. However:

1. The document itself references files being added as outputs of this very workstream (new `world-atmosphere.md`, extended `SWAN-ASSET-STORYBOARDING.md`, updated `index.md`). The 24-file count will be wrong the moment this work ships.
2. The `adapters/` subdirectory is listed with several files but no count. The `obsidian/` and `graphify/` directories are mentioned but not enumerated.
3. If downstream agents use "24 files" as a completeness check, they will get false positives or false negatives depending on when they read this.

**Correction:**
Replace the static count with a dynamic reference:

> The brain currently contains N markdown files (count authoritative in `index.md`, updated on every merge). As of 2026-07-18 pre-upgrade: approximately 24 files across `design-brain/`, `adapters/`, `obsidian/`, `graphify/`. Post-upgrade will add at minimum: `world-atmosphere.md`, updated `SWAN-ASSET-STORYBOARDING.md`, updated `index.md`. Treat `index.md` as the canonical file manifest, not any count stated in prose.

---

### HIGH-5

**Severity:** HIGH
**Section:** §6c, Mobbin Research — "24 screens pulled"
**Issue: "24 screens" is stated as a completed research artifact but the actual distilled principles show only 8 items, and the apps cited are not named**

The document states "24 screens pulled (web + ios; apps cited for Sean's verification only, never reproduced)" but then lists only 8 principles. The apps are not named in the document (only described: "Tonal," "Nike," "Duolingo," "Strava," "Streaks," "Ladder," "Life Reset," "Quicken," "Substack," "MacroFactor," "adidas"). This creates two issues:

1. **Verification gap:** Sean is told "apps cited for Sean's verification" but no citation list exists in this document. If the actual Mobbin research report is in a separate file, that file should be explicitly referenced here.
2. **Principle-to-screen ratio:** 24 screens → 8 principles suggests either (a) 16 screens yielded no actionable principles (possible but should be noted), or (b) the research is incomplete and more principles remain to be extracted.

**Correction:**

> Reference the actual Mobbin research report explicitly: "Full screen list and `mobbin_url` citations: `docs/ai-workflow/AI-HANDOFF/mobbin-research-round1-{date}.md`." Note whether the 8 principles represent the complete distillation or a first pass. If 16 screens were reviewed and yielded no additional principles, state that explicitly so future researchers don't re-pull the same screens.

---

## MEDIUM Findings

---

### MEDIUM-1

**Severity:** MEDIUM
**Section:** §4.6, Generation Stack — "Pinterest/image-inspiration MCP"
**Issue: Pinterest is recommended as a candidate MCP but Pinterest's API Terms of Service prohibit automated scraping and most third-party API access for commercial use**

The document mentions "a Pinterest/image-inspiration + photo-library (Unsplash/NatGeo-style) MCP" as a candidate. Fable C7 correctly recommends "Unsplash/Pexels official APIs, NOT Pinterest." However, the main body of §4.6 still names Pinterest as a candidate without the correction, creating a contradiction within the document.

Pinterest's API v5 is heavily restricted, requires app review, and prohibits use cases that involve automated content aggregation for design tooling. An MCP server wrapping Pinterest's API for design reference would almost certainly violate their ToS.

**Correction:**
Remove Pinterest from §4.6 entirely. The document already contains Fable's correct recommendation in §7.6 C7. Consolidate to: "Photo-inspiration MCP candidates: Unsplash API (free tier available, commercial use permitted with attribution), Pexels API (free, commercial use permitted). Evaluate both for MCP wrapping. NatGeo-style imagery requires direct licensing — no public API equivalent; use as a quality-bar reference only, not as an automated source."

---

### MEDIUM-2

**Severity:** MEDIUM
**Section:** §4.5(b), Era Style-Packs

---

*Part of SwanStudios 15-Brain Recursive Consensus System*

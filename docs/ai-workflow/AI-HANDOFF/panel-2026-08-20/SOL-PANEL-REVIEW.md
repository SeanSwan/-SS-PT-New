# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** C:/tmp/sspt-atelier-studio/docs/ai-workflow/AI-HANDOFF/FIVE-THEMES-PANEL-BRIEF-2026-08-20.md
**Seed:** (none)
**Tokens:** 33785 in / 27021 out · **Cost:** ~$0.4898 · **Wall:** 222.7s

---

## VERDICT
REVISE — Use a dark T2 base with T3’s approachable card language, but the current brief contains unresolved pricing, proof, privacy, accessibility, and positioning failures that make every theme unshippable as written.

## BLOCKERS
The document supplies section references but no repository file paths or line numbers, so evidence below cites the supplied sections.

1. **P1 — Contradictory public pricing.** State: a trainer joins after reading “~10%,” then is billed 15% up to a cap → misleading acquisition copy, billing disputes, refunds, and potential consumer-protection exposure. Marking both values as contradictory does not make either value safe to publish. **Evidence:** brief §6.1; no file:line supplied.

2. **P1 — Placeholder and unsubstantiated proof can reach production.** State: the production content module still contains `NEEDS-SEAN-NUMBER` → visitors either see unfinished placeholders or a developer substitutes unsupported numbers; named testimonials and results also create substantiation and consent obligations. The build needs to fail closed, not merely label these fields. **Evidence:** brief §3 and §6.4; no file:line supplied.

3. **P1 — “Owned by the community” may be a false ownership claim.** State: SwanStudios is not demonstrably a cooperative or otherwise community-owned → visitors receive a false statement about equity, governance, or control. Change it to “Built with the community” unless legal documents substantiate literal ownership. The unchecked “NCEP-certified experts” claim needs the same evidence gate. **Evidence:** brief §1 and §6.2; no file:line supplied.

4. **P1 — The LLM workflow violates the ID-only privacy rule.** State: this content is sent through Claude and review LLMs while containing `NEEDS-SEAN-NUMBER`, attributable owner quotations, and potentially verbatim testimonial material → human-linked information leaves the required ID-only boundary. Redact to opaque IDs before any further model use and audit the referenced artifact. **Evidence:** document metadata `originating_model`, Canvas link, §2, §3, and §6.4; no file:line supplied.

5. **P1 — T3 is noncompliant by design.** State: T3 is selected → the shipped homepage is light-first and uses an unapproved client green, directly violating two binding house constraints. Calling this deliberate or a token trial does not create a waiver. Kill T3 as a complete theme; graft only its friendliness onto approved dark tokens. **Evidence:** brief §4 T3 row and §5; no file:line supplied.

6. **P1 — T4 has an acknowledged but unmeasured contrast risk.** State: cream/glowing text is rendered through near-black fog and bloom → category labels lose edge contrast and may fall below the required 4.5:1, especially on mobile or low-quality displays. T4 cannot ship without measured foreground/background pairs and screenshots covering every fog frame. **Evidence:** brief §4 T4 row and §7.6; no file:line supplied.

7. **P2 — T1’s specification instructs designers to misuse gold.** State: an implementer follows “black/white/gold palette” or the “Obsidian & Gold” identity → decorative gold spreads beyond the narrow allowlist. Remove gold from the palette definition and enumerate its only permitted semantic uses. **Evidence:** brief §4 T1 row conflicts with §5; no file:line supplied.

## ATTACKS
- **Correctness:**
  - **Theme decision:** T2 wins for a cold “personal trainer near me” visitor because it most closely preserves product recognition, scanning, and fitness context. T1 narrowly presents better institutional credibility to trainers evaluating a business move, but its severe tone and gold ambiguity make it unsuitable for the root homepage. The root should prioritize the trainee’s high-intent job while retaining an equally visible trainer door; trainers should receive a dedicated landing path with migration and economics detail.
  - **Kill T3 outright.** It breaks dark-first, depends on an unapproved green, and visually disconnects the marketing page from the product. Its labeled-card friendliness is worth grafting into T2 using approved Crystalline Swan blue tokens.
  - Community-first has over-corrected. A search visitor asking for a trainer immediately encounters dance, music, gaming, comedy, and video categories. That makes SwanStudios look like a generic creator/community network before it has established location, trainer availability, modality, price, or results. Lead with trainer matching and “how training works”; introduce community as the retention differentiator afterward.
  - Thirteen sections, forty blocks, a hero asset, and two movies create an unbounded mobile page and likely LCP/network cost. No image dimensions, responsive sources, lazy-loading boundary, poster behavior, autoplay policy, or performance budget is specified.
  - Reduced-motion support is asserted but not defined. It must disable parallax, bloom animation, and nonessential movie motion—not merely shorten CSS transitions.
  - The most important absences for trainees are service area/location search, online versus in-person availability, trainer profiles, schedule availability, starting price, matching flow, cancellation/refund terms, and trust/safety.
  - The most important absences for trainers are payout timing, exact cap computation, chargebacks, taxes, client/data ownership, exportability, migration assistance, scheduling/payment integrations, and whether SwanStudios can solicit their clients.
  - A local “Nextdoor-like” community also needs moderation, reporting/blocking, event-host verification, location-privacy controls, age policy, and emergency/safety guidance. “Digital made real” introduces physical-safety risk that the brief ignores.
  - T3’s light ground is not automatically a contrast failure, but it is a definite dark-first violation. T4 is the actual inferred contrast hazard.
  - The binding implementation rules are not demonstrated: no styled-components evidence, no `var(--token,#fallback)` declarations, no file-size plan, and no proof that the CTA pair uses Dual-Button Glow. A pair of buttons alone does not satisfy that pattern. Victory/Recharts is currently inapplicable because no chart is specified.
  - The brief correctly avoids yoga/meditation wording and uses “26+ years / NASM-protocol.” Do not publish the separate NCEP credential until verified.

- **Security:**
  - The identifiable material already present in an LLM-originated workflow conflicts with the zero-PII rule. Testimonial identities, quotations, images, and result details require redaction or explicit approval before entering any external model.
  - No signup or consultation flow is specified, so authn, authorization, tenant scoping, IDOR, CSRF, replay/idempotency, validation, rate limiting, and bot protection cannot be assessed. The omission must not be treated as evidence of safety.
  - Community events require privacy-by-default location handling. Exact home locations, attendee lists, and member presence must not be exposed across tenants or before acceptance.
  - Generated or externally hosted movies need an explicit asset pipeline: allowlisted origins, server-side fetch restrictions to prevent SSRF, MIME/size validation, CSP, and no third-party tracking before consent.
  - Forms and event creation need per-account and per-IP limits; otherwise the friendly community surface becomes a cheap spam and resource-exhaustion target.

- **Data-truth / schema drift:**
  - The fee conflict is already proof of two competing sources of truth: live-page copy and planning decisions. Pricing must come from one canonical, owner-approved record shared by marketing, checkout, contracts, and billing.
  - The discovery that most copy lived in an unopened shared module shows there is no enforced content contract. Introduce a typed schema with required fields, provenance, approval state, and expiry date; CI should reject placeholders, forbidden credential wording, unsupported claims, and conflicting percentages.
  - Stats and testimonials need evidence IDs, consent state, measurement period, and approval status—not raw prose pasted into components.
  - Frontend response shapes, database models, table casing, foreign keys, and tenant keys are absent, so PascalCase/snake_case drift, FK-target drift, and API response-shape drift cannot be verified.
  - “Byte-identical” header reuse is not a substitute for a shared component. Copying bytes creates another stale implementation unless all themes import the same versioned header.
  - Theme content should be shared data rendered by separate presentation components; duplicating forty blocks five times guarantees future copy divergence and risks exceeding the 300-line file limit.

## HIGHEST RISK
The fee contradiction is the most dangerous item because it turns marketing drift directly into a monetary dispute. The cheapest de-risk is to remove every fee percentage before ship, designate one approved pricing record as canonical, and add a CI test that fails if homepage, checkout, contract, and billing values differ.

## CONFIDENCE
I could not inspect the Claude artifact, repository, rendered themes, token values, responsive layouts, CTA destinations, generated movies, content module, billing configuration, legal ownership structure, testimonial consent, credential records, or any backend/API schema. Consequently, I cannot verify styled-components-only usage, absence of MUI/Recharts, approved token syntax, Dual-Button Glow, 44px computed targets, reduced-motion behavior, 4.5:1 contrast, file lengths, tenant isolation, or whether additional PII was sent to an LLM.

Evidence that would settle this: a pinned source commit; component/file inventory; production content payload; token and contrast matrix; mobile and desktop Storybook renders; axe, keyboard, reduced-motion, Playwright, and Lighthouse reports; canonical pricing and billing tests; ownership/credential substantiation; testimonial consent records; and LLM redaction logs showing that only opaque IDs crossed the model boundary.

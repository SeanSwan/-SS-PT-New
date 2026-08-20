# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/sspt-atelier-studio/docs/ai-workflow/AI-HANDOFF/FIVE-THEMES-PANEL-BRIEF-2026-08-20.md
**Tokens:** 2034 in / 10097 out (reasoning: 7902) | total 12131
**Wall:** 181.3s

---

## VERDICT
REVISE — the brief is honest about its own contradictions but no theme is shippable as specified: three P0 rule/truth violations (fee, credential, trial-status token) sit on every candidate front page, and the winning-theme question can't be answered responsibly until they're cleared.

## BLOCKERS
(The document is a decision brief, not code — it supplies no file:line, so evidence is quoted by section. Severity is for *shipping the page as described*.)

1. **P0 — Fee contradiction on a live, numeric, decision-driving claim.** §6.1: live page says "Small transparent fee (~10%)"; a planning session decided 15% with a $1,000/mo cap; "every theme marks this on the page." Scenario: trainer evaluates moving a book of business → reads 10% (or both numbers) → either bounces on the contradiction or signs and discovers a 50% higher take rate → churn plus a misrepresentation grievance. On a platform whose brand claim is literally *transparency*, this is the worst possible place to be wrong. No number may ship until one is canonical.

2. **P0 — Unverified third-party credential claim shipped verbatim.** §6.2: services list says "NCEP-certified experts," flagged "never been checked." House rule mandates credential copy as "26+ years / NASM-protocol" and bans cert-style wording drift. If "NCEP" is a mangled acronym (NASM? NCCA?), the page publishes a credential the founder may not hold — false-credential exposure on the front page of a fitness business. This is in all 40 verbatim blocks, so all five themes carry it.

3. **P0 — T3 ships an unapproved token and violates a non-negotiable rule.** §5: "No approved client green token exists… capped at TRIAL"; T3's green is TOKEN_PROPOSAL promoted into client UI, plus a deliberate dark-first break (§4). The brief invites argument, but my house rules say flag any violation, so: T3 is unshippable without a governance override. Either grant the exemption explicitly (token promoted to approved, dark-first waiver signed) or kill the green — don't let a "provocation" theme leak trial-state tokens into production CSS.

4. **P1 — NEEDS-SEAN-NUMBER stats rendered "labelled as such on the page" (§6.4).** Two failure modes: (a) the label ships → template smell on a trust page; (b) numbers get invented to fill → fabricated performance claims, with "lbs lost" and "satisfaction %" squarely in FTC-substantiation territory. Either path blocks a marketing page whose only job is credibility.

5. **P1 — The fix for content drift re-introduces content drift, five times.** §2 diagnosed the root cause (copy pack covered 4 of 13 sections; truth lived in an unopened shared module). §3's remedy — "40 blocks, verbatim" — appears to hand-copy the content into five themes. Five renderers × one truth = guaranteed re-drift on the next copy edit. The content module must be the single source consumed by all five theme components, with a contract test asserting every theme renders all 13 sections' fields.

6. **P1 — T1's identity conflicts with the gold allowlist.** §5: "Gold is an allowlist, not a palette member… decorative gold is a defect." §4: T1's palette is "black/white/gold." A theme whose *identity* is gold cannot stay inside "PR numerals, ≤1px filigree, focus rings, one badge per scene." As specified, T1 will produce decorative gold. Re-scope T1's gold usage to the allowlist before it can win, or reject it on rules.

7. **P2 — Swappable hero slot + two movie slots with no owner, validation, or empty state.** §3: hero is "badged as a swappable slot"; films "he will generate" don't exist yet. Scenario: ship day → slot empty or stale → cold traffic's first impression is a placeholder. No performance budget exists for 13 sections + parallax stages + video-frame LCP on mid-tier mobile.

## ATTACKS

- **Correctness:**
  - **Community-first is an over-correction — the wrong fix for the right diagnosis.** The owner said trainer-heavy, client-light (§2). The remedy promoted 8 *creative verticals* (Comedy, Gaming & Streaming, YouTube-Style Video) above the offer. "Client" ≠ "creator categories." Someone googling "personal trainer near me" has purchase intent; burying the trainer/program content at section VI inflates bounce and dilutes SEO keyword mass toward "dance community." The Nextdoor-*like* piece (meetups, walking clubs) is client-relevant; Gaming & Streaming is not. Strongest case against: the page now optimizes for an audience that hasn't arrived, at the expense of the one typing the query.
  - **The decision procedure is undefined.** §7 asks five taste questions; no funnel hypothesis, no success metric, no experiment design. Five themes will be adjudicated by panel aesthetics. Absence-first: define the metric (cold-visit → consultation/trainer-search conversion, split by audience) before picking a winner.
  - **Theme verdicts (panel Q1/Q3):** Cold trainee: **T2**, by elimination — the only rule-compliant, scannable candidate; T3 is the *right* warmth for "near me" intent but is gated by Blocker 3. Trainer: **T1**, but only after Blockers 1 and 6 clear — institutional chrome suits a money-serious pitch. Different winners for different audiences: yes, and the trainee should win — in B2B2C, demand pulls supply; trainers follow clients, never the reverse. Move trainer economics to a dedicated `/trainers` route (which also defuses Blocker 1 by taking fees off the homepage entirely). **Kill T4 outright:** its own self-declared weakness ("8 categories in fog is a lot of low-contrast reading") directly defeats the page's one mandatory job — rendering 40 verbatim content blocks readably. Atmospheric fog is self-indulgence on a cold-commerce page.

- **Security / trust / privacy:**
  - **Meetup promotion with zero safety surface.** "Local events, walking clubs, group activities" on the front page, with no moderation policy, age gating, waiver language, or event-safety affordance mentioned anywhere. First incident at a platform-promoted in-person event → liability naming the platform. Importing the Nextdoor *metaphor* imports Nextdoor's hardest problems.
  - **Named testimonials + LLM pipeline risk.** Testimonials "with named results" (§3) are PII; if names pass through any LLM-assisted copy pipeline, that violates zero-PII-to-LLMs (IDs only). Releases/substantiation for named results are unmentioned.
  - **Ad-claim exposure:** aggregate "lbs lost" and "satisfaction %" without measurement methodology or typicality disclaimers.

- **Data-truth / schema drift:**
  - Three live instances of the same drift class in one document: fee (live 10% vs plan 15%+cap), CTA (brief "book a consultation" vs live pair — resolved by fiat, reason unrecorded), credential ("NCEP" vs the mandated "NASM-protocol" string). The system has no content-contract mechanism, so wording drifts silently between live page, briefs, and planning notes.
  - No key-naming contract between the content module and the theme renderers is specified; 40 hand-mapped blocks per theme is where the PascalCase/snake_case-class drift will land next.

## HIGHEST RISK
The **fee contradiction** (Blocker 1): a public numeric claim that is false under *either* resolution, aimed at the audience making the platform's most consequential decision, underneath a brand thesis of anti-extraction transparency — and the 15% reality sits awkwardly close to "decorative honesty." Cheapest de-risk, same afternoon, zero code: strip all fee copy from the homepage, publish one dated canonical fee page (15%, $1,000/mo cap), and task the live page's 10% copy for immediate correction. Secondary, equally cheap: replace NEEDS-SEAN-NUMBER stats with DB-derived counters ("sessions delivered" is a query, not a guess) or delete the section.

## CONFIDENCE
I reviewed a decision brief, not an artifact — no code, no rendered pages, no file:line. Specifically unverifiable, with the evidence that would settle it:

- **"Marks this on the page" (§6.1, §6.4):** user-visible vs in-artboard annotation only. One screenshot of the artifact settles whether Blockers 1 and 4 are ship-blockers or pre-ship warnings.
- **All engineering house rules** — styled-components-only, Victory-only, `var(--token,#fallback)` usage, Dual-Button Glow on the CTA pair, 44px targets (claimed in §3, unverified), ≤300-line files, and T5's violet ≠ retired `#7851A9` *including inside fallbacks*. Need the theme implementations and a computed-style audit.
- **Actual contrast ratios for T4's fog and T3's light ground.** §4 admits low-contrast reading in T4; I infer a WCAG 4.5:1 failure on mid-luminance fog behind cream serif but cannot compute it. Need rendered contrast measurements.
- **Whether "NCEP" is a typo.** Only the founder's actual certificates settle it.
- **Community-first judgment:** principled but unproven — I have no funnel or audience-mix data. A/B of hero-order (offer-first vs categories-first) or even session recordings from the current live page would convert my argument into evidence.
- **Whether the 8 categories have supply.** If 6 of 8 verticals are ghost towns, the front page is advertising emptiness one click deep — I can't see category inventory from this document, and it would change my T2/T3 ranking.

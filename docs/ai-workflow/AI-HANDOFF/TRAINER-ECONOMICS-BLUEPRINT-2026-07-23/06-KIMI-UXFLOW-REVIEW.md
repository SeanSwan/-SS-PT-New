# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/8044c7d9-1231-449c-82b3-97570ad6ea78/scratchpad/kimi-uxflow-review-packet.md
**Seed:** (none)
**Tokens:** 4699 in / 4020 out · **Cost:** ~$0.0744 · **Wall:** 181.6s

---

# KIMI K3 — HOSTILE DESIGN + FRONT-END REVIEW

**Document:** Trainer-Economics UX-Flow / Hidden-Routes / App-Context Gap Audit (pre-build review brief)

---

## (a) VERDICT

**SEND-BACK** — this is a rigorous *plumbing* audit masquerading as a UX review: it green-lights ~15 new UI surfaces with zero design contract, zero layout spec, zero CTA hierarchy, and zero visual ambition, so every screen it authorizes will be engineer-improvised admin-template grey on a brand that is supposed to be Enchanted Apex.

---

## (b) Design / front-end weaknesses — most severe first

**1. A "UX review" containing no design.** This is the fatal flaw. The document enumerates surfaces — Economics Console, trainer application queue, "My Pricing / My Packages / My Specials / My Requests," Session Confirm card, payout reports, abuse trends — and specifies *routing and data* for every one of them, and *pixels for none*. No tokens, no grid, no type scale, no component inventory, no density target, no state designs (it says "find missing empty/loading/error states" but never defines what those states *look like* in Crystalline Swan). It references "wireframe 8.1" for the Economics Terminal and never shows it. Handing this to a builder means every surface gets a default left-aligned table, a gray card, and a 1px border. That is the generic/template feel we're supposedly hostile to, baked in at the spec layer.

**2. No signature moment — and the most emotional surface in the entire product gets treated as a queue.** Money is the trainer's motivation loop. The earnings surface and the session-confirm → payout-visible moment is *the* place Crystalline Swan should feel like a brand and not a CRUD app. The doc's own analysis identifies the Session Confirm card as "the load-bearing fraud signal" and then asks "dashboard-home card, nav item, notification deep-link, or all three?" — punting the single most design-critical CTA in the system to the implementer. That's not a review; that's deferral. A confirm action this important needs a decided placement, a decided visual weight, and a decided micro-moment.

**3. CTA hierarchy is never named anywhere.** Not once does the document say what the primary action on any surface is. Approve application? Confirm session? Request comp switch? On admin screens with approve/deny/flag/notify, the absence of a stated primary/secondary/destructive hierarchy means builders will render four identical buttons — and the Dual-Button Glow rule (blue bg→purple glow, purple bg→cyan glow) only works if someone has decided which actions are primary vs. secondary. The doc restates the constraint but never applies it.

**4. IA rhythm inconsistency it diagnoses but doesn't cure.** Admin nav is config-driven (`WORKSPACE_CONFIG`); trainer and client sidebars are hardcoded arrays. The doc correctly flags that S2.5/S3/S4 trainer items "have no home," but its prescription is "say exactly where they go" — i.e., hand-editing two more hardcoded arrays, guaranteeing the drift, badge, and ordering inconsistency that made `/become-a-trainer` a hidden route in the first place. The trainer sidebar is **already 14 items**. Adding Pricing/Packages/Specials/Requests makes ~18. At 375px that sidebar is an unreadable scroll-walla with no grouping, no badges, no collapse behavior specified. The doc never even counts.

**5. Notification surfaces are specified functionally, never visually.** S3/S7/S9/S11 all "reuse existing notification service." Fine — but where does a notification *land visually*? Toast? Badge on sidebar item? A notification center? Deep-link target with what scroll/highlight state? The session-confirm loop lives or dies on the client *noticing the ask*. Undesigned notifications = the two-sided sensor dies quietly, which the doc itself says is the worst outcome.

**6. Zero dark-mode/contrast operationalization.** The house mandate is Crystalline Swan dark-first via `var(--token, #fallback)`. The document restates "Crystalline Swan palette" as a constraint and never once requires a token list, a contrast check (4.5:1) for earnings figures and status pills, or a spec for how `pending_review` / `approved` / `flagged` states read on the dark theme. Status color is where dark themes go to die — amber/red/green pills on deep crystalline backgrounds routinely fail contrast. Unaddressed.

**7. "Hidden routes" is treated as a nav-config problem only, not a discoverability *design* problem.** `/become-a-trainer` is hidden, yes — but the fix isn't just "add a footer link." Where in the footer hierarchy? What label? Does it deserve a header presence during recruiting pushes? A prospect landing on the onboarding form — what's the *visual trust moment* (26+ years / NASM-protocol credential framing) that converts? The doc routes the user to the door and never designs the doorway.

---

## (c) Implementation-fidelity attacks

- **300-line cap already breached, and the doc quotes it without flinching.** `coachIntakeContextService.mjs` is cited as **322 lines** — over the house cap *today*. The Jarvis-wiring directive (Sean's #2/#3) will extend exactly this service family. The brief must require splitting `coachIntakeContextService` *before* any wiring slice touches it, or slice 1 of the data work ships a violation. The doc enforces the cap as a "hard constraint" and then ignores a live violation in its own evidence. Hostile note: if the reviewer didn't catch this, what else in §H is stale?
- **No breakpoint matrix for any new surface.** Payout reports (S12), the applications queue, and the Economics Console are all wide-table surfaces. Nothing in the doc addresses 320/375/414 behavior (table → card-stack transformation is *never free*), 768/1024 sidebar collapse points, or 2560/3840 max-content-width containment (an earnings table stretched across 3840px is unreadable — line-length and max-width must be specified). Expect horizontal scroll at 320 and a mile-wide data desert at 3840.
- **44px touch targets unmentioned for the two actions that matter most.** Session Confirm (client, likely on a phone, post-workout) and Approve Application (admin) get no touch-target, no hit-area, no sticky-mobile-CTA spec. The confirm button is a fraud sensor; if it's a 28px text link in a card footer, the sensor's data quality is a UI bug.
- **No keyboard/focus/reduced-motion requirements anywhere.** Approval queues are keyboard-heavy admin workflows (tab through rows, approve/deny, focus-return after action). Focus management after row-level mutations, focus-visible styling on the dark theme, and `prefers-reduced-motion` for any earnings/confirm animation — all absent. GPU-safe motion isn't even mentioned because no motion is mentioned, which is its own problem (dead UI).
- **Nested-interactive-element landmine, unflagged.** The proposed Session Confirm as a dashboard-home card *and* a notification deep-link invites the classic card-is-a-link-with-a-button-inside invalid DOM. The doc should explicitly forbid interactive nesting and define the card as a static surface with one real `<button>`.
- **Sidebar badge counts unspecified.** Pending applications (admin), pending confirms (client), pending requests (trainer) all need count badges — the doc never specs the badge pattern, so three slices will invent three.
- **Victory-only restated but never applied.** S12 payout report and S8 abuse trends are chart surfaces; the doc mandates "Victory charts only" and then specifies zero charts — no chart types, no empty-data states, no dark-theme axis/tooltip token requirements. Victory's default theme on Crystalline dark is illegible without explicit token wiring; that needs to be in the contract.
- **styled-components-only restated, never enforced at the component level.** Fifteen new surfaces with no component spec is exactly how someone `npm i`s a table library under deadline pressure.

---

## (d) The ONE highest-impact change

**Gate every economics surface behind a one-page Design Contract, and make the Session Confirm → earnings moment the brand's signature micro-moment.** Concretely: before S2.5/S3/S7 ship any UI, produce a single design addendum per surface — Crystalline token list (`var(--token, #fallback)` only), layout at 375/768/1440, one named primary CTA (Dual-Button Glow), full empty/loading/error states, 44px hit areas, focus order, reduced-motion fallback. And within that, design the paired moment the whole fraud-economics system hinges on: the client taps **Confirm Session** (purple bg → cyan glow, full-width sticky on mobile, 48px); on the trainer's surface the earnings figure acknowledges it with a GPU-safe count-up + subtle crystalline shimmer (transform/opacity only; static tick under `prefers-reduced-motion`). That pairing turns an antifraud sensor into a trust ritual — money made *visible* the second it's earned. No competitor bolted onto a generic template does that. This is what separates Enchanted Apex from Mindbody-with-a-dark-skin.

---

## (e) What a design-savvy competitor would out-build here

- **One unified "Money" hub instead of five scattered sidebar items** — earnings, packages, specials, requests, payouts behind a single config-driven nav entry with segmented tabs and badge rollup. This doc's plan adds four top-level items to an already-bloated hardcoded sidebar; a competitor ships one destination and wins on IA alone.
- **A real-time trainer earnings surface** with a live-ish counter, progress-to-payout visualization, and a payout-landed celebration — the emotional core the doc reduces to "S12 payout report, reachable from Revenue Analytics."
- **Mobile-first confirm flow with haptic-feel motion**, designed at 375px first, instead of a desktop-table mindset retrofitted downward.
- **A single design-token-driven status language** (pending/approved/flagged pills that pass 4.5:1 on dark by construction), rather than per-slice improvisation.
- **Consolidating the two existing package surfaces** (`/dashboard/admin-packages` vs. `/dashboard/admin/admin-packages`) into one canonical home — the doc *documents* this duplication and audits around it; a competitor deletes it.

---

## House-rule compliance check on the document itself

- ✅ Retired Galaxy-Swan palette not referenced; Crystalline Swan restated. ✅ styled-components-only, Victory-only, 44px, 300-line, zero-PII constraints all restated. ✅ "NASM-protocol"/"NASM-OPT" phrasing correct — no "NASM-certified." ✅ No yoga/meditation language.
- ❌ Restates the 300-line cap while quoting a 322-line service without flagging it. ❌ Restates Dual-Button Glow without ever assigning a primary CTA for it to apply to. ❌ Never operationalizes `var(--token, #fallback)`, WCAG 4.5:1, GPU-safe motion, or `prefers-reduced-motion` for any of the ~15 surfaces it authorizes.

**Bottom line:** approve this document as a *routing and data-pipeline* audit — it's genuinely strong there — but do not let a single economics surface enter a build slice until the Design Contract addendum in (d) exists. Plumbing this good deserves pixels this good.

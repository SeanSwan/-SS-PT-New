# SwanStudios — Acquisition-Funnel Activation: master build prompt (hand this to a builder)

> **Purpose.** A self-contained work order any competent developer or AI can execute to fix the money-losing gaps
> a hostile audit found in the SwanStudios lead funnel — plus verify a batch of review fixes. Every claim below is
> grounded in a verified `file:line`. Do the tasks in priority order. Respect the guardrails — some tasks are
> deliberately NOT yours to complete.
>
> **Repo:** SwanStudios (`-SS-PT-New`), branch `claude/build-swan-lens` (worktree). React 18 + TypeScript +
> styled-components (NO Material-UI) frontend; Node/Express + Sequelize + PostgreSQL backend; deploys on Render
> from `main`. **Verify branch freshness first:** `git fetch origin main && git rev-list --left-right --count
> origin/main...HEAD`.

---

## 0. HOW TO WORK (read before touching anything)
1. **Test locally before committing.** `cd frontend && npm run build` and `npx vitest run <file>`; `cd backend`
   for its tests. No pushing broken code.
2. **Write a targeted test for each change** (a failing test first where feasible). Money/lead code gets no bypass.
3. **Commit style** `type(scope): description`. Small, surgical commits — one task per commit. Touch only what the
   task names.
4. **Do NOT edit the money path logic** (checkout, credits, Stripe) — bind to it, never rewrite it.
5. **Flags default OFF.** Any new user-facing surface ships behind a flag, fail-closed to the current experience.
6. **The Gate Rule (load-bearing — a real defect already happened here):** if you mount a feature inside a
   flag-gated component, it MUST be mounted in EVERY branch of that gate, or it silently vanishes when the flag
   flips. Enforced by `frontend/src/components/marketing/PrismCapture/prismGateParity.test.ts` — extend
   `GATE_BRANCHES` if you add a gated surface.
7. **Coordinate:** another agent owns `frontend/src/pages/gallery-vnext/**` and the gallery route wiring. Do not
   edit those. Stage explicit paths; never `git add -A`.

## 0b. NON-NEGOTIABLES (violating these is a defect, regardless of the task)
- **Credentials:** Sean is described as **"26+ years experience, NASM protocol"** — NEVER "NASM-certified". Do
  not invent or assert any credential you cannot substantiate (see Task P2).
- **Language:** never "yoga" / "meditation" → use "stretching" / "flexibility".
- **Zero PII to LLMs / logs:** a lead's email may be sent to the business owner's own alert channels but must
  NEVER be written to server logs or sent to any model. `deIdentificationService.mjs` / `redactTranscriptPII.mjs`
  exist — use them for anything AI-facing.
- **Consent-first:** workout/biometric/pain data and marketing sends are consent-gated. `marketingSuppression`
  + `smsConsentStatus` already exist — respect them.

---

## 1. CURRENT STATE (context you need)
- **A 7-surface redesign is BUILT but flag-OFF** (Home/About/Video/Contact/Store/Dashboards + a "lens" design
  system). Real visitors still see the current site.
- **Lane-A activation just LANDED** (`adapters/style-lens-swan/v2/worldDefaults.ts` + a wrap in
  `SurfaceLensGate.tsx`) — so flipping a surface flag now actually re-skins it (before, gates failed closed and
  a flag flip did nothing). Flags are flipped via `/api/config/public-flags` + Launch Control overrides, or the
  `*_ENABLED` env vars. **The parser accepts only the exact strings `true` or `1`** — `yes`/`on`/`True` = false.
- **PRISM CAPTURE** (email-only lead capture) is built and flag-off (`PRISM_CAPTURE_ENABLED`). It reuses the
  existing public capture pipeline.
- **The existing lead pipeline** (all real, all working): `backend/models/Lead.mjs`,
  `backend/services/leadCaptureService.mjs` (dedupes, scores, records UTM), `backend/routes/leadRoutes.mjs` (admin
  CRM), `backend/routes/contactRoutes.mjs` (public contact form → creates a Lead).
- **A batch of 20 hostile-review fixes was just committed** (`448a20f2e`) — CI guards, the gate-parity test, and
  the live contact-form security hardening. **Their independent re-verification was interrupted** — a reviewer
  should re-run it (Task V1) before these are trusted as dry.

---

## 2. THE TASKS (do in this order)

### ⭐ P0 — safe, code-only, highest value-per-effort (do these first)

#### P0-1 · Set `nextFollowUpAt` at capture, so the "leads needing follow-up" dashboard stops lying
- **Problem:** `Lead.nextFollowUpAt` is READ by the follow-up dashboard filter + KPI (`leadRoutes.mjs:54,120`) but
  is only ever WRITTEN by a manual admin PUT (`leadRoutes.mjs:299`). Nothing sets it at capture — so it is null on
  every un-touched lead, and the "needs follow-up" count is **structurally ~always 0**. The dashboard reports
  "all clear" while the pipeline rots.
- **Do:** in `backend/services/leadCaptureService.mjs`, when a lead is CREATED (not on dedupe-update of an existing
  lead), default `nextFollowUpAt = now + 24h`. Only set it when it's currently null (never stomp an admin's date).
- **Acceptance:** a new lead from the contact form (and from PRISM) has `nextFollowUpAt` ~24h out; a unit test
  proves a freshly created lead has it set and an existing lead's value is not overwritten; the `followupsDue`
  count becomes non-zero as leads age past 24h.
- **Effort:** S. **Gate:** none — safe internal field.

#### P0-2 · Stop fabricating trainer credentials
- **Problem:** `frontend/src/services/trainerService.ts:66` — `certifications: trainer.certifications ||
  'Certified Personal Trainer'` fabricates a credential for any trainer with none on file. That is a claim the
  business cannot substantiate.
- **Do:** change the fallback to an empty string / omit the field so the UI shows nothing rather than an invented
  credential. Check the consuming component renders an empty state gracefully.
- **Acceptance:** a trainer record with no `certifications` renders no credential text anywhere (not the fabricated
  string). Add/adjust a test.
- **Effort:** S. **Gate:** none.

#### P0-3 · Make the referral share link actually credit someone
- **Problem:** PRISM writes `prism:refcode:<code>` and `prism:refby:<code>` into `Lead.tags`
  (`backend/routes/leadCaptureRoutes.mjs` ~151-153) but there is **no reader** — the share ray credits nobody, and
  `Lead.referredByUserId` (`Lead.mjs:45`) is unused.
- **Do:** at capture, when an inbound `?ref=<code>` is present, resolve it back to the referring Lead (whose tags
  contain `prism:refcode:<code>`) and record the relationship — populate `referredByUserId` if the referrer maps
  to a user, else store a `prism:refby-lead:<id>` tag. **Attribution only — no rewards economy yet** (that's a
  money decision for Sean). Keep the deterministic code scheme; do not change how codes are generated.
- **Acceptance:** capturing with `?ref=<validCode>` links the new lead to the referrer (queryable), and a
  self-referral / unknown code is ignored safely. Unit test both.
- **Effort:** S–M. **Gate:** none for attribution; rewards = Sean decision.

### P1 — the biggest missing surface

#### P1-1 · Build a real booking / "request a consult" page (`/book`)
- **Problem:** there is **no** `/book`, `/schedule`, or `/consult` route in `frontend/src/routes/main-routes.tsx`.
  PRISM's primary "Book a free consultation" ray and Contact's `?intent=book` both dead-end at the generic contact
  message box — the single highest-intent action a stranger can take goes nowhere specific.
- **Reuse, don't rebuild:** a backend already exists — `backend/routes/consultRequestRoutes.mjs` (`POST /`,
  rate-limited). Check where it's mounted in `backend/core/routes.mjs` and what body it expects. Also
  `backend/services/availabilityService.mjs` + the `Session` model exist if you want to show real open slots;
  `Lead.mjs:26-36` already has unused `status:'scheduled'` + `scheduledSessionId` columns for this exact purpose.
- **Do:** a `/book` page (styled-components, Crystalline palette via tokens, 44px targets, mobile-first) that
  submits a consult request through the existing endpoint AND creates/updates a `Lead` (`status:'scheduled'`,
  `scheduledSessionId` when a slot is chosen). Point PRISM's `bookHref` and Contact's `?intent=book` at `/book`.
  Fire the owner alert on a booking (reuse the existing alert path).
- **Acceptance:** a logged-out visitor can request a consult from `/book` end-to-end; a Lead lands with
  `status:'scheduled'`; the owner is alerted; the two existing "book" CTAs route here. Mobile 320/375/414 clean.
- **Effort:** M. **Gate:** ship behind a flag if you want a staged rollout; otherwise it's a net-new additive page
  (no old version to fail-closed to), so it's lower-risk than the redesign flips.

### P2 — trust / legal (verify before changing)

#### P2-1 · Verify (do NOT blindly delete) the "NCEP-certified" claim
- **Problem:** ~10 frontend files assert Sean is **"NCEP-certified (National College of Exercise Professionals)"**
  — e.g. `pages/about/About.V3.tsx`, `About.V4.tsx`, `about/components/sections/AboutSeanSection.tsx`,
  `components/FeaturesSection/FeaturesSection.tsx` (+ `.V2`), `about/v-next/AboutVNext.tsx`,
  `about/v-next/hero/AboutHero.tsx`, `about/components/shared/AboutData.ts`. (The
  `about/credentialPhrasing.contract.test.ts` file also names it — that's the GUARD, leave it.)
- **This is a Sean decision, not a delete-on-sight:** if the NCEP credential is current and documented, leave it.
  If it is NOT substantiable, replace every assertion with the approved phrasing ("26+ years experience, NASM
  protocol") and extend `credentialPhrasing.contract.test.ts` to also forbid the unsubstantiated claim so it can't
  come back.
- **Acceptance:** Sean confirms the credential's status; the files either stand (documented) or are corrected
  consistently across all of them (no half-fix), with the guard test extended.
- **Effort:** S (once Sean rules). **Gate:** Sean confirms the credential first.

### P3 — SEAN-GATED, outward-facing (a builder must NOT complete this alone)

#### P3-1 · Arm the lead-nurture sequence
- **Status:** the day-0/1/3/7 `lead_nurture` email sequence is fully built and **deliberately disarmed** —
  `backend/services/automationService.mjs:72-77` seeds `isActive:false` "ON PURPOSE so capture creates ZERO sends
  until Sean explicitly ARMS it", and all delivery is gated on `SWAN_AUTOMATION_CRON_ENABLED === 'true'`
  (`automationArmState.mjs:14`). Leads ARE being captured today (contact form) and receive no follow-up.
- **Why gated:** arming sends real email to real people. That requires (a) Sean's explicit go, (b) proven email
  deliverability (SPF/DKIM/DMARC — send a real inbox test), and (c) confirmed unsubscribe/consent handling.
- **A builder may:** run the automation backend tests, do the deliverability inbox test on a staging sender, and
  PREPARE the arming steps. **A builder may NOT:** flip `isActive=true` or set `SWAN_AUTOMATION_CRON_ENABLED` in
  production. Present the readiness evidence and stop.
- **Effort:** S (mostly verification). **Gate:** Sean flips it, after P0-1/P1-1 make follow-up worth arming.

### V — verification (do this in parallel; it's cheap and it de-risks everything above)

#### V1 · Re-verify the 20 review fixes (`448a20f2e`) — the last re-review was interrupted
- **Do:** re-run the guards and tests and confirm they behave: `node scripts/ci/check-degalaxy.mjs` and
  `check-token-discipline.mjs` (both must hard-FAIL on a missing/renamed scope, not print "clean"); the CI
  workflow `.github/workflows/swan-lens-guards.yml`; `cd frontend && npx vitest run
  src/components/marketing/PrismCapture src/pages/contactpage`. Spot-check the contact-form reply-to-hijack fix
  (a `/contact?intent=book&email=x@y.com` link must show the "we filled this from your link" hint and reject a
  malformed `?email=`).
- **Acceptance:** all green; the gate-parity test still fails when a mount is commented out and passes on a
  `<PrismCapture {...p} />` refactor (mutation-check it).

---

## 3. SUGGESTED SEQUENCE FOR ONE BUILDER
V1 (warm up + confirm the base is sound) → P0-1 → P0-2 → P0-3 → P1-1 → hand P2-1 + P3-1 to Sean with the evidence
you gathered. P0-1 through P0-3 are each a small, independently-shippable commit; P1-1 is the one real feature.

## 4. FOR SEAN ONLY (not the builder's to decide)
- **Arm nurture?** (P3-1) — the single highest-money flip once P0-1 + P1-1 land.
- **Is the NCEP credential current/documented?** (P2-1) — determines whether ~10 files stand or get corrected.
- **Referral rewards economy?** (beyond P0-3 attribution) — a money decision.
- **Flip PRISM on?** — set `PRISM_CAPTURE_ENABLED=true` + `REF_CODE_PEPPER` on Render (a missing pepper hides the
  share ray). Run the PRISM backend vitest in CI first.

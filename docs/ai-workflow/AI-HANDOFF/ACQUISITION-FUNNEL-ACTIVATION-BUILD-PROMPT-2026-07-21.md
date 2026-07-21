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

## 1c. NORTH STAR (what "done" means for the whole funnel)
A stranger goes **landing → captured → first human/automated touch within the SLA → booked**, and every step is
**measurable**. If you finish tasks but cannot answer "how many captured leads got a touch within 24h, and how
many booked," the funnel is not done. Instrument as you go (Task P0-4).

## 2. THE TASKS (do in this order — sequence corrected after a self-critique of an earlier draft)

> **Order:** V1 → **P0-0 (deliverability is a prerequisite for the whole funnel)** → P0-1 → **P1-1 (booking is the
> conversion path — do it before referral)** → P0-4 (instrument) → P0-2 → P0-3 → P2/P3. Rationale: nothing that
> sends email/SMS is worth building until delivery is proven; the booking page is far higher value than referral
> attribution (which is data with no reward until Sean approves a rewards economy).

### ⭐ P0-0 · PREREQUISITE — prove email/SMS actually get delivered (verify before building anything that sends)
- **Problem:** P0-1's owner alerts, P1-1's booking alerts, AND the P3 nurture drip ALL depend on email/SMS
  actually arriving. If SPF/DKIM/DMARC aren't set or the sender lands in spam, every downstream task is silently
  worthless — worse than nothing, because the dashboard says "sent."
- **Do (verification, not code):** confirm in the Render env that the owner-alert vars are set — `OWNER_PHONE` /
  `OWNER_WIFE_PHONE`, `OWNER_EMAIL` / `OWNER_WIFE_EMAIL`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, Twilio creds.
  Send one real inbox test through the production sender and confirm it lands in the inbox (not spam) with passing
  SPF/DKIM/DMARC (check the received-headers). Record the result.
- **Acceptance:** a written pass/fail on deliverability + a list of any missing prod env var. If it fails, that is
  the #1 blocker and everything else waits. **Gate:** none to verify; fixing DNS/env is a Sean action.

### ⭐ P0 — safe, code-only, highest value-per-effort

#### P0-1 · Set `nextFollowUpAt` at capture, so the "leads needing follow-up" dashboard stops lying
- **Problem:** `Lead.nextFollowUpAt` is READ by the follow-up dashboard filter + KPI (`leadRoutes.mjs:54,120`) but
  is only ever WRITTEN by a manual admin PUT (`leadRoutes.mjs:299`). Nothing sets it at capture — so it is null on
  every un-touched lead, and the "needs follow-up" count is **structurally ~always 0**. The dashboard reports
  "all clear" while the pipeline rots.
- **Do:** in `backend/services/leadCaptureService.mjs`, when a lead is CREATED (not on dedupe-update of an existing
  lead), default `nextFollowUpAt` — **tiered by intent, not a flat 24h:** a hot lead (`score >= 70`, e.g. a
  consult/booking) → **now + 2h** (speed-to-lead: the first touch should be minutes-to-hours, not a day); everyone
  else → now + 24h. Only set when currently null (never stomp an admin's date).
- **Also (one-time backfill):** every lead captured BEFORE this change has `nextFollowUpAt = null` forever, so the
  dashboard keeps under-reporting historicals. Add an idempotent backfill (a `scripts/` one-off or a guarded
  migration) that sets `nextFollowUpAt = createdAt + 24h` for open leads (`status NOT IN ('converted','lost')`)
  where it is null.
- **Acceptance:** a new hot lead gets ~2h, a normal lead ~24h; an existing lead's value is not overwritten
  (unit-tested); the backfill runs idempotently and the `followupsDue` count reflects real aging leads.
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
- **Do:** at capture, when an inbound `?ref=<code>` is present, resolve it to the referring Lead via a JSONB
  containment query — `Lead.findOne({ where: { tags: { [Op.contains]: ['prism:refcode:'+code] } } })` (Postgres
  `@>`). **Add a GIN index on `Lead.tags`** (`CREATE INDEX ... USING gin (tags)`) or this scans the table as leads
  grow. Then record the relationship — populate `referredByUserId` if the referrer maps to a user, else a
  `prism:refby-lead:<id>` tag. **Handle the edge cases explicitly:** unknown code → ignore; >1 match (code
  collision) → ignore (don't guess); self-referral (referrer resolves to the same email) → ignore. **Attribution
  only — no rewards economy** (Sean decision). Don't change how codes are generated.
- **Acceptance:** `?ref=<validCode>` links the new lead to the referrer (queryable); unknown/duplicate/self codes
  are safely ignored; the GIN index exists. Unit-test each edge case.
- **Effort:** S–M. **Gate:** none for attribution; rewards = Sean decision. **Note:** attribution alone changes no
  behavior for the user — its value is realized only once a reward is attached, so it ranks below booking.

### P1 — the biggest missing surface

#### P1-1 · Build a real booking / "request a consult" page (`/book`)
- **Problem:** there is **no** `/book`, `/schedule`, or `/consult` route in `frontend/src/routes/main-routes.tsx`.
  PRISM's primary "Book a free consultation" ray and Contact's `?intent=book` both dead-end at the generic contact
  message box — the single highest-intent action a stranger can take goes nowhere specific.
- **Reuse, don't rebuild:** `backend/routes/consultRequestRoutes.mjs` (`POST /`, rate-limited) already exists.
  READ it first — confirm where it's mounted (`backend/core/routes.mjs`), what body it accepts, and **whether it
  already creates a Lead**. If it does, bind to it; if not, have it call `captureLeadFromContact` +
  `status:'scheduled'`. `Lead.mjs:26-36` has unused `status:'scheduled'` + `scheduledSessionId` for this.
- **SCOPE — MVP is "capture intent to book," NOT a self-serve calendar (this was over-scoped in an earlier draft):**
  the `/book` page collects name + email + a free-text "preferred time / goal", submits through the existing
  endpoint, creates a `Lead` with `status:'scheduled'`, and fires the owner alert (reuse the existing alert path;
  rate-limit with `contactLimiter`). **Do NOT** couple it to `availabilityService` / the `Session` model / live
  slots in v1 — a real-calendar slot picker touches trainer scheduling + auth and is a separate follow-up
  (document it as "P1-1b: live-slot booking"). The win is that the highest-intent CTA stops dead-ending, not a
  full scheduler.
- **Do:** the `/book` page (styled-components, Crystalline palette via tokens, 44px targets, mobile-first,
  real `<form>` + AA a11y like PrismCapture). Point PRISM's `bookHref` and Contact's `?intent=book` at `/book`.
- **Acceptance:** a logged-out visitor completes a consult request from `/book`; a Lead lands with
  `status:'scheduled'`; the owner is alerted (verified against P0-0); both "book" CTAs route here; mobile
  320/375/414 clean; spam-rate-limited.
- **Effort:** M (MVP) — much smaller than the calendar version. **Gate:** net-new additive page (no old version to
  fail closed to), so lower-risk than a redesign flip. Ship behind a flag only if you want a staged rollout.

#### P0-4 · Instrument the funnel so lift is measurable (the North Star depends on this)
- **Problem:** none of P0-1/P1-1/P3 can be judged without funnel numbers. `MEASUREMENT-CHARTER.md` defines the
  taxonomy but nothing emits it.
- **Do:** emit the canonical events (`lead_captured`, `booking_started`/`scheduled`, `first_touch`, `converted`)
  per `MEASUREMENT-CHARTER.md` — server-side where possible, no PII/exact amounts (bucket amounts, allowlist
  fields, drop unknowns). One weekly number Sean can say out loud: visits → captures → touched-within-SLA →
  booked → joined.
- **Acceptance:** the four events fire on the real paths; a query returns last-7-day counts; zero PII in the event
  stream (Rule 8).
- **Effort:** S–M. **Gate:** none.

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
- **Why gated:** arming sends real email to real people. Requires (a) Sean's explicit go; (b) P0-0 deliverability
  proven; (c) **lawful basis + one-click unsubscribe in EVERY nurture email** — a contact-form submission may be
  transactional, but a day-0/1/3/7 *drip* is marketing (CAN-SPAM / GDPR): every send needs a working unsubscribe
  and must honor `marketingSuppression` + `smsConsentStatus`. Verify the sequence templates carry an unsubscribe
  link and the suppression check runs before each send.
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

## 2b. KIMI ENHANCEMENT PASS — close the loop to automated revenue (2026-07-21)
> Kimi's thesis after reviewing the plan: **every task above terminates at "alert the owner" or "set a field for
> a human to read." Sean is the bottleneck the plan pretends to remove.** These 9 gaps fix that — ranked by money,
> almost all S-effort folded into the existing tasks. A ⚑ marks a Sean business decision, not a builder default.

- **G1 · ⚑ Pay-to-hold at the booking moment (BIGGEST money).** The plan ends at `status:'scheduled'` = a free
  consult, which no-shows 30–50%. The repo already has Stripe + the $175 price. Offer, in P1-1's confirmation, a
  **paid intro / deposit-to-hold via a Stripe payment link** — this is *binding to* the money path (permitted),
  not rewriting it. A lead who pays shows up. **Sean decides the shape:** free consult · $50 deposit credited to a
  package · $175 paid intro. One paid conversion out-earns dozens of nurtured free leads. → new **P1-1a**.
- **G2 · Automated instant first-touch (fold into P0-1).** `nextFollowUpAt` only *tells Sean he's late*; it
  doesn't make the lead not-late. On capture of a hot/`scheduled` lead, fire an **immediate transactional
  acknowledgment** ("Got it — Sean will reach out within [window]; tap to lock a time"). This is a transactional
  reply to an inbound request, **NOT the P3-1 marketing drip — it does not need the arming gate**, but it DOES
  depend on P0-0 deliverability. A follow-up SLA without an automated first touch is instrumentation of failure.
- **G3 · Chain PRISM → /book with prefill (fold into P1-1).** Today the two are silos: capture → "thanks" → funnel
  resets. Give PRISM's success state one button → `/book?email=<captured>` prefilled. **Tap count: ~6 taps + dead
  end → 3 taps + 1 typing session, booked.** This is the minimal-click win; it only exists if the two features are
  specced together.
- **G4 · Consult reminders + no-show recovery → new P1-2 (outranks P0-3 referral).** T-24h / T-2h transactional
  SMS+email reminders + a no-show → auto-reschedule link. Twilio creds are already in the P0-0 checklist. Each
  recovered no-show ≈ $840+ EV at 10% package close.
- **G5 · Shareable milestone cards → new P2-tier (retention/referral flywheel).** The core loop ends in a
  *shareable milestone* but nothing GENERATES the artifact. Auto-make a milestone card (PR/streak/transformation)
  with the member's `?ref=` embedded — the thing a client posts that sends a warm stranger to PRISM. Existing
  clients are the cheapest acquisition channel; today the plan gives them nothing to share.
- **G6 · SLA-breach escalation (fold into P0-4).** When a hot lead crosses `nextFollowUpAt` untouched, re-alert
  the owner (+ wife per existing env). Otherwise P0-1 just produces a higher-fidelity view of leads rotting.
- **G7 · Trust assets on /book (fold into P1-1).** A stranger deciding to book sees a bare form. Add 2–3 client
  result quotes, the **"26+ years experience / NASM protocol"** phrasing (never "NASM-certified"), and one
  risk-reversal line. S-effort multiplier on all of P1-1's output.
- **G8 · Backlog reactivation (fold into P3-1 arming).** P3-1 arms nurture for NEW captures; the existing null-date
  backlog (that P0-1 backfills) still gets nothing. When Sean arms nurture, include a one-time reactivation
  campaign to open, non-converted leads older than N days — the cheapest already-paid-for revenue in the repo.
- **G9 · Source→revenue attribution (fold into P0-4).** UTM is captured but nothing ties `source → booked → paid`,
  so Sean can't tell which channel produces *clients*, not leads. One more column on the P0-4 weekly number.

**Revised priority:** G1 → G2 → G3 → G4 → G6 → G7 → G5 → G8 → G9. Everything except G5 folds into an existing task
as S-effort. The skeleton was right; it just stopped one step short of money at every step.

## 3. SUGGESTED SEQUENCE FOR ONE BUILDER (corrected)
**V1** (confirm the base is sound) → **P0-0** (deliverability — gate everything on this) → **P0-1** (follow-up SLA
+ backfill) → **P1-1** (booking MVP — the conversion path) → **P0-4** (instrument) → **P0-2** (credential
fallback) → **P0-3** (referral attribution) → hand **P2-1** + **P3-1** to Sean with the evidence you gathered.
Each of P0-0..P0-4 and P2-1 is a small, independently-shippable unit; P1-1 is the one real feature.
Deferred follow-up: **P1-1b** live-slot calendar booking (couples to trainer scheduling — separate slice).

## 4. FOR SEAN ONLY (not the builder's to decide)
- **Arm nurture?** (P3-1) — the single highest-money flip once P0-1 + P1-1 land.
- **Is the NCEP credential current/documented?** (P2-1) — determines whether ~10 files stand or get corrected.
- **Referral rewards economy?** (beyond P0-3 attribution) — a money decision.
- **Flip PRISM on?** — set `PRISM_CAPTURE_ENABLED=true` + `REF_CODE_PEPPER` on Render (a missing pepper hides the
  share ray). Run the PRISM backend vitest in CI first.

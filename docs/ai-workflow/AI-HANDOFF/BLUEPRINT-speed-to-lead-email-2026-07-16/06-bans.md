# 06 — Bans + Fable's Side-Notes for the Builder

## House rules (restated for a context-free builder — violating any = REVISE)
- ≤300 lines per file. No Material-UI ever; styled-components only. No hardcoded
  colors in app UI — `var(--token, #fallback)` (email HTML is the exception: inline
  styles are correct there). 44px minimum touch targets. Dark-first for APP surfaces.
- No "yoga"/"meditation" wording anywhere — "stretching"/"flexibility".
- Credentials copy exactly: `26+ years experience · NASM-protocol training` — the
  string "NASM-certified" must appear NOWHERE.
- Zero PII in committed files/logs: never log full email addresses in new code —
  mask as `j***@domain`. Never commit env values.
- Commit style `type(scope): description`. NEVER `git add -A` (parallel agents share
  this tree) — stage explicit paths. New backend files MUST be committed (untracked
  backend files crash the Render deploy at boot).
- FKs reference `"Users"` (capital-U table) — irrelevant here (no migrations!) but
  binding if you think you need one (you don't — see next section).

## Feature bans (each one is a trap someone could plausibly fall into)
1. **DO NOT create any migration.** `automation_logs.channel` already includes
   'email'; unsubscribe is a JSONB tag. If you believe you need a schema change,
   STOP and return the question.
2. **DO NOT touch the SMS branch, gates, claiming logic, frequency caps, or
   suppression service** in `automationService.mjs`. Your processor edit is the
   email branch swap ONLY (one `if` block) + the DEFAULT_SEQUENCES entry + the
   setImmediate kick. Diff outside those three spots = REVISE.
3. **DO NOT modify `sendgridService.mjs`, `leadCaptureService.mjs`,
   `contactRoutes.mjs`, or `automationCron.mjs`.** Integration happens in the new
   sender module and the three sanctioned automationService spots.
4. **DO NOT activate anything.** `speed_to_lead` seeds `isActive:false`. No env
   flag flips, no test emails to real addresses, no SendGrid calls in tests (mock
   it). Live activation = Sean via the S6 runbook, full stop.
5. **DO NOT install new npm packages.** crypto (node built-in), existing @sendgrid/mail,
   existing test stack cover everything.
6. **DO NOT invent template variables.** `{firstName, unsubscribeUrl}` is the whole
   vocabulary. No `{{lastName}}`, no `{{assessmentDate}}` — that data doesn't exist
   at send time.
7. **DO NOT put the unsubscribe handler below `router.use(protect)`** in
   leadRoutes.mjs — it must be publicly reachable; placement is load-bearing.
8. **DO NOT return non-200 or leak errors from the unsubscribe endpoint.** Both
   outcomes are friendly HTML pages; attackers probing tokens learn nothing.
9. **DO NOT add retry loops.** A failed send = `failed` + reason string, visible in
   preview. Retries are a human decision (retry-loops are a known incident class
   in this system).
10. **DO NOT reformat, "clean up," or annotate code you pass through.** Surgical
    diffs only — every changed line must trace to this package.
11. **DO NOT arm `lead_nurture` and `speed_to_lead` together.** Both trigger on
    `lead_captured`; a lead enrolled in both gets doubled messaging. The S6 runbook
    must state: activating speed_to_lead REQUIRES verifying lead_nurture is
    inactive (it is today), and vice versa forever.

## Fable's side-notes & quirks (the stuff that saves you hours)
- **`automationService.mjs` is large and load-bearing.** Read the SMS send branch
  once, mirror its result-handling exactly, resist improving it. The optimistic
  `pending→processing` claim is what makes concurrent cron ticks safe — your email
  branch lives INSIDE that claim, inheriting its safety for free.
- **`leadCaptureService` never throws — keep the property transitive.** Everything
  you add downstream of contact submission must swallow-and-report, never bubble.
  The prospect's 200 response is sacred.
- **Vitest mocking quirk:** `vi.mock` calls are hoisted; use the
  `vi.hoisted(() => ({...}))` pattern for shared mock fns (you'll see it in
  `availabilityRoutes.test.mjs`). Dynamic `await import()` inside route handlers
  (leadRoutes style) means your test mocks must target the MODULE path, and model
  mocks may need `vi.doMock` before importing the router.
- **Windows line-endings:** the repo emits CRLF warnings on commit — ignore them,
  never "fix" line endings repo-wide.
- **Email HTML is 1999 tech on purpose:** tables + inline styles, no flexbox, no
  external CSS, no images. Gmail clips messages >102KB — you'll be under 15KB.
- **The `automation_logs.leadId` is a soft reference (no FK)** — always
  `findByPk` and handle null lead gracefully (send anyway if recipient exists;
  the unsubscribe check simply passes when lead is null).
- **Masking in the admin card:** mask in the RENDER layer, not the API — the
  preview endpoint is already admin-gated and other consumers may need full
  addresses later.
- **Copy is law:** the three emails in 02-wireframes were voice-locked by Sean in
  the 2026-07-15 grill. Typos included? Build them verbatim anyway and flag in the
  checkpoint notes; do not silently "improve" the writing.
- **Why day 0/2/5 and not 0/3/7:** deliberate — the old sms `lead_nurture` used
  0/3/7; different spacing keeps the two sequences distinguishable in logs, and a
  2-day first follow-up beats 3 for assessment-intent leads. Not yours to retune.
- **The fast-lane kick is idempotent by construction:** it processes DUE rows
  through the same claim; a cron tick racing it loses the claim gracefully. That's
  why we didn't build a separate instant-send path — one choke point, one audit
  trail.

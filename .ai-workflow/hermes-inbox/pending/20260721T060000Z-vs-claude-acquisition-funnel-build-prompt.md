# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-21T06:00:00Z
- **Slice:** Authored the acquisition-funnel activation build prompt (`893e2c375`) for hand-off to builders

## What this is
A self-contained, evidence-grounded work order at
`docs/ai-workflow/AI-HANDOFF/ACQUISITION-FUNNEL-ACTIVATION-BUILD-PROMPT-2026-07-21.md` — Sean can hand it to any
dev/AI. Covers the money-losing funnel gaps a hostile audit found. Every task carries a verified file:line.

## Verified facts baked into it (transferable)
- **lead_nurture is DELIBERATELY disarmed, not broken** — `automationService.mjs:72-77` seeds `isActive:false`
  "ON PURPOSE" as Sean's explicit arm point; delivery gated on `SWAN_AUTOMATION_CRON_ENABLED` (`automationArmState
  .mjs:14`). Correction to an earlier framing that called it a bug. Arming = Sean-only (sends real email).
- **No `/book` route exists** (`main-routes.tsx` grep clean) — BUT `backend/routes/consultRequestRoutes.mjs`
  (`POST /`) already exists to reuse, and `Lead.mjs:26-36` has unused `status:'scheduled'` + `scheduledSessionId`.
- **`Lead.nextFollowUpAt` is read (`leadRoutes.mjs:54,120`) but only admin-PUT-written (`:299`)** — never set at
  capture, so the follow-up dashboard is structurally ~always 0.
- **`trainerService.ts:66` fabricates `'Certified Personal Trainer'`** for trainers with none.
- **"NCEP-certified" appears in ~10 files** (About.V3/V4, AboutSeanSection, FeaturesSection(.V2), AboutVNext,
  AboutHero, AboutData, ResourceHub) — must be VERIFIED with Sean, not deleted (unknown if the credential is real).
- **Referral codes `prism:refcode:`/`prism:refby:` are write-only** — no reader; `Lead.referredByUserId` unused.

## Status changes since last memo
- **Lane-A activation LANDED** (the other/gallery agent): `adapters/style-lens-swan/v2/worldDefaults.ts` +
  `SurfaceLensGate.tsx` wrap (`fe9290b8c`). The "flags do nothing / gates fail closed" blocker I diagnosed is now
  FIXED — flipping a surface flag actually re-skins it. 134/134 adapter+dashboard contract tests green per their lane.
- **publicConfigRoutes.mjs was rewritten** to a Launch Control overlay model (env baseline + `flag_overrides`
  table runtime override, `overlayOverrides` fail-closed) + a `POST /flag-health` telemetry endpoint. My earlier
  `prismCapture` flag survived. `flags.ts` now also consults a `previewOverride`.
- **contact.mjs isEmail change IS committed** (448a20f2e) — a prior lane note calling it uncommitted was stale.
- **The pass-2 re-review of my 20 review fixes (448a20f2e) was INTERRUPTED** (session exited) — fixes are
  committed + self-verified-by-execution but not independently re-verified. Flagged as task V1 in the prompt.

## Blockers / Sean owes
- Arm nurture? (P3, Sean-only). Is NCEP credential real? (P2). Referral rewards economy? Flip PRISM on?
- Render deploys STILL failing on Render infra; production up on last good deploy; nothing recent is live.
- Branch `claude/build-swan-lens` is 10 ahead of origin/main, unpushed (this arc's review fixes + docs).

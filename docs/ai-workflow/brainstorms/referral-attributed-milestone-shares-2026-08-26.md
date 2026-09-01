---
decision: "Referral-attributed milestone shares — the share link carries a referral code that lands as leads.referred_by_user_id"
status: shipped
supersedes: none
---
# Referral-attributed milestone shares (SWA-212 roadmap #2)
Status: complete — shipped as PR #90 · Started 2026-08-26 · Interviewer: Fable 5

## Summary
Acquisition lever: when a client shares a milestone/PR, the share carries a link with a
referral code; a visitor who signs up / contacts / subscribes from it is attributed to the
referrer (`leads.referred_by_user_id`, `source='referral'`) and rolls up in the Marketing
Command Center "Leads by Channel".

## Grounded reality (Rule 18, verified on origin/main 2026-08-26)
- `ShareProofButton.tsx` shares TEXT ONLY (navigator.share → clipboard). No URL → 0 acquisition value today.
- `utils/acquisitionAttribution.ts` reads utm_* + cross-site referrer; sent on newsletter/contact/signup.
- `Lead.referredByUserId` + `leads.source` enum incl. `'referral'` exist; `Lead.belongsTo(User, as:'referrer')`.
- `User` has NO referralCode column; migrations are gated → prefer HMAC-signed code (no schema change).
- Marketing Command Center already shows Leads by Channel + conversion-by-channel.
- Existing `GalleryReferral` is a different thing (event-visitor name/phone referrals) — do not conflate.

## Key Decisions
- D2: no referrer reward in v1 — attribution only.
- D3: HMAC-signed code, no schema change; 30-day first-touch; ShareProofButton only.
- D1: v1 link lands on the homepage with `?ref=<code>`; no new public page.

## Q&A Log
**Q1 — Where does the shared link land?** Recommended: homepage `?ref=<code>` (zero new surface, zero privacy exposure, ships now). **Sean: homepage with ?ref=.** Implication: v1 = wiring only; the public "milestone proof page" is a later slice behind consent + design gate.
**Q2 — Reward for the referrer in v1?** Recommended: none, attribution only. **Sean: no reward in v1.** Implication: no point-system / credit wiring; anti-farm not needed for v1 because nothing is paid out.
**Q3 (decided by Fable, discoverable/technical — flag if wrong):** code = HMAC-signed `ref=<userId>.<sig>` (no migration, unguessable, stable); persisted client-side for 30 days in localStorage; FIRST touch wins (the friend who shared first gets credit); v1 surface = `ShareProofButton` only (`ShareToFeedModal` is the internal feed, not outbound).

## Open Flags
- Reward mechanics for referrer (credits? badge?) — Sean's call; not required for v1 attribution.

## Outcome (2026-08-26)
Shipped as PR #90 (4 commits) off fresh `origin/main`. Not merged — awaiting Sean.

**Activation:** set `REFERRAL_HMAC_SECRET` in Render. Until then the feature is inert by
design (fail-closed), not broken.

**The defect that mattered:** `readAcquisitionParams()` only ran at form submit, so a
visitor landing on `/?ref=` and navigating in-app to signup lost the code. The feature
would have shipped doing nothing. Caught by hostile review of my own slice, not a test.
Fix: `captureReferralOnLanding()` at app boot.

**Findings filed, not fixed:** `origin/main`'s frontend `vite build` has been failing
since 2026-08-24 (`ForgeButton.tsx` imports an unresolvable `@swan/forge/*`). Codex's
lane — untouched. Render's frontend static service runs the same command.

**Deferred:** newsletter attribution (needs a `subscribers` column; migrations gated),
referrer rewards, public milestone proof page.


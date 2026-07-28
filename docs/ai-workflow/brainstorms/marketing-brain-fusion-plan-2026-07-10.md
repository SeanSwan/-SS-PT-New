# Marketing Brain — Fusion Plan & Locked Direction (2026-07-10)

**Status:** Direction LOCKED by Fable 5 (Final Decider). Pre-build. Gate 0 partially run (this doc).
**Privacy:** IDs/roles only — no PII/PHI, no secrets (Rule 8).
**Owner:** Sean. **Process cost:** $0.42 total (free 6-lens synthesis $0 + one Fable ruling $0.4164).

---

## 1. Summary (what this is)
Sean wants to upgrade the in-app admin **Marketing** surface into a next-level, AI-harnessable,
Hermes-tied **autonomous marketing brain** (research → produce → distribute → nurture → measure → learn)
optimized for **autonomous qualified customer acquisition** with minimal clicks — the "money while
sleeping" engine. This doc is the cross-validated, locked build direction produced by:
2 audits (Claude + ChatGPT Pro) → free 6-lens + red-team + realist synthesis → **Fable 5 Final-Decider
ruling** → Gate 0 merge-base reconciliation. It is the permanent build brief; it supersedes the raw audits.

## 2. Strategic frame (why)
- Sean: personal trainer (26+ years, NASM-protocol — NEVER "NASM-certified"), full-stack dev, nature
  photographer. Goal: passive membership + trainer-marketplace income, minimize hands-on work, digital-nomad.
- #1 real gap = **acquisition**. Fastest near-term cash = his own $120–175/hr clients; content compounds
  across every lane. ~6 real users / ~0 social followers **today**.
- Distinctive un-clonable identity: Crystalline Swan (frozen-enchanted-forest) brand == his bird/flower/
  frost nature photography == owned B-roll library. 27-yr expert + photographer + brand in one person.
- Everything must feed **Hermes** (local desktop agent) and be agent-drivable (apps-as-plugins thesis).

## 3. Current architecture (verified, file:line)
- **REAL:** lead capture+CRM (`contactRoutes`→`Lead`+SendGrid/Twilio; `leadRoutes` CRUD/stats/activity/RBAC);
  social publishing **Bluesky only** (`blueskyPublisher.mjs:92`; `marketingPublisherWorker.mjs` 60s auto-publish;
  IG/FB/YT/TikTok = 501); Marketing Calendar (persisted); social analytics/connect; SMS engine (suppression+
  freq caps+atomic claim+arm/disarm, DEFAULT-OFF); newsletter double-opt-in (SendGrid 1:1 only, no broadcast);
  Content Studio + `ContentProject` lifecycle; Oracle research (Trends/YouTube/News/Scholar); Hermes task
  system + declared `marketer` agentType but NO runtime loop (`hermesService.mjs:37` in-memory Map, drops on
  deploy); built-but-UNREGISTERED Postiz client (IG/TikTok/YT/FB payloads ready).
- **MOCK shells (hardcoded, not mounted):** SEOAuditPanel, KeywordResearchWidget, BlogWriterPanel (calls
  nonexistent endpoints), EmailDigestBuilder, CompetitorAnalysisWidget.
- **P0 defects (found vs stale branch — RE-VERIFY vs main):** publish route returns `success:true` even when
  all platforms fail (`adminSocialPublishingRoutes.mjs:178`; frontend reads `data.success` not `data.data.status`);
  immediate posts skip `JobModel.create` (`nativeSocialPublishingService.mjs:271`) → vanish from history;
  compliance warns but never BLOCKS; "Analytics" = publish-status not marketing analytics; marketing E2E
  mocks all APIs (proves nothing).

## 4. Gate 0 — merge-base reconciliation (VERIFIED 2026-07-10)
Current branch `wip/comms-notifications-2026-07-05` = **303 behind / 2 ahead** of `origin/main`.
Both audits + the free synthesis reasoned against this stale branch — a recurrence of the
"verify branch freshness before planning" failure.

**Already shipped on `main`, MISSING on HEAD (do NOT rebuild):**
- `backend/models/MarketingCampaign.mjs` ← the "campaign ROOT" the synthesis called the key missing table. EXISTS.
- `backend/models/ContentProject.mjs`
- `backend/routes/adminMarketingCampaignRoutes.mjs`
- `backend/routes/adminMarketingReadinessRoutes.mjs` (the "Readiness Cockpit")
- `backend/routes/contentStudioProjectRoutes.mjs`
- `backend/routes/social/feedPolicy.mjs`
- (+ tests on main: `marketingCampaign.model.test.mjs`, `adminMarketingCampaignRoutes.rbac.test.mjs`)

**Drifted on `main` (MODIFIED since HEAD — re-read before touching):**
- `backend/models/MarketingCalendarItem.mjs` (the `campaignName`/`campaignId` question — may already be wired)
- `backend/routes/leadRoutes.mjs` (the CRM the whole plan leans on)
- `backend/routes/contentStudioRoutes.mjs`, `social/posts.mjs`, `social/challenges.mjs`, `social/feedEnrichment.mjs`

**Custom-deals branch** `claude/fix-hr007-storefront-special-leak-20260705` = **171 behind / 3 ahead** of main —
its 3 commits carry Sean's $60-effective per-client deal feature but sit on stale ground. Gets the same audit.

**Gate 0 deep-check vs `main` (VERIFIED 2026-07-10, `git show origin/main:`):**
- **The campaign spine is ALREADY being built on `main` in deliberate slices** — not missing, not ours to invent.
  `MarketingCampaign.mjs` header: *"Slice 2 scope: ships the campaign object + CRUD only."*
  `MarketingCalendarItem.mjs:30` on main ALREADY has `campaignId: UUID, allowNull: true // FK → marketing_campaigns
  (Slice 3b); kept alongside legacy campaignName during transition.` → **P0-3 ("campaignId not wired") is
  partially DONE + already sliced on main.** Our plan must CONTINUE main's slice plan (Slice 3b = wire the FK),
  not rebuild it.
- **The publish-truth P0 is STILL present on `main`** — `adminSocialPublishingRoutes.mjs:178-179` still returns
  `success: true` on the publish path. So P0-1 is a REAL fix target on main (validated, not a stale-branch artifact).
- **`AgentRun` ledger: genuinely absent on `main`** — confirmed the single clearly-missing durable table for autonomy.

**Net:** even LESS to build than the synthesis thought. The durable "spine" (MarketingCampaign + ContentProject +
calendar campaignId column) is shipped or in-slice on main; the publish-truth P0 is a real fix; the only clearly-
missing durable table is `AgentRun`. The work is **merge → continue main's slice plan → re-verify → wire → flip**,
NOT a greenfield spine build.

## 5. LOCKED direction (Fable 5 Final-Decider ruling — $0.42, 2026-07-10)

### First epic — RATIFIED with corrections
**Gate 0 (freeze, ~1 hr):** rebase/re-audit onto `main`; enumerate what main ships (done above); audit the
custom-deals branch too; re-derive which P0s still exist vs main; re-read the drifted files.

**Epic 1 — Speed-to-Lead loop (email-only, human-in-loop, ZERO autonomy, ZERO PII to LLMs):**
1. **Deliverability proof FIRST (highest risk, ~30 min, $0):** rotate the flagged SendGrid key; verify
   SPF/DKIM/DMARC pass; send a plain production email to fresh Gmail/Outlook/iCloud seed accounts; read headers
   + inbox placement. Green → build. Red → fix DNS/reputation first. *Nothing else matters until mail arrives.*
2. Instant "new lead scored" owner alert in the lead path (<60s).
3. Day-0/1/3/7 **email-only** nurture — its OWN module (not bolted into `contactRoutes`; 300-line rule).
   CAN-SPAM complete (working unsubscribe + physical address); inlined HEX colors + light-safe render (CSS
   var tokens die in email clients); banned-phrase/credentials filter runs on the EMAIL path.
   SMS strictly gated on `smsConsentStatus='opted_in'` (`SELECT count(*) ... GROUP BY smsConsentStatus` first).
4. ONE "request a consult" CTA → creates `Lead(status:'scheduled')` + a consult **REQUEST pending Sean's
   one-tap confirm** (NOT an auto-`Session` — phantom/double-booking risk unless availability logic verified).
5. **Epic 1a — manual referral seeding (Fable's key catch: the funnel bottom had no inlet):** Sean personally
   asks his ~6 current clients + 10–20 warm contacts for one referral into the existing contact form, timed to
   the week the drip goes live. Zero code, zero dollars, highest conversion at 0 audience.
**DoD:** real (referred) inbound lead → scored → owner pinged <60s → compliant email drip → one-tap consult
request → Sean confirms. Proven end-to-end. No autonomy shipped. No LLM sees a lead's name/message.

### Locked sequence (no reorder)
0. Gate 0 (audit BOTH stale branches; re-verify P0s vs main).
1. Epic 1 amended (above).
2. Ship custom-deals branch (post-audit; Sean = final decider; NO floors/warnings/checkboxes).
3. Gallery event → claim → referral → consult loop (only true 0-audience lead GENERATOR; models exist).
4. Publish-truth P0 fixes (one per-platform status field both UI+agent read; immediate path creates a Job;
   compliance = fail-closed blocking gate w/ recorded override; injected-failing-adapter supertest as regression).
5. 3-clip **Crystalline Form-Check** trial (copy says "26+ years"; de-risks Sean's filming cadence).
6. Postiz adapter behind existing `providerAdapters` → IG Reels/TikTok/Shorts + `providerPostId` metrics poller.
7. Durable `AgentRun` ledger + additive `effectTier` (0-4, default→blocked) executor gate + fail-closed
   spend/volume governor chokepoint.
8. `marketer` worker loop — propose-only, default-off — drafting to an `ApprovalItem` state machine.
9. Attribution as a read view (campaignId → Attempt → converted Lead).
10. Generative-UI "what won this week" — LAST.

### Signature format
**Crystalline Form-Check** (20–40s vertical): cold-open on Sean's bird/frost/flower footage → hard cut to one
perfect-form rep with `seedance-swan-video` anatomy overlay lighting the working muscle in Ice Wing cyan /
Wing Purple → one 26+-year coaching cue most people get wrong → nature metaphor closes. Injury/physiological
claims HARD-EXCLUDED from autonomy (human-approve each). Reusable template over the `ContentProject` lifecycle.

### Highest risk + cheapest de-risk
**Sender-domain deliverability on a domain whose SendGrid key was compromised.** Every metric/DoD/autonomy
decision downstream is poisoned if the drip lands in spam (silent zero throughput read as "doesn't convert").
**De-risk (~30 min, $0):** rotate key → verify SPF/DKIM/DMARC → seed-inbox test (Gmail/Outlook/iCloud) → read
placement. Gates everything.

### DO-NOT-BUILD (ratified verbatim)
New Distribution*/ContentVariant/JourneyEvent/Conversion tables (extend existing `SocialPublishingJob`/
`Attempt`/`Lead`/`ContentProject`); campaignId/spine on the stale branch; any new platform before P0 truth +
a proven format; the `marketer` loop before durable persistence + effectTier gate + governor + P0 fixes;
marketing tools on the boolean `destructive`/`requiresConfirmation` vocab (resolve effectTier first); the 5 demo
shells; analytics from `getHistory` job-status; a "Generate My Marketing" monolith; membership/marketplace
ACQUISITION funnels at 0 audience; a 2nd CRM; custom-package pricing floors/warnings; AI-avatar synthetic-Sean;
Bluesky growth investment; citing the mocked marketing E2E as evidence; Hermes draft-reply until a PII scrubber
ships.

## 6. Open flags (Sean to resolve / carry)
- ROTATE the flagged SendGrid key (deferred 2026-06-14) — GATES Epic 1. Do first.
- Custom-deals branch: pick merge approach (A whole-branch vs B cherry-pick clean — B recommended) after its Gate-0 audit.
- Confirm whether a stranger-reachable consult/booking surface exists today (drip's destination).
- Re-read the drifted `MarketingCalendarItem.mjs` + `leadRoutes.mjs` on main before any wiring.

## 7. Next actions & progress (updated 2026-07-10, end of session)
**DONE this session:** multi-brain plan locked ($0.42); Gate 0 reconciliation; **SendGrid key ROTATED** →
new key `SwanStudiosMainMail` (Mail-Send-only, least-privilege), old leaked `SwanStudios` key deleted,
Render + `backend/.env` updated; **SPF ✅ + DKIM ✅ verified** on `sswanstudios.com` (SendGrid `s1/s2._domainkey`).

**⏳ TODO — SEAN — DMARC (deferred at Sean's request; he must do Namecheap setup first):**
Namecheap → Domain List → **Manage** `sswanstudios.com` → **Advanced DNS** → Add New Record →
`TXT` · Host `_dmarc` · Value `v=DMARC1; p=none; rua=mailto:dmarc@sswanstudios.com; fo=1` · TTL Automatic.
Then: inbox deliverability test (send via live contact form → confirm inbox-not-spam + SPF/DKIM/DMARC = pass).
This is the LAST piece of Fable's "deliverability proof gate" and it gates the Epic 1 drip build.
(Claude can auto-verify propagation on Sean's "done" + trigger the send; only the inbox eyeball is Sean's.)

**NEXT SLICE (actionable now, NOT blocked by DMARC): complete Gate 0 reconciliation + branch decision.**
1. Branch decision (Sean): fresh branch off `main` vs rebase the 303-behind wip branch (Rule 45).
2. (Claude, read-only) audit the custom-deals `hr007` branch's 3 commits; read main's drifted `leadRoutes.mjs`
   + `MarketingCalendarItem.mjs` + `MarketingCampaign.mjs` so Epic 1's real starting point on main is known.
3. Then (once DMARC + inbox test pass): build Epic 1 (owner alert → email-only drip → consult-request CTA) +
   Epic 1a referral seeding.

**Verdict (Fable, verbatim):** "Merge and flip before you build; prove the funnel bottom before you fill the
top; earn autonomy with truth before you grant it."

## 8. Gate 0 reconciliation findings — branch state (VERIFIED 2026-07-10)
- **Working tree on `wip/comms-notifications-2026-07-05` = 835 uncommitted changed files.** Do NOT `checkout`/branch
  here — it would drag or collide with a huge pre-existing WIP set. **Branch decision = fresh off `main`, created in a
  CLEAN WORKTREE off `origin/main`** (house pattern: other agents use `c:/tmp/ss-*` worktrees per their lanes), at
  Epic-1 BUILD time (post-DMARC), NOT now. Rule 67 lanes: Codex "released, EDITING NOW none"; Claude lanes hold
  unpushed equipment-P0 + apex work on other branches/worktrees — no collision with a marketing worktree off main.
- **Custom-deals `hr007` branch is bigger + more entangled than "a clean cherry-pick" assumed.** 3 commits:
  `ec4cea804` + `2aefd4f24` = focused security fixes (HR-007-F1/F3/F4: hide per-client specials from public
  storefront + session-package routes) — cleanly separable; `80af9c3e5` = a LARGE `wip(handoff)` snapshot bundling
  "sub-slice 2 + marketing/specials". Whole branch = **51 files, +17.9k/-13.8k**, and it TOUCHES THE MARKETING
  WORKSPACE: `LeadPipelinePanel.tsx` (+480), `MarketingCommandOverview.tsx` (+486), `marketing.types.ts` (+334),
  plus `admin-specials/*`, `specialOfferService.mjs`, `StoreV3.tsx` (1995), `YourSpecialCard.tsx`.
- **⚠ COMPETING SURFACE (Rule 27): the marketing workspace now exists in 3 divergent versions** — stale `wip` branch
  (what the audits saw), `main`, and `hr007`. **Epic 1 MUST build on `main` and consciously reconcile hr007's
  marketing-panel changes**, or we create a 4th divergent surface. Slice 2 (ship custom-deals): the 2 security
  commits cherry-pick clean; the WIP snapshot needs a deliberate reconcile pass vs main's marketing surface — this is
  MORE than a rubber-stamp merge. Revisit approach A(whole-branch) vs B(cherry-pick) with this entanglement in mind.

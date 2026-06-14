# Marketing Command Center — Deep Audit & Money Plan

**Date:** 2026-06-14  ·  **For:** Sean (CEO)  ·  **Trigger:** acquisition is the #1 business gap (Chromie verdict); audit whether the existing Marketing Command Center can actually generate leads/clients/money.
**Method:** 3 parallel evidence-based subagents (canonical surface map · backend real-vs-stub · acquisition paths + reusable assets). All claims have file:line in the agent transcripts; key ones quoted below. Read-only — nothing edited.

## TL;DR verdict
The Marketing Command Center is a **real, well-built shell with a real CRM data spine — but the money-generating ENGINE is dormant.** It's roughly **40% real / 30% partial / 30% facade.** Today it's a CRM + alerting tool dressed in a marketing-automation UI whose automation doesn't run, and whose social reach is one platform your clients aren't on (Bluesky). **It will not meaningfully get you clients as-is — BUT the gaps are specific, fixable, and mostly cheap, because the foundations are genuinely there.** The fastest money is not new features — it's plugging the holes in what already works.

## Canonical Surface Receipt (rule 26)
- **Route:** `/dashboard/admin/marketing` (admin-only) — mounted JSX in `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:652` (lazy import :144; rendered :986).
- **Component:** `frontend/src/components/DashBoard/workspaces/MarketingWorkspace.tsx` (213 lines) — "Marketing Command Center".
- **5 tabs:** Overview (`MarketingCommandOverview.tsx`) · Approval Queue (`SocialPostGenerator.tsx`) · Calendar (`MarketingCalendar.tsx`) · Leads (`LeadPipelinePanel.tsx`) · Analytics (`SocialAnalyticsDashboard.tsx`).
- **Single canonical surface** — no competing legacy marketing dashboards (rule 27 clean).
- **Dormant secondary tools (built UI, hardcoded demo data, no backend):** SEO Audit, Keyword Research, Blog Writer, Email Digest, Competitor Analysis (`workspaces/marketing/*`). Several >300 lines (rule 4).

## Reality table — what actually works
| Capability | Status | Note |
|---|---|---|
| Lead CRM (Lead/LeadActivity, scoring 0-100, 6-stage pipeline, stats) | **REAL** | `leadRoutes.mjs` full CRUD, DB-backed — but **admin-manual-entry only** |
| Gallery visitor → auto-create Lead | **REAL** | `galleryRoutes.mjs:266` — the ONE automatic public lead funnel |
| Contact form → Contact row + SendGrid email + Twilio SMS alert | **REAL** | `contactRoutes.mjs:75` — **but does NOT create a CRM Lead (siloed)** |
| Public signup, Stripe storefront checkout, Crystalline Link claim, gallery referral | **REAL** | 6 live acquisition channels total |
| Swan Oracle / SerpAPI (Scholar/News/YouTube/Trends) | **REAL** | `serpApiService.mjs` |
| SendGrid + Nodemailer + Twilio (transactional send) | **REAL** | gated on Render env vars — **verify they're set or alerts silently don't fire** |
| First-party web analytics (page views, live visitors, geo) | **REAL** | live-now is in-memory (resets on deploy) |
| Bluesky social posting | **REAL** | end-to-end — but your audience isn't on Bluesky |
| Content Studio (Remotion render queue + Gemini image/badge gen) | **REAL** | `contentStudioRoutes.mjs` |
| Video analytics w/ outbound YouTube-click attribution | **REAL** | closest thing to a content funnel |
| Instagram / Facebook / TikTok / YouTube / Nextdoor **publishing** | **MOCK** | 501 stubs (`oauth_required`/`approval_required`) — the platforms you named |
| Twitter/X, LinkedIn | **MISSING** | not in code |
| Newsletter / email list / broadcast campaigns | **MISSING** | no subscriber list, no ESP marketing API — zero |
| Automation drip sequences | **PARTIAL→DEAD** | queue rows but **no cron drives them → never send** |
| Renewal alerts | **PARTIAL** | real scoring, **no automated outreach, no cron** |
| AI content gen (blog/email/caption/SEO) | **MOCK** | all demo data; no LLM wired; Hermes "Swan Marketer" = placeholder queue, not an agent |
| SMS communication drafts | **MOCK** | fakes `messageId`, sends nothing |
| Google Analytics/GA4, Search Console, Google Business Profile, Ad platforms | **MISSING** | none |

## The 2 load-bearing structural gaps
1. **No automatic execution engine.** `automationService.processScheduledMessages` + `renewalAlertService` are written to be cron-driven but **registered with no scheduler** (`core/startup.mjs:546-556` starts only weekly-challenge + session-reminder + Bluesky/PLAUD workers). So drips queue and never send; renewals only refresh on a manual click. Fix-pattern already in-repo (`sessionReminderCron.mjs` setInterval; BullMQ is a dependency).
2. **Hole at the front of the funnel.** The public contact form (most visible "lead" entry) writes to `contacts`, **not** the CRM `Lead` table. Signup and most public touchpoints don't create Leads either. Only the gallery feeds the CRM. So real prospects never enter the pipeline/scoring/follow-up machinery.

## Honest constraint (set expectations)
"Post to YouTube/TikTok/IG/FB/Twitch/Nextdoor from one place" is **partly gated by the platforms, not just our code:** Meta (IG/FB) requires business verification + app review; TikTok content-posting API requires approval; YouTube has API quotas; **Nextdoor has no public posting API; Twitch is a streaming platform, not a "post" target.** The pragmatic bridge is reactivating **Postiz** (real but currently dead code) as a scheduler rather than building each native integration from scratch. Auto-posting is the slowest, most externally-blocked piece — it should NOT be slice 1.

## Money-Making Action Plan (ranked by ROI — cheapest/highest-leverage first)

### TIER 0 — Stop losing the leads you ALREADY get (days; highest ROI, all on real infra)
- **0.1 Verify `SENDGRID_API_KEY` / `TWILIO_*` / `OWNER_EMAIL` on Render.** If unset, every contact-form lead lands in the DB but **nobody gets pinged** — you could be silently losing leads right now. (config check)
- **0.2 Auto-create + attribute a CRM `Lead` from every public touchpoint** (contact form, signup, gallery, storefront) with source/UTM. Models exist; this is wiring. *Biggest single-leverage fix per the audit.*
- **0.3 Turn the engine on** — register the existing automation + renewal services with a scheduler so drip follow-up and renewal outreach actually fire. Services exist; fix-pattern exists.

### TIER 1 — Get NEW leads + subscribers (the real #1 gap; weeks)
- **1.1 Email list + newsletter:** public subscribe capture → subscriber model → SendGrid broadcast. Highest-ROI owned channel for a trainer; currently zero.
- **1.2 AI content engine:** wire Gemini/Claude into the blog/caption/email/SEO panels (currently demo data) so the "one place" actually generates content fast (your least-time mandate).
- **1.3 Social reach:** Instagram + Facebook first (Meta API or Postiz bridge), then TikTok/YouTube — accepting the platform-approval lead times above.

### TIER 2 — Local domination (a local trainer's true #1 acquisition; ongoing)
- **2.1 Local SEO:** Google Business Profile, reviews engine, local-keyword content. Your own research flagged local SEO as the fastest win for a local PT (golf/wealthy clientele in your area).
- **2.2 Unified funnel attribution:** view → click → lead → paid, in one view, so you know what's working.

## Recommended first slice
**Slice 1 = TIER 0 ("Lead Capture Unification + turn the engine on")** — 0.1 + 0.2 + 0.3 as one tight slice. Cheap, all on real existing infra, and it immediately stops wasting the traffic/leads you already have. Fastest path to money. Build via the normal pipeline: swan-orchestrator (recursive plan) → TDD → Codex hostile review (rule 46), because it touches the lead/money path.

## Next slice (rule 60)
Pending Sean's pick of which tier to build first (recommend TIER 0). Then swan-orchestrator gate before any code.

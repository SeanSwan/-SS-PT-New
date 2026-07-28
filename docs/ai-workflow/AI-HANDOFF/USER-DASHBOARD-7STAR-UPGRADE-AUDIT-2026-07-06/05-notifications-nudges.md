# 05 — Notifications, Comms & Accountability Nudges: 7-Star Upgrade Audit
**Date:** 2026-07-06 · **Baseline:** origin/main @ 87680741e (worktree c:/tmp/ss-audit-20260706) · **Auditor:** Fable 5 domain agent (read-only)
**Scope:** what a client actually receives today (in-app / email / SMS / push), on what triggers; admin delivery health; the missing accountability-nudge engine (centerpiece spec in §6). MAIN only — an unmerged `wip/comms-notifications-2026-07-05` branch exists (§8).

---

## 1. Canonical Surface Receipt (what actually mounts)

**Backend mounts** (`backend/core/routes.mjs`):
- `/api/notifications` → `notificationRoutes.mjs` — GET list / GET count / PUT|PATCH read / read-all / DELETE. Mount: `core/routes.mjs:340` [VERIFIED]
- `/api/notification-settings` + dev-only `/api/test-notifications` → via `routes/api.mjs:33-35`, mounted `app.use('/api', apiRoutes)` at `core/routes.mjs:745` [VERIFIED]
- `/api/admin` → `adminNotificationsRoutes.mjs` (admin list/broadcast/detail/resolve) at `core/routes.mjs:487` [VERIFIED]
- `/api/messaging` → `messagingRoutes.mjs` at `core/routes.mjs:338`; every conversation/message route gated `requireTier('elite','trainer.messaging')` (`messagingRoutes.mjs:28,33-76`) [VERIFIED]
- `/api/sms` (admin manual send) + `/api/sms/webhooks` (Twilio inbound STOP) at `core/routes.mjs:341-342`; `/api/automation` at `:343`; `/api/contact` at `:336` [VERIFIED]
- Legacy `routes/sessionRoutes.mjs` is explicitly NOT mounted — `core/routes.mjs:287` comment "REMOVED … replaced by unified sessionsRoutes" [VERIFIED]

**Schedulers** (`backend/core/startup.mjs`, background block):
- `startSessionReminderScheduler()` — starts UNCONDITIONALLY, `startup.mjs:592-597`; 24h & 1h reminders every 30 min (`services/sessionReminderCron.mjs:17-22,130-141`) [VERIFIED]
- `startWeeklyChallengeScheduler()` — unconditional, `startup.mjs:586-590` [VERIFIED]
- `startAutomationScheduler()` — SMS drip/renewal engine, **default OFF**, requires `SWAN_AUTOMATION_CRON_ENABLED=true` (`startup.mjs:599-605`, `services/automationCron.mjs:84-88`) [VERIFIED]

**Real-time chain** (complete, working): `notificationController.mjs:145` emits `notification:new` + `:153` `notification:count` to room `user:${userId}` → users join that room at `socket/socketManager.mjs:313-315` → header bell listens `EnhancedNotificationSection.tsx:573-580` [VERIFIED]

**Frontend mounts (user role):**
- Header bell: `ActionIcons.tsx:226` renders `<EnhancedNotificationSectionWrapper/>` → `EnhancedNotificationSection.tsx` (redux `notificationSlice`) [VERIFIED]
- User-dashboard Notifications tab: `UserDashboardTabsV3.tsx:38,182` → `DashboardNotificationsTab.tsx:34` wraps `SocialNotificationsPanel` (hook `useSocialNotifications`) [VERIFIED]
- Social page panel: `SocialPage.V3.tsx:572`; social-feed bell `SocialFeedSections.tsx:20` → `NotificationBell.tsx` (own fetch, 30 s poll at `:67`) [VERIFIED]
- Prefs modal: `ScheduleConnectedModals.tsx:115` → `NotificationPreferencesModal.tsx` (email/sms/push toggles + quiet hours, saved to `PUT /api/profile` → `User.notificationPreferences`, `NotificationPreferencesModal.tsx:130-132`) [VERIFIED]
- Admin delivery surface: `ContactNotifications.tsx:79-80` polls `/api/admin/finance/notifications` + `/api/contact` every 30 s [VERIFIED]

---

## 2. Current-State Map

| Surface / file | file:line | Class |
|---|---|---|
| `routes/notificationRoutes.mjs` (user CRUD) | :62-126 | **canonical** |
| `controllers/notificationController.mjs` (`createNotification`, socket emit) | :330-370 | **canonical** — the single in-app write chokepoint |
| `models/Notification.mjs` | :11-89 | **canonical** (drift flags §3) |
| `services/sessionReminderCron.mjs` (24h/1h email+SMS) | :17-141 | **canonical, LIVE** |
| `services/sessions/session.service.mjs` (booking/cancel/reschedule email+SMS+in-app, quiet-hours skip) | :144-201, 2722-2914 | **canonical** |
| `utils/notification.mjs` (SendGrid/Twilio senders, low-balance, deduction emails) | :74-176, 602-642 | **canonical** (legacy naming, still the real sender) |
| `services/notificationService.mjs` (admin email/SMS fan-out + socket) | :12-313 | **canonical** for admin alerts |
| `services/automationService.mjs` + `automationDecisionService.mjs` + `automationCron.mjs` (SMS drip, caps, suppression, quiet hours) | automationService.mjs:88-140, 227-358 | **canonical but DISARMED** (flag off) |
| `services/clientOnboardingFollowUpNotificationService.mjs` (in-app onboarding follow-ups, PII-redacting) | :56-148 | **canonical** |
| `routes/smsWebhookRoutes.mjs` (Twilio STOP → `recordSmsOptOut`, signature-verified) | :31-71 | **canonical** |
| `routes/adminNotificationsRoutes.mjs` (broadcast) | :200-278 | **canonical** (truth issues §3) |
| Header bell `EnhancedNotificationSection.tsx` + `store/slices/notificationSlice.ts` | :529-785 / :138-163 | **canonical** |
| `hooks/useSocialNotifications.ts` (panel + dashboard tab) | :66-123 | **canonical** |
| `Social/Feed/NotificationBell.tsx` (independent 30 s poller) | :52-69 | **competing** — 3rd live consumer of the same API |
| `hooks/useNotifications.ts` | :83-266 | **dormant** — zero component consumers (grep: only its truth test) [VERIFIED] |
| `utils/notificationInitializer.ts` (app-load fetch + 60 s poll) | :13-59 | **dormant** — `initializeNotifications` never called [VERIFIED] |
| `routes/sessionRoutes.mjs` (own quiet-hours + createNotification sites) | :54-76, 1072-1291 | **legacy, unmounted** |
| `components/Header/NotificationSection.tsx`, `NotificationList.tsx` | — | **dormant** (no importer found) [LIKELY] |
| `models/social/enhanced/EnhancedNotification.mjs` (rich model w/ quietHours cols, `createAndSend`) | :459-467, 542 | **dormant** — no non-model importer [VERIFIED] |
| `routes/testNotificationRoutes.mjs` | api.mjs:33 | dev-only (blocked in production) |
| Push notifications (web-push/FCM) | — | **absent** — only a settings mention in `adminSettingsController.mjs` [VERIFIED] |

**In-app notification write triggers today (client-visible):** session reschedule (`routes/sessions.mjs:2143`), session lifecycle via service (`session.service.mjs:991,2729,2761`), orders (`orderController.mjs:83,223`), auth welcome (`authController.mjs:648`), admin client actions (`adminClientRoutes.mjs:371`), onboarding coverage follow-ups (via `clientProfileCoverageUpdateService.mjs:13`), Swan Coach approvals (`coachClientProfileCoverageUpdateApprovalService.mjs:9`), admin broadcast bulk rows (`adminNotificationsRoutes.mjs:239-250`), new-follower (`socialController.mjs:100` — broken, §3). [VERIFIED]

**What a client RECEIVES today, by channel [VERIFIED]:**
- **In-app + socket real-time:** the trigger list above. No workout-derived, streak, or milestone notifications exist.
- **Email (SendGrid → nodemailer fallback):** session booked/cancelled/rescheduled/deduction/low-balance (≤3 credits), 24h+1h reminders, password reset. Contact-form + purchase alerts go to ADMIN.
- **SMS (Twilio):** session lifecycle + 24h/1h reminders when `client.phone` set and `smsNotifications !== false`; drip sequences (welcome/day-1/3/7) exist but the engine is disarmed by default.
- **Push:** nothing.
- **Accountability nudges (missed workout / streak-at-risk / stale 7-14d / milestone / coach-message-unread): NONE on any channel.** Streak rescue exists only as render-time UI (`HomeTab.tsx:111`, `HomeTabProofViewModel.ts:100`) — invisible to a user who doesn't open the app, which is exactly the user who needs it. [VERIFIED]

---

## 3. Data-Truth Check

1. **Follow-notification schema drift → follow likely 500s.** `socialController.mjs:100-107` creates `type:'new_follower'` + `metadata` inside the follow transaction, but `models/Notification.mjs:32` validates `type` isIn `['orientation','system','order','workout','client','admin','session','achievement','reward','measurement']` and has no `metadata` column. ValidationError → `transaction.rollback()` (`socialController.mjs:120-124`) → **the follow itself fails**. Route is live: `gamificationV1Routes.mjs:493`. [LIKELY — needs a rule-55 probe; drift table: `new_follower → not in enum → DRIFT`, `metadata → no column → silently dropped`]
2. **Admin broadcast metrics are fabricated.** `serializeAdminNotification` reports `delivered = sent = audience.count`, `opened = isRead ? count : 0`, `clicked: 0` (`adminNotificationsRoutes.mjs:57-63`). `channels` is stored as metadata only — broadcast never sends email/SMS and never socket-emits (`:238-265`; no `emitNotificationToUser`). Recipients see it only on next bell-open/poll. [VERIFIED]
3. **Unread badge is blind at page load.** Header bell fetches only when the dropdown opens (`EnhancedNotificationSection.tsx:585-589`); socket `notification:count` fires only on NEW creations; the app-load initializer is dormant (§2). A user logging in with 5 unread sees badge = 0. (The user-dashboard tab separately fetches via `useSocialNotifications`; `useNotificationSummary` in `useDashboardQueries.ts:180-193` covers only surfaces that call it.) [VERIFIED]
4. **Quiet hours ignore timezone.** All three evaluators compare `now.getHours()` in SERVER time — Render = UTC (`automationDecisionService.mjs:33`, `session.service.mjs:167`, legacy `sessionRoutes.mjs:54`). `User` model has no timezone column (grep: none) [VERIFIED]. A 21:00–07:00 quiet window set by a Pacific-time client is enforced 8 h off.
5. **Quiet-hours semantics are inconsistent.** Automation **defers** to next allowed time (`automationDecisionService.mjs:96-97`); session service **drops** (returns not-notify, `session.service.mjs:182-201`) — a booking email during quiet hours is never sent at all. [VERIFIED]
6. **`Notification.userId` FK references lowercase `'users'`** (`models/Notification.mjs:70`) — the known dual `users`/`"Users"` production-table gotcha. [VERIFIED, flag only]
7. **Retired Galaxy-Swan palette lives in outbound email**: `#00ffff` inline styles in contact alerts (`contactRoutes.mjs:251`) and the shared wrapper is literally `galaxySwanEmail` (`utils/emailTemplates.mjs:44`). Brand-drift on every email a client receives. [VERIFIED]
8. **Message-unread has no notification event.** `messagingController.mjs` contains zero `createNotification`/socket-emit calls (grep empty) — a coach's message is invisible until the client opens the messaging surface, and messaging itself is Crystalline-tier-gated for clients (`tierCatalog.mjs:179`; admin/trainer bypass in `requireTier.mjs:22`). [VERIFIED]
9. **Good news — the anti-spam substrate is real and tested:** per-recipient rolling frequency cap 3-per-7-days with 24 h defer cooldown (`automationService.mjs:94-140`), fail-closed marketing suppression + Twilio STOP webhook (`automationDecisionService.mjs:88-92`, `smsWebhookRoutes.mjs:51-66`), optimistic-lock claim to prevent double-send (`automationService.mjs:264-271`), dry-run preview (`:366-407`), PII-safe previews. [VERIFIED]

---

## 4. Vision Gap Analysis

7-star for this domain = **the accountability layer of the Core Loop**: the product reaches out at the right moment so the loop (log → proof → next action → share) doesn't depend on the user remembering to open the app. Today the platform is **session-ops-notification complete** (bookings/reminders/receipts are genuinely good) but **coaching-loop-notification absent**:

- Every existing outbound message is calendar- or commerce-triggered. **Zero messages are triggered by workout data** — the first-party record that is supposedly the wedge.
- The next-best-action engine already computes exactly the needed signals (`nextBestActionService.mjs:66-131`: `log_first_workout`, `return_after_gap`, `streak_at_risk`, `balance_pull/push`, `add_variety`, `volume_drop`, `celebrate_streak`, `keep_momentum`) but is **pull-only** (HTTP GET) — nothing schedules it, so its intelligence evaporates unless a coach/user happens to look.
- Trainee activation ("first workout logged + first coach interaction + first progress proof within 7 days") has **no nudge coverage**: the welcome drip is generic SMS copy, disarmed, and not workout-aware.
- Milestones (`celebrate_streak`, badges, PRs) generate no notification and no share prompt → community-loop leak.
- Consent/quiet-hours/caps exist but are fragmented across three implementations with different semantics — a nudge engine must unify, not add a fourth.

---

## 5. Ranked Upgrades

| # | What | Why (Core Loop) | Value/Effort | Acceptance criteria | Click delta |
|---|---|---|---|---|---|
| **P0-A** | **Accountability Nudge Engine v1** (spec §6): nightly + evening ticks evaluate all active clients via `nextBestActionService`, write in-app notifications + (armed) email, through the existing cap/suppression/quiet-hours substrate | Turns progress data into the "next best training action" push — the loop's missing return-path | Very high / M | For a seeded client 8 days stale, tick creates 1 in-app notification (type `workout`, deep link to logger) + 1 email when armed; re-run creates none (idempotent); cap ≤2 nudges/week enforced by test | Streak-at-risk tonight: today = user must self-remember + open app + reach logger (∞ or 3+ taps); after = 1 tap from notification → logger |
| **P0-B** | Fix `new_follower` drift: add missing enum values (`new_follower`,`message`,`milestone`) to `Notification.type` OR map to `'client'`; move create outside the follow transaction | Following is a core community action; today it [LIKELY] hard-fails | High / S | Probe (supertest) proves follow succeeds AND notification row lands; regression test on enum | Unblocks follows (currently broken flow) |
| **P1-A** | **Badge truth at load**: dispatch `fetchNotifications()` (or `/api/notifications/count`) on auth-ready app mount; delete-or-wire the dormant initializer | Unread proof/coach items must be glanceable — 0-click awareness | High / S | Fresh login with N unread shows badge N without opening dropdown; test asserts mount-fetch | See unread: 1 click → 0 clicks |
| **P1-B** | **Coach-message → notification bridge**: `sendMessage` creates in-app notification (type `message`, respects prefs) + socket emit | "Coach message unread" is an activation-critical trigger; today invisible | High / S | Sending a message to offline client creates row + `notification:new`; unread badge increments | Discover coach message: open messaging surface (3 taps, tier-gated) → bell badge (0-1 taps) |
| **P1-C** | **Timezone-true quiet hours**: add `User.timezone` (IANA), migrate evaluators to compare in user tz; unify on DEFER semantics (session-service drop → defer where content still relevant) | Trust: nudges at 3 a.m. kill consent; dropped booking emails lose data-truth | High / M | Unit tests: 22:00 America/Los_Angeles inside 21:00-07:00 window defers; booked-email deferred not dropped | — |
| **P2-A** | **Milestone celebration notifications**: on `celebrate_streak` / badge award / PR (from workoutXpAwardStep outputs), create in-app notification with prefilled **Share** CTA → social composer | Feeds the "shareable milestone" endpoint of the Core Loop | Med-high / M | Streak milestone creates 1 notification (idempotency key = userId+milestone); tapping opens composer prefilled | Share a milestone: today user must notice it themselves + compose (5+ taps) → 2 taps |
| **P2-B** | **Consolidate to one notification client**: single hook/store consumed by header bell, dashboard tab, social panel; retire `NotificationBell` 30 s poller, dormant `useNotifications` + initializer + legacy Header components | 4 implementations = drift risk + duplicate polling load | Med / M | One source of truth; grep proves single `/api/notifications` GET consumer; bundle drops dead files (rule-34 approval first) | — |
| **P2-C** | **Admin delivery-health truth**: real per-channel ledger (extend `AutomationLog` pattern to email/in-app), broadcast socket-emits, metrics from ledger not synthesis | Admin trust surface; "what did clients actually receive" is proof-of-value ops | Med / M | Broadcast shows sent/delivered/failed from rows; failed SendGrid send visibly failed | Verify a send: today impossible → 1 click |
| **P3-A** | Web-push channel (PWA service-worker) behind the same consent/prefs/caps | Reaches users who ignore email/SMS; mobile-app groundwork | Med / L | Push toggle in prefs modal works end-to-end; opt-in only | — |
| **P3-B** | Email-channel automation steps (drip currently SMS-only, `evaluateScheduledMessage` fails `channel_not_implemented`, automationDecisionService.mjs:86) + brand-refresh email templates off Galaxy-Swan | Email-only leads currently unreachable (`lead_nurture` seeded inactive for this reason, automationService.mjs:40-48) | Med / M | `channel:'email'` steps send via SendGrid through same decision gate | — |

---

## 6. Algorithm Spec — Accountability Nudge Engine (EXTEND, don't rebuild)

**Prime directive:** compose three EXISTING assets — (1) `nextBestActionService.mjs` signal computation, (2) `automationService/automationDecisionService` consent-cap-quiet-hours-claim substrate, (3) `notificationController.createNotification` in-app+socket chokepoint. Do NOT write a new decision layer, a new sender, or a new cap system.

**Inputs (all existing):**
- Per-client progress facts consumed by `nextBestActionService` (workout logs/sessions — same source the GET route uses at `analyticsRoutes.mjs:164`)
- `User.notificationPreferences` (email/sms/push/quietHours JSON, `User.mjs:334-338`), `emailNotifications`/`smsNotifications` booleans (`:322-333`), phone/email presence
- `resolveMarketingSuppression` + `AutomationLog` history (caps), `Session` table (planned-session awareness), messaging unread counts (P1-B bridge)
- NEW: `User.timezone` (P1-C), `NudgeLog` table (or `AutomationLog` rows with `channel:'in-app'|'email'`, `templateName:'nudge_*'` — preferred: reuse `AutomationLog`, add `'in-app'` to channel handling)

**Trigger catalog → priority (highest wins, ONE nudge per client per tick):**
| Trigger | Detection | Window | Channel ladder |
|---|---|---|---|
| `missed_planned_workout` | planned/scheduled session date passed, no matching workout log within 24 h | next-morning tick | in-app → email |
| `streak_at_risk_tonight` | `streak_at_risk` code from nextBestAction AND local time ≥ 17:00 AND no log today | evening tick (17:00-20:00 local) | in-app → SMS (highest urgency, opt-in) |
| `stale_7d` | `return_after_gap` with gap ≥ 7d | nightly | in-app → email |
| `stale_14d` | gap ≥ 14d (escalation; also notify trainer — cross-domain) | nightly | email + trainer in-app |
| `milestone_celebration` | `celebrate_streak` / badge / PR event | event-driven (not tick) | in-app (+ share CTA) |
| `coach_message_unread` | unread message > 24 h old | nightly | in-app → email |
| `activation_day3_no_first_log` | account age 3d, zero workout logs (`log_first_workout`) | nightly | email |

**Pseudocode (tick):**
```
runNudgeTick(kind):                            # kind ∈ {nightly, evening}
  if !isNudgeEngineArmed(): return             # own flag SWAN_NUDGE_ENGINE_ENABLED, kill-switch like automationCron
  for client in activeClients(batch):          # role=client, recent activity or active package
    signals = computeNextBestAction(clientId)  # existing service — EXTEND with a programmatic entry point
    trigger = highestPriorityTrigger(signals, kind, localTime(client.timezone))
    if !trigger: continue
    idemKey  = `${clientId}:${trigger}:${bucket(trigger)}`   # bucket: day for evening, ISO-week for stale
    if AutomationLog.exists(idemKey): continue               # idempotency — never re-nudge same bucket
    log = AutomationLog.create(pending, channel per ladder, templateName=`nudge_${trigger}`, payload={cta deep link})
    # delivery: the EXISTING processScheduledMessages claim→evaluate→send loop, with two additions:
    #   evaluateScheduledMessage learns channel 'in-app' (send = createNotification, exempt from quiet-hours defer? NO —
    #   in-app rows are silent, deliver immediately; quiet hours gate only email/SMS/push)
    #   resolveFrequencyCap reused as-is → nudges + drips share ONE weekly cap (default 3/7d, env-tunable; recommend
    #   SWAN_NUDGE_MAX_PER_WEEK=2 sub-cap for nudge templateNames)
```
**Consent & anti-spam (all existing, verified §3.9):** suppression checked FIRST fail-closed; per-channel prefs; quiet-hours DEFER in user tz; rolling cap defers never drops; STOP webhook kills SMS; prefs modal (`NotificationPreferencesModal`) is the user-facing opt-out surface — add a per-category "accountability nudges" toggle to the same JSON (`notificationPreferences.nudges !== false`).
**Outputs:** in-app `Notification` rows (type `workout`, `link` deep-linking to logger/composer/chat), email via `sendEmailNotification`, `AutomationLog` ledger rows (delivery health feeds P2-C), and a `nudgeContext` echo the Home tab can read so UI rail and outbound nudge always agree (single source: nextBestAction codes).
**Feeds back into next-best-action:** nudge send/response history (did they log within 24 h of nudge?) becomes a `nextBestActionService` input for tone escalation (gentle → direct → trainer-escalation) — extend the candidates list, never fork the service.

---

## 7. Cross-Domain Dependencies & Sequencing

- **Social/community domain:** P0-B (`new_follower` enum fix) unblocks the follow flow that domain owns; milestone share CTA (P2-A) lands in the social composer — coordinate payload shape.
- **Next-best-action / progress domain:** engine needs a programmatic (non-HTTP) entry to `nextBestActionService` + `nudgeContext` echo; extend-only per KNOWN TRUTH #1.
- **Workout write path:** milestone events should hook the shipped `workoutXpAwardStep.mjs` (idempotent, form-id keyed) rather than re-detecting milestones.
- **Trainer/admin command center:** `stale_14d` trainer escalation should surface in the shipped client command center (Today/Plan/History) and `HighRiskClientsWidget`; renewal urgency scoring already exists (`renewalAlertService.mjs:26-52`) — reuse its inactivity math.
- **Monetization:** messaging tier gate (Crystalline) conflicts with "first coach interaction within 7 days" activation — flag to strategy/monetization domain: consider free client↔assigned-trainer DMs, paid for everything else.
- **Sequencing:** P0-B → P1-A/P1-B (small, independent) → P1-C (timezone column is a migration; do before engine goes wide) → P0-A engine (in-app channel first, flag-off; email second; SMS last) → P2s.

## 8. Do-Not-Touch (active lanes)
- **`wip/comms-notifications-2026-07-05` branch** (132 behind / 1 ahead of main; the 1 commit is pain-chart WIP per FABLE-VISION-REBUILD-DEEP-AUDIT-2026-07-05.md:22) — design everything here to COMPOSE: no renames of `notificationController`, `notificationSlice`, `useSocialNotifications`, or the `/api/notifications` contract until that branch is reconciled.
- Workout logger UI/flow + exercise-picker (Phase-1 build lane) — nudge deep links point AT it, never modify it.
- Stripe/storefront checkout internals (Codex lane) — order notifications stay as-is.
- Hermes/Pi operator work; `sessionReminderCron` + `automationService` core send loop (recently hardened w/ claim locks — extend via new templateNames/channels, don't restructure).
- Do not arm `SWAN_AUTOMATION_CRON_ENABLED` or seed `lead_nurture.isActive=true` — owner-gated decisions (automationService.mjs:40-48).

---
decision: Packet for GLM-5.3 and GLM-5.3-Flash — review Fable 5.1's hostile review of the SwanStudios money lane, then produce a zero-decision build blueprint that Opus 5 executes verbatim.
status: open
supersedes: none
---

# GLM PACKET — SwanStudios money lane, blueprint request

## 0. Who you are and what is wanted

You are being asked for TWO things, in this order:

1. **Review the review.** Fable 5.1 hostile-reviewed the plan below and produced nine findings (§5). Attack them. Which are wrong? Which are under-stated? **What did Fable MISS?** Absence-first: name what SHOULD be in this plan and is not.
2. **Produce the build blueprint.** Comprehensive enough that a builder executes it **without making a single design decision**. If a builder would have to ask a question, the blueprint is incomplete. That is the bar.

The builder is Opus 5. It will follow your plan literally. **Any ambiguity you leave becomes a defect it ships.**

## 1. The person and the stakes

Sean is a personal trainer, 26+ years, NASM-protocol (never "NASM-certified"). He is mid-transition: working at a gym for low wages while building independent clientele. He said tonight, verbatim: *"I'm fucking poor. We need to make this shit crack."*

**Therefore: sequence by revenue.** A feature that prevents a loss ranks below one that creates income. A feature that creates neither ranks last regardless of how interesting it is. If your blueprint's ordering does not reflect this, it is wrong.

SwanStudios is a production personal-training SaaS on Render (sswanstudios.com). React 18 + TypeScript + styled-components frontend; Node/Express + Sequelize + PostgreSQL backend.

## 2. VERIFIED FACTS — established tonight by execution. Do not contradict these; build on them.

Each was proven by a command run this session, not recalled.

| # | Fact | How proven |
|---|---|---|
| F1 | Production DB FKs are correct: **238 FKs target `"Users"`, ZERO target lowercase `users`** | `backend/scripts/fk-targets.mjs` against `host_class=RENDER, db=swanstudios, PostgreSQL 16.14` |
| F2 | The `20260730120000-repoint-user-fks-to-canonical-Users` migration **is recorded in `SequelizeMeta`** and present on `origin/main` | direct query + `git cat-file -e origin/main:<path>` |
| F3 | `POST /api/cart/add` on production returns **401** unauthenticated → route is mounted and guarded | `curl -X POST https://sswanstudios.com/api/cart/add` |
| F4 | Cart routes on `origin/main`: `GET /`, `POST /add`, `PUT /update/:itemId`, `DELETE /remove/:itemId`, `DELETE /clear`, `POST /checkout`, `POST /cancel-checkout`, `POST /webhook`. Mounted at `backend/core/routes.mjs:365` via `app.use('/api/cart', cartRoutes)`. Guard chain on `/add`: `protect, cartMutationLimiter, ensureNumericCartUser, validatePurchaseRole` | `git show origin/main:backend/routes/cartRoutes.mjs` |
| F5 | Frontend cart callers: `CartContextProvider.tsx:67` calls `/api/cart`, `:138` calls `/api/cart/add`, `:213` calls `/api/cart/clear` | `git grep` on `origin/main` |
| F6 | **Blocked time already exists end-to-end.** `Session.isBlocked` BOOLEAN, comment "Whether this session represents blocked time"; `BlockedTimeModal.tsx` posts to `/api/sessions/block` | model file + component read |
| F7 | UniversalMasterSchedule is **mounted** (Rule 26 — JSX, not import): `frontend/src/routes/main-routes.tsx:891` renders it; also `components/Schedule/UniversalSchedule.tsx:61` | grep for JSX usage |
| F8 | UMS scope: **295 files, ~41,000 non-test lines** | find + wc |
| F9 | `Session` model columns include: `sessionDate` (DATE), `endDate`, `duration`, `sessionTypeId`, `bufferBefore`, `bufferAfter`, `userId`, `trainerId`, `location`, `locationId`, `clientName`, `notes`, `reason`, `isRecurring`, `recurringPattern` (JSON), `recurringGroupId` (UUID), `recurrenceRule` (STRING), `notifyClient`, `isBlocked`, `status` (STRING with `SESSION_STATUSES` validator, default "available"), `cancellationReason`, `cancellationDate`, `cancelledBy`, `bookingDate` | `backend/models/Session.mjs` |
| F10 | **MindBody prohibits automated access** in all three agreements (Consumer Agreement, Terms of Service, Developer Agreement) — bans "robot, spider, scraper" and "screen scraping, extracting, or data mining" | vendor legal pages read |
| F11 | MindBody **does** offer a staff calendar sync: a **"Generate a schedule link"** subscribable iCal URL; changes propagate in ~15 min; it is **per location**; it **cannot be generated from an owner account** | MindBody support documentation |
| F12 | DMARC is **published**: `_dmarc.sswanstudios.com` returns `v=DMARC1; p=none;`. SPF includes `sendgrid.net` | live DNS query |
| F13 | `miniswan` (the second PC) = **Windows 11 Pro 26100, RTX 4080 SUPER 16GB, 111GB RAM, ~498GB free**. **Bare**: no WSL, no Node, no Python (Store stub only), no Docker, no git. Sleeps at 20 min idle | SSH probes |
| F14 | **SSH runs in Windows session 0; the interactive desktop is session 1.** `rundll32 user32.dll,LockWorkStation` over SSH returns success and does nothing. A scheduled task created with `/IT` does work | executed, measured by LogonUI process count |
| F15 | `sshd` and `tailscaled` on miniswan are LocalSystem/Auto, up **14s after boot** → the Windows lock screen does not gate SSH | service query + live lock test |
| F16 | Wake-on-LAN **from sleep** works (~20s to SSH). **From full-off (S5): unproven** | magic packet fired in both states |
| F17 | Hermes' brain is **already** `qwen3.8-ctx131k` (Qwen3.8-27B dense, vision, MTP, q4) on the 5090, with `fallback_providers: []` (fail-closed) | config read on the box |

## 3. UNKNOWNS — do not resolve by assumption; design so the answer can be filled in

* **U1 — the cart-500.** A memory dated 2026-09-01 records "authenticated `/api/cart` 500 on homepage load; anon = clean 401; reproduce with fresh login before fixing", and separately that **the cart-500 handler logs no message or stack**. **No one has run the authenticated repro.** F3 proves only that the unauthenticated guard works. Whether a logged-in client can complete a purchase is **UNKNOWN**.
* **U2** — whether Swan Coach's `schedule_session` command is safe to build on. CLAUDE.md records it as having "wrong semantics in live code."
* **U3** — llama.cpp MTP speculative-decoding support for the Qwen3.8-Flash-Next architecture.

## 4. The four workstreams

**A. Cart / purchase path (SWA-92 closed; U1 open).** Schema is proven correct (F1/F2). The open question is whether an authenticated client hits a 500. If yes: fix it, and add observability first — a handler that logs neither message nor stack cannot be debugged twice.

**B. Marketing TIER 0 (SWA-14 / SWA-29 / SWA-48).** From `MARKETING-COMMAND-CENTER-AUDIT-2026-06-14.md`, verdict roughly 40% real / 30% partial / 30% facade. Surface: `/dashboard/admin/marketing` rendering `MarketingWorkspace.tsx`. **Named gaps:** (1) public touchpoints (contact form, signup) do not create CRM `Lead` rows — only the gallery funnel does; (2) automation drip and renewal services exist but **no scheduler runs them**; (3) social posting works only for Bluesky (IG/FB/TikTok/YT/Nextdoor are 501 stubs, partly gated by the platforms themselves); (4) there is no email list; (5) blog/caption/SEO/email AI panels render demo data with no LLM wired. **This is where leads are being lost today.**

**C. Ghost Schedule (SWA-235).** External-job commitments overlaid on the Universal Master Schedule so Sean cannot book a SwanStudios client into an hour he is on the gym floor. Sourced from F11's iCal link. **Sean's framing makes it a product**, not a personal patch: an option for any trainer working a gym on the side — precisely the trainer-led B2B2C wedge in `BEST-IN-CLASS-TRAINING-APP-STRATEGY.md`. Required behaviour: (1) visually distinct on the calendar; (2) toggle on/off; (3) **conflict warning** when booking over ghost time — warn, do not hard-block; (4) the same calendar, not a second one to check.

Fable's design recommendation, for you to attack: **a separate table, NOT `Session.isBlocked` rows** — because ghost blocks are derived data re-synced wholesale, and a delete cursor over `Session` puts a paying client's booking one parser bug away from deletion. Proposed: `external_schedule_sources` (owner, label, feed URL as secret, enabled, last_synced_at, last_error) and `external_schedule_blocks` (source_id, external UID, start, end, title, synced_at).

**D. Approval bridge.** Sean wants: SwanStudios drafts a client message, notifies him by **text and email**, he approves from **either the app or Telegram**, and it sends. **A dormant rail exists:** `communication_drafts` plus a mounted `/api/trainer/drafts`, with the model in `dormantModels.mjs` (likely throws on call) — so this is a **re-activation, not a build**. Ratified doctrine: the agent drafts, the SwanStudios app sends, Sean approves. Send credentials never live on an agent box.

**Explicitly out of scope for SwanStudios:** YouTube and social. Sean: "this site needs to just be focusing on the client." Those belong to SWA-234.

## 5. Fable 5.1's nine findings — attack these

* **H1 (blocker)** — nothing in the plan makes money in 30 days, and U1 has never been reproduced. Sequence revenue-first.
* **H2** — the SWA-92 closure survived re-verification (F1/F2), but proves schema, not a completed purchase.
* **H3** — Ghost Schedule would ship with five defects: **(a) RRULE** — gym shifts recur; a naive `VEVENT` parser imports the first occurrence only, so the ghost schedule shows empty on exactly the days Sean works. RRULE + EXDATE expansion over a bounded window is mandatory. **(b) timezone/DST** unspecified — iCal carries `TZID`, `Session.sessionDate` is UTC. **(c) the conflict check must be server-side**, at the booking write path — a UI-only check is bypassed by the API, `BulkSessionCreator`, and Swan Coach. **(d) overrides need an audit trail.** **(e) the feed URL is a capability secret** — encrypt at rest, never log it (including in `last_error`), never render it back.
* **H4** — approving from Telegram or the app crosses the Hermes/SwanStudios boundary CLAUDE.md forbids blurring. Needs one approval record with an **idempotency key**; Hermes is a relay calling a scoped API, never a second decision-maker. Without the key, approving on both channels double-sends.
* **H5** — `schedule_session` is recorded as broken (U2); fix or exclude it before Coach books on ghost time.
* **H6** — "miniswan reads the 5090's vault" is decided but has **no transport designed**. Consequence to state plainly: the 5090 must be on for miniswan to have memory.
* **H7** — with MindBody on iCal, nothing in the money lane needs the 4080 awake. Power pattern: Task Scheduler "wake to run" plus WoL-from-sleep (F16).
* **H8** — polling a subscription URL at calendar-client cadence (hourly) is using F11 as designed; residual risk low, not zero.
* **H9** — the 41k-line UMS audit (F8) must be scoped to conflict detection, the booking write path, blocked-time handling, timezone, and `schedule_session`.

## 6. Hard constraints — a blueprint violating any of these is rejected

1. **No Material-UI.** styled-components only, with the `var(--token, #fallback)` pattern.
2. **No hardcoded colors.** Palette: Midnight Sapphire `#002060`, Ice Wing `#60C0F0`, Wing Purple `#8B5CF6`, Gilded Fern `#C6A84B`, Frost White `#E0ECF4`, Obsidian `#0A0A0F`. Dark-first. Dual-Button Glow: blue background gets purple glow, purple background gets cyan glow.
3. **44px minimum touch targets. WCAG 4.5:1 contrast.**
4. **Max 300 lines per file.** Extract hooks, utils, styles, types.
5. **Zero PII to LLMs** — IDs and roles only.
6. **Charts: Victory only.** No Recharts.
7. **Migrations carry irreversible risk.** No `sync({force`, no unbounded DML, every migration reversible, FKs reference `"Users"` (F1).
8. **Responsive matrix:** 320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920 / 2560x1440 / 3840x2160.
9. **Privacy — employer calendar data.** A gym's feed may carry **that employer's** client names. Those people never consented to SwanStudios holding their data. Default: store times only, render "Busy", discard titles; importing titles is an explicit opt-in.

## 7. REQUIRED DELIVERABLES — the output contract

Produce ALL of the following. A section you skip is a decision the builder has to invent.

1. **Review of Fable's nine findings** — for each: AGREE / DISAGREE / INCOMPLETE, with reasoning. Then **absence-first gap analysis**: what is missing from this entire plan that should exist, ranked by value or money left on the table.
2. **Recommended build order**, revenue-first, with reasoning stated. You may overrule Fable's ordering — say why.
3. **Per workstream you blueprint (C and D at minimum; A and B if you judge them higher-value):**
   * **Mermaid flowchart** of the runtime flow: UI to API to service to DB to response.
   * **Mermaid ERD** for any new tables — exact column names, types, nullability, FK targets, indexes.
   * **Wireframes, desktop AND mobile**, as ASCII or markdown. Name every control and every state (loading / empty / error / success), and the 44px targets.
   * **Exact API contract** — method, path, auth guard chain, request body with types, every response shape including error codes.
   * **Migration SQL**, exact, forward and reversible. FKs reference `"Users"`.
   * **Numbered, independently shippable slices.** Each slice: files touched (exact paths), acceptance criteria, and the command that proves it.
   * **Test matrix** — file path, what each test asserts, and the fixture it needs. Include the RRULE fixture (H3a) and a DST-boundary case (H3b).
4. **Failure modes** — at least three concrete ways each workstream fails in production, and the guard for each.
5. **Explicit open questions for Sean** — only where a decision is genuinely his (pricing, tier gating, product judgment). Do NOT punt engineering decisions to him.

## 8. Rules for your output

* **Zero-decision bar.** If Opus 5 would have to ask you a question, that section is incomplete.
* **Ground every claim in section 2 or mark it `[ASSUMPTION]`.** Do not invent file paths, column names, or endpoints — the verified ones are listed; anything else must be marked as new.
* **Do not restate this packet back to me.** Produce the deliverables.
* **Where you disagree with Fable, say so directly** and give the evidence. The review is input, not doctrine.

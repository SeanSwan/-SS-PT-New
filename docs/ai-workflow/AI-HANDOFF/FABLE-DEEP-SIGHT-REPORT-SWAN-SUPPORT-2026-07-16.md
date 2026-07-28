# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/FABLE-DEEP-SIGHT-PACKET-SWAN-SUPPORT-2026-07-16.md
**Seed:** (none)
**Tokens:** 5975 in / 13623 out · **Cost:** ~$0.7409 · **Wall:** 210.0s

---

# FABLE 5 — DEEP-SIGHT FINAL RULING
## SwanStudios Voice-First Issue System — Pre-Build Gate

---

## 1. VERDICT: `LOCK-WITH-CHANGES`

The packet is unusually strong: it has real file:line evidence, it correctly identifies that no issue domain exists in the repo, it separates the customer report from the agent brief, and it pre-declares failure states most teams discover in production. But it cannot be locked as-is because it contains one unresolved structural collision and two unpriced risks. The structural collision: the packet mandates "zero PII to LLM" while designing a system whose primary input is spontaneous human speech — the single richest PII channel in the product — and then routes that transcript through an LLM clarification loop before redaction is defined. The unpriced risks: (a) the transcription endpoint's relationship to the subscription gate at `backend/routes/aiChatRoutes.mjs:466` is asserted-safe but unverified for the `:895` transcribe handler, and support intake must be provably ungated; (b) the copy-ready agent brief is a prompt-injection conduit from any anonymous internet user directly into Sean's engineering agent, and the packet never mentions it. These are fixable by decree, not redesign, so the ruling is LOCK-WITH-CHANGES with the amendments below binding.

---

## 2. Best Product Shape

**Name and concept: "The Report Room" — internally; customer-facing label "Help & Support" with primary action "Report a Problem."**

- **Client-facing names (locked):** Nav entry: **Help & Support**. Flow: **Report a Problem**. History: **My Reports**. Never "ticket," never "bug tracker," never "issue" in customer copy.
- **Admin-facing name (locked):** **Issue Command Center** at `/dashboard/admin/issues`.
- **Placement (locked):** The shell navigation owns the entry — one labeled Help & Support item in both `ClientStellarSidebar.tsx` and the `/user-dashboard` home surface (`ClientDashboardHome.sections.tsx:100` already has a dead "Help Center" entry begging for this target). Swan Coach gains an explicit **Report a Problem mode** as a third client tab alongside `talk`/`history` (requires amending `CoachCommandCenter.roleConfig.ts:10`). Error boundaries gain a "Report this problem" action. `/support` becomes a real public route, and the dead `/help` footer link (`CompactFooter.tsx:81`) redirects to it. **No floating beacon.** The packet's instinct is right: if the shell owns the action, a mystery bubble is clutter and a mobile-occlusion hazard.
- **Emotional job:** "Someone competent is listening, and I don't have to translate my problem into their language." The user's obligation ends at *speaking honestly*. The system's obligation is everything after.
- **Signature interaction (locked):** The spoken narrative visibly *resolving* into the editable three-panel report card — **What happened / What you expected / Impact** — with the user's own words preserved as the source of truth and the structure layered on top, never replacing it. This is the moment that separates a concierge from a form. Reduced-motion variant: the card sections populate with a simple fade-free state change, no morph animation.

---

## 3. Missing Gaps (Absence-First)

### Critical
1. **Raw audio retention policy is undefined.** Does the recording persist after transcription? For how long? Where? Voice is identifying data. Nothing in the packet answers this. **Amendment: raw audio is deleted within 24 hours of a user-confirmed transcript, and never sent to the brief-generation LLM.**
2. **The clarification loop sends unredacted speech to an LLM.** Section 4, step 5 has Swan Coach ask follow-ups on a transcript the user may have filled with names, health context, or payment fragments — before any redaction step exists in the flow. This violates the house rule as written. **Amendment: v1 follow-ups are deterministic (templated questions keyed off missing structured fields), not LLM-generated. LLM touches only the post-redaction text.**
3. **Prompt injection into the agent brief is unaddressed.** Any user — including anonymous ones — can write "ignore prior instructions and…" into a report that Sean copies into a coding agent. **Amendment: the brief template must fence all user-originated text inside clearly delimited quoted blocks with a fixed header instructing the receiving agent to treat it as untrusted data, and the Command Center must display an injection-awareness banner above the copy action.**
4. **Transcription gating is unverified.** The packet shows `:466` gates conversation and `:895` handles transcription, but never proves `:895` is outside the gate. **Verify during implementation before any voice slice; if gated, mint a separate ungated `/api/support/transcribe` with its own quota.**

### High
5. **No transcription cost/abuse ceiling.** Support is free for all accounts and partially open to anonymous users; audio transcription is metered compute. No per-user, per-anon-token, or per-IP quota is specified. Must be numeric in the builder prompt.
6. **Local draft persistence privacy.** Section 8 requires draft preservation offline, but drafts contain potentially sensitive spoken content. Shared-device risk. Lock: authenticated drafts in IndexedDB, purged on submit and on logout; anonymous drafts session-scoped only.
7. **Anonymous status loop is undefined.** An anonymous reporter with a contact token — how do they check status? Email capture flow, token format, and enumeration-safe lookup are all unspecified.
8. **Notification delivery is assumed, not evidenced.** "Reuse notification patterns" has no file:line backing. Verify the actual notification/email infrastructure exists and works before promising customers status updates.
9. **Admin authorization matrix is missing.** Which roles see billing, privacy/security, and health-adjacent reports? A trainer with admin-shell access must not see billing disputes. Lock: security/privacy/billing categories are Sean-role-only at launch.

### Medium
10. **Screenshot PII.** Attachments (screenshots especially) can contain other people's data; the packet scans for malware but not for content. Lock: attachments never go to any LLM, EXIF is stripped on ingest, and access is signed-URL, admin-only by default.
11. **SLA realism.** The analytics/SLA suite assumes a support team. Sean is one person. Timers should exist but default targets must be honest (e.g., first response 2 business days) or the dashboard becomes a shame machine.
12. **Language handling.** Non-English speech: does transcription support it, and does the brief note the source language? Verify provider capability; at minimum, label transcript language.
13. **Multi-tab/duplicate-submit beyond idempotency key** — define key scope (per draft ID, not per session).
14. **Known-issues/status surface** — customers reporting a known outage should see it before submitting. `DEFER`, but reserve the Incident linkage now.

---

## 4. Voice-First Experience (Locked)

**Record interaction ruling: tap-to-start / tap-to-stop toggle. Not hold-to-talk. No dual mode at launch.** Hold-to-talk fails motor-impaired users, fails screen-reader interaction models, fails when the phone ring interrupts, and fails long narratives (people describe problems for 60–90 seconds). One interaction, one mental model.

**Locked state machine:** `idle → permission-request → recording → (paused ⇄ recording) → stopped → transcribing → transcript-review → clarify (max 3 deterministic questions) → preview → submitting → receipt`. Every state has a visible label, a keyboard path, and an `aria-live` announcement.

**Desktop flow:** Help & Support → Report a Problem. Primary control is a ≥56px microphone button (house minimum for this control per packet §9), Ice Wing level feedback, elapsed timer, pause/stop/cancel always visible. Transcript renders progressively or after stop (depending on provider); user edits inline. Report card resolves beside the transcript. Preview shows *exactly* what will be sent, including consented diagnostic context as a removable chip list. Submit → immediate report ID → My Reports link.

**Mobile flow (primary platform):** Same machine, full-screen sheet. Microphone control anchored above the keyboard safe area, never under it. Transcript is a single scroll region — no nested scrolling. Attachment and context steps are sequential cards, not a side-by-side layout. All targets ≥44px; primary mic ≥56px.

**Recording constraints (locked):** max 3 minutes per segment with a visible countdown in the final 30 seconds; user may record additional segments. Interrupted recording (call, tab blur) auto-pauses and preserves audio captured so far.

**Manual fallback (locked):** "Type instead" is visible from the idle state — never buried behind a failed voice attempt. It opens a single plain-language textarea; structured fields (category, impact) reveal after first text is entered. Switching voice→text mid-flow preserves the transcript as the textarea's starting content.

**Accessibility (locked):** full keyboard operation of record/pause/stop; `aria-live="polite"` for state changes and `assertive` for failures; focus restoration after each modal/sheet transition; reduced-motion replaces waveform with a static level bar plus timer; 200% zoom reflow without loss; visible focus rings on Wing Purple tokens via `var(--token, #fallback)`.

**Failure recovery (locked):** permission denied → inline guidance + immediate text path, draft intact. Transcription failure/timeout/low confidence → banner offering retry (audio retained locally until success or discard) or text path with nothing lost. Offline → draft persists locally, idempotent retry on reconnect, one report ID ever. Attachment failure → submit proceeds without it, failure noted. AI unavailable → raw report submits fully; the *brief* is what degrades, never the report.

---

## 5. Enterprise Support Architecture (Locked)

**Customer request vs. internal work item — hard boundary.** `IssueReport` is the customer's artifact: their words, their status view, their replies. `IssueAgentDraft` is the internal engineering artifact. Customers never see drafts, internal notes, suspected code areas, or severity reasoning. The two share an ID lineage but never a rendering surface.

**Launch lifecycle (locked, trimmed):** `New → Needs Information → In Progress → Resolved → Closed`, plus `Duplicate` as a terminal-with-link state. `Triaged`, `Accepted`, and `Cannot Reproduce` are deferred — with one operator, "Triaged" is ceremony, and "Cannot Reproduce" can launch as a Resolved sub-reason. Customer-visible status labels are plain-language mappings ("We're looking into it"), not internal enum names.

**Ownership:** assignee field exists from day one (defaults to Sean) so the schema doesn't need migration when a team exists. Priority: internal-only, four levels, suggested by rules (category + impact + frequency), never auto-committed.

**SLA:** first-response and resolution timers with honest defaults (first response: 2 business days; high-impact: same day), aging badges in the queue, no automated escalation actions at launch — escalation is a visual state, not a bot.

**Notifications:** customer receives receipt, Needs-Information requests, public replies, and resolution summary through the existing notification pathway (verify infrastructure — Gap #8) with email where available. No notification content ever includes internal notes.

**Duplicate/incident/problem handling:** launch with *manual* duplicate marking plus a lightweight fingerprint hint (route + category + build hash) surfaced as a "possibly related" panel in the Command Center. `Incident` grouping ships as schema + manual linkage only; automated clustering is `DEFER`. When a user's submission matches an open incident, offer "add my report to this" — their impact counts, their report survives.

**Analytics (launch subset):** backlog age, category volume, affected route/build counts, unresolved high-impact count. Time-to-first-response and reopen-rate dashboards: second slice. All computed from `IssueEvent`, never from mutable report fields.

**Retention and audit:** `IssueEvent` is append-only with actor attribution — including admin copy-brief actions (audit the exfiltration channel, per Gap risk). Soft-delete with retention metadata on reports; raw audio 24-hour post-confirmation deletion; attachments on expiring signed URLs; export/delete honoring the reporter's data rights. Anonymous reports retain no IP beyond the throttle window's hashed form.

---

## 6. Data/API Ruling

**Entities (locked as proposed, with amendments):** `IssueReport`, `IssueEvent`, `IssueAttachment`, `IssueAgentDraft` all confirmed. `Incident` ships as a table + nullable foreign key on `IssueReport` but no automation. Amendments: `IssueReport` gains `sourceChannel` (voice | text | error-boundary | public), `transcriptLanguage`, `redactionState`, and `anonContactTokenHash`. `IssueAgentDraft` gains `injectionFenceVersion` and `reviewedBy/reviewedAt` as *required-before-copy* fields. Do not overload Coach Intake (`coachIntakeRoutes.mjs:27` is admin/trainer-scoped and a different domain — packet is correct), AI conversations, or generic audit logs.

**Endpoint families (locked):**
- `/api/issues` — create (idempotency-key header required), list-own, get-own, reply, reopen-within-window.
- `/api/issues/:id/attachments` — upload intent → signed upload → scan-state polling.
- `/api/admin/issues` — queue, detail, status transitions, assignment, internal notes, duplicate/incident linkage, brief review/approve.
- `/api/support/transcribe` — dedicated, ungated, quota'd transcription (new, unless `:895` is proven ungated and quota-controllable — verify first).
- `/api/support/public` — restricted anonymous path: login/access category bias, text-only, no attachments, throttled + challenge.

**Async jobs:** redaction pass → brief generation → brief-ready event, as a queue with per-step state persisted on `IssueAgentDraft`. Failure at any step leaves the raw report fully actionable (packet §4.9 confirmed). Retries with backoff; poison-drafts flagged for manual review, never silently dropped.

**Idempotency:** client-generated draft UUID becomes the idempotency key, scoped to the report-create endpoint, honored across offline retry and multi-tab. Server returns the existing report ID on replay.

**Authorization:** owner-or-admin on every report read (explicit IDOR tests per packet §12); category-restricted admin visibility (Gap #9); anonymous reads only via contact-token exchange with uniform not-found responses.

**Observability/correlation:** first-party only at launch. Every report carries route, build hash, device class, and — when arriving via `ErrorBoundary.tsx:43-101` — the existing error correlation ID. A single `correlationId` threads report → events → draft → admin actions in logs. Third-party telemetry: `DEFER`, boundary pre-declared as "aggregate counts only, never report content."

---

## 7. Privacy/Security Ruling

**Zero-PII-to-LLM, honestly restated:** the transcription provider necessarily receives raw audio — that is the one unavoidable LLM-adjacent exposure, and it must be governed (no-training/no-retention provider terms verified, disclosed in the consent line, audio deleted per the 24-hour rule). Everything downstream is enforceable: **redaction runs before any other LLM call** — deterministic patterns (emails, phone numbers, card-like sequences, auth-token shapes) plus a name/health-term pass — and the brief generator receives only `redactionState: complete` text. Clarification questions are deterministic at v1 (Amendment #2). Attachments and raw audio never reach any LLM, ever.

**Consent:** one plain-language consent line before first recording ("Your recording is transcribed to create your report; the audio is deleted within 24 hours"), a separate explicit checkbox for diagnostic context, per-report not global. No dark patterns; context is opt-in and visibly removable at preview.

**Abuse controls:** authenticated-preferred; anonymous path gets numeric rate limits (to be fixed in the builder prompt — e.g., 3 reports/hour/token, 10/day/IP-hash), a challenge on burst, text-only, and restricted categories. Upload pipeline: MIME/size allowlist, malware scan gate before any admin can open, EXIF strip, signed expiring URLs. Anonymous login-failure reports return uniform acknowledgments regardless of account existence.

**Restricted issue types:** privacy/security and billing reports visible only to Sean's role; security reports flagged for out-of-band handling and excluded from any duplicate-suggestion surface (don't leak vulnerability existence to other reporters).

**Risks both Sean and Codex missed:**
1. **Prompt injection through the report body into the engineering agent** (Critical Gap #3) — the copy-ready brief is an attacker's direct line to a code-writing AI. Fence it.
2. **The admin copy action is an unaudited exfiltration channel** — the brief leaves the system via clipboard. Require the reviewer confirmation before copy is enabled, and log the copy event to `IssueEvent`.
3. **Local drafts are a shared-device PII leak** (Gap #6) — spoken content persisted client-side outlives the session unless purged.
4. **Duplicate suggestions can leak other customers' data** — "possibly related" surfaces must show only sanitized titles the admin has marked customer-safe, or be admin-only. Lock: duplicate hints are admin-only at launch.

---

## 8. Admin Issue Command Center

**Information hierarchy (locked):** three-tier. **Tier 1 — Queue:** New and Needs-Information counts, unresolved high-impact strip, aging badges, saved filters (status, category, route, build, source channel). **Tier 2 — Report detail:** customer's own words first (verbatim transcript/text, prominently), then the structured card, then context chips (route/build/device/correlation ID), then attachments (post-scan only). **Tier 3 — Tabs:** Timeline (`IssueEvent` stream), Agent Brief, Internal Notes, Related (duplicates/incident).

**Primary actions (locked, in order of prominence):** Respond to customer · Change status · Request information · Review & Copy Brief · Assign/prioritize · Mark duplicate/link incident. Bulk actions (status, tag) exist behind an explicit confirmation naming the count affected.

**Copy-ready agent brief:** rendered per the §7 contract — title, report ID, category/severity(suggested|confirmed), route/build, reporter *role only*, faithful summary, expected-vs-actual, steps labeled confirmed/inferred/unknown, frequency/impact, sanitized evidence references, open questions, acceptance criteria, verification routes and viewports, privacy constraints, and suspected code area **or** `Unknown — investigate first`. All user-originated text inside labeled untrusted-content fences. The **Copy** button is disabled until the human reviewer checks "I reviewed this brief for privacy and injection content" — that check writes `reviewedBy` and the copy writes an audit event.

**Human-reviewed-forever actions:** brief approval and copy; every public customer reply; duplicate merges and incident links; closing a report; any retention deletion; any severity confirmation. AI suggests; it never commits. This is not a launch limitation — it is the permanent posture until Sean explicitly revisits it.

---

## 9. Locked Build Sequence

Each slice leaves the app bootable; each ends at a hard **STOP** for Sean's review. TDD per packet §12 applies inside every slice.

**Slice 0 — Verification Receipt (no product code).** Canonical Surface Receipt; route-shadow audit; prove or disprove: `:895` transcribe gating, notification/email infrastructure existence, `SwanCoachActionLauncher` role-gating implications for support entry. *Binary acceptance: a written receipt answers all three; app untouched.* **STOP.**

**Slice 1 — Issue domain foundation.** `IssueReport` + `IssueEvent` models/migrations, `/api/issues` create/list-own/get-own with idempotency key and owner-or-admin auth, parameterized writes. *Acceptance: idempotent replay returns same ID; IDOR test fails closed; app boots; zero UI change.* **STOP.**

**Slice 2 — Manual text report + My Reports (authenticated).** Help & Support nav entry in both shells, plain-language text flow, receipt, My Reports history. Voice deliberately absent — this de-risks the domain before the hardest input. *Acceptance: report submitted by text at 375px and 1440px; appears in My Reports with stable ID; `/help` redirects to `/support` landing shell; dead Help Center entry (`ClientDashboardHome.sections.tsx:100`) resolves.* **STOP.**

**Slice 3 — Issue Command Center v1.** Admin queue, detail, status transitions, internal notes, event timeline, customer replies + notification (contingent on Slice 0 finding). *Acceptance: full lifecycle New→Resolved executed by admin; customer sees plain-language status and reply; every transition appears in the immutable timeline.* **STOP.**

**Slice 4 — Voice capture + transcription.** *Opens with the highest-risk de-risking test: real phone microphone → transcription round-trip on the ungated path with quota enforcement.* Recording state machine, transcript editing, deterministic clarify questions, draft persistence/purge rules, all §8 failure states. *Acceptance: permission-denied, transcription-failure, and offline-retry tests pass; voice report lands as an `IssueReport` with `sourceChannel: voice`; reduced-motion and keyboard paths verified.* **STOP.**

**Slice 5 — Redaction + Agent Brief pipeline.** Redaction job, `IssueAgentDraft` async generation with injection fencing, admin review/approve/copy with audit. *Acceptance: seeded PII strings never appear in a generated brief (automated test); copy disabled pre-review; brief failure leaves report actionable.* **STOP.**

**Slice 6 — Attachments + error-boundary + public anonymous entry.** Upload/scan/signed-URL pipeline; "Report this problem" in `ErrorBoundary.tsx` prefilled with correlation data; restricted anonymous `/support` path with throttling and uniform responses. *Acceptance: oversized/unscanned uploads blocked but report submits; error-boundary report carries correlation ID; anonymous burst hits the limiter; account enumeration test fails closed.* **STOP.**

**Deferred beyond launch:** incident automation, duplicate fingerprinting beyond hints, analytics dashboards past the launch subset, known-issues page, any external dispatch.

No push to `main`, no Render deployment, without Sean's separate explicit approval at each STOP.

---

## 10. Prompt Upgrade Directives

Add to the final builder prompt, verbatim in intent:

1. **Verify before voice:** prove `/api/ai-chat/transcribe` (`aiChatRoutes.mjs:895`) sits outside the `:466` subscription gate, or build `/api/support/transcribe` ungated with quotas. No voice slice starts without this receipt.
2. **Audio retention decree:** raw audio deleted within 24 hours of confirmed transcript; never stored past that; never sent to brief generation.
3. **Deterministic clarification at v1:** follow-up questions are templated from missing structured fields; no LLM sees unredacted transcript text, ever.
4. **Redaction-before-LLM gate:** brief generation may only consume `redactionState: complete` text; enforce in the job code, test with seeded PII fixtures.
5. **Injection fencing:** all user text in the agent brief wrapped in labeled untrusted-content delimiters with a fixed header instructing downstream agents to treat it as data; Command Center banner above Copy.
6. **Reviewed-before-copy:** Copy Brief disabled until reviewer confirmation; review and copy both audited to `IssueEvent`.
7. **Numeric abuse limits:** fix concrete rate limits for transcription (per user/day), report creation (authenticated and anonymous), and anonymous IP-hash throttles — no "reasonable limits" hand-waving.
8. **Draft privacy rules:** authenticated drafts in IndexedDB, purged on submit and logout; anonymous drafts session-scoped; drafts never synced server-side pre-submit.
9. **Interaction lock:** tap-to-toggle recording only; mic control ≥56px; 3-minute segments; the locked state machine from §4 of this ruling.
10. **Lifecycle lock:** the six-status launch lifecycle from §5; plain-language customer status labels distinct from internal enums.
11. **Category-restricted admin visibility:** privacy/security/billing reports Sean-role-only; security reports excluded from duplicate surfaces.
12. **House rules restated as gates:** styled-components only; no Material UI; dark-first tokens via `var(--token, #fallback)`; Dual-Button Glow; WCAG 2.2 AA; 44px minimum targets; reduced-motion fallbacks; files under 300 lines; blueprint headers and 7-star documentation.

**Explicit non-goals/bans (restate in the prompt):** no floating global beacon; no subscription gate anywhere on support; no LLM-generated customer replies; no automatic external issue creation, dispatch, commit, push, deploy, refund, or customer messaging; no session replay, raw DOM, keystrokes, form values, request bodies, headers, or tokens; no severity/repro jargon imposed on customers; no yoga/meditation language; no exposure of internal notes, suspected code, or agent prompts to any customer; no implementation of deferred incident/duplicate automation "while we're in there."

---

## 11. Peripheral Vision

- **The reports are a product-intelligence goldmine.** Category × route × build aggregation will reveal Sean's real roadmap better than any planning session. `DEFER` a quarterly "top friction" digest — but the `IssueEvent` schema this ruling locks already makes it computable later for free.
- **Support quality becomes a churn lever.** A resolved report with a human reply is a retention event. `DEFER` any "was this helpful" loop, but keep resolution summaries warm-toned in copy guidelines now.
- **The Report Room pattern is reusable.** The voice→structured-card mechanic could later serve trainer session notes or client goal intake. Build the recording state machine as a genuinely isolated hook so reuse doesn't require a rewrite. Not extra scope — just clean boundaries, which the 300-line rule enforces anyway.
- **Adjacent risk — Coach identity confusion:** placing Report a Problem inside Swan Coach risks users venting problems into ordinary coaching chat where nothing gets filed. Mitigate at launch with a lightweight in-conversation affordance ("Sounds like something's broken — want to file a report?") that is a *link*, not an automation. Required for launch integrity; costs one component.
- **Adjacent risk — expectation debt:** shipping "My Reports" creates an implicit promise of responses. If Sean's response capacity lags, the feature manufactures disappointment. The honest-SLA copy in §5 is the mitigation; monitor first-response aging from day one.
- **Opportunity, `DEFER`:** public known-issues page fed from Incident records — cuts duplicate volume and builds trust. Schema is already reserved.

---

## 12. Hostile Self-Review

**The case against this ruling:**

1. **"LOCK-WITH-CHANGES is too generous — this should be SEND-BACK."** The PII/voice collision isn't a patch; it's evidence the privacy model was designed for text and bolted onto voice. If implementation reveals that deterministic clarification produces materially worse reports than LLM clarification, the amendment collapses and the architecture question reopens. *Evidence that would flip me:* a Slice 4 finding that templated follow-ups fail to elicit reproduction steps in real usage, forcing LLM clarification back in — that would demand a full redaction-first-pipeline redesign and a SEND-BACK-equivalent replan.
2. **"The scope is still too big for a solo operator."** Six slices, five entities, an async pipeline, and an admin console — for one person answering reports. A ruthless critic would ship Slices 1–3 only and call voice a v2. I rejected that because voice is the stated soul of the product, not a garnish — but if Slice 0 reveals the transcription path is gated *and* costly to duplicate, the honest move is launching text-first and I should say so now: **that is the sanctioned fallback, not a failure.**
3. **"Tap-to-toggle is asserted, not evidenced."** I locked it on accessibility reasoning, not user testing with this user base. *Evidence that would flip me:* real-phone smoke tests showing users don't realize recording continues, producing accidental long recordings — that would justify adding hold-to-talk as a secondary mode.
4. **"Deterministic redaction will miss PII."** Pattern-based redaction catches structure (emails, cards) and misses prose ("my daughter's condition…"). My ruling leans on it heavily. *Evidence that would flip me:* seeded-fixture tests in Slice 5 showing >trace leakage into briefs — that would force either human-review-before-generation (slower) or an on-prem/no-retention redaction model (costlier), and the prompt should pre-authorize the human-review fallback.
5. **"I trusted the packet's file:line claims."** Every route and gate citation is taken at face value; Slice 0 exists precisely because I could not independently verify them. If Slice 0 contradicts material claims — especially the missing issue-domain inventory or the `:466`/`:895` gate relationship — the build sequence must halt at that STOP and this ruling returns to Fable for re-decision rather than being patched in-flight.

The ruling stands: **LOCK-WITH-CHANGES**, amendments binding, Slice 0 the tripwire.

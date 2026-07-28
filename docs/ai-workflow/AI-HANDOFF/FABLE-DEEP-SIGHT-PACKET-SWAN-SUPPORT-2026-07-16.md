# Fable Deep-Sight Packet: Swan Support Voice-First Issue System

## DEEP-SIGHT REMIT — Fable 5
You are the SwanStudios Final Decider performing a general Deep-Sight architecture and product review before any implementation begins. Give the fullest honest read of this proposed system. Do not flatter the plan, do not settle for a generic help desk, and do not invent repo facts. Where the packet has file:line evidence, use it. Where evidence is missing, say what must be verified during implementation.

Return a final ruling with exactly these sections:
1. **VERDICT:** `LOCK`, `LOCK-WITH-CHANGES`, or `SEND-BACK`, with one paragraph explaining why.
2. **Best product shape:** choose and name the strongest placement/concept, including the emotional job and signature interaction.
3. **Missing gaps:** absence-first list of what the current plan forgot, ranked Critical/High/Medium.
4. **Voice-first experience:** locked desktop and mobile flow, recording/transcription states, manual fallback, accessibility, and failure recovery.
5. **Enterprise support architecture:** customer request versus internal work item, lifecycle, ownership, SLA, notifications, duplicate/incident/problem handling, analytics, retention, and audit requirements.
6. **Data/API ruling:** final entity boundaries, endpoint families, asynchronous jobs, idempotency, authorization, and observability/correlation strategy.
7. **Privacy/security ruling:** zero-PII-to-LLM design, redaction, audio/attachment policy, consent, abuse controls, restricted issue types, and any risk both Sean and Codex missed.
8. **Admin Issue Command Center:** information hierarchy, primary actions, copy-ready agent brief, status/assignment controls, and which actions must remain human-reviewed.
9. **Locked build sequence:** narrow slices that leave the app bootable, each with binary acceptance criteria and a STOP/checkpoint boundary.
10. **Prompt upgrade directives:** exact requirements that must be added to the final builder prompt, plus explicit non-goals/bans.
11. **Peripheral vision:** adjacent risks or opportunities nobody asked about; keep scope proposals clearly marked `DEFER` unless required for launch integrity.
12. **Hostile self-review:** argue against your own ruling and identify the evidence that would change it.

Binding house rules: styled-components only; no Material UI; dark-first Crystalline Swan tokens through `var(--token, #fallback)`; Dual-Button Glow; WCAG 2.2 AA; 44px minimum targets; reduced-motion fallbacks; files under 300 lines; blueprint headers and 7-star documentation; zero client PII, medical details, secrets, tokens, request bodies, raw DOM, or payment data sent to any LLM; no automatic code changes, external issue creation, deployment, or customer communication from the report flow; no subscription gate on support access; no yoga/meditation language.

## 1. Sean's Intent
Build a beautiful, enterprise-grade issue reporting and support system for anyone using SwanStudios. The primary input is voice: a client or customer taps the microphone on phone or desktop and explains the problem naturally. Text entry and a structured manual form are secondary alternatives. Swan Coach clarifies the issue, converts it into a useful report, and delivers it to Sean's main admin dashboard as a copy-ready prompt for an engineering agent. The system must encourage reporting of bugs, errors, access trouble, confusing workflows, accessibility issues, billing concerns, feature requests, and other product problems without requiring technical language.

This review is the final pre-build gate. No production code has been changed.

## 2. Current Repo and Live-Surface Truth
- `frontend/src/routes/main-routes.tsx:708` mounts the canonical `/user-dashboard` home; `:843-847` mounts the protected `/dashboard/*` shell.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:182-205` defines active client routes; `:203` mounts `/coach-assistant` to `CoachCommandCenterPage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.shellPieces.tsx:95-106` maps visible role routes to rendered `<Component />` elements.
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.roleConfig.ts:10` limits client Coach tabs to `talk` and `history`.
- `frontend/src/components/DashBoard/Pages/client-dashboard/ClientStellarSidebar.tsx:51-85` has no Swan Coach, Help, Support, or Report Problem entry.
- `frontend/src/components/UserDashboard/components/HomeTab.tsx:155-169` mounts `SwanCoachDock`; the voice/text `SwanCoachActionLauncher` is rendered only for elite/admin/trainer access.
- `frontend/src/components/UserDashboard/components/ClientDashboardHome.sections.tsx:100` contains `Help Center` with an undefined target; `:161-168` disables entries without targets.
- `frontend/src/components/Footer/CompactFooter.tsx:81` links to `/help`, but no corresponding route exists in `main-routes.tsx`; live browser inspection showed `/help` returning to the homepage.
- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachConsoleDock.tsx:141` already provides `Talk or type to Swan Coach`; `:225-227` exposes microphone and send actions.
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useGeminiTranscription.ts:56` posts audio to `/api/ai-chat/transcribe`; `backend/routes/aiChatRoutes.mjs:895` handles that endpoint.
- `backend/routes/aiChatRoutes.mjs:466` subscription-gates ordinary conversation messages. Support intake must not depend on that paid chat gate.
- `backend/routes/coachIntakeRoutes.mjs:27` restricts Coach Intake to admin/trainer. It is an adjacent encrypted/audited pattern, not the customer issue domain.
- Current model/route/service inventory contains no dedicated `IssueReport`, `SupportTicket`, `BugReport`, `/api/issues`, customer ticket history, or admin issue inbox.
- `frontend/src/components/ui/ErrorBoundary.tsx:43-101` logs error context and offers only Try Again; it is a natural `Report this problem` insertion point with privacy-safe correlation data.
- Live browser audit at desktop and 414px mobile found Contact and login Help, but no persistent public problem-reporting entry.

## 3. Proposed Product Shape Before Fable
Use one issue domain with several entrances:
1. Authenticated desktop: labeled Help & Support entry integrated into each shell's persistent navigation/account area.
2. Authenticated mobile: Help & Support in the mobile menu or bottom sheet, always at least 44px and never hover-dependent.
3. Swan Coach: explicit Report a Problem mode, separate from coaching conversation and free for every account.
4. Error recovery: Report this problem from error boundaries and repeated failed operations, prefilled with route/build/error ID.
5. Public/login: real `/support` route with a restricted unauthenticated path for login/access failures and a richer authenticated path.
6. Admin: dedicated `/dashboard/admin/issues` Issue Command Center, with a shortcut from Coach Command Center and admin overview signals.

Avoid unsolicited popups during ordinary use. Contextual prompts may appear after a real error or repeated failure. Avoid a mystery floating bubble if shell navigation can own the action; if Fable recommends a beacon, define exactly where it may appear without covering workout, chat, or mobile controls.

## 4. Voice-First Flow Before Fable
1. Open Report a Problem.
2. Primary action is `Hold to talk` or `Tap to record`, with elapsed time, waveform/level feedback, pause/stop/cancel, microphone permission guidance, and keyboard/screen-reader equivalents.
3. Transcribe; preserve the user's original meaning.
4. Show editable transcript and structured summary side-by-side or in a clear sequence.
5. Swan Coach asks no more than two or three necessary follow-ups: what they were doing, expected result, actual result, frequency/impact. Do not ask what safe diagnostics already answer.
6. Allow optional screenshot/video/file attachment and explicit consent for safe diagnostic context.
7. Preview exactly what will be submitted; user can edit or remove attachments/context.
8. Save the raw issue first with an idempotency key; return a stable report ID immediately.
9. Generate the redacted agent brief asynchronously. Failure never loses the report.
10. Show receipt, status, My Reports link, and expected response behavior.

Manual alternative: start with a plain-language text box and progressively reveal structured fields; do not force a long enterprise form before the person can explain the problem.

## 5. Proposed Data Boundaries
- `IssueReport`: reporter identity or anonymous contact token, customer-visible title/summary, category, impact, frequency, lifecycle status, route/build/device/correlation context, assignment/priority, consent flags, timestamps, and soft-delete/retention metadata.
- `IssueEvent`: append-only status changes, public replies, internal notes, assignment, priority, merges, incident links, and audit actor.
- `IssueAttachment`: storage key, safe display metadata, MIME/size, scan state, uploader, redaction state, and expiring access policy.
- `IssueAgentDraft`: versioned privacy-redacted engineering brief, generation state/model metadata, source report version, reviewer, and approved/copy state.
- `Incident`: optional grouping for multiple reports caused by one service interruption; customer-safe status and resolution summary.

Do not overload AI conversations, Coach Intake, notifications, social reports, or generic audit logs as the primary issue table. Reuse notification delivery and audit/event patterns where appropriate.

## 6. Enterprise Capability Baseline
- Categories: bug/error, login/access, billing/payment, performance, confusing workflow, accessibility, privacy/security, data concern, feature request, and other.
- Statuses: New, Triaged, Needs Information, Accepted, In Progress, Resolved, Closed, Duplicate, Cannot Reproduce.
- Internal controls: owner/assignee, priority, tags, saved views, search/filter/sort, aging/SLA timers, escalation, internal notes, immutable event trail, bulk actions with confirmation.
- Customer loop: report history, public replies, notifications, requested information, resolution summary, reopen rules, attachment access.
- Intelligence: safe categorization, suggested severity, duplicate fingerprinting, incident grouping, known-issue suggestions, agent-brief generation. All suggestions remain reviewable.
- Analytics: time to first response, time to resolution, backlog age, reopen rate, duplicate rate, affected routes/builds, category volume, incident reach, and unresolved high-impact count.
- Abuse/trust: authentication where possible, anonymous throttling/CAPTCHA or equivalent, upload scanning, MIME/size allowlist, signed URLs, retention/deletion/export, restricted security/privacy/billing visibility.

## 7. Agent-Ready Brief Contract
The generated brief must include:
- concise title; report ID; category, confirmed/suggested severity, affected route/build, reporter role only;
- faithful summary; expected versus actual behavior; reproduction steps explicitly labeled confirmed/inferred/unknown; frequency and impact;
- privacy-safe diagnostic evidence and attachment references; unknown information and questions still open;
- acceptance criteria, exact verification route(s), mobile/desktop viewport requirements, privacy constraints, and an evidence-backed suspected code area or `Unknown — investigate first`;
- no names, emails, health data, payment details, auth values, raw request bodies, or invented root cause.

Sean reviews and copies the brief manually. One-click external issue creation, agent dispatch, commits, pushes, deployment, and customer messages are deferred and approval-gated future capabilities.

## 8. Required Failure States
- Microphone permission denied/unavailable; no supported browser speech path; recording interrupted; no audio captured.
- Transcription timeout/failure/low confidence; user edits or switches to text without losing draft.
- Offline or flaky network; local draft preservation and idempotent retry without duplicate tickets.
- Attachment too large/unsupported/scan failed; report can still submit without it.
- AI clarification or agent-brief generation unavailable; raw issue remains actionable and visible to Sean.
- Anonymous spam/abuse; restricted response without exposing account existence.
- Duplicate suspected; user may attach their impact to the existing incident or continue a distinct report.

## 9. Design Direction Requirements
The experience should feel like a calm, premium concierge recording room—not a developer bug tracker. Use Crystalline Swan dark sapphire/graphite surfaces, Ice Wing recording feedback, Wing Purple focus/glow, restrained Gilded Fern only for high-value confirmation, Frost White type, and clear semantic status colors through tokens. The signature moment is the spoken narrative resolving into a clean, editable `What happened / What you expected / Impact` report card without making the user complete a long form.

Mobile is primary for dictation. No hover-only action, clipped transcript, nested-scroll maze, microphone button under 56px for the primary control, or fixed beacon covering the keyboard/send controls. Reduced motion replaces waveform animation with stable level/time feedback.

## 10. Decisions Fable Must Lock
1. Final client-facing and admin-facing names.
2. Exact global entry strategy across both client shells, Swan Coach, error states, and public/login.
3. Whether record interaction is hold-to-talk, tap-to-toggle, or offers both with one default.
4. Minimum launch lifecycle and which enterprise capabilities are later slices.
5. Anonymous submission/attachment boundaries.
6. First-party correlation/observability architecture and optional third-party boundary.
7. Final model/entity separation and asynchronous job design.
8. Locked build sequence, acceptance criteria, and highest-risk de-risking test.

## 11. Explicit Non-Goals for the First Build
- Do not replace Contact or ordinary coaching conversation.
- Do not create a generic floating chatbot across every page.
- Do not require users to understand severity, browser diagnostics, or reproduction terminology.
- Do not subscription-gate issue submission or make AI availability a prerequisite.
- Do not expose internal notes, suspected code, security details, or agent prompts to other customers.
- Do not capture session replay, raw DOM, keystrokes, form values, request bodies, headers, or tokens by default.
- Do not automatically fix, dispatch, create external tickets, commit, push, deploy, refund, or message customers.
- Do not implement during this review turn.

## 12. Verification Expectations for the Later Build
- Canonical Surface Receipt and route-shadow audit before edits.
- Model/migration field cross-check and parameterized database writes.
- TDD per slice, including idempotency, auth/IDOR, privacy-redaction, upload abuse, AI-unavailable, and offline retry cases.
- Frontend tests for microphone permission, recording lifecycle, transcript editing, manual fallback, draft persistence, submission receipt, and status history.
- Browser QA at 320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560, 3440, and 3840 widths where applicable; real phone microphone smoke when feasible.
- Accessibility: keyboard, screen reader labels/live regions, focus restoration, contrast, reduced motion, zoom/reflow, and 44px minimum controls.
- No push to `main` or Render deployment without Sean's explicit separate approval.

## Context Compression Receipt
- Sources: current targeted repo route/component/API evidence and Sean's two support-system prompts
- Excluded sources: `.env`, tokens, client data, logs, database content, private IDs, raw transcripts
- Data class: repo + user-provided non-PII product vision
- Image estimate: not run; packet is narrow text and requires exact file:line context
- Control text kept outside image: yes
- Decision: use-text-context


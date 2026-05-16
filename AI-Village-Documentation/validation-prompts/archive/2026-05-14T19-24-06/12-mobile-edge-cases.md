# Mobile & Edge Case Analysis — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 20.5s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

#SwanStudios – Mobile & Edge‑Case Review
**Prepared for:** Coach Command Center + PLAUD/AppLaude Unified Workflow
**Date:** 2026‑05‑14
**Audience:** Mobile Web Specialist, Edge‑Case Hunter, Product & Engineering Leads

---

## 1️⃣ 10‑Breakpoint Responsive Matrix & Touch‑Target Check

| Breakpoint | Width (px) | Current Layout (sidebar = 85 vw) | Touch‑Target (≥ 44 px) | Verdict |
|------------|-----------|----------------------------------|------------------------|---------|
| **320** | 320 | 85 vw = **272 px** (sidebar) | 44 px required → 272 px ≥ 44 px ✔︎ | **OK** (but see #1) |
| **375** | 375 | 85 vw = **319 px** | ✔︎ | **OK** |
| **430** | 430 | 85 vw = **366 px** | ✔︎ | **OK** |
| **768** | 768 | 85 vw = **653 px** | ✔︎ | **OK** |
| **1024**| 1024| 85 vw = **870 px** | ✔︎ | **OK** |
| **1280**| 1280| 85 vw = **1088 px** | ✔︎ | **OK** |
| **1440**| 1440| 85 vw = **1224 px** | ✔︎ | **OK** |
| **1920**| 1920| 85 vw = **1632 px** | ✔︎ | **OK** |
| **2560**| 2560| 85 vw = **2176 px** | ✔︎ | **OK** |
| **3840**| 3840| 85 vw = **3264 px** | ✔︎ | **OK** |

> **Bottom line:** The sidebar **always exceeds** the 44 px minimum, but the *content* inside (titles, timestamps, buttons) can become cramped at the smallest breakpoint.

---

## 2️⃣ Edge‑Case Deep‑Dive & Ratings

| # | Edge Case | Rating | Why it matters | CSS / React Fix (specific) |
|---|-----------|--------|----------------|----------------------------|
| **1** | **Sidebar on 320 px** – 85 vw = 272 px. Is there enough room for title + timestamp + action buttons? | **HIGH** | At 320 px the sidebar is only ~272 px wide. If a conversation title is long, the timestamp and the three action buttons (⋮, 🎤, 📥) can overflow, causing hidden UI or horizontal scroll. | • Use **CSS logical properties** (`margin-inline-start`, `margin-inline-end`) so the layout flips automatically. <br>• Constrain title to **2 lines** with `line-clamp: 2` + `display: -webkit-box` + `-webkit-line-clamp: 2`. <br>• Stack secondary actions vertically on ≤ 375 px: <br>```css\n.sidebar-action { flex-direction: column; gap: 4px; }\n@media (max-width: 375px) { .sidebar-action { flex-direction: column; } }\n```<br>• Add a **“more‑options” ellipsis button** that expands a small menu when space is tight. |
| **2** | **Voice recording on iOS Safari** – MediaRecorder support, WebKit prefix, auto‑play policy for TTS. | **CRITICAL** | iOS Safari only supports `MediaRecorder` behind a user gesture and requires the **`webkitMediaRecorder`** prefix. Auto‑play of TTS is blocked unless the user has interacted with the page. | • Detect support: <br>```js\nconst hasMediaRecorder = 'MediaRecorder' in window || 'webkitMediaRecorder' in window;\n```<br>• Use a **user‑initiated button** to start recording; store the `Blob` and upload via `fetch('/api/plaud/webhook/applaud', {method:'POST', body:formData})`. <br>• For TTS feedback, **only play after a user tap** (e.g., “Play back” button). <br>• Add a **fallback** UI that shows “Tap to record” on iOS. |
| **3** | **Keyboard on mobile** – When chat input is focused, does the sidebar get pushed off‑screen? | **HIGH** | The virtual keyboard can add 200‑300 px height, causing the fixed bottom dock and sidebar to be clipped or hidden. | • Use **`position: sticky; bottom: 0;`** for the command dock with `z-index: 1000`. <br>• Listen for `resize`/`orientationchange` and adjust `margin-bottom` of the main content: <br>```js\nuseEffect(() => {\n  const update = () => {\n    const height = window.innerHeight - document.documentElement.clientHeight;\n    document.body.style.setProperty('--keyboard-height', `${height}px`);\n  };\n  window.addEventListener('resize', update);\n  return () => window.removeEventListener('resize', update);\n}, []);\n```<br>• In styled‑components: `margin-bottom: var(--keyboard-height, 0);` |
| **4** | **Offline / slow network** – Conversations list fails to load. | **MEDIUM** | Users on flaky connections may see a blank sidebar, leading to confusion. | • Show a **skeleton UI** while fetching (`<SkeletonList />`). <br>• If fetch fails, render an **empty‑state card**: <br>```tsx\n<EmptyState title="No conversations yet" description="Your voice notes will appear here once recorded." icon="mic" />\n```<br>• Persist the last‑known queue in **IndexedDB** and re‑hydrate on reconnect. |
| **5** | **Long conversation titles** – Auto‑generated from first message. | **MEDIUM** | Titles can exceed the sidebar width, causing truncation or layout shift. | • Truncate to **2 lines** with ellipsis: <br>```css\n.title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n```<br>• Allow **long‑press** to edit the title (opens a tiny inline editor). |
| **6** | **Large message history** – 100+ messages. | **MEDIUM** | Rendering all messages at once can cause jank and high memory usage on low‑end devices. | • Implement **virtualized list** (`react‑virtual` or `react‑window`). <br>```tsx\nimport { FixedSizeList as List } from 'react-window';\n<List itemCount={messages.length} itemSize={56} height={sidebarHeight} width="100%">\n  {({ index, style }) => (\n    <div style={style}>\n      <MessageBubble key={index} message={messages[index]} />\n    </div>\n  )}\n</List>\n``` |
| **7** | **RTL languages** – Sidebar must flip correctly. | **LOW** (future‑proof) | Not required now, but the UI should be ready for Arabic/Hebrew. | • Use **CSS logical properties** (`margin-inline-start`, `padding-inline-end`). <br>• Avoid fixed `left/right` values; use `start/end`. <br>• Add `dir="rtl"` attribute dynamically when `i18n` detects RTL. |
| **8** | **Reduced motion** – Voice orb pulsing, sidebar slide, thinking indicator. | **MEDIUM** | Users with `prefers-reduced-motion` may find animation disorienting. | • Wrap animations in a media query: <br>```css\n@media (prefers-reduced-motion: reduce) {\n  .voice-orb { animation: none; }\n  .sidebar-slide { transition: none; }\n}\n```<br>• Provide a **“motion‑off” toggle** in settings that sets a global CSS variable `--prefers-motion: none`. |
| **9** | **Screen reader** – Sidebar landmark, conversation list navigation, message bubble roles, voice recording status. | **CRITICAL** | Accessibility is non‑negotiable for trainer use in gyms (hands‑busy). | • Add **ARIA landmarks**: <br>```tsx\n<aside aria-label="Coach Conversations" role="complementary">\n  {/* sidebar content */}\n</aside>\n```<br>• Use `role="list"` on the conversation container and `role="listitem"` on each item. <br>• For voice‑recording status: <br>```tsx\n<Button aria-live="polite" aria-label="Recording started">🎤</Button>\n```<br>• Ensure all interactive elements have **focusable names** and are reachable via **Tab**. |
| **10**| **4K ultrawide** – Max‑width constraints on sidebar & chat area. | **LOW** | Very wide screens can stretch the layout beyond comfortable reading width. | • Constrain the main content width to **max‑1200 px** and center it: <br>```css\n.main { max-width: 1200px; margin-inline: auto; }\n```<br>• Sidebar can safely expand to fill remaining space (`flex: 1 0 250px`). |

---

## 2️⃣ Plan Review – Missing Context, Security & Data‑Model Gaps

| Area | Observation | Impact / Risk | Required Action |
|------|-------------|---------------|-----------------|
| **Unified Inbox** | The plan treats “voice notes, transcript uploads, typed notes, chat narratives” as a single queue but does **not** define a **canonical status enum** (e.g., `READY_FOR_REVIEW`, `NEEDS_CLIENT`, `CLARIFICATION`, `DUPLICATE_RISK`). | Without a stable status, downstream approval workflows may mis‑route items. | Add a **`IntakeStatus`** TypeScript enum in `frontend/src/types/coachIntake.ts` and persist it in the backend (`intake_status` column). |
| **Stub Client Creation** | Minimal client can be created from the staged flow, but the spec says “must not fake emails/phones”. No validation rule is described. | Risk of **spurious PII** being stored or later used for marketing. | Enforce **`isStub: true`** flag; UI must hide email/phone fields until the operator explicitly “completes profile”. Backend should reject any write that contains a non‑empty email/phone unless `isStub === false`. |
| **Data‑Model Drift** | Existing `coach_action_proposals` include `client_onboarding`, `workout_log`, `client_data_update`. The plan mentions “approval writes through existing workout logging/onboarding services”. No clear mapping to **which service** handles `client_onboarding` (currently `coachClientOnboardingApprovalService`). | If the mapping is ambiguous, the wrong endpoint could be called, breaking audit trails. | Document the **service‑to‑proposal** matrix in `docs/ai-workflow/coach-proposal-matrix.md`. Add unit tests that assert the correct service is invoked for each proposal type. |
| **Security / Privacy** | The plan states “No PII to external LLMs”. However, the AI chat backend currently forwards **raw message payloads** to the LLM provider without redaction. | Potential **data leakage** of client names, emails, or workout details. | Implement a **privacy proxy** that strips or hashes PII before sending to external models. Add a middleware (`privacySanitizer`) in `backend/middleware/sanitizeAiPayload.mjs`. |
| **Feature‑Flag Dependencies** | PLAUD webhook routes are mounted only when feature flags/env checks pass, but the plan does not mention **fallback** if the flag is off on a trainer’s device. | Trainers could see a broken UI with no clear error message. | Add a **graceful degradation** UI that explains “PLAUD integration disabled for this session” and disables related actions. |
| **Mobile One‑Handed Dock** | The fixed bottom dock is mentioned, but the spec does not enforce **56 px** touch targets on screens < 768 px. | Small tap targets can cause mis‑taps in the gym. | Enforce `min-height: 56px; min-width: 44px;` on all dock buttons; use `touch-action: manipulation;` for better hit‑area. |
| **Testing Strategy** | No mention of **automated visual regression** for the 10 breakpoints, nor of **device‑farm** testing for iOS Safari MediaRecorder. | Edge‑case bugs may slip into production. | Add Cypress tests for each breakpoint width, and a **BrowserStack** matrix that includes iOS Safari 17. Add a CI job that runs the “voice‑record” flow with a mock MediaRecorder stub. |

---  ## 3️⃣ Recommended First Implementation Slice

**Goal:** Deliver a **safe, verifiable, end‑to‑end flow** that can be merged without risking data‑writes.  | Step | What to Build | Files to Touch | Why it’s Safe |
|------|---------------|----------------|---------------|
| **1️⃣ Replace static `COMMAND_THREADS` with real `useAIChat`** | - Wire the existing `CoachCommandCenterPage` to fetch conversations via `useAIChat`. <br>- Render a **virtualized list** of messages. <br>- Keep the sidebar layout unchanged. | `CoachCommandCenterPage.tsx`, `useAIChat.ts`, `ConversationSidebar.tsx` | No new data is written; only **read** operations. |
| **2️⃣ Add status badge & truncation for titles** | - Add `status` badge (e.g., `Ready`, `Needs Client`). <br>- Apply 2‑line truncation CSS. | `ConversationSidebar.tsx`, `ConversationItem.tsx`, `styles.ts` | Pure UI changes; no backend impact. |
| **3️⃣ Implement offline skeleton & empty‑state** | - Show skeleton while fetching; fallback to “No conversations yet”. | `CoachCommandCenterPage.tsx`, `EmptyState.tsx` | Improves UX but does not affect data flow. |
| **4️⃣ Add reduced‑motion guard** | - Wrap existing animations in `prefers-reduced-motion` query. | `VoiceOrb.tsx`, `SidebarSlide.tsx` | Non‑functional, safe to ship. |
| **5️⃣ Add ARIA landmarks & live regions** | - `role="complementary"` on sidebar, `aria-live="polite"` on recording status. | `CoachCommandCenterPage.tsx`, `VoiceRecorder.tsx` | Improves accessibility without functional changes. |
| **6️⃣ Write unit & integration tests** | - Jest tests for `useAIChat` fetch, virtualization height, status badge. <br>- Cypress test for 320 px breakpoint layout. | `__tests__/CoachCommandCenter.test.tsx`, `cypress/integration/sidebar-resize.spec.js` | Guarantees future changes won’t break the slice. |

**Outcome:** A **merge‑ready** PR that proves the conversation system works, respects mobile constraints, and is fully accessible. All subsequent phases (unified inbox, approval workflow) can build on this stable foundation.

---

## 4️⃣ Sequencing Decision

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| **APPROVE** | **Phase 1 – Real conversations only** (as outlined above). | Low risk, no writes, validates UI & mobile interactions, establishes the correct data‑flow for later approval steps. |
| **REVISE** | **Do not merge PLAUD review state into conversation context** until the status enum and offline handling are solid. | Merging review state too early introduces race conditions and hidden data that could be lost on refresh. |
| **REJECT** | **Do not implement stub client creation in Phase 1**. | It introduces PII handling and potential fake data pollution before the onboarding flow is fully vetted. |

**Overall Verdict:** **APPROVE Phase 1** as the first slice; **REVISE** the staging of PLAUD review data and **REJECT** any premature stub‑client

---

*Part of SwanStudios 15-Brain Recursive Consensus System*

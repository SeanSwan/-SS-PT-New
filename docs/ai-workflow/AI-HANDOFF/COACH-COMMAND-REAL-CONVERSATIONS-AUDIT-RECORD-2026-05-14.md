# Coach Command Real Conversations Audit Record - 2026-05-14

## 1. Phase Header

| Field | Value |
| --- | --- |
| Phase | Coach Command Center Phase 1 - real coach thread wiring |
| Scope | Admin Coach Command Center route begins using real coach-assistant conversations instead of static prototype threads |
| Start date | 2026-05-14 |
| End date | 2026-05-14 |
| Review path | Codex implementation, 15-brain AI Village planning review |
| Final verdict | IMPLEMENTED LOCALLY, NOT PUSHED |

This phase intentionally implements the smallest AI Village-approved slice: make the admin Command Center use real saved conversations, preserve the mobile command dock behavior, and keep the PLAUD/AppLaude ingestion workflow as an approval-gated future slice.

## 2. Files Involved

| File | Lines | Purpose |
| --- | ---: | --- |
| `docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md` | 169 | PII-free AI Village prompt for the unified Coach Command + PLAUD/AppLaude workflow |
| `AI-Village-Documentation/validation-prompts/latest/*` | generated | AI Village validator outputs, debates, and consensus reports from the 2026-05-14 run |
| `AI-Village-Documentation/validation-prompts/archive/2026-05-14T19-24-06/*` | generated | Archived prior `latest` validation output produced by the orchestrator |
| `docs/ai-workflow/validation-reports/LATEST.md` | generated | Latest validation orchestrator report |
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx` | 892 | Canonical admin Command Center page; now uses `useAIChat` conversations and send flow |
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.test.tsx` | 224 | Regression tests for real conversations, mobile drawer behavior, and embedded PLAUD panel |
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachInputBar.tsx` | 252 | Shared coach input bar; placeholder updated to the command-dock language |
| `frontend/src/components/DashBoard/Pages/coach-assistant/ConversationSidebar.tsx` | 152 | Shared conversation sidebar copy updated from generic chat labels to coach-thread labels |
| `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx` | existing | Comment-only wireframe label cleanup so old `New Chat` copy does not reappear in source scans |
| `docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-REAL-CONVERSATIONS-AUDIT-RECORD-2026-05-14.md` | current | This audit record |

Known existing limitation: `CoachCommandCenterPage.tsx` remains over the 300-line target. This phase kept scope to behavior wiring; decomposition into smaller style, shell, dock, and rail components is a required follow-up before the next large edit to this page.

## 3. Architecture & Runtime Flow

Canonical admin route:

```text
/dashboard/admin/coach-assistant
  -> UniversalDashboardLayout
  -> CoachCommandCenterPage
  -> useAIChat
  -> /api/ai/conversations and /api/ai/chat through the existing app auth transport
```

Interaction flow:

```text
Admin opens Command Center
  -> page loads active AI conversations
  -> filters to coach-assistant context when present
  -> left rail renders real coach thread buttons
  -> selecting a thread loads that conversation
  -> selected thread title becomes the command context
  -> mobile drawer closes and composer receives a safe continuation prompt
  -> Prepare submits through sendMessageWithConversation(..., "coach_assistant", ...)
  -> response is appended to the local operator log
  -> no workout/client writes happen from this page
```

PLAUD/AppLaude future flow approved by planning, not implemented in this slice:

```text
PLAUD/AppLaude local dump folder
  -> watcher/intake service
  -> staging queue
  -> transcript parse and duplicate-risk detection
  -> operator assigns or creates minimal client
  -> operator approves final write
  -> workout log appended to the correct client chart/history
```

## 4. Security Logic & Posture

| Control | What it blocks | Why it exists | How it can fail if changed incorrectly |
| --- | --- | --- | --- |
| Existing auth route guard | Unauthenticated access to the admin route | Admin-only command surfaces must not be public | Bypassing dashboard auth or adding a public route alias would expose operations UI |
| `useAIChat` app transport | Standalone token handling | Keeps auth behavior centralized | Reintroducing direct `localStorage.getItem("token")` fetch calls can bypass refresh/logout behavior |
| `context: "coach_assistant"` | Cross-context conversation mixing | Keeps coach threads separate from unrelated assistant chats | Omitting context can pollute the thread list or retrieval scope |
| Operator approval wording | Implied automatic writes | Coach drafts recommendations only until the operator approves | UI copy or future API calls that say "applied" before approval can create unsafe expectations |
| No `innerHTML` log rendering | DOM injection through dynamic logs | Coach responses can contain user/model text | Using `innerHTML` for logs can create script injection risk |
| Thread rows as buttons | Keyboard-inaccessible thread selection | Mobile and keyboard operators need reliable navigation | Reverting to inert `li` rows breaks accessibility and drawer behavior |
| Secret scan on AI Village prompt | Accidental credential or PII leakage into planning docs | AI Village prompts must not carry client details or secrets | Adding raw names, emails, tokens, URLs with credentials, or transcript text would leak sensitive data |

No new backend write endpoint was introduced in this phase.

## 5. Best Practices Applied

- Rule 8: Zero PII to LLMs. The AI Village brief used workflow roles and synthetic context, not client names or transcript contents.
- Rule 15: Planning before building. The 15-brain AI Village ran before implementation.
- Rule 17: Dual-pass posture. Implementation was followed by targeted verification and hostile-risk notes.
- Rule 18: Existing-pattern-first. The page uses the existing `useAIChat` hook instead of a new chat transport.
- Rule 21: Task-type Definition of Done. Route behavior, labels, tests, build, and auth redirect were checked.
- Rule 26/27: Canonical surface receipt and surface classification were produced in-thread before coding.
- Rule 40: Design source respected. The Open Design Command Center remains the visual/interaction target.
- Rule 44: Secret scanning. The AI Village prompt was scanned before running the external multi-agent review.

## 6. Known Limitations / Non-Goals

- This phase does not implement the PLAUD/AppLaude folder watcher.
- This phase does not create minimal clients from the Command Center.
- This phase does not append workouts to client charts.
- This phase does not merge full PLAUD transcript state into conversation context.
- This phase does not add the ultimate client workout-history chart.
- This phase does not decompose the oversized `CoachCommandCenterPage.tsx`.
- Browser smoke reached the auth redirect only; an authenticated visual smoke requires an admin session.
- AI Village generated files changed under `AI-Village-Documentation/validation-prompts/latest` and archived the prior run. Those are orchestrator artifacts, not hand-authored product code.

## 7. Performance & UX Considerations

- The mobile dock remains the primary fast-action surface for admin/trainer work.
- Thread selection closes mobile drawers and returns focus to the composer path in the component tests.
- The old shallow action-bar language remains absent from the coach-assistant source scan.
- The current implementation keeps the flow one-handed on mobile by letting the operator select a thread, receive context in the composer, and submit from the fixed dock.
- The build still reports existing Vite large-chunk warnings. This phase did not add a new performance budget gate.
- Follow-up decomposition should split the page to reduce bundle and maintenance risk.

## 8. Test Coverage Summary

Fresh verification run in this phase:

```text
npx vitest run src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.test.tsx --reporter verbose
```

Purpose:

- Red run proved the static thread implementation did not load real conversations.
- Green run proved the page lists real coach threads, loads a selected thread, and submits with `coach_assistant` context.

Broader targeted verification:

```text
npx vitest run src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachInputBar.test.tsx src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.longPrompt.test.ts --reporter verbose
```

Purpose:

- Keeps Command Center, input bar, and long-prompt guard coverage intact.

Build verification:

```text
npm run build
```

Purpose:

- Confirms the frontend compiles after the route wiring change.

Smoke verification:

```text
http://localhost:5173/dashboard/admin/coach-assistant
```

Observed:

- Unauthenticated browser navigation redirects to `/login?returnUrl=/dashboard/admin/coach-assistant` with no console errors during that route load.

## 9. Rollback Plan

Use a normal revert commit, not history rewrite:

```text
git revert <commit-that-introduces-this-phase>
```

If only the UI behavior needs rollback before commit:

```text
Restore the previous versions of:
- frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx
- frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.test.tsx
- frontend/src/components/DashBoard/Pages/coach-assistant/CoachInputBar.tsx
- frontend/src/components/DashBoard/Pages/coach-assistant/ConversationSidebar.tsx
```

No database migration or backend rollback is required for this slice.

## 10. Future Review Hooks

- Recheck that coach-assistant conversations exclude soft-deleted/deleted conversations after backend retention changes.
- Audit whether `context` is enforced server-side or only used as a client-side convention.
- Before adding PLAUD/AppLaude watcher code, threat-model folder path traversal, symlink traversal, duplicate import, unsupported file types, and transcript PII exposure.
- Before minimal-client creation, define required fields, lifecycle state, duplicate matching, and an explicit operator confirmation screen.
- Before workout appends, prove the exact workout-log API and chart data model fields with a schema cross-check artifact.
- Build the ultimate client workout-history chart only after the source-of-truth workout log shape is verified.
- Split `CoachCommandCenterPage.tsx` into smaller components before adding another feature slice.
- Run authenticated mobile visual QA at 300, 332, 390, and 430 px widths once an admin session is available.
- Re-evaluate whether trainer `/plaud` should redirect into Command Center only after trainer permissions and operator flow are defined.

## 11. Codex / AI Review Log

| Time | Review | Result |
| --- | --- | --- |
| 2026-05-14 | Continuity startup | 4 pending promotion markers reported |
| 2026-05-14 | AI Village prompt secret scan | STDIN CLEAN, 0 hits |
| 2026-05-14 | 15-brain AI Village plan review | 14 of 17 validators passed; debates reached consensus; first slice approved |
| 2026-05-14 | Canonical route receipt | Admin route confirmed as `CoachCommandCenterPage`; trainer/client coach surfaces classified separately |
| 2026-05-14 | TDD red run | Static Command Center failed real-conversation expectations |
| 2026-05-14 | Implementation | Real `useAIChat` conversation list/load/send wired into admin Command Center |
| 2026-05-14 | Targeted tests | Command Center, input bar, and long-prompt tests passed |
| 2026-05-14 | Frontend build | Vite production build passed with existing warnings |
| 2026-05-14 | Browser smoke | Unauthenticated admin route redirects to login without route-load console errors |
| 2026-05-14 | Old-label source scan | No `New Chat`, `Search conversations...`, `Type or tap mic...`, `mobile-action-bar`, or `entry.innerHTML` matches remain in the coach-assistant target set |

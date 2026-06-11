# Swan Coach Slice B — Streaming + Perceived Speed (Recursive Plan, Phase A)

> **Status:** B1a SHIPPED 2026-06-10 (`c863a559e` — staged honest indicator, role-aware chips, instant echo; 527/527 frontend tests, tsc clean).
> B1b SPIKE DEPLOYED (kill-switched OFF): `/api/ai-chat/stream-spike` (admin-only, fail-closed 404 until `SWAN_STREAM_SPIKE_ENABLED=true` on Render) + `text/event-stream` compression exemption. **Next action: Sean sets the env var on Render, runs `c:\tmp\sse-spike-probe.ps1`, verdict (STREAMING/BUFFERED) decides B1b's shape. Record the verdict here.**
> **Parent prompt:** `SWAN-COACH-HIVE-MIND-MASTER-PROMPT-2026-06-10.md` (workstream B)
> **Ground truth:** recon agent 2026-06-10 (file:line evidence in session transcript).

## Recon verdict — why B splits in two

True token streaming is blocked by FIVE verified facts, each its own fix:
1. **All provider adapters are non-streaming** — `aiChatService.mjs` `callGemini/callOpenAI/callAnthropic` (~line 2007-2020) use `await response.json()`; no `stream: true` / `streamGenerateContent` anywhere.
2. **Compression middleware buffers responses** — `core/app.mjs:10,95-105`; SSE needs a `text/event-stream` exemption.
3. **Render 30s proxy timeout** — adapters already cap at 25s (`aiChatService.mjs:1925` comment); long-lived SSE behavior through Render's proxy is UNVERIFIED and needs a live spike.
4. **No frontend stream consumer** — `useAIChat.ts:311` does `apiService.post(...)` and awaits `res.data`; zero `EventSource`/`getReader` usage in frontend/src.
5. **Persistence assumes complete responses** — messages saved AFTER the AI finishes (`aiChatRoutes.mjs:674-680`); streaming needs persist-after-stream with a finalization update.

So: **B1a ships the FEELING of fast now (frontend-only, low risk); B1b ships true streaming after a spike proves Render+SSE.**

## B1a — Perceived speed (frontend-only, recommended first)

Goal: every Coach interaction acknowledged <100ms; the 2-8s provider wait feels alive instead of dead.

1. **Instant optimistic echo** — user message appears immediately (pattern partially exists; harden it).
2. **Living progress indicator** — replace any static spinner with a staged Crystalline indicator: "Reading your question…" → "Checking the data…" → "Writing your answer…" (staged by elapsed time, not fake precision). GPU-safe animation, `prefers-reduced-motion` fallback (rule 25), Swan tokens only (rule 6), routed through `swan-design-router` (rule 40).
3. **Suggestion chips** — after a Coach reply, render 2-4 tappable next-action chips (role-aware: trainer → "How's my day look" / "Brief me on …"; client → "Log a workout" / "Show my progress"). 44px targets (rule 2). Chips fire the same send path — zero new backend.
4. **Perceived-latency guard** — if a reply exceeds ~10s, indicator switches to an honest "Still working — big question" state instead of appearing hung.

Files (estimate): `SwanCoachAssistantPage` children only — `CoachMessage`/`CoachInputBar` area + a new `CoachThinkingIndicator` (<300 lines, rule 4) + a `useCoachSuggestionChips` hook; NO backend changes. Tests: vitest component tests for indicator stages + chips render/click; existing chat tests must stay green; mobile 320/375/414px check (rule 24); design dual-pass (rule 23).

## B1b — True token streaming (gated on a spike)

**Spike first (1 hour, throwaway):** a tiny `/api/ai-chat/stream-spike` SSE endpoint (admin-only, kill-switched) that streams 20 counter ticks through Render in production. Proves/[disproves] proxy SSE behavior + compression exemption. NO product code until the spike passes.

Then, in order: (1) Gemini adapter streaming variant (`streamGenerateContent`) — primary provider only, others fall back to batch; (2) compression filter exemption for `text/event-stream`; (3) new streaming message endpoint alongside the existing one (old path stays as fallback — sibling-safe per rule 20); (4) `useAIChat` ReadableStream consumer with progressive rendering; (5) persist-after-stream finalization + abort handling; (6) F1 audit + rate-limit rails apply unchanged.

Risks logged: Render SSE buffering (spike resolves); double-persistence on abort (finalization test); BYOM future models must also stream or gracefully batch (adapter capability flag).

## Open questions (rule-15 gate)
1. **B1a now, B1b after the spike?** Recommended: yes — B1a is pure win; B1b's spike result decides its shape.
2. **B1a in a FRESH session?** Recommended: yes — it's a design-router UI slice (concept gate, responsive matrix, design dual-pass) and deserves a clean context window; this session has shipped F1+A1+A2+governance and is very deep.
3. Chips content: start with the 4 role-aware defaults above, tune later?

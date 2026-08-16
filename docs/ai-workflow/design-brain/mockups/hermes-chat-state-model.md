---
decision: "Hermes chat UI state is an event-sourced, ordered block list per turn. All counts are derived selectors, never stored. UI ephemera (expansion, scroll, draft) live outside the event-sourced store."
status: open
supersedes: none
date: 2026-08-16
linear: SWA-160
---

# Hermes Chat — Block-List State Model (SWA-160 · Slice 1)

> Companion types: [`hermes-chat-state-model.ts`](hermes-chat-state-model.ts) — compiles standalone under `tsc --strict`.
> This schema decision precedes ALL wiring (Slices 3–4). Kimi's catch, verbatim:
> *"A turn is **not** a message pair. It is an ordered, interleaved block list: text → tool → tool → text → approval → text."*
> Build the obvious `messages[] + streamingText` reducer instead of this and you rewrite the store at ~60% completion.

## 1. Shape

```
ChatState
├─ sessionId
├─ turns: Turn[]                          ← append-only order
│    └─ Turn { id, role, status, blocks: Block[] }   ← append-only order
│         ├─ TextBlock     { id, kind: prose|interim, text, streaming }
│         ├─ ToolBlock     { id, toolCallId, name, argsSummary, status, output, outputRisk, durationMs }
│         └─ ApprovalBlock { id, requestId, kind, command, description, state, requestedAt, resolvedAt, resolvedBy }
├─ approvalIndex: rid → {turnId, blockId}  ← O(1) out-of-order resolution
├─ toolIndex: tool_call_id → {turnId, blockId}
├─ resumedPendingKind                      ← "exec"/"clarify"/… when a resumed session is waiting on a prompt whose payload was not re-delivered (see hard case 4)
├─ messageCount                            ← session.resume sanity check (no pagination exists)
└─ connection
```

**Transport target (probed):** the dashboard already exposes `/api/ws` — a JSON-RPC WebSocket (`web_server.py:16258` → `tui_gateway.ws.handle_ws`) speaking the full gateway protocol (`session.list/resume`, `prompt.submit`, `approval.respond`, `session.interrupt`) — plus the `/api/pub`→`/api/events` broadcast channel the current sidebar uses. **Slice 4 is client wiring only; zero gateway changes are required.**

Blocks are **append-only in position, mutable in content by id**. Nothing is ever reordered or removed mid-turn.

## 2. Reducer contract — gateway event → transition

The gateway's structured events (probed and confirmed 2026-08-16, `tui_gateway/server.py`) are the ONLY writes:

| Event | Transition |
|---|---|
| `message.start` | Open assistant `Turn` (status `streaming`) with one open `TextBlock` |
| `message.delta` | Append text to the turn's **open tail** `TextBlock`; if the tail is not an open text block (a tool/approval was appended since), **open a new** `TextBlock` first — this single rule is what makes interleaving free |
| `message.interim` | Upsert the turn's `interim` text block in place (replace text). ⚠ replace-vs-append semantics still unprobed — verify in Slice 4 |
| **Hydration** (`session.resume`) | Not an event, a snapshot: `messages[]` → sealed turns (consecutive assistant/tool rows between user rows group into ONE assistant turn's block list); `inflight` → open streaming turn. See hard case 4 |
| `message.complete` | Seal all open text blocks (`streaming:false`), turn status → `complete` |
| `tool.start` | **Seal** the open text block, **append** `ToolBlock` (status `running`), index by `tool_call_id` |
| `tool.generating` | Update args/progress on the indexed tool block |
| `tool.complete` | Set `status: ok|error`, `output`, `durationMs` via `toolIndex` — position-independent, so it lands correctly even after later blocks exist |
| `tool.output_risk` | Set `outputRisk` on the indexed tool block |
| `approval.request` | Seal open text block, append `ApprovalBlock` (state `pending`), index by `rid` |
| `approval.respond` | Resolve via `approvalIndex[rid]` — **out-of-order safe by construction**; set `state`, `resolvedAt`, `resolvedBy` (`user` \| `policy` \| `smart_denied`). ⚠ Probed 2026-08-16: the gateway emits **no `approval.resolved` broadcast** — the only `_emit` for approvals is the request (`server.py:1878`). The resolving client transitions optimistically; the turn's continuation (next `message.delta`/`tool.start`) is the confirmation |
| Stop / abort | Turn status → `stopped`; running tools → `canceled`. Probed: `session.interrupt` releases blocking waits (`server.py:3349`) and cancels in wait slices (`:2084`); the turn closes via the `message.complete` error-status path (`_emit_terminal_turn_error`, `:7851`) |
| unknown type | Log + ignore. Never throw — forward compatibility with gateway upgrades |

## 3. The four hard cases, and why this model survives them

1. **Tool call between two paragraphs of the same turn, mid-stream** — `tool.start` seals the text tail; the next `message.delta` opens a fresh text block after the tool row. No special case.
2. **Approvals resolved out of order** — resolution goes through `approvalIndex[rid]`, never through position. `n of m` labels are event metadata, not array indices.
3. **Blocks appended while earlier blocks still mutate** — appends touch only the tail; updates touch only indexed ids. The two never conflict.
4. **Reload / reconnect mid-turn** — ~~replay from `lastEventSeq`~~ **CORRECTED after probing the gateway (2026-08-16): there is no event journal and no seq numbers. Rehydration is snapshot-based.** `session.resume` returns the FULL transcript (`messages[]` + `message_count` — **no pagination exists anywhere**) plus an `inflight` snapshot `{user, assistant partial text, streaming, corrections, error, status, recoverable}` (`server.py:7820`). Hydration = map `messages[]` → sealed turns via the block mapper, map `inflight` → one open turn with a single streaming text block, then live events append. Idempotence is still required for duplicate frames — dedupe by `type` + stable id (`tool_call_id`, `rid`), never by a seq that doesn't exist.
   - **Hydrated tool rows are lossy by design:** the transcript projection (`_history_to_messages`, `server.py:7190`) carries `{name, args, 80-char context preview}` but **no output, duration, or ok/error status** → historical `ToolBlock`s get `status:'unknown'`, rendered neutral (no ✓/✗).
   - **Pending approvals do NOT survive reconnect as renderable content:** `approval.request` is emitted exactly once by the blocking `_block()` (default timeout 300s); the payload lives server-side in `_pending_prompt_payloads` while pending, but no attach/resume path re-delivers it. A resumed session reports status `"waiting"` (`_session_pending_kind`) with no card content → the UI renders a degraded "approval pending — content unavailable until it times out or is answered elsewhere" state (`ChatState.resumedPendingKind`). Fixing this properly is a small upstream gateway RPC — **Sean-gated patch-queue item, flagged, not built.**

## 4. Invariants (violations are bugs, not style)

1. **Every count is a derived selector.** `pendingApprovalCount`, `runningTools`, `isAwaitingApproval` — computed from blocks, stored nowhere. This is the structural fix for Mockup finding #4 (pending count hand-maintained in 4 places).
2. **UI ephemera never enter the event-sourced store.** Tool-row expansion, scroll position, composer draft, rail open/closed live in `UiEphemera`, keyed by block id, discarded on reload. Consequence: replay is deterministic and expansion state can't desync from data.
3. **The reducer is pure.** No timers, no fetches, no DOM. Timestamps come from events, not `Date.now()` in the reducer.
4. **At most one open (`streaming:true`) text block per turn**, and it is always the tail.
5. **Turn and block order is append-only.** Sorting, deduping, or splicing in render code is forbidden — the renderer maps state 1:1.

## 5. Deliberately out of scope (Slice 5+)

Virtualization for 200-message threads, 400-line tool-output truncation strategy, sessions-rail pagination. None of them change this schema — they consume it.

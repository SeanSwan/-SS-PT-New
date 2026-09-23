# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/design-brain/mockups/hermes-web-chat-mockup-b.html
**Seed:** docs/ai-workflow/AI-HANDOFF/HERMES-UI-NEXT-STEP-DECISION-PACKET-2026-08-16.md
**Tokens:** 6957 in / 10620 out | **Cost:** ~$0.1802 | **Wall:** 199.7s | **finish_reason:** stop

---

# Q1 — The spike recommendation: right conclusion, wrong experiment

**Freeze the mockup: yes. Spike token streaming: no.** Fable is correct that a third review round on a static file has hit diminishing returns, and correct that the load-bearing risk is in the transport. But the spike as specified aims at the *least* design-invalidating question in the system.

**Token streaming is commodity.** Append-delta-into-DOM over SSE/WebSocket is a solved problem with a dozen reference implementations. The probability that "can tokens stream into a no-bubble thread" invalidates Mockup B is near zero — the thread is a `<div>`; it does not care. A spike that confirms a near-certain assumption buys almost no information.

**The cheaper question that invalidates more of the design:** *Does the gateway emit structured events at all, and what are the approval semantics?* This is answerable by **reading the transport code and protocol for half a day** — no build, no spike. Look at what hangs off it:

- **Tool rows** require `tool_call.start` / `tool_call.end` events with stable IDs, args, exit codes. Today's UI is an **xterm rendering an Ink TUI** — which is strong prima facie evidence the gateway may only expose a *rendered terminal byte stream*, not structured events. If so, every tool row, every status glyph, the entire "Now" rail, and the approval card are unrenderable as designed, and the real work is defining a gateway event protocol — a backend decision that will then *dictate* the UI shape. That is the assumption that invalidates ~70% of the mockup, and it costs an afternoon of reading, not a slice of building.
- **The approval card** — the most novel, most load-bearing element in B — requires: approval requests as addressable events (IDs), *concurrent* pending approvals (the mockup shows "2 of 2"), out-of-order resolution, a deny path the agent reacts to, and **persistence across reload**. If the transport is a blocking request/response that serializes one tool call at a time, the queue UI, the rail mirror, and the "2 pending" turn-state are fiction.
- **The sessions rail** ("133 msgs") requires a history/replay API with pagination. If the transport is live-events-only, the left rail is a different backend than assumed.

A token spike discovers *none* of these limits, because none of them block tokens.

**The still-open design decision a spike makes harder to change:** the **turn state model**. B's design is not message-pairs (user msg / assistant msg). A turn is an **ordered, interleaved block list**: text, tool call, tool call, text, approval, text. If you spike streaming first, the natural scaffolding is a message-centric reducer — `messages[]`, assistant message has a `streamingText` field you append to. Every chat tutorial on earth builds this. Then tool calls and approvals arrive and you bolt them on as siblings of messages, and when you discover a tool call must sit *between two paragraphs of the same turn, mid-stream, while an approval is pending*, you are rewriting the store at 60% completion. The block-list model is a **one-page schema decision that must be made before any wiring** — but it is a document, not another visual mockup round. Same for the unresolved **approval authority** question (see Q3, SEV-1.5): B shows the queue in two places with no source of truth.

**Verdict:** Freeze B as the visual target today. Do not iterate the visuals further. But the next slice is a transport-truth probe + replay harness (Q4), not a token spike. If the protocol read shows structured events exist with sane approval semantics, the token spike becomes a two-day formality *after* the event schema is written — and it should be built against the block-list model from line one.

---

# Q2 — What a successful token spike leaves untested (the 80% bite)

Ranked by blast radius:

1. **Approval round-trip semantics.** Concurrency (can #2 arrive while #1 is pending?), ordering, deny behavior (does the agent retry, replan, abort?), and **reload persistence** (user refreshes with 2 pending approvals — do they come back? Resolved cards keep state?). B hardcodes all of this. At 80% you discover the transport serializes approvals or doesn't persist them, and the queue, the rail mirror, the resolved states, and the focus management all change at once.
2. **History replay and pagination.** A 133-message session with 400-line tool outputs, loaded on click. B assumes full-history render with no virtualization and no pagination API. If the transport can't page history, the sessions rail ships as a lie or the thread janks.
3. **Compound turn states.** B's turn-state row shows exactly one state: "waiting on approval · 2 pending." Real turns are *streaming + tool running + approval pending* simultaneously. The single-string state row is under-designed for the common case, and a token-only spike never exercises it.
4. **Tool-call event granularity.** If the transport only reports tool *results* (not starts), the running state, live elapsed, and Stop-during-tool semantics all degrade — and you find out after the tool-row DOM is wired.

---

# Q3 — Hostile review of Mockup B, cold

Ranked by severity. "Fixed from A" items mostly hold (contrast, focus-visible, real buttons, capped tool output); the failures are in what A's punch list never touched.

## SEV-1

**1. Off-canvas panels remain in the tab order when closed.** At ≤1060px, `.act` is hidden with `transform:translateX(100%)` only. Transformed-off-screen elements are **still focusable** — keyboard and screen-reader users tab into an invisible panel. Same bug for `.rail` at ≤720px. This is a genuine keyboard trap (focus disappears into nothing).

```css
@media (max-width:1060px){
  .act{visibility:hidden;transform:translateX(100%);
       transition:transform .16s,visibility 0s .16s}
  body.act-open .act{visibility:visible;transform:none;transition:transform .16s}
}
```
Plus toggle `inert` on the panel in JS, close on `Esc`, and return focus to the toggle button on close.

**2. No live-region architecture — in a product whose core feature is streaming.** There is not one `aria-live`, `role="log"`, or `role="status"` in the file. This is not polish; it determines the streaming DOM and must be in the handoff, because retrofitting it changes where tokens are appended:

```html
<div class="thread" role="log" aria-label="Conversation" tabindex="0">
<div class="turnstate" role="status">  <!-- announces state changes -->
```
Streaming turn contract: `<div class="turn" aria-busy="true">`; tokens append as **text nodes** into `<span class="stream" aria-hidden="true">` (never let an SR verbalize token soup, and never `innerHTML` the stream — agent output is untrusted input; markdown via a sanitizer only); on completion remove `aria-hidden`/`aria-busy` and push "Response complete" into a visually-hidden `role="status"`. Naive `aria-live="polite"` on the whole thread would re-announce everything on every mutation — worse than nothing.

**3. Approval focus lifecycle is broken.** `.appr.done .acts{display:none}` — when the user clicks Approve, the *focused element* becomes `display:none`, so focus drops to `<body>` and keyboard users lose their place. On resolve: move focus programmatically to the next pending approval's Deny button, or to the resolved card's header (`tabindex="-1"`). Separately: `denyBtn.focus()` **on page load** is a static-page solution to a dynamic problem. In production, approvals arrive *while the user is typing in the composer* — focus theft mid-keystroke is hostile. Correct pattern: don't move focus; announce via `role="status"` ("Approval required: apt-get install nodejs — ⌘Y approve, ⌘N deny") and bind global shortcuts. A hours-daily user will demand `y`/`n` within a week; design it now.

**4. The denial path does not exist.** The Deny button has no handler, and there is no denied visual state — only `.appr.done` (green). For an agentic tool, **denial is the steering mechanism**, and B has no deny-with-reason input ("no, use nvm instead" is the single most valuable signal the user gives the agent). Add:

```css
.appr.denied{border-color:var(--line);border-left-color:var(--err);opacity:.72}
.appr.denied .h{color:var(--err)}
```
…and a deny flow: click Deny → inline one-line reason input (optional, Enter submits, Esc skips) → card collapses to "✗ Denied · reason" and the reason goes to the agent.

**5. Approval authority is undefined, and the mockup is internally inconsistent.** The queued file-write approval ("write cli.py") exists **only in the activity rail** — it never appears in the thread. Which pane is authoritative? Can you approve from the rail? What does a screen-reader user do — hunt across two landmarks for the same queue? And "Approve once" implies a trust ladder that isn't there: no "always allow this command," no way to change the "Approvals: manual" mode shown in the rail (it's static text, not a control). For a manual-approval tool used hours daily, missing trust levels = approval fatigue = users rubber-stamping, which defeats the entire safety feature. Day one needs: once / always-this-command / deny, and the rail's "manual" must be a `<button>` that cycles modes.

## SEV-2

**6. Resolved approval cards never collapse.** `.appr.done` keeps the full command block at 72% opacity forever. A real agent run stacks 5–15 approvals; the thread becomes approval wallpaper. Resolved cards must collapse to one line — `✓ apt-get install nodejs · approved 20:41` — expandable on click:

```css
.appr.done{padding:8px 16px}
.appr.done .cmd,.appr.done .d{display:none}
.appr.done.expanded .cmd,.appr.done.expanded .d{display:block}
```

**7. Tool rows have no running state.** Glyphs are only ✓/✗. The 6.2s `npm install` shows *what* during those 6.2 seconds? Add a spinner glyph with live elapsed and an accessible label ("running, 6 seconds"):

```css
.gl.run{width:9px;height:9px;border:1.5px solid var(--ink-3);
  border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite}
```

**8. 200 messages: no perf plan.** No virtualization, no pagination, not even the free win:

```css
.turn{content-visibility:auto;contain-intrinsic-size:auto 220px}
```
Also unspecified: autoscroll-pause-when-scrolled-up and a "new messages" pill. Browser scroll anchoring covers some of this, but the handoff must state the behavior or every implementer guesses.

**9. Tool output is a dead end.** Capped at 264px — good — but no copy button, no line count ("412 lines"), no expand-to-full. A developer tool where you can't copy an error trace is broken. Add a header row to `.toolout`: line count + Copy + Expand. Same class of bug: `.tool .arg` and `.qcard .c` truncate the *one string that matters* with ellipsis and no `title`/full `aria-label`. The full command must be reachable: `aria-label` on the button with the complete arg.

**10. Scroll regions aren't keyboard-reachable.** `.thread` and every `.toolout` are `overflow:auto` divs with no `tabindex` — keyboard users cannot scroll them reliably across browsers. `tabindex="0"` + `role="region"` + `aria-label` on both.

**11. No connection states — and the spike will need them.** "Gateway · running" is hardcoded green. There is no reconnecting/offline banner, no "stream interrupted" turn state. The transport work will hit these in the first hour; design them now or they get improvised badly.

**12. Composer is under-specified.** `rows="1"`, `resize:none`, no auto-grow — paste 40 lines and they scroll invisibly inside a 22px box. Fix: JS auto-grow to ~180px then scroll (or `field-sizing:content` with a fallback). The hint advertises `/ commands · @ files` with zero UI behind either. No spec for composer-disabled-while-streaming (or queue-while-streaming — pick one). Send button is 26×26px.

**13. The activity rail does not earn 272px as designed.** "Now" is a *worse copy of the thread* — same tool calls, minus outputs, minus args. The approval queue duplicates the inline cards. Duplication without added information is the classic agentic-UI failure. What uniquely justifies the rail: context meter, elapsed, MCP status — that's ~120px of content. What would earn 272px: **files changed this turn** (`web/package.json +12 −4`), cost/tokens, git branch — the things an agentic-tool user actually glances at. Either repurpose the rail (queue + files changed + context + servers, drop "Now") or collapse it to a slim status strip. Also: `.bar i` needs `role="progressbar"` with `aria-valuenow`, and the context number should be a live-updated `<output>`.

**14. No unfocused-tab approval signal.** The agent blocks on approval; the user is in another tab; nothing happens. Title flash (`⚠ Approval needed — Hermes`) + Notification API on approval-request when `document.hidden`. For an agent that *waits*, this is day-one, not nice-to-have.

## SEV-3

**15.** Two unlabeled `<aside>` landmarks (add `aria-label="Sessions"` / `aria-label="Activity"`); `.grp` headers should be headings or `role="separator"` with labelled groups; no skip links ("Skip to composer"); slide transitions not wrapped in `prefers-reduced-motion`; no timestamps on turns; session list is fine as buttons but will want roving tabindex at 50+ sessions; no empty state for a new chat; no markdown spec for agent prose (lists/tables/headings unstyled — the first table the agent emits breaks the layout); no diff rendering for file edits, which an agentic coding tool needs sooner than it needs an MCP server list.

---

# Q4 — The next slice, concretely

**Slice name: "Transport truth + replay harness."** Two halves, one slice:

**Half 1 (≤1 day): protocol read.** Read the gateway transport and answer, in a one-page doc: (a) does it emit structured events — `tool.start`/`tool.end` with IDs, `approval.requested`/`approval.resolved`, `token.delta` — or only the terminal byte stream? (b) Can approvals be concurrent, resolved out of order, and do they survive reconnect? (c) Is there history replay/pagination for the sessions rail? Output: an **event-schema gap document** — the events B's DOM requires vs. the events that exist. If (a) is "byte stream only," the slice pivots to *defining the gateway event protocol*, which is the real blocker, found for the cost of a doc read instead of a wasted spike.

**Half 2 (rest of the slice): replay harness.** Build the real `ChatPage.tsx` skeleton rendering Mockup B's DOM against an **event interface**, driven by a scripted fixture: one recorded turn containing token deltas, three tool calls (one failing), two approvals (one approved, one denied with reason), and a reload mid-turn. This tests interleaving, the block-list reducer, the approval round-trip, compound turn states, and streaming — together, with zero backend dependency — and the harness becomes the permanent dev fixture for everything after. Then wire the real transport behind the same interface; the token spike happens here, as a formality, against the correct state model.

Deliverables of the slice: event-schema gap doc, block-list state model, replay harness, one real turn rendered end-to-end. That is motion *and* progress — and it answers the question that actually kills designs: not "can tokens stream," but "does the event model this UI is drawn against exist."

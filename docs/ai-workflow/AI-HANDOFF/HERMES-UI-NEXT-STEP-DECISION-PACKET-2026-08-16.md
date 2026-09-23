---
decision: "Freeze the mockup and spike the transport, or keep iterating the design? Plus: independent hostile review of Mockup B."
status: open
originating_model: claude-opus-5
date: 2026-08-16
linear: SWA-160
---

# Decision packet — next step on the Hermes chat UI

**Reviewers:** Kimi K3 · GLM 5.3 (independent, do not defer to each other or to Fable)

---

## 1. Situation

**Goal:** replace the chat surface of a local AI agent's web dashboard. Today that "chat" is an
**xterm.js terminal embedded in a React page** — the agent's Ink TUI rendered into a browser
terminal emulator. The owner wants a **real chat UI**: Codex/Claude-like restraint, three panes
(sessions | conversation | activity), **no message bubbles**, tool calls as **collapsed expandable
rows**.

**Done so far:**
- Mockup A (static HTML) → GLM 5.3 hostile review → **6 SEV-1**, 5 SEV-2, 10-item punch list.
- Mockup B (static HTML) rebuilt against all 10 items: contrast fix (`#6b7280`→`#7d8491`, 4.0→5.1:1),
  global `:focus-visible`, real `<button aria-expanded/aria-controls>`, `<textarea>` composer,
  approval card rebuilt (left-bar, self-contained command, `n of 2` queue, resolved state,
  focus-to-Deny), **Stop button + turn-state row**, responsive 1280/1060/720 with slide-away rails,
  `.toolout` capped at 264px scrollable, restraint cuts.
- **Nothing is wired.** Both mockups are static HTML with hardcoded data.

**The real target** (`web/src/pages/ChatPage.tsx`) must additionally: stream tokens live, render
tool calls as they execute over the gateway transport, manage session state, handle the approval
round-trip (approve/deny → agent continues), and stay usable at 200+ messages.

## 2. The recommendation under review

A senior reviewer (Fable) argued:

> Mockup B is a good artifact and a premature commitment. Replacing an xterm terminal with a real
> chat UI is an application rewrite, not a CSS job. The mockups are ~5% of the work and the easy 5%.
> The risk is polishing mockups through three more review rounds while never touching the code that
> has to do the hard part.
>
> **Recommendation:** freeze Mockup B as the visual target, write the handoff now, and make the next
> slice a **streaming spike** — wire ONE real thing (live token streaming from the agent into the
> no-bubble thread) against the real gateway transport. Not sessions, not the activity rail, not
> approvals. That answers the only question that matters: is this design buildable against the real
> API, or does the transport force a different shape? Further design review on a static file has
> sharply diminishing returns and may be polishing a plan whose load-bearing assumption is untested.

## 3. What we want from you

**Q1 — Is the spike-first recommendation right?** Attack it. Is "freeze the design, prove the
transport" correct here, or is it a false economy? Specifically: is there a *cheaper* question than
streaming that would invalidate more of the design if answered first? Is there a design decision
still open that a spike would make *harder* to change later (i.e. a genuine reason to keep
iterating the mockup now)?

**Q2 — What does the spike risk missing?** If we freeze on B and validate only streaming, what
design assumption survives untested and bites us at 80% completion?

**Q3 — Independent hostile review of Mockup B itself.** (Kimi: you have not seen this file before —
review it cold. GLM: you wrote the punch list; your job now is to check whether the *fixes* actually
hold, and to find what you missed the first time, not to re-list your own findings.) Attack:
information hierarchy for an agentic tool · the approval card under stacking and denial ·
accessibility beyond contrast (keyboard traps, screen-reader semantics, live regions for streaming
output) · what a 200-message thread and a 400-line tool output do to it · whether the activity rail
earns its width · what is missing that this UI needs on day one.

**Q4 — Sequencing.** If not the streaming spike, what exactly should the next slice be? Name it
concretely enough to execute.

## 4. Constraints

- The owner is an experienced developer who uses this tool for hours daily. He called an earlier
  deliverable "weak" — vague praise is worse than useless.
- He explicitly chose **restraint over house brand style**. Do not recommend adding decoration.
- The agent's existing terminal UI keeps working throughout; there is no pressure to ship fast, but
  there is strong pressure not to burn effort on motion without progress.
- Rank findings by severity. Give concrete, executable recommendations — not principles.

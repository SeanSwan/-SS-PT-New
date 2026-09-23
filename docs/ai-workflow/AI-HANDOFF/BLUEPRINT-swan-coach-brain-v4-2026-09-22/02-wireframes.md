# 02 — Wireframes (Command Center v4)

The design references are the conversation-first harnesses: one centred thread, one
composer, tool activity shown as quiet collapsible steps, and approvals as inline diff
cards. The Swan lens supplies every colour, radius and glow through tokens, with no
hard-coded values (J14).

## What gets removed from today's first screen (measured in the hostile review, M1)

| Today (coach branch, rendered) | v4 |
|---|---|
| "Selected client / MAIN CLIENT / No main client" hero block | **Removed.** The client is a chip in the composer and in the header |
| Intent bar "Ask or act" *plus* dock composer | **One composer** |
| "New chat · No client selected" strip | Folded into the header line |
| Talk / Review / History tabs | History → sidebar; Review → Approvals inbox in the inspector; Talk is the page |
| Right rail "Workout command center" (hero + 6 cards) | Slash commands + 3 empty-state starters |
| "Nothing saves until you confirm" pill + "Confirm before save" label | One line of helper text under the composer, shown once per session |
| `OPERATOR COMMAND` label on user messages | No role labels; alignment and avatar carry it |
| Floating avatar button over the rail | Removed inside the workspace |

## Desktop ≥ 1200 px

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ◐ Swan Coach   Maria R. ▾  ·  Thursday plan review                 ● Claude · live   ⌘K │  ← 48px header
├───────────────┬──────────────────────────────────────────────────────┬────────────────┤
│ ＋ New chat    │                                                      │ MARIA R.     ✕ │
│ 🔍 Search      │   You                                                │ Next: Thu 6am  │
│               │   How's Maria doing this week? Move Thursday to Fri   │ 3 sessions/wk  │
│ TODAY         │   at 3 if she has a knee flare.                      │ ⚠ L knee (Tue) │
│ • Maria R.    │                                                      │────────────────│
│   Thu plan    │   ◇ Coach looked at 3 things          ▸ (collapsed)  │ APPROVALS  1   │
│ • Dev K.      │     workouts (5) · pain log · schedule               │ Reschedule Thu │
│   Deadlift    │                                                      │  → Fri 3pm  ▸  │
│ YESTERDAY     │   Coach                                              │────────────────│
│ • Group 6am   │   Maria logged 3 sessions; squat top set +10 lb.     │ TODAY          │
│ ...           │   Her left-knee note from Tuesday is still active,   │ 2 clients due  │
│               │   so I'd move Thursday and swap lunges for step-ups. │ 1 at-risk      │
│               │                                                      │                │
│               │   ┌ Reschedule session ─────────────── expires 4:59 ┐│                │
│               │   │ Thu Sep 24 6:00am  →  Fri Sep 25 3:00pm        ││                │
│               │   │ Credits: unchanged · Notify client: yes        ││                │
│               │   │ [ Approve ]  [ Edit ]  [ Reject ]              ││                │
│               │   └─────────────────────────────────────────────────┘│                │
│               │                                                      │                │
│               │  ┌──────────────────────────────────────────────┐    │                │
│               │  │ @Maria R.  Ask, log, plan… (/ for commands)  │    │                │
│               │  │ ＋ attach                       🎙  ▢ hands-free  ↑ │ │                │
│               │  └──────────────────────────────────────────────┘    │                │
│               │   Changes always wait for your approval.            │                │
└───────────────┴──────────────────────────────────────────────────────┴────────────────┘
   240px, collapsible        conversation max-width 760px, centred        320px, toggles (I)
```

## Mobile 375–414 px

```
┌──────────────────────────────┐
│ ☰  Maria R. ▾        ● live  │  44px
├──────────────────────────────┤
│ You                          │
│ How's Maria doing…           │
│                              │
│ ◇ Coach looked at 3 things ▸ │
│ Coach                        │
│ Maria logged 3 sessions…     │   transcript ≥ 70% of height (J13)
│ ┌ Reschedule ───── 4:59 ┐    │
│ │ Thu 6am → Fri 3pm     │    │
│ │ [Approve] [Edit] [✕]  │    │
│ └───────────────────────┘    │
├──────────────────────────────┤
│ @Maria  Ask or log…   🎙  ↑  │  composer pinned; lifts with keyboard
└──────────────────────────────┘
☰ opens threads (sheet). Tapping the client chip opens the inspector (bottom sheet, 60%).
```

## Empty state (no client, no thread): must send (C2)

```
          ◐  What are we working on?
   [ Log a session ]  [ Plan this week ]  [ Who needs attention? ]
   ┌───────────────────────────────────────────────────────────┐
   │ Ask anything, or @ a client…                     🎙   ↑   │
   └───────────────────────────────────────────────────────────┘
```

With no client, the turn runs in **self/roster scope**, where roster-level tools
(`at_risk_clients`, `view_today_schedule`) are available. The send is never refused
silently.

## Turn and approval states (every one has a rendered form)

| State | Rendering | Keyboard / a11y |
|---|---|---|
| idle | composer focused, starters | `/` opens slash menu, `@` opens client picker |
| sending | user bubble + subtle shimmer (≤ 800 ms) | `aria-busy` on thread |
| streaming | text grows; caret; **Stop** replaces ↑ | `Esc` = stop; live region polite, batched per sentence |
| tool running | timeline row "Looking at workouts…" spinner | collapsed by default; `Enter` expands |
| tool failed | row shows "Couldn't read pain log — continuing without it" | no modal |
| approval.required | inline card with countdown and diff | focus moves to card heading; `A` approve, `E` edit, `R` reject |
| approved → committed | card collapses to receipt "Rescheduled · undo 10 min" | announced assertively once |
| rejected / expired / invalidated | card greys with reason ("Client changed since this was proposed") | no retry loop |
| refused (typed) | system note with reason + next step (J02) | never silent |
| provider degraded | header dot amber "Backup brain"; answer still streams | tooltip names model |
| offline | composer keeps text; banner "Offline — will not send" | send disabled with reason |
| cancelled | partial text kept, marked "stopped" | — |

## Slash commands (P4) — each is a pre-filled intent, not a separate code path

`/log` · `/plan` · `/schedule` · `/review` (opens approvals) · `/brief` · `/client <name>` ·
`/brain` (admin only: pick model for this thread)

## Hands-free (P6)

The 🎙 button toggles dictation into the composer. **Hands-free** (checkbox) sends on
pause and speaks the final text. Barge-in stops TTS. The listening state is always visible
in the composer border, and there are no hidden press-and-hold semantics
(live blueprint §8).

## Theme lens contract (J14)

The workspace consumes only the lens tokens the current styles already use (measured
use counts on the coach branch):

- `--bg-base`, `--bg-surface`, `--bg-elevated`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--accent-primary` (145), `--accent-secondary`, `--accent-gold`
- `--border-soft`, `--danger-text`
- `--lens-panel-radius`

The parallel `--coach-*` layer (`--coach-cyan` 95, `--coach-text` 60, `--coach-line` 50 …)
is mapped onto those tokens in one file, `coach-workspace/workspaceTokens.ts`, and is not
used directly. Today the coach styles also contain **210 hard-coded colour literals**
(hex/rgb in `coach-assistant/*Styles*.ts` + `styles/`), which is why some panels ignore a
lens switch. `ConsoleAtmosphere` stays at ≤ 6% opacity behind the conversation column
only. Checked by `09-tests.md` T-J14 (lint: zero hex/rgb/hsl literals in `coach-workspace/**`).

## Accessibility

- 44 px minimum targets
- visible focus
- `prefers-reduced-motion` disables the shimmer and caret blink
- approval cards are `role="group"` with a labelled heading
- every icon button has a name
- colour is never the only signal: the degraded state also shows text

---
decision: "Freestyle is a discrete labelled control, never a press-and-hold gesture; every terminal state has a drawn screen."
status: open
supersedes: none
---

# 02 — Wireframes

Palette tokens are mandatory — **no hardcoded colours**. Every `color-mix()` needs a plain `rgba()`
fallback **declared first** (an unsupported `color-mix()` invalidates the whole declaration, which
on iOS < 16.2 leaves the surface with no background at all) `[SUPPLIED]`.

| Token | Fallback | Use |
|---|---|---|
| `--coach-cyan` / Ice Wing | `#60C0F0` | freestyle accent, live ring |
| `--coach-purple` / Wing Purple | `#8B5CF6` | send, focus ring |
| `--bg-base` / Obsidian | `#0A0A0F` | overlay scrim |
| `--coach-text` / Frost White | `#E0ECF4` | text |
| `--coach-danger` | `#ff6b6b` | discard, error |

All controls ≥ **44×44 px**. Dock buttons are 56 px desktop / 54 px ≤768 / 52 px ≤380 `[SUPPLIED]`.

---

## 1. Dock — idle (desktop ≥1280)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [≡ More]   ┌────────────────────────────────────────┐  ((•)) (🎙) (↑)│
│             │ Ask Swan Coach, or just talk…          │   FS  MIC SEND │
│             └────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────────┘
```

- **FS** = freestyle, `.dock-freestyle`, lucide `AudioLines` 22 px, cyan-tinted surface.
  `aria-label="Start freestyle dictation"`, `aria-pressed="false"`,
  `title="Just talk — hands-free dictation that lands in the composer as a draft"`.
- **MIC** = existing short-command capture. Unchanged.
- Placeholder copy: `Ask Swan Coach, or just talk…`
- **Tab order:** More → textarea → FS → MIC → Send. FS precedes MIC because dictation is the
  primary gym-floor action.
- **No press-and-hold anywhere.** A hold gesture is undiscoverable, unusable by keyboard, and
  unreliable with gloved or wet hands.

## 2. Dock — mic already active (capture lock held)

```
│  [≡ More]   │ …                       │  ((•))ᵈ (🎙)● (↑)   │
│             └─────────────────────────┘   dim   listening    │
│  ⚠ Finish the voice command first — one microphone at a time.│
```

FS is `disabled` with `aria-disabled="true"`; the inline line is `role="status"`. **No silent
no-op, and no pre-emption of a live capture.**

## 3. Freestyle overlay — listening (desktop)

```
┌──────────────────────────── scrim rgba(10,10,15,.94) ────────────────────┐
│                                                          [✕ Close]        │
│                          ╭───────────────╮                                │
│                          │   ((( ● )))   │   breathing orb, cyan          │
│                          ╰───────────────╯                                │
│                        Listening — keep talking                           │
│        ┌─────────────────────────────────────────────────┐                │
│        │ "…felt tight through the left hip on set three" │  live phrase   │
│        └─────────────────────────────────────────────────┘                │
│              02:41            318 words            ● rec                  │
│                                                                           │
│        [ ⏸ Pause ]        [ ✓ Done ]        [ 🗑 Discard ]                 │
└───────────────────────────────────────────────────────────────────────────┘
```

- Counters, not a transcript — nobody reads back ten minutes mid-session `[SUPPLIED]`.
- `role="dialog" aria-modal="true" aria-labelledby` → the status line; focus trapped;
  **Esc = Pause, never Discard** (Esc must not be able to destroy ten minutes of work).
- Live region: `aria-live="polite"` on the status line; the phrase box is `aria-live="off"` to
  avoid a screen reader reading every partial.

## 4. Freestyle overlay — 375 px

```
┌───────────────────────────┐
│                    [✕]    │
│        ╭─────────╮        │
│        │ (( ● )) │        │
│        ╰─────────╯        │
│   Listening — keep talking│
│  ┌─────────────────────┐  │
│  │ "…left hip, set 3"  │  │
│  └─────────────────────┘  │
│   02:41  ·  318 words     │
│                           │
│  ┌─────────┐ ┌─────────┐  │
│  │ ⏸ Pause │ │ ✓ Done  │  │
│  └─────────┘ └─────────┘  │
│  ┌─────────────────────┐  │
│  │      🗑 Discard      │  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

Controls stack; each ≥44 px tall, ≥8 px apart. Discard is on its own row so a thumb reaching for
Done cannot hit it. Safe-area inset respected at the bottom.

## 5. Paused

```
│        ╭─────────╮                      │
│        │  ( ‖ )  │   orb still, dimmed  │
│        ╰─────────╯                      │
│       Paused — 318 words held           │
│  [ ▶ Resume ]  [ ✓ Done ]  [ 🗑 Discard ]│
```

## 6. Discard confirmation (two-step, mandatory)

```
│   Discard 318 words?                    │
│   This cannot be undone.                │
│   [ Keep listening ]   [ Discard ]      │
```

Initial focus on **Keep listening**. Both are real buttons — **no hover-only affordance, no
mouse-only confirm**; a keyboard user must be able to reach both.

## 7. Permission denied

```
│   Microphone blocked                    │
│   Swan Coach can't hear you. Allow      │
│   microphone access in your browser     │
│   settings, then try again.             │
│   [ Try again ]      [ Close ]          │
```

Copy names **no** browser-specific menu path — it goes stale and differs per platform.

## 8. Recognition unsupported

```
│   Dictation isn't available here        │
│   This browser doesn't support speech    │
│   recognition. You can still type, or    │
│   use the microphone button to record    │
│   a short command.                       │
│   [ Close ]                              │
```

When unsupported is detected **before** open, the FS button is `disabled` with this text as its
`title` — the overlay never opens only to fail.

## 9. Recogniser error mid-session (buffer retained)

```
│   ⚠ Lost the microphone                  │
│   Your 318 words are safe.               │
│   [ Resume listening ]  [ ✓ Done ]       │
│   [ 🗑 Discard ]                          │
```

**The buffer is never auto-purged on a recoverable error.** Done remains available so a coach can
bank what was captured.

## 10. Empty result

```
│   Nothing heard                          │
│   Swan Coach didn't pick up any words,   │
│   so nothing was added to your message.  │
│   [ Try again ]      [ Close ]           │
```

Explicitly states that **nothing was added** — the composer is unchanged, and silence about that
reads as success.

## 11. Rejected handoff — binding changed

```
│   Session changed                        │
│   You switched client or signed in again │
│   while dictating, so those words were   │
│   discarded instead of being added to    │
│   someone else's message.                │
│   [ Close ]                              │
```

This is the visible face of `RejectReason`. It must be **shown**, never swallowed: a silent purge
looks identical to a silent data loss.

## 12. After a successful handoff

```
│  [≡ More]  ┌──────────────────────────────────┐  ((•)) (🎙) (↑) │
│            │ typed note                       │                 │
│            │                                  │                 │
│            │ felt tight through the left hip  │ ← caret at end   │
│            └──────────────────────────────────┘                 │
│            ✓ 318 words added as a draft — review before sending. │
└──────────────────────────────────────────────────────────────────┘
```

- Blank line separates typed from dictated so the seam is visible before approval.
- Confirmation is `role="status"`, auto-dismiss 6 s, and **says "draft" and "review"** — it must not
  imply anything was sent or saved.
- Caret at end of value.
- **`[UNVERIFIED]` — `requestAnimationFrame` before `focus()` does NOT guarantee a mobile keyboard
  raises.** iOS raises the keyboard only inside a user-gesture task, and a rAF callback may fall
  outside it. Treat "keyboard appears on tablet" as unproven until `09-tests.md` T-08.4 runs on a
  physical device. Do not write copy that promises it.

## 13. Interrupted / backgrounded

Tab hidden or app backgrounded → session **auto-pauses** (never silently keeps listening, never
silently discards). On return:

```
│   Paused while you were away             │
│   318 words held.                        │
│   [ ▶ Resume ]   [ ✓ Done ]   [ 🗑 Discard ]│
```

If TTL elapsed while hidden, the buffer is purged and screen §11's pattern is shown with
`reason: ttl` copy: `Your dictation timed out and was discarded.`

## 14. Responsive matrix to verify (`09-tests.md` T-08)

320 · 375 · 414 · 768 · 1024 · 1280 · 1440 · 1920 · 2560×1440 · 3840×2160.
At every width: no horizontal scroll, no overlap, all targets ≥44 px, discard never adjacent to
Done on touch widths, and the overlay's controls reachable above the safe-area inset.

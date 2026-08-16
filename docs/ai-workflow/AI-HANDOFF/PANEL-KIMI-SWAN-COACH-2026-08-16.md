# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-SWAN-COACH-BATCH-REVIEW-PACKET.md
**Seed:** (none)
**Tokens:** 10081 in / 12163 out | **Cost:** ~$0.2127 | **Wall:** 76.4s | **finish_reason:** stop

---

# Hostile Review — Swan Coach Freestyle Batch (S2)

Reviewer: Kimi K3, SwanStudios front-end/design review. Findings ranked worst-first. Line references are to the pasted source.

---

## SEVERITY 1 — Silent session auto-restart after purge

**Where:** `CoachFreestyleOverlay.tsx`, the auto-start effect:

```ts
useEffect(() => {
  if (isOpen && state === 'idle') start();
}, [isOpen, state, start]);
```

**What breaks:** Every purge path in `useFreestyleSession` ends in `setState('idle')` — TTL purge (`clearBuffer('ttl')` → `setState('idle')`) and account-switch purge (`clearBuffer('account-switch')` → `setState('idle')`). If the overlay is open when either fires, this effect sees `state === 'idle'` and **immediately starts a brand-new session with zero user intent**. Three concrete harms:

1. The TTL purge — a data-loss event the user must be told about — is masked. The screen goes from "session purged" to "Listening" with no interruption. Sean loses ten minutes of dictation and the UI's response is to pretend a new session began.
2. Account-switch purge on the shared gym tablet: trainer B inherits a *running* session they never asked for, under their account key.
3. The moment S3 wires this to `useCoachCapture`, this effect becomes a **mic re-acquisition without a user gesture** — which iOS Safari will either reject (broken state) or, worse, prompt for on a hidden-ish surface.

**Fix (builder-exact):** Fire only on the closed→open edge, never on a state transition:

```ts
const wasOpenRef = useRef(false);
useEffect(() => {
  const justOpened = isOpen && !wasOpenRef.current;
  wasOpenRef.current = isOpen;
  if (justOpened && state === 'idle') start();
}, [isOpen, state, start]);
```

After a purge-while-open, the existing `idle`-state "Start talking" row already renders — that is the correct UX: the user decides.

---

## SEVERITY 1 — Closed overlay stays in the accessibility tree and keeps the session alive

**Where:** `CoachFreestyleOverlay.styles.ts` — `FreestyleOverlay` hides with only `opacity: 0` + `pointer-events: none`. `CoachFreestyleOverlay.tsx` renders unconditionally.

**What breaks:**
- An `aria-modal="true"` `role="dialog"` that is visually gone is still announced and navigable by screen readers and keyboard. Tab reaches invisible Pause/Done/Discard buttons. This is a hard WCAG failure (2.4.3, 4.1.3) and it's the kind of thing an a11y audit flags instantly.
- Because the component never unmounts on close, the `unmount` purge in `useFreestyleSession` never fires on close, and the 1s tick interval keeps running while `state === 'listening'` — a hidden, live session on a shared device. The retention contract's purge triggers are discard/account-switch/TTL/unmount; "parent set `isOpen=false`" is none of those, so the buffer sits.
- Full-viewport `backdrop-filter: blur(14px)` compositing on a low-end Android, running permanently, for an invisible element.

**Fix:** Conditional render after all hooks (all hooks are above the return, so this is legal):

```ts
if (!isOpen) return null;
```

And belt-and-braces in styles:

```css
visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
```

Then decide the contract question explicitly: if a parent can hide without `onClose`, add an effect that treats hide as close (`reset()`), or document that parents must unmount. Right now it's undefined behavior for a retention-contract feature.

---

## SEVERITY 2 — `StatusLine` live region spams screen readers once per second

**Where:** `CoachFreestyleOverlay.tsx`:

```tsx
{isListening && isQuiet && `Still listening. Nothing heard for ${quietFor}s.`}
```

**What breaks:** The hook ticks every 1000ms; `quietFor` increments every second; the string is inside `role="status" aria-live="polite"`. Once quiet, a screen reader announces "Nothing heard for 4 seconds… 5 seconds… 6 seconds…" **forever, during a dictation session where the SR user is trying to talk.** The comment claims "one polite live region" — the implementation is one impolite live region.

**Fix:** Announce the transition, not the counter. Keep the number visual-only:

```tsx
<StatusLine role="status" aria-live="polite" $muted={!isListening}>
  {isListening && !isQuiet && 'Listening. Talk as long as you need — nothing is saved yet.'}
  {isListening && isQuiet && 'Still listening. Nothing heard for a few seconds.'}
  ...
</StatusLine>
{isListening && isQuiet && (
  <QuietCount aria-hidden="true">{quietFor}s silent</QuietCount>
)}
```

The string is now stable across ticks, so the SR announces it once.

---

## SEVERITY 2 — `error` is produced by the hook and dropped by the surface

**Where:** `CoachFreestyleOverlay.tsx` destructures `state, fragments, elapsedMs, sinceLastFragmentMs, wordCount, discardPending, start, pause, resume, stop, requestDiscard, cancelDiscard, discard, reset` — **`error` is never read, never rendered.** `useFreestyleSession` exposes `error` and `setError`; the overlay shows nothing. An `error`-state session renders the "Start talking" row with no explanation.

**Fix:** Render it assertively, above the controls:

```tsx
{state === 'error' && error && (
  <StatusLine role="alert">{error}</StatusLine>
)}
```

---

## SEVERITY 2 — `start()` wipes the buffer with no guard and no purge receipt

**Where:** `useFreestyleSession.ts`, `start`:

```ts
const start = useCallback(() => {
  setError(null);
  setDiscardPending(false);
  setFragments([]);          // ← raw wipe, no onPurge, no state guard
  ...
```

**What breaks:** `start` is callable from any state — `listening`, `paused`, `stopped`. From `stopped` (buffer held, handed nowhere yet) it silently destroys the session with no two-step, no `onPurge` receipt. The audit trail the contract asks for has a hole exactly where data dies. Combined with Finding 1's effect, this is reachable from the UI, not just the API.

**Fix:**

```ts
const start = useCallback(() => {
  const s = stateRef.current;
  if (s === 'listening' || s === 'paused') return;      // never restart a live session
  clearBuffer('discard');                                // receipted wipe, resets all refs
  setError(null);
  setDiscardPending(false);
  startedAtRef.current = nowRef.current();
  stateRef.current = 'listening';
  setState('listening');
}, [clearBuffer]);
```

(Note `clearBuffer` already resets `startedAtRef/pausedTotalRef/pausedAtRef/lastFragmentAtRef/nextIdRef` — the current `start` duplicates that list, which is a future-drift bug waiting to happen.)

---

## SEVERITY 2 — Purge receipts are mislabeled on the close and handoff paths

**Where:** `useFreestyleSession.ts` `reset` calls `clearBuffer('discard')`; `CoachFreestyleOverlay.tsx` `handleClose` calls `reset()`.

**What breaks:** Two non-discard flows emit a `'discard'` receipt:
1. User taps Close after stopping — the buffer was just handed to `onStopped` (S4's input). Audit says "discarded." It wasn't.
2. User taps Cancel with zero fragments — nothing existed; receipt says a discard happened.

If `onPurge` feeds compliance receipts, the log is wrong in both directions. **Fix:** extend the union — `type FreestylePurgeReason = 'discard' | 'account-switch' | 'ttl' | 'unmount' | 'close' | 'handoff'` — give `reset` a reason parameter (`reset(reason: FreestylePurgeReason = 'close')`), and have `handleStop`'s eventual successor path purge with `'handoff'`.

---

## SEVERITY 3 — `atMs` includes paused time; `elapsedMs` excludes it

**Where:** `useFreestyleSession.ts` `appendFragment`: `atMs: at - startedAt`. Compare `elapsedMs`, which subtracts `pausedTotalRef` and the open pause span.

**What breaks:** The fragment timeline and the session clock disagree. Pause for 3 minutes mid-session and every subsequent fragment's `atMs` is inflated by 180,000ms. S4 will use `atMs` to order fragments against days/records ("Tuesday's session, then I corrected myself") — the skew is silent and structural. The doc comment says "ms since session start," which is ambiguous; the rest of the hook says active time.

**Fix:** fragments can't arrive while paused (guarded), so the open-pause span is always zero at append time:

```ts
atMs: at - startedAt - pausedTotalRef.current
```

---

## SEVERITY 3 — `color-mix()` has no fallback; overlay goes transparent on iOS Safari < 16.2

**Where:** `CoachFreestyleOverlay.styles.ts` — `FreestyleOverlay` background, `SignalStrip` background/border, `ControlButton` variants, `DiscardConfirm`.

**What breaks:** `color-mix` is unsupported before iOS 16.2 / old Chrome. An unsupported function invalidates the **whole declaration** — the `var()` fallback inside it never gets a chance. Result: the overlay background is transparent over arbitrary page content, danger buttons lose their background, borders vanish. Sean's gym phone on an old iOS gets an unreadable screen. This is exactly the device class this feature targets.

**Fix:** cascade a plain fallback before every `color-mix` declaration:

```css
background: var(--bg-base, #0A0A0F);
background: color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent);
```

Same pattern for `SignalStrip`, `danger` variant, `DiscardConfirm`. Also add `-webkit-backdrop-filter: blur(14px);`.

---

## SEVERITY 3 — No focus management on a modal dialog

**Where:** `CoachFreestyleOverlay.tsx`. `role="dialog" aria-modal="true"` but: no initial focus, no Tab trap, no focus return to the trigger, background not inert.

**Fix (minimal, no dependency):**

```ts
const overlayRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (!isOpen) return;
  const prev = document.activeElement as HTMLElement | null;
  overlayRef.current?.querySelector<HTMLElement>('button')?.focus();
  return () => prev?.focus();
}, [isOpen]);
```

Plus a Tab keydown handler cycling within `overlayRef.current.querySelectorAll('button')`. When discard is armed, move focus into the `alertdialog` — that's the interrupt, focus must follow it.

---

## SEVERITY 3 — Capture/session lifecycle divergence (integration trap)

**Where:** `useCoachCapture` stops recording on `visibilitychange`/`pagehide`; `useFreestyleSession` has no hidden handling at all.

**What breaks (in S3, when wired):** the mic auto-stops on screen lock, but the session stays `'listening'`: elapsed keeps counting, the UI says "Listening," the quiet detector starts counting silence. The surface will *lie* during the exact event the capture hook was built to handle. **Fix now, in the contract:** when wired, `stoppedAutomatically === true` from `useCoachCapture` must drive `session.stop()` (not pause — the capture is already terminal). Write the mapping before S3 starts, not during.

---

## SEVERITY 4 — Lower-severity defects, one line each

- **Off-palette danger color.** `#C92A54` / `#FF8FA3` are not in the ratified Crystalline Swan palette. Contrast math passes (~7.5:1 — I checked), but the tokens are unratified. Ratify them as `--danger-text`/`--danger-soft-text` in the token file or this is governance drift. (`CoachFreestyleOverlay.styles.ts`, `ControlButton` danger variant.)
- **Discard arm never times out.** `discardPending` stays armed indefinitely; a stray tap minutes later confirms. Add a 10s auto-`cancelDiscard`.
- **`stopInternal` calls `setState` during unmount cleanup** (`setStoppedAutomatically`, `setAutoStopCopy` on the `'auto-unmount'` path). No-op in React 18, but it's noise — guard with a mounted ref or branch the reason.
- **Unverified load-bearing assumption:** the hook's "headline promise" (mic released on hidden/unmount) depends entirely on `recorder.stop()` stopping the *tracks*, not just the MediaRecorder. `useVoiceRecorder` is not in this batch and is the file with the original no-cleanup sin. Add a test asserting `MediaStreamTrack.readyState === 'ended'` after auto-stop, or the promise is unproven.
- **Render-phase ref mutation** (`stateRef.current = state`, `nowRef.current = now`) — fine today, tears under concurrent rendering. Move `stateRef` sync into an effect and accept the one-commit lag, or document the tradeoff like the uncovered guard.
- **`handleStop` passes the live `fragments` array** to `onStopped` — parent can mutate session history. Pass `[...fragments]` or a frozen copy.
- **No breakpoints anywhere.** Fluid layout + `max-width: 560px` covers 320–3840 acceptably, but verify the three-button wrap at 320px (Pause + Done + Discard = ~3 rows) and consider `min(560px, 100%)` sizing at 2560/3840 where 560px reads lost. Not a defect; an unverified claim.
- **`LivePhrase` contradicts the file's own header** ("shows counters, not a transcript") and renders raw dictated client names on a screen visible across a gym floor. See Attack section.

**Fine, one line each:** 52px touch targets ✓; retired palette (`#0a0a1a`, `#00FFFF`, `#7851A9`) absent ✓; gold correctly unused ✓; Arctic Cyan not misused ✓; Dual-Button Glow direction correct (blue bg → purple glow) ✓; reduced-motion covered by `motionSafe` ✓; all four files under 300 lines ✓; no MUI ✓; no "AI"/"yoga"/"meditation" in copy ✓; Victory N/A (no charts in this slice) ✓; two-step discard + Escape-arms-not-destroys is correct ✓.

---

## SINGLE HIGHEST-IMPACT IMPROVEMENT

**Fix Finding 1 — gate the auto-start on the `isOpen` edge.** It is three lines, and it is the only defect that (a) destroys/masks user data today, (b) violates the shared-tablet guarantee's spirit, and (c) becomes a *microphone-acquisition-without-gesture* bug the day S3 lands. Everything else is polish; this one compounds.

---

## ENHANCEMENTS — one-handed, mid-session, gym floor

1. **Haptic + audio cue on auto-stop.** When the lifecycle policy kills a capture (screen lock, tab hide), Sean is not looking at the screen. `navigator.vibrate([200, 100, 200])` plus a short tone on `stoppedAutomatically` — otherwise he talks into a dead mic for two minutes.
2. **Wake Lock during `listening`.** `navigator.wakeLock.request('screen')` on start, release on stop/pause. The single most likely session-killer on a gym floor is the phone auto-locking mid-dictation — which also triggers your own auto-stop policy. Prevent the collision instead of handling it.
3. **Real input-level meter instead of (or inside) the BreathOrb.** The orb breathes whether or not the mic hears anything — it proves the *UI* is alive, not that *Coach* is hearing. When S3 wires capture, drive orb scale/opacity from an AnalyserNode RMS level. Silence-detection you can see from six feet away.
4. **Full-width bottom "Done" bar.** The primary action should be a 64px-tall, full-width thumb-zone bar at the bottom edge, with Pause as a smaller secondary above-left and Discard spatially separated (it already is via the confirm — keep that). Current `ControlRow` puts Done and Discard one `flex-wrap` away from each other.
5. **Bluetooth route-change auto-pause.** Headset disconnects mid-dictation → `devicechange` → pause with copy "Headset disconnected. Paused." Otherwise he finishes a set, headset dies, and three minutes of dictation go to the phone mic in his pocket — or nowhere.
6. **Discard-arm timeout** (also listed as a defect) — 10s, with the countdown visible on the confirm button: "Discard (9)".
7. **Persist `discardPending` across the quiet detector** — already fine, but ensure the 1s tick doesn't re-render-thrash the confirm dialog's focus.

---

## WHAT I WOULD ATTACK

1. **`LivePhrase` as a PII leak.** It renders the latest raw dictated fragment — client names, pre-tokenization — to the DOM, on a full-screen surface, on a shared gym tablet, visible over shoulders and scrapable by any injected script or malicious extension. The zero-PII rule governs what leaves the device, but this is the easiest place to *read* PII without defeating anything. Attack: XSS anywhere in the app → `document.querySelector('p')` scrape on a 1s interval. Mitigation: delete `LivePhrase` (the header comment already argues for counters-only) or mask it.
2. **The `onStopped(fragments)` handoff.** S2 is write-free, so the attack is on the seam: when S4 consumes this callback, if fragments go to a model verbatim, the zero-PII law dies at the boundary. I'd watch this exact argument in the S4 diff. Tokenization must happen before anything leaves — and there is no test in this batch pinning that.
3. **Account-switch as a destruction weapon.** On the shared tablet, switching accounts purges trainer A's buffer with no confirm (correct per contract) — so anyone who can trigger the account switcher can destroy a session. The only trace is `onPurge`. If that callback is not persisted off-device, I can also *repudiate* the purge. Attack the receipt pipeline, not the purge.
4. **Receipt forgery via mislabeled reasons.** Because Close and Cancel emit `'discard'` receipts (Finding 6), the audit log already contains false discards. I can discard a session, claim it was a close, and the log cannot distinguish them.
5. **The auto-restart bug as a loss amplifier.** Trigger TTL (sleep the device 24h) or an account switch while the overlay is open: the buffer purges and the UI instantly presents a fresh "listening" session — the loss is invisible, and anything the victim says next goes into a session they think is the old one.
6. **The orphaned `audioBlob`.** After an auto-hidden stop, `useCoachCapture` holds the raw audio blob in memory with no TTL (the session TTL doesn't cover it — different hook). bfcache-restore the page days later, run any XSS, read `audioBlob`. The retention contract's ≤24h applies to buffers; the blob is a buffer nobody is counting.
7. **Armed discard with no timeout.** `requestDiscard` via a synthetic click, walk away. The next human interaction with that screen risks confirming a destruction they never armed.

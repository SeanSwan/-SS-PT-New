# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-S1-CAPTURE-REVIEW-PACKET.md
**Tokens:** 3618 in / 18535 out (reasoning: 15151) | total 22153
**Wall:** 305.4s

---

# Review: useCoachCapture.ts — verdict: the lifecycle policy has a hole in exactly the scenario it was written for, the unified state machine is half-wired fiction, and the test suite cannot see either problem because the mock recorder transitions synchronously.

Line numbers are counted from the top of each pasted source block; quotes are exact so you can relocate if my count drifts.

---

## #1 — WORST: auto-stop during `requesting` cannot cancel a pending `getUserMedia`. The mic goes live *while hidden* and the UI asserts it stopped.

`isCapturingRef` deliberately includes `'requesting'` (L104: `isCapturingRef.current = recorder.state === 'recording' || recorder.state === 'requesting';`). So when the tab hides during the permission prompt, `stop('auto-hidden')` passes the guard and calls `recorderStopRef.current()` (L117). But a real `useVoiceRecorder` sitting in `await getUserMedia()` has **no MediaRecorder to stop**. You cannot cancel a permission prompt from `stop()` — there is no `AbortController` anywhere in this hook. The real event ordering is:

1. `start()` → recorder enters `requesting`, prompt shown.
2. Page hides (on mobile the permission sheet itself can hide the page) → `stop('auto-hidden')` → guard passes → `recorder.stop()` is a no-op against a recorder that isn't built yet.
3. `setStoppedAutomatically(true)` + `CAPTURE_AUTO_STOPPED_COPY` render: *"Recording stopped… Nothing was saved."*
4. User grants permission **while the page is hidden** → stream acquired → recorder transitions to `recording`.
5. The mirror effect (L103–105) faithfully sets `isCapturingRef.current = true` again on that commit. Nobody re-stops. **Hot microphone, hidden page, UI claiming the opposite.** That is the exact defect the docblock at L24–29 says this hook closes.

The one mutation that would expose this — removing `'requesting'` from L104 — leaves the suite green, because the mock's `start` jumps straight to `'recording'` (`const start = useCallback(async () => { setState('recording'); }, [])`) and its `stop` unconditionally "works" (`recorderStop(); setState('stopped')`). The mock has no concept of a pending permission request, so the most privacy-critical ordering in the entire hook is structurally untestable against it. Fix requires: `AbortController` threaded into `getUserMedia`, aborted in `stop()`, and a re-check of live state when the prompt resolves — none of which exists here.

## #2 — The ref mirror has two unsynchronized writers. `stop()` and the passive effect race, and native events don't flush passive effects.

`stop()` writes `isCapturingRef.current = false` synchronously (L112). The mirror effect writes it post-commit (L103–105). Two writers, no invariant. Concrete resurrection ordering:

1. Commit N renders with `recorder.state === 'recording'`; its passive effects are scheduled but **not yet flushed** (React defers `useEffect`; under load or concurrent rendering this window is real).
2. `visibilitychange` fires. React flushes passive effects before *discrete DOM events*, but `visibilitychange` and `pagehide` are native listeners — React does not flush before them. `onHidden` runs: guard passes (ref still true), `stop()` clears the ref (L112), calls `recorder.stop()`.
3. React now flushes commit N's pending passive effect: `isCapturingRef.current = recorder.state === 'recording'` — evaluated against the **pre-stop render** — sets the ref **back to true**.
4. `pagehide` fires a task later → guard passes → `recorderStopRef.current()` a second time. On a real MediaRecorder whose `stop()` was already called, the second call hits an inactive recorder → `InvalidStateError` from inside an uncaught native handler.

The inverse direction is #1's step 5. Both stem from the same design error: the guard's source of truth is a *mirror of React state updated in an effect*, when it must be written synchronously by `start()`/`stop()` themselves (set true before the `await` at L147, cleared on rejection). The docblock at L98–101 correctly diagnoses stale closures and then implements a fix that is itself stale by one commit.

## #3 — The "unified" machine is dead code past `capturing`. `transcribing`, `done`, and `transcript` are unreachable through this API.

`start()` (L143–148) calls `transcription.reset()` and `recorder.start()`. **Nothing in this hook ever calls `transcription.transcribe(...)`.** The return object (L174–183) exposes `transcript: transcription.text` and the status mapping advertises `'transcribing' | 'done'` (L162–163) — but the hook exposes neither the blob nor a `transcribe` action, and each `useCoachCapture()` call instantiates its **own private** `useVoiceRecorder`/`useGeminiTranscription` (L92–93), so a consumer cannot drive them externally either. The RECORD pipeline cannot be completed through the "single entry point." Today this hook is a lifecycle wrapper with a state machine full of states it cannot reach, and the "collapses two machines into one" claim (L46–50) is true only for the two states the tests happen to cover. The status-mapping test (`'idle'` → `'capturing'`) never touches a transcription state — zero coverage, because zero reachability.

## #4 — Unmount: dead state writes, and the double-stop question you asked me is unanswered by your own suite.

Cleanup at L139 calls `stop('auto-unmount')`, which for non-user reasons calls `setStoppedAutomatically(true)` / `setAutoStopCopy(...)` (L114–115) **on a component that is already committed as deleted**. Those writes are no-ops; they are untestable by construction (`renderHook` can't read state post-unmount — which is why your unmount test asserts only the spy). Worse: effect cleanups run in declaration order, and `useVoiceRecorder`'s internal effects are declared at L92, **before** the lifecycle effect at L126. If `useVoiceRecorder` has *any* unmount teardown of the MediaRecorder/stream, it runs **first**, and L139's `recorderStopRef.current()` then double-stops a torn-down recorder; if it has none, L139 is the only release. Your grep for `visibilitychange|pagehide|beforeunload` does not rule out a plain unmount cleanup in that file, and your mock has no internal cleanup whatsoever — so the suite is silent on the precise question in your remit. You had the file; the review doesn't show you checked it.

## #5 — "Nothing was saved" is copy, not behavior, and the auto-stop outcome isn't in the status machine at all.

Nothing at L110–118 discards the blob or aborts an in-flight transcription. If transcription was mid-flight when the page hid, it resolves afterward → `status` flips to `'done'`, `transcript` populates — **under a banner saying nothing was saved**, with `stoppedAutomatically` still true. Simultaneously contradictory surface. Related incoherence: an auto-stop never produces `status: 'error'` (recorder goes to `stopped`/`idle`, transcription stays `idle` → L158–163 yields `'idle'`), so the "one machine" expresses its most important outcome as a sideband boolean + string that any consumer keyed on `status` will not render. And `autoStopCopy` is cleared only in `start`/`reset` (L144–145, L151–152): after an auto-stop the banner persists indefinitely on a mounted component, and it **masks** a subsequently discovered real error (e.g. permission revoked while hidden) until the next `start` — the user sees "you left this screen," hits retry, and loops.

## #6 — `start()` and `reset()` have none of the discipline you applied to `stop()`.

`start()` (L143–148) has no in-flight guard: double-tap → two `getUserMedia` paths in the real recorder. This is aggravated by StrictMode dev double-mount if any consumer starts in a mount effect: cleanup's `stop('auto-unmount')` no-ops (ref not yet true — the same mirror lag from #2), then the remounted effect calls `start()` again → two permission requests. `reset()` (L150–155) neither stops a live capture nor touches `isCapturingRef` — calling it mid-capture leaves the ref to catch up post-commit while `recorder.reset()` runs against a live MediaRecorder with undefined semantics. Also `transcription.reset()` at L146: if the real reset doesn't abort an in-flight fetch, a stale transcript can land after reset and mark the *next* session `done` with the *previous* session's text. Mock resets are no-op spies, so this is unobserved.

## #7 — Identity churn: `start`/`reset` are re-created on every duration tick for the entire capture.

`start`/`reset` depend on the **whole hook objects** (`}, [recorder, transcription];` L148, L155). Both underlying hooks return fresh object literals per render, and `useVoiceRecorder` re-renders its host on every duration tick — so during capture, `start` and `reset` get new identities at ~1Hz, thrashing any consumer `useEffect`, `useCallback`, or `React.memo` keyed on them. Meanwhile `recorderStopRef`'s mirror (L107–108) re-runs on every render *if* the real `recorder.stop` is unstable — which you never verified; the mock's `useCallback([])` guarantees stability, so the suite cannot detect churn there. The lifecycle listeners themselves (L126–141) register once only because `stop` has empty deps — the single dependency decision in the file that survives scrutiny, and it survives by accident of the ref indirection, not by audit.

## #8 — Error precedence: the headline claim is untested and the surface leaks.

The precedence comment (L165–167) claims auto-stop copy outranks the underlying error. No test ever sets both `autoStopCopy` and a `rawError` — the two precedence tests only exercise initial-state `recorderError` with `initialState = 'error'`. **Mutation: swap the `??` operands at L169–170. Suite stays green.** The regex `/permission|denied|notallowed/i` (L170) does string matching on unspecified error shapes from two different hooks. And `stop(reason)` is public (L73): any consumer can call `stop('auto-hidden')` and forge the "Nothing was saved" banner — `CaptureStopReason` has no business in the public signature.

---

## Test autopsy: what the 9 tests actually prove

- **Proven:** listeners are attached to `document`/`window`; unmount cleanup invokes the spy; the ref guard collapses two events fired **inside one `act` task**; the permission regex maps two canned strings; `idle → capturing`.
- **Not proven, and structurally cannot be with this mock:** any cross-task ordering (real `visibilitychange` → commit → `pagehide` are separate tasks with renders between; test 5 dispatches both synchronously in one `act` — it verifies a synchronous boolean, not event ordering); the `requesting` path (never entered — `initialState` is only `'idle'` or `'error'`, mock `start` never sets it); pending-`getUserMedia` cancellation (#1); passive-effect-vs-native-event timing (#2); real `MediaRecorder.stop` idempotency (#2, #4); anything about `transcribing`/`done`/`transcript` (#3); auto-stop error masking (#5); callback identity churn (#7). Your mutation check (removing listeners kills 4/9) is the weakest possible mutation — it proves wiring, and the docblock's own history (the mock once held no real state) shows the suite has already once been a mirror pointed at itself. It still is, one layer down: the mock now holds real state but fake *semantics*.

## Direct answers to your remit

- **Ref mirroring correct?** No — see #1/#2: effect-mirrored guard, two writers, resurrection and stale-false windows.
- **`stop()` idempotent under real ordering?** Same task: yes. Across tasks: no (#2). Against the real recorder: unverifiable from this submission and untested (#4).
- **Unmount leak or double-stop?** State writes are dead code; double-stop vs `useVoiceRecorder`'s own teardown is unresolved and the mock guarantees you never find out (#4).
- **Error precedence right?** Direction defensible, untested, leaky, forgeable (#8), and contradicted by reachable `done`+banner states (#5).
- **Tests self-confirming?** Partially — they verify wiring and copy, not ordering or real-recorder semantics.

## What freestyle dictation needs that this hook does not provide

1. **Both engines at once with a merge policy** — your own docblock (L18–22) says freestyle needs LIVE interim + RECORD authoritative simultaneously. `CaptureStrategy = 'record'` (L44) is a union of one. No reconciliation semantics (replace interim with authoritative, timestamps, conflict handling) exist anywhere.
2. **Retention, not deletion** — you cite `SWAN-COACH-FREESTYLE-RETENTION-CONTRACT` at L29, then ship discard-on-hide, discard-on-unmount, *"Nothing was saved."* Route change mid-dictation = 10 minutes of speech destroyed, with no `keepPartial`/`resume` option, no reason codes surfaced (`stoppedAutomatically` boolean collapses `auto-hidden` vs `auto-unmount`), no `pageshow`/`freeze`/`resume` handling, no blob persistence (IndexedDB on `pagehide`) for crash recovery.
3. **Long-form capture mechanics** — no `timeslice`/chunked capture, no memory ceiling, no segment flush, no max-duration, no pause/resume (and duration accounting across pauses), no silence-based segmentation. The iOS Safari limitations you name at L18–19 are cited and then addressed by nothing.
4. **Pending-permission cancellation** — `AbortController` on `getUserMedia`, mandatory for fixing #1 and mandatory on mobile where prompts and tab-switches interleave constantly.
5. **Mic ownership model** — Web Speech and `getUserMedia` running concurrently: one shared stream or two, one permission surface, one recording indicator, iOS conflict policy, singleton guard against two mounted `useCoachCapture` instances opening two mics.
6. **A wake-lock / lock-screen policy decision** — the current hardcode kills capture on screen lock. Long-form dictation arguably requires surviving lock *with* a persistent indicator; the hook permits no policy, only one behavior.
7. **Output plumbing** — blob exposure, transcribe orchestration, retry, draft-save; none reachable (#3).

Fix order: #1 (correctness of the core promise), #2 (guard ownership), #3 (finish or delete the dead half of the API), #4 (read `useVoiceRecorder`'s teardown and resolve double-stop), then rewrite the mock to model async `requesting`, deferred commits, and internal unmount cleanup — in that order, because until the mock models asynchrony, every fix above is unverifiable and every green run is noise.

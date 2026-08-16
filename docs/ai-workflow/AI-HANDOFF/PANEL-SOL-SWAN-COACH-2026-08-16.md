# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-SWAN-COACH-BATCH-REVIEW-PACKET.md
**Seed:** (none)
**Tokens:** 10291 in / 15944 out · **Cost:** ~$0.5298 · **Wall:** 290.7s

---

## (a) VERDICT

**REJECT — `useCoachCapture.ts:L217-L220` sends an unredacted audio `Blob` to Gemini, violating zero-PII/model and audio-retention rules, while `CoachFreestyleOverlay.tsx:L74-L89` never connects any recorder or calls `appendFragment`, so the shipped “Listening” surface captures nothing.**

*Line references are relative to the supplied fenced source blocks; identifiers and quoted expressions are included for disambiguation.*

---

## (b) Correctness attacks

### 1. The overlay is a fake listening surface

**Evidence:** `CoachFreestyleOverlay.tsx:L74-L89`

```ts
const session = useFreestyleSession({ accountKey });
...
discardPending, start, pause, resume, stop,
```

`appendFragment` is not destructured, no capture hook is called, and no fragment source is accepted as a prop. `useCoachCapture` is completely disconnected.

**Breakage:** Opening the overlay advances a timer and displays “Listening,” but no microphone is requested and no speech is captured. Pressing Done invokes `onStopped([])`.

**Fix:** Introduce one explicit capture coordinator that owns recorder/speech callbacks and session transitions. Do not render “Listening” until microphone activation has been positively confirmed. Add a browser integration test that speaks/injects a final result and verifies a non-empty stopped snapshot.

---

### 2. Reset reopens the permission-prompt microphone hole

**Evidence:** `useCoachCapture.ts:L223-L231`

```ts
stopInternal('user');
stopRequestedRef.current = false;
...
recorderResetRef.current();
```

`stopInternal` correctly latches a stop request, but `reset` immediately clears that latch. If `getUserMedia()` is still awaiting permission, the user can close/reset, grant permission later, and the late recorder will no longer be stopped by the guard at `L168-L172`.

**Breakage:** The microphone can activate after the screen has been closed.

**Fix:** Never clear the stop latch in `reset`. Assign each start attempt a generation ID; when permission resolves, stop all tracks unless that generation is still current and the document is visible. Clear the latch only as part of a new, explicit start.

**Required verification:** Playwright test: hold the permission prompt open, invoke reset/close, grant permission, then assert every `MediaStreamTrack.readyState === 'ended'` and no recording state becomes active.

---

### 3. `start()` does not prevent double starts or the pre-effect visibility race

**Evidence:** `useCoachCapture.ts:L206-L214`

```ts
if (isCapturingRef.current) return; // no double permission prompts
...
await recorderStartRef.current();
```

`isCapturingRef.current` is never synchronously set to `true` here. It only changes later in the passive effect at `L115-L135`.

**Breakage:**

- Two calls in the same task both pass the guard and can issue duplicate permission requests.
- A visibility/pagehide event before the passive effect sees `requesting` makes `stopInternal` return because `isCapturingRef.current` is still false.
- Permission can then resolve on the hidden page.

The comment “no double permission prompts” is factually false.

**Fix:** Set an attempt/generation synchronously before invoking the recorder. Reject additional starts while that generation is pending. Roll it back on failure only if the same generation is still current.

---

### 4. Stopping loses the final recognition fragment

**Evidence:**

- `useFreestyleSession.ts:L209-L220` drops every callback once state is not `listening`.
- `CoachFreestyleOverlay.tsx:L87-L90` calls `onStopped(fragments)` immediately after `stop()`.

Speech engines commonly emit their final result after stop/pause. That result is dropped because `stateRef` has already become `stopped`, while `onStopped` receives the previous render’s fragment array.

**Breakage:** The last phrase—often the trainer’s correction or final set—is omitted.

**Fix:** Add a `stopping`/flush phase. Stop input, await the final recorder/speech result, atomically seal an immutable snapshot, and invoke `onStopped(snapshot)` exactly once. Tag callbacks with a capture generation so truly stale results can be rejected.

---

### 5. `start()` is an unguarded destructive operation

**Evidence:** `useFreestyleSession.ts:L146-L159`

```ts
setFragments([]);
...
setState('listening');
```

There is no state guard and no purge receipt. Any caller can call `start()` while listening, paused, or stopped and silently erase the current session.

**Fix:** Enforce a reducer transition table. Permit start only from explicit terminal states with no retained buffer. Replacing an existing buffer must go through confirmed discard and record the correct purge reason.

---

### 6. The two-step discard guarantee is not enforced by the hook

**Evidence:** `useFreestyleSession.ts:L196-L207`

`discard()` never checks `discardPending`. The UI currently sequences the calls, but any other consumer can immediately destroy the session.

**Fix:** Keep a synchronous `discardPendingRef`, reject `discard()` unless armed, and preferably expose one reducer event rather than independent destructive methods.

---

### 7. Parent-driven closure leaves an active hidden session

**Evidence:**

- `CoachFreestyleOverlay.tsx` only resets inside `handleClose`.
- `CoachFreestyleOverlay.styles.ts:L30-L44` hides through opacity and pointer events.
- No effect handles `isOpen: true -> false`.

**Breakage:** If the parent closes the overlay through navigation, flag changes, browser back, or its own control without invoking `handleClose`, the session remains active and retained. Reopening can expose the old session.

**Fix:** On the closing edge, synchronously stop and purge or perform an explicit handoff. Better: unmount the surface when closed and centralize purge in an account-scoped session owner.

---

### 8. Close/reset can race with the auto-start effect

**Evidence:** `CoachFreestyleOverlay.tsx:L82-L85` starts whenever `isOpen && state === 'idle'`; `handleClose` sets idle before the parent necessarily commits `isOpen=false`.

**Breakage:** If `onClose` is delayed, asynchronous, or a no-op, reset can immediately start another session.

**Fix:** Add a close-generation/closing state and start only on an actual `isOpen` rising edge.

---

### 9. Purge callbacks are neither once-only nor exception-safe

**Evidence:** `useFreestyleSession.ts:L137-L146` unconditionally invokes `onPurge`; `L267-L268` invokes it from effect cleanup.

**Breakage:**

- Empty buffers produce purge receipts.
- Reset followed by unmount produces duplicate receipts.
- React Strict Mode’s effect replay can emit false `unmount` purges.
- If `onPurge` throws, discard/TTL/account-switch transitions stop midway. A TTL callback can then throw every second.

**Fix:** Track a session generation and a `purged` bit. Emit one receipt only for a generation that actually owned data. Isolate callback exceptions from state transition completion.

---

### 10. TTL exceeds the binding ceiling

**Evidence:** `useFreestyleSession.ts:L249-L265`

```ts
nowRef.current() - startedAt > ttlMs
```

Problems:

- `>` retains data at the exact expiry boundary.
- One-second polling permits almost another second.
- Background timer throttling can retain it much longer.
- Caller-provided `ttlMs` can exceed 24 hours, be `Infinity`, `NaN`, or negative.
- Clock rollback extends retention.

**Fix:** Validate `0 < ttlMs <= FREESTYLE_TTL_MS`, store an absolute expiry, use `>=`, enforce expiry synchronously before every read/action, and recheck on visibility/focus/resume. The persistent store must independently reject expired records during restoration.

---

### 11. No ten-minute limit or memory bounds

The product context says “up to ten minutes,” while the UI says “Talk as long as you need.” There is no duration cap, fragment count cap, text-length cap, or byte cap.

`setFragments(list => [...list, ...])` repeatedly copies the entire array, and `wordCount` rescans all text. A noisy recognizer can create quadratic allocation and freeze a phone.

**Fix:** Enforce a hard ten-minute capture boundary, bounded fragment/byte limits, and an append-efficient buffer. Warn before the cap and atomically stop/flush at the deadline.

---

### 12. Null/runtime boundary failures

- `accountKey=null` can own a session despite the “account-keyed” guarantee.
- `appendFragment(text)` calls `.trim()` without runtime validation; JavaScript or malformed adapters can pass null/non-string.
- Empty or zero-byte audio blobs are accepted for transcription.
- `now()`/`ttlMs` are not checked for finite values.
- `error` and the `error` state are never set in `useFreestyleSession`, making the advertised error state dead.

Reject invalid boundaries explicitly rather than silently returning `''` or dropping input.

---

## (c) Security attacks

### 1. Direct zero-PII violation: raw voice and spoken names go to Gemini

**Evidence:**

- `useCoachCapture.ts:L217-L220`: `transcriptionRef.current.transcribe(blob)`
- File header describes `MediaRecorder → Blob → useGeminiTranscription → server-side transcript`.

The blob can contain client names, injuries, diagnoses, schedules, and a trainer’s voice biometric. Client-side tokenization cannot occur before a cloud model transcribes raw audio.

**Required architecture:** On-device speech recognition produces local text; local entity resolution replaces names with opaque authorized client IDs before any model request. No audio/multipart payload may reach a model or server.

---

### 2. Retention controls do not cover the audio/transcription path

`useCoachCapture` has no `accountKey`, expiry, logout/account-switch trigger, or request-abort contract. `reset()` calls collaborator methods, but there is no evidence that they:

- abort an in-flight model request,
- suppress a stale completion,
- erase server/vendor copies,
- stop every `MediaStreamTrack`,
- remove locally held blobs.

`MediaRecorder.stop()` alone does not necessarily stop source tracks.

**Fix:** Make account and session generation mandatory. Purge must abort network work, invalidate late responses, erase local blobs/transcripts, and directly stop all tracks. Verify `useVoiceRecorder.stop/reset` and `useGeminiTranscription.reset` implementations; comments are not evidence.

---

### 3. Account-switch isolation has a cross-tenant race

**Evidence:** `useFreestyleSession.ts:L236-L246` purges in a passive effect.

When `accountKey` changes, React renders once with the new account prop and old fragments before the effect runs. During that window:

- `LivePhrase` can display trainer A’s text to trainer B.
- Done can pass trainer A’s fragments through `onStopped`.
- The snapshot carries no owner ID, so the parent can associate it with the new account.

**Fix:** Never expose data unless `bufferOwner === currentAuthenticatedAccount`. Use a keyed account boundary or synchronous owner check that renders no old data. Bind the immutable stopped snapshot to an account ID and session ID.

---

### 4. `accountKey` is not authorization

A caller-controlled frontend prop is only a cache partition hint. It cannot establish authn/authz for persistent storage, transcription, consolidation, or apply.

**IDOR requirement:** Every server operation must derive the trainer/account from the authenticated session and authorize every referenced client ID against that tenant. Ignore or compare-and-reject client-supplied account ownership.

---

### 5. Replay and cost amplification

- `transcribe()` has no in-flight guard or idempotency key.
- Done can be double-clicked; `stop()` becomes a no-op but `onStopped` still fires again.
- Stale callbacks can retain and invoke old `transcribe` closures.
- No rate, payload, duration, or concurrency limits are visible.

**Fix:** Use a server-enforced idempotency key such as `{tenantId, sessionId, audioDigest, operationVersion}`, one active transcription per session, hard payload limits, and per-account rate/cost quotas.

---

### 6. Raw dictation is a prompt-injection payload

React escapes `latestPhrase`, so no direct DOM-XSS sink is shown. However, `FreestyleFragment.text` is unrestricted and is handed directly toward future consolidation.

An attacker can dictate instructions to override the consolidation schema or induce later tool/write actions.

**Fix:** Treat dictation exclusively as untrusted data, use schema-constrained output, reject unknown fields, and keep model output incapable of selecting tenants or authorizing writes. S7 must independently validate every operation.

---

### 7. Hidden overlay remains keyboard- and accessibility-active

Opacity and `pointer-events:none` do not remove descendants from tab order or the accessibility tree. The hidden dialog still has `aria-modal=true`, and invisible buttons may be focused and activated.

**Fix:** Do not render the dialog when closed, or use standards-supported `hidden`/`inert` plus `aria-hidden`. Add focus trapping and focus restoration while open.

---

### 8. Shoulder-surfing disclosure contradicts the stated design

**Evidence:** `CoachFreestyleOverlay.tsx` renders:

```tsx
{latestPhrase && <LivePhrase>{latestPhrase}</LivePhrase>}
```

The file header says it “shows counters, not a transcript.” Displaying the latest phrase can expose client names or health information on a shared gym tablet.

**Fix:** Remove raw phrase display. Use a non-content signal such as “Speech detected 1s ago.”

---

### 9. Secret handling is unreviewable

The implementation of `useGeminiTranscription` is absent. Approval requires a named verification that no Gemini/vendor credential is bundled into the frontend and that server logs, APM, error reporting, and request captures never retain audio or raw PII.

No current SSRF URL sink is shown. Future consolidation/tooling must reject model-supplied URLs and use an outbound allowlist.

---

## (d) Data-truth / schema-drift — Rule 58

### Blocking contract gaps

1. **No canonical account type**

   `accountKey: string | number | null` permits `"42"` and `42` to represent different storage keys and permits an unauthenticated null owner. Use the project’s canonical account-ID type, normally an opaque string/UUID.

2. **Stopped payload loses tenant provenance**

   `onStopped?: (fragments: FreestyleFragment[]) => void` omits `accountId`, `sessionId`, expiry, schema version, and capture generation. A caller can associate old fragments with whichever account is current when the callback is processed.

3. **Fragment IDs collide across sessions**

   `nextIdRef` resets to `1` on each start. `id` is documented as non-database, but nothing enforces that at an S3/S4 boundary. Persisting it as a primary key would overwrite/collide.

4. **Timeline semantics are inconsistent**

   `elapsedMs` excludes pauses, but `atMs` is calculated as `at - startedAt` and includes paused wall time. A consumer assuming both share the same active-time clock will misorder or mislabel fragments after pauses.

5. **Frontend response-shape split**

   `transcribe()` returns the promise result, while the exposed transcript comes from `transcription.text`. With overlapping/reset requests, those can refer to different generations. Return one immutable result object tied to a session generation.

6. **Unversioned local/API casing**

   Current fields are camelCase: `atMs`, `elapsedMs`, `wordCount`, `accountKey`. No mapper or DTO establishes how these map to snake_case persistence/API fields. S3/S4 must not serialize hook state ad hoc.

7. **No model/migration/FK artifacts are supplied**

   Because S2 is write-free, there is no current table or FK to compare. Consequently, claims about future account-keyed encrypted persistence are not Rule-58-verifiable. The S3/S4 gate must include, together:

   - actual ORM model,
   - actual migration/table name and casing,
   - FK target and delete behavior,
   - route/service request and response DTOs,
   - frontend decoder/fixture using the real response,
   - schema version and migration path.

Do not infer PascalCase versus snake_case or FK targets from prose.

---

## (e) House-rule violations and unsupported success claims

### Violations

- **Zero PII to models:** Violated by raw audio-to-Gemini transcription and by the raw-text S4 boundary.
- **Crystalline Swan palette:** `CoachFreestyleOverlay.styles.ts` introduces `#C92A54` and `#FF8FA3`, neither in the ratified palette. Semantic naming does not authorize new fallback colors.
- **Dual-Button Glow:** Only the blue-background/purple-hover branch exists. There is no purple-background/cyan-glow button variant, so the required dual system is incomplete.
- **WCAG/modal operation:** No focus trap, initial focus, background inerting, or focus restoration. The hidden modal remains tabbable. Contrast also depends on unconstrained token overrides and has no named verification path.
- **Contradictory content/privacy design:** The screen says counters rather than transcript, but renders `LivePhrase`.

No evidenced MUI, Recharts, retired palette, sub-44px control, forbidden “yoga/meditation,” user-facing “AI,” or prohibited credential wording appears in these excerpts. The files appear within the 300-line ceiling.

### Unsupported or false success language

| Claim | Why it fails | Required verification path |
|---|---|---|
| `start`: “no double permission prompts” | Ref is not set synchronously | Playwright concurrent-start test |
| Permission latch “closes the permission-prompt hole” | `reset()` clears the latch before pending permission resolves | Prompt-reset-grant browser test |
| “shared-gym-tablet guarantee” | Account purge is passive; old data renders under the new prop | Same-task account-switch DOM/callback test |
| `onPurge`: “Called once” | Empty purge, reset+unmount, and Strict Mode can duplicate it | StrictMode generation/receipt test |
| Slept device “is caught” by interval | Background throttling and `>` exceed the 24h ceiling | Exact-boundary and suspended-clock tests |
| “Pause: Nothing is being heard” | Session state is not connected to any recorder | Device-level pause/track-state test |
| “Listening” | No capture source exists in the overlay | End-to-end captured-fragment test |
| “A bug here … can never corrupt a client’s history” | `onStopped` is an unrestricted callback and carries no tenant/session binding | Typed write boundary plus authorization integration test |
| Lifecycle code releases the microphone | Only an opaque `recorder.stop()` collaborator is called | Assert all source tracks end on every exit path |

---

## ENHANCEMENTS

1. Add a large, persistent “mic active / last speech heard” indicator without displaying transcript text.
2. Add haptic or short earcon confirmation for start, pause, resume, and stop; respect silent/reduced-feedback settings.
3. Warn at 9:30 and hard-stop/flush at 10:00.
4. Detect Bluetooth/headset route changes, phone calls, permission revocation, and lost input devices.
5. Use a screen Wake Lock while actively recording, with guaranteed release on every exit path.
6. Keep Done and Pause in a stable thumb position so controls do not move when state changes.
7. Add an offline/transcription-availability indicator before stopping, without uploading until explicit confirmation.
8. Provide a short undo window after stop while preserving the sealed local snapshot.
9. Add a privacy mode that displays only counters and hides all dictated content by default.
10. Make “speech pipeline healthy” distinct from “timer running”; silence alone is not proof that capture still works.

---

## WHAT I WOULD ATTACK

1. Speak client names and medical details, then inspect network, vendor, server, logging, and error-monitoring paths for the raw audio.
2. Open a microphone permission prompt, close/reset the screen, then grant permission to activate the microphone after departure.
3. Switch accounts and trigger Done before the passive purge effect to export trainer A’s fragments under trainer B.
4. Hide the overlay without unmounting it, then reopen it later to recover the previous user’s session.
5. Flood `appendFragment` with very large strings or thousands of interim results to exhaust mobile memory through repeated array copies and word rescans.
6. Repeatedly invoke `transcribe()` or double-click Done to amplify model cost and duplicate later operations.
7. Dictate prompt-injection instructions designed to make S4/S7 select another client, suppress clarification, or fabricate authorization.
8. Force a clock rollback/background suspension to retain the buffer past the promised 24-hour ceiling.

---

## (f) SINGLE highest-risk item

**Raw, identifiable audio is sent to Gemini before client-side tokenization.** This is an architectural violation, not a patch-level defect.

Before any build or ship:

1. Disable the cloud-audio transcription path.
2. Perform speech recognition on-device.
3. Resolve and tokenize client names locally into opaque, tenant-authorized IDs.
4. Permit only a versioned, sanitized ID/role payload to leave the device.
5. Add a CI/browser network test using canary names that fails if any raw text, audio `Blob`, multipart audio, or voice payload leaves the client.
6. Verify server/vendor credentials are server-side only and that logs/APM cannot retain request bodies.
7. Keep the feature flag permanently off until that egress test and the permission-reset track-release test both pass.

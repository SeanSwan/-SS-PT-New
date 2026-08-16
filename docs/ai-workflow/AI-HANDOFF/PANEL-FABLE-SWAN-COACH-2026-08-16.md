# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-SWAN-COACH-BATCH-REVIEW-PACKET.md
**Seed:** (none)
**Tokens:** 17158 in / 13395 out · **Cost:** ~$0.8413 · **Wall:** 188.7s

---

# FABLE 5 — HOSTILE REVIEW + FINAL RULING

## VERDICT: **SEND-BACK** (buildable in one revision cycle; not lockable as submitted)

Two grounds, and I will not soften either:

1. **The decision record I am asked to ratify is not in evidence.** The submission I received contains no §2, §4, §8, §9.1, §10, or §14; no D1–D8 text; no F10 text; no S1.5 definition; and the seed block reads "(no seed provided)." What I actually have is the hostile-review charter, six ratified owner rules, design constraints, and four source files. A Final Decider who "ratifies" eight numbered decisions he has never read is manufacturing authority, and the worker-bot will build to that fiction. I rule on what exists; where the prompt references artifacts that don't, I say so. **This is itself the first data-truth trap, and I decline it.**
2. **One ratified rule is unbuildable as written against the code as written** (see Highest Risk). That alone bars a LOCK.

---

## (c) RULINGS ON THE DECISION SET

Since D1–D8 text is absent, I rule on the eight decisions **actually present or embodied in the submitted material** — this is the de facto decision set the worker-bot will encounter:

| # | Decision (as evidenced) | Ruling |
|---|---|---|
| D1 | Contradictions: latest-wins + collapsible trace, never silent discard | **CONFIRM** — correct for a rambling-correction dictation model; trace preserves auditability. |
| D2 | Future-dated items → plan edit, NEVER workout log, no flag exception | **CONFIRM** — absolute rule is right; a flag here is a corruption vector wearing a toggle. |
| D3 | Duplicate dates → merge/append proposal, not failure | **CONFIRM** — failure would punish the exact user behavior (multi-day rambling) the feature exists for. |
| D4 | Unplaceable fragments → clarification item, never dropped | **CONFIRM** — silent drops are unrecoverable trust damage for a trainer. |
| D5 | ZERO PII to models; names tokenised client-side; only IDs/roles leave device | **CONFIRM INTENT, OVERRIDE WORDING** — as written this is violated by the RECORD pipeline itself (`transcribe()` ships raw audio containing spoken client names to server-side Gemini). See Highest Risk. |
| D6 | Retention: no server audio persistence, TTL ≤24h, account-keyed, purge on discard/logout/switch/TTL/unmount | **CONFIRM**, with the finding that `onStopped` currently hollows it out (F-3 below). |
| D7 | S2 is write-free by design; consolidation/apply deferred | **CONFIRM** — the "a bug here can lose a draft but never corrupt history" boundary is the best architectural sentence in the document. |
| D8 | LIVE/RECORD dual pipeline; `useCoachCapture` owns RECORD only; LIVE deferred | **CONFIRM the split, OVERRIDE the deferral scope** — the S2 overlay ships with `appendFragment` never called by anything. Wiring is not optional polish; it is the difference between a product and a mic-shaped mood lamp (F-2). |

---

## TRIANGLE DISPOSITIONS — RATIFIED / OVERRULED

**The triangle verdict is not in the record.** I cannot ratify text I cannot read. On the **merits of the two disputes as described to me**:

- **F10 (L1→L3 fast path vs forced L1→L2→L3): the fast path is RATIFIED on merits, with one binding invariant.** Forcing an intermediate layer hop for ceremony is exactly the kind of process-worship that gets shipped as latency. The real safety boundary in this system is not a layer count — it is the **confirmed summary screen**. Ruling: any path, fast or staged, MUST be gated on explicit user confirmation of the structured summary before a single write (consistent with D7). A fast path that preserves that gate is safe; a slow path that doesn't is theater.
- **D2/D3 write-path staging + S1.5 Data Backbone: RATIFIED on merits — and the code proves S1.5 is necessary.** The submitted files reveal three primitives that no existing slice owns: (a) the client-side name tokenizer (D5 requires it, nothing implements it), (b) a purge-propagation contract for data handed across component boundaries (F-3), (c) audit receipt plumbing (`onPurge` exists but fires phantoms — F-14). That is precisely a "Data Backbone" slice. If the triangle invented S1.5 for these reasons, they were right. If they invented it for other reasons, it's right anyway.

---

## (b) WHAT BOTH REVIEWERS MISSED — worst-first findings from the actual code

**F-1 — Hot mic in the `start()` window (`useCoachCapture.ts`, `stopInternal` guard).** `isCapturingRef` is only set true by the passive mirror effect after `recorder.state` commits. Between `start()` invoking `recorderStartRef.current()` and that effect flushing, `isCapturingRef` is **false**. If `pagehide`/`visibilitychange` fires in that window, `stopInternal` bails on `!isCapturingRef.current`, the latch is never set, permission resolves, and **the mic goes live on a hidden page — the exact hole this hook's header claims to close**. Fix: set `isCapturingRef.current = true` synchronously inside `start()` before awaiting the recorder.

**F-2 — The overlay is deaf.** `CoachFreestyleOverlay` mounts `useFreestyleSession` but nothing ever calls `appendFragment`, and `useCoachCapture`/LIVE speech is not wired in. Word count stays 0, the "still hearing you" signal lies, and the worker-bot will ship it to the letter. The header's "LIVE stays separate until freestyle needs them together" is self-refuting — freestyle needs them together **now**. Ruling: wiring is in-scope for S2 (or an explicit S2 exit criterion: "a spoken word increments the fragment counter on a real device").

**F-3 — `onStopped(fragments)` leaks the buffer past the purge boundary.** The parent receives a live reference to the fragment array; every purge trigger (discard/TTL/switch/unmount) then purges a buffer the parent already copied. The retention contract is hollow the moment Done is tapped. Fix: hand off as an **ownership transfer** — a frozen snapshot with a session ID, and the consumer is contractually (typed interface, S1.5) bound to the same purge bus.

**F-4 — `reset()` re-opens the permission-prompt hole it just closed.** `reset()` calls `stopInternal('user')` (latch set) then immediately sets `stopRequestedRef.current = false`. If `getUserMedia` is in flight, the latch is gone, the late-arrival guard (`stopRequestedRef.current && recorder.state === 'recording'`) never fires, and recording starts after a reset. Fix: `reset()` must NOT clear the latch; only `start()` clears it (it already does).

**F-5 — Elapsed timer never stops.** `elapsedMs = at - startedAt - pausedTotal…` with `at = now()` at render, and the tick interval runs in `'stopped'` (only `idle`/`discarded` are excluded). After tapping Done, "Talking" keeps counting up next to "Finished — N words." Fix: capture `stoppedAtRef` in `stop()` and freeze the readout.

**F-6 — Discarded dead-end on reopen.** Auto-start requires `state === 'idle'`; discard leaves `state === 'discarded'`; the Start button is hidden when `state === 'discarded'`. Reopen the overlay after a discard → no auto-start, no Start button, no session. Fix: `discard()` should settle to `'idle'` after firing the purge, or the mount effect must handle `'discarded'`.

**F-7 — Null `accountKey` produces an unkeyed buffer, then login purges it.** `start()` never checks `accountKey`; a session can begin with `accountKey === null` (violating "account-keyed"), and when auth resolves null→id, the account-switch effect **purges the legitimate session mid-dictation**. Fix: refuse `start()` when `accountKey == null`; treat null→id as identity resolution, not a switch.

**F-8 — Auto-start after account-switch purge.** Purge sets `state = 'idle'` while `isOpen` may still be true → the mount effect immediately `start()`s a fresh session under trainer B without any tap. On a shared tablet that is a consent problem, not a convenience. Fix: auto-start only on the open transition, never on state re-entry to idle.

**F-9 — `CAPTURE_AUTO_STOPPED_COPY` lies.** "Nothing was saved" — but auto-stop preserves the blob (status `'ready'`), and `dismissNotice` exists precisely to keep "a usable capture." Sean reads "nothing was saved" and re-records ten minutes. Fix copy: "Recording paused because you left this screen. Your audio is still here."

**F-10 — Notice smuggled through the `error` channel.** `error = mappedError ?? autoStopCopy` forces every consumer to render an informational notice in error styling. Split into `error` and `notice` fields.

**F-11 — Closed overlay stays in the accessibility tree.** `$isOpen` toggles opacity/pointer-events only; an `aria-modal` dialog at opacity 0 is still discoverable by screen readers, and the document-level Escape/keydown machinery lives on. Render `null` when closed, or `inert`/`aria-hidden` it — and note this also changes when the unmount purge actually fires.

**F-12 — No duration/size ceiling.** "Up to ten minutes" is doctrine, but nothing caps `MediaRecorder` output or fragment count. A forgotten hot mic runs until TTL (24h) with an unbounded in-memory Blob. Fix: hard cap at 12 min with a 60-second warning through the status line.

**F-13 — Danger palette is off-book.** `#C92A54` / `#FF8FA3` appear nowhere in the Crystalline Swan palette. They are not RETIRED colors and the contrast reasoning is sound, so I **rule them ADMITTED as named tokens** (`--danger-text`, `--danger-soft-text`) in S0 — explicitly, so the worker-bot doesn't improvise. House rules otherwise verified clean: no MUI, no retired hexes, Arctic Cyan absent from buttons, gold correctly unused, 52px ≥ 44px targets, `var(--token,#fallback)` throughout, reduced-motion honored, copy says "Swan Coach," no forbidden vocabulary, no credential phrasing present.

**F-14 — StrictMode phantom purge receipts.** Dev double-mount fires `clearBuffer('unmount')` → `onPurge('unmount')` on the throwaway mount, polluting the audit stream S1.5 is supposed to trust. Guard with a mounted-once ref or make receipts idempotent per session ID.

**F-15 (minor) — `now()` called in render body** makes render impure; acceptable with the tick-driven cadence but must not survive into any memoized consumer.

---

## WHAT TO CHANGE BEFORE BUILD

1. Resolve the D5 contradiction by **owner decision memo** (see Highest Risk) — nothing in S3+ starts before this is signed.
2. Apply F-1, F-4 (mic-safety), F-3, F-7 (retention integrity), F-6, F-8 (state machine) as S1/S2 entry criteria.
3. Add S2 exit criterion: capture→session wiring proven on a real device (F-2).
4. Fix copy per F-9; split notice/error per F-10; render-null per F-11; cap per F-12.
5. S0 admits danger tokens per F-13; S1.5 owns tokenizer, purge bus, receipt idempotency (F-14).
6. The knowingly-untested passive-effect race in `useCoachCapture` gets a **Playwright gate before S4**, not a comment absolving it forever. The label is honest; honesty is not coverage.

---

## (d) FINAL LOCKED SEQUENCE

**S0** tokens/flags (incl. danger tokens, F-13) → **S1** capture lifecycle hardened (F-1, F-4, F-9, F-10, F-12) → **S1.5 Data Backbone** (client-side name tokenizer, purge-propagation bus + ownership-transfer handoff type per F-3, idempotent audit receipts per F-14) — **ratified, and it must land before anything leaves the device, not merely before S2** → **S2** session machine + overlay **including capture wiring** (F-2, F-5–F-8, F-11) → **S3** encrypted persistent store → **Playwright gate** (passive-effect race + zero-PII network assertion) → **S4** consolidation (IDs only, D1/D4 enforced) → **S5** summary/confirm surface (the true write gate per my F10 ruling) → **S6** clarification items + contradiction trace UI → **S7** batch apply (staged writes, D3 merge proposals) → **S8** future-dated plan-edit routing (D2) → **S9** receipts/audit surface → **S10** hardening + shared-tablet abuse pass. This is the order I'd build it; the only reorder from the claimed plan is that the browser-truth gate moves **ahead of S4**, because S4 is where data first leaves the device.

---

## (e) SINGLE HIGHEST RISK + DE-RISK

**The zero-PII rule is unbuildable against the shipped transcription path — and every later slice inherits the contradiction.** The ratified rule says "ZERO PII to models… only IDs/roles leave the device." `useCoachCapture.transcribe()` ships a raw audio Blob of Sean **speaking client names aloud** to server-side Gemini. Audio *is* PII; client-side name tokenization cannot reach inside a waveform. The retention rules ("audio NEVER persisted server-side") tacitly admit audio transits the server, so the contract contradicts itself, and a worker-bot building to the letter must either violate D5 or refuse to build S4.

**De-risk before build (owner memo, one page, two options, pick one):**
- **(a)** On-device/edge ASR for the RECORD path — audio never leaves; tokenized text only goes to the consolidation model. Costliest, cleanest.
- **(b)** Amend D5 to two-channel form: *"Zero PII in any TEXT channel to any model (IDs/roles only, tokenized client-side). Audio is transient PII-in-flight to the transcription endpoint only: never persisted, never used for training, TTL measured in minutes, contractual DPA, region-pinned; the returned transcript is tokenized client-side before any further model call."*
- Either way: add an automated **network-payload assertion** (Playwright, in the pre-S4 gate) proving no known client-name strings appear in any request body except the sanctioned audio endpoint.

Until that memo exists, the plan's most important promise is a promise the code cannot keep. **SEND-BACK.**

— Fable 5, Final Decider. Resubmit with the D5 memo and the F-1–F-8 fixes; the next pass locks.

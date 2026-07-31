# SwanStudios Fable Final-Decider

**Reviewer:** OpenRouter `anthropic/claude-opus-5`
**Document:** docs/ai-workflow/brainstorms/jarvis-coach-planner-superprompt-2026-07-31.md
**Seed:** docs/ai-workflow/AI-HANDOFF/JARVIS-VILLAGE-DIGEST-2026-07-31.md
**Tokens:** 23043 in / 16000 out · **Cost:** ~$1.0304 · **Wall:** 245.4s

---

# OPUS 5 CONSULT — SWAN COACH JARVIS + PLANNER OVERHAUL
### Independent plan. Village digest treated as peer review, not truth.

---

## 0. WHERE I DIVERGE FROM THE SEED (stated up front, no hedging)

| Seed position | My ruling |
|---|---|
| Village "architecture consensus" | **No content.** The Phase-2B transcript is 100% meta-deliberation about debate rules; it ratifies 20 findings it never states. I treat F-01…F-20 as *headings inherited from the Sonnet review*, adopt six, overrule four, and add five the Village missed. |
| F-02: rename `plannedExerciseToEntry` → `mapParsedTranscriptToLoggerRows` | **Overruled.** Renaming a function adjacent to the byte-pinned save payload trades zero behavior for real archaeology loss and merge risk. Correct move: pick ONE of the two existing mappers as canonical, delete the other, and add a thin `decodedToRows()` adapter *above* it. Nothing in the pinned path gets renamed. |
| F-03: "add server-side redaction before LLM" | **Half-wrong.** §2 says text→LLM redaction already exists and fails closed on all three lanes. The real gap is (a) the overclaiming copy and (b) raw audio→STT, which redaction *cannot* fix. So the fix is truth in copy + consent + retention + no-training terms — not new redaction code. |
| Design spec: gold (`--gilded-fern`) for error states and pain flags | **Rejected — violates §6 "gold = earned ONLY."** Pain/error get a caution token. If the token file has none, add exactly one (`--caution-ember`); do not borrow gold. |
| Design spec: `@tanstack/react-virtual`, `framer-motion`, `@dnd-kit`, stylelint-on-.css | **Rejected.** §6 says styled-components only; the Rolodex already ships a virtualized 520px list. New deps for solved problems. Reorder = keyboard move buttons + existing primitives. |
| Security consensus (immigration documents, Nano Banana 2, invoice PDFs, community posts) | **Context contamination from another project.** None of that is in this document's ground truth. Do not inherit those findings; the real security surface here is audio egress + voice-dispatched actions. |
| F-01: `CLARIFYING` as a peer state in a 7-state machine | **Overruled** (see §2.4). Clarify is a *sub-state of REVIEW*, never a peer, or you get a state where captured content exists and cannot be saved. |
| Village silence on: dead PLAUD vocab-bias call, invisibly-listening ActionBar mic | **Added as P0.** The 3-arg→2-arg vocab-bias drop is the single cheapest accuracy win in the repo and it is the *exact* guard for "one-eighty-five." The invisible mic is a live privacy defect, not a cosmetic bug. |

---

## 1. EXECUTIVE SUMMARY (one page)

**The Jarvis decoder already exists and already works in production — it is wired to the wrong button.** `workoutLogParserService` / `parseWorkoutTranscript` handles multi-exercise, sets×reps×weight, RPE, tempo, four note channels, and pain flags with body region and side. The PLAUD device lane proves it end-to-end today. Sean's rambling sentence cannot decode through the ActionBar mic because that mic goes to a one-command-per-utterance intent classifier with no pain slot. **This is a wiring problem, not an AI problem.** Do not build a parser.

**Six decisions that define this plan:**

1. **Capture = MediaRecorder, server STT. Not Web Speech API.** Browser speech is the unreliable path on the exact phone in Sean's pocket. Web Speech survives in exactly one role: a decorative live teleprompter where it happens to work. It is never the decode source.
2. **Two-phase return is the whole UX.** `POST` audio → **transcript back in ~1.5–3s** (renders immediately as words) → **structured decode back in ~3–8s** (morphs words into rows). This buys perceived instantness *and* it gives the repair loop a text artifact: a bad parse is fixed by **editing the transcript and re-decoding**, never by re-speaking. That single property is the main defense against "trainer trust dies after one bad parse."
3. **Talk-back defaults to browser `speechSynthesis`, not the premium server TTS.** Server TTS is a *new PII egress path* — confirmation strings carry pain notes and can carry names. Browser TTS is free, offline, zero-latency, zero-egress. Premium Gemini TTS stays opt-in, pro-gated, templated-strings-only, redacted. **No client name is ever spoken aloud** (bystanders in a gym are an audience).
4. **Barge-in v1 is half-duplex with instant cancel, and I say so plainly.** Full-duplex VAD-while-speaking on iOS Safari is a research project. Coach speaks ≤12 words; any tap or mic-press kills speech in <100ms. That is honest and shippable. Real barge-in is a later, separate bet.
5. **Six voice entry points → ONE Voice Mode overlay + ONE "Review decoded workout" surface with three entrances** (live voice, file upload, PLAUD). ~900 LOC deleted, but **only after** the new surface is live behind a flag — never a half-cutover.
6. **Planner: the 10 Lens styles are layout skins over one engine, and today's ThreePanel becomes style #4 ("Rail & Canvas") so nothing regresses on day one.** Skins own arrangement, density, information order, motion budget. Skins own zero write-path, zero action bar, zero SafetyGate. Enforced by a parametrized conformance harness that runs against every registered style id.

**Sequencing spine:** truth-fixes → dead-code deletion → new pipeline dark → new UI dark → review surface → resilience → **cutover** → planner state untangling → planner IA/Rolodex → Lens registry + skins → templates/PLAUD (owner-gated) → world tokens (last, flagged closed).

---

## 2. VOICE-LOOP ARCHITECTURE

### 2.1 The loop, in text

```
 ┌───────────────────── LOGGER (never reflows: overlay, M3 anti-jump) ─────────────────────┐
 │  ActionBar: [ Coach ]  ← ONE purple button. Only mic on the page.                        │
 └──────────────────────────────────────┬──────────────────────────────────────────────────┘
                                        │ tap (user gesture: primes AudioContext + TTS)
                          ┌─────────────▼──────────────┐
                          │  CAPABILITY PROBE (150ms)  │ getUserMedia? MediaRecorder mime?
                          │  fail → typed-text mode    │ standalone-PWA mic blocked?
                          └─────────────┬──────────────┘
                                        │
   ┌────────────────────────── VOICE MODE OVERLAY (full-screen mobile) ─────────────────────┐
   │  IDLE ──hold / slide-to-lock──► LISTENING ──release/stop──► TRANSCRIBING ──► DECODING  │
   │    ▲                               │  waveform + timer         │  words appear  │      │
   │    │                               └─ visibility loss ─────────┘  (phase 1)     │      │
   │    │                                  = SAFE-STOP, salvage partial audio         │      │
   │    │                                                                             ▼      │
   │    │                                                        ┌──────────── REVIEW ─────┐ │
   │    │                                                        │ rows, per-field         │ │
   │    │  ◄── SPEAKING (≤12 words, tap = cancel) ◄───────────────┤ confidence chips        │ │
   │    │                                                        │ ├ sub: CLARIFY (1 max)   │ │
   │    └──────────────────────────── "Log it" ──────────────────┤ │  2 chips + voice + 6s  │ │
   │                                                             │ │  timeout → best-effort │ │
   │                                                             │ ├ [Edit transcript] ↺    │ │
   │                                                             │ └ rows ALWAYS savable    │ │
   │                                                             └────────────┬────────────┘ │
   └──────────────────────────────────────────────────────────────────────────┼──────────────┘
                                                                              │
                        canonical mapper (the ONE that already exists) ────────▼
                            editable logger rows → existing engine → BYTE-PINNED POST
```

Server side:

```
 audio blob (mp4/aac on iOS, webm/opus elsewhere — mime detected client-side, sent explicitly)
   │
   └─► POST /api/workout-logs/upload?phase=transcribe   [existing lane, additive param]
         ├─ raw audio → STT provider   (⚠ CANNOT pre-redact — disclosed in copy)
         ├─ transcript → REDACTION (existing, fail-closed)
         ├─ persist {transcriptId, redactedText, vocabBias used}
         └─► returns {transcriptId, text}                              ~1.5–3s

       POST /api/workout-logs/upload?phase=decode  body:{transcriptId, idempotencyKey}
         ├─ NEVER re-transcribes audio (cost + drift guard)
         ├─ redactedText → parseWorkoutTranscript  (existing decoder, WITH vocab bias)
         ├─ intent router: imperative? → command dispatch behind Cortex gates
         │                 content?    → structured rows + confidence
         └─► returns {rows[], fieldConfidence{}, clarify?:{field, candidates[2]}}  ~3–8s
```

**Two lanes, one mic.** The router — not the user — decides. "Skip the rest" is an imperative → command dispatch → **Cortex gates apply exactly as today** (blocking 409, pain exclusions, fail-closed eligibility). Voice widens *input*; it never widens *authority*. Paragraph logging → parser → review rows. No keywords, no grammar, ever.

### 2.2 Capture primitive — decided

**MediaRecorder, hold-to-talk with slide-to-lock** (the WhatsApp/Alan grammar Sean's users already know). Hold gives crisp endpointing and kills the invisible-listening class of defect by construction. Lock exists because a 25-second ramble held by a thumb while a client is mid-set is a lost recording waiting to happen.

Hard requirements:
- `MediaRecorder.isTypeSupported` probe; **iOS Safari yields `audio/mp4`, not webm/opus** — server STT must accept both, and the mime travels in the request, never assumed.
- `AudioContext` resumed inside the tap gesture (iOS) or the waveform is dead.
- Every blob is written to **IndexedDB before upload**, cleared on 200. Visibility change / call interrupt / screen lock = **safe-stop + salvage + transcribe what we got.** Audio is never silently lost.
- Web Speech API, where it works, drives a *greyed live teleprompter* only. It is labelled provisional and is discarded on stop. It never reaches the parser.

### 2.3 STT path

Reuse the existing `/api/workout-logs/upload` lane (already redaction-wrapped, already parser-attached) with an additive `phase` param. **I explicitly refuse a new endpoint**: §2 already counts four competing parse paths and seven capture impls; a fifth endpoint is how you get a fifth path.

**Vocab bias is the accuracy lever and it is currently dead.** Fix the 3-arg→2-arg signature drop and feed it: the client's active plan exercise names, the Rolodex names for the selected category, last session's loads, and plate increments. "One-eighty-five" mishears collapse when 185 is already in the bias set.

### 2.4 Confirm / repair turns

Clarify is triggered by a **deterministic gate, not by the model's mood**:

1. **Pain detected without body region** → highest priority. Always ask.
2. **Load implausible** — outside last-session ±40% or off the equipment's increment lattice → ask or flag.
3. **Exercise ambiguous** — two Rolodex candidates above threshold and within margin → ask.

**Exactly one question, ever.** It is answerable by voice **or by tapping one of two candidate chips**, and it **auto-resolves to best-effort after 6 seconds of silence** rather than blocking a hands-busy trainer. Question text is ≤12 words and spoken only in TERSE/FULL tiers.

**Invariant (this is where I overrule Village F-01):** there is no state in which decoded rows exist and cannot be saved. CLARIFY is a badge on a row inside REVIEW, not a peer state gating the exit. A stranded utterance is worse than an imperfect one.

Repair, in trust order:
1. Tap the wrong field → inline edit (0 LLM calls, 0 latency).
2. **[Edit transcript] → re-decode** (1 cheap call, no re-recording, no re-transcription — decode runs on `transcriptId`).
3. Re-record.
4. Type it.

### 2.5 TTS talk-back — recommendation with fallback

**Primary: browser `speechSynthesis`.** Free, instant, offline-capable, and — decisive — **zero PII egress**. Activate the dormant `voiceConfirmationTier`:

- **SILENT** — visual only. Default on desktop and when no audio output route is active.
- **TERSE** (default on mobile in Voice Mode) — speaks only: write confirmations, the one clarifying question, and hard errors. ≤12 words.
- **FULL** — also speaks coaching answers.

Laws: **no client names spoken.** Templated strings only — free-form model text is never handed to a speech engine unfiltered. iOS requires a priming `speak('')` inside the opening gesture or the first real utterance silently no-ops. Any tap cancels within 100ms.

**Fallback / premium:** the existing pro-gated Gemini TTS (`POST /api/ai-chat/tts`, iOS fallback already wired) becomes an *opt-in* upgrade — templated strings only, through redaction, off by default. I overrule "one hook swap away, just do it": that swap silently creates a text egress path that today does not exist.

### 2.6 iOS / PWA reality

Treat as **hypothesis under test until a recorded pass on Sean's actual device and installed PWA.** Known constraints designed around, not hoped away: mic requires HTTPS + user gesture; no background or screen-locked capture; installed-standalone mic permission has a history of being stricter than Safari-tab; `audio/mp4`-only recording; Wake Lock only on newer Safari.

Mitigations: capability probe at **overlay open**, not at record time, so failure is a graceful "Type instead" screen and never a dead button mid-set. Wake-lock request with a "keep your screen on" hint fallback. If `getUserMedia` throws `NotAllowedError` in standalone mode, offer the Safari escape hatch. **The whole feature stays behind `VOICE_MODE_V1` until the device matrix pass is filed as an artifact.**

### 2.7 Gym noise & offline

Noise is fought with vocab bias, plausibility guardrails, and confidence chips — not with a better microphone. Offline: capture works, decode queues in IndexedDB, badge shows "2 recordings waiting," typed text always available (§6 law: dictation degrades to typing seamlessly).

---

## 3. THE CUT LIST (§5B)

### KEEP — five surfaces, each with one job

| # | Surface | Its one job |
|---|---|---|
| K1 | **Voice Mode overlay** (one purple Coach button, log

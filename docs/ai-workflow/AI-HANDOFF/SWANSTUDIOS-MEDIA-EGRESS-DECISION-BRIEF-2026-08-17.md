---
title: "Client media egress to third-party models — the decision Sean actually has to make"
date: 2026-08-17
author: Claude Fable 5 (vs-claude), revised after hostile review by Kimi K3
decision: "PENDING SEAN. One question gates everything: which Gemini API tier is the production key on?"
status: draft
privacy: "No secrets, no key values, no client data. Env var NAMES only."
linear: SWA-107
supersedes: "the freestyle-only framing of the audio-transport question"
---

# This was never a freestyle question

For 25 review rounds, one thing was treated as blocking the Swan Coach freestyle feature: it
captures speech via the browser's Web Speech API, which on Chrome streams audio to a Google
recogniser. The feature was held pending an owner decision.

**That framing was wrong, and the evidence took four greps.**

## What is actually true, verified on `origin/main` today

### 1. The shipped product already sends client audio to Google

`VoiceRecordingOverlay` → `useGeminiTranscription` → `POST /api/ai-chat/transcribe` →
`voiceTranscriptionService.mjs` → **`generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`,
audio attached as `inlineData`.**

A trainer dictating "Tuesday with [client], shoulder pain on the left, moved to Thursday" is sending
that audio to Google **today**, from the feature production ships. The identity-redaction and
PII-stripping in `aiChatRoutes` run on **text after transcription** — they cannot touch audio.

### 2. And audio is not even the biggest surface

A detection sweep for binary payloads to a model found **six production services** doing it:

| Service | Client media sent to Gemini | Sensitivity |
|---|---|---|
| `voiceTranscriptionService.mjs` | **Voice** — names, injuries, schedules spoken aloud | High. Schedules are stalking-relevant |
| `foodPhotoService.mjs` | **Meal photos** | High — food/health-adjacent; may include home interiors |
| `equipmentScanService.mjs` (+ crop-rescan, V3 pipeline) | Equipment photos | Medium — gym context, possible incidental people |
| `contentStudioRoutes.mjs` | Content media | Varies |
| `geminiBadgeImageService.mjs` | Badge images | Low — generated assets |
| `aiChatRoutes.mjs` (TTS) | Outbound text→audio | Low |

**Rule 8 says "zero PII to LLMs." There are six binary egress points, and the review culture only
ever audited text** — because a text-shaped audit greps for JSON fields and PII names, and binary in
`FormData`/`inlineData` walks straight past it.

### 3. What is already done well (verified, not assumed)

The transcribe route is in better shape than a reviewer assumed:
- `requireSubscription('pro')` + `aiRateLimiter` + 10 transcriptions/hour/user quota
- `multer` with a **25MB cap** and a mimetype allowlist
- `strictPiiMiddleware` on the route
- **The transcript is never logged.** Both log sites emit metadata only — `transcriptLength` is a
  *number*, not the text. No raw-transcript persistence at these sites.
- `multer.memoryStorage()` — **Swan writes no audio to disk.** (Precision: the audio is
  *transmitted* in full fidelity; it is not *stored* by Swan.)

## THE ONE QUESTION THAT DECIDES EVERYTHING

**Which Gemini API tier is the production key on?** (`GEMINI_API_KEY` / `GOOGLE_API_KEY` — Sean
must check the billing state of that key's project in AI Studio; it is not visible from code.)

| Tier | What Google's published terms permit |
|---|---|
| **Free** | Prompts and responses **may be used to improve Google's products**, and **may be human-reviewed** |
| **Paid** | **Not used for training**; short abuse-monitoring retention (~30 days) |
| **Vertex AI** | Full Cloud data-processing terms, regionalisation, BAA-eligible |

**If the key is on the free tier, client voice and client meal photos may be training data and may
be seen by human reviewers.** If it is paid, all six paths are contractually governed.

**This single setting governs all six egress points at once, and changing it requires zero
engineering.** It is the highest-leverage privacy action available to SwanStudios today — and it is
a billing question, not a build.

## Recommendation

1. **Check the tier this week.** If free → upgrade to paid. One change, six paths, no code.
2. **Decide policy at the transport level, not per feature.** Freestyle should not be held to a
   stricter standard than the shipped surface while the shipped surface goes unexamined.
3. **Do not bundle an on-device model yet.** It is a multi-week slice that degrades gym-floor
   accuracy. Revisit triggers are *concrete*, not vague: first client in WA / NV / IL / TX, first
   client who asks where their voice goes, or a paid-tier invoice large enough to fund Vertex.
4. **Fix the detector, not just the instance** — add to the Rule 8 checklist: *any new binary-body
   POST or capture API is a Rule 8 event.* Sweep command:
   `git grep -lE "inlineData|FormData|multer|getUserMedia|MediaRecorder|SpeechRecognition"`
5. **For freestyle specifically:** honest capability detection and UI copy that says plainly when a
   cloud recogniser is in use. **Cost disclosure:** gating to on-device-only means Safari-only in
   practice — Chrome and Edge both use cloud recognisers, Firefox has none. On a gym floor with
   Android phones, that is most users. Cheap to build, expensive to ship.

## Corrections Kimi K3 made to my first draft (recorded, because they were right)

- **"Web Speech is less exposure" was unevidenced and may be backwards.** I ranked by fidelity and
  storage; the real axis is **vendor contractual terms**. If the shipped key is paid tier, the
  consumer Web Speech endpoint — no DPA, no no-training guarantee at any price — is the *worse*
  path, and my ranking inverts.
- **"Swan never holds the audio" is not a benefit, it is a governance hole.** If Swan never holds
  it, Swan cannot answer a client's "where did my data go?", cannot honour deletion, cannot audit a
  disclosure. Governability ranks **Vertex > paid API > consumer Web Speech** — the reverse of what
  I implied. "We never touched it" is not a defence; Swan shipped the feature that made the
  disclosure.
- **Accept-and-document is a fig leaf unless three things are true:** the risk is characterised
  (tier + terms quoted), the *client* — not just Sean — has been told, and there is a dated revisit
  with named kill-triggers. Sean accepting on the client's behalf is owner acceptance, not consent.
- **Legal exposure I never asked about:** all-party consent states (CA, IL, FL, PA, WA…);
  **Washington My Health My Data / Nevada SB 370**, under which fitness and injury data is consumer
  health data with opt-in requirements and a private right of action; BIPA/CUBI on voice biometrics;
  NASM/ACE confidentiality codes and liability-insurance terms. **One client in Washington changes
  the answer.**
- **An option I never named: unify the transports.** Route freestyle through the existing
  `getUserMedia` → `/api/ai-chat/transcribe` path instead of Web Speech. One vendor, one consent
  screen, one contract entry, one audit surface. Two differently-governed paths is strictly worse
  than one governed path.

## What Sean must do (nobody else can)

1. **Check the Gemini key's tier.** Everything else is downstream.
2. Decide the policy: upgrade tier / unify transports / gate freestyle / accept-and-document — for
   **all six paths**, not just freestyle.
3. Decide whether clients get a disclosure artefact (training agreement + capture-time notice).
4. Tell me the client-geography answer if any client is in WA, NV, IL, or TX — it changes the
   urgency from "housekeeping" to "compliance".

## What I will do once Sean answers

- Write the Voice/Media Data Annex with the tier, terms quoted verbatim, retention window and region
  per path, attached to the retention contract.
- Add the metadata-only audit log (`timestamp, clientId, durationSec, provider, model, tier` — never
  audio, never transcript, never names).
- Add the binary-egress rule to the Rule 8 checklist so the next one cannot hide.

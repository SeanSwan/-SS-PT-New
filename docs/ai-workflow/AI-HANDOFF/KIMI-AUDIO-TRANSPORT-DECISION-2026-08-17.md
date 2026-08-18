# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** .ai-workflow/audio-transport-decision-packet.md
**Seed:** (none)
**Tokens:** 1350 in / 12768 out | **Cost:** ~$0.1956 | **Wall:** 233.6s | **finish_reason:** stop

---

# KIMI K3 — HOSTILE REVIEW: Swan Coach audio-transport brief

**Scope note first:** the document under review is a decision brief, not a UI diff. The Crystalline Swan implementation checks (styled-components, tokenized colors, Victory, 300-line cap, breakpoint matrix, reduced-motion) have nothing to bite on except the one UI surface the recommendation itself creates — the cloud-recogniser disclosure notice. I apply the checklist there and mark the rest N/A rather than pretend a memo has contrast ratios. Everything else is reviewed as reasoning, per the brief's own instructions.

---

## VERDICT: **REVISE**

The architecture of the recommendation is right — one policy at the transport level, (d) before freestyle, (b) deferred, (a)+(c) as interim. But the brief's load-bearing factual claims ("same exposure class," freestyle is "in one narrow respect less exposure") are asserted on transport mechanics while the actual exposure is defined by **vendor contractual terms the author never checked**. One unverified fact — which Gemini tier the production key is on — can invert the entire ranking. A brief Sean signs must not contain a ranking it cannot evidence.

---

## WEAKNESSES, RANKED BY SEVERITY

### S1 — The ranking rests on an unverified, decision-changing fact (answers Q1, Q2)

The brief ranks exposures by *fidelity and storage* ("stored, complete, high-fidelity files" vs. "transient stream"). That is the wrong axis. Both paths send client-identifying audio to Google. The exposure class is determined by what Google's contract permits afterward:

- **Consumer Web Speech endpoint (Chrome):** governed by the Google/Chrome consumer privacy policy. No DPA. No contractual no-training guarantee available to a business at any price. No mechanism to enumerate, retrieve, or delete what was sent.
- **Gemini API via `generativelanguage.googleapis.com`:** the terms **split by tier**. Published terms: **free tier** — prompts and responses may be used to improve products and may be human-reviewed; **paid tier** — not used for training, with a short abuse-monitoring retention window (~30 days). **Vertex AI** — full Cloud data-processing terms, regionalisation, BAA-eligible.

Consequences the brief never faces:

1. If the live key is **paid tier**, the shipped path is *contractually governed* and the consumer Web Speech path is the **worse** exposure — the "less exposure" claim is wrong and the ranking flips.
2. If the live key is **free tier**, the shipped path is the worst of all three options, and option (c) — accept-and-document — **cannot be honestly signed** without client consent, because the acceptance would be documenting "client voice data used for model improvement with possible human review."
3. The author claims a "file-by-file trace" of production but stopped one hop short of the only hop that matters: the terms attached to the API key.

**Correction:** the brief must contain a **Voice Data Annex**, completed *before* any recommendation ranking: for the live Gemini key — tier (verified in the AI Studio console / billing state of the key's GCP project, not assumed), governing terms version, the training-use clause quoted verbatim, retention window, region, and a PDF/screenshot of the terms attached to the retention contract. Same table for each browser's Web Speech vendor. This is an afternoon of fact-finding, zero code.

### S1 — "Swan never holds the audio" is inverted governability (answers Q1)

The brief treats "SwanStudios never receives, handles, or holds the audio" as exposure *reduction*. It is the opposite. If Swan never holds it, Swan has **no record of what client data left the device** — which means Swan cannot honour an access request, cannot honour a deletion request, cannot audit a disclosure, cannot answer a client's "where did my information go?" With the API path, Swan at least *can* log call metadata. Governability ranking is: Vertex > paid AI Studio > consumer Web Speech — the exact reverse of the brief's implication. And "we never touched it" is not a defence recognised by any regulator or certifying body: Swan built and shipped the feature that made the disclosure.

**Correction:** reframe honestly — Web Speech is *data-minimising for Swan's infrastructure* and *governance-destroying for Swan's obligations*. Both halves in the brief.

### S2 — (c) as written is a fig leaf (answers Q4)

Three reasons. **(i)** It accepts a risk the brief has not characterised (see S1) — you cannot sign "exactly what leaves the device and to whom" when you don't know the tier or the terms. **(ii)** The signer and the risk-bearer are different people. Sean signing an internal acceptance is owner-acceptance; the data subject is the *client*. A real control requires a client-facing artefact: an AI-processing/recording disclosure in the training agreement plus a capture-time notice. **(iii)** Documentation cannot cure the consent-law problem below. Acceptance becomes a control only when paired with: characterised terms, client consent artefact, a named revisit date, and named kill-triggers.

### S2 — The brief asks zero questions about law, and Sean will wish it had (answers Q5)

- **All-party consent states** (CA, IL, FL, PA, WA, and ~7 others): freestyle is *intended* as trainer-voice-only, but it's a mic on a gym floor — client voices and bystanders will be captured. Trainer consent covers the trainer's voice only. Critically: **the voice-owner's consent is not the data subject's consent** — trainer-only dictation still discloses *the client's* names, injuries, and schedules.
- **Washington My Health My Data / Nevada SB 370:** fitness metrics, injuries, and health-adjacent data are "consumer health data" with opt-in consent requirements for third-party sharing and a private right of action. HIPAA probably doesn't cover Sean; MHMD doesn't care about HIPAA. One client in WA changes the answer.
- **BIPA (IL) / CUBI (TX):** voice data is biometric-adjacent; voiceprints are squarely regulated. Client location is unknown — that is itself a finding.
- **Certifying-body confidentiality codes** (NASM/ACE/ACSM) and Sean's liability insurance: do they permit undisclosed third-party processing of client information? The brief never asks.
- **Schedules are a physical-security data class.** "Client X, Tuesdays 6am, location Y" in retained third-party audio is stalking-relevant. One line in the brief, minimum.

### S2 — Per-browser vendor reality is absent; (a)'s true cost is understated

"Capability-detect and prefer on-device" is not one recogniser with a privacy flag. It is a vendor matrix:

| Browser | Engine | Vendor / terms | Feature under (a) |
|---|---|---|---|
| Chrome desktop/Android | Google cloud recogniser | Consumer policy, no DPA | **Blocked** |
| Edge | Microsoft Azure speech | Microsoft consumer terms | **Blocked or second vendor to govern** |
| Safari | Apple, on-device for many locales/OS versions | Varies by OS and locale | Allowed, with a per-version caveat |
| Firefox | Not implemented | — | Feature doesn't exist |

So (a) means "the feature is Safari-only" — on a gym floor, where Android Chrome is plausibly the dominant device. The brief calls (a) "cheap, honest, already half-built" without stating that it kills the feature for most users. Cheap to build, expensive to ship. Sean deserves that sentence.

### S3 — The obvious interim option is missing: unify the transports

The old framing assumed freestyle = Web Speech. Why? If the exposure is (as claimed) the same class, route freestyle's fallback through `getUserMedia`/`MediaRecorder` → the **existing** `/api/ai-chat/transcribe` route. One audio transport, one vendor, one consent screen, one contract entry, one audit surface. Two differently-governed paths is strictly worse than one governed path. The brief's own reframing implies this option and then never names it.

### S3 — The root cause of "25 rounds missed it" is never fixed

The shipped path hid because the Rule 8 audit is **text-shaped**: it greps for JSON bodies and PII field names. Audio in `FormData`/`inlineData` evades it. A policy decision fixes this once; a detector fix fixes the class. This is the highest-leverage *process* correction and the brief omits it.

### S4 — Precision and hygiene

- **"Stored" overstates.** `multer.memoryStorage()` = RAM only, no disk write. The audio is *transmitted* complete/high-fidelity; it is not *stored* by Swan (swap and crash dumps aside). Vendor retention is tier-dependent. The one word an owner might quote back is the one wrong word. Fix it.
- **The trace stopped at the provider call.** Where does the *returned raw transcript* (names intact) go before redaction? Any `logger.info`, error middleware, Sentry crumb, or DB write of the pre-redaction text is a Rule 8 violation at rest. Verify and state the result.
- **`v1beta` in production.** Pin a stable model/version; record it in the annex.
- **Route hygiene:** is `/api/ai-chat/transcribe` authenticated, rate-limited, and size-capped via `multer({ limits })`? Unbounded memory storage plus large audio is a self-DoS and cost-abuse vector. One line each to fix.
- **Wrong revisit trigger for (b).** "Minors/clinical at scale" is later than the real triggers: first client in WA/NV/IL/TX, first client who asks where their voice goes, first paid-tier invoice large enough to fund Vertex. Note also that (b) has gotten cheaper (Whisper via Transformers.js/WebGPU); the dismissal is right *for now* but should be dated.

---

## SINGLE HIGHEST-IMPACT IMPROVEMENT

**Produce the Voice Data Annex before any policy is signed — characterise, then rank.** One page, evidence-backed: Gemini tier + quoted terms + retention window for the shipped path; vendor + terms per browser for the Web Speech path. It costs hours, requires no code, and is the only step that (a) can flip the ranking, (b) converts (c) from fig leaf to executable control, and (c) determines whether (d) is "upgrade a key tier" (a near-zero-engineering exposure reduction available *today*) or a real build. Every other disagreement in this review is downstream of this one missing artefact.

---

## WHAT THE BRIEF MUST SAY THAT IT DOES NOT

1. The tier/terms evidence, quoted, attached, dated.
2. The per-browser vendor matrix and the honest cost of (a): "feature is Safari-only in practice."
3. The consent analysis: trainer-voice-only rule, all-party states, client-facing disclosure in the training agreement.
4. The DSAR/deletion answer per path — including "we cannot enumerate what Web Speech disclosed."
5. The unify-transports interim option.
6. The audit-detector fix (below).
7. Revisit triggers tied to client geography and tier, not minors/clinical.
8. Replace "stored" with "transmitted."

## BUILDER-EXACT CORRECTIONS

**Detection (do this regardless of the policy call):**
```
grep -rnE "MediaRecorder|getUserMedia|webkitSpeechRecognition|SpeechRecognition|FormData|inlineData|multer|audio/" backend/ src/
```
Add to the Rule 8 review checklist: *any new binary-body POST or capture API is a Rule 8 event.*

**Shipped path, this week:**
- Verify tier in AI Studio (billing state of the key's project). If free → upgrade to paid; that single change alters the training-use terms with zero engineering.
- In `voiceTranscriptionService.mjs` and `aiChatRoutes.mjs`: confirm zero persistence/logging of the raw transcript; audit error middleware and any APM (`sendDefaultPii` off).
- Add metadata-only audit log: `{ timestamp, clientId, durationSec, provider, model, tier }` — never audio, never transcript, never names.
- `multer({ storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })`, auth middleware, rate limit on the transcribe route.
- Pin model + move off `v1beta` where possible.

**The one UI surface (Crystalline Swan enforcement, rest of checklist N/A):**
- New `CloudSpeechNotice.tsx` + `useSpeechVendorDetect.ts` — keep `VoiceRecordingOverlay.tsx` ≤300 lines after integration; if it exceeds, extract, don't bloat.
- styled-components only, zero hex literals — surface/text/border/warning all from the existing token scale; run the token contrast CI to prove ≥4.5:1 on the dark surface; do not hand-pick an amber.
- Notice copy names the detected vendor (Google/Microsoft/Apple on-device); Firefox → hide the feature, not a dead button.
- Acknowledge control and any icon-button dismiss: ≥44×44px hit area (expand with padding/`::before` if the glyph is smaller).
- `@media (prefers-reduced-motion: reduce)`: recording indicator goes static; no pulsing loop; amplitude meter falls back to stepped opacity-only updates.
- 320/375/414: full-width stacked notice above the record control; 768+: inline row; 1440/2560/3840: clamp line length via the container token — never stretch notice text across an ultrawide.
- Victory: N/A — no chart in this decision; record the N/A so the checklist is auditable.

## WHAT THE BRIEF GOT RIGHT

Catching the shipped path is a genuine find, and the instinct "one policy at the transport altitude, not per-feature" is exactly correct — that is diligence, not scope creep (answers Q3), *provided* the shipped-path work is scoped to verify-and-document, not rebuild. Rejecting (b) for now is correct. "An accepted, documented risk is governable; an unexamined one is not" is the right philosophy — the brief simply hasn't done the examination yet that would let it sign the acceptance.

**Bottom line:** REVISE. Build the annex, fix the detector, state (a)'s real cost, add the consent layer — then the recommendation as structured is endorable.

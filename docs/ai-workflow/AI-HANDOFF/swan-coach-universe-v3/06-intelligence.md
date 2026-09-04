# SCU-INTELLIGENCE — context, memory, voice and support

Owner: Codex. Version: 3.0. Status: proposed; features remain off until gates pass.
Supersedes: v2 high-level cards 2.5–4.4 with the following explicit behavior.

## Evidence and context contract

Each domain returns `{state:available|empty|unavailable|stale|denied,value,
sourceRefs[],asOf,expiresAt,reasonCode?}`. Empty requires a successful query with no
matching rows. Unavailable means load failure. Stale means the available snapshot
exceeded domain freshness. Denied values are omitted from model context entirely.
Facts also distinguish measured, user_reported, inferred, and unknown; inference
never overwrites a measured record or becomes a safety clearance.

Initial max age: permission/target rechecked per action; active pain and readiness
60 seconds; session/plan 60 seconds; preferences 24 hours; historical workout result
is immutable only where the domain says so, otherwise use record version.
Before every write refresh required domains regardless of conversational cache.
Source/updated-time chips reflect actual reads, never browser render time.

Canonical exercise retrieval remains `/api/exercises/library`. Match exercise ID,
equipment, units, progression and approved constraints before producing a draft.
Unknown exercise names yield options, not invented IDs. Calculations run in
deterministic code. Model explains a supplied result and cites its contributing
records; it does not calculate authoritative volume from prose.

## Provider policy

Reuse providerRouter, preserving existing callers while migrating aiChatService.
Selection is per capability/eval quality, privacy policy, latency and explicit cost
budget. No claim that a named model is universally smartest. Requested and served
provider/model IDs, policy version, latency, token counts and safe failure code are
recorded without prompt bodies. Failover stays within the same allowed data class;
exhausted budget or forbidden destination returns unavailable, never a direct bypass.
Keep one bounded provider retry for transient read-only inference only if the
deployment policy explicitly permits it. Never automatically retry tool writes.
An answer-only fallback cannot claim to have executed the failed action.

## Memory contract

Reconcile `feat/coach-facts-s1` before creating any table. Required logical fields:
subjectUserId, kind, encryptedValue, scope, sourceType, sourceRef, confidenceClass,
status, consentVersion, createdAt, reviewedAt, expiresAt, supersedesId, version.
Scope: personal, assigned_coach_shared, staff_restricted. No cross-client vector
search; authorization predicates apply before retrieval and are rechecked after it.

Kinds: preference, goal, equipment, constraint_reference, training_pattern.
Constraints reference authoritative records; a casual utterance is user-reported,
not a diagnosed condition. Sensitive psychological content is conversation-only
by default; durable storage needs a separate explicit remember request and policy.
Private chat excludes durable memory extraction and future retrieval.

Precedence: current authoritative record > explicitly corrected memory > prior
user statement > inference. Conflicts remain visible as disputed. “Actually I use
kilograms” invalidates the old preference and every unsaved draft using its default;
already-saved records do not silently change units.

Memory drawer: value, why retained, source, visibility, date, edit, forget, pause.
Forget immediately tombstones retrieval/cache entries in the transaction; purge
content within 24 hours under configured retention. Backup expiration and legal
record retention are disclosed separately, not promised as immediate erasure.
Opt-out prevents new extraction. Audit retains minimal event metadata, not value.
Never train model weights on live client facts. No inferred psychological profiles.

## Voice contract

First repair dictation provenance; then evaluate real-time voice behind its flag.
Reuse browser speech / recording fallback and existing transcription route.
Every transcript segment carries captureSessionId, sequence, isFinal, origin,
locale and timestamps. Interim speech never submits. Duplicate final sequence is
ignored. Editing yields mixed origin. “Stop” stops output or capture, not a write.

Barge-in cancels TTS playback and queued speech; it does not automatically submit
what the microphone heard. A response-generation cancellation and an action
cancellation are different UI controls. Audio output cannot re-enter the input
as a command. Test echo and ambient voices; no voice-only identity authentication.

Mic starts only after explicit gesture; all tracks stop on close/background/logout.
No hot microphone, ambient monitoring, or emotional inference from vocal tone.
Raw audio ephemeral by default; optional transcript retention follows conversation
policy. Use existing PII redaction before any provider, including STT/TTS as applicable.
Provider data policies must permit the actual payload; masking names alone is not
sufficient assurance for health text.

Deliberate and cross-client writes stay tap/keyboard-only in first voice release.
Do not revive unused nonce copy until end-to-end speech-to-confirm behavior has
independent tests and approval. Device speech synthesis need not speak names.

## Emotional support and wellbeing

Coach may listen, acknowledge feelings, help choose a small achievable training
step, discuss routines, or suggest a break and real-world support. It must not
diagnose depression, trauma, eating disorders or other conditions; recommend
medication changes; claim therapy credentials; or promise confidentiality beyond
the actual product policy. Never shame missed workouts or encourage exercising
through serious symptoms. Do not make psychological support a retention mechanism.

For immediate danger statements: prioritize a brief empathetic response and
local human emergency/crisis options; pause training goals. In the US, 988 for
suicidal crisis/emotional distress and 911 for immediate life-threatening danger
are supported by [NIMH](https://www.nimh.nih.gov/health/find-help).
Ask location only when needed to find an appropriate resource; do not assume US.
No automatic contacting of trainers, family, police or emergency services.
Human expert review of crisis fixtures is an activation gate, not proof of therapy.

Tone choices: concise, encouraging, technical. Honest phrases: “Based on your last
logged session…”; “I don’t have current pain information”; “The draft is ready.”
Never: “I know you better than anyone”, “I am alive”, “I saved it” without a receipt.

## Research translated into Swan decisions

Public primary sources checked 2026-09-04. These are feature/engineering references,
not proof Swan implements them and not a ranking of the “best chatbot.”

| Reference | Supported pattern | Swan adaptation |
|---|---|---|
| [Anthropic: effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Composable workflows, tool feedback, bounded execution | Keep deterministic domain writers and bounded interpretation |
| [Anthropic: agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Evaluate agents through tasks and outcomes | Grade saved records and failures, not fluent explanations |
| [ChatGPT memory controls](https://help.openai.com/en/articles/8590148-memory-faq) | User controls for reviewing/deleting memory | Visible memory drawer with separate source record retention |
| [Gemini Live sessions](https://ai.google.dev/gemini-api/docs/live-api/session-management) | Session lifecycle and resumption mechanisms | Reconnect voice transport without replaying actions |
| [Gemini live transcription](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe) | Live transcription and voice activity detection | Explicit capture states and transcript sequence dedupe |

Novel product ideas here are recommendations, not copied vendor capabilities:
session rehearsal before a workout; correction-as-conversation; constraint-aware
exercise alternatives; evidence-linked “what changed this month”; a preflight
chip for missing readiness data; and weekly “one adjustment worth making.”

## Proactive briefing defaults

OFF until explicit opt-in. Initial trigger: once-weekly in-app review of training
consistency, or a user-selected session preflight. No push/SMS/email by default.
Max one card/day, quiet hours 20:00–08:00 account timezone, no duplicate trigger
within 7 days, dismiss/snooze/disable controls. Recheck access, consent and data
freshness at delivery, not only scheduling. Never label absence of logs as laziness.
Success metric: useful action accepted or training question resolved; not opens.

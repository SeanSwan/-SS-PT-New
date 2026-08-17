---
title: Swan Coach Freestyle Intake — Retention Contract (Amendment A6, tightened)
date: 2026-08-16
status: draft-awaiting-sean-ratification
implementation_authorized: false
supersedes: none
decision: freestyle session data is ephemeral, account-keyed, and never persisted server-side as audio
source_pin: origin/main e89ee80d72f6
---

# Freestyle Intake — Retention Contract

This contract is **load-bearing**, not a default-off courtesy. Per amendment A6 as tightened by the
2026-08-16 GLM review, **the freestyle path must not ship without this implemented.** The existing
file-upload PLAUD path keeps the original default-off posture; this contract governs freestyle only.

Freestyle capture is the most PII-dense surface in the product: it is Sean talking freely about real
clients, by name, including things he would never type into a form. Everything below exists because
of that.

---

## 1. What may be stored, and where

| Data | Where | Persisted server-side? |
|---|---|---|
| Raw audio | Device only, in-session | **Never** |
| Interim/partial transcript | Device only, encrypted, account-keyed | **Never** |
| Final transcript text | Device session store, TTL ≤ 24h | **No** |
| De-identified token stream | In-flight to the consolidation call only | **No** |
| Structured summary items | Device session store until resolved | **No** |
| Applied records | Canonical tables, via normal proposals | Yes — as ordinary records |

**⚠ THE AUDIO TRANSPORT QUESTION IS OPEN — this row is not settled.** "Except as the transcription
stream" is doing load-bearing work in that sentence: on Chrome, the Web Speech transcription stream
carries the audio to a cloud recogniser, so the exception licenses the exact exposure the rest of
this contract exists to prevent. SwanStudios itself never writes audio to disk server-side, to
object storage, or to a log — that part is true and enforced by not having any such code path. What
remains OWNER-DECIDED (pending): (a) gate to on-device recognisers only, (b) bundle an on-device
model, or (c) accept-and-document the cloud transport. This contract cannot be ratified with the
question open; whichever answer Sean gives becomes this section.

## 2. Session store requirements

- **Encrypted** at rest on device.
- **Account-keyed** — a buffer written under trainer A is unreadable under trainer B.
- **TTL ≤ 24 hours**, enforced independently of any purge trigger.
- **Session-scoped** — no cross-session accumulation.

## 3. Purge triggers (each independently unit-tested)

A session's audio, transcript, and summary are purged when **any** of these fire:

1. All items save-verified (the session has resolved)
2. Sean dismisses/discards the session
3. Logout
4. Account switch
5. TTL expiry
6. Session receipt issued

Purge means the data is gone, not flagged. A purge that leaves recoverable bytes fails this contract.

**Receipt semantics (implemented 2026-08-16, dry-loop round 1):** a purge receipt (`onPurge`) is
emitted **only when words actually existed** — empty wipes (mount cycles, unmount-after-reset,
StrictMode replay) are silent, so a receipt always means real data was destroyed. A transition of
the account key TO null is receipted as `logout`, distinct from `account-switch`. The `stop()`
snapshot is owner-stamped; expiry of the parent's handed-off copy is the S3 store's obligation.

**`'unmount'` IS HANDOFF-AMBIGUOUS — do not read it as data loss (GLM, dry-loop round 23).**
After Done, the buffer deliberately survives in `'stopped'` so the surface can show the Finished
readout and the Close flow can settle it. If the parent unmounts the overlay before that Close
(route change, or a parent that auto-dismisses on `onStopped`), the unmount purge receipts
`'unmount'` for words that were **successfully handed off**. The hook cannot distinguish consumed
from unconsumed — a `'stopped'` buffer unmounting *without* a handoff genuinely IS a loss, and
receipting that `'completed'` would be the worse lie — so the ambiguity is recorded here rather
than guessed at in code. **Audit consumers must treat `'unmount'`-while-`'stopped'` as
"indeterminate: possibly delivered", never as a loss event.** The alternative (settling
`reset('completed')` once the parent acknowledges `onStopped`) costs the Finished readout and is a
product call for S3/S4, not a hook change.

**Open enforcement-location question (from GLM round 1):** the "never auto-transcribe after an
automatic stop" rule for the RECORD path is enforced by consumers, not by `useCoachCapture` itself —
the hook cannot distinguish a user gesture from an effect. Resolve when S3 lands (candidate: a
required `userInitiated` argument).

## 4. Exclusions

Freestyle transcript text and summary content are **excluded from**:

- Application logs
- Analytics and telemetry
- Error reports and crash dumps
- Any model context **beyond the single consolidation call itself**, and that call receives
  de-identified tokens only

## 5. PII boundary

Client names are mapped to tokens **client-side, before any transcript leaves the device**.
Consolidation operates on tokenized text. Real names are re-hydrated at render, in trainer
role-scoped views only.

**Adversarial test required before the consolidation slice ships:** the tokenizer must be exercised
against the full range of ways Sean actually refers to people out loud — formal first names,
shortened forms, two-letter initials, possessive references to a relative, and purely descriptive
references (an activity or trait instead of a name). A tokenizer that only catches formal first
names violates the zero-PII mandate in letter while appearing to pass.

**Fixture rule:** the test fixture uses **synthetic names only**. Real client names must not enter
the repo, the test suite, or any committed doc — including as illustrative examples. Sean supplies
the *shapes* of his naming variety; the fixture instantiates them with invented names.

## 6. Shared-device test (extends amendment A5)

On a shared gym tablet:

1. Trainer A starts a freestyle session and talks.
2. Account switches to trainer B mid-session.
3. **Trainer B must see nothing** — no buffer, no partial transcript, no summary, no indication a
   session existed.

## 7. What this contract does not cover

- The file-upload PLAUD path (`uploadTranscript`) — unchanged, keeps the original A6 default-off posture.
- Records that have been applied — once confirmed, they are ordinary records under ordinary retention.
- Server-side scheduling of already-confirmed writes (the dormant lease machinery) — separately adjudicated.

---

## Ratification

**Status: draft.** Sean has ratified the contradiction rule and the future-date rule (2026-08-16).
This retention contract has **not** yet been ratified and no implementation is authorized against it.

Related: `docs/ai-workflow/coach-brain/10-freestyle-intake.md` (draft),
`docs/ai-workflow/AI-HANDOFF/GLM-COACH-JARVIS-REVIEW-2026-08-15.md` (§A6, §D2, slice S3).

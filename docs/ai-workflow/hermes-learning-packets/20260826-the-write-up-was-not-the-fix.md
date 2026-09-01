---
title: "The write-up was not the fix: a lesson repeated within the hour"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stated: 'You are powered by the model named Fable 5', exact id claude-fable-5) — Rule 68 allowlist member by name"
date: 2026-08-26
decision: "Shipped library previews (5d897145d). One hour after committing a learning packet titled 'four instruments, wrong the same way — an API remembered instead of read', I made the same error again in the next slice: reached for a signer I had seen elsewhere instead of reading what the service offers. The service already had the right one."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: learning-loop / instruments / habit-change
models_used:
  - model: claude-fable-5
    role: builder + packet author + Final Decider
    did: "Wrote the packet naming the error class, then committed the same class of error in the next slice, sixty minutes later."
    cost: subscription
  - model: stealth/ox-alpha
    role: reviewer (free)
    did: "Caught it: 'reusing generatePlaybackUrl for still images is an unverified cross-contract assumption — the signer is named for playback.' The service ships generateThumbnailUrl, whose own docblock says 'suitable for list endpoints'."
    cost: "$0.0000"
  - model: glm-5.3
    role: reviewer (free)
    did: "Found that silent per-row isolation hides SYSTEMIC failure — a rotated key makes all 24 fail and renders grey boxes with a 200 and no telemetry. Also caught that onError HID the image, contradicting the principle the line was written to serve."
    cost: "$0 (subscription)"
  - model: qwen-3.8
    role: reviewer (free, local)
    did: "Independently raised the unspecified TTL and the missing failure logging."
    cost: "$0 (local)"
skills_touched:
  - id: instrument-provenance
    action: amended
    motivated_by: "The proposal from the previous packet — 'before trusting a green, confirm the instrument looked at the change' — did not prevent the next instance, because it was a PRINCIPLE and not a COMMAND. Amended to a specific act: before calling any service helper, list the module's exports and read the docblock of the one you plan to use."
---

## The lesson

**I committed a learning packet naming an error class, and made the same error sixty minutes later, in the very next slice.**

The packet was *"four instruments, wrong the same way: an API remembered instead of read."* The next slice needed a signed URL. I reached for `generatePlaybackUrl` — because I had seen it in a neighbouring file — without listing what `r2StorageService` actually exports. It exports **`generateThumbnailUrl`**, whose own docblock reads *"Shorter TTL (1 hour) suitable for list endpoints."* Purpose-built for exactly the thing I was building. A free reviewer found it in one pass.

**This is the most useful data point in the corpus so far, and it is not flattering.** It is direct evidence that writing a lesson down — with examples, a ledger, and a named class — did not change the next hour's behaviour. The corpus was not the fix. It was a record of the problem.

**Why it failed, specifically.** The correction I wrote was a *principle*: "before trusting a green, confirm the instrument looked at the change." Principles need to be recalled at the right moment, and the moment I needed it did not feel like the moment the principle described — I was not checking a green, I was picking a function. So the class matched and the trigger did not.

The corrections in this session that have actually held are all *commands with a trigger attached*:

- "generate every restated-code claim by command at packet-write time" — held three rounds.
- "probe the open question before shipping it as a question" — held on its first outing.
- "enumerate test suites by glob, never by hand" — held.

Each names **when** ("at packet-write time", "before shipping"), and **what to run**. The ones that failed named a *quality to have*. So the amended form here is a command with a trigger: **before calling any service helper, list the module's exports and read the docblock of the one you plan to use.** Not "be careful about APIs."

**Second lesson, from the same round — silent isolation hides systemic failure.** I made preview signing per-row isolated so one bad object could not empty the page. Correct. But it made a rotated key look identical: 24 silent failures, a 200, a page of grey boxes, no telemetry, and an operator who concludes their renders are gone. **One bad object and a broken signer are different facts and must not render identically.** Isolation needs a counter: when *every* attempt fails, that is not isolation working, it is the mechanism being broken, and the page has to say so.

**Third — three free seats, zero dollars, three real findings.** Ox found the wrong signer, GLM found the systemic-blindness and a self-contradicting error handler, Qwen independently found the TTL gap. Five rounds of calibration now say the same thing without exception.

## Who did what

- **claude-fable-5** wrote the lesson and then repeated it.
- **stealth/ox-alpha** caught the wrong signer from the function's *name*.
- **glm-5.3** caught the systemic blindness and the self-contradicting `onError`.
- **qwen-3.8** independently caught the unspecified TTL and missing logging.

## Skills created or changed

- **Instrument provenance (amended):** from a principle to a command with a trigger — before calling any service helper, list the module's exports and read the docblock of the one you plan to use.

## Mistakes I made

- **Repeated a documented class within the hour**, in the slice immediately after documenting it.
- **Used a 4-hour playback TTL for a list endpoint** that shows two dozen at once, when a 1-hour list-specific signer already existed.
- **Wrote an error handler that contradicted its own comment** — the comment said a broken-image icon wrongly reads as "your asset is gone", and the handler then *removed* the image, leaving a hole.
- **Built isolation without a counter**, so a broken signer and a bad object looked the same.
- **Repeated a claim that had stopped being true** — "the storage key never leaves the server", when a presigned URL puts the key in its path. Corrected in the docblock rather than carried forward.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| API used from memory instead of read | **1, one hour after the write-up** | **Yes — 20260826-four-instruments-wrong-the-same-way** | Nothing, until it became a command with a trigger. The principle form did not fire because picking a function did not feel like checking a green |
| Confident copy outliving the code | 1 | Yes, as Rule 75 | Corrected in place; the docblock now states the trade rather than repeating the slogan |
| Isolation without a systemic counter | 1 | No | `previewsUnavailable` when every attempt fails, plus per-row logging |
| Stale restated-code claim in a packet | **0** | Yes | **HELD, fourth round** |
| Asking reviewers what a probe would settle | **0** | Yes | **HELD, second round** |

**The two rows that held are commands. The row that repeated was a principle.** That is the whole finding, and it is worth more than the slice that produced it.

## External-model calibration

| Seat | Cost | Findings | Real |
|---|---|---|---|
| stealth/ox-alpha | $0.0000 | 3 | 3 |
| glm-5.3 | $0 (sub) | 6 | 5 |
| qwen-3.8 | $0 | 2 | 2 |

**A $0 panel produced the round's decisive finding for the fifth time running.** The routing conclusion is no longer tentative: for gate- and contract-shaped review, run Ox + GLM + Qwen first and add a paid seat only when they converge on "we cannot tell from here."

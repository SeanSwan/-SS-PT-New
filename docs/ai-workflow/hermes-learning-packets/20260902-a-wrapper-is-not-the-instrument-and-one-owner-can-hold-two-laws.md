---
title: A wrapper is not the instrument — and one owner can hold two contradictory laws for the same source without knowing it
date: 2026-09-02
originating_model: claude-fable-5-1
tier: fable
surface: photographer-brain / creator-brain (SWA-233)
models_used:
  - model: claude-opus-5 / builder + synthesiser / wrote the consult packet, ran both GLM seats behind the shared lock, wrote the synthesis, stamped one wrong [VERIFIED] / subscription
  - model: claude-fable-5-1 / hostile reviewer + final decider / retracted the stamp, found two untested load-bearing assumptions, read the sister repo and found the law conflict, wrote the creator-brain blueprint / subscription
  - model: glm-5.3 / consultant / 25,840 out, 17,357 reasoning, 796s; corpus-priority inversion, market calibration, honest [UNSURE] on Topaz and darker-skin authority / $0 Z.ai
  - model: glm-5.3-flash / consultant / 19,804 out, 12,083 reasoning, 570s; implicit-label loop, orchestration-tax failure mode, ITA° bands; over-cautious on one named creator / $0 Z.ai
skills_touched:
  - id: instrument-check (existing) / amended in spirit, not text / a [VERIFIED] stamp was applied to a third-party wrapper's flag list as if it were the native CLI — the skill's "validate the instrument" rule needs the corollary "and confirm it IS the instrument"
  - id: SwanGuard CB0 lane law (proposed, docs/SWANGUARD-CREATOR-BRAIN-BLUEPRINT-2026-09-02.md) / created / SS-PT's swan-scout uses yt-dlp; SwanGuard forbids it; no rule anywhere said which posture governs which repo
---

## The lesson

**A wrapper's feature list is not the underlying tool's contract.** The Opus session searched
for Topaz CLI flags, got a PyPI page for `topyaz` — a one-author Python wrapper — saw
`--denoise_strength`, and wrote *"`[VERIFIED]` `tpai` exposes `--denoise_strength`… flash's
objection is weakened."* The native `tpai.exe` was never observed. The same search returned
Topaz community threads titled *"Command Line — documented options?"*, which was evidence the
opposite way and went unread because the confirming snippet arrived first. This is the
"exists ≠ renders" error in a new costume: a lazy import is not a mount, a mirror is not the
source, a wrapper is not the instrument. The stamp cost a whole downstream ruling — a consult
model's caution was overruled on evidence that did not exist.

**Second, one layer up: an owner can hold two contradictory laws for the same source, in two
repos, and neither repo knows.** SS-PT's `swan-scout` pulls transcripts with yt-dlp — 17 sit
in a local cache — and this session used it to verify creator names. SwanGuard's
`creatorFetch.ts:8` says *no transcripts, no captions — law 4, official APIs only*, and its
Phase 131 blueprint spells out why. Sean then asked for the two to be joined ("SwanGuard should
do this"). Nobody was wrong; the postures were built for different purposes — a research
instrument and a product. But a plan that inherits one of them by accident is a plan that
either ships a ToS violation or quietly loses its corpus. The fix was not a rule; it was
**naming the lanes and making the owner sign the table** (CB0), so the boundary is a decision
with a signature rather than a fact discovered in a review.

**Third, the technical fact that made the second lesson urgent:** the YouTube Data API cannot
return transcripts of videos you do not own — `captions.download` needs OAuth with edit
authority on the video. "Use my API to get all the transcripts" is not a quota question; it is
a capability that does not exist. The only thing that returns them is the thing one repo
forbids.

## Who did what

- **Opus 5 (builder):** built a strong packet and a strong synthesis; ran both GLM seats
  patiently behind the shared Z.ai lock without seizing it (correct); then over-claimed one
  verification and adopted two load-bearing assumptions — "the archive is ground truth" and
  "implicit labels cover the product" — without naming what the archive physically is or which
  layer the labels reach.
- **Fable 5.1 (reviewer):** re-checked the `[VERIFIED]` by reading what the search actually
  returned; asked "pairs or JPEGs?" of the archive claim; traced the `.xmp` round-trip and found
  it stops at the parametric layer; read the sister repo before ruling on acquisition and found
  the law conflict. The method that worked was the same one as the last packet: **for every
  claimed invariant, find the second place it must hold and look there** — the native CLI, the
  raw files, the retouch layer, the other repo.
- **GLM 5.3:** produced the best single strategic insight (invert the corpus priority) and was
  honest where it did not know. Its Topaz `[UNSURE]` was right to stay unsure.
- **GLM 5.3-flash:** produced the best single practical idea (harvest Lightroom corrections as
  labels) and the failure mode 5.3 missed (orchestration tax). Its caution on Topaz's "black
  box" stands now that the rebuttal is retracted — the reviewer who was overruled on bad
  evidence was, on the evidence that exists, the more careful one.

## Skills created or changed

- **CB0 lane law** (SwanGuard blueprint §2): three acquisition lanes by legal posture — product
  / personal research / derived-only bridge — with the owner's signature as the gate. Born from
  the discovery that two repos already held the two postures with no rule saying which applied
  where.
- **instrument-check corollary** (not yet written into the skill; proposed): "validate the
  instrument" must include "confirm the observed thing IS the instrument named in the claim."

## Mistakes I made

- **Stamped `[VERIFIED]` on a wrapper's flag list** (Opus 5, same session). Caught by the Fable
  pass reading the raw search result. Rule: the verification names the exact artefact observed
  — binary, endpoint, file — and a wrapper, mirror, summary, or lazy import is not it.
- **Adopted "your archive is the ground truth" without asking whether raw→edit pairs exist**
  (Opus 5). Caught here. Rule: any "X is ground truth" names X's file type and count first.
- **Scored a feedback loop as product-wide when it observes one layer** (Opus 5). Caught here.
  Rule: scope every loop by the operations it can see, per layer.
- **Treated YouTube ToS as a `[CONSULT]` footnote** when the owner's other repo carried it as
  law (both sessions). Caught only by reading SwanGuard. Rule: before designing acquisition for
  any source, grep every repo the owner has for that source — the law may already exist.
- **Ran a hostile review of a document, not of the tools it named** — the review would have
  missed H1 too if the search result had not been re-read. The corrective was luck plus habit,
  not procedure; the procedure is now the first bullet.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Verified-the-wrong-artefact ([VERIFIED] on a wrapper) | 1 | no — but the corpus already holds "validate the instrument" (2026-08) | re-reading the raw search result; the existing rule lacked the "is it the named thing" corollary |
| Ground-truth claim with no named substrate | 1 | no | asking "pairs or JPEGs?" |
| Loop scope over-stated | 1 | no | tracing the `.xmp` round-trip per layer |
| Source law lives in a sibling repo, unread | 1 | no | reading SwanGuard before ruling |
| Heredoc write failed under the shell hook; switched to file tool | 1 | yes — last packet, same night | the fix was already known; still cost one attempt because the first write was tried the old way |

## External-model calibration

- **GLM 5.3** — photographer packet, $0, 796s. Verified on read-back: Pratik Naik High (correct),
  Cullen Kelly High (correct), refused to invent a darker-skin authority (correct). Its Topaz
  claim was `[UNSURE]` and stayed honest. Strategic yield: highest.
- **GLM 5.3-flash** — $0, 570s. Verified: Cullen Kelly (correct); Naik `[UNSURE]` was
  over-cautious (he has a channel with 752k on one video). Its Topaz "unauditable black box"
  was rebutted on bad evidence and now stands as caution. Practical yield: highest.
- **Both seats independently refused the same invented name.** Two refusals is stronger signal
  of a real gap than either seat's confident answer would have been.
- **Opus 5** — no cost; one wrong stamp, two untested assumptions, all downstream of a good
  synthesis. Calibration: excellent at assembling, weaker at doubting its own verifications.

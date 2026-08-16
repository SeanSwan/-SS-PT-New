# ROUND 5 — HOSTILE + SECURITY REVIEW OF THE CURRENT BUILD PLAN

## How to answer

**Full spectrum, no lane.** Answer across product, systems/architecture, security, interaction,
data modelling, logic correctness, and strategy. Declare which angle is your strongest, go deepest
there, then cover every other angle anyway. **A reply that stays in one lane is incomplete and
gets re-run.**

You reviewed an earlier round of this project. **This round is different: you are reviewing
decisions the orchestrating agent made ON TOP of your panel's findings — and nobody has checked
those.** They are the least-reviewed material in the project and the most likely to be wrong.

---

## A. THE SPECIFIC CLAIM TO VERIFY OR DESTROY FIRST

The locked kill criterion was *"two wrong-child errors and the model path dies permanently."*
The orchestrator changed it to count only **uncorrected** errors, and asserted:

> *"What counts as a strike is derivable from the v1 schema — no new field needed. A
> `child_corrected` event whose `at_ut` is later than a `handed_off` event on the same
> `record_id` means the wrong attribution reached a family note. Earlier means she caught it in
> review, which is not a strike."*

**Attack this claim specifically.** Is it actually sound? Consider at minimum:
- Clock behaviour: device time changes, DST, NTP correction, timezone travel, two events in the
  same millisecond, monotonicity assumptions.
- Whether `handed_off` on a *record* is even the right granularity, given a family note is
  assembled from multiple records and copied as one blob.
- Re-copy after correction; copy, correct, copy again; copy then dismiss.
- Records edited but never handed off; handed off but never accepted.
- Whether "she corrected it" reliably means "the model was wrong" — she may be changing her mind,
  fixing her own typo, or reassigning a note that was ambiguous rather than wrong.
- Whether this is measurable at all if she never notices the error (the orchestrator already
  concedes the counter under-reports; say whether that concession is sufficient or whether the
  whole criterion is unsound).

If the claim is wrong, say so plainly and give the correct design. If it needs a schema field
after all, name the exact field — the project treats "unrecoverable if missing from v1" as the
real migration risk.

## B. ATTACK THE THREE PROVISIONAL DECISIONS

Each was made by the orchestrator, not by the owner, and each is marked reversible. Attack all
three on merits — product, legal, security, and implementation:

1. **Wrong-child response:** count uncorrected only; graduated degradation (strike 1 →
   suggest-only + confirmation tap; strike 2 → rules-only attribution, model still classifies
   types) instead of permanent death of the model path.
2. **Retention:** ordinary observations retain through end of school year + one term; incidents
   and promoted evidence exempt; opt-in early deletion ("scratch"); scratchpad feel delivered by
   an active/archive **view** rather than deletion. Rationale given: the storage argument for
   expiry is false (5 MB per five years vs a 2,400 MB model file), but indefinite retention is
   also wrong on data-minimisation grounds.
3. **Sync wording:** replace "phone and laptop do not sync" with *"no server, no cloud, no
   account, no background sync; a deliberate, teacher-initiated, encrypted, same-room transfer is
   permitted — a briefcase export, never a sync engine."* Claim attached: with the model on the
   phone, **v1 needs no transfer at all**, so this is decide-now/build-later.

## C. SECURITY REVIEW

Full pass on the design as it now stands. The v1 posture is deliberately built from absences —
no `INTERNET` permission, `allowBackup=false`, no accounts, no third-party SDKs, no notifications,
no stored audio, no photos. Attack that posture. Where does it leak anyway? What has been assumed
rather than verified? Assume a motivated adversary, a lost phone, a subpoena, a prompt-injected
local model, and an unlucky day.

Note the data class: developmental and behavioural records on named children aged 2–3, held by
their teacher on a personal device, plus legally protective incident records.

## D. BUGS, ERRORS, LOGIC UPGRADES

Go through the data model, indexes, the capture→extract→correct loop, the expiry guard, and the
failure paths. Find **concrete defects**: wrong types, missing constraints, race conditions,
incorrect index coverage, guard logic that does not actually guard, states that cannot be reached
or cannot be left, failure paths that silently lose data. Give the corrected version, not just the
complaint.

## E. ENHANCEMENTS

Anything you see that would materially improve this — for the teacher's daily reality, for
correctness, for safety, or for the builder's ability to ship it. Absence-first: what *should*
exist that nobody has listed?

## F. THE NEXT SLICE — YOUR CALL

End with an explicit recommendation: **what should be built or decided next, and why that rather
than the alternatives.** Rank the top three candidates. Be concrete enough to act on without
follow-up questions. Note that three questions to the teacher and her employer remain unanswered,
and say whether any of them block your recommendation.

## Format

Markdown. Lead with the three findings you would defend hardest. Rank everything by severity ×
likelihood × cost-to-fix-later. Include a **DISSENT** section stating where this packet's own
assumptions are wrong.

---

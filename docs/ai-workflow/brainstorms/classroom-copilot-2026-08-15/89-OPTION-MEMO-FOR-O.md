# Option memo for O — what T can actually have, now that variant 1 failed

One page. The panel's sharpest product finding (both reviewers, independently): killing the
port variant produced a decision but still nothing T-facing. This memo closes that gap —
it is the decision you make AFTER the install evening, not instead of it. **Nothing here
touches the frozen H0 package or competes with steps 1–3.**

## The fact that changes the picture

The rules sorter you already have scored, on the adversarial corpus: **53.3% recall,
ZERO false positives, ZERO child-link violations, zero unflagged child items.** It is
boring, deterministic, auditable — and it is the only sorting artifact in this project
that has never once violated a child-safety invariant. The 14B variant beat it on recall
and lost on everything that matters (precision, fabrications, one forbidden child link).

**Provenance caveat (R2, on the memo's face):** those numbers rest on 12 cases / 15
scored fragments — an under-sampled corpus (the spec said ≥20) — whose author had read
the scorer and roster — the contamination argument this
project levels at the model results applies symmetrically here. Treat 53.3% as indicative,
not certified. What survives the caveat, because it is structural rather than measured:
the rules sorter **cannot** fabricate items or link a child it wasn't told about — its
failure mode is fail-closed (it misses things and leaves them untyped for T's manual pass;
missed items simply stay in the dump T already reviews in full). The model's failure mode
is fail-open (it invents). That asymmetry, not the recall number, is the case for (a).
**Determinism, scoped precisely:** the rules sorter is deterministic — pure code, same
input → same output, always. The model variant is measured NON-deterministic even at
temperature 0 (three runs, same config: recall 60.0–66.7%, a compliance metric flipped) —
one more structural reason (a) is the safe default and the model belongs, if anywhere,
behind a deterministic guard.

## Your three options (pick after the H0 gate reads out, step 7)

**(a) Ship the rules sorter as the assistant's sorting engine — available now.**
Cost: ~an evening to wire into the H0 flow. Risk: lowest possible (no model in the sorting
path at all). It misses ~half the fragments, but every item it does emit is typed
correctly, and T reviews everything anyway — recall gaps become items T files by hand,
exactly what she does today for 100% of them. Any sorted fraction is pure gain.

**(b) Fresh-corpus port retry under the R2 pre-registered gate.**
Cost: a fresh blind corpus (someone who has NOT seen the failure output writes ≥60
link-risk items), the deterministic link-guard built first, shared scorer, ≥3 seeded runs.
Realistically days of part-time work. Only worth it if (a) proves insufficient in use.

**(c) Hybrid: model proposes, rules verify — the actual production architecture.**
The 14B drafts items; the deterministic layer enforces link-suppression, type enum, and
review flags before anything reaches T. This is the untested variant the panel said the
pilot should have measured. Cost: the guard from (b) plus integration; the seen corpus can
regression-test the guard (non-gating) for free.

## One decision that is NOT optional, with a deadline

Separate from T's project (R2 review, accepted): your production SaaS's AI chat has no
age/guardian gate, and one of its current active chat users has no birth date on file.
Today that population is your handful of personally-known adults, so nothing is on fire —
but the review is right that "backlog + no deadline + no active control" is not a
defensible standing state. **By 2026-08-23 (one week), pick one:** (i) accept the interim
risk explicitly (a one-line reply suffices — it gets recorded on the tracker issue), or
(ii) say "schedule the tripwire" — the probe script now has a `--tripwire` mode that exits
nonzero the moment any minor signal turns up, ready to drop into any scheduler — or
(iii) order the deny-by-default gate slice built now instead of backlog. Silence past the
deadline gets re-asked, not assumed — **re-ask owner: whichever agent session next reads
the board after 2026-08-23, at every session start until you answer** (the dated request
lives on the tracker issue, so any agent lands on it). One rider so a single reply covers
all the child-safety items: the reviewers also recorded a proposed constitution amendment
(whether the paid-panel escalation tier should be recalibrated for tiny personally-known
populations) — accept, reject, or defer it in the same breath. A partial reply leaves the unanswered
item OPEN and re-asked — silence on the rider is never inherited from an answer to the
deadline items.

**Recommendation:** (a) now, silently, as part of week-one — it is invisible to T except
that some of her dump arrives pre-sorted; then let the step-7 gate reading and T's
month-end answer ("a program for the year, or relief this month?") decide whether (b)/(c)
ever happen. Do not build (b) or (c) during the freeze.

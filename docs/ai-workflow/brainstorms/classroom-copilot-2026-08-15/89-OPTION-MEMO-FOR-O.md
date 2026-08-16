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

**Recommendation:** (a) now, silently, as part of week-one — it is invisible to T except
that some of her dump arrives pre-sorted; then let the step-7 gate reading and T's
month-end answer ("a program for the year, or relief this month?") decide whether (b)/(c)
ever happen. Do not build (b) or (c) during the freeze.

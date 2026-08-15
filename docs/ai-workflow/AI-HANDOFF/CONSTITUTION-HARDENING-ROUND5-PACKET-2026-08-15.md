# Hostile Review Packet — Constitution Hardening, ROUND 5 (CONFIRMATION)

**Scope:** process/tooling mechanics ONLY; sensitive-content classes excluded and
grep-verified absent.

You ended round 4 saying: *"Add the polarity-deletion test (F1) and, if it fails,
treat absent polarity as a polarity class. After that lands: the work is dry …
further rounds beyond F1 would be invention, and I decline to invent."*

F1 has landed. **This round exists because the F1 fix is itself unreviewed code**,
and in all four prior rounds the defect lived inside the round's fix — twice inside
the fix the round led with. If it holds, say DRY and we stop.

---

## 1. F1 — done exactly as prescribed

Written **test-first**. It went red precisely as you predicted, then green.

The code had `if (!newModals) continue;` — treating "no polarity after" as "not an
inversion". Absence is now a polarity value: a governed word that **survives** in the
new body with no polarity governing it blocks the rename. A word that **vanishes**
entirely is a clause deletion and remains the business of the per-rule (2%) and
aggregate (0.5%) shrink checks, so the two do not overlap or double-report.

**Your item 2 also built** (you called it worth doing, not blocking): `required`
moved out of STRENGTH so that "a hostile review is required" → "is recommended" —
a downgrade carried by no modal verb at all — trips the same deletion branch.

---

## 2. A false positive I found in the F1 fix before sending it back — attack this

Self-review of the F1 fix found that `pairs()` scanned only **forward** from a modal.
So the imperative form was seen and the passive form was not:

> "never **commit** X"  →  "**committing** X is forbidden"

The prohibition is preserved exactly, but "commit" had no polarity in the new body,
so the fresh deletion branch reported a dropped negation. **An honest rewording would
have been blocked** — and by your own round-2 reasoning, a guard that blocks honest
work is how `--no-verify` becomes a habit.

Two changes:
1. Scan **backward** as well as forward.
2. Compare polarity **DIRECTION** (NEGATIVE vs POSITIVE), not token identity —
   `never` and `forbidden` are the same prohibition in different words, while
   `never` → `always` is still a flip.

**That refactor immediately re-opened the hole round 4 closed.** Classifying `must`
as POSITIVE meant "must never commit X" registered *both* directions on the same
word, so deleting the `never` left POSITIVE shared and the deletion check went
silent. `must` is strength, not polarity. Its own test caught it. That is three
consecutive rounds where the defect lived inside the fix.

Both behaviours are now pinned by committed tests: the passive rewording PASSES, the
negation deletion BLOCKS.

---

## 3. Current check inventory

| # | Check | Blocks |
|---|---|---|
| 1 | removal | a rule in HEAD absent from staged |
| 2 | renumber | a rule name whose number moved |
| 3 | reversion | per-rule shrink >2%, MANDATORY dropped, amendment marker lost |
| 3b | aggregate | surviving rules lose >0.5% combined |
| 3c | rename continuity | <25% content overlap, MANDATORY downgrade, polarity inversion, polarity deletion |
| 4 | mirror parity | AGENTS.md body ≠ CLAUDE.md (consistency, not clobber) |
| — | references | a cited repo path that does not resolve |
| — | advertising | installed-but-undocumented or documented-but-missing skill |
| — | wiring | core.hooksPath unset/absolute/dangling (SessionStart, not a git hook) |

Escape hatches: `SWAN_ALLOW_RULE_REMOVAL`, `SWAN_RULE_RENAME` — env-only,
command-scoped, and a stale entry BLOCKS the next constitution commit.

---

## 4. Evidence

- `constitution-guard.test.mjs` — **23/23**. Fourteen assert BLOCK; nine assert PASS
  (honest edit, honest expansion, clause-adding rename, **passive rewording**,
  declared removal/renumber/rename, non-applicable commit), so a block is provably
  the defect and not an always-red harness.
- `constitution-references.test.mjs` — **5/5**.
- Full hook suite — **107/107**.
- Real document: 136 citations resolve · 0 unresolvable · 0 undocumented skills ·
  0 phantom routes · mirror `--check` OK · 81 rules both files · 0 missing ·
  0 collisions · 0 body deltas.
- Live-fire: the full chain runs on real commits.

---

## 5. Attack list

1. **The direction model.** NEGATIVE = never/not/cannot/no/avoid/refuse/forbidden/
   prohibited/banned/only/except. POSITIVE = always/required. STRENGTH (untracked) =
   must/shall/may/should. Name a misclassification that opens a hole — `only` and
   `except` are the ones I am least sure of.
2. **The backward scan window is 3 tokens, forward is 4.** Construct a sentence where
   that window attaches a polarity to the wrong subject and produces either a false
   block or a false pass.
3. **Interaction:** deletion-branch vs the shrink checks. I claim they partition
   cleanly (survives-without-polarity vs vanishes). Is there a case that is neither
   or both?
4. **Anything from rounds 1–4 marked FIXED that is not.**
5. **Is it dry?** If nothing here is a real defect, say DRY plainly. You declined to
   invent last round; apply the same standard now. Over-building remains a finding.

## 6. Limits

Sanitized; rule contents excluded. Advisory only — repository truth and owner
approval remain authoritative.

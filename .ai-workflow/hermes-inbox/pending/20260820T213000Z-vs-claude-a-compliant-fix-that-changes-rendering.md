---
surface: vs-claude
slug: a-compliant-fix-that-changes-rendering
date: 2026-08-20
worktree: c:/tmp/sspt-atelier-studio @ feat/front-page-atelier-run
commits: 092075342, 180649bb5
board: SWA-178
---

# Three reviewers, six defects, one of them mine and freshly defended

GLM 5.3 + Kimi K3 ($0.0592) + local Qwen 3.8 ($0) reviewed option C independently.
All three returned FAIL. Every code finding is fixed; two that need a migration are
held for Sean. Full synthesis + per-model calibration in
`docs/ai-workflow/AI-HANDOFF/PANEL-SYNTHESIS-INTENT-TAG-2026-08-20.md`.

Grok 4.6 was NOT run — Sean said "GRAC 4.6" and Rule 12 forbids Grok outright.
Seat left unfilled pending clarification rather than silently substituted.

## Mistakes I made

- **I shipped a live visual change to satisfy a lint rule, then claimed nothing
  user-visible changed.** Swapped an alert's `#fff` for `var(--text-on-accent, #ffffff)`,
  reasoning the fallback made it render-identical. It does not — that token resolves to
  the colour readable against the PRIMARY BUTTON, an unrelated surface, and on a
  light-primary theme it puts dark text on a saturated alert. I had checked whether the
  token existed and never checked what it RESOLVES TO. All three reviewers caught it.
- **I reintroduced the exact defect I set out to remove, one layer up.** The whole point
  was killing a count that silently stops being true. My tally rode a `LIMIT 5000` with
  no `ORDER BY` — a nondeterministic sample that silently undercounts past the cap. I
  had even noticed the cap and rated it "document, don't fix." Two reviewers rated it
  blocking, correctly.
- **My own test asserted a defect as a feature.** I wrote a case asserting
  `prism:intent:__proto__` becomes an ordinary bucket, framing containment as success.
  Kimi pointed out that reporting an intent the vocabulary doesn't publish is itself the
  bug. The right answer was to drop unknown intents entirely.
- **I tested the half I authored.** Adversarial tests for the validator I wrote; none for
  the aggregator I had merely mirrored. The validator's `__proto__` case PASSING is what
  made me feel covered.
- **The feature was one property on one call and I never tested that line.** Both paid
  reviewers named it the biggest hole independently. A refactor dropping it reverts
  everything silently, with no error.
- **I asserted the merge path in prose.** Claimed repeat submitters get tagged and never
  showed it. Now a supertest case.
- **Fifth false alarm from a count matching prose:** expected 2 `Object.create(null)`,
  got 3 — the third was my own comment. Checked rather than assumed, which is the only
  reason it stayed a non-event.

## External-model calibration

- **Kimi K3** — $0.0592, 97s, 9 findings, **9 real**. Highest precision. Found the
  coverage hole, the multi-intent undercount, and the unverified merge path.
- **GLM 5.3** — subscription, 196s, 8 findings, 7 real. The only reviewer to leave the
  diff and ask a business question: *what about the trainer leads you already have?* No
  amount of code-reading surfaces that. Highest-value finding of the panel.
- **Qwen 3.8** — $0, 80s, 7 findings, 5 real. No unique finds, but independently
  confirmed both high-severity items — exactly the corroboration role it is meant to play.
  Overstated one magnitude (claimed 100k keys where the 5000-row fetch caps it) and
  reached a right conclusion via an evidence-free argument.

**Routing lesson:** the free reviewer was not the weakest, it was the least original. The
paid pair earned six cents by finding a defect I had introduced twenty minutes earlier and
argued for in writing. For diffs where I move or mirror existing code rather than author
it, an outside pass is worth its cost — that is precisely the code my own tests under-cover.

## Coordination note

A parallel session on this branch swept my uncommitted `ContactV3.tsx` edit into its own
commit (`c3e4889f4`) via a broad `git add`. Nothing was lost — the change is in HEAD, my
comment text verbatim — but the hazard Rule 67 R6 warns about fired, just in the opposite
direction from the usual one. Worth knowing that lane files are unwritten in this worktree.

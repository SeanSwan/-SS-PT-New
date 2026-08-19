# TASTE CURATION — NEXT-SLICE HANDOFF — reviewed by Kimi K3

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs\ai-workflow\AI-HANDOFF\SWAN-TASTE-NEXT-SLICE-HANDOFF-2026-08-19.md
**Seed:** (none)
**Tokens:** 3710 in / 21818 out · **Cost:** ~$0.3384 · **Wall:** 372.9s · **finish_reason:** stop

---

# HOSTILE REVIEW — TASTE CURATION NEXT-SLICE HANDOFF (2026-08-19)

**Verdict: REVISE** — 2 BLOCKERS, 5 MAJOR, 7 MINOR.

The core claim is well-grounded: the no-second-ledger ruling is quoted, the zero-consumer grep is shown, the `kill_rank` trap is real and well-argued, and criteria 1 and 3 have genuine tests. But the slice cannot be executed as written, and the doc commits softened versions of the exact sins it preaches about in §6–§7.

---

## BLOCKER 1 — §3 criterion 2: `swan-design-router` has no path, no existence check, no interface

§1's table verifies *every other artifact* with path + state. The one component the slice's centerpiece criterion depends on gets none. This is the identical defect class as the author's prior nine-defect handoff ("a path that did not exist"). Two live possibilities, both unhandled:

- It exists → cite path and entry point, as done for `scripts/forge.mjs`.
- It doesn't → "consumer stub" is actually "design and build a new architectural component," which is a different-sized slice and one whose relationship to the shipped Atelier (itself a direction-generation engine) is never defined. The next agent could spend a day building something that routes around Fable's merged work.

Fix: verify against `main`, cite the path, state what consumes the pre-brief.

## BLOCKER 2 — §3: no exit criterion closes the loop; the slice builds an artifact nothing consumes, which is the doc's own stated reason for deferring Mobbin

§2's indictment: picks "do not influence the next generation. The loop is open." Yet all four criteria pass with the loop still open:

- Criterion 2's stub reads the **ledger**. Blueprint §4 — quoted in §2 as the load-bearing decision — specifies a router consuming a **profile artifact**. The final wiring (router ← `taste.profile.json`) appears in **no** criterion and no deferred-slice note.
- §3 defers Mobbin because "you would be filling a ledger nothing consumes." Criterion 3 then builds `taste.profile.json`, which **nothing consumes** under this slice as specified. The doc's own deferral logic indicts its criterion 3.
- The "Order matters: 1 → 2 → 3" rationale — "distiller written against a known-good sink" — is false as specified: the stub reads the ledger, not the profile, so the distiller is still written against a guess at its consumer. The doc invokes "the consumer determines the schema" and then doesn't apply it.

Fix: either reorder to 1 → 3 → 2 with the router consuming the profile (measurable: pre-brief content changes when a profile fixture changes), or state explicitly that loop closure is Slice 1′ and name what remains.

---

## MAJOR 1 — §2/§3: the `kill_rank` quarantine is placed in the wrong component

§2 calls placeholder kill-ranks "**the most dangerous thing in this document**… indistinguishable from real data once read programmatically" — then criterion 1 specifies a reader that passes rows through raw, parking the guard in criterion 3's distiller only. The reader is the choke point where `reason_code` is still available to discriminate; the criterion-2 stub and every future consumer otherwise re-implement the guard or forget it. Criterion 1's test never exercises it. Fix: `readTasteLedger()` strips/annotates `kill_rank` when `reason_code == 'unknown'`, with the placeholder fixture tested at reader level. (A dumb-transport reader is a defensible design — but not in a doc that just declared the raw form actively dangerous.)

## MAJOR 2 — §3 criterion 4: modifies ruling-governed artifacts with the rulings quoted secondhand, and "flagged" has no channel

- §1 cites the binding constraint "in the writer's own header." There is no evidence the author read `SWAN-ATELIER-STUDIO-R2-RULINGS-2026-08-18.md` — the doc preaches re-grounding against `main` (§7) and then cites the ruling of record via a header excerpt. Criterion 4 tells the agent to modify the Atelier's capture path (SKILL.md and/or `log-atelier-session.mjs` — another agent's freshly merged, reviewed work) with **no instruction to read the full rulings first**. If any unquoted ruling governs capture friction or freezes writer behavior, criterion 4 collides and gets reverted.
- "Flagged, not silently defaulted" — flagged *where*? Under the doc's own constraints (no schema change, no second log), a **durable** flag is impossible: explicit-skip vs. never-asked cannot be recorded in the row, so the distinction dies on stderr — precisely the ambiguity that makes §2's data uninterpretable today. The doc never notices its constraints foreclose its criterion's ideal form.
- The "Studio asks for a reason" half lives in skill prose and is untestable; only the writer half is.

## MAJOR 3 — §2 "second gap": over-read of n=1 [attack (e)]

The interpretation starts well — quoting `b81ec65e8`, narrowing to "Sean was asked for a winner and gave a winner" — then overreaches: "*Sean's original ask failing in production*" and "*the loop asked for one field and the instrument wants five*" assert a **mechanism the log cannot show**. The log records what was logged, not what was asked. Three hypotheses — flow never asked; asked and Sean declined (in which case criterion 4's target behavior already happened); operator convenience — are indistinguishable from the data, and the SKILL.md capture flow that would discriminate is never quoted. Compounding it: §1's table says "2 real rows" while §2 says "the only genuinely-resolved session" — the second row is never characterized (pending? smoke test?). If it's smoke, the entire empirical basis is one session, and the doc that elsewhere demands "measure it, do not trust that figure" never states its n. Criterion 4 survives independently on Sean's quoted ask and the design-dialogue doctrine — but the diagnosis should be labeled hypothesis.

## MAJOR 4 — motivated reasoning [attack (f)]: the router is exempted from the scrutiny applied to everything else the blueprint proposed

§5 demotes Mobbin and ReviewDeck to open questions *because the Atelier changed the landscape*. Blueprint §4's router — the author's own centerpiece — is declared "still hold[ing]" with no re-examination, and §2 frames the Atelier as the blueprint's idea shipped first ("the same mechanism the taste-curation blueprint proposed — and it shipped first"). The most obvious consumer is never mentioned anywhere: **the Atelier itself** — the schema already carries `axes_to_flip` and `lever_deltas`, i.e., the writer anticipates feeding verdicts into the next divergence. "Should the profile feed the Atelier's generation directly?" belongs in §5. Note also criterion 2 contradicts §4-as-quoted (router consumes *profile*, not ledger): the author cites their own §4 as authority while selectively not following it.

## MAJOR 5 — §3 criterion 3 + §4 [attack (d)]: no destination for `taste.profile.json`

§4 warns `.ai-workflow/` is gitignored and the primary checkout is ~2000 commits behind; criterion 3 then names a file with no path, no commit-vs-generated decision, no `profileVersion` semantics. Written to the wrong tree, the slice's output is invisible to every other agent — the exact day-loss mode this repo runs on. One line fixes it (e.g., committed at `docs/ai-workflow/design-brain/taste.profile.json`).

---

## MINOR

1. **§3 "Order matters: 1 → 2 → 3"** omits criterion 4 entirely — the review prompt had to infer its placement. State it (recommend: 4 first — smallest, independent, stops new `unknown`s, and a cleanly separable PR against the R2 rulings rather than bundled with the read side).
2. **§3 criterion 1 fallback**: "if validation isn't exported, hand-roll" tolerates the two-parser drift it forbids. Instruct extracting the writer's validator into a shared module both import (a writer change — same R2 review as criterion 4).
3. **§2 "no profile artifact exists anywhere"** rests on `git ls-files`, which cannot see gitignored `.ai-workflow/` — the doc verified `ab-blind.html` in the primary's tree today (§5.3) but didn't check for a tree-local profile before declaring none exists. Check or scope the claim.
4. **§1 "Reader doctrine, already decided"** — decided by whom, recorded where? Ruling or inference from the commit's "one re-log corrects them"? Criterion 1 implements it as law.
5. **§3 criterion 2 feasibility**: "≥3 real brief_id/variant ids" against 2 rows means citing winner+kills from one session — a plumbing demo carrying ~zero taste signal, trivially gameable by hard-coding (no `Test:` clause; criteria 1, 3, 4 all have one). Say so and add a fixture-swap test.
6. **§3 criterion 3 escape hatch**: "add a provenance flag… default to inferred" is a schema change in a future tense, unflagged as requiring amendment of the R2 rulings the doc calls binding.
7. **No aftermath instruction**: after the reader/distiller ship, the 7 prose hits in the doc's own grep (AGENTS.md, CLAUDE.md, SKILL.md, handoff index) still point at prose, not code. The author's own §6 lesson — "sweep repo-wide with `git grep`" — applies to their slice too.

---

## Attack-vector map

- **(a) Sequencing**: BLOCKER 2 (rationale mismatch, loop never closed), MAJOR 1 (quarantine misplaced), MINOR 1 (criterion 4 unsequenced). Reader-first is right; the rest is not load-bearing as written.
- **(b) Falsifiability**: criteria 1 and 3 pass hostile scrutiny. Criterion 2 has no test and is gameable; criterion 4's "flagged" is channel-less and its asks-half untestable.
- **(c) Collision**: no instructed ruling violation (the no-second-ledger/schema-change discipline is genuine — credit). Risks: MAJOR 2 (unread rulings + modifying the Atelier), MAJOR 4 (router may route around the Atelier), MINOR 2/3.
- **(d) Unknowns**: router existence/path/interface; profile destination; second row's identity; full R2 rulings; writer's CLI surface; SKILL.md's current capture flow; in-flight lane claims for this exact work.
- **(e) Over-read**: yes — MAJOR 3. Careful start, unsourced mechanism, unstated n=1.
- **(f) Motivated reasoning**: MAJOR 4 — §4 self-cited as settled while §5 Slices 1–2 get re-litigated; priority framing; rulings quoted secondhand while §7 preaches re-grounding.

## What holds

The central reconciliation (don't build a second ledger; the gap is the read side) is correctly evidenced. The `kill_rank`/`unknown` trap analysis is the best thing in the document. Criteria 1 and 3's tests are genuinely falsifiable. §5's open questions 1–2 are honest demotions of the author's own plan.

Fix the two blockers and the router-exemption, and this ships.

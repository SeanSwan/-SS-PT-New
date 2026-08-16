# THE FOUR OWED REVIEWS — SYNTHESIS AND LOCKED PLAN

- **Date:** 2026-08-16 · **Author:** Claude Opus 5 (vs-claude)
- **Branch:** `claude/design-brain-repave-20260816` @ `6798ae029` — nothing merged, nothing deploy-linked
- **Status:** all four reviews complete. **Fable verdict: LOCK-WITH-CHANGES.**
- **Packet reviewed:** `GLM-REPAVE-FIXPLAN-PACKET.md` (v1; corrected post-review, corrections marked inline)

| Reviewer | Output | Cost | Verdict |
|---|---|---|---|
| **GLM-5.3** (Z.ai, flat-rate) | `GLM-53-REPAVE-FIXPLAN-REVIEW.md` | $0 marginal | 10 findings, 4 of them new |
| **Fable 5** (Final Decider) | `FABLE-REPAVE-FIXPLAN-RULING.md` | $0.4267 | **LOCK-WITH-CHANGES** |
| **Kimi K3** | `KIMI-REPAVE-FIXPLAN-REVIEW.md` | $0.3000 | 16 findings — most per dollar |
| **HY3** | `HY3-REPAVE-FIXPLAN-REVIEW.md` | $0.0029 | 5 findings, all convergent |

**Total paid spend: $0.73.** The $1.65 Fable estimate was a worst-case ceiling; actual was $0.43.

---

## 1. THE HEADLINE: THE PACKET ITSELF CARRIED A FALSE CLAIM

**Fable F-1 (CRITICAL), confirmed by my own verification.**

The packet said reconciling the two token scales *"changes button and card geometry on every
surface in the app."* **False.** The evidence disproving it sat three lines below, in the same
section: the scales appear in **7 documents and 0 lines of code**. Nothing shipped reads either
scale. Reconciling them is a **doc-only change with zero visual regression.**

I inherited that sentence from the prior handoff and repeated it *while pasting the grep that
refutes it*. Verified independently afterward: zero `swan/spacing` / `swan/z-scale` /
`swan/two-speed` references anywhere in `frontend/` or `backend/`.

**Why this matters more than the error itself:** the false claim was *load-bearing in the
direction of inaction*. A worker-bot told "this is an app-wide migration" defers a one-commit fix
forever. That is precisely how the schism survived long enough to be found.

**How the four reviewers handled it — the sharpest calibration signal of the round:**

| Reviewer | Response to the false claim |
|---|---|
| **Fable** | Called it **FALSE outright, rated CRITICAL**, and told me to strike the sentence. |
| **Kimi K3** | **Also caught it** (F13) — "over-claimed against its own verification." Rated LOW, with the sharper reading: the real risk is *future convention drift*, not a shipped build, and CRITICAL attaches only once code embodies a scale. |
| **GLM-5.3** | Did not call it false, but **refused to accept it** — flagged the blast radius as unmeasured and prescribed a value-census grep as P0 before acting. |
| **HY3** | **Repeated it as fact** and rated it HIGH. Reviewed the document rather than the world. |

Three of four resisted it in some form. Only HY3 propagated it.

---

## 2. WHAT THE REVIEWS FOUND IN MY OWN VERIFICATION — AND WHAT I THEN PROVED

**GLM R7 — I under-verified the gate, and my excuse was wrong.** v1 claimed a positive control per
class but omitted D3 and D6, justified as "needs corpus-shape setup, not a one-line append."
I tested it. **Both are one-line injectable. Both fired.** All six classes now carry executed
proof — 6/6, not 4/6, with the corpus restored to CLEAN after each.

**GLM Table-2 row 2 + Fable F-3 — the same catch, independently.** My scanner resolved only refs
*to brain files*, so non-brain→non-brain rot **could not have been found even while my positive
control passed.** The control proved I could see one citation form into one target set; I then
declared a negative across all forms. That is this session's own §4.1 failure — *proof scoped to
the inputs you had in mind* — committed inside the document that documents it.

**GLM R9 — I recreated the divergence class while guarding against it.** I copied the gate's
`refsIn()`/`sectionsOf()` verbatim into a second file and called the copying a virtue. A verbatim
copy is a fork with a good intention. It should import from the gate, or assert a byte-diff.

**Kimi F14 — I classified 111 findings by sampling, not by checking the set.** I called the
handoff-record refs "expected and harmless" after inspecting a few examples. I never
set-subtracted the 111 against the known defect list, so any residue in there is still unexamined.
The same shape as the others: a conclusion about a **set**, drawn from a **sample** that fit it.

---

## 3. NEW EVIDENCE — THE "IS IT HAPPENING ELSEWHERE" ANSWER

Each scan ran its own positive control first; each would have exited without reporting if blind.

| Surface | Result | Confidence |
|---|---|---|
| Constitutions (`CLAUDE.md`, `AGENTS.md`) | **2 dead** — both the known `cinematic-pages.md §18` | `[VERIFIED]` |
| Skills (`.claude/`, `.agents/`) | 0 dead | `[VERIFIED]` for the `§N` form |
| Reference docs | 0 dead | `[VERIFIED]` for the `§N` form |
| `scripts/` | 0 real (1 false positive: the gate's own explanatory comment) | `[VERIFIED]` |
| AI-HANDOFF records | ~111 at the time of scan — review docs *quoting* defects as test vectors. **Do not treat this number as stable: it counts review activity, not rot, and it grew while this very review round was written** (see the packet's §5.1 self-perturbation note). | not rot — but **not "harmless" either**: it is self-inflating and needs a quarantine marker |
| **`frontend/src` + `backend`** | **8,451 files · 11 in-code citations · 0 dead** | `[VERIFIED]`, snapshot only |
| Prose/title refs ("the Two-speed law") | **UNMEASURED — no instrument exists** | `[UNKNOWN]` |
| The 6 externally-cited files' `§N` | **UNVALIDATED — the gate checks existence, never sections** | `[UNKNOWN]` |

**The most useful new fact:** doctrine citations *do* live in code, right beside the components
they govern (`design.md §8` in `ProgressPulsePanel.styles.ts`, `§9`/`§10` in dashboard styles).
Fable was right that this is the surface where a dead pointer directly steers a build. **Today all
11 resolve. Nothing gates them** — so this is a snapshot, not a guarantee. The next canon renumber
breaks them silently.

**And a third citation grammar exists that every check is blind to:** `design.md section 10` uses
the word "section", not `§`. The gate's grammar requires `§`. One instance found in code;
unmeasured inside the brain. I found it only by re-reading output I had already called clean.

---

## 4. FABLE'S RULINGS ON YOUR FIVE DECISIONS

Fable is Final Decider; these are rulings, not options. Each is git-reversible.

| # | Decision | Ruling |
|---|---|---|
| 1 | **Token schism** | **Canon wins outright.** `design.md §9` is sole authority; `typography-grid.md §5` becomes a one-line pointer. **Zero code migration** — the crisis was fictional. No "satellite documents the exception": two canons *is* the defect class. |
| 2 | **`design.html`** | **Retire — attic it.** Maintaining it = a second source of truth; regenerating it requires first building the fictional mechanism from #3. Atticking makes any surviving consumer a D6 defect the gate now catches — the retirement self-audits. |
| 3 | **`pnpm canon:build` fiction** | **Delete the claim.** Do not build it: the repo doesn't use pnpm, and #2 just retired the artifact it would generate. A fictional mechanism's cheapest fix is truth, not construction. |
| 4 | **Rule 40 `§18`** | **Fix now** via the guarded constitution path. "Governed separately" is a process, not an excuse — these are the only 2 real dead refs in live doctrine, in the files every agent loads first. |
| 5 | **`adapters/knowledge.md`** | **Retire — attic it.** Its whole Policy column routes to the attic; its header routes to two hollowed directories. Bonus: this empties the D6 baseline to zero, killing the hardcoded allowlist that is itself rot-prone. |

**Fable also overrode the proposed next slice.** The §6 enforcement-claim sweep *fails its own
acceptance criterion*, because prose claims cannot be mechanically re-checked. Instead: **mandate
an annotation convention** — every "enforced by / generated by" claim must carry a backticked
script path — and add a gate class that verifies the path exists in the repo and in
`package.json`. Mechanize the claim format, and checking becomes trivial. That is a gate; the
sweep as proposed was an audit in a gate's costume.

**Two new gate classes were ruled in, not just suggested:**
- **D7 — citation-form category error.** A numeric `§N` aimed at a lettered / T-prefixed /
  unnumbered file fails. This makes the `anti-patterns.md §27` class impossible **without
  renumbering a single heading.** Fable explicitly rejected mass heading normalization: renumbering
  canon is the original sin, and doing it corpus-wide would recreate the incident at 28-file scale.
  **Fix the resolver, not the corpus.**
- **D8 — enforcement-claim verification** (above).

---

## 5. THE LOCKED SEQUENCE

Fable reordered this deliberately: **truth deletions and the schism first**, because they are the
only items a worker-bot can build the wrong thing from *today*, and all are one-commit reversible.

1. **S1 — Truth commits** (one day, all reversible): constitution `§18` fix ∥ delete the
   `pnpm canon:build` claim ∥ attic `design.html` ∥ attic `adapters/knowledge.md` + empty the D6 baseline.
2. **S2 — Kill the schism:** `typography-grid.md §5` defers to `design.md §9`; wire the scale values
   into `check-token-discipline.mjs` in **report-only**, promote to FAIL after a clean week.
3. **S3 — Harden the gate:** D3/D6 injections *(already done — §5.4(i))*, a MixedCase fixture, a
   multi-defect aggregation test, then external-file section parsing.
4. **S4 — D7 dialect manifest + category-error class.** The root-cause fix; lands *before* the sweep.
5. **S5 — D8 enforcement-claim annotations** + one-time conversion sweep.
6. **S6 — Extend the scanner** to `.github/`, hooks, skill frontmatter; handoff quarantine markers.
   *(`frontend/src` + `backend` already scanned — §5.4(ii) — but ungated; wiring the gate is the work.)*
7. **S7 — Prose-alias table, report-only.**

**Pre-build conditions Fable set before the plan is fully LOCKED:** strike the false §3.1 claim
✅ *(done)*; D3+D6 injections ✅ *(done)*; MixedCase fixture + aggregation test ⬜; reword §5.2
✅ *(done)*; add a 44px-floor independence note to canon §9 ⬜; file the Rule 40 edit ⬜.

**Fable's single highest risk:** the token schism — the only item that ships wrong *pixels* rather
than wrong doctrine. The moment any agent builds UI while both scales are live, it forks the app's
geometry on a coin-flip of which document it loaded, and **both choices are "evidence-backed."**

---

## 6. EXTERNAL-MODEL CALIBRATION

| Model | Findings real | Notable |
|---|---|---|
| **Fable 5** | Highest value. Sole catcher of the CRITICAL false claim — and it caught it by noticing the packet contradicted its own evidence, not by external checking. Overrode the sequencing with a defensible reason. Cheap ($0.43 vs $1.65 estimated). | Ignored the tables-first instruction, asserting final-authority format. Acceptable from the Decider; would be a defect from a reviewer. |
| **GLM-5.3** | 3 of its new findings verified real (R7 confirmed by execution; R9 and Table-2-row-2 confirmed by inspection). Correctly declined to manufacture findings and named what was already right. | **One mechanism misread:** described the D6 baseline as attic basenames when it is a list of exempt *citing files*. The pattern holds from the earlier calibration — **trust its observations, verify its mechanisms.** Not truncated at 64k (22.4k used); raising the cap from 32k fixed the prior truncation. |
| **Kimi K3** | **Strongest per-dollar of the four** ($0.30, 16 findings). Independently caught the false claim (F13) with a sharper reading than Fable's — the risk is future convention drift, not a shipped build. Also caught two things nobody else did: I classified the 111 handoff refs "harmless" by **sampling examples, not set-subtracting the set** (F14), and the gate's self-check guards its header but not the hook string (F16). Flagged F15 explicitly as an unverifiable hypothesis rather than asserting it. | **Required a full remit override.** Its built-in remit is visual design — unoverridden it would have reviewed a markdown corpus for "CTA hierarchy" and "spacing rhythm." The wrapper's default remit is not always the remit you need. |
| **HY3** | Convergent, fastest, and nearly free ($0.003); correctly flagged the reverse-direction gap. | **Repeated the packet's false claim as fact** and rated it HIGH. Weakest signal of the four: it reviewed the document rather than the world. Useful as a cheap convergence check, not as a truth check. |

---

## 7. WHAT IS AND IS NOT DONE

**Done and proven this session:** four reviews run; gate independently re-verified with a
positive control per class (**6/6**, up from the handoff's 4/6, after GLM proved my excuse wrong);
`frontend`/`backend` scanned clean with its own control; the packet's two false claims corrected
in place and marked.

**Not done:** every item in the S1–S7 sequence. **No fix from the reviews has been implemented.**
Nothing is merged; nothing is deploy-linked.

**Still yours to decide:** Fable ruled on all five, but they are your calls — the rulings are
recommendations with authority, not commits. S1 is four one-line-ish reversible edits and would
close the highest-visibility rot in the estate.

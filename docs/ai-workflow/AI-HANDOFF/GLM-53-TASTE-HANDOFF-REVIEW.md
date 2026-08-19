# TASTE CURATION — NEXT-SLICE HANDOFF — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-TASTE-NEXT-SLICE-HANDOFF-2026-08-19.md
**Tokens:** 3292 in / 17263 out (reasoning: 14863) | total 20555
**Wall:** 261.0s

---

# VERDICT: REVISE

The core thesis survives attack: the no-second-ledger ruling, the writer-with-zero-consumers finding, and the read-side-first redirection are all sound and well-evidenced. But this document fails **its own rules** — Rule 73 and the §6 sweep rule — and the slice it prescribes contains one ordering error with permanently-burned data consequences, one artifact that recreates the exact anti-pattern the doc denounces, and one exit criterion that is unfalsifiable as written. One blocker, ten majors. Do not hand this to the next agent as-is.

---

## (a) Sequencing of Slice 0′ — wrong in two places

**M1 — Reason capture is the only *time-critical* item and it's unordered.** §3 says "Order matters: 1 → 2 → 3" — criterion 4 has no position. But the ledger is append-only and criterion 4 itself invokes Rule 34: *"historical `unknown` rows **stay** `unknown`."* That means every day reason capture is deferred, more permanently-unrecoverable `unknown` rows are banked — the very data the reader, consumer, and distiller all depend on. Criterion 4 is also independent (it touches the capture path, not the read side). It should be step 0 or a parallel track started first, not an unplaced afterthought. A next agent reading "order matters: 1 → 2 → 3" will do it last.

**M2 — `taste.profile.json` ships with zero consumers, which is the doc's own disqualifying condition.** Criterion 2's stub reads **raw ledger ids**, not the profile. Nothing in the slice consumes `distil()`'s output. Yet §3 kills the Mobbin harvest precisely because it would be "filling a ledger **nothing consumes**." The principle is applied to the reference-curation half (not the author's design) and waived for the distiller (the author's blueprint §4 machinery). Either the router stub must consume the profile (which reorders 2↔3), or the distiller defers. The stated rationale — "the consumer determines the schema" — is also inapt: the schema is *frozen by ruling*; there is nothing for a consumer to determine.

**M10 — Criterion 1's test reads the live append-only file.** "The 2 real rows + a synthetic pending/resolved pair → correct winner set." The ledger is shared and append-only in a many-agent repo; the next Atelier session appends row 3 and this test goes red for an unrelated agent. Snapshot the real rows into a fixture.

## (b) Exit criteria — one ambiguous-to-unsatisfiable, one unfalsifiable

**M3 — Criterion 2 is ambiguous and possibly unmeetable on current data.** "≥3 real `brief_id`/variant ids": per §2 there is exactly **one** genuinely-resolved session, i.e., at most 2 `brief_id`s in the file. The brief_id reading is unsatisfiable until a third session exists. It's also gameable: pasting three id strings into a pre-brief satisfies the letter with zero semantic consumption. Fix: say *variant ids*; add a mutation test (alter a ledger row → pre-brief output changes).

**M4 — Criterion 4 is unfalsifiable as specified.** The capture path is almost certainly SKILL.md prose plus the writer CLI; "a kill with no reason supplied is **flagged**" — flagged by what, observable where? Worse, the schema cannot distinguish *explicit skip* from *omission* (both produce `unknown`), so "falls back to `unknown` only on an explicit skip" is unimplementable post-hoc. It is implementable **in the writer** (e.g., `unknown` requires an explicit `--skip-reason`-style flag; rows unchanged; schema untouched). The doc must name the mechanism or a lazy implementation edits one sentence of SKILL.md and claims compliance.

## (c) Collision with the shipped Atelier

**M5 — Criterion 4 edits another agent's reviewed, merged artifact without checking the rulings.** The doc cites exactly one ruling (E1/E2/E6, no-second-log) and forbids schema change on that basis — then commands modifying the Atelier's capture flow (SKILL.md and/or `log-atelier-session.mjs`) without reporting whether the R2 rulings say *anything* about capture-flow modification, and without routing through the Atelier's owner or lane. Under the doc's own premise that these rulings are binding, this is an unchecked collision.

**B1 — BLOCKER: the superseded instruction is left live at its sources.** The blueprint's §5 still says "create `TasteVerdictRow`"; the 08-14 handoff still carries the stale Slice 0; the frontmatter says `supersedes: none`. This doc's protection extends only to agents who read *this* document. §6 states the rule explicitly — "Fixing a claim in one place is not fixing it — sweep repo-wide with `git grep`" — and §7 describes the duplicate-ledger collision as day-scale. The fix is cheap: annotate blueprint §5 and the 08-14 Slice 0 section with a superseded-by pointer, set partial-supersedes metadata, grep for `TasteVerdictRow`. That the author narrates the lesson in §7 while not applying it one section earlier is the most damning fact in this review.

## (d) What the next agent still doesn't know

- **Where `swan-design-router` lives, its state, its invocation, and the pre-brief's output format.** Named with no path, no state — the exact defect class (nonexistent path) from the author's nine-defect history.
- **Where `taste.profile.json` lives.** §4 says `.ai-workflow/` is gitignored and tree-local; if the profile lands there it is invisible to every other tree and the loop is *still open*. A tracked path must be specified.
- **What `log-atelier-session.mjs` actually exports.** Criterion 1's "if it already exports usable validation" is a conditional the author could have resolved with one read of a file on `main`, and "not usable" is a judgment call that licenses a hand-rolled second parser.
- **File placement** for reader/distiller/tests (which package, which runner) — unspecified, collision-prone.
- **The full R2 rulings** beyond E1/E2/E6, and whether "last-line-wins" is written anywhere authoritative (see M6) or must be inferred from writer code.
- **The two rows verbatim.** Only row 2 is partially quoted; provenance of row 1 (pending? smoke?) is never characterized.

## (e) The "unknown ×3" finding — over-read

**M7.** n = 1 resolved session out of 2 rows, and the doc never establishes *provenance*: was this a Sean session, or Fable 5's own shakedown run (the `cost_usd`/`wall_s` fields would hint)? "Real rows" ≠ "Sean's judgments." The evidence supports the *mechanism* claim — the capture path permits silent `unknown` — which alone justifies criterion 4. It does not support "Sean's original ask **failing in production**," nor "three questions coming back" (which additionally assumes killed directions recur). Downgrade the framing; verify who ran the session before citing it as Sean's failure.

## (f) Motivated reasoning

**M8/M9 — the author protects the blueprint.** Three tells: (1) "§4 decisions still hold" is asserted, never re-derived against the shipped Atelier, whose row carries `lever_deltas`, `axes_to_flip`, skeletons — taste channels §4 never considered; "still hold" is the same unverified-staleness sin this doc accuses the 08-14 handoff of. (2) The distiller survives in-slice with no consumer while Mobbin dies for exactly that (M2). (3) §7 congratulates the author for grepping before writing — while B1 shows the discovery was not *swept*, and M11 shows §4/§5/§6 state bare numbers ("16 modules, 13+3," "9/9," "~2000 commits," "40 lane files / 13 stale," "ab-blind verified present") with zero command output, violating the doc's own Rule 73 ("no completion claim without current-session command output… in the same message"). A verification claim is a completion claim.

---

## Ranked register

| # | Rank | Defect | Fix |
|---|---|---|---|
| B1 | **BLOCKER** | Stale Slice 0 instructions left live at source; `supersedes: none` | Annotate blueprint §5 + 08-14 doc; repo-wide grep; partial-supersedes |
| M1 | MAJOR | Reason capture unordered despite irreversible data loss per day | Make it step 0 / parallel-first |
| M2 | MAJOR | Profile ships consumer-less; Mobbin killed for the same reason | Stub consumes profile, or defer distiller; add confidence floor (n=1 must self-mark low-confidence) |
| M3 | MAJOR | Criterion 2 ambiguous, possibly unsatisfiable, gameable | "Variant ids"; mutation test |
| M4 | MAJOR | Criterion 4 unfalsifiable; skip-vs-omission indistinguishable in schema | Writer-side enforcement flag; observable signal |
| M5 | MAJOR | Edits shipped Atelier without checking full rulings / owner lane | Read all rulings first; route change |
| M6 | MAJOR | "Last-line-wins" doctrine uncited (§1) | Cite writer header/ruling line or label inference |
| M7 | MAJOR | "unknown ×3" over-read from n=1, provenance unknown | Downgrade to mechanism-gap; verify session authorship |
| M8 | MAJOR | "§4 still hold" un-re-verified against Atelier | Re-derive or mark provisional |
| M9 | MAJOR | Rule 73 violated by own bare verification numbers | Show output or cut numbers |
| M10 | MAJOR | Criterion 1 test depends on live mutable ledger | Fixture-snapshot |
| m1–m5 | MINOR | §2 grep excludes any file importing the writer (`grep -v` substring) and matches only literal path strings; pending-only briefs silently vanish from reader; no one-line preemption of "is the profile a second ledger?"; rows not shown verbatim; `profileVersion` bump rules unspecified | Hedge/tighten; state edge case; one sentence each |

**Approve when:** B1 fixed and M1–M5 resolved in the text (they change what the next agent *builds*). M6–M10 are doc edits executable in the same pass. This is a REVISE, not a REJECT — the thesis is right, the greps are shown, and it is measurably more honest than its predecessor — but it is one un-swept stale instruction away from causing the exact collision it was written to prevent.

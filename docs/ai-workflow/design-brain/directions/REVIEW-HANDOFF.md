# REVIEW-HANDOFF.md — hostile review requested

- **Raised:** 2026-09-23 · **By:** Sable (WorkBuddy AI) · **Status:** OPEN — awaiting review
- **Reviewers requested:** **Astra** (primary) and **OpenAI GPT-5.5** (second leg)
- **Subject:** the Direction Registry — `docs/ai-workflow/design-brain/directions/` and the validator/selector that gate it
- **Why this file exists:** so that an agent reading the commit history finds the intent without having to reconstruct it from the diff. A verdict that lives only in a transcript gets re-derived by the next agent, and a stale "clean" gets read as current.

---

## 1. Sean's instruction, verbatim

> "Can you go ahead and actually fix that? And then make sure to leave a note in the specs so that we can make it so that any other agent that looks at GitHub for the commits, they're gonna see that you want Astra to go ahead and [hostile] review that as well as, or OpenAI 5.5 [hostile] review that to go ahead and fix that and make it more like Claude design. We're trying to just really make the Swan design brain super smart, versatile. If I tell it to build something, it's not gonna build the same damn thing every single time with the same damn look. That's very important."

*(He said "Hosta review" — read as **hostile review**, consistent with the standing practice. Recorded here so the reading is visible rather than assumed.)*

Two asks, and they are separable:

1. **Fix the convergence structurally** — done, and it is what the reviewer should attack.
2. **Push it toward "Claude design"** — a quality direction, not a spec. See §6.

## 1b. Routing and authority — read before reviewing

Two standing rulings intersect here, and a reviewer should not mistake one for the other:

| Ruling | Source | What it governs |
|---|---|---|
| **Kimi K3 is the formal design authority + final decider** for the design/aesthetic workstream | `DESIGN-DIRECTION-BROADCAST-2026-07-18.md` §1.1 (Sean override, 2026-07-18) | **What the design should be** — authorship and the final aesthetic call |
| **Astra / Fable adjudicate repairs**; the commit decision is owned upstream | `ENGINE-HANDOFF-two-data-loss-paths-2026-09-22.md`; `review-queue.md:375` | **Whether the work is correct**, and whether it lands |

So this handoff asks Astra (and GPT-5.5 as a second leg) for a **hostile correctness review**: attack the gate, the schema, the exceptions, the selection logic, the measurement. It is **not** a request to overrule Kimi's authorship of the design language.

If a reviewer's finding is *aesthetic* rather than *correctness*, its correct destination is Kimi under the standing ruling — and **§6's "more like Claude design" question is exactly that kind of finding.** Flagging it here rather than resolving it, because the two rulings are two months apart and I am not the authority that settles which one wins.

**Flagged, not resolved:** the 2026-07-18 ruling predates the Sept review structure. If Kimi's authority has since been superseded, this section is stale and should be **corrected in place rather than inherited** — a routing note that is quietly wrong sends the review to the wrong seat.

## 2. The diagnosis this rests on

The Design Brain had **modes** but no **directions**. A mode answers *where may this appear*; nothing answered *what does it look like*, because there was only one answer (`design.md` §4).

The convergence was therefore **structural, not a matter of taste**. `website-archetypes.md` instructed the Fable brief: *"Palette stays Crystalline Swan."* The ideation gate had to emit a **valid Swan** direction, so it had exactly one legal output.

The sharper version of the finding, discovered mid-build: **thirteen runtime themes already existed** in `references/THEME-CHANGER-COMPAT.md` — including `cyberpunk-edgerunners` and a light theme — but the Design Brain had no idea they existed. The variety was not missing. It was **unselectable**: switchable by a human, selectable by no agent. That is the defect this work addresses.

`cinematic-pages.md` §18 already mandated a breadth pass, but over **concepts** only — twelve different worlds, all rendered in midnight sapphire. The registry is the same rule applied to **visual language**.

## 3. What was built

| Artifact | What it is |
|---|---|
| `directions/README.md` | Doctrine: mode vs direction, the closed role contract, selection, the anti-convergence gate, breadth rules |
| `directions/direction.schema.json` | Closed contract — required seven roles, measured contrast, dual motion gate, named signature |
| `directions/registry.json` | Machine index + `known_themes`, which counts the runtime themes with no direction file |
| `directions/{crystalline-swan, crystalline-cyberforest, cyberpunk-edgerunners, codex-restraint, crystalline-light}.md` | Five directions. Payload is the fenced `json direction` block; prose is commentary |
| `scripts/design-brain/directions/validate-directions.mjs` | The gate. **Computes** contrast; never trusts a stated number |
| `scripts/design-brain/directions/select.mjs` | Selection + the anti-convergence gate |
| `scripts/design-brain/tests/directions-registry.test.mjs` | 70 tests, all passing |
| `design.md` §3.1, `README.md`, `index.md`, `anti-patterns.md`, `website-archetypes.md`, `THEME-CHANGER-COMPAT.md` | The unhooking edits |

**Measured state:** 5 directions, 45 contrast pairs computed and passing, 5 declared exceptions each verified against a recomputed value, breadth rule satisfied, 70/70 tests green, validator exit 0.

## 4. What to attack — ranked

1. **The anti-convergence gate may not actually fire in practice.** It only triggers on an *unpinned* run of 3 identical picks for one surface class. Rotation already avoids repetition, so it only catches **matching** that keeps returning the same direction. **Try to construct a realistic workflow where convergence still happens and the gate stays silent.** That is the highest-value attack available.
2. **`crystalline-light` is a proposal, not a registration.** Only its `ground` and accent come from an existing artifact; **16 of its 18 roles are derived and flagged in `derived_roles`.** If the reviewer thinks a proposal should not satisfy a hard breadth rule, that is a legitimate finding — the rule could require *canonical* rather than *selectable* directions.
3. **`crystalline-swan` has an unresolved three-way ground conflict.** `design.md` §4 says `#0A0A0F` (obsidian). `THEME-CHANGER-COMPAT.md` gives `crystalline-default` a dark BG of `#001545`. `design.md` §1 says the **default** theme is `crystalline-dark` (`#030712`) — a third value. I registered the §4 value because design.md is canonical, and flagged it. **Nobody has measured what `frontend/src/utils/theme/themeUtils.ts` actually injects.** That is the real answer and it has not been checked.
4. **The role set is borrowed, not derived.** The seven required roles come from `prompter/lib/design-bridge.mjs:40`. Verify that borrowing is sound — particularly whether `focus`/`rare` mean the same thing in a light direction as in a dark one.
5. **The two `contrast_exceptions` on button fills.** `crystalline-swan`'s `focus` on `ground` measures **1.29:1** and `crystalline-cyberforest`'s measures **1.01:1**. Both are excused on the grounds that the Dual-Button Glow carries separation. **Attack that mechanism.** If the glow does not in fact carry it, both directions have an invisible primary button.
6. **`codex-restraint`'s source mockup was changed.** I corrected `--ink-3` from `#6b7280` (4.00:1, AA failure) to `#7C8492` (5.13:1) and changed its display face off `Inter`. Verify the corrections are right and that changing a sanctioned artifact was the correct call rather than an overreach.
7. **11 of 14 runtime themes remain uncovered**, including the **default** (`crystalline-dark`). The registry reports this honestly and exits 2 under `--strict`, but it does not fail. Decide whether a backlog is acceptable or whether the gate should be harder.
8. **The validator's breadth threshold is `>= 2` selectable directions.** A single-direction registry does not trip it. Test whether that is the right call.
9. **Two bugs were found and fixed during the build** — the display-face ban over-reached into `body`, and pin validation ran after the empty-eligible return, producing a misleading error. Both have regression tests. Look for the ones I did not find.
10. **Pre-existing, not mine, but adjacent:** 14 tests in `scripts/design-brain/tests/` fail on this machine (Mobbin-engine CLI tests, child-process exit codes). I verified my changes are purely additive — three new paths, no pre-existing file touched. Somebody should look at those 14 separately; they are not a baseline anyone should accept.

## 5. Known gaps, stated plainly

- **No UI slice has been built against the registry yet.** The port test (§6 of the README) is argued from `cyberpunk-edgerunners` — a real built artifact — but **no component has actually been ported across two directions**. That is the single strongest missing piece of evidence.
- **No selection has been logged.** `LEDGER.jsonl` is empty, so the gate has never fired on real input. It is tested against synthetic ledgers only.
- **`match_terms` were written by hand and not tuned.** A term that is too broad silently collapses the registry back to one answer. The validator catches collisions between directions but cannot catch a term that is merely too general.
- **The registry is markdown-embedded JSON.** One source of truth, but it means a direction's payload is parsed out of prose. If that proves fragile, split it.
- **`cinematic-pages.md` §18 was not updated** to reference directions. It still describes its breadth pass as being over concepts alone. That is a real inconsistency.

## 6. "More like Claude design"

Recorded verbatim in §1. **I am not going to pretend this is unambiguous.** Two readings, and the reviewer should pick with Sean rather than guess:

- **(a) Anthropic's design sensibility** — typography-led, restrained palettes, generous negative space, strong hierarchy, editorial rather than decorative.
- **(b) The quality bar of Claude's design output** — whatever it produces should be at least that good.

These imply different work. Reading (a) suggests the registry needs a *typographic* axis, not just a colour one — right now every direction shares one type scale and differs only in palette and signature device, which is arguably a thin definition of "direction". Reading (b) is a bar, not a change.

**My own view, offered as a view:** (a) is the more interesting finding, because it exposes that this registry varies *colour* and not *composition*. A genuinely versatile design brain should be able to vary type, density, and grid behaviour too. If that is what Sean means, the schema needs a `typography` and `density` axis and the current five directions are all one compositional direction in five palettes. **That would be a fair hostile finding against this work.**

## 7. Evidence

- Validator: `node scripts/design-brain/directions/validate-directions.mjs` (exit 0; `--json` for machine output, `--strict` to fail on uncovered themes)
- Tests: `npm run design-brain:test` — 70 new, all passing; 137/151 overall (the 14 failures are the pre-existing ones in §4.10)
- The diagnosis in full: `directions/README.md` §1
- The theme-collection bridge: `references/THEME-CHANGER-COMPAT.md` (new final section)
- Built artifact for `cyberpunk-edgerunners`: `2026-09-23-14-13-18/nightshift/` — `public/tokens.css` is the shipped token set

## 8. Filing the review

Per the standing archive rule: file to **`Z:\HostileReviews\`** as `<YYYY-MM-DD>-<HHMMSS>-<subject-slug>.md` with the standard header (review_id, status, dates, subject, reviewer_agent, round, repo, commit, scope, verdict, defects, tags). **Look there before reviewing** so this round does not re-derive an earlier one, and leave the verdict there when done — not only in a transcript.

A verdict that lives only in a conversation is not a review.

---

## 9. Landing state

This note is committed on `creator-brains-engine-r2-20260915` (the commit message names this file, so `git log --grep=REVIEW-HANDOFF` finds it). It is **not pushed** — nine commits were already unpushed ahead of this one, and push is owned upstream in this repo.

**Two repo conventions a reader should know, because they constrain what "done" means here:**

1. **No-commit discipline.** Work in this tree is staged uncommitted pending adjudication, and the commit decision is owned upstream (`review-queue.md:375`). Landing happens as a **surgical partial commit with an explicit pathspec — never `git add -A`** (`review-queue.md:2132`). This tree carries ~925 dirty paths and the index may hold another lane's staged files; a bare `git commit` lands work that is not yours.
2. **The handoff for the engine repairs is gitignored** (`.ai-workflow/coordination/*`), so it can never be found via a commit. This file deliberately lives in the **tracked** `docs/` tree for that reason — a note meant to be found by commit history has to be in something git will carry.

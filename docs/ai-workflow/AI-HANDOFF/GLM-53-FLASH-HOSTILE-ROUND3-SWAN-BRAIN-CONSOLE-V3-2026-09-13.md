# HOSTILE REVIEW — ROUND 3 — Swan Brain Console v3 + 20-variant Three.js fleet — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-PACKET-ROUND3-SWAN-BRAIN-CONSOLE-V3-2026-09-13.md
**Tokens:** 2895 in / 18882 out (reasoning: 16219) | total 21777
**Wall:** 491.3s

---

## VERDICT: REVISE

The 20 variants and the console look sound on the packet's evidence — FIX A–J are, as far as this packet shows, correctly built and correctly measured. What is still wrong is verification honesty at the margins: the repo's most-recurred defect class has no automated guard (F1), the console still emits one unsupported claim (§4.1's relabel was authored and then not shipped), a one-line Host check has been disclosed three times and withheld three times (§4.3), a nearly-free discriminating experiment for the crash cause was not run (§4.4), and an unfalsifiable test still occupies a slot in a suite whose green totals are quoted as evidence (§4.5). The revise scope is small and enumerable. That is exactly why it should be done before "finish line" is claimed.

## FIX VERDICTS (FIX A..J)

- **FIX A: CORRECT** — Both failure mechanics are correctly diagnosed (custom properties don't inherit sideways to a sibling; a descendant selector compiled inside `styled(WorldRoot)` cannot match the styled root), and the TDZ reasoning is right. Caveat: the evidence is a single manual measurement; see F1.
- **FIX B: CORRECT** — Emitting declarations from the same table the resolver reads eliminates the drift class, and the parenthetical admission that the check failed 20/20 the day it was added is what a falsifiable check looks like.
- **FIX C: CORRECT** — Contingent on every layout actually defining the chapter-band targets the nav scrolls to (see [UNSURE]).
- **FIX D: CORRECT** — "Restored since the most recent loss" is the correct semantics for the stale-flag lie, and the fatal sequence is tested.
- **FIX E: CORRECT** — `top >= 0 → 0`, else progress across the element's own height, matches viewport physics for all three element shapes measured; the zero-height guard is present.
- **FIX F: CORRECT** — Closing the probe leak at the source plus `forceContextLoss()` at cleanup is right, and withdrawing the round-1 attribution without a control experiment is the honest direction (the missing half is §4.4).
- **FIX G: CORRECT** — First-loss poster with the canvas mounted-but-hidden is the only design under which `webglcontextrestored` can ever do anything; the stated rationale is technically sound.
- **FIX H: CORRECT** — Counting lines and points into "primitives" removed a false-negative class the builder itself discovered (6 variants); sampling while the loop runs is the right time to sample.
- **FIX I: CORRECT**
- **FIX J: CORRECT at the slug level** — but the scene taxonomy itself is still named `refract` (§1 lists `refract`×3); see F2 and §4.5.

## NEW FINDINGS (ranked by blast radius)

### F1 — The twice-recurred "silent zero" defect class has no automated guard **[MISSING WORK]**
**Blast radius:** Any refactor of styled-components interpolation order, attribute placement, or rule position silently re-breaks the rail reserve across all 18 nav models. Nothing in the four suites would notice, and — critically — this is distinct from §4.2: wiring CI tomorrow would run verifiers that cannot see this class either. The rail reserve already failed **twice, silently, by two independent mechanisms**, and both times the code looked correct to its author.

**Evidence:** The evidence block names what the suites check — tsc, contracts, colour fallbacks, context state, primitives, palette, console state. No layout or overlap assertion appears anywhere. The only overlap evidence in the packet is one manual measurement (`railLeft 84px · contentPaddingLeft 141.6px · headlineLeft 101 · overlap FALSE`) — one afternoon, apparently one variant, against a defect with 18 nav-model permutations.

**Why it is wrong:** This repo's demonstrated dominant failure mode is "silently resolves to zero/fallback while the code reads correctly" (rail ×2, palette, controls). The guard for the most-recurred class is a human with DevTools. gallery-verify already drives a real browser 24/24; asserting "no intersection between the headline box and the rail box" per variant is a marginal-cost check against a known-high-prior defect. If an overlap assertion already exists somewhere, it was not evidenced, and at a finish-line review unevidenced is indistinguishable from absent.

### F2 — FIX J renamed the slugs but the taxonomy still asserts the physics **[MISSING WORK]**
**Blast radius:** Small, but it is exactly the dishonesty class FIX J exists to kill, aimed at the next maintainer instead of the user.

**Evidence:** §1: the eight scene families are `terrain, lines, rings, orbit, points, instanced, waveform, refract` — with `refract`×3. FIX J conceded that the refract/lens family performs no transmission physics and renamed the *variant slugs* to `shell-*`, yet the family enum — the thing that groups them, and the thing most likely to appear in generated file headers, console UI, and documentation — retained the word "refract."

**Why it is wrong:** A taxonomy label is a claim. Anyone reading the family name will believe the shells refract, which is the precise false belief FIX J was written to retire. Rename the family to `shells` everywhere it can reach a human.

## ATTACK ON §4 (the four unfixed items + the standing honesty question)

**4.1 `durableWrites` from README prose — partially rationalising.** The builder *authored the correct taxonomy* (VERIFIED_BLOCKED / DECLARED_BLOCKED / UNKNOWN) and then did not ship even its zero-cost component: relabeling the current prose-derived value to `DECLARED_BLOCKED` requires no probe at all and fixes the "confident, green, wrong" scenario today. That omission is not defensible. On "no probe exists": the packet's own hypothetical — "an engine whose adapter ships unlocked while the README keeps the sentence" — requires the adapter to be a readable, shipping artifact, which means at minimum a **static probe** exists (scan the adapter source for the gate — the method allowlist, the refusal constant — and quote the matched span as evidence in `/api/state`), and if the adapter is importable, a **behavioural probe** is ~40 lines: init the engine against a temp workspace, invoke its write path, classify refusal → VERIFIED_BLOCKED, acceptance → VERIFIED_OPEN (alarm). The "console is GET-only" argument conflates what the server *serves* with what the node process *can do*; a process that serves GETs can still import a module or spawn a loopback child. Also two pointed questions: does the substring match negations? Yes — `includes('remain fail-closed')` matches "must no longer remain fail-closed." And does console-verify assert `durableWrites === 'BLOCKED'` from a prose fixture? If so, the suite pins the unsupported claim — the exact FIX E anti-pattern this repo already paid for once.

**4.2 No CI wiring — rationalising by the builder's own words.** You cannot rank an item "highest-leverage open item" and defer it through a third round without naming a blocker. Even granting "nothing is committed, no CI provider exists," the cheap 80% does not require one: a single aggregate `verify` script chaining tsc + the five suites, a pre-push hook, one line in the README stating verification is required before hand-off. The round's own history is the argument: FIX B's check failed 20/20 the day it was added, and FIX E's test had pinned its bug — both were caught only because a human re-ran things this round. Unenforced verifiers decay; in this repo that is not a forecast, it is the observed record. Every green number in §2 is perishable until something re-runs them automatically.

**4.3 No Host/Origin validation — rationalising, without qualification.** One line, disclosed three consecutive rounds, withheld three. The mitigations do not cover the named vector: DNS rebinding defeats the loopback assumption precisely because the request arrives with `Host: attacker.tld`, and same-origin policy then lets the rebound page read the response. What I would actually do, at handler entry before any read:

```js
if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(req.headers.host ?? '')) {
  res.statusCode = 403; return res.end();
}
```

There is no resource excuse for a one-liner. If the builder's real position is "this is a dev tool; the threat model excludes malicious pages in the same browser," that position should be *stated* — and then the line should be written anyway, because the line is cheaper than the argument. Disclosure-without-fix three times is risk documentation masquerading as risk management.

**4.4 No control experiment — disclosure necessary, not sufficient.** The discriminating experiment is nearly free, and that is what changes this from "honest uncertainty" to "missing work." gallery-verify already launches the fleet in a browser; run the same harness under software GL (`--use-gl=swiftshader` / `LIBGL_ALWAYS_SOFTWARE=1`) plus a 20-trivial-scene control page. The matrix — {fleet, control} × {software GL, hardware GL} — discriminates: a crash only on fleet+hardware implicates scene content; only under software implicates the renderer; no crash anywhere gives the withdrawn leak explanation *positive* support and lets the record say "cause not established; leak fixed; software GL exonerated under harness conditions." Until that run exists, swapping crashing materials for unlit shells is indistinguishable from evidence-removal, and FIX J's honest *naming* does not launder the disappeared crash. Also: preserve the original crash stack in a KNOWN_ISSUES note so a recurrence is recognizable as a recurrence.

**4.5 Standing honesty question — framing sufficient; evidence hygiene is not.** Spoken as "20 unique layouts, 18 nav models, 8 scene families," the claim to the user is honest: the sharing is disclosed in the same breath as the distinctness, and §1 states the resolution to 8 scene families without hedging. Two artifacts still overclaim. First, the fingerprint test: the builder concedes it "proves nothing" and cannot fail, yet it occupies a slot in a contract suite whose totals (13/13) are quoted as evidence. An unfalsifiable check inside a suite corrupts every number it inflates — a test that cannot fail is not a weak test, it is not a test. Delete it, or replace it with one that can fail: serialize each variant's rendered DOM structure (or scene draw signature) in the gallery harness and assert pairwise inequality — that assertion *can* fail and therefore means something. Second, the `refract` family label (F2). With those two cleaned, the framing claim passes.

## [UNSURE]

- Whether FIX A's measurement (84 / 141.6 / 101) was taken on one variant or all 20, and whether every nav model's root element carries the attribute the moved rules key on.
- Whether any suite asserts rail/content overlap at all — none is named in the evidence block; if one exists, it was not evidenced (this is F1's factual core).
- Whether console-verify pins `durableWrites === 'BLOCKED'` from a README prose fixture.
- Whether the 6 context-loss tests fire real canvas events in a browser or invoke the policy object directly.
- Whether FIX E's six measured values are suite assertions or a manual session, and whether the old pinned `p(0.85vh) == 0` assertion was pruned — note it still passes under the new code (`0.85vh ≥ 0 → return 0`), so its survival would be silent.
- Whether all 20 grids define the chapter-band targets FIX C scrolls to.
- Whether `refract`/liquid/lens wording survives in any user-facing string (console UI, page titles, generated headers) beyond the slugs FIX J renamed.
- Whether the engine adapter source is present in this repo — this decides which §4.1 probe is writable today.
- What gallery-verify's 24 checks are, relative to 20 variants (presumably 4 aggregate checks).

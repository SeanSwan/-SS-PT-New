# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-ATELIER-STUDIO-REVIEW-PACKET-2026-08-18.md
**Seed:** (none)
**Tokens:** 4361 in / 3845 out | **Cost:** ~$0.0708 | **Wall:** 138.6s | **finish_reason:** stop

---

# KIMI K3 — HOSTILE REVIEW, ROUND 2
*Assumption posture: I cannot read the repo. I accept §2/§2.1/§2.2 as `[VERIFIED]` because the packet asserts grep-verification and I have no contrary evidence — but the `design` skill's actual API surface is `[UNKNOWN]` even per §6, and I treat every claim resting on it as assumption, not fact. Everything below that touches canvas behavior is conditional on that unknown.*

---

**1. Is the old sequencing still right? What's dead weight?**

The order `B0.0 → B0 → B7 → B3 → B2 → B4 → B1 → B6 → B9 → B5` was correct for a program whose binding constraint was *capability gaps*. R1–R4 change the constraint: Sean's problem is now **throughput and recall, not capability**. A program ordered to close mechanism gaps does not serve a man who says "I can't reach what I already own."

Reordering implication: **A7 (recall fix) and B11's A1 (brief engine) jump the queue.** They are cheap, unblock everything downstream, and directly answer the only asks that are new. Specifically: B11-A7/A1 should slot **immediately after B0/B7** (the reference/creative plumbing), before B3. Whatever B9 and B5 are, sitting at the tail of a ten-stage chain that has produced **zero code in seven days** — and Sean is already asking for a different thing — means tail items are dead weight by definition until the head ships. Cut outright: anything in the old sequence whose only justification is "taste depth." The packet itself says the gap is not taste. Any stage that adds doctrine rather than mechanism is a Rule 52 violation waiting to happen.

**Assumption:** I don't know what B5/B9 contain. But the prior program shipped nothing, and Sean's new asks don't reference them. Burden of proof is now on them.

**2. Is B11-as-a-module correct?**

Structurally yes — module-on-spine is right, and the packet correctly refuses to build a second design brain. But the *position* is wrong. The packet slots B11 as if it were an elective at the end of the spine. Wrong. **B11's A2/A3/A5 (divergence → N-up canvas → capped convergence) is not a module on the T4 tournament doctrine — it IS the operationalization of T4.** T4 has been "captured doctrine" since 2026-08-11 with no executing surface. B11 gives it one. So: don't displace anything, but promote B11-A1/A2/A3 to be the *first consumer* of everything the spine produces. The spine feeds the fleet; the fleet is where doctrine stops being text.

**3. A2 — attack the diversity contract.**

The stated mechanism — `(archetype × style axis × motion budget)` seed triples + blind parallel subagents + post-hoc similarity regen — has a real flaw and the packet half-sees it. The flaw: **a seed triple constrains the recipe, not the output.** Two subagents given "C13 × brutalist × low motion" and "editorial × minimal × medium motion" will still both produce a hero-headline-subhead-CTA page, because that is the base rate of the training distribution for "website." You will get 5 variants differing in *dressing*, not *structure* — which is exactly the failure Sean is trying to escape. A similarity check on rendered output catches this only if the similarity metric measures **layout topology** (section order, spatial grammar, scroll structure), not tokens/colors/typography. The packet doesn't specify the metric. Unspecified metric = the check will measure what's easy to measure (visual/tokens) and pass near-identical layouts.

**Cheapest reliable divergence mechanism, from what actually works:** constrain the *skeleton*, not the style. Force each variant onto a **distinct structural archetype from the shipped 21** — which already encode different scroll/section grammars and motion budgets. That's a hard structural constraint the model cannot drift out of, unlike a style axis. Then let style be free. One structural seed + free dressing beats free structure + seeded dressing, every time, because models regress to structural means far harder than stylistic ones. The 21-archetype matrix is already shipped — this costs zero new infrastructure. The packet's triple already includes archetype but weights all three axes equally; **archetype should be the only mandatory axis**, style/motion should be sampled, and the similarity check should compare section-sequence signatures, not pixels.

**4. A4 merge — fantasy or not?**

Mostly fantasy as stated, salvageable in one narrow form. "Take 3's layout with 5's palette and 1's hero" decomposes into three very different operations:

- **Palette swap** — trivial IF variants are tokenized. Real merge.
- **Section transplant** ("1's hero") — works IF sections are token-manifest-addressable and self-contained. Fragile but real.
- **Layout transfer** ("3's layout") — **fantasy.** Layout is not a component; it's the emergent relationship among all sections. You cannot transplant "layout" onto foreign sections without re-solving composition, which *is* regeneration.

So the honest answer: manifest-based merge supports **token merge and section grafting**, not layout merge. The packet should say this. If Sean says "3's layout with 5's palette," the correct execution is: take variant 3, apply variant 5's token manifest — which is a regeneration *of 3* with 5's tokens, not a merge of equals. That's fine and cheap. But calling it "merge" sets an expectation the tool will violate the first time he asks for something cross-structural. Rename A4 to what it is: **token-swap + section-graft**, with re-render as the fallback for anything else.

**5. N-number: 5/7 is wrong. Argue 4/6 — or better, 3+1.**

Judging capacity, not cost, is the binding constraint — see Q7. Evidence from the packet's own law: per-generation satisfaction is 30–50% (batch-and-select). At 5 variants, expected "genuinely promising" count is ~2; at 7, ~3. **The marginal variant doesn't add a winner, it adds judging load on a serialized human.** Odd-numbers-avoid-ties is a weak argument — Sean isn't voting, he's picking, and ties are resolved by merge anyway. "7 matches Rule 40's awe tier" conflates the *breadth* count (8–12 text concepts, nearly free) with the *render* count (expensive to judge). The canvas-zoom-legibility argument is the only real one and it argues *down*, not up: 7 artboards on one canvas means none is legible without zooming, which means the side-by-side judgment — the entire point of A3 — degrades into sequential inspection, which is just Claude Design with extra steps.

**Counter-proposal: 4 default.** Four fills a 2×2 grid legibly at one zoom level; expected promising-count ~1.5–2 is sufficient when merge/graft exists (you need a winner plus donors, not five finalists). For awe surfaces: **3+1** — three seeded variants plus one wildcard with a deliberately hostile constraint (e.g., banned from the top-3 style axis), because the value of the Nth variant is coverage of the space Sean didn't imagine, not another sample of the space he did. If you must keep an awe tier, 5 maximum. 7 rendered variants is a theater of choice that taxes the one unscalable resource in the system.

**6. R4 recall — concrete mechanism.**

The 61KB file problem has a known, boring, correct shape, and the packet gestures at it ("router-level index") without committing. Concrete spec:

1. **Split, don't index.** A 61KB monolith is the bug. Explode `website-archetypes.md` into 21 files of ~2–3KB each, one per archetype, plus a **≤2KB routing table** — one line per archetype: name, trigger conditions ("construction, trades, local service, quote-request flow"), motion budget class, file path. HY3's warning was about a giant index *no agent can parse*; a 2KB routing table with one line per entry is trivially parseable. This is the difference between an index and a lookup table.
2. **Load at routing time, not task time.** The router table goes into the context of A1 (Brief Engine) *by construction* — the brief engine's job is archetype selection, so the table is always present when selection happens. Full archetype file loads only after selection: one 3KB load, one hop. Total recall cost: ~5KB instead of 61KB bulk or 0KB by omission.
3. **Negative test.** The integrity gate (`check-brain-links.mjs`, 73 tests, shipped) already exists — add a test class: *router table entry count == archetype file count*, and *every trigger phrase in a fixture list resolves to exactly one archetype*. The infrastructure for policing this is shipped; use it.

The deeper point: R4 is not a file-format problem, it's a **placement problem**. A capability is "reachable" iff the skill that needs it loads it as part of its own contract. Whatever skill owns brief-writing must have "consult routing table" as step 1 of its definition, not as a file it might remember exists.

**7. The Sean-serialized bottleneck.**

This was my #1 catch last round and N-up **makes it worse in a way the packet refuses to confront**: A5 caps convergence at 3 rounds, but each round now presents N artifacts. Sean's judging load went from 3 sequential judgments (T4) to up to 21 (7×3). The packet's only mitigation is "escalate to Sean with two finalists" — which assumes something *pre-filters* 7→2. **Nothing in A1–A6 does that filtering.** That is the hole.

A proxy rubric partially solves it, with one hard caveat. The shipped corpus (style-taxonomy PREFER/BANNED, Enchantment Ratio, motion budgets, Rule 40 criteria) is sufficient to build a **taste sieve**: a pre-judge pass that scores each variant against BANNED patterns and known Sean rejections (`design-dialogue` *already records rejected options and why* — that rejection log is the training signal, shipped and unused for this purpose). The sieve's job is not to pick winners — never trust it for that — it's to **kill the bottom half** so Sean judges 3, not 7. Sean remains judge-of-record over survivors; the sieve only executes his *already-recorded* rejections. That preserves taste authority while cutting load ~2×.

The caveat: the sieve is only as good as the rejection log's coverage. Cold-start, it will mis-kill. Mitigation: for the first N sessions, sieve operates in *shadow mode* — it ranks but doesn't cut, and Sean's actual picks calibrate it. Kill authority is earned, not assumed. If the packet doesn't specify shadow-mode calibration, the sieve ships as either a rubber stamp or a tyrant.

**8. ABSENCE-FIRST — what is missing entirely, ranked by value left on the table.**

1. **No evaluation instrument — and the packet *admits* this in §6 and then does nothing about it.** This was my prior #1 gap; it is still #1. "Is variant 3 better than variant 5?" has no measurement surface except Sean's gut, per-artifact, forever. Without an instrument, the taste sieve (Q7) can't calibrate, the N-number (Q5) can't be tuned, and the $100K bar is unfalsifiable. This is the single most expensive absence because **every other module's quality is unmeasurable without it.** Ship even a crude one: structured side-by-side comparison log (variant A vs B on named dimensions, winner + reason), stored, queryable. Sean's judgments become data instead of evaporating.
2. **No failure/rollback semantics anywhere in A1–A6.** What happens when all 5 variants are bad? (30–50% satisfaction says this is the *modal* outcome.) The plan has no "reject all, re-diverge with what we learned" loop — A5 only branches from a *winner*. Batch-and-select doctrine requires a null-winner path. Its absence means the first mediocre draft ships — the exact failure §2.2 gap #4 was created to kill.
3. **No persistence model for the canvas/variants.** Where do the 5 artboards, their manifests, Sean's picks, and the rejection reasons *live* between sessions? Voice-first autonomy (R3) across sessions requires the tournament state to be durable. Unspecified = it lives nowhere = R4's recall problem re-infected at the variant level.
4. **The §2.2 gaps are still unscheduled.** B11 rides on a spine whose four mechanism gaps — custom creative, interpolation, reference depth, pixel-convergence — remain open, and B11's creative/motion ladder (§4.2, "winner only") *presupposes* B0/B7 shipped. If those slip, B11 ships as a divergence engine over mediocre bases: 5 flavors of the same weakness. The dependency is unacknowledged in §4.
5. **No construction/trades archetype** (§6 admits it) — and R3's *own worked example* is construction. Sean's first real test drive will hit the uncovered cell. One new archetype file is ~a day of work; its absence invalidates the adaptivity demo.
6. **Cost model.** §6 admits "cents" is unmodelled. At fleet scale (N variants × subagent generation × artboard render × regen loops), cost is multiplicative, and the person paying hasn't seen a number. A one-page measured cost table is absent and cheap.

**9. Vaporware ranking (most likely to ship broken):**

1. **A2 Divergence Engine** — depends on the `[UNKNOWN]` canvas API (§6), an unspecified similarity metric, and a seeding scheme that doesn't constrain structure (Q3). Three unknowns multiplied. Highest risk by far.
2. **A4 Merge Engine** — as analyzed in Q4, ~60% of its promised surface is regeneration wearing a merge costume. Ships as a palette swapper with a grand name.
3. **A3 Judgment Surface** — entirely hostage to artboard-count limits and in-place regeneration in an API nobody has probed. If the canvas caps at 3 artboards, A3 is dead on arrival and the "we don't need MagicPath" finding evaporates.
4. **A7 Recall Fix** — low *technical* risk, high *organizational* vaporware risk: it's unglamorous, unassigned, and exactly the kind of thing that stays a bullet point while engines get built.
5. **A1 Brief Engine** — lowest risk; it's routing over shipped skills. Most likely to actually work. Note the inversion: **risk is inversely proportional to how new the capability feels.** The proposal is sexiest exactly where it is least proven.

**10. SwanStudios homepage design.**

Brief, since this is GLM's seat and I cannot see the corpus: **Direction — "The Flock as Proof."** Not a portfolio grid; a scroll-bound macro journey (C13, which Rule 40 already names as the maximalist option) where *each client site is a flown-past environment*, and the studio's range is demonstrated by traversing it rather than listing it. **ONE impossible phenomenon:** a swan that is simultaneously the logo, the cursor-companion, and the transition mechanism between environments — one continuous entity, never cut, never reloaded. **Signature moment:** `Swans.mp4` — KEPT, per standing ruling — upgraded per §2.2: frame-interpolated to kill the 30fps scrub judder, deployed not as a hero background (the cliché) but as the *threshold*: the full-bleed, scrub-controlled passage between the monochrome argument (first half) and the full-color proof (second half). The footage is the door, not the wallpaper. **Motion grammar:** interpolated scroll-scrub for the swan transitions only; everything else near-static — typography carrying authority (per the taxonomy's PREFER tier), because a studio that sells restraint must exhibit it. Maximalism concentrated at the threshold, silence on either side.

---

## SINGLE HIGHEST-VALUE CATCH

**The plan has no null-winner path, and it re-serializes Sean without a calibrated sieve.** Combined: the modal tournament outcome (all variants mediocre, per the packet's own 30–50% law) routes to either "ship the least-bad" or "Sean judges another 7" — the two failure modes the entire program exists to eliminate. Fix ordering: (1) reject-all/re-diverge loop in A5, (2) shadow-mode taste sieve built on the already-shipped `design-dialogue` rejection log, (3) evaluation log so any of this is measurable. All three ride on shipped infrastructure. None requires the `[UNKNOWN]` canvas API.

## CUT ENTIRELY

**A4 Merge Engine, as specified.** Keep the token-swap path (it's free — it falls out of manifests), delete "merge" as a promise. It is the module most likely to ship broken (Q9 #2), its honest core is a rename away, and its fantasy surface (layout transplant) will burn exactly the credibility with Sean that R4 says is already damaged. Ship "graft + re-tokenize"; never say "merge."

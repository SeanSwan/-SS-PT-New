# Consult reply — Kimi K3 (moonshotai/kimi-k3) — 2026-08-12T03:20:18.767Z

> tokens: prompt=3070 completion=2119 | finish_reason: stop | max_tokens: 60000

# Review: Autonomous QA Harness Architecture

## 1. VERDICT

**SHIP-WITH-CHANGES** — §4.3 is the only part that matters for the owner's actual pain, and the plan buries it under infrastructure. Reorder the build and ship it.

---

## 2. What §4 still misses after all 5 parts ship

**Bug class: cross-entity state corruption and staleness.** The entire architecture is page-shaped and single-session-shaped. The product's core loop is *temporal*: trainer logs workout → client's chart must recompute → milestone becomes shareable → feed renders. §4.3 scripts this as one happy-path journey, but the harness has no concept of:

- **Stale cache/optimistic-UI bugs** — chart renders pre-write data after a save; nothing revisits a previously visited route and asserts its content *changed*. The visited-set keyed by `(route, DOM-signature)` actively *discourages* revisiting the same route — it's a dedup mechanism, not a re-verification mechanism.
- **Role-crossing propagation bugs** — trainer writes, client reads. Every lane is single-role, single-session. The highest-value defect in a personal-training SaaS (trainer sees it, client doesn't) requires **two concurrent authenticated sessions and an assertion across them**. §4 has no multi-session primitive at all.
- **Time/ordering bugs** — "log a second workout, does the chart aggregate correctly." Scripted journeys are single-iteration.

**Second blind class: visual and layout regression.** Console errors and 404s are the only finding types. A page that renders with a broken chart, overlapping modal, or clipped CTA is fully green in this architecture. For a "Crystalline Swan" premium brand, your most user-visible defect class has zero coverage.

---

## 3. Where the decomposition is the wrong shape

**§4.2 + §4.5 are two parts of one thing, and §4.2 is mostly over-engineering for a React SPA.**

A React SPA is not the open web. "BFS with off-path link following discovering routes" buys you almost nothing that §4.1 doesn't already give you — every reachable route is *in the router source*. The crawler's off-path following exists to catch "route reachable in UI but absent from manifest," but §4.1's drift gate already fails CI for routes absent from the manifest. You've built a runtime mechanism to detect a build-time detectable condition, at 10x the cost and flakiness.

**The right shape:** manifest-authoritative **route enumeration** (not crawling) + **per-page interaction exploration**. Route discovery is a solved problem at build time; the genuinely hard problem is interaction depth *within* a page — tabs, accordions, wizard steps, conditionally rendered panels. Spend the crawler budget there, not on link-following.

**Also wrong: depth as the control.** Depth 3 from the root is a proxy for what you actually want, which is *coverage of distinct interactive states*. A page with one flat button grid exhausts at depth 1; a wizard needs depth 8. See §6.1.

---

## 4. Attacking the exhaustiveness claim (§4.5)

"Cannot stop until the entire site is visited" is **measurable only against the manifest**, and the manifest is enumerable but the *state space* is not. Silent under-reporting paths that still render green:

1. **`blocked-by-design` is an unbounded escape hatch.** Every route that requires seeded data, an open modal, or a feature flag gets stamped `blocked-by-design` and the summary prints `85/85`. This is §2.7's silent-skip bug with a fancier label. Terminal statuses need to be **excluded from the denominator, not counted as visited**, and `blocked-by-design` above a threshold (say >10%) fails the run.

2. **DOM-signature keying under-counts coverage.** Two genuinely different application states (chart with data vs. empty-state; wizard step 2 vs. step 1) can produce near-identical DOM signatures after React re-renders normalize, so the visited-set marks state B "already seen" and never exercises it. Conversely async data thrash creates infinite *false* novelty (see §6.2). Either way the visited-set lies: either it converges early (under-reporting) or never (timeout → partial → and here's the kicker — your "resume" makes a perpetually-thrashing crawl look like healthy incremental progress across runs).

3. **"Visited" ≠ "exercised."** A route where the crawl budget was consumed by a cookie banner is `visited`. Unless `TRUNCATED` findings are **build-failing by default** rather than informational, truncation becomes the new suppression list — §2.3 reborn with honest bookkeeping.

4. **Persistence across runs decays silently.** A frontier serialized last month against manifest v12, resumed against manifest v14, has a visited-set full of stale DOM signatures. If you don't version the persisted state against a manifest hash and invalidate on mismatch, "resume" resurrects garbage and reports it as progress.

The claim should be restated honestly: **"every manifest route reaches a terminal status, terminal statuses are audited, and truncation/blocking above threshold fails the build."** That's defensible. "Entire site visited" is not.

---

## 5. Ranked build order — only 2 parts this month

**1. §4.3 — write-enabled staging lane with scripted core-loop journeys.** Non-negotiable first. §2.6 is the finding: the four flows the owner wants proven are at 0% and have always been. Every other part improves the breadth of coverage that *isn't the coverage anyone asked for*. A mediocre version of §4.3 (four hard-coded journeys, real DB assertions, seeded personas) delivers more defect-detection value than all of §4.1+§4.2+§4.5 combined. Ship this even if nothing else ships.

**2. §4.4 — structured findings + ranked worklist + expiring suppressions.** Cheapest part, highest leverage on the *organizational* failure: §2.8's pressure toward suppression is a process bug, and §4.4 is the only part that fixes incentives rather than machinery. It also immediately upgrades the *existing* 85-route crawl's output from "one giant toEqual diff" to a worklist — value this week, before the new crawler exists.

**Explicitly deferred:** §4.1 and §4.2 (the current route table is stale but *known*; hand-sync it once for $20 of effort), and §4.5 (persistence is premature until you have a crawler whose state is worth persisting).

---

## 6. Open questions

1. **Termination condition:** neither fixed depth nor unbounded-with-budget. Terminate a page when a full interaction pass yields **zero new unique interactive elements and zero new DOM states** — i.e., fixpoint detection, not depth counting. Budget (per-page wall-clock or interaction count) is the *safety valve*, and hitting it emits a build-failing `TRUNCATED`. Depth is an implementation detail of the search strategy, not a coverage policy.

2. **DOM signatures will thrash.** React async data, timestamps, avatars, random keys — a naive structural hash never converges. Key on **(route, set of interactive-element selectors/roles)** — the accessibility-tree-derived action inventory — not raw DOM. It's stable under data changes, sensitive to state changes that actually matter (new buttons appeared = new state), and doubles as your fixpoint-detection input from Q1. Strip volatile attributes (ids, timestamps, `aria-live` content) before hashing.

3. **Manifest authoritative, with one carve-out.** Fail on undiscovered routes — otherwise you've re-created §2.1 with extra steps, and "advisory" manifests rot exactly like hand-typed lists do. The carve-out: the crawler still *reports* UI-reachable-but-unmanifested routes as findings (that catches nav pointing at dead/unrouted paths, which the drift gate can't see). Failure-mode asymmetry is clear: advisory rots silently; authoritative fails loudly. Loud is what you want.

4. **Yes, §4.3 partially reinvents §2.1 one level up** — scripted journeys cover only what someone wrote, and you'll be having this same meeting in a year about journeys. But the alternative (write-enabled flow-inferring crawler) is a research project with a 405-interceptor's worth of hazard against real writes. The honest mitigation: **require every new feature PR that touches a core-loop surface to ship a journey or extend one, enforced the same way as the manifest drift gate.** Coverage-by-process for writes, coverage-by-generation for reads. Accept the reinvention; fence it.

5. **Cheapest honest §4.5:** skip frontier persistence entirely. Print `visited/total` with per-status breakdown, hard-fail on missing auth (one-line fix, do it today), hard-fail above a `blocked-by-design`/`TRUNCATED` threshold, and key the run against a manifest hash. That's ~a day of work and makes the claim honest. Resume-from-disk is a wall-clock optimization — don't build it until the sweep actually exceeds your time budget, because it imports every staleness bug in §4 of this review.

---

**One more thing, plainly:** the plan's center of gravity is wrong. It spends 4 of 5 parts making the read-only crawl rigorous when the owner's sentence — "it goes, then it stops, and there's always more work" — is a complaint about *trust*, and trust is restored by proving the core loop works (§4.3) and by reporting that doesn't lie (§4.4). The crawl machinery is real, but it's the supporting cast.

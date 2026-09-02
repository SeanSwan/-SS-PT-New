# AFTERTASTE — Beyond Zombies Master Blueprint — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/AFTERTASTE-BEYOND-ZOMBIES-MASTER-BLUEPRINT-2026-09-02.md
**Tokens:** 6022 in / 3726 out (reasoning: 0) | total 9748
**Wall:** 65.3s

---

# HOSTILE REVIEW — AFTERTASTE "Beyond Zombies" Master Blueprint

Reviewed against the stated bar: hostile, both document and owner's brief. I read the whole thing. The feel layer being green means nothing here — this blueprint is ~80% unbuilt, and a lot of it is drawn at a fidelity that hides how much is actually in each "slice."

---

## A. The Owner's Brief (Sean, playtest 4) — attacking the prompt

**1. [HIGH] "We already have all this decided" + "Make it better than CoD Zombies" is a contradiction Sean should be forced to resolve, not absorb.** You cannot have decisions locked AND an undefined quality bar against a 15-year-tuned genre king. "Better than CoD Zombies" with no axis of comparison is a mood, not a spec. The blueprint then invents five "pillars" to answer a demand that was never actually specified — classic agent behavior: converting vibes into fake rigor. **Fix:** one sentence back to Sean: "better = X by playtest 6" (e.g., "a 15-minute run where I chose doors twice and regretted one"). Everything else in the brief is fine and shippable.

**2. [MED] "The flies, the kissing bugs, the roaches… the zombies as people" is a request for ~10 enemy types, implicitly.** Sean is listing a cast. The blueprint quietly reorganizes this into "7 now, the rest post-blueprint" — correct, but Sean hasn't agreed to the reduction. If S7 lands with 4 creatures and Sean's mental list had 10, the playtest reads as failure. **Fix:** show Sean the two-lane table at the next touchpoint before S7 is built.

**3. [LOW] "Real guns first… then add our own creative guns later" is fine, but the brief contains no bosses design, just "we're gonna need bosses."** S10's rot-maître-d′ predates this brief and is being grandfathered in as if requested. Fine, but flag it — the boss is the biggest slice in the plan and the owner hasn't seen it.

---

## B. R3F / browser reality

**4. [CRITICAL] No performance budget anywhere for the mob counts this design implies.** Round-based survival with window metering means 20–40 concurrent actors minimum by round 10, each with: multi-part meshes (dismemberment requires separate hit shapes), per-frame gait math, window queue checks, damage routing through `awardPoints`. The blueprint asserts "gaits are data driving position/tilt in Enemies.jsx" — that reads like per-mob `useFrame` state churn and per-frame React state writes, which will frame-drop at 30 mobs in a browser, GC-stutter at 60. Nothing here mentions instancing, pooling, or keeping mob simulation OUT of React state. The existing 150 tests tested a flat plane with a handful of ring-spawned blocks. **Fix:** a hard spec: "N=40 concurrent mobs at 60fps on mid-tier laptop; mob transforms live in typed arrays/refs, never in Zustand; corpses and gibs are pooled and recycled; one `useFrame` owns the director." Add a perf browser test at the S4 gate that spawns 40 mobs and asserts frame time. If that test doesn't exist, the game doesn't scale, full stop.

**5. [HIGH] Gores/slicks/power-up pickups are unmanaged scene accumulation.** Death gibs, grease slicks (6s), power-up drops (30s), "floor sparkles clean" VFX — every one is a spawned object with a timer. Without an explicit pool/decal-budget system, a 10-minute run leaks thousands of short-lived meshes (dispose() churn → GC spikes). The blueprint pretends this is free. **Fix:** one `TransientFxPool` with hard caps (max N gibs, N decals), named in a slice — it is NOT free, it's a slice.

**6. [HIGH] Hitscan × 8 pellets × 750 RPM SMG × severed parts = O(rays × colliders) every trigger.** "The existing entry-ordered hitscan handles this with a loop, no new collision code" is the most dangerous sentence in the document. Entry-ordered lists per what — the whole scene? A shotgun blast against 25 mobs × 6 parts each is 8 rays × 150 shapes with distance-sorted reads. It'll work at round 3 and die at round 12. **Fix:** spatial partition (room-based broadphase is genuinely fine here — mobs are in rooms, use the room AABB) before S5 ships the shotgun.

---

## C. Secret slices — the "zero-decision slice order" is lying

**7. [CRITICAL] S4 "The Dining Hall" is at least three slices.** It contains: (a) room/wall collision replacing the infinite plane + camera/gameplay migration, (b) the window barricade system (panels, tear cadence, repair, repair cap, one-at-a-time climb slot), (c) the window-queue spawn director replacing `waves.js` ring spawning, (d) round state machine (§7) with intermission/budget. Each of those is a "the game changes shape" slice by this document's own standard. Solo dev reality: this is the slice where the project stalls for a month. **Fix:** split into S4a walls+rooms, S4b window metering + new director, S4c round machine. The ★ stays at the end of c.

**8. [HIGH] S6 "Doors + Kitchen + Loading Dock + LMG + AR rename" is two slices wearing a trenchcoat** — map-graph/spawn-set-extension is a director change; two new weapons + their tuning is separate. Also "grease-slick floor hazard" is smuggled in as a map footnote when it's a new locomotion system (slide physics) that S7's grease-fly ALSO depends on. **Fix:** hazard physics gets its own slice; hazards and the fly share it.

**9. [HIGH] S7 "THE CAST, lane 1+2" is the whole game's content in one line.** 7 creature recipes + 7 gaits + dismemberment-contract verification + re-sculpts of 4 existing. Each recipe is a Blender-pipeline debugging session the first time. "Days, not weeks" for 11 sculpted, parted, bone-bound creatures as a solo dev with a recipe pipeline that has produced exactly ONE parted model? No. **Fix:** S7 ships Regular + roach + kissing bug. Fly/slick moves to the hazard slice. Husk/bulwark stay in S9. Recipes land incrementally behind playtests, not as a monolith.

**10. [MED] S10 boss = boss AI + boss round integration + trademark search + arena map, minimum two slices.** And the trademark "search" is scheduled *inside* the slice that needs its output — the dependency runs backwards.

---

## D. Economy / window / director contradictions

**11. [HIGH] The sever bonus and the repair cap fight each other, and the blueprint's own flagship rule contradicts its tuning goal.** §3: "severing a cheap mob's parts before the kill out-earns center-mass spam." §3 also: cap repair at 50/round because farming. But sever-farming is the SAME exploit one window over: park at a window, sever all limbs off each one-by-one climber (pillar 5 guarantees a metered, unthreatening stream), pocket 4×25 + kill. The repair cap closes the farm CoD had; this design opens a bigger one via its own signature mechanic, and by round 8 with Double Bite it's degenerate. **Fix:** sever bonus per-mob cap, or sever bonuses decay within a round, or (best) parts must be severed within X seconds of the killing blow to pay. Test the relationship *sever-capped mob income ≤ headshot income*.

**12. [HIGH] Window metering × spawn-budget director = starvation deadlock, unaddressed.** "Each active window admits at most 1 climbing mob; director assigns to least-crowded window." With panel-tear beats (5 panels × beat time), throughput per window is ~1 mob per many seconds. Start room: 2 windows. Early rounds will crawl — round 5's budget through 2 windows at 1-at-a-time climb cadence could take 3+ minutes of waiting. Conversely, opening doors "adds pressure" but the director has no described throttle back when budget is nearly spent and windows are clogged — RoundClear requires "budget spent AND no mob holdsWave," so the round END is gated on the slowest window's queue drain. Worst case: last queued spawn waits behind a full climb cycle alone, 20 seconds of nothing. **Fix:** define window throughput as the actual round-duration dial (tear-beat time = f(round)); allow parallel climb slots (1 climbing + N tearing); make RoundClear trigger on budget-spent-with-grace-timer.

**13. [MED] "Wave-5 player affords door OR SMG, not both" is arithmetically unverifiable from the document.** Budget → kills → points depends on mob mix, sever farming (see #11), and the repair cap. The doc says tests assert relationships only — fine — but the *design gate* (the one decision that makes the economy an economy) has no formula. **Fix:** one spreadsheet formula in the doc: expected points per round R = Σ(budget×mix×avg-payout), and the affordability gate checked against it at every ★.

**14. [MED] Deep Clean "pays half points each" on all alive mobs can exceed a full round's honest income on a stacked round-8 horde** — a boss-round adjacent jackpot that out-earns the greed loop it's supposed to feed. Cap it or make it pay a flat bounty.

---

## E. Missing systems the blueprint pretends are free

**15. [CRITICAL] Mob pathfinding is entirely absent.** Rooms have walls, cover (the counter), doorways, and interior geometry. The current mobs presumably beeline. With walls "REAL now," mobs will hug walls, get stuck on the counter, and pile in corners — the blueprint specifies window ENTRY in detail and interior navigation not at all. "The enemies differ by VERB" requires the verbs to have a navigation substrate. **Fix:** at minimum a room-local flow field / waypoint graph per room, generated from `rooms.js` data. This is a real slice (belongs with S4b) and it is nowhere.

**16. [HIGH] Player-vs-mob and mob-vs-mob collision/separation.** 30 mobs + player in a kitchen with walls needs separation forces or the "flood" reads as one merged blob clipping through itself. Unspecified. Also: how do mobs damage the player? Melee cadence, range, multi-attacker rules — the entire player-death side of the loop is undescribed. HP exists (HUD hearts) but no damage model in the doc.

**17. [HIGH] Window-queue starvation of the director itself:** if all active windows are blocked (all climb slots full and panels intact), where do queued spawns wait? A queue with no cap grows unbounded → the array churn from #4 gets worse. Define queue cap + overflow (delay spawn, don't accumulate).

**18. [MED] Barricade repair while a mob is climbing through that window** — undefined interaction. Repair-blocks-entry? Mob-in-window blocks repair? This is the player's core defensive verb; it needs a rule and a test.

**19. [MED] The "endless yard" fallback mode requires the OLD ring-spawn director to stay alive alongside the NEW window director.** §7's own law says "never two counters." Two directors IS two counters. Pick one: either the yard mode dies or the window director subsumes it.

---

## F. IP / trade dress

**20. [HIGH] Structure cloning is more aggressive than the "hard law" admits.** The doc copies, point-for-point: 5-panel barricades, repair-for-points with per-round cap, points per hit/sever/kill/repair with CoD's exact relative pricing shape, two-gun carry with swap-on-buy, half-price ammo refill, door-gated map graph, round intermission shop beat, and the five power-up effects mapped 1:1 to Insta-Kill/Double Points/Nuke/Max Ammo/Carpenter (the table literally lists the analogs). Trade dress and uncopyrightable-structure defenses weaken as the *whole system* mirrors one product, especially with "one currency earned per hit" — a recognizable CoD Zombies signature combination. Names separation helps but isn't the whole test. **Fix:** (a) break at least two structural signatures — I'd change points-per-hit (CoD's most-imitated tell) to something sever-economy-native (e.g., no per-body-hit points at all; hits only pay via parts — that would also FIX #11), and make one power-up effect non-analog (e.g., Double Bite also doubles mob aggression); (b) get an actual legal read before S8, not a trademark search on one boss.

**21. [MED] "Real gun classes and behaviors with original silhouettes" — fine, but the recoil-pattern grammar claim ("real-gun-grammar recoil patterns per weapon") plus real calibers plus role naming invites lookalike trade dress if art drifts toward recognizable receivers.** Keep the law, add it as a pre-art checklist item, not prose.

---

## G. The five pillars — the weak one

**22. [HIGH] Pillar 3, "Contamination vs. cleansing / maps that heal," is marketing, not mechanics.** What is the MECHANIC? Per the doc: boards are "crystalline light panels" (a texture swap), cleared rooms "dissolve into light" (a VFX), the floor "sparkles clean" (a VFX). Nothing in the systems section changes gameplay based on cleanse state — no cleansed-room buff, no contamination pressure mechanic, nothing the player DECIDES differently. Pillars 1, 2, 4, 5 each name a system (award table, roster verbs, weapon data, window metering). Pillar 3 names a shader. **Fix:** either cut it to two sentences of fiction, or give it teeth: cleansed rooms cost mobs more panels to breach / grant repair-speed bonus / a "cleansed room re-contaminates if a window stays broken" tug-of-war state. That last one is one system and would genuinely be something CoD can't follow.

---

## H. Test-map gaps — green suite, broken game

**23. [HIGH] No frame-time/perf assertion anywhere** (see #4). The suite can be 100% green and the game unplayable at round 9. Highest-value missing test in the document.

**24. [HIGH] No test for the actual failure mode of round-based games: the player dying.** Nothing tests melee damage taken, multi-mob attack cadence, death → restart → state fully reset (points, doors, weapons, windows, director). Restart-after-death leaking state is the single most common shipped bug in this genre, and the test map's "Dead → [*]" line has zero coverage.

**25. [MED] "Roach flood count" and "kissing-bug lunge distance" are presence assertions, not behavior assertions.** A green test proves the roach exists, not that flooding threatens a windowed player. Missing: time-to-breach tests, player-trapped-in-corner tests, window-throughput timing tests (would have caught #12).

**26. [MED] No economy-simulation test.** A headless "simulated player" running 8 rounds of auto-play asserting points-in-range would catch #11/#13 automatically. The tests assert static relationships; the economy is dynamic.

**27. [LOW] No test that opening a door mid-round correctly extends the spawn set without resetting the current round's budget/window queues** — the exact kind of state-machine seam the current suite style would miss because each system is tested alone.

---

## VERDICT: **REVISE**

The skeleton (points → doors → windows → cast) is right and the slice impulse is right. But the slice list is dishonest about S4/S6/S7's size, there is no perf plan at all, mob navigation doesn't exist in the document, and the flagship economy rule (sever bonus) self-destructs against window metering.

**Three changes that most improve the plan:**

1. **Performance and navigation become first-class slices with gate tests.** S4 splits into walls / window-director-with-mob-pathfinding / round-machine; a 40-mob 60fps browser test gates the whole room system. Mob transforms out of React state, pooled everything.
2. **Rebuild the earn table around sever-native income** (no per-body-hit points, per-mob sever caps). This simultaneously fixes the window-farm exploit (#11), differentiates the economy from CoD structurally (#20), and actually delivers Pillar 1 instead of decorating it.
3. **Define window throughput as a tuned parameter with a RoundClear grace timer and queue cap** — write the round-duration formula into §7 so starvation (#12/#17) is a number you can test, not a surprise at playtest 5.

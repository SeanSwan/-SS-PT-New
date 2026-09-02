# AFTERTASTE — Beyond Zombies Master Blueprint — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/AFTERTASTE-BEYOND-ZOMBIES-MASTER-BLUEPRINT-2026-09-02.md
**Tokens:** 5996 in / 3544 out (reasoning: 31) | total 9540
**Wall:** 116.7s

---

# HOSTILE REVIEW — AFTERTASTE Master Blueprint (SWA-211)

## LANE 1: PLAYER-FACING HOLES

**1. CRITICAL — First 60 seconds are undefined.** The blueprint ships S3 (sidearm, two-gun carry, semi-auto) *before* S4 (rooms). A new player spawns in a void with a 12-round pistol, no reload tutorial beat, no movement teaching, and an "8s grace" timer (§7) that starts before they've learned R exists. Where's the funnel? "Endless yard mode becomes tutorial" is a one-line hand-wave with zero design. **Fix:** S4/S5 must include a scripted first-round teach (prompt on first dry-click: "R — reload"; first window breach: "Hold E — repair"). Also: 8s grace is insultingly short for round 1 with 60 reserve ammo and no door money — the player is punished for the game's own pace.

**2. HIGH — The round-clear "10s to spend points" (§7) actively fights the player.** CoD's intermission has no timer pressure because the shop is ambient — you buy mid-round at wall-buys. A hard 10s countdown forces panic spending or punishes players for reading the map. And what happens at 0s — does the round start with a wall-buy mid-animation? **Fix:** intermission timer is soft (round starts early on a keypress, or timer only starts after the player leaves a buy zone). The "explicit bonus display" is fine; the countdown is CoD-derived in the worst way.

**3. HIGH — HUD can't express the state machine's worst states.** §8 shows `18/96` and `R to reload`, but nothing for: reloading progress bar (is it 0.2s or 2s left?), swap animation, ADS-in-progress, or *which* window "NE breached" means in a 3-room map with 6 windows. "[!] window NE breached" is compass-speak with no compass. Streamers will mock a player spinning around trying to find which of six windows is "NE." **Fix:** world-space breach markers (edge-of-screen arrows + window highlight), reload radial or bar under the crosshair, room name in HUD ("DINING HALL · 2/2 windows held").

**4. MED — Controls that fight: sprint cancels reload, ADS forces off during reload/swap, Q swaps.** §4 says reload is "cancellable by sprint" — so a player reloading under pressure who sprints *loses the reload* with no feedback guarantee. Combine with `E` doing triple duty (repair / buy door / buy gun / refill) and you have the classic zombie-game catastrophe: running to a window to repair while sprint-canceling a reload, pressing E near a wall-buy and buying an SMG you didn't want instead of fixing the panel. **Fix:** context priority stack for E (repair > wall-buy when panel target in range), sprint-cancel gives a distinct sound + HUD flash, and buy prompts require a 0.3s hold or confirmation when panels are torn within 3m.

**5. MED — Grease-fly slick + slide has no recovery rules.** "Sprint across it and you slide" — slide *where*? Into a wall? Off a window you were defending? During a boss fight? Is the player slide-immune for N seconds after first slip (prevent perpetual butter-floor)? Unspecified = jank. **Fix:** define slip as one directional impulse, 2s immunity, no slip while ADS/standing.

## LANE 2: WINDOW / BARRICADE EDGE CASES

**6. CRITICAL — The climb is a state machine the blueprint never specifies.** §7 says "each window admits at most 1 climbing mob at a time" and panels are torn "one per beat" — but: What is the mob's state *during* the climb? Can it be shot? Does severing a limb mid-climb knock it back through the window or does a legless torso teleport in? If the player kills it mid-climb, does the next queued mob start instantly (double-tear rate) or wait? If a Board-Up fires mid-climb, does the mob get *ejected* or does it phase through a rebuilt panel? None of this is in the test table — "mob climbs only after 5 panels" is a joke of a test for the single most stateful interaction in the game. **Fix:** explicit climb state (`approach → tearing → climbing → inside`) with defined hits, dismemberment, and Board-Up interactions; test each transition.

**7. HIGH — Repair during climb is undefined and is THE moment it matters.** Player holds E while a mob is mid-climb: does repair rebuild the panel the mob is already through (it should be blocked), repair other panels (fine), or — worst — eject the mob (feels like a spell, not carpentry)? CoD solved this with hard rules; the blueprint has none. **Fix:** panels can't repair while a mob occupies the window slot; "window contested" prompt state.

**8. HIGH — "All panels torn on all windows at once" is a total blackout with no readability.** 6 windows × 5 panels, 30 tear-beats of pressure, one HUD line "[!] window NE breached." A solo player physically cannot defend two rooms. This is fine as *fail pressure* but the blueprint treats the repair cap ("50/round" = 5 repairs total per round, across ALL windows) as anti-farm — meaning round 8+ the player literally cannot keep up, and every window breaches every round. That's not a difficulty curve, that's a wall. **Fix:** cap should scale per active window (50/window), and breach warnings must queue/stack visibly, not overwrite.

**9. MED — Roach "floods in 3s through torn windows" breaks the one-by-one metering that is pillar 5.** If roaches ignore the climb cadence (§7: 1 at a time per window), the window system is defeated by the second creature on the cast list. If they *don't*, the "flood" is twelve roaches politely queueing. **Fix:** roaches get a fast climb (0.3s/panel?) instead of bypassing the queue — flood comes from budget, not queue rules.

## LANE 3: ECONOMY EXPLOITS

**10. CRITICAL — Repair farming survives the cap.** Cap is 50 points/round (§3). But: does the cap track *points* or *panels*? If a mob tears panel 1, player repairs (+10), mob tears again, player repairs (+10)... a single zombie at one window is a points faucet up to the cap, and with S6's 3 rooms, cap accounting per-window vs per-run is undefined. Worse: repair +10 and hit +10 means *letting a mob tear and farming repairs* pays the same as shooting it, with zero ammo cost and zero risk if you stand off-angle. **Fix:** repair pays 10 *only for panels torn by mobs not currently engaged by the player in the same round* is overcomplicated — simpler: repair +10, cap counts panels, and tearing mobs take a small "harassment" damage pulse, so ignoring them has a cost.

**11. HIGH — Sever farming vs. pizza-husk (S9).** Pizza-husk requires parts shot off "before body damage lands." A sever pays +25 each. If severed parts can regrow, re-sever, or if the husk has many parts, the optimal play is to strip a husk's limbs, let it live, strip again — sever farming a tank. If parts don't regrow, there's a finite farm, fine — but the blueprint doesn't say which. Also with Sugar Rush ("min 1 damage"), pizza-husk's entire armor verb is voided: does 1-hit-kill pierce armor? **Fix:** declare part caps per mob, no regrowth, and Sugar Rush does NOT bypass armor (or does — but say so).

**12. HIGH — Door-camping and the greed loop are untested.** Opening a door "adds windows to the active spawn set" — so the optimal cheese is: open Kitchen door for the SMG... wait, SMG is in room A. Fine: buy shotgun in Loading Dock (1200), *never open any door*, and hold 2 windows in the start room forever. Two windows, one shotgun, capped repairs — is the budget function tuned for the 2-window baseline at round 15? A "self-balancing greed loop" only balances if pressure scales with doors *held closed* too. **Fix:** budget `f(round, activeWindows)` — round 15 on 2 windows must be lethal.

**13. MED — Deep Clean pays "half points each" — during a boss round (S10) that's a boss-skip button.** Boss has a big HP pool; Deep Clean says "every mob currently ALIVE dissolves." If the boss counts as a mob, a randomly-dropped nuke deletes the boss round the player spent 2500 points reaching. If the boss *doesn't* count, the Deep Clean trigger from a roach kill clears the boss's adds and the fight is trivial anyway. **Fix:** bosses are Deep Clean-immune (lose X% HP instead), stated explicitly in S10.

## LANE 4: THE CAST TABLE — SAME VERB, TWO NAMES

**14. HIGH — Several "distinct verbs" collapse under inspection:**
- **Crumb-roach (dies to 1 hit, weak alone) vs. The Regular (baseline body)** — both are "slow/straight horde HP." The roach's only distinction is count, which is a *budget* property, not a verb.
- **Grease-fly slick vs. Kitchen grease-slick floor hazard (§2.1)** — the map has a hazard AND a creature whose verb is the same hazard. One of these is redundant; worse, the room hazard teaches nothing about the fly. Pick one.
- **Kissing-bug fever pulse vs. grease-fly slick** — both are "apply a movement/vision debuff on contact." A 3s screen dim and a 6s slide zone are the same design sentence: `onTouch → applyDebuff`.
- **Rind-bulwark (shelters mobs behind it) vs. pizza-husk (armored front)** — both are "shoot the weak point first." Bulwark shelters *others*, husk armor is *self* — that's the only real difference, and the blueprint doesn't say how bulwark's shelter reads on screen. A shield-wall whose protection is invisible is a damage sponge with extra steps. **Fix:** give bulwark a visible shelter cone and delete the room grease hazard (or the fly's slick).

**15. MED — Gaits are data on the roster, but hit shapes aren't tied to gaits.** A "LOW and WIDE" roach skittering with direction jitter — do its hitboxes track the jitter, or does the player hit the visual gap? Dismemberment on a jittering skitter means part-hit tests flake. Feels like S7's hidden 50%. **Fix:** jitter amplitude bounded by hitbox width, tested.

## LANE 5: POWER-UP INTERACTIONS THAT BREAK

**16. HIGH — Sugar Rush × shotgun.** "All guns kill in 1 hit less (min 1)" × 8 pellets = every pellet one-shot-kills any non-armored mob. A pump shot deletes 8 mobs. Fine for a 20s power fantasy — except it also means *sever* income explodes (8 severs per trigger → Double Bite stacking → points ×2 on ×8 severs). Do power-up drops *from those kills* extend the chain? Blueprint says "guaranteed-timer fallback" but says nothing about drop-rate during power-ups — a Sugar Rush that drops a Sugar Rush is a run-warper nobody tuned. **Fix:** explicit stacking rules table (Sugar+Double = multiplicative — the mermaid implies it) and a per-power-up drop-suppression rule.

**17. MED — Full Pantry + Board-Up are the only two "instant" defensive drops in a solo game with no teammates — and their HUD is undefined.** Instant effects need a big center flash + audio; the §8 HUD only describes *timed* stacks. Also: Board-Up during contested windows (see #7) — restored panels on a window with a mob climbing is the same undefined interaction.

**18. LOW — Power-up drop ownership.** Drops "spawn from kills" — in a room with 40 roaches, does the floor fill with drops? Global-timer per power-up type? Max simultaneous drops on floor? Unspecified = playtest 5 will be drop confetti.

## LANE 6: WHAT THE BLUEPRINT DROPPED OR DISTORTED FROM SEAN'S PROMPT

**19. HIGH — "Better than CoD Zombies" has no answer beyond re-skinned CoD structure.** Sean asked for better. The five pillars are: points (CoD's), doors (CoD's), wall-buys (CoD's), rounds (CoD's), power-ups (CoD's, renamed). The two genuine deltas — dismemberment-as-economy and cleanse-the-map — are real, but the blueprint spends 80% of its ink faithfully copying the thing Sean is bored of and calls the copy "the best horde loop ever designed, we keep it." The owner said "I'm completely bored"; the blueprint's answer is the loop he described, plus one bonus number on severs. **Fix:** elevate pillar 1 and 3 to *mechanics*, not bonuses — e.g., cleansed rooms release Regulars who then FIGHT for you (08-25 canon says they're victims being saved — the blueprint dissolves them into light and throws away its best "better than CoD" idea).

**20. MED — Sean's "we already have all this decided" vs. the blueprint's decisions.** Sean asked for "flies, kissing bugs, roaches, zombies as people" — delivered, in S7/S9, but buried under S1–S6 of systems Sean never asked about (two-gun carry limits, ammo reserve, repair caps). The blueprint even acknowledges the tension ("S7 promoted above S4?") then defaults to *no*. The owner's #1 emotional ask is checkpoint #11.1, not the build order itself. **Fix:** S7 should be S2. Period.

**21. MED — "9-millimeters" — the owner's exact words — get one starting pistol, and SMG/AR/LMG dominate.** The prompt names 9mm first among classes; the roster gives it the starter-shame role. Defensible design, but it silently overrode the brief without flagging it at a taste checkpoint. **Fix:** one line in §11 acknowledging the deviation.

**22. LOW — "Real guns first, creative later" — the blueprint's §4 defines "later" as "new ROWS, not new systems," which contradicts Sean's power-up/boss/better-than-CoD ambition.** Creative guns as stat rows is exactly the boredom Sean is complaining about. Not dropped — deferred into a footnote.

---

## VERDICT: **REVISE**

Solid systems inventory, honest test table, real IP discipline — but it ships a state machine (window climb), a solo-difficulty model (caps vs. pressure), and an economy (repair/sever farming) with their worst edges undefined, and it answers its owner's boredom with a faithful CoD clone plus a bonus number.

**Top 3 changes:**
1. **Specify the window-climb state machine fully** (climb states, kill/dismember/Board-Up/repair-during-climb interactions) — it is the game's core loop and it's currently one mermaid sentence (#6, #7, #16).
2. **Re-order: cast to S2, and make cleansed-Regulars a real mechanic** — answer "better than CoD Zombies" with the fiction's own promise, not a renamed Double Points (#19, #20).
3. **Close the economy holes on paper before S2:** per-window repair caps, damage-tick on tearers, part caps on pizza-husk, budget scaling with doors-held-closed (#10, #11, #12).

# The enemy lifecycle — a state machine, and one table to be wrong in

**The one idea:** "a dying enemy must not hurt you, must not block the wave, must not be shot
again" is three rules that live in three different systems. A state machine with a single
capabilities table is how those rules stay agreed — every system ASKS the table; none carries its
own opinion.

## The machine

```
spawning ──(SPAWN_SECONDS)──▶ alive ──(touch range)──▶ attacking
                                ▲                          │
                                └──────(ATTACK_SECONDS)────┘
any shootable state ──(hp reaches 0)──▶ dying ──(DEATH_SECONDS)──▶ gone
```

Each enemy carries `state` and `stateSince` — the clock reading when it entered the state. Every
duration is then plain arithmetic against `now`. No timers, no setTimeout, nothing to leak: the
whole machine is a pure function of (enemy, now), which is why `lifecycle.test.mjs` runs in
milliseconds.

| state | moves | hurts | shootable | holds wave |
|---|---|---|---|---|
| spawning | no | no | **no** | yes |
| alive | yes | no | yes | yes |
| attacking | no | past wind-up | yes | yes |
| dying | no | no | **no** | **no** |

## What each state buys the PLAYER

- **spawning** is the fair-spawn window: a newborn can neither hurt you nor be farmed for a free
  kill. Fair cuts both ways, and both directions are tested.
- **attacking** turned damage from a tax into a game. Before: proximity hurt you, every frame. Now
  an enemy in range plants itself, telegraphs a wind-up (`ATTACK_WINDUP`), and the strike only
  lands if you are STILL in range when it comes — step back and the lunge whiffs. The dodge is the
  first real skill the game asks of you.
- **dying** is why kills FALL instead of POP. The killing shot scores immediately but the enemy
  stays on the board playing its topple; the ray passes through it (no corpse blocking your line),
  it does not hold the wave open, and it cannot be shot again. `clampWhenFinished` holds the final
  frame — without it a finished death snaps back to the bind pose and reads as a resurrection.

## Where each rule executes

The table lives in `lifecycle.js`. `store.tick` ages every enemy and drops expired corpses;
`tickRound` asks `hurtsNow`/`holdsWave`; `shoot()` filters by `canBeShot` and marks kills
`dying` instead of removing them; `Enemies.jsx` moves only `canMove`; `Fryling.jsx` performs
whatever state it is handed (state → clip, 1:1). The component never decides behaviour — it is an
actor reading a script.

Two composition details worth stealing, both descendants of the Slice-5 seam lesson:

1. **Corpses ride through wave respawns.** Clearing a wave replaces the enemy array — naively that
   deletes mid-topple corpses and the kill you just watched pops out of existence. The respawn
   explicitly carries `dying` enemies over; their own clocks remove them.
2. **`stepLifecycle` returns the SAME object when nothing changed**, so the store detects "any
   transitions this frame?" by identity and skips the React update entirely on quiet frames. A
   state machine that re-rendered 40 enemies at 60fps would be correct and unplayable.

## What you can now DO

Add a state to a creature (stunned, enraged, burrowing) by touching ONE table and one clip
mapping — then ask, for each system in the game, "what does this state mean HERE?", and answer in
the table rather than in an if-statement at the call site.

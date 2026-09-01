# Data-driven monsters — a monster is a row, not a class

**The one idea:** the four monsters differ only in NUMBERS — hp, speed, size, colours — while every
RULE (steering, lifecycle, hitscan, rendering) is shared. So a monster is a row in one table
(`roster.js`), and adding the fifth enemy is one row plus one URL, not one file of new code.

## What lives where, and why the split matters

- **`roster.js` — the FACTS.** Pure data, importable by node tests. Schema-tested: every row must
  declare every stat, because a missing stat is a monster that half-works at runtime with no error
  anywhere. The file also carries the game's one non-negotiable ratio as a TEST: every monster is
  slower than the player, or there is no game.
- **`models.js` — the FILES.** Vite-only `?url` imports, quarantined so node never sees them. If a
  unit test ever imports it, the crash is immediate and points at the right file — the good
  failure mode.
- **`Monster.jsx` — the PERFORMER.** One component renders any row: it normalises the measured
  bounds to one unit tall, centres the footprint, clones per-instance skeletons and materials, and
  plays whatever clip the lifecycle's state names. It contains no monster-specific code at all.

## The role system is a stat spread

| monster | hp | speed | read |
|---|---|---|---|
| fryling | 2 | 2.2 | the baseline you learned on |
| drip-cyst | 3 | 1.8 | slow bruiser |
| grease-fly | 1 | 3.4 | fast and fragile — dies to one shot, but it CLOSES |
| patty-larva | 4 | 1.4 | armoured crawler, long and low |

Waves unlock one new face at a time (`unlockedTypes`), and slots cycle deterministically
(`typeForSlot`) — a cycle, not a dice roll, so wave composition is testable and learnable. The
long larva also carries its own `aimRadius`: the hitscan sphere honestly matches the body it
stands in for, per row.

## When a row stops being enough

The moment a monster needs a genuinely new BEHAVIOUR — flying over separation, burrowing under
shots, splitting on death — that is the moment for code, wired through the lifecycle table like
every other capability. Not before. Speculative behaviour hooks in the roster today would be
guesses about a design that does not exist yet.

## What you can now DO

Add a fifth monster in three steps: blockout → pipeline (five clips, `validate-asset`) → one
roster row + one URL line. And when a design conversation asks "what makes this enemy different?",
answer with numbers first, and reach for code only when a number cannot say it.

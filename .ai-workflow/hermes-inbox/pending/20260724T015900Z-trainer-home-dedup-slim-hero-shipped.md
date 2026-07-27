# Trainer home de-dup + slim identity hero SHIPPED to main

- **When:** 2026-07-24 (UTC), terminal VS Claude, worktree C:/tmp/ss-trainer-dash
- **Commit:** c3bd5c563 (FF push 0fcee0fda..c3bd5c563 -> origin/main, one Render deploy)
- **Surface:** Trainer dashboard HOME layout only (/dashboard/trainer/overview canonical tab)

## Decision (why)
The trainer home reused the client observatory hero (stats grid + action rail +
lens rail + artwork panel). That block DUPLICATED the KPI strip, NextActionCard,
and Quick Actions below it; its fixed 430px height + the 1720px shell cap were
the root cause of the 4K dead gap AND the stat values falling off the right edge
(the two complaints Sean reported). Kimi K3 verdict: cut the observatory hero to
a slim identity bar, make the KPI strip the sole metrics owner, promote the
intervention queue to the primary column. Brainstorm doc:
docs/ai-workflow/brainstorms/trainer-home-dedup-vs-observatory-2026-07-23.md

## What changed (7 presentation/test files)
- hero slimmed to identity bar (avatar + name + handle + level + day-progress);
  ~23 dead styled exports removed (styles 337 -> 133 lines, under 300 cap)
- shell max-width 1720 -> 2240, fluid padding, min-height calc(100dvh-64px),
  align-items:stretch + flex:1 (fills 4K frame, no dead band)
- grid tracks minmax(0,...) + content min-width:0 (no right-edge overflow;
  long name/handle/KPI values ellipsis-clip in place)
- theme-background picker evicted from page flow
- contract tests rewritten to assert BEHAVIOR not anatomy

## Coach-safety (Sean's #1 constraint: presentation-only, keep Coach wiring)
Zero backend/hook/service/route/Coach-dispatcher files touched. All 5 Coach
reach-points preserved: buildTrainerHomeCoachPath (NextActionCard + widgets),
per-session buildTrainerSessionCoachRoute dictation button, "Ask Coach" quick
action, phone dock TRAINER_HOME_COACH_PATH.

## Proof
vitest 71/71 trainer tests pass; vite prod build exit 0; CI guards (degalaxy +
token-discipline) clean; Playwright real-browser docOverflow=0 at
375/414/768/1280/1920/2560/3840 (4K shell capped 2240 + centered + height-filled);
hostile dry-loop CLEAN x2.

## Open follow-ups (Sean's standing asks, deferred)
1. Confirm the CHARTS upgrade that was supposed to be in progress.
2. Have Kimi look across client+trainer dashboards and emit RULES to update/improve.
3. (post-Dec) Swanverse game universe build; "dad's singing" / dance-thinking user dashboard.
4. Later: pivot to "the meat" — Workout Planner / Workout Logger.

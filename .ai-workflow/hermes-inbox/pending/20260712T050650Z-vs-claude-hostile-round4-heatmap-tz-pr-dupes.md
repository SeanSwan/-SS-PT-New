---
surface: vs-claude
utc: 20260712T050650Z
topic: Hostile round 4 — heatmap showed evening workouts on the WRONG DAY and WRONG WEEK; PR engine created duplicate baselines; 19 bugs fixed total, all actionable work now green
tags: [charts-heatmap, workout-pr, nutrition-diary, equipment, billing]
---

## What I did / learned
- Round 4 of the hostile-review loop. Fixed 4 more verified bugs (commit `7d2c049a1`, branch `claude/storefront-custom-deals-20260708`, **not pushed**). Running total: **19 real bugs fixed** across 5 rounds.
- **Heatmap was lying about WHEN clients trained.** `workout_sessions.date` is a TIMESTAMP and the DB session runs in UTC, so the server's `MM/DD` label is the **UTC** calendar day — but the heatmap grid derives its labels in the **browser's local** time and matched them by string. A client in UTC-7 training **Sunday 22:00 local** (= Monday 05:00 UTC) was filed on the local **Monday** cell, and because the columns are Monday-aligned (Sunday being the last cell of the *previous* column), it also jumped a **week column**. This fired for essentially **every evening workout** — not an edge case. Fixed by shipping the raw timestamp and bucketing on the user's real local day; the trend charts keep the `MM/DD` label for their axis, so their rendering is unchanged.
- **PR engine created duplicate baselines.** It keyed personal records on the raw `exerciseName` while the analytics/history layer groups by `LOWER(exerciseName)` — so "Bench Press" and "bench press" were ONE exercise everywhere else but TWO to the PR engine: a second baseline row plus a second "first lift unlocked" celebration for a movement already recorded. Now case-folded for matching; the stored display name is left exactly as typed.
- Also: equipment re-add of a >150-char name returned **500 instead of 409** (the duplicate pre-check queried the untruncated name while the create stores a truncated one, so it missed the stored row and collided with the unique index); and the nutrition diary **never refetched after a save** when the macro-summary endpoint was erroring (its refresh key was a constant string, so the effect fired once on mount and never again — the meal the client just saved simply never appeared until a page reload).

## Why it matters to Hermes
- **Do not trust the workout heatmap's day/week placement for anything logged before this fix deploys.** Evening workouts are on the wrong day, and Sunday-evening ones are in the wrong week. Streak/consistency reads off that grid are wrong at the margins.
- The **revenue double-count** (every cart sale since 2026-06-13 wrote TWO `completed` Order rows) is **still live in production** — the fix is committed but unpushed. And even after the push, the **rows already written remain**; a reconciliation is still owed before historical revenue reads true.
- Unifying insight worth carrying: the revenue double-count, the PR duplicates, and the heatmap wrong-day are **all the same bug class** — *the same entity is given a different identity/key function in different layers* (path-scoped idempotency key vs natural key · raw name vs `LOWER(name)` · UTC day vs local day). When reviewing anything that crosses a layer boundary, check that **both sides compute identity the same way**. Written up as a durable learning packet.

## State right now
- Backend **844 files / 6171 tests, 0 failures, 0 unhandled errors**; frontend `tsc` 0 errors. The heatmap and PR regressions were **proven to fail on the pre-fix code** before being locked.
- Branch is **9 commits ahead**, 0 dirty. Nothing pushed — Sean gates every push.
- Round 5 hostile review is running on the surfaces not yet covered: **session credits** (these are money — clients pay ~$175/session, so a double-deduct or lost credit is a money bug), **admin KPI truth** (do the dashboard numbers mean what their labels say?), and **social/gamification** double-award.

## Sean owes / blockers (if any)
- **The push** — production keeps double-counting revenue until it lands.
- **Honor vs refund** when a client pays for a deal cancelled after their Stripe checkout was minted (~24h window). Currently honored + loudly logged; the prevention layer depends on his answer.
- **Remove `admin` from public self-registration?** (compare is now constant-time + fail-closed regardless).
- **Reconcile the duplicate historical Order rows** so past revenue reports read true — needs him to name production before they can even be counted.

---
artifact_id: SWAN-CHART-V3-METRICS
owner: lead Codex
version: 3.0
status: FROZEN CLIENT SEMANTICS; NEW V3 AGGREGATORS UNBUILT
supersedes: inherited labels/formulas wherever explicitly changed below
---

# Every chart has a meaning

IDs are the existing camelCase IDs. Do not derive routes from labels or rename persisted IDs.
Legacy suffixes below are appended to `/api/client/analytics/`; V3 uses the new envelope
routes in [Contracts](04-contracts.md). Legacy APIs remain unchanged for other consumers.

## Shared rules

- All session metrics require `WorkoutSession.status === 'completed'` unless the attendance
  definition explicitly includes other states. Exclude future records from an as-of snapshot.
- UTC timestamps stored; user-selected IANA display timezone carried in request, validated
  by server. Default browser-resolved timezone; if invalid use UTC and disclose it. Week
  starts Monday00:00 local; half-open `[start,end)`. Use server `asOf`, never client clock
  for inclusion. Day and week queries share the same boundary helper and source predicates.
- Range4/12/24w = that many calendar weeks including current; request includes current partial
  week. Summary comparison is most recent4 fully completed weeks versus preceding4, regardless
  of display range; caption says so. Fetch comparison separately within same bounded query.
- Only successful complete query coverage can manufacture empty calendar bins with `y:0`
  for counts/sums. Missing observations for body, duration or RPE remain gaps/null, never0.
- Values must be finite numbers, no boolean/string coercion at the external decoder. Database
  decimals parse with strict decimal grammar. Negative counts/loads, noninteger counts or
  invalid timestamps are excluded with a quality reason; never silently clamped into a PR.
- Units normalize before aggregation: body kg→lb = kg/0.45359237; output display may be lb or
  kg, consistent across plot/table/drill/export. Unknown/null units are excluded and counted.
  WorkoutLog lacks unit field: current legacy controller explicitly treats weight as lb.
  Luna MUST verify every writer's normalization in S0; if any writes kg without conversion,
  STOP the load/volume/record migration—do not assume, backfill, or rewrite records.
- No extrapolation, smoothing by default, forecasts, streak-break threats or clinical advice.
- Load deltas and measurements are descriptive, not good/bad. Series comparisons require
  identical metric, unit, exercise/rep basis, source type and complete comparable periods.
- Titles below are final UI copy, descriptions final About copy. Category list may have more
  than six items: show top6 ranked rows plus **View all categories** table, never fake Other
  without server aggregated membership. Ties sort stable key ascending.

## Fifteen-chart contract

T = current teaser middleware; G = current Guardian middleware; U = authenticated ungated.
These are technical policies, not a newly invented pricing plan. Detail G unless noted.

| ID / title / legacy suffix | Definition, visual and unit | Source/evidence, detail and caveat |
|---|---|---|
| `workoutFrequency` / **Training rhythm** / `chart-workout-frequency` / T | Count completed session IDs per local week, including two same-day sessions. Vertical bars, zero baseline, integer ticks; current bar hatch + “in progress.” Unit sessions. | Session.id/date/status; controller131. Week detail uses identical range/predicate; show full sessions/sets if G. About: “Completed sessions, not distinct training days.” |
| `attendanceReliability` / **Session follow-through** / `chart-attendance-reliability` / G | Counts completed/skipped/cancelled. Percent completed/(completed+skipped+cancelled); denominator0→null. Horizontal status bars, never a moralizing score/ring. Unit sessions; percent separately labeled. | Session.status/date; controller165. Planned/in_progress excluded from denominator, shown separately in About. Status drill includes exactly named statuses. Cancellation is context, not failure. |
| `weeklyVolume` / **Training volume** / `chart-weekly-volume` / T | Sum valid weight×reps across logs joined to completed sessions. Vertical bars; unit lb·reps or kg·reps, NOT “weight lifted” or plain lb. Count zero-load sets separately. | WorkoutLog.weight/reps/sessionId; controller212. Week detail shows contributors, zero-load exclusions, totals that reconcile. Volume alone is not training quality or improvement. |
| `setsRepsTrend` / **Sets & reps** / `chart-sets-reps-trend` / G | Count valid log IDs and sum reps per week, two vertically aligned small plots sharing x; no dual y-axis or same-axis mixing. Units sets and reps. | controller250. Include recorded set types; About says “All logged set types.” Week drill grouped exercise; show working/warmup labels when available. |
| `durationTrend` / **Session length** / `chart-duration-trend` / G | Scatter each completed session with known finite duration>0; x timestamp, y minutes. Do not draw a trend between categorical day labels. | Session.duration/date; controller292. One point per session even same-day duplicates, stable session ID. Session drill, no inference that longer is better. Missing duration is not0. |
| `intensityRpeTrend` / **How hard sessions felt** / `chart-intensity-rpe-trend` / G | Two separate labeled small plots: mean valid set RPE1–10; mean known session intensity1–10 computed ONCE per session, not after set join. Never connect or compare the two sources as one series. | Log.rpe, Session.intensity; controller340 old mixed-source logic superseded. Unit /10; denominator/sample count visible; week drill shows origin. Unknown intensity scale in writer→STOP. |
| `prTimeline` / **Best logged sets** / `chart-pr-timeline` / G | For selected normalized exercise and exact reps, plot daily highest load; ties date/log ID stable. Gold only if strict best versus ALL earlier comparable logs and at least one prior comparator. First observation=baseline. | controller391 currently daily best, not proof of record. About: “Compared with earlier sets of this exercise at the same reps.” Exact reps picker required; no cross-exercise record totals. |
| `anchorLifts` / **Your main lifts** / `chart-anchor-lifts` / G | Top3 by distinct completed sessions in range; normalized exercise key; small multiples of heaviest daily set, annotate reps. No common “strength gain” across different reps. | controller437. Each plot direct-labeled exercise, same load units; select exercise then source set. Ties normalized key ASC, stable within loaded snapshot. |
| `exerciseFrequency` / **Exercises you return to** / `chart-exercise-frequency` / G | Distinct completed sessions containing normalized exercise; horizontal bars descending, sets count secondary. Unit sessions. | controller507. Category drill lists sessions for that exercise with actual sets. Never count repeated sets as multiple sessions. |
| `movementPatternBalance` / **Movement mix** / `chart-movement-pattern-balance` / G | Existing canonical movement taxonomy, volume by category, plus logged-set count; ranked horizontal bars, zero baseline. Unit load·reps; not a radar “ideal balance.” | controller548 taxonomy joins. Unknown category retained as Unclassified, not dropped. One primary category per log; ambiguous mapping blocks aggregate until adjudicated. Category drill reconciles included logs. |
| `muscleGroupBalance` / **Muscle-group workload** / `chart-muscle-group-balance` / G | Existing primary-muscle taxonomy, same volume definition; horizontal bars plus sets. No claim of actual activation or ideal body symmetry. | controller590. One primary group per log, Unclassified preserved; no multi-group double counting. Excludes bodyweight volume but discloses zero-load set count. |
| `recoverySignal` / **Effort & notes** / `chart-recovery-signal` / G | Two sections: sessions with recorded keyword mentions, dedup by session+exercise; separately high-RPE sets (≥9). Never sum them into a recovery/injury score. Horizontal bars, separate units/headings. | controller647 keyword regex reused as retrieval heuristic, not diagnosis (negation can match). About explicitly says this. Raw notes excluded from aggregate/share; authorized session drill may view original notes. |
| `weightTrend` / **Body weight** / `chart-weight-progression` / U | Chronological measured observations normalized by weightUnit; line + points, no interpolation over missing observations; latest same-day measurement wins (time then ID). Unit lb/kg. | BodyMeasurement.measurementDate/weight/weightUnit; controller709. Private local detail shows original measurement/unit and conversion. No workout drill or unsolicited celebration. |
| `bodyFatTrend` / **Body-fat measurements** / `chart-body-fat-trend` / U | Measured percentage0–100 only; points + line, neutral labels, no extrapolation. Changes expressed percentage points, not relative percent. | BodyMeasurement.bodyFatPercentage/date; controller737. Measurement source/method unrecorded→“Method not recorded”; never invent scan precision. Private local detail; no session drill. |
| `estOneRm` / **Estimated strength** / `chart-est-one-rm` / G | One selected exercise, weekly max Brzycki load/(1.0278−0.0278×reps), reps1–15 and positive verified lb load; reject estimate>1500lb before display conversion, never cap to1500. Label **Estimate, not a tested maximum.** | controller808/service pattern. Default most logged eligible lift, ties max load then normalized key. User may select eligible exercise. Source set drill. Not an instruction to attempt that load. |

## Scale and formatting

Bars always baseline0. Count axes integer. Percent0–100. RPE/intensity1–10.
Load/body line axes may use data extent with10% padding but must show units and ≥3 labeled
ticks; single value gets ±max(1unit,5%) domain. No area fill on truncated-baseline plots.
Nulls break lines. X coordinates use timestamps/category indices; labels are not keys.
Maximum x ticks:3 at320,4 at375/414,6 tablet,8 desktop; thin labels by measured width.
Never smooth overshooting splines; straight segments for chronological observations.

Rounding only at display: sessions/sets/reps integers; load/body1 decimal; volume integer;
RPE1 decimal; body-fat1 decimal; estimate1 decimal and “est.”. Aggregation/comparison uses
unrounded values. Tooltips and table use identical formatter. Zero is not missing.

## Feature preservation matrix (applies to all15)

| Feature | Preserve/upgrade contract |
|---|---|
| Table / expand | All15; real rendered behavior, same datum/units/series selection |
| Range | All15 normalized V3 boundaries, same visible label and actual server range |
| Insight / facts | Replace generic pulse with one evidence sentence + About, never silently drop |
| Legend | Multi-series only; same-key toggles and non-color identity; small multiples preferable |
| Detail | Sessions for training/strength; measurements for body; heuristic explanation for notes |
| Full sets | Training source drill must retain exercises, set type, reps, load, RPE; absent values “—” |
| CSV | All15 authenticated owner, allowed/current snapshot; formula-safe cells; neutral file name |
| Chart PDF | All15 in expanded view: selected chart + caption + table; allowlisted render, not dashboard screenshot |
| Session PDF | Existing supported session export retained in session detail; adapter parity test |
| Feed share | Only frequency/volume/verified best-set/eligible estimated-strength summary; owner only, consent preview; no body/notes/attendance |
| Coach | Informational explanation only in V3; no model call or prefilled client data egress |

Any existing capability discovered beyond this inventory goes into the parity test before
removal. Do not infer permission for sharing from availability of an export action.

## Smart story selection (deterministic, testable)

Hero always frequency. Summary uses last4 complete weeks, e.g.12 sessions vs9 → “3 more.”
No percent when prior0; caption “First comparable period.” Missing coverage→no comparison.
Supporting story priority: (1) most recent eligible best logged set in last14days; (2) most
recent valid selected-exercise estimate, neutral; (3) last4-complete-week volume, neutral;
(4) nothing. Ties by event time descending then stable chart/point key ascending.
Only ready, authorized, complete-quality, non-body/non-notes data qualifies. No new network
request merely to find a story. No story from stale refresh, unknown unit or first-set “PR.”

## Explicit unresolved source audits, not product choices

Luna S0 must prove load-writer units, session-intensity scale, timezone handling of Session.date,
taxonomy join cardinality, current tier middleware, and existing logger/PDF caller contracts.
If those differ from the stated constraints, stop with exact evidence. Do not guess.

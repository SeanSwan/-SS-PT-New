---
artifact_id: SWAN-CHART-V3-TESTS
owner: lead Codex; execution owner Luna after slice gates
version: 3.2
status: ACCEPTANCE SPEC + ISOLATED EXECUTABLE RED TESTS
supersedes: source-string consumer test as acceptance
---

# Tests define the upgrade

Tests below are required, not claims of implementation. `acceptance.red.mjs` is an executable
pre-implementation suite outside the regular regression suite. It imports the future pure
metric module from an explicitly supplied source tree. It must fail for missing behavior now;
Luna cannot make it green by changing expected values, skipping, or supplying a test-only stub.

```powershell
node docs/ai-workflow/AI-HANDOFF/chart-experience-v3/acceptance.red.mjs C:/tmp/ss-charts-unify-20260903
node docs/ai-workflow/AI-HANDOFF/chart-experience-v3/validate-packet.mjs
```

**The green packet validator validates documents, not the application.** Neither it nor a
source grep proves browser, SQL, authentication or production behavior. Once implemented,
promote each RED case into the normal appropriate suite while retaining IDs and evidence.

Sean's whole-product approval adds U01–U12 in [the uniformity contract](10-approved-uniformity.md).
There are 44 original cases plus 12 adoption cases: 56 specified cases, not 56 passing tests.
Only M01–M12 are presently executable runtime RED contracts. U cases must be implemented
by Luna at the named layer; a green document check cannot stand in for any U gate.
The subsequently approved [unit extension](12-worldwide-weight-units.md) adds20 KG cases,
for76 specified cases total. Its eight pure cases run via `weight-units.red.mjs <build-root>`;
KG0 requires no database and is independent of the chart S0 gates. Remaining KG cases require
real writer/storage/UI evidence at the named layer before unit support is considered shipped.

## Pure acceptance seam, binding exports

NEW `backend/services/charts-v3/metricMath.mjs`, no database import or credentials:

| Export | Input/output | IDs |
|---|---|---|
| `countCompletedSessions(rows,start,end)` | rows `{id,at,status}`; ISO half-open bounds; dedup by session id; integer count | M01,M02 |
| `normalizeBodyWeight(value,unit,displayUnit)` | strict finite number, unit lbs/kg, display lb/kg; returns number or null for invalid/unknown | M03,M04 |
| `attendanceRate({completed,skipped,cancelled})` | finite nonnegative integers; ratio percentage or null if denominator0/invalid | M05,M06 |
| `meanSessionIntensity(rows)` | `{sessionId,intensity}`; dedup identical values; conflict values for same ID excluded; known1–10 only; average or null | M07 |
| `comparePeriods(current,prior)` | `{value,complete,unit,sourceType,metricId,exerciseKey,reps,period:{startDate,endDate,tz}}`; validation below; `{eligible,delta,percent}`; mismatch/incomplete→false,null,null; prior0→eligible,delta,null | M08,M09 |
| `isVerifiedRecord(value,priorValues)` | finite positive same-basis loads; requires at least one valid prior, strict greater; boolean | M10 |
| `estimateStrength(loadLb,reps)` | Brzycki, valid reps integer1–15, load>0, estimate≤1500lb; number or null, no clamping | M11 |
| `canShareMetric(chartId)` | strict allowlist frequency/volume/best-sets/estimate IDs; other/unknown false; not a replacement for server ownership | M12 |

These are behavior contracts, not implementation instructions to use a particular algorithm.
Pure helper correctness cannot validate that SQL selects the right rows; integration is separate.

`comparePeriods` must itself reject mismatched metricId, sourceType, unit, exerciseKey or reps
(including null vs non-null), incomplete coverage, nonfinite/non-numeric values and differing
timezones. `period` dates are validated ISO local dates, Monday boundaries, end exclusive.
Both spans must contain the same positive whole number of calendar weeks and prior.endDate
must equal current.startDate. Calculate week length from civil dates, NOT elapsed UTC hours
(DST weeks may be167/169h). The period builder proves those dates map to the selected timezone;
its integration tests exercise DST. No caller assertion alone may bypass helper validation.
Body first/last change is a separate named calculation, never passed to this sum-period helper;
it requires two dated same-unit valid measurements and yields neutral absolute difference.

## Requirement to artifact to test to gate

Each row supplies fixture/action/expected result. Unless stated, negative side effects are
no writes, no client PII telemetry, no fabricated points. B=backend integration, C=mounted
component, E=real browser, M=pure semantics. Every test runs on synthetic owned fixtures.

| ID / requirement | Artifact | Fixture → action → exact expected outcome | Layer / gate |
|---|---|---|---|
| M01 sessions, not days | registry frequency | two completed same-day sessions → count2 | pure / S1 |
| M02 stable boundaries | contracts | duplicate ID, planned, start/end timestamps → dedup; start included/end excluded | pure + SQL / S1 |
| M03 normalized kg/lb | registry body |100kg → lb ≈220.462262; back to100 | pure / S1 |
| M04 invalid units honest | contracts | null/unknown unit,NaN,negative → null/exclusion, never0 | pure+decoder / S1 |
| M05 no zero-denominator score | registry attendance | all counts0 → null, no0% badge | pure+C / S1,S4 |
| M06 attendance denominator | registry attendance |3 completed,1 skipped,2 cancelled →50%; planned not included | pure+SQL / S1 |
| M07 no join weighting | registry intensity | sessionA intensity2 duplicated3 times, B8 once →5, not3.5 | pure+real query / S1 |
| M08 no partial/mismatched comparison | registry comparisons | incomplete prior; metric/source/unit/exercise/reps/timezone mismatch; unequal/nonadjacent calendar spans → ineligible/null; equivalent spans positive control | pure S1; component S4 |
| M09 prior zero | registry comparisons |3 current vs0 prior complete →delta3, percent null | pure+C / S1 |
| M10 earned record | registry best sets | first135, equal135, then140 against135 →false,false,true | pure+history query / S1 |
| M11 estimate truth | registry estimate |100×5 formula;0/16 reps or implausible result →null, no1500 cap | pure+SQL / S1 |
| M12 sensitive share blocked | sharing contract |body/notes/unknown false; allowed four IDs true | pure+B / S5 |
| B01 subject isolation | contracts auth |a: aggregate forged userId→400, query bound A, zero B rows; b: detail B point→403/404, zero B source rows | router+DB / a S1; b S2 |
| B02 tier parity | registry T/G/U |a: all15 aggregate current middleware roles→same allow/lock; b: teaser detail402, no source rows | router+DB / a S1; b S2 |
| B03 exact date bins | registry time |DST23/25h,Dec/Jan leap-day,asOf midweek →correct local bins and same detail membership | SQL+DB / S1 |
| B04 complete vs empty vs invalid | envelope |empty query200 empty; DB throws503; malformed row partial; forbidden401/403 clears | service+C / S1,S3 |
| B05 details reconcile | detail schema |two same-day sessions, bodyweight set, mixed set types,>25sessions →correct aggregate and paginated total, no duplicate/missing rows | SQL+service / S2 |
| B06 stable snapshots | detail schema |edit/delete contributing source after chart fetch →409; expiry>15min→409; cursor from B→deny | router+DB / S2 |
| B07 unit writer provenance | registry units +12 |each writer fixture kg/lb→stored pair proved; legacy unknowns preserved/excluded with coverage, never guessed; source ambiguity on new writes blocks them | real writer/query / S0,S1 |
| B08 taxonomy cardinality | registry movement/muscle |missing/duplicate taxonomy join →Unclassified or explicit partial, never doubled volume | SQL+DB / S1 |
| B09 notes not diagnosis | registry notes |duplicated exerciseNote,negated keyword,high-RPE overlap →separate counts; heuristic caption; no combined risk score | SQL+C / S1,S4 |
| B10 bounded execution | performance |representative10k sessions/>100k sets seeded →bounded payload,subject/date query plan,no N+1,p95 budget | isolated DB / S6 |
| C01 per-chart errors | state contract |frequency500 + volume200 →frequency error, volume visible; no log CTA for failure | real mounted grid+mock transport / S3 |
| C02 retained data | state contract |ready→pending→503 same key →last frame + timestamp/staleError; disabled detail/export; no skeleton | component / S3 |
| C03 old query labels | state contract |12w/lb→4w/kg pending →old units/period retained and visibly loading new, no false relabel | component / S3 |
| C04 generation races | flows F2/F3 |slowA→fastB and A→logout/new subject; lateA resolves →no stale rows/portal/story/cache | component / S3 |
| C05 control functionality | UX action table |every enabled action clicked →documented observable result; disabled cannot fire; no undefined handler | component / S3,S4 |
| C06 stable datum identity | actions |sort table,hide series,duplicate x labels then select →same source point and series, not index | real Victory+table / S3 |
| C07 all15 preserve features | registry parity |parameterized15 IDs →same table,expand,caption,correct detail type; no second frame | mounted registry / S4 |
| C08 story eligibility | smart story |new baseline,stale,locked,body,notes excluded; verified record priority/tie stable; unchanged while reading | component / S4 |
| C09 saved charts | UX library |save3/attempt4/storage throws/logout/A→B →limit/notice/purge/no other subject prefs | component / S4 |
| C10 event refresh | contracts |successful workout saved emits duplicate same event →one fetch; failed save→none | mounted route / S4 |
| E01 real responsive matrix | UX |320,375,414,768,1024,1440,2560×1440,3840×2160 →no page-x overflow/overlap,all text reachable | browser / S6 |
| E02 keyboard and focus | UX overlays |tab→table row→detail→Back→Escape; locked,empty,error branches →trap once, correct return,no hidden focus | browser / S6 |
| E03 actual lens palette | visual bridge |at least2 distinct existing lenses; computed strokes/buttons inside portal →resolved value,4.5:1 text,3:1 marks/focus | browser / S6 |
| E04 reduced/forced colors | visual system |OS reduced before first paint + forced colors +200% zoom →zero data animation,visible focus/marks,readable controls | browser / S6 |
| E05 true mounted journey | route receipt |isolated client logs workout through real writer→save success→open canonical progress→new point→source session→full sets | browser+isolated DB / S6 |
| E06 no deceptive zeros | state copy |all15 empty,error,locked,partial fixtures →correct individualized copy, no fabricated deltas | browser / S6 |
| E07 performance/scroll | budgets |long library/sheet, rapid resize, background tab →≤6plots,no fetch per resize,one scroll owner,control response budget | browser / S6 |
| E08 whole-page rollback | flag contract |flag false while overlay pending →V3 abort/clear, old composition works; no mixed data | browser / S6 |
| X01 export privacy | sharing/export |sensitive text outside export target,CSV formula strings,unknown units →outside text absent,escaping correct,unit faithful | render+file readback / S5 |
| X02 intentional publish | sharing flow |open/close preview/export/refresh→0posts; explicit confirmation→1post; expired/other subject→deny | router+DB+browser / S5 |
| X03 idempotent publish | sharing flow |duplicate click/network timeout/replay/body mismatch →same post or409; no auto-second post | integration / S5 |
| X04 scope receipts | release gate |staff/NASM/gallery/long-tail inventory →no all-product completion claim until each mount tested | evidence audit / S7 |

## Chart-family browser cases (parameterized, not copy/paste tests)

Frequency/volume: first/last/zero/current-partial bar. Attendance: no resolved sessions.
Sets/reps: two independently scaled plots. Duration: two same-day points + missing duration.
Intensity: missing RPE but known session intensity, different sample counts. Best sets: select
reps then verify prior history outside viewport. Anchor: third series and long exercise label.
Exercise frequency: duplicate normalized names. Movement/muscle: Unclassified and top6/all
rows. Notes: nonmedical caption and inaccessible raw text in aggregate. Weight: kg+lb values
same body weight. Body fat:0 and null distinct, change reported in percentage points.
Estimate: reps15 accepted,16 excluded, first observation not a PR. Each uses real Victory tree.

## Environment / evidence rules

S0 creates or selects a disposable synthetic DB, proves connection not production, then uses
existing QA startup mechanisms only after reading their supported arguments. No `npm run dev`
against the repo's default production DATABASE_URL; never print its value. Missing zod is an
environment preflight, not a reason to weaken tests. The original planning pass installed none;
the later isolated locked backend install and synthetic DB preparation are recorded in [13](13-kg0-verification.md).
Fixture host contains no real auth cookie/client. Browser stubs test UI; only isolated DB tests
prove actual writer/query/auth contracts. Keep those claims separate in each slice receipt.

Evidence must name base+dirty digest, command, exit/count, fixture, route/role, viewport and
asserted behavior. Carrying forward old427 tests is not acceptable. Don't run every suite twice
without a changed risk; use focused RED/GREEN and the named sibling/integration gates.

Luna can add tests, not relax/remove these expectations. Unexpected green before a change
means investigate existing coverage and implementation; it does not authorize duplicate code.

## Gate-layer assignment (no circular slice dependencies)

M01–M12 pure assertions run S1. M02/M06/M07/M10/M11 SQL counterparts run S1; UI counterparts
of M04/M05/M08/M09/M12 wait for S3–S5 as appropriate. B01a/B02a are aggregate-only S1;
B01b/B02b are detail-only S2. B03 is period/query S1. B04 query/error status is S1, decoder/
data-clear rendering is C01/C04 in S3. B05/B06 are S2. B07/B08 are writer/query S0/S1.
B09 dedup/count query is S1; copy/no-score UI is S4. B10 query/payload is S1; end-user latency
is E07 in S6. No S1 exit requires a mounted page, detail handler, export or publish endpoint.
M12 only proves allowlist math in S1; X02/X03 prove server share boundaries in S5.

KG1 prerequisite subgates DG01–DG12 are specified in [16](16-kg1a-db-guard.md), not counted
as additional client-chart acceptance cases. Nine lead DG assertions run with fake clients;
the actual readonly PostgreSQL identity proof is separate. A passing fake connection cannot
clear migration/writer integration or the future writable-handle requirement.

Same-handle SH01–SH13 are specified in [19](19-kg1b0-same-handle.md); ten fake-ORM lead
assertions and three real PostgreSQL scenarios are separate evidence. Storage ST01–ST13 in
[21](21-kg1b1-storage.md) now have actual SQL/model evidence plus seven independent raw-SQL
probes in [22](22-kg1b1-verification.md). Both sets refine KG1's safety/SQL
acceptance without inflating the76 specified chart/unit domain cases into a passing total.

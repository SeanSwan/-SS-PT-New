# Workout Planner upgrade specification

Artifact: SWAN-PLANNER-DEPTH · v2.0 · 2026-09-06 · Owner: Sean
Status: proposed enhancement to the live V2 workbench; runtime unchanged.
Companions: [audit](01-audit.md), [wireframes](wireframes.html), [tests](04-verification.md).

## Preserve the product Sean already likes

Keep the scope selector, single Generate action, Library/In plan Rolodex, search,
filters, selection undo, Teach Mode, guided candidates, Coach dock, save bar,
generated-program views, Plan vs Actual strip, backup, blend, PDF and saved-plan
lifecycle. Existing world/lens tokens remain a skin over one functional tree.
Improve discovery and programming depth without making people configure every
setting for an ordinary session. The default path remains short.

Desktop: left Rolodex, center session/week editor, optional right explanation or
agent change preview. Advanced programming opens a bounded side panel; not a
second scrollable form permanently squeezed into the library. At phone widths,
Session / Rolodex / Coach & settings switches views of the same retained state. My plans remains in the app navigation. Advanced
opens a full-width sheet with Apply and Cancel; keyboard focus restores to its
trigger. A compact sticky summary shows client, scope, date and changed settings.

## Advanced becomes Programming

Keep the familiar Advanced entry label initially; its panel title is Programming.
Use six sections with a persistent count of changed settings. Search settings,
Reset section, and Save preset belong in the panel. Show effective values and
where each came from: Swan default, client setting, trainer preset, or this plan.
Hard constraints never disappear when choosing a preset or another agent.

| Section | Controls | Rules / real integration |
|---|---|---|
| Session | Target minutes; exercise count; warmup/cooldown time; session purpose; location/equipment profile; unavailable equipment; transition time | Wire count/rotation first; time/equipment budgets require generator + validator changes before activation |
| Schedule | Single/workout program scope stays outside; sessions/week; actual weekdays; start date; blackout dates; custom 1–52-week duration; split selection | `endpointFor(scope)` remains sole endpoint selector. No generation-mode or agent choice changes scope implicitly |
| Prescription | Sets/rep ranges; timed holds/distance; rest between sets and between rounds; tempo; effort method RPE/RIR/%1RM; load units and increments | Typed set contract. Mutually exclusive effort methods; unknown strength baseline never produces an invented load |
| Progression | Stable anchor exercises; double progression/linear/wave templates; review interval; planned deload; rotation policy; progression eligibility | Templates are trainer-configured policies. Logged adherence/performance is evidence; planned load is never charted as actual |
| Constraints | Allowed movement patterns; user dislikes; must-include/exclude; trainer-approved restrictions; impact tolerance; maximum novelty; equipment unknown handling | Safety and permission gates win. Constraints are resolved before candidate selection. Missing data stays unknown |
| Assistance | Manual, Swan Coach or connected personal agent; Auto/Guide Me/Deep Grill; local-only requirement; what context can be shared; reasoning/explanations | Input provider and review style are independent. Deep Research is an explicit optional action with separate spend/privacy gates |

Progressive disclosure: ordinary users see time, location, goal and preferences.
Trainers get full prescription/progression controls. Read-only or ineligible
controls explain why and show the path to request a trainer change. A connected
agent cannot unlock controls a human lacks permission to use.

## Presets and precedence

Precedence, strongest first: current safety/permissions → nonnegotiable
client restrictions → this-plan overrides → chosen trainer preset → eligible
client preferences → Swan defaults. Conflicts are explicit violations, never
resolved by taking whichever value arrived last. Presets are versioned; later
preset edits do not silently rewrite already saved plans.

Examples of useful preset names: Equipment limited, Short session, Strength
focus, Travel, Return to routine. These are workflow starting points, not
medical claims. A Short session preset cannot ignore required rest to satisfy
its clock. If constraints cannot fit the requested time, return a shortfall and
offer a smaller session for review.

## Deterministic planning pipeline

1. Resolve actor/target/feature permissions and a versioned context snapshot.
2. Normalize user input into typed constraints; reject invalid combinations.
3. Resolve authoritative equipment, canonical exercise IDs and exclusions.
4. Apply goal/phase/split/session template and trainer-owned progression policy.
5. Select or accept candidate exercises. An AI can rank/propose; it cannot
   remove hard constraints or create catalog identity by naming an exercise.
6. Allocate blocks, prescribed sets, rest and transition time. Report which
   inputs are estimated or absent. Estimate duration from work + rest +
   transition + preparation, without double-counting simultaneous circuit work.
7. Validate every session and adjacent days/weeks; flag volume jumps, missing
   coverage and impossible equipment transitions against the configured policy.
8. Produce candidate + violations + evidence + change preview. Nothing activates.
9. Human accepts the exact revision; existing writer persists it, reads it back,
   and updates derivative/PDF state. Logger receives the same prescribed meaning.

No client-specific training thresholds are invented in this blueprint. Existing
NASM/OPT/corrective doctrine remains a policy input. Before new progression or
restriction rules ship, Sean/training owner reviews the actual rules and their
scientific sources. Every automated judgment must be explainable and override
permissions must remain the same as the existing safety review gate.

## Deeper Plan Builder

- Explicit Warmup / Main / Accessory / Conditioning / Cooldown blocks, with
  standard, superset, circuit and timed-block layouts. Later methods use the
  same typed set model; do not encode a pyramid only inside a note.
- Per-set rows support warmup, working, back-off, drop and timed sets as the
  downstream logger/PDF contract permits. Add deliberate duplicates in another
  block while preserving the current accidental-double-click guard.
- Drag reordering has Move up/down and Move to block alternatives. Group actions
  work by keyboard. Superset/circuit rest after a round is separate from rest
  between exercises. Users can inspect the resulting sequence.
- Copy a set, block, day or week; apply changes to selected days/weeks with an
  explicit preview. Locked anchor exercises survive partial regeneration.
- Show duration estimate, planned volume by movement/muscle and workload warnings
  with units, calculation assumptions and source freshness. Use Victory for any
  new charts; no invented improvement percentages or compliance scores.
- Agent proposals show added/removed/changed exercises, prescription changes,
  warnings and why. Accept all or selected changes creates a revised proposal
  and reruns validation; partial acceptance cannot bypass constraints.
- Maintain Undo/Redo during a local edit. Durable recovery uses server-side
  versioned drafts/snapshots; raw client plans do not go into browser localStorage
  just to implement autosave. Browser cache policy must be explicit and minimal.

## Prescription contract extension

Proposed `planData.schemaVersion = 2` adds programming, blocks and typed sets
while retaining the existing weeks/days identity and assignment semantics.
Current `contentRevision` and `contentHash` remain authoritative. Example shape:

```text
PlanDataV2
  schemaVersion: 2
  programming: { version, resolvedConstraints, sources, validationPolicyVersion }
  weeks[] -> days[] { stableDayId, date?, assignmentType, blocks[] }
  block: { id, kind, orderedExerciseInstanceIds[], rounds?, roundRestSeconds? }
  exerciseInstance: { id, exerciseId, blockId, order, prescribedSets[], notes }
  prescribedSet: { id, kind, measure, target, effort?, load?, tempo?, restSeconds }
  measure: reps | seconds | meters
  target: { min, max } with finite positive numeric values
  effort: { method: rpe | rir | percent1rm, value, referenceId? }
  load: { value, unit: lb | kg, source: prescribed | measuredReference }
  provenance: { method, sourcePlanRevisions[], policyVersion, contextSnapshotRef }
```

IDs distinguish catalog exercise from workout occurrence and set identity.
Do not turn numeric UUID strings into integers. Do not infer units from locale.
Bounds/types are validated on the server; UI limits alone cannot enforce them.
For unsupported features, older consumers show read-only upgrade-needed states.
Do not activate V2 prescriptions until every canonical logger/export/Coach
consumer either round-trips them or explicitly rejects them. Never flatten
supersets/timed sets into legacy scalar sets/reps and claim equivalence.

## Rolodex enhancements

Preserve `/api/exercises/library` and its authorized media, defaults, NASM,
modification and registry metadata. Replace neither catalog nor identity scheme.

1. Persistent search and active-filter summary; favorites, recent and prescribed
   views; unknown equipment shown explicitly. Filters separate equipment,
   movement, muscle, difficulty, impact, unilateral/bilateral and training method
   only when authoritative metadata supports them. No guessed facets.
2. A compact exercise detail drawer with video, cues, canonical defaults,
   regressions/progressions, permitted modifications and relevant last logged
   performance. Missing media and history remain useful empty states.
3. Compare up to three candidates. Show how they differ in equipment, movement,
   complexity and prescription fit. Show exclusion reasons, not just a score.
4. Replace preserves the selected occurrence's block context and asks whether
   to keep prescribed sets; changing the exercise invalidates incompatible load
   references. Return a preview before replacing across a whole program.
5. Virtualized results and stable focus. Keep the library's personality through
   card hierarchy/selection; no heavy pointer tracking on data cards.

## Saved, backup and blended plans

The library becomes a clear view of **Current / Drafts / Backup / Templates /
Archived** with search, owner/target, duration, last edit, content revision and
PDF freshness. These are views over existing roles/statuses, not a replacement
status enum. “Current” must follow the existing authoritative lifecycle; never
infer it from the first item, longest duration or stale metadata primary flag.

Current plan leads with its next session and Log current plan. Actions sit in a
consistent menu. Duplicate/copy explicitly names destination and scope, strips
source-client provenance/notes as required, and rechecks destination permission.
Template publishing is separate from copying a personal plan.

**AI backup:** keep one designated backup per client and the established refresh
and promote routes. Freshness explains whether age, new sessions, changed
equipment, changed constraints or missing provenance caused the warning. Offer
Compare with current, Refresh preview and Promote. Before replacement, preserve
a previous prescription snapshot. Reject stale-context promotion/refresh and
show recovery status after a lost response. A backup workout is not a database
backup and does not prove disaster recovery.

**Alternatives:** travel/home/short-session variants can be named ordinary drafts
with lineage; don't multiply the one-per-client AI backup role. They never
silently become the current plan.

**Blend:** keep existing source week/day selection. Add a side-by-side preview,
provenance for each selected day, transition warnings, duplicate-day detection,
goal/equipment compatibility and planned-volume checks. Save as a NEW draft via
the current mutation service. Do not edit either source. A source changed during
composition requires reload/compare using both expected source revisions.

**History/restore:** add immutable prescription snapshots behind the existing
revision counter. Compare, restore as a new draft/revision, and explicitly
re-activate if desired. Completed logs and historical chart data never change.
Generated PDFs are derivatives of a known revision; uploaded PDFs get the
existing needs-review treatment when prescriptions change.

## State and accessibility contract

| State | Observable UI / action |
|---|---|
| Loading | Target-scoped skeleton; announce once; disable generation/save until authoritative context arrives |
| Empty | Explain missing exercises/eligible client; Add exercise or choose target |
| Partial | Mark missing equipment/history; keep manual draft; explain blocked automated choices |
| Success | Preview first; after save show actual persisted revision and read-back status |
| Denied | Explain permission boundary without exposing inaccessible record details |
| Validation error | Summary links to labeled field; values retained; no partial save |
| Failure | Recover draft, retry reads, or check known request; no blind write retry |
| Cancel/defer | Keep draft; cancel active generation by task identity; late result cannot apply |
| Conflict | Compare server revision with local edits; save copy or rebase intentionally |
| Device offline | Show last seen and local-only pause; reconnect or choose manual work |

Keyboard order follows client → scope → programming → library → builder →
review/save. Sheets trap focus only while open, Escape cancels local changes,
and focus returns to the launching control. Validation, dirty and success states
use text/icons as well as color. A polite live region reports save/job state,
not every streamed token. Sticky elements respect keyboard and safe-area insets.
QHD/4K use wider working columns, not tiny centered islands. Phone view stacks
or switches work panes; no horizontal page scroll. Test touch and 200% zoom.


## September 7–8 v2 addendum

The canonical direction is Training Studio with optional Program Map. Read 08-design-synthesis.md for the governing visual decisions, 09-model-connections-and-budgets.md for default Coach/personal OpenRouter/local policy and durable spending controls, and 10-coach-privacy-audit.md for current-source privacy gaps and release prerequisites. Earlier baseline results remain dated historical evidence. This pass changes the blueprint and synthetic preview only.

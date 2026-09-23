---
artifact_id: SWAN-CHART-V3-UNIFORMITY
owner: Sean approval; lead Codex design/review; Luna implementation
version: 3.1
effective: 2026-09-04
status: APPROVED DESIGN AND ALL-LIVE-CHART SCOPE; IMPLEMENTATION GATED
supersedes: pending-design-approval wording in version 3.0; no visual redesign
---

# One recognizable Swan chart experience

Sean approved the Sapphire Ledger study and explicitly required all charts to be in sync.
The approved design is unchanged. This contract turns that request into measurable adoption
and data-agreement gates. It does not claim the live product already matches the study.

## Approval, roles and preservation

Lead Codex owns blueprint, taste and hostile review. Luna executes bounded slices, supplies
evidence, and stops for unknowns. S0 is the first authorized slice; S1 requires S0 to pass.
All live chart cohorts are in scope, not merely the fifteen client charts. No push, deploy,
production mutation, schema change, entitlement change, cleanup or paid review is authorized.
The existing final decision/commit gate is retained; design approval is not release approval.
Subsequent decision: [12](12-worldwide-weight-units.md) authorizes first-class kg/lb and its
bounded additive schema plan. That explicit extension overrides this section's earlier
schema restriction only for those unit fields; all other boundaries remain.

Before editing, the complete v3.0 packet was copied to the off-repo local visualization root:
`C:/Users/BigotSmasher/.codex/visualizations/2026/09/04/01a06b2a-450e-79d2-9ae9-dd4e4b53be54/chart-v3-approved-before-uniformity`.
Its 18 source hashes match the pre-edit sources and its manifest verifies. Two files were
restored into `chart-v3-approval-restore-sample` beside it and their hashes matched. Nothing
was pruned. This is explicit copy/read-back preservation, not automatic hook coverage or
an off-machine backup. Original manifest SHA256:
`09d550b80860bcd5d6662cc4d9266ba1a4924e53df4144649b5ee1ccde8d6df5`.

Approved static reference hashes (SHA256):

| File | Frozen hash |
|---|---|
| preview.html | 457a107695e93a57d896b8e0756092641f4b7ddbc6a5ffbcce3b50a9728aa0ac |
| preview.css | b1a5ef74eca075718c050c20523c1d3810f1ca327777a1f7d4773c50924893fb |
| preview.js | ee6e5ec11bd2ecdb67929563238cf6c18c641ea6b75561ec02464befc7c82076 |

Use the study as visual direction, not as production code or a pixel-diff test against
fallback fonts. It contains synthetic data. Wireframes, metric rules and accessibility
contracts remain binding; no new concept selection is required.

## What must be identical, and what may differ

| Layer | Single source / invariant | Permitted variation |
|---|---|---|
| Frame | Existing SwanChart; one header/body/footer/action owner; no nested old ChartCard | Overview hero, standard card, compact preview using centrally defined sizing variants |
| Theme | Existing swanChartTheme and resolved lens palette; portals inherit originating palette | Existing user-selected lens; same lens yields same chart chrome everywhere |
| Type and spacing | Heading/UI/data font roles, spacing scale, chrome edge, radius and focus from shared tokens | More width/height for long labels, dense tables or wider time range |
| Data marks | Shared series roles, axis/tick/tooltip/legend treatment; gold only for eligible records | Line, bar, scatter, donut, radar or heatmap when the metric warrants it |
| Interaction | Same placement/order/names for table, expand, source and permitted export; 44px targets | Hide inapplicable actions or explain disabled prerequisites; never show inert buttons |
| State | Common loading/empty/partial/error/stale/locked/denied grammar and layout | Metric-specific explanation/CTA; no client logging prompt on a revenue error |
| Evidence | Honest unit, time basis, as-of, source, coverage and accessible data mirror | Role-authorized detail; different denominators explicitly named, never merged silently |
| Motion | Calm data surfaces; reduced-motion before first paint; one existing save confirmation | No decorative loops, pointer glints, hover-only tools or new celebration system |

Shared styles belong under `Charts/swan`, not copied into each dashboard's stylesheet.
Compatibility adapters can accept legacy payloads but must delegate visual rendering to
the same frame/theme. They cannot export a second independently editable palette or theme.
No new chart library. BodyMap anatomy and a scalar progress indicator are not automatically
time-series charts: classify their job, retain useful interaction, and unify their surrounding
card/evidence controls without forcing them into an unsuitable Victory geometry.

Do not make a pie and a line graph look mathematically identical. Uniformity is recognizable
presentation and predictable behavior, not flattening every metric into the same shape.
Do not transplant the client Overview layout or private-client API into every admin screen.

## Data must agree as well as look consistent

Each comparable metric declares a basis tuple: canonical metric ID + semantics version,
source family, authorized subject, inclusion/status filters, local period bounds and timezone,
display unit, exercise/rep filters and source snapshot/as-of. Only equal bases are expected
to yield equal results. A weekly volume, per-session volume and daily volume have related
source evidence but are NOT interchangeable totals until their windows are aligned.

For the same authorized subject and equal basis, client/staff/gallery/home representations
must use the same verified calculator/query or a parity-tested adapter. No separate rounding
or unit conversion in a card body. Round only for display; tables, CSV and drill use the same
unrounded normalized values and explicitly formatted units. Never average averages without
weights. Snapshot differences get a freshness explanation, not a contradictory progress claim.

Reuse existing successful-save events and identity-scoped invalidation. Failed saves do not
refresh or celebrate; duplicate success events are deduplicated. Same-page consumers refresh
coherently. On returning to a route/tab, revalidate according to the approved cache contract;
do not promise instantaneous cross-device push without an existing verified mechanism.
Permission changes/logout/subject switches clear private rows, open detail, story and cache.
Public profile projections never reuse private payload caches or gain staff detail access.

## Complete inventory, not a partial checklist

Use [the adoption register](09-adoption-register.md) as a seed. Luna's S0 reads foundation
dependencies; each S7 entry audit expands/reconciles the whole-product renderer inventory.
Store the implementation inventory as NEW `docs/qa/chart-unification/consumer-inventory.json`
in the chosen build lane. Schema is a JSON object with `schemaVersion: 1`, `baseline`
and nonempty `consumers`. Baseline holds branch, HEAD, observed origin/main, dirty digest,
scan command, timestamp. Each row contains:

```text
consumerId (stable unique occurrence, not merely component name)
cohort / chartId / sourceFile / role / featureFlag
classification (canonical|legacy|dormant|competing)
mountEvidence [{file,line,jsx,route}] / callerEvidence [{file,line}]
dataSource / semanticsVersion / unit / timezonePolicy / capabilities
frameImport / themeImport / primitiveKind / privacyTier
status (unmigrated|blocked|implemented|verified|not-live)
testIds / commandReceipts / screenshots / blocker / owner
```

One component mounted on three role routes requires three occurrence rows or three explicit
mount receipts, never one vague “shared” check. Evidence contains no real client identity.
`not-live` requires source/caller evidence; `verified` requires current test and screenshot
receipts. `competing` cannot be `verified`. New unmatched candidates fail the inventory gate.
Do not count style-only chart utility imports as renderers. Include custom SVG/CSS/canvas,
dynamic registries, import aliases/barrels, sparklines, modal charts, mobile-only/flagged views,
exports and post-save previews. A grep result is a lead; runtime mount evidence determines scope.

NEW deterministic guard `scripts/qa/chart-unification-guard.mjs` must run locally and in the
existing CI pattern once implemented. It reads the inventory, discovers renderer/theme/frame
candidates using the installed TS parser/import graph plus explicit custom-mark entries,
checks imports for migrated scopes, and fails on unexplained additions or stale exceptions.
Do not introduce tooling solely to satisfy this paragraph: reuse installed parser/linter;
missing capability is an S7 tooling question for lead. Test the guard with temporary synthetic
file trees; never inject a deliberate regression into the shared working tree.

Migration exceptions record exact path, reason, owner, expiry or next gate, and canonical
replacement. They may keep an unmigrated scope visible during rollout; they cannot turn it
into a passing full-product adoption row. No blanket directory exemption or empty manifest.
At final adoption, live consumers must all be verified; no live legacy-frame exception remains.
Dormant history can remain without deletion. Cleanup is separately approved S8.

## Mandatory S7 cohort order

1. Staff mirrors, including each client switch/view-as entry: visual and equal-basis data parity.
2. NASM/detailed progress and live gallery: preserve all metrics, source detail and tier gates.
3. Measurement, home, legacy mounted workouts and post-save previews: one source truth and save flow.
4. Nutrition, mobility and recorded pain follow-up: same presentation, separately verified semantics.
5. Revenue/growth/business, social/profile, marketing/security and remaining live candidates:
   retain their own authorization/currency/publication rules; no financial or clinical redesign.

Each cohort enters only after prior shared-frame gates pass. Cohort receipts may justify a
different independent execution order to lead, not silently drop a cohort. Feature flags,
rollback and old endpoints remain until verified replacement and explicit release approval.
Release flags switch a whole surface, not half-old/half-new cards on one page. Test fallback
for staff/public views too; do not assume the client flag governs them.

## Twelve additional acceptance gates

These are specified tests, NOT existing passing tests. They extend the original 44 cases.

| ID | Required test / exact expected result | Layer / slice |
|---|---|---|
| U01 | Discover baseline candidates and resolve every mount; add aliased/dynamic/custom SVG chart fixture → guard fails until classified; empty consumers also fails | guard tests / S7 entry |
| U02 | Mount migrated consumer with old ChartCard/theme or new local theme fixture → guard fails; actual migrated dependency graph resolves to Swan frame/theme | import graph + mounted component / S3,S7 |
| U03 | Render one representative per primitive grammar and every live occurrence at approved lens; shared computed chrome/type/axis/tooltip roles agree, no local hardcoded palette | component + browser / S6,S7 |
| U04 | Switch lens with detail/expand open → portal uses origin chart palette; switch subject/logout → no prior private content in frame/portal/export | browser + auth / S3,S7 |
| U05 | Parameterize every live chart over its applicable ready/empty/partial/error/stale/locked/denied states → honest copy, no fake zeros or log CTA on network failure | mounted component / S4,S7 |
| U06 | Exercise every enabled table/expand/source/export action for each occurrence → real result, no double frame/nested button; unsupported action has no clickable stub | component + browser / S4–S7 |
| U07 | Every route at 320,375,414,768,1024,1440,2560×1440,3840×2160 with long labels → no page overflow/critical clipping; keyboard/table fallback and 44px tools remain usable | browser / S6,S7 |
| U08 | Reduced-motion before paint, forced colors, 200% zoom, keyboard-only → no data animation, marks/focus visible; 4.5:1 text and 3:1 essential graphical contrast | browser / S6,S7 |
| U09 | Equal-basis fixture: two completed sessions same day, one load100lb×8 set each → frequency2, volume1600lb_reps in all comparable client/staff/gallery views; kg conversion ≈725.747792kg_reps; tables/drill/export reconcile | real writer/query + cross-route browser / S1,S2,S7 |
| U10 | Successful save, duplicate event, failed save, navigate away/back → one invalidation per event identity, freshness on reentry, no failed-save point; A→B/revoke/logout never exposes A afterward | integration + browser / S4,S7 |
| U11 | Switch a migrated surface flag off while loading/detail open → abort/clear and complete functional legacy surface, no mixed contract; public/staff boundaries unchanged | browser + auth / S6,S7 |
| U12 | Reconcile final current build inventory and graph → every live occurrence verified, zero unexplained renderer, zero live legacy-theme exception, no expired waiver; mutate to stale/missing evidence → release audit fails | guard + evidence audit / S7 exit |

U09 uses synthetic rows through the real writer in a proven disposable database. It does not
authorize assuming historic WorkoutLog units. Unknown legacy units block that migration.
Different money/nutrition/clinical metrics get separate source fixtures before their cohort
can pass; the training example is not their semantic test. U03/U07/U08 retain screenshot and
computed-style evidence, not just a source-string assertion or a green mocked Victory tree.

## Handoff and honest finish line

Luna returns per-slice changed paths, RED→GREEN commands, inventory delta, source/permission
receipt, screenshots, exceptions, rollback result and next slice. Two failed attempts with
no new evidence, file ownership conflict or missing product/source knowledge triggers the
existing STOP template. Lead may resolve design questions from this approved packet; unknown
production data provenance or new authority goes to Sean, not a guessed adapter.

Client15 passing means client progress is verified. It does not mean all charts are unified.
The whole-product finish line is X04 + U01–U12 + cohort-specific data and authorization gates.
The approved preview remains the reference throughout; no cheaper-model redesign drift.

Hygiene: this revision adds this approval contract and an S0 receipt to the existing packet;
backup and restored samples live only under the named visualization root. No new root files,
screenshots, application artifacts or obsolete-file deletion. Retain the backup until a
later explicitly approved retention review; no automatic cleanup or continuity closeout.

# ROI Safety Services — Weekly Contact Ingestion Agent: Hostile Review + Enterprise Plan v3

**Date:** 2026-09-11
**Status:** PLAN READY v3 (v3 = hostile-review fixes F13–F24 applied 2026-09-11; supersedes v2 same day; see §17 changelog. Companion docs: `roi-safety-plan-v2-hostile-review-2026-09-11.md` (the review), `roi-safety-client-pitch-2026-09-11.md` (clean client-facing pitch), `ai-consulting-business-playbook-2026-09-11.md` (Sean-only business notes))
**Client:** Jessee McClellan, ROI Safety Services (Sean's first AI consulting client)
**Prepared by:** ZCode hostile-review pass over the prior feasibility chat

---

## 1. Preservation note

The original chat (feasibility review + pricing advice, 2026-09-11 ~11:56–12:10) remains the source
of record for its own claims. This doc does not replace its source analysis; it audits it and layers
the enterprise plan. Nothing in the original was deleted or rewritten.

## 2. Verified source evidence (live checks, 2026-09-11)

| Source | Claim in prior chat | Verdict today | Evidence |
|---|---|---|---|
| EPA TRI API | `data.epa.gov/dmapservice/tri.tri_facility/...` works | [VERIFIED] — works, AND the documented `efservice` grammar also works: `https://data.epa.gov/efservice/tri_facility/state_abbr/CA/rows/1:5/json` returned valid JSON | Live fetch |
| TRI contact fields | Assigned Public Contact/Phone/Email exist | [VERIFIED] — `asgn_public_contact`, `asgn_public_phone`, `asgn_public_phone_ext`, `asgn_public_contact_email`, `tri_facility_id`, `fac_closed_ind`, `epa_registry_id` all present | Live fetch |
| TRI email density | "blank emails are valid missing data" | [VERIFIED] — in the live 5-record LA sample, only 1/5 had a populated contact email. Sparsity is the norm, not the exception | Live fetch |
| SMARTS public access | Public data menu exists, no login needed | [VERIFIED] — `https://smarts.waterboards.ca.gov/smarts/SwPublicUserMenu.xhtml` = "Storm Water Data Public Access" incl. "Download NOI Data By Regional Board"; nightly-maintenance note present on the page | Live fetch + search |
| SMARTS download internals | Regional tab-delimited files, headers unknown | [UNVERIFIED] — file headers, email population, and JSF download mechanics remain unproven. Spike item #1 | Not yet downloaded |
| RCRAInfo | HD_REPORTING.zip ~160 MB; HD.zip for history | [VERIFIED] — official page lists HD_REPORTING.zip **160.65 MB**, recommends HD.zip for historical data | https://rcrapublic.epa.gov/rcra-hwip/data-access/csv-downloads |
| Envirofacts longevity | Not assessed by prior chat | [UNKNOWN] — no retirement notice found as of 2026-09-11; EPA consolidates data services periodically. Mitigated by contract tests + drift alarms, not by trust | Search found no sunset notice |

## 3. Hostile review findings

**F1 — Pricing self-contradiction (HIGH, business).** The chat's own phase table sums to
~$10,000–$20,000 of work; it then advises quoting $5,500 — a 45–70% self-discount with no
acknowledgment. A first-client discount is fine; silent 60% underpricing invites scope abuse.
→ Fix: quote $6,000 itemized (expect to close $5,500), hard floor $4,500 only with reduced scope.
§11.

**F2 — Warranty trap (HIGH, business).** "30 days of bug-fix support" on a web-ingestion product
means when SMARTS redesigns its JSF pages in week 6, the client calls it a bug. → Fix: contract
clause: upstream source changes (schema, layout, availability) are change orders ($85–100/hr),
not warranty. Warranty covers Sean's code only. §11.

**F3 — No run-architecture decision (MED-HIGH).** The plan states infra cost but never picks a
runtime. → Fix: GitHub Actions scheduled workflow → containerized worker → raw artifacts to
Cloudflare R2 → SQLite state snapshot per run (single weekly writer; upgrade to Postgres only if
the dashboard phase lands). Zero servers to babysit; run history is auditable. §4.

**F4 — No schema-drift defense (HIGH).** The #1 killer of scraping agents. The flowchart says
"schema valid?" but defines no mechanism. → Fix: versioned per-source data contracts (columns,
types, nullability) committed to the repo; contract check every run; drift blocks publication and
fires an alert; row-count anomaly gate (±30% vs last good run); email-format floor on published
output. §7.

**F5 — No idempotency / atomic publication spec (MED).** "Quarantine candidate" exists, but the
swap semantics are undefined. → Fix: stage-run folder → validation gate → atomic `current` pointer
swap for CSV; staged-tab swap for Sheets. Double-running the same inputs must produce zero deltas
(tested). §7.

**F6 — No silence alarm (MED).** A dead weekly cron is discovered by the client, weeks later. →
Fix: dead-man switch (healthchecks.io free tier) + weekly ops summary email that reports failures
as first-class content. §8.

**F7 — No secrets/data-handling posture (MED).** Sheets service-account key, SMTP creds, R2 keys;
and harvested contact data is personal information under CCPA. → Fix: least-privilege Google SA
(single-spreadsheet scope), secrets only in GH encrypted secrets / env, retention policy (raw
snapshots 12 months, configurable), suppression list honored at publish, documented deletion
workflow. §9.

**F8 — Dashboard inside MVP = scope creep (MED).** Demo screens are for the pitch, not v1
deliverables. → Fix: MVP = CSV + client-owned Google Sheet + weekly email. Dashboard is a phase-2
upsell ($1.5–2.5k). §11.

**F9 — Signal-rate expectation gap (MED, client trust).** TRI updates annually (July 1 reporting
cycle); RCRAInfo exports ~monthly; SMARTS changes most often. A weekly agent will report "no
changes" for TRI most weeks — the client will think it's broken. → Fix: per-source expected
cadence printed in every weekly summary and stated in the proposal. §12.

**F10 — Email population rate is the real product risk (HIGH).** Live evidence today: 1/5 TRI
records had an email. The chat caveats this but never forces quantification. → Fix: the discovery
spike must deliver per-source email-population percentages from real downloads; the proposal sells
"the complete harvestable contact set, refreshed weekly and deduplicated across three registries,"
never "every facility has an email." §12.

**F11 — Two live TRI endpoint styles; standardize (LOW).** Both `efservice` (documented) and
`dmapservice` (used by the client's link family) return valid JSON today. → Fix: build on the
documented efservice grammar with paging; record the other as fallback in the runbook. Add the
contract-test alarm so any EPA migration trips an alert instead of silence.

**F12 — SMARTS mechanics still unproven (agreed with prior chat).** Public menu verified; JSF
download flow, real headers, and email density are not. Off-peak scheduling required (public page
notes nightly maintenance). Spike item #1, built last. §10.

**What the prior chat got right (kept as-is):** public-data-first with no login bypass; two-layer
provenance model (contacts + observations); dedup by source ID first; honest missing-email
reporting; CAN-SPAM/CCPA flags; staged pricing structure. The direction is sound — the upgrade is
integrity, operations, and contract hardening.

## 4. Enterprise architecture v2

```
GitHub Actions (cron, weekly, off-peak PT)
  └─ containerized worker (pinned deps, versioned image)
      ├─ connectors: TRI (API) · RCRAInfo (zip) · SMARTS (regional downloads)
      │    └─ raw artifacts → R2 dated prefix + checksum + manifest.json (immutable)
      ├─ normalize → validate → entity resolution (deterministic IDs → scored match → review queue)
      ├─ delta engine vs canonical snapshot (SQLite per run, snapshotted to R2)
      ├─ publication gate: data contracts + row-count anomaly + email-format floor
      ├─ publish: CSV to R2 (atomic current pointer) + client Google Sheet (staged tab swap)
      └─ notify: weekly ops summary email + healthchecks.io dead-man ping
```

Rationale: no server to maintain; the client can be shown run history; raw snapshots make every
week re-processable when parsing improves, without re-scraping.

## 5. Data model v2 (two layers + run layer)

- `contacts` (canonical, deduplicated business-facing list)
- `contact_observations` (one row per source-specific sighting; full provenance)
- `runs` (run_id, per-source status, counts, gate results, durations, artifact checksums)
- `review_queue` (uncertain merges with match score + rule version + resolution)
- `suppression` (opt-outs; enforced at publish)

Canonical fields as in the prior chat (canonical_contact_id, facility_group_id, source_system,
source_record_id, contact fields, addresses, status, first_seen/last_seen, source_link,
email_format_status, change_status, match_confidence) plus `er_rule_version` so historical merges
can be re-run when matching rules improve.

## 6. Connector conduct policy (all sources)

Identifying User-Agent with contact email; ≤1 req/s; off-peak (SMARTS outside ~20:00–21:00 PT);
bounded retries with backoff; no CAPTCHA/login bypass; no guessed or enriched emails; source
failures retain last good snapshot and are reported, never papered over.

## 7. Publication integrity gates

1. Data contract pass per source (versioned schema, fail-closed).
2. Row-count sanity: total and per-source within ±30% of last good run (else block + alert).
3. Email-format floor on published output (e.g. ≥95% of non-null emails RFC-format-valid).
4. Idempotency: same inputs twice → zero deltas.
5. Atomic publish: stage → gate → pointer/tab swap; failed gate leaves prior publication intact.

## 8. Observability & operations

Structured run manifest per week; weekly ops email = per-source status/counts/durations, delta
summary, gate results, quarantines; healthchecks.io ping so silence = alert; GH Actions failure
notifications as backstop; quarterly source-health review (part of maintenance retainer).

## 9. Security & compliance

Secrets in GH encrypted secrets only; Google SA scoped to one spreadsheet; R2 bucket private;
CCPA-conscious handling (business contacts are still personal information): retention limits,
suppression honored at publish, deletion workflow, access limited to Sean + client. Outbound
marketing email explicitly out of scope; suppression list built so CAN-SPAM handling is ready if
the client later campaigns (their counsel's call).

## 10. Test plan (requirement-linked)

| ID | Requirement | Test | Level |
|---|---|---|---|
| T-C1..3 | R2 provenance | Per-source schema contract fixtures | unit/run |
| T-P1 | R1 parsing | Golden-file parser tests (synthetic fixtures modeled on real headers — no real PII committed) | unit |
| T-ER1..4 | R3 dedup | Merge/review/separate cases: corp-suffix, suite numbers, shared corporate email, cross-source ID hits | unit |
| T-ID1 | R5 integrity | Run twice, same inputs → zero deltas | integration |
| T-CH1..3 | R6 errors | Each source 404/timeout → partial publish + failed-source report, prior snapshot retained | integration |
| T-DR1 | R4 drift | Mutated fixture header → publish blocked + alert | unit |
| T-DEL1 | R4 delta | Constructed before/after sets → correct NEW/UPDATED/UNCHANGED/DISAPPEARED/REAPPEARED | unit |
| T-PR1 | R7 perf | Full CA pipeline < 30 min; RCRA download+parse ≤ 10 min | e2e |
| T-E2E1 | R7 schedule | Real weekly run in dry-run mode | e2e |

## 11. Pricing & contract (revised)

- **Quote $6,000** itemized (expect to close at $5,500). Structure: $1,500 discovery spike
  (credited) + $4,500 balance at handoff; or 50/25/25 if the client prefers milestone billing.
- **Included:** 3 CA sources; weekly scheduled runs; CSV + client-owned Google Sheet; cross-source
  dedup with review queue; weekly new/updated delta + ops summary email; 30-day warranty on
  Sean's code; runbook + handover.
- **Excluded:** dashboard, nationwide scope, email enrichment/deliverability verification, outbound
  email automation, login-gated data.
- **Maintenance:** $250/mo (weekly ops watch, quarterly source-health checks, minor fixes ≤1h/mo).
  **Upstream source redesigns/schema changes = change orders at $85–100/hr — never warranty.**
- **Floor:** $4,500 only if scope drops (CSV-only, no Sheets, 30-day warranty, no review-queue UI).
- **ROI framing for Jessee:** he compiles this manually monthly; the system delivers weekly
  freshness, three-registry dedup, and change flags. Even a few saved hours/month plus
  faster/fresher leads pays the build back inside a year.
- Payment protection: 50% upfront / 25% at working demo / 25% at handoff; change requests billed
  separately; data caveats clause (no deliverability guarantee; coverage = what sources publish).

## 12. Client questions (carry forward + additions)

Prior chat's eight questions remain. Add:
1. Who resolves review-queue fuzzy merges (client or Sean), and how fast?
2. Data retention duration before archives roll?
3. What happens at contract end (export, handover, deletion)?
4. Does the client want the raw weekly archive, or current + delta only?
5. Per-source acceptable freshness (weekly SMARTS, monthly-ish RCRA, annual-cycle TRI)?

## 13. Demo upgrade — numbers sell better than mockups

The spike output IS the demo: real California numbers — N facilities harvested, X% with
harvestable emails, Y% appearing in 2+ registries, sample deduplicated Sheet, one simulated weekly
delta. That is more convincing than any mock dashboard and de-risks the sales conversation with
honest coverage data.

## 14. Delivery slices

- **S0 discovery spike (2–3 d):** SMARTS one-region download + TRI CA pull + RCRA HD_REPORTING CA
  extract; real headers; per-source email-population report; cross-source duplicate report; one
  simulated delta run; one intentionally-broken-source rehearsal. **Exit: GO/NO-GO per source +
  coverage stats.**
- **S1 TRI connector → normalize → SQLite → CSV + manifest** (exit: CA e2e + idempotency green).
- **S2 RCRA connector** (zip → CA filter → merge) (exit: 2-source e2e).
- **S3 SMARTS connector** (JSF download flow, off-peak) (exit: 3-source e2e).
- **S4 ER/dedup + review queue + delta statuses** (exit: merge-audit sample reviewed).
- **S5 Sheets publish + ops email + healthchecks + drift gates** (exit: gate suite + chaos green).
- **S6 hardening + client UAT + runbook + handover** (exit: UAT sign-off).
- **Phase 2 upsells:** status dashboard ($1.5–2.5k), nationwide scope, enrichment, historic backfill.

## 15. Traceability

R1 collect contact fields → §5/T-P1 → S1–S3 · R2 provenance (source link + extraction date) →
§5/T-C1..3 → S1 · R3 dedup across sources → §5/T-ER → S4 · R4 weekly new/updated detection →
§7/T-DEL → S4 · R5 CSV/Sheet outputs → §4/T-ID → S1/S5 · R6 run summaries + error log → §8/T-CH →
S5 · R7 weekly schedule → §4/T-PR/T-E2E → S1/S6 · R8 compliance (no guessed emails, suppression,
PII handling) → §6/§9 → all slices. No uncovered requirements; wireframes N/A for v1 (no UI in
MVP — dashboard deferred to phase 2; prior chat's demo screens remain available for the pitch).

## 16. Wireframes

N/A for v1 (MVP has no UI; outputs are CSV + Google Sheet + email). The prior chat's desktop/mobile
mock screens remain the pitch asset for the phase-2 dashboard and inherit the house standards
(44px targets, dark-first, keyboard-accessible, mobile card layout) if built.

## 17. v3 changelog (fixes adopted from the v2 hostile review)

- **F13 → §4:** GH Actions auto-disables scheduled workflows in public repos after 60 days of no
  activity [VERIFIED via GitHub docs]. Monthly keepalive commit added — touching a dedicated
  non-data file only; run data never lives in git (R2 only), so even a public repo cannot leak
  client data; repo private by default; healthchecks.io stays as the detection layer; design
  must not depend on repo visibility. *(Amended by review 2/F25: the original v3 wording —
  "run-manifest touch" — was itself a leak vector.)*
- **F14 → §4:** explicit snapshot protocol — fetch last SQLite snapshot from R2 at run start,
  conditional-PUT (checksum guard) at end; `concurrency: group=weekly-run,
  cancel-in-progress=false` at the workflow level.
- **F15 → §5/§7:** Sheets tab ownership policy — machine-owned tabs (Contacts, New & Updated,
  Run Summary, Errors, Source Observations) overwritten weekly; human-owned tabs (Suppression
  List, Notes) never written by the system. Swap sequence: rename old tab to `_prev` → write the
  new tab under the live name → delete `_prev` — a crash at any step leaves a complete live tab.
  *(Amended by review 2/F27: the original v3 wording — delete-then-write — left a window with no
  tab at all.)* Documented in runbook and in the sheet itself.
- **F16 → §6:** check RCRAInfo export timestamp before downloading 160 MB; skip unchanged weeks.
  Direct-URL stability added to spike items.
- **F17 → §9:** CCPA wording corrected — B2B exemption [LIKELY] covers most of this use; keep
  hygiene + counsel check; drop alarmist framing from all client-facing copy.
- **F18 → §7:** suppression keyed on normalized email (exact) + optional source_record_id,
  enforced at both CSV and Sheet publish; suppression is a human-owned tab (survives swaps).
- **F19 → §7/T-ID1:** idempotency redefined — identical raw artifacts reprocessed produce
  identical entity resolution, canonical records, and change statuses; only run-metadata fields
  differ.
- **F20 → §11 + pitch:** discovery call captures client's manual-hours cost and lead value; ROI
  table with client-corrected assumptions added to the pitch.
- **F21 → §11:** fallback ladder — 2-source MVP (TRI + RCRA) at $4,500 with SMARTS as a $1,500
  add-on when feasible; never a 1-source offer (cross-source dedup is the product).
- **F22 → §10:** tests T-S1 (Sheets swap crash recovery), T-S2 (suppression enforcement at both
  publish paths), T-R1 (R2 snapshot restore + corruption handling) added.
- **F23 → §4:** run slot fixed at Sunday 14:00 UTC (≈6–7am PT, safely outside the SMARTS
  ~20:00–21:00 PT maintenance window; UTC cron, DST noted).
- **F24 → §11:** retainer terms state business-days monitoring with paused-weeks allowance;
  dead-man alerts route to Sean; runbook documents manual re-trigger for the client.

## 18. Review 3 amendments (2026-09-11) — probe results + spike method changes

Live probes (see `roi-safety-plan-v3-hostile-review-3-2026-09-11.md` for method):

- **TRI [VERIFIED]:** count endpoint works — `TOTALQUERYRESULTS: 5110` CA facilities; exact
  pagination = 6 pages of 1000. Deep paging (`rows/9000:9001`) returns a well-formed empty
  array, not an error — pipeline termination condition = "empty page," and overshoot is safe.
- **SMARTS [VERIFIED — risk raised]:** the public menu's "Download NOI Data By Regional Board"
  is a JSF `commandLink` posting to `#` — no bookmarkable URLs. The connector cannot GET a file
  directly; **S0 spike must trace the postback in a browser with network capture** and record
  what the flow actually returns. Maintenance note verified verbatim ("8 pm - 9 pm... Data may
  be inaccessable") with **no timezone stated** — PT inferred; run slot keeps a wide margin
  (Sunday morning PT stands).
- **RCRAInfo [VERIFIED — risk raised]:** the csv-downloads page is JavaScript-rendered (static
  fetch returns only the page title — no hrefs, sizes, or timestamp). Zip-URL discovery via
  network trace is now a confirmed S0 task, not hypothetical.
- **Timeline caveat (F37):** slice estimates S1–S6 sum to 15–24 working days; the pitch now
  states 3–4 weeks, up to 5 if SMARTS proves complex — confirmed at end of Phase 1, covered by
  the pre-build re-quote clause.
- **Change-order rates (F38):** retainer clients = preferred rate + priority response;
  non-retainer = standard rate + best-effort scheduling.
- **Loop termination (F40, pre-registered):** no further document-level hostile reviews. Next
  review attaches to S0 spike output, client feedback, first code slices, or external source
  changes.

## 19. Review 4 amendments (2026-09-11) — drift sweep + contract edges

**Governance:** Sean's instruction ("keep hardening until we find nothing") supersedes F40's
pre-registered termination. **New stop rule: the loop ends at the first review round with zero
new findings.** Round 4 produced 6 (1 HIGH) — arc: 12 → 9 → 7 → 6.

- **F41 → §4/§8:** keepalive redesigned from prevention-only to per-run prevention: the weekly
  run itself commits a bare heartbeat file (date + status, zero client data — F25 leak rule
  preserved) on every success, so repo activity resets continuously and the 60-day disable
  clock never matures. A separate monthly keepalive job is removed (it dies with the schedule
  it is meant to protect). Recovery path made explicit: healthchecks alert → Sean (collaborator
  on the client-owned repo) manually re-enables — the runbook documents *re-enable* as distinct
  from F24's *re-trigger*.
- **F42 → pitch:** timelines assume client inputs within a few business days; client-side delay
  pauses the clock.
- **F43 → pitch + playbook contract kit:** cancellation after kickoff — kickoff payment
  non-refundable, completed work settled at the preferred change-order rate.
- **F44 → §11:** the two $4,500 configurations are named and never both on the table: **Floor A**
  = 3-source, CSV-only, no review-queue UI; **Fallback B** = 2-source (TRI + RCRA), full-featured,
  SMARTS as a $1,500 add-on if feasible.
- **F45 → §11:** retainer paused-weeks allowance defined: up to 4 paused weeks per retainer
  year; beyond that, pause/resume by agreement.
- **F46 → pitch:** acceptance checklist now includes the technical provenance (source
  observations) tab, matching the F15 five-tab mandate; labeled audit material, not daily-use.

## 20. Review 5 amendments (2026-09-11) — promise audit + hostile-buyer pass

Arc: 12 → 9 → 7 → 6 → 4 findings (0 HIGH this round). Loop continues per §19 stop rule.

- **F47 → §5 + S0 scope:** pitch's "direct link to the source record" promise reworded — source
  record identifiers (WDID / TRI Facility ID / EPA ID) always; direct links where the source
  provides them. Driver: review 3 proved SMARTS navigation is JSF postback — per-facility deep
  links may be unconstructible there, so the client-facing promise is now keepable in every
  outcome. New S0 deliverable: capture each source's real per-record link pattern, or record
  its absence.
- **F48 → pitch:** GitHub demystified at the ask (free Microsoft-owned automation platform;
  contact data never in any public code site) — preempts the buyer's "coding site?" anxiety.
- **F49 → pitch FAQ:** cheap-alternative defense added ("why not download the files
  ourselves?") — sells dedup + change detection + survivability, not the downloads.
- **F50 → policy recorded:** the change-order rate number is quoted at SOW time and never
  printed in the pitch (deliberate anchoring discipline; now written down instead of
  accidental).
- **Governance (stop rule, anti-gaming):** findings must be real defects — neither padded to
  look rigorous nor zeroed prematurely for convenience. A genuinely clean round ends the loop.
- **Sean directive (2026-09-11):** all quoted timelines carry +1 buffer week; Sean delivers at
  the honest internal estimate (early delivery = trust). Applied: pitch Phase 2 now quotes 4–5
  weeks (up to 6 if SMARTS proves complex); honest estimates live only in the Sean summary and
  the playbook. Simple-language summaries for Sean and the client added
  (`roi-safety-plan-summary-sean-2026-09-11.md` / `roi-safety-plan-summary-client-2026-09-11.md`).

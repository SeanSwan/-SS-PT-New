# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/CLASSROOM-HERMES-RADAR-PANEL-PACKET-2026-08-21.md
**Seed:** (none)
**Tokens:** 3302 in / 3591 out | **Cost:** ~$0.0638 | **Wall:** 23.2s | **finish_reason:** stop

---

**VERDICT: REVISE** — The architecture intent, pedagogy doctrine, and marketplace boundaries are sound, but the plan must not ship any cloud-connected path until the egress broker passes its own stated gate, several hardware/model claims are unverified, and the daily workflow is still ~30% too heavy to survive real teacher fatigue.

---

## Top Ten Findings (severity × leverage)

1. **The egress broker is the entire privacy story and is unproven (P0).** Every other control is downstream of it. The packet correctly labels it BLOCKED/UNPROVEN; my review confirms nothing else may connect to cloud providers until two clean hostile rounds pass. This is the gating finding.
2. **"Semantic re-identification and cohort uniqueness" detection is asserted, not specified.** A class of ~12 two-year-olds in one Anaheim classroom is re-identifiable from age + schedule + a single unusual detail even with all names stripped. The broker spec needs a concrete rule: *no child-specific narrative content leaves the Mac at all, redacted or not.* The packet says this in §7.3 but §7.1's architecture (broker "below every path") implies redaction-then-send is sometimes acceptable. Resolve the contradiction in favor of: child-specific content is local-only, full stop; the broker only sanitizes *teacher-authored generic* material.
3. **Qwen 3.8 27B as local default is unverified and likely wrong on 24 GB.** ~19 GB weights + KV cache + macOS overhead on a 24 GB unified-memory Mac will swap or fail. Unverified claim — verify by measuring tokens/sec and memory pressure on the actual machine. On 32 GB it is plausible but leaves little headroom for Hermes + browser + OS. Treat 27B-local as an experiment, not a default.
4. **The daily briefing spec is too rich.** Eight sections with confidence labels and source links is a document, not a 3-minute briefing. Teachers of two-year-olds have fragmented attention; the artifact that survives is a card with 3 ideas + 1 safety line + 1 deal. Everything else moves to the weekly board or an on-demand "expand" action.
5. **No offline-degradation runbook.** The packet asserts a "local/offline floor" but never defines it. If the GPU server, radar, and broker are all down, what exactly works on the Mac? This must be enumerated and tested, not implied.
6. **Radar's "merchant offers" job has no compliant data source specified.** Newsletters and public product pages are fine; but "compare teacher stores, craft stores, discount stores" at scale implies scraping retailer sites whose terms are not cited. Only Meta/OfferUp/Craigslist terms are baselined. Each retailer source needs a terms check before inclusion.
7. **Used-item safety checklist exists but has no recall-lookup mechanism.** "Flag recalls" requires an actual source: CPSC recall data (cpsc.gov/Recalls, which offers public recall listings; verify any API/feed terms before automating). Without a named, terms-checked recall source, this is aspiration.
8. **Feedback loop will die first.** "used / adapted / skipped / engaged / too hard / revisit" is six fields per activity. Under fatigue, teachers abandon structured feedback. Reduce to one tap: 👍 / 👎 / skip, with optional voice note transcribed locally.
9. **No threat model for the Mac itself.** Hermes tools run with user filesystem authority; the teacher's Mac will also hold child-specific notes. A malicious or buggy skill, or a compromised radar-sourced attachment, reaches child data without ever crossing the broker. Local sandboxing and a separate macOS user account for Hermes are missing from the plan.
10. **The plan never asks who maintains this.** Cron jobs, model updates, broker policy versions, recall feed changes, macOS upgrades — a teacher will not do this. Name the operator (presumably the family infrastructure owner), define an update cadence, and define what happens when the operator is unavailable.

## Must-build-now / Next / Later / Reject

| Item | Disposition |
|---|---|
| Local-only Hermes profile on Mac (own home, own keys) | **Now** |
| Offline floor definition + test | **Now** |
| One-tap daily card (3 ideas, 1 safety line) | **Now** |
| Weekly 5-card planner with repeated routines | **Now** |
| Local small-model fallback (see Q7) | **Now** |
| Private GPU server over authenticated overlay | **Next** (after Mac-only workflow is a habit) |
| Egress broker + adversarial test suite | **Next** — gate for everything below |
| Radar: newsletters, merchant feeds, platform-native saved searches, manual save-to-SwanGuard | **Next** |
| Cloud reviewer calls through broker | **Later** — only after 2 clean hostile rounds |
| Email-notification ingestion from marketplaces | **Later** — per-platform terms verification first |
| Automated recall checking via CPSC source | **Later** — verify feed terms |
| Marketplace scraping, CAPTCHA evasion, auto seller contact, auto purchase | **Reject** (permanent) |
| Any child-specific content to external providers, redacted or not | **Reject** (permanent) |
| Silent cloud fallback, automatic paid retry | **Reject** (permanent) |

## Corrected Architecture & Trust Boundaries

- **Zone 0 (Mac, child data):** Hermes profile, classroom notes, rosters, observations. Separate macOS user account for Hermes; tools sandboxed or disabled by default; FileVault on. Nothing in Zone 0 crosses a network boundary in identifiable or narrative form.
- **Zone 1 (private overlay):** GPU server (Qwen 3.8 27B), radar station, SwanGuard. Authenticated overlay only, no public endpoints. Receives: sanitized themes, supply lists, generic activity queries, teacher-authored non-child text. Never receives rosters or child narratives.
- **Zone 2 (broker):** single egress point, default-deny, fail-closed, receipt-only logging, canary tokens, no fallback. Handles only Zone-1-originated, already-generic content; re-checks anyway.
- **Zone 3 (external):** cloud reviewers, merchant feeds, newsletters. Receives only synthetic/sanitized planning material.
- **Hard rule:** redaction is a defense-in-depth layer, not a permission slip. Child-specific content is blocked by *classification*, not by *cleaning*.

## Corrected Daily / Weekly Workflow

**Daily (target ≤90 seconds):** one card — (a) today's rhythm + one pressure point, (b) one activity with 2-minute setup version, (c) one movement/calm-transition idea, (d) one safety/allergy/choking line, (e) optional deal. "Why this fits two-year-olds" and sources behind a single expand tap. One-tap feedback: 👍/👎/skip.

**Weekly (≤20 min):** five day cards reusing 3 core routines with small variations; supply list pre-bucketed (have / substitute / borrow-free / buy); one adaptations line per card (communication, mobility, sensory); print-friendly. Teacher edits by deleting, not writing.

## Pedagogy & Toilet-Learning Corrections

The doctrine in §4 is largely correct and well-aligned. Corrections/additions:

- **Anchor observation to DRDP**, not informal checklists, if the program is California-funded — but keep DRDP documentation a *teacher* task; the assistant may draft language, never assign levels autonomously. [CA Desired Results](https://www.cde.ca.gov/SP/CD/ci/desiredresults.asp)
- **Add explicit dual-language learner guidance**: support home language, don't treat code-mixing as delay. [NAEYC DAP](https://www.naeyc.org/resources/position-statements/dap/contents)
- **Screen-time framing is right**; make it explicit that the assistant never generates content *for* children to consume on screens. Consistent with AAP/NAEYC joint-position caution on media for under-3s (verify current AAP media policy wording before citing in school documents).
- **Toilet learning:** the doctrine matches AAP readiness-based guidance — readiness signs over age, no punishment/shame, family coordination. [HealthyChildren/AAP](https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/the-right-age-to-toilet-train.aspx). Add: diapering/toileting sanitation and supervision ratios are **licensing-regulated** in California — the assistant must never suggest schedule changes that affect ratio or sanitation compliance without director sign-off. [CDSS child-care regulations](https://www.cdss.ca.gov/inforesources/letters-regulations/legislation-and-regulations/community-care-licensing-regulations/child-care)
- **Embedded learning in routines** is correctly emphasized. [Head Start ELO](https://headstart.gov/publication/embedded-learning-opportunities-faqs), [Effective Practice Guides](https://headstart.gov/school-readiness/effective-practice-guides/effective-practice-guides), [CA Infant/Toddler Foundations](https://www.cde.ca.gov/sp/cd/re/cddpublications.asp), [Serving Two-Year-Olds FAQ](https://www.cde.ca.gov/sp/cd/ci/serving2yofaqs.asp), [CDC milestones](https://www.cdc.gov/act-early/milestones/2-years.html)
- **Missing:** explicit bite/behavior-incident handling doctrine (two-year-olds bite; the assistant must never generate behavior plans or consequence language — only environment/prevention suggestions, with incidents escalated per school policy).

## Radar Sourcing Strategy (compliant)

- **Allowed now:** merchant newsletters/email subscriptions ingested from the teacher's own inbox; public product pages opened by the user; platform-native saved searches with push/email alerts (Meta, OfferUp, Craigslist all offer these — verify current feature availability); manual "save to SwanGuard" bookmarklet; CPSC recall listings (verify feed terms); teacher-store sale flyers.
- **Allowed with verification:** any retailer API or affiliate feed — read each ToS first; do not assume.
- **Prohibited:** automated collection against [Meta's automated data collection terms](https://www.facebook.com/legal/automated_data_collection_terms), [OfferUp ToS](https://offerup.com/terms), [Craigslist ToS](https://www.craigslist.org/about/terms); CAPTCHA evasion; proxy rotation; automated seller messaging; any purchase without human action.
- **Scoring:** price/condition/safety scoring runs only after the human supplies a link or opens a listing — the radar scores, it does not harvest.

## Mac Installation Sequence (with rollback & gates)

1. **Verify hardware/OS:** RAM, free disk, macOS ≥14 (per [Ollama macOS docs](https://docs.ollama.com/macos)). Gate: recorded specs.
2. **Create dedicated macOS user + Hermes profile** per [Hermes profiles docs](https://hermes-agent.nousresearch.com/docs/user-guide/profiles); verify Desktop artifact version against source before installing (packet's own warning). Gate: two processes never share a home; profile isolation test.
3. **Install smallest viable local model first** (see Q7), measure tokens/sec and memory pressure. Gate: interactive responsiveness with Hermes + browser running.
4. **Disable all cloud providers and network tools by default.** Gate: canary test proves no egress.
5. **Build daily card + weekly planner workflow; run 2 weeks offline.** Gate: teacher uses it ≥4 days/week.
6. **Add private GPU server over overlay.** Gate: auth test, no public endpoint scan.
7. **Build broker + adversarial suite; two clean hostile rounds.** Gate: only then enable cloud reviewer calls.
8. **Rollback at every stage:** previous stage remains functional; each stage is independently revertible (profile backup before each change).

## Privacy Attack Paths & Required Tests

Paths: (a) tool-result callback leaking notes; (b) OCR/attachment path bypassing text sanitizer; (c) streaming/multipart chunking splitting identifiers across sanitizer windows; (d) Unicode/homoglyph/nickname evasion; (e) prompt-history accumulation re-identifying a child; (f) radar-sourced attachment carrying malware into Zone 0; (g) Hermes skill with filesystem authority reading child notes into a cloud prompt; (h) silent fallback on local-model failure; (i) logs capturing redacted text; (j) cohort-uniqueness re-identification from "sanitized" narratives.

Tests: the §7.7 synthetic suite is good; add streaming-chunk boundary tests, attachment/OCR tests, accumulated-context tests, canary-bypass attempts from *inside* Hermes tool execution, and a hostile round run by someone who did not build the broker. Two consecutive clean rounds, reproducible, before any cloud use. "100% safe" remains a prohibited claim.

## Adoption Risks & Simplifications

- Fatigue → one card, one tap, expand-on-demand.
- Novelty decay → weekly board is the anchor habit; daily card is optional on hard days.
- Maintenance burden → named operator, monthly update window, "operator unavailable = offline floor" rule.
- Trust calibration → every suggestion labeled generated vs. sourced; teacher decision always visible.
- Over-scoping → cut "community resources" and "field trips" from v1 radar entirely.

## Answers to §10 (condensed where covered above)

1. See findings 4, 8, pedagogy section (add biting/incident doctrine, DLL guidance, DRDP boundary).
2. See corrected workflow.
3. Radar/GPU/SwanGuard: generic themes, supplies, teacher-authored non-child text. External: synthetic/sanitized only, post-broker. Child-specific: Mac only.
4. See radar strategy.
5. Minimum checks: choking-hazard (small-parts cylinder standard for under-3), CPSC recall match, cleanability, lead/paint risk on older items, tip-over (furniture anchoring), fabric pests, missing pieces, seller/pickup safety, allergy/ingestion for sensory materials. Verify current CPSC small-parts regulation citation before printing in school documents.
6. See install sequence: profile + small local model + offline workflow now; cloud paths disabled until broker gate.
7. **No — not as a blanket default.** 24 GB: choose a smaller explicitly-approved model (e.g., a 7–14B-class Qwen/Llama Q4 — verify exact tags and measured performance on the machine; I will not invent tags). 32 GB: 27B Q4 is plausible but measure; if uncomfortable, keep 27B on the 5090 and run a smaller local model. Never allow silent cloud fallback.
8. One card, three ideas, one safety line, one tap of feedback.
9. School policy/director: toileting plans, ratio-affecting schedule changes, incident handling, vendor approval, DRDP use. Family: any child-specific routine coordination. Medical: allergy plans, referral boundaries. Legal/licensing: sanitation, supervision, used-equipment acceptance. None of these may be concluded by the assistant.
10. Who maintains it; offline floor definition; Mac threat model; biting/incident doctrine; retailer ToS beyond the three marketplaces; what happens when the teacher leaves (data retention/deletion of child notes); cost ceiling for the GPU server; whether the school permits any AI tooling at all — **verify school policy before installing anything**.

## Single Highest-Risk Assumption & Fastest Test

**Assumption:** that redaction/classification can reliably keep child-specific content out of cloud-bound traffic. **Fastest test:** before building anything else, run a one-day hostile exercise — a red-teamer crafts 50 adversarial payloads (nicknames, homoglyphs, nested JSON, OCR'd note photos, indirect references like "the biter in the morning class") against the current partial sanitizers. If any child-identifying content passes, the broker design — not just its implementation — needs rework. This costs one day and de-risks the entire roadmap.

## Confidence Labels & Missing Evidence

- **High confidence:** pedagogy doctrine alignment (sources cited); marketplace prohibitions (terms linked); 24 GB insufficiency for 27B local (arithmetic, but verify on-device).
- **Medium confidence:** 32 GB viability of 27B Q4; platform-native saved-search feature availability (verify per platform).
- **Unverified / must not be asserted:** exact model tags, measured tokens/sec, retailer ToS beyond the three cited, CPSC feed terms, school AI policy, Hermes Desktop artifact currency, local store availability in 92807. Each is marked above with its verification method.

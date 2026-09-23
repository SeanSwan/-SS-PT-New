# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/CLASSROOM-HERMES-RADAR-PANEL-PACKET-2026-08-21.md
**Tokens:** 3205 in / 19719 out (reasoning: 13413) | total 22924
**Wall:** 495.5s

---

VERDICT: REVISE

# PART A — Answers to the Ten Questions

## Q1. What is developmentally wrong, unsafe, over-ambitious, or missing?

**Wrong / drifting:**
- The five-themed-day weekly board is a preschool-ism. Two-year-olds need stable activity arcs repeated across 2–3+ weeks with micro-variations, not five novel experiences. The packet's own doctrine ("repeated core routines with small variations") contradicts its "five day cards" deliverable; the deliverable should be revised, not the doctrine.
- "Observable signs" per child, even ungraded, invites surveillance-shaped use. The daily card should contain **observation prompts for the teacher** ("notice who attempts two-word combinations during snack"), never structured per-child data capture. Child-specific observation storage should not exist in v1 at all.

**Missing:**
1. **Care routines as curriculum**: mealtime, handwashing, diapering/toileting, and rest are the toddler curriculum core, not transitions around it. The packet lists them as self-help domains but the daily-briefing spec has no slot for them. See [CDE Infant/Toddler Foundations](https://www.cde.ca.gov/sp/cd/re/cddpublications.asp) and the [CDE serving-two-year-olds FAQ](https://www.cde.ca.gov/sp/cd/ci/serving2yofaqs.asp).
2. **Separation/reunion support** — arrival and departure scripts belong on the daily card; emotional security is the load-bearing domain at age two.
3. **Serve-and-return language framing** — the plan says "back-and-forth conversation" but the daily card should name it as the primary language intervention ([Harvard Center on the Developing Child](https://developingchild.harvard.edu/science/key-concepts/serve-and-return/)).
4. **A hard age-screening rubric for found ideas** (the Pinterest problem): most "2-year-old" content online is for 3–4s. Required filter: 1–3 steps, adult-prepped, process-not-product, no cut-and-assemble crafts, group time ≤ ~5 minutes and voluntary, materials pass the small-parts test ([16 CFR Part 1501](https://www.ecfr.gov/current/title-16/chapter-II-subchapter-B-part-1501) — objects fitting a ~1.25" cylinder are small parts for under-3).
5. **Named material ban list**: water beads (CPSC warnings and multiple recalls — verify current bulletins at [cpsc.gov/Recalls](https://www.cpsc.gov/Recalls)), latex balloons, high-powered magnets, button batteries (ingestion emergency — Poison Control 1-800-222-1222), cords/strings/drawstrings, any non-age-graded small parts.
6. **Allergy checking must not be an LLM judgment call.** The allergy roster is child-specific; it must never enter a prompt (local or cloud). Run a deterministic, local code lookup against the roster that emits pass/fail flags the model reads. The plan as written implies the model does the checking — that's wrong and unsafe.
7. **Dual-language supports** as a first-class output (Anaheim classroom): CDE's *California Best Practices for Young Dual Language Learners* (find current link via the [CDE publications page](https://www.cde.ca.gov/sp/cd/re/cddpublications.asp) — verify). Home-language composition is cohort data → stays local.
8. **Supervision rule**: the tool is never touched during active supervision; the card is generated the night before and printed. A screen-competing-with-supervision failure is a licensing/safety incident, not a UX bug.

**Over-ambitious:** five interacting systems (Mac + 5090 + Radar + SwanGuard + broker) before one teacher has used one card for two weeks.

## Q2. What should the daily/weekly experience actually look like?

**Daily — target 60–90 seconds, not three.** Auto-generated at a fixed evening time (no teacher action), one page, printable: today's rhythm + one pressure point; one activity in 2-minute and rich versions with substitutes; one movement song; one transition cue; one care-routine focus; deterministic safety flags (allergy/choking/sanitation) rendered as icons; "why this fits twos" in one line with source links. Feedback is **one tap**: used / adapted / skipped / again. No logins, no model choice, no settings visible, ever. If she does nothing, the card regenerates tomorrow without nagging.

**Weekly — Sunday, ≤15 minutes:** five cards auto-drafted from the current multi-week arc; teacher reorders, swaps, or accepts; shopping list auto-derived (must-have / substitute / borrow / optional); a printable substitute-teacher page per day. The system's job is to make her *edit*, not compose.

## Q3. What may reach each tier?

- **Radar (Tier 3):** public-web inputs only, by construction. It may receive: theme words from a **controlled vocabulary**, generic material nouns, season/week, campus ZIP for radius search. It must never receive free text derived from teacher notes — see Q4/§B.7. No rosters, no observations, no allergy data, no family names, no cohort composition.
- **Private 5090 server (Tier 2):** sanitized drafts, generic pedagogy questions, plan critiques — **no direct identifiers and no pseudonymous child narratives** ("child A who bites" is still a child record). Rationale: a compromised or resold server becomes a longitudinal dossier; defense in depth means identifiers never leave the Mac even over the trusted overlay. Server-side prompt/retention purge required.
- **SwanGuard (Tier 4):** deals, listings, wish lists, saved-search definitions, vendor notes, recall flags. Schema should **physically lack child-related fields**.
- **External reviewers (Tier 5):** **currently nothing** — the broker is P0 blocked/unproven. If it ever passes, external critique may only see fully synthetic plans ("critique this activity for a mixed group of two-year-olds") with zero real-classroom referents. Real child-specific content never reaches external providers regardless of broker state. Honestly assess whether this tier earns its keep at all: the private 27B already provides critique; I recommend rejecting Tier 5 permanently unless a specific capability gap is demonstrated.

## Q4. Radar without violating marketplace terms

Compliant pattern (see §B.7 for full strategy): (1) platform-**native** saved searches/notifications set up by the human ([Meta automated collection terms](https://www.facebook.com/legal/automated_data_collection_terms), [OfferUp](https://offerup.com/terms), [Craigslist](https://www.craigslist.org/about/terms) all restrict automated collection); (2) **email ingestion of notifications the teacher legitimately receives**, in a dedicated deals inbox; (3) **human-initiated link capture** — she pastes a listing URL; Radar fetches the public page once (rate-limited, robots-respecting) or she pastes the text, then Radar scores it; (4) public merchant pages, weekly ads, newsletters, library/resale/charity sources; (5) recall gate via [cpsc.gov/Recalls](https://www.cpsc.gov/Recalls) before any used item enters a recommendation. **Rejected:** scraping, CAPTCHA evasion, proxy rotation, automated messaging/bidding/buying, logged-in page fetching on Facebook Marketplace. No seller contact or purchase without a human action — the human *is* the action.

## Q5. Minimum inventory/safety/recall checks

Every supply recommendation carries: price + seller + new-price comparator; condition; **recall status checked** (CPSC recalls + SaferProducts.gov); manufacturer age grading and small-parts status; material/cleanability note (non-porous, sanitizeable for twos); used-item flags: missing pieces, lead-paint risk (pre-1978 painted items — test kits exist; verify guidance at CPSC), fabric pests (dryer-treat), mold (books), tip-over (furniture must wall-anchor), chew damage. Reject list auto-applied from Q1 item 5. Used cribs/child-sleep furniture: extra scrutiny — drop-side cribs cannot lawfully be resold under the federal crib standard ([16 CFR Part 1219](https://www.ecfr.gov/current/title-16/chapter-II-subchapter-B-part-1219)) — verify applicability with CPSC before accepting any used nursery-class furniture. Source tiers: school-approved/licensed vendors → reputable retail → inspected used → uninspected used (requires in-person checklist).

## Q6. Mac install order and gates

See §B.8. Summary: pre-flight (measure RAM/OS/disk; Time Machine; dedicated standard macOS user; **disable iCloud Desktop/Documents sync for that user**; default-deny firewall) → Ollama + smallest approved model → **Gate A: airplane-mode daily card** → verified Hermes artifact into isolated home, single process → **Gate B: recovery drill** → overlay to 5090 → **Gate C: network capture shows zero non-overlay egress** → Radar templates → SwanGuard schema audit. Broker/external path stays disabled.

## Q7. Is Qwen 3.8 27B a sensible local default?

**No.**
- **24 GB Mac: no.** ~19 GB weights (packet figure; verify tag) + macOS/app overhead (~6–8 GB typical) + KV cache exceeds physical RAM; macOS also wires only ~65–75% of unified memory for GPU by default (version-dependent; measure, and treat sysctl overrides as an experiment, not a design). Expect swap-thrash or load failure.
- **32 GB Mac: marginal, optional tier.** It fits with modest context but will pressure memory when a browser and real apps are open, and large-context generation will be slow. Offer it as "offline deep drafting," not the default.
- **Default:** smallest instruct model in the approved family that passes the digest acceptance test — realistically a 4–8B class at Q4 (~2.5–5 GB, arithmetic estimate; confirm exact tags in the library before naming one). The daily card is a templating/checklist task; it does not need 27B. Rich critique routes to the 5090 when the overlay is up, or queues.
- **Never:** silent cloud fallback (packet already prohibits; hold the line). This preserves the mandatory local/offline floor.

## Q8. Smallest fatigue-proof workflow

Auto-generated night-before card (zero teacher input) + one-tap feedback + auto-accumulating shopping list. Everything else — weekly board, deal digests, Radar, critique — is optional scaffolding that must function if ignored for a week. Print-first. Every visible setting or decision point costs adherence; target **one decision per day** ("swap or accept").

## Q9. What requires school/director/family/medical/licensing/legal confirmation?

- **Toilet learning**: written school policy + the family's plan + director sign-off before the assistant's toilet-learning content is used with any child; consistency between home and program ([AAP/HealthyChildren guidance](https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/the-right-age-to-toilet-train.aspx)); diapering/sanitation procedures per [CDSS Community Care Licensing regulations](https://www.cdss.ca.gov/inforesources/letters-regulations/legislation-and-regulations/community-care-licensing-regulations/child-care) — I am not citing specific Title 22 sections; verify applicable sections with your licensing analyst.
- **Any AI involvement with child information**: director approval; the program's/district's technology and student-records policies (many now address AI — verify, don't assume); if state-subsidized, records-confidentiality obligations (verify with licensing, not a legal conclusion from me).
- **DRDP**: confirm with the director how documentation is produced; recommend an absolute rule that AI never drafts or augments child-specific DRDP evidence — fabricated evidence is a program-integrity failure ([DRDP](https://www.cde.ca.gov/SP/CD/ci/desiredresults.asp)).
- **Developmental concerns**: any concern routes to the program's formal process and family — for under-3s in California that may include Early Start referral via [DDS](https://www.dds.ca.gov/services/early-start/) (verify pathway and current process). The assistant never screens, diagnoses, or labels.
- **Purchases**: school-approved vendor list, spending authority, receipts.
- **Family-facing outputs** (newsletters, translations): accuracy review + family/director norms.
- **Any recording** (audio/photo of children): reject outright; consent questions are unresolved by default.
- **Ratios/water play/field trips**: licensing analyst verification; I won't assert ratio numbers I haven't verified.

## Q10. What did the plan fail to ask?

1. Where does the Mac physically live, and who touches it? (lock, theft, children at the keyboard, licensing-visit readiness)
2. What happens to child-adjacent data when a child leaves, or the school year ends? **No data lifecycle exists.**
3. Does the school already provide planning/documentation tools the assistant would duplicate or conflict with?
4. Has the family/director conversation about AI-assisted notes happened — even local-only?
5. Substitute-teacher usability (printable standalone plans).
6. Success metrics (minutes saved, weekly adherence, teacher-rated usefulness) — none defined.
7. Who owns the lesson plans (teacher IP vs. school records)?
8. Bus factor: what degrades when the family sysadmin is unavailable? Is trusted-identity recovery actually drilled?
9. Sustainability: 5090 electricity/maintenance, who pays, end-of-life.
10. Family-facing language access quality control for translated materials.
11. Teacher accessibility (fatigue, text size, one-handed use while holding a toddler's shoe).
12. An operational definition of "sanitized" with worked examples — the packet uses the word 10+ times and never defines it.

---

# PART B — Required Output

## B.1 Verdict

REVISE — intent and doctrine are sound; the dependency structure, data lifecycle, local model choice, OS-level egress, and pedagogy details are not yet build-ready.

## B.2 Top Ten Findings (severity × leverage)

1. **CRITICAL — External review path rests on an unproven broker.** Restructure so the MVP needs zero external cloud; the broker becomes Phase 5+, and I recommend permanently rejecting child-linked external critique even after it passes (low value over the private 27B, permanent tail risk).
2. **CRITICAL — The egress model ignores the OS.** iCloud Desktop/Documents sync, Handoff, universal clipboard, telemetry, and updater traffic can exfiltrate child notes with no AI call involved. A broker below the AI stack while ~/Documents syncs to iCloud is a Maginot line. Fix: dedicated local user, no iCloud on the data volume, default-deny firewall, network-capture proof.
3. **HIGH — Allergy/safety checks via LLM prompts is unsafe by design.** The allergy roster must be a local deterministic lookup emitting pass/fail flags; it never enters any prompt, local or remote.
4. **HIGH — Radar query generation is an unexamined egress and ToS channel.** Free-text queries built from teacher notes leak content to search engines and invite automated collection. Template/vocabulary queries only, with logged-query audits.
5. **HIGH — 27B is the wrong local default.** Fails on 24 GB, marginal on 32 GB; small local default + 5090 for depth preserves the offline floor and the daily habit.
6. **HIGH — No data lifecycle.** Retention/purge on child departure, end-of-year archive, and records rules are absent; the default trajectory is an accumulating child dossier — the single worst liability in the design.
7. **HIGH — Documentation/DRDP boundary undefined.** AI must never draft child-specific evidence; this needs a written rule plus director confirmation.
8. **HIGH — No supervision rule.** Tool use confined to non-supervision windows; print-first; Mac physically secured; no classroom audio capture ever.
9. **MEDIUM — Weekly board drifts preschool-ward.** Stable multi-week arcs, micro-variations, care routines as curriculum, ≤5-minute voluntary group time, hard age-screening rubric for found content.
10. **MEDIUM — Recovery and bus factor untested.** Trusted-identity recovery drill, degraded-mode definition (overlay down, Radar down, sysadmin away), and school-side ownership questions are unanswered.

## B.3 Build / Defer Table

| Item | Recommendation |
|---|---|
| **Must build now** | Local Mac user + offline digest pipeline (small model, Ollama); deterministic allergy/choking safety-check library; printable daily card + one-tap feedback; controlled theme vocabulary; data vault with retention/purge rules; backups + recovery drill |
| **Next** | Overlay to 5090 (sanitized drafts only, no identifiers); weekly board generator; email-notification ingestion for deals; Radar link-capture scoring; CPSC recall gate; SwanGuard schema with child-field prohibition |
| **Later** | Rich/2-minute dual-version expansion; home-language family outputs (with review workflow); teacher self-coaching scripts; second-hand saved-search queues; vendor price history |
| **Reject** | External cloud critique tier (unless a demonstrated capability gap; even then synthetic-only); any classroom audio/photo capture; autonomous seller contact, bidding, or purchase; any scraping/CAPTCHA/proxy technique; per-child observation capture in v1; deals inside the daily card |

## B.4 Corrected Architecture and Trust Boundaries

```
TIER 0 (Mac, local-only vault; no sync; excluded from all prompts' raw text)
  roster refs · allergy table (code-checked, never prompted) · child-specific
  notes/incident drafts · cohort composition
        │  (deterministic code emits only pass/fail flags + generic categories)
        ▼
TIER 1 (Mac, local, shareable as generic artifacts)
  themes from controlled vocabulary · activity library · inventory ·
  digests/cards · shopping lists · small local model (offline floor)
        │ authenticated private overlay, no identifiers ever
        ▼
TIER 2 (5090 server) Qwen 3.8 27B — sanitized/generic drafts + critique;
        retention purge; encrypted disk (verify family policy)
        │
TIER 3 (Radar machine) template queries on public web; fetch-once on
        human-provided links; NO mounts of Tier 0/1; emits approved artifacts
        ▼
TIER 4 (SwanGuard) opportunity library; schema forbids child fields;
        all actions human-initiated
        ═
TIER 5 (external reviewers) BLOCKED. Broker unproven (P0). If ever enabled:
        synthetic plans only, zero real-classroom referents, ever.
```

Boundary rules: identifiers never leave the Mac (even Tier 2); Radar never sees free text; SwanGuard never gains child fields; no tier may write into Tier 0; macOS-level egress controls enforce all of the above and are proven by capture, not assertion.

## B.5 Corrected Daily and Weekly Workflow

**Night (automatic):** digest job builds tomorrow's card from calendar + inventory + feedback + current arc. Safety flags computed by code. Card exports to PDF and prints.
**Morning (60–90 s):** teacher reads printed card; keeps it on the shelf; one-tap feedback later or never.
**Weekly (Sunday, ≤15 min):** review five auto-drafted cards from the multi-week arc; edit; accept derived shopping list; print substitute pages.
**Continuously (passive):** deal emails accumulate; weekly board surfaces one screened lead; teacher clicks through only if interested.

## B.6 Pedagogy and Toilet-Learning Corrections (citations)

- Anchor everything to the [CA Infant/Toddler Foundations and framework](https://www.cde.ca.gov/sp/cd/re/cddpublications.asp) and [two-year-old guidance](https://www.cde.ca.gov/sp/cd/ci/serving2yofaqs.asp), not preschool curricula; use [CDC 2-year milestones](https://www.cdc.gov/act-early/milestones/2-years.html) to calibrate expectations (language explosion, parallel play, autonomy) — and *against* academic drills (letters/numbers/shape worksheets).
- [NAEYC DAP](https://www.naeyc.org/resources/position-statements/dap/contents): age-appropriateness + individual appropriateness + cultural context; this is the rubric for the age-screening filter.
- [Head Start Effective Practice Guides](https://headstart.gov/school-readiness/effective-practice-guides/effective-practice-guides) and [embedded learning opportunities FAQ](https://headstart.gov/publication/embedded-learning-opportunities-faqs): ELOs belong *inside* routines (diapering→body parts vocabulary, snack→two-word requests), which is why care routines must be on the card.
- Serve-and-return as the named language strategy ([Harvard CDC](https://developingchild.harvard.edu/science/key-concepts/serve-and-return/)).
- **Toilet learning**: readiness signals not age; family plan + written program policy lead ([AAP/HealthyChildren](https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/the-right-age-to-toilet-train.aspx)); neutral language, easy clothing, modeling, no punishment/shame/prolonged sitting, no food rewards, never withhold fluids; accidents are never misconduct; sanitation/supervision per [CDSS licensing](https://www.cdss.ca.gov/inforesources/letters-regulations/legislation-and-regulations/community-care-licensing-regulations/child-care) (verify specific diapering/toileting sections with your analyst); medical questions (constipation, suspected UTI, regression after stress) route to family and health provider — the assistant offers nothing in that lane; when family and program disagree, defer to family + director.

## B.7 Radar Sourcing Strategy (marketplace-compliant)

**Sources:** platform-native saved searches/alerts configured by the human; dedicated deals inbox ingesting notifications she receives; public merchant sale pages, weekly ads, teacher-supply newsletters; library book sales; resale/charity/Reuse organizations (build the local vendor list empirically via map search — I am not asserting any specific store's existence); [Open Library](https://openlibrary.org/developers/api) for book metadata (verify current API terms).
**Method:** teacher forwards or pastes → Radar scores (price vs. new, condition, recall status via [CPSC recalls](https://www.cpsc.gov/Recalls) and [SaferProducts.gov](https://www.saferproducts.gov), safety flags, distance) → screened lead into SwanGuard → human opens, contacts, purchases.
**Prohibited:** scraping, CAPTCHA evasion, proxies, logged-in automation, auto-messaging/bidding ([Meta](https://www.facebook.com/legal/automated_data_collection_terms), [OfferUp](https://offerup.com/terms), [Craigslist](https://www.craigslist.org/about/terms)).
**Pickup safety:** public daytime exchange; many police departments run safe-exchange zones — verify whether Anaheim PD does before recommending; never share home address; cash apps never ahead of inspection.

## B.8 Mac Installation Sequence (rollback + gates)

0. **Pre-flight:** record macOS version (Ollama needs ≥14 per [docs](https://docs.ollama.com/macos) — verify current), exact RAM/free disk, model tag; Time Machine; create standard user `teacher-hermes`; **turn off iCloud Desktop & Documents sync for that user**; enable default-deny application firewall.
1. Install Ollama; pull smallest approved model; build digest prompt. **Gate A:** airplane-mode run produces a complete card; measure tokens/sec and total time with a browser and normal apps open. Rollback: delete model.
2. Install Hermes from a **verified artifact** (packet warns the Desktop download may lag source-level onboarding — compare version strings against [docs](https://hermes-agent.nousresearch.com/docs/) / [profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles); prefer source install if Desktop is stale); isolated home; one process ever; snapshot the home.
 **Gate B:** recovery drill — simulate lockout, exercise trusted-identity recovery, restore from snapshot. Rollback: restore snapshot.
3. Enable overlay to 5090. **Gate C:** packet capture during a full digest cycle shows egress only to the overlay; canary tokens in a fake "child note" are never observed off-box.
4. Radar station: template queries, link-capture flow, recall gate. **Gate D:** query log review — zero free-text queries; zero Tier-0/1 data in any request.
5. SwanGuard. **Gate E:** schema audit — no child-capable fields.
6. Broker/external path: **remains disabled**; enabling requires the packet's own bar plus two consecutive clean fresh-vantage hostile rounds — which do not exist today.

## B.9 Privacy Attack Paths and Required Tests

1. **Paste-the-note** into any prompt → broker/canary tests with seeded child names, nicknames, misspellings, homoglyphs, Unicode confusables, nested JSON, streaming, multipart (packet §7.7 — extend with Spanish-language and Vietnamese-language variants given Anaheim's demographics).
2. **Query egress** via Radar free text → prohibited by construction; audit logs.
3. **Tool-callback smuggling** — model embeds roster text into a fetch URL/params → capture test.
4. **Indirect prompt injection** via fetched merchant page or PDF/OCR telling the agent to "append local notes" → hostile local page battery.
5. **iCloud/Handoff/clipboard sync** of Tier-0 files → network + filesystem monitoring proves no sync of the vault path.
6. **Telemetry/updater phone-home** → firewall default-deny with allowlist.
7. **Log retention** (raw prompts, redacted text) → log inspection; reason codes + hashes only.
8. **5090 prompt-history retention** → purge job verified by timestamped sweep.
9. **Artifact tampering** of the Hermes installer → hash/signature verification in Gate B.
10. **Physical access** to the Mac in the classroom → lock screen, firmware password, vault FileVault (verify enrollment impact).
11. **Email ingestion** quoting family correspondence → strip/flag quoted threads; fail-closed on unknown content type.

## B.10 Adoption Risks and Simplifications

Risks: five-system complexity; novelty decay by October; feedback loop that never gets used; dependency on a 5090 that's down; print culture absent (screen-only cards die during supervision windows); the teacher's planning style overridden rather than supported. Simplifications: **MVP = Mac alone, offline, one printed card/day**; add one subsystem per week only after the previous one survives a school week; deals move out of the daily card entirely; every artifact must degrade to paper.

## B.11 Single Highest-Risk Assumption + Fastest Test

Beyond the already-acknowledged broker: **the assumption that a small local model produces a daily card good enough that the teacher returns the next morning.** If false, the daily habit depends on networked tiers and the offline-floor promise fails. **Fastest test (≤1 week, ~$0):** hand-write the digest prompt today, run it in Ollama on the actual Mac with Wi-Fi off, print five real cards, have the teacher blind-rate them against her current Pinterest/manual search time. Decide the MVP shape from that data before writing any integration code.

## B.12 Confidence Labels and Missing Evidence

| Claim | Confidence | Missing evidence / how to get |
|---|---|---|
| Broker unproven (P0) | High (given constraint) | Reproducible hostile-round results; does not exist yet |
| 27B infeasible on 24 GB / marginal on 32 GB | Medium-High | Measure actual load + swap + tokens/sec on the real Macs; confirm model tag and RAM |
| iCloud sync is an egress hole | High (mechanism) | Filesystem/network capture on the vault path |
| Hermes Desktop staleness | Medium (packet-reported) | Compare artifact version vs. source at install (Gate B) |
| Ollama requires macOS 14+ | Medium (per docs) | Verify current [docs](https://docs.ollama.com/macos) at install time |
| Title 22 specifics (diapering, ratios, water play) | Low — deliberately not asserted | Licensing analyst consultation |
| DRDP documentation rules at her site | Low | Director confirmation |
| School/district AI policy existence | Unknown | Ask director in writing |
| CPSC water-bead/battery/magnet warnings current state | Medium | Search [cpsc.gov/Recalls](https://www.cpsc.gov/Recalls) at build time |
| Anaheim PD exchange zone; local vendor landscape | Unknown | Verify directly; build list empirically |
| Early Start referral pathway for age 2 | Medium | Verify current process at [DDS Early Start](https://www.dds.ca.gov/services/early-start/) |
| Daily-card quality from small model | Low (untested) | Run the B.11 test |

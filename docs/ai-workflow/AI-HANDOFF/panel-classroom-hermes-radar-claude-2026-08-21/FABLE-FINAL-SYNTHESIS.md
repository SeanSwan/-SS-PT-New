# Fable 5 — Final Synthesis: Classroom Hermes + Radar Five-Model Review

**Date:** 2026-08-21
**Final seat:** Claude Fable 5 (`claude-fable-5`) — synthesis authored **in-session** on subscription, $0 additional OpenRouter spend. This is not a model substitution: the handoff's final seat IS Fable 5, and this session runs on that exact model. Recorded in `DECISION-LEDGER.md` D-01.
**Packet:** `CLASSROOM-HERMES-RADAR-PANEL-PACKET-2026-08-21.md`, SHA-256 verified `FF09857BBDD5D86563AC1FA13CBB4ADA26C1DE04E1B16C43F7F1C31855061AE5` before send.

---

## 1. Panel coverage

| Seat | Model ID | Status | Tokens in/out | Cost | Wall |
|---|---|---|---|---|---|
| Kimi K3 | `moonshotai/kimi-k3` (high) | ✅ complete, finish=stop | 3,302 / 3,591 | $0.0638 | 23.2s |
| GLM 5.3 | `glm-5.3` (Z.ai plan) | ✅ complete | 3,205 / 19,719 (13,413 reasoning) | plan credit | 495.5s |
| Grok 4.6 | `x-ai/grok-4.6` (high) | ✅ complete, finish=stop | 3,539 / 14,795 | $0.0958 | 266.1s |
| GPT-5.6 Sol Pro | `openai/gpt-5.6-sol-pro` (high, mode=pro) | ✅ complete | 56,698 / 46,011 | $0.8319 | 356.7s |
| Fable 5 | `claude-fable-5` (this session) | ✅ this document | — | $0 (subscription) | — |

**No failed or missing seats.** All four ran against identical packet bytes, one attempt each, no retries, no substitutions. Qwen (local) was not requested — it is not among the five authorized seats.

## 2. Spend — actual and worst-case

- **Actual OpenRouter spend: $0.9915** (Kimi $0.0638 + Grok $0.0958 + Sol $0.8319). GLM consumed one Z.ai plan credit as authorized. Fable: $0.
- **Cap: $2.50 — held**, with $1.51 headroom.
- **Preflight honesty note:** my zero-call worst-case was ≤$0.77; Sol Pro alone billed $0.8319 because `reasoning.mode=pro` runs multiple internal passes — 56,698 input tokens were billed against a ~4,000-token prompt (~14× amplification). The combined cap was never at risk, but the per-seat worst-case model for Sol Pro was wrong and is corrected in the decision ledger (D-02) so future preflights multiply Sol Pro estimates by ~10×.
- The failed Codex-side attempt's billing remains **UNPROVEN** (per handoff §3); it is not counted here and no evidence about it was found or invented.

## 3. Consensus findings (2+ seats independently; count shown)

1. **(4/4) The egress broker is an absence, not a control.** P0 BLOCKED/UNPROVEN stands. No external-model path, transcription, OCR, attachment, or tool-callback route may exist until the broker passes its gates — and **child-specific content is categorically ineligible for external providers even after the broker passes**. Redaction is defense-in-depth, never a permission slip ("blocked by classification, not by cleaning" — Kimi).
2. **(4/4) Qwen 3.8 27B is NOT a sensible local default.** Rejected outright on 24 GB (19 GB weights + KV cache + macOS overhead); measure-first candidate only on 32 GB. The invariant holds as *Qwen 3.8 on the 5090*; the Mac floor is a smaller, explicitly approved, measured model — or template-only mode (Sol's strongest framing: template-and-retrieval is the most reliable offline fallback). All four flagged that the exact model tag/license/artifact is unverified.
3. **(4/4) The daily/weekly UX as specced would kill the habit.** One card, ≤90 seconds, one invitation, one-tap feedback, print-capable, auto-generated the night before. Five day cards must be five small variations of one repeated core, not five spectacles. **The daily deal is removed from the morning card** (Grok: "that is how the habit dies") — bargains move to a weekly human-approved queue.
4. **(4/4) Marketplace compliance = human-native only.** Platform-native saved searches, a dedicated deals inbox, paste-a-link scoring, manual save-to-SwanGuard. No scraping, CAPTCHA evasion, proxy rotation, or automated seller contact/purchase — ever.
5. **(3/4) The OS is a bigger egress surface than the AI stack.** iCloud Desktop/Documents sync, Spotlight, Time Machine, clipboard, Handoff, telemetry, and updaters can exfiltrate notes with no AI call involved (GLM: "a broker below the AI stack while ~/Documents syncs to iCloud is a Maginot line"). Required: dedicated standard macOS account, iCloud exclusion of the Hermes home, default-deny firewall, network-capture proof. A Hermes profile is an organizational boundary, not a security boundary (Sol).
6. **(3/4) Written school authorization is the real blocker.** Whether facts about enrolled children may reside on a personal Mac or family-controlled infrastructure is a director/policy question that must be answered **in writing before any real classroom note enters any of these systems**. Until then: public/synthetic/generic only.
7. **(3/4) SwanGuard must be structurally incapable of holding child records.** Shared-adult access ⇒ public opportunity library only; the schema should physically lack child-capable fields (GLM).
8. **(3/4) The 5090 gets generic content only.** No child-specific or pseudonymous narratives ("child A who bites" is still a child record — GLM); no prompt logs retaining child facts; the family GPU is not a school records system (Grok, Sol concur).
9. **(3/4) No data lifecycle exists.** Retention/purge on child departure, year-end, teacher departure, device loss — absent. GLM ranks the accumulating-dossier trajectory "the single worst liability in the design."
10. **(3/4) Care routines ARE the toddler curriculum.** Meals, handwashing, diapering/toileting, rest, arrival/separation belong ON the daily card, not around it. CDC milestones are a screener, never curriculum or per-child checklists.
11. **(3/4) Radar output is untrusted input.** Prompt injection via merchant pages/emails is a live path; Radar emits structured cards (title, age-band, materials, safety flags, source URL, verified|generated) — never raw HTML/email into any model context.
12. **(3/4) Maintenance is unowned.** Name the operator; define update cadence; define "operator unavailable ⇒ offline floor."

## 4. Contradictions and rulings (evidence-based)

| Contradiction | Ruling |
|---|---|
| **GLM:** permanently reject the external-critique tier even post-broker (private 27B suffices). **Others:** keep as gated Later. | **DEFER, not permanent reject.** This very panel demonstrates external critique's value on synthetic packets (findings the private stack would not have produced). But GLM's bar is adopted: the tier stays synthetic-only forever, and building the broker path for it requires a demonstrated capability gap over the private 27B. Ledger D-10. |
| **Kimi:** optional voice note, locally transcribed, as feedback. **Sol/GLM/Grok:** voice capture rejected/off by default (background children/family audio). | **REJECT the voice note.** Three seats' reasoning is structural (ambient capture of children cannot be made safe by transcription locality); Kimi's convenience gain is marginal against a one-tap alternative. Ledger D-14. |
| **Daily time target:** Kimi ≤90s, Grok 90–180s, GLM 60–90s, Sol <90s vs packet's "under three minutes." | **≤90 seconds** is the design target; three minutes is the outer bound. Not a real conflict — all four tightened the same direction. |
| **Kimi:** broker handles "Zone-1-originated already-generic content." **Grok/Sol/GLM:** nothing external exists today at all. | No conflict on the end state; sequencing ruling: **the broker is Phase 5+ engineering** (GLM), and nothing goes external meanwhile. The packet's own §7 wording that implied redaction-then-send is sometimes acceptable is resolved Kimi's way: child-specific = local-only by classification, full stop. |

## 5. Unique high-value findings (one seat each)

- **GLM — deterministic allergy/safety checking.** The allergy roster must never enter any prompt (local or cloud); a local code lookup emits pass/fail flags the model merely renders. LLM-judgment allergy checks are unsafe by design. **ADOPT.**
- **GLM — controlled-vocabulary Radar queries.** Free-text queries derived from teacher notes are an unexamined egress channel to search engines. Template/vocabulary queries only, with query-log audits. **ADOPT.**
- **GLM — the ~$0 fastest test.** Run the digest prompt on the actual Mac with Wi-Fi off, print five real cards, teacher blind-rates against her current Pinterest workflow — before writing integration code. **ADOPT** as the first Mac acceptance test.
- **Sol — HMAC-keyed broker receipts.** Raw low-entropy content hashes in receipts permit guessing attacks; use keyed HMAC over approved metadata. **ADOPT** into the gate doc when the broker is engineered.
- **Sol — the 24-row attack-path/test table** (DNS/IPv6/QUIC bypass, streaming race, history leak, backup restore inspection, insider attribution). The most complete test enumeration any seat produced. **ADOPT** as an extension of the gate's §7 program.
- **Grok — dedicated Radar inbox** that never receives parent/school mail, as the only email-ingest surface. **ADOPT.**
- **Grok — acceptance tests that bite:** airplane-mode card render; canaries in dummy notes + egress monitor; prove a second process cannot open the Hermes home. **ADOPT.**
- **Kimi — one-day red-team before broker build:** 50 adversarial payloads (nicknames, homoglyphs, OCR'd photos, "the biter in the morning class") against the *current* partial sanitizers; if the design leaks, rework the design before building. **ADOPT.**

## 6. Blind spots — what NO seat covered

1. **The H0 assistant already exists.** The packet never mentioned it, so all four seats reviewed the Mac as greenfield. Per the H0 runbook, an Ollama assistant (qwen3:14b class) plus the paper system is already installed (or was being installed) on this same Mac, hardened through seven adversarial rounds, with an explicit **"one model, not two"** rule and a **4-of-5-days adoption gate**. Installing Hermes creates exactly the second-assistant fork the H0 review banned, and the H0 adoption-gate results are the single best evidence about what this teacher will actually use. **This must be reconciled with Sean before any Mac install — NEEDS PROBE (ledger D-20), and it is the main reason the verdict below is REVISE.**
2. **Teacher agency in this design round.** Every seat designed *for* her; none asked what she has asked for since H0 shipped. Her real usage feedback (if H0 is live) supersedes all five models' UX theories.
3. **5090 operating cost/lifecycle** — electricity, who pays, end-of-life — touched only glancingly by GLM.
4. **Panel-remit fit:** the seat scripts' *default* remit is code-review-flavored; this run had to hand-override it with a planning remit at dispatch time (`--remit`), which the seats received cleanly. A stored planning-review remit should exist so future panels don't depend on the dispatcher remembering the override (ledger D-21).

## 7. Corrected two-year-old teaching doctrine (consensus)

Anchor to CA Infant/Toddler Foundations + NAEYC DAP + Head Start ELOs — not preschool curricula. Care routines, separation/reunion, serve-and-return language, outdoor play, and repetition ARE the curriculum; embedded opportunities live inside real routines. CDC milestones are family/clinician screening references, never teaching targets, per-child checklists, or AI scoring inputs. DRDP is a program continuum; AI never drafts child-specific DRDP evidence. Observation prompts address the *teacher's attention*, never structured per-child capture (none in v1 at all). Group time ≤~5 minutes and voluntary; process over product; no forced performance, ranking, or diagnosis-flavored language. Age-screening rubric for found content: 1–3 steps, adult-prepped, process-not-product, small-parts test (16 CFR 1501), group time voluntary. Named material ban list: water beads, latex balloons, high-powered magnets, button batteries, cords/strings, non-age-graded small parts. Biting/incident doctrine (Kimi): environment/prevention suggestions only; incidents follow school policy; AI never writes behavior plans or consequence language.

## 8. Corrected Fairmont toileting treatment (consensus)

The public Fairmont FAQ/handbook state preschool students must be fully potty-trained — a **policy discrepancy to resolve with the director in writing**, not a workflow to build around. Until resolved: neutral bathroom routines, easy clothing, privacy-respecting accident support (care events, never misconduct), sanitation/supervision per licensing, handwashing. AI is adult-prep only: it never sets timelines, promises dryness, runs charts, speaks to a child about toileting, or generates a child-specific toilet plan without the authorized representative + written school plan. Medical signals (pain, constipation, blood, regression) route to the family/medical pathway. Child-specific toileting details never reach any external model, and under the SwanGuard rule, never leave the Mac.

## 9. Corrected Radar and marketplace-compliant sourcing (consensus)

Allowlist-first public sources (weather.gov, CDE, NAEYC, Head Start, CPSC recalls + SaferProducts.gov, official library/parks calendars, manufacturer pages, director-named vendors). Queries built from a controlled vocabulary — never free text from notes. Output contract: structured cards with provenance and `verified|generated` labels; never raw HTML/email into model context. Bargains: native saved searches + dedicated deals inbox + teacher-pasted links; Radar scores (price vs new, condition, CPSC recall, cleanability, small-parts, pickup safety) only after a human supplies the listing. Used-item gate: reject mystery plastic, uncleanable plush, recalled/incomplete/modified items; every recommendation carries the Sol evidence schema (identity, age grading, condition, recall status, hazards, cleanability, provenance, stock labeled *unverified until opened by the teacher*). No purchase or seller contact without a distinct human action. Retailer sources beyond the three cited marketplaces each need their own terms check before ingestion (Kimi).

## 10. Corrected teacher workflow (consensus)

**Daily (≤90s, offline-capable, auto-generated the night before, print-first):** rhythm + one cautious pressure point → one play invitation (≤3 materials, 2-minute setup, no-purchase substitute, one "why it fits twos" line with source class) → one care-routine focus → outdoor/movement default + one calm transition cue → deterministic safety strip (choking/allergy-flag/sanitation/supervision) → Use / Swap / Skip. After class: one tap (used/adapted/skipped; optional second tap). No deal. No roster. No prose. If everything is down: yesterday's cached/printed card is success.

**Weekly (≤15–20 min, Sunday):** confirm constraints (3 min) → approve one repeated core with five small variations, care-routine and adaptation checklist standing (8 min) → supplies bucketed have/substitute/borrow-free/buy, shopping capped ~≤3 items in a separate ignorable list (3 min) → commit/print, incl. substitute-teacher pages (1 min). Deals live here, as a screened queue, recalls checked first.

## 11. Corrected Mac/Hermes/5090/SwanGuard architecture (consensus)

Tiered trust with identifiers pinned to the Mac: **Tier 0** local-only vault (roster refs, allergy table read by deterministic code, any child-adjacent note; no sync, no prompts) → **Tier 1** local generic artifacts + small measured local model or template-only floor → **Tier 2** 5090 via authenticated private overlay, generic prompts only, retention purge, never a public listener → **Tier 3** Radar, public web on allowlist, template queries, structured-card output → **Tier 4** SwanGuard, public opportunity library, schema physically without child fields, separate equal-permission identities with individual audit/revocation → **Tier 5** external reviewers, **BLOCKED** (broker P0 UNPROVEN; synthetic-only forever if ever enabled). Hardening: dedicated standard macOS account; FileVault; iCloud/Spotlight/Time Machine exclusion of the Hermes home; default-deny firewall; single-process Hermes home (tested); no shell/messaging/purchase/ambient-capture authority; no silent fallback, no paid auto-retry; human is the sole authority for purchases, family contact, schedule changes, and child records.

## 12. Privacy attack paths and deterministic assurance gates

The gate document's G0–G8 stand, all still BLOCKED. Adopted extensions: Sol's 24-row attack/test table (incl. DNS/IPv6/QUIC/tunnel bypass, streaming race, history leak, backup-restore inspection, insider attribution, credential contamination); GLM's OS-level items (iCloud/Handoff/clipboard capture, telemetry/updater phone-home, 5090 prompt-history purge sweeps, installer hash verification, Spanish/Vietnamese adversarial variants); Kimi's inside-Hermes canary-bypass tests and non-author hostile rounds; HMAC receipts (Sol). Kimi's one-day 50-payload red-team runs **before** broker engineering. "100% safe" remains a prohibited claim; no gate may be marked clean by an LLM vote.

## 13. Smallest first release likely to survive teacher fatigue

One printed card per school day, generated locally the night before with zero teacher action, readable in ≤90 seconds, built from templates + a small measured local model (or templates alone), synthetic/generic data only, with a one-tap outcome. Nothing else — no deals, no Radar, no 5090 dependency, no cloud, no observation capture. Add one subsystem per week only after the previous one survives a real school week (GLM). Success metric: opened 4 of 5 school days with the network off — the same bar the H0 gate already uses.

## 14. Explicit Mac prerequisites and acceptance tests

**Prerequisites (facts, not code):** (a) director's written answer on child data on personal/family devices AND on AI planning tools at all; (b) actual Apple Silicon model, RAM, free disk, macOS version (≥14 for Ollama), FileVault state, ownership/MDM status; (c) H0 reconciliation decision (D-20) + H0 adoption-gate results; (d) Hermes artifact version verified against official docs (stale-DMG warning stands); (e) exact local model tag/license/digest chosen from what the machine actually lists; (f) named operator + maintenance cadence; (g) retention/purge policy written.
**Acceptance tests:** airplane-mode card render; canary strings in dummy notes never observed off-box (independent capture); second Hermes process cannot open the home; iCloud/backup inspection shows no vault copies; prohibited tools fail safely; recovery/restore drill passes; GLM's five-printed-cards blind-rating; 4-of-5-mornings adoption over two weeks.

## 15. Final verdict

# REVISE BEFORE MAC

Unanimous panel (4/4 REVISE), and Fable concurs. The revisions are **now applied** — the master blueprint has been updated with every ADOPT decision (see `DECISION-LEDGER.md`), so no further document work is required. What keeps this at REVISE rather than READY is not writing but three unresolved facts that change the install: (1) the **H0 coexistence question** — a second assistant on her Mac violates the H0 review's "one model, not two" rule and ignores the live adoption-gate evidence; Sean must decide replace/wrap/wait; (2) the **director's written answer** on child data and AI tooling; (3) the **actual Mac facts** (RAM/macOS/disk/ownership) that determine the model floor. When those three are in hand, the local-only synthetic floor (M0–M4 of the blueprint) is ready for supervised setup; everything networked or child-data-adjacent remains gated exactly as the privacy gate specifies. The privacy middleware remains **P0 BLOCKED/UNPROVEN** — no seat declared it proven, and neither does this synthesis.

## 16. Addendum (2026-08-21, post-synthesis) — D-20's design half was already decided

A follow-up sweep found `brainstorms/classroom-copilot-2026-08-15/mac-prep/H0-WRAP-DECISION.md`, which neither the panel nor §15 above had seen. It resolves the *design* half of blocker (1): **WRAP** — Hermes becomes the single visible front door; if the hardened H0 assistant exists it is preserved behind that door as the offline engine; a state machine covers every observed H0 state (present/unknown, accepted, not-accepted, absent, hardware-inadequate), and the legacy launcher retires only after rollback rehearsal + 4-of-5-days use of the new front door + the teacher's explicit preference. This is consistent with every panel ADOPT (no 27B default, offline floor mandatory, one mental model for the teacher).

Effect on the verdict: **REVISE BEFORE MAC stands, but the remaining blockers are now all fact-collection, none design.** The facts are: (a) H0 install status + 5-day adoption-gate result (if the gate is mid-flight, the workstream's design-freeze law forbids any teacher-visible change — including a Hermes install — until it completes); (b) the director's written answer (D-22); (c) the Mac hardware facts (D-23), which the blueprint's M0 already collects. Once (a) is answered and (b)/(c) are scheduled into supervised M0, the local-only synthetic floor is ready for supervised setup with the WRAP state machine governing what gets installed.

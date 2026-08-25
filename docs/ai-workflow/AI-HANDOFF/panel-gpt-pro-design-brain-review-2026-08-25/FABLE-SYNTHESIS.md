---
decision: Build the Taste Discovery loop as a courtroom-first, one-writer, loopback-only tool — NOT as GPT's model stack; adopt GPT's reframing (visual chooser first, four-way rejection, catalog IDs) and reject its leading grill, its generated-candidate courtroom, and its build order.
status: open
supersedes: none
---

# Fable Synthesis — panel on the ChatGPT Pro design-brain review

- **Date:** 2026-08-25 · **Final Decider:** Claude Fable 5 · **Board:** SWA-186
- **Seats returned:** Grok 4.6 (~$0.10, 222s) · GLM-5.3 ($0 sub, 329s) · DeepSeek V4 Pro (~$0.04, 107s) · Qwen 3.8 local ($0, 24s). **Ox Alpha:** upstream rate-limit on run 1, retry in flight — see §7 addendum. **Kimi K3:** blocked by its own $0.40 hard cap (worst case $0.443 on an 11.8k-token packet) — Sean's call whether to lift.
- **Spend this run:** ~$0.15 actual.
- **Verdict on the GPT review, unanimous across four seats:** **REVISE.** The reframing is right; the mechanism as written defeats itself in two places; the build order is absent.

---

## §1 — CONVERGENT FINDINGS (independent agreement = highest confidence)

| # | Finding | Who | My ruling |
|---|---|---|---|
| **C1** | **The grill leads the witness.** Every Q1–Q6 opens with "Recommended: <Swan's self-portrait>". A fast solo founder accepts the default; Q2 then writes a *theme* and Q3 writes *rejections* before a single image is seen. The system built to discover styles Sean has no words for hands him the words first. | Grok (P0 #1, #4), GLM (P1 #3) | **ACCEPT — the most dangerous defect in the review, and I under-weighted it in my own read.** Fix: verbal questions = medium + a *non-leading* refusals question only; recommendations shown only *after* the answer, logged as `defaultShown: true/false`; Q2 writes nothing. |
| **C2** | **Generated candidates are the wrong courtroom.** GPT's "generate 256–512px candidates" (a) samples Sean's *existing* vocabulary so it cannot surface unnamed styles (GLM P0 #1 — "success-shaped failure"), (b) trains on a generator distribution that is not the Midjourney he ships (Grok P0 #2), (c) costs generations when paid MJ grids already exist (DeepSeek, Qwen). | All four | **ACCEPT.** Three arms, three jobs (GLM/Grok concur): **MJ grids = validation ground truth** · **Midlibrary thumbs = discovery/orientation only, never preference truth** · **local Flux/SDXL at fixed seed = controlled same-subject pairs**, tagged `generatorDistribution` so they cannot train the MJ head. |
| **C3** | **No Monday slice.** Twelve gaps, a Bradley–Terry formula, an active sampler, media heads, temporal QA — and no statement of what ships first. | All four | **ACCEPT.** Week-1 is §3 below. BT/Elo/sampler gated on ≥200 `source:sean` events (Grok/DeepSeek/me) — GLM says 500; either way months away. |
| **C4** | **TasteEvent cannot hold the evidence hierarchy it defines.** Only pairwise; no `eventType` for a 12-up grid (GLM P0 #2 — a grid serialised as ~66 fake "A wins" poisons any later fit); no link to kept/shipped (DeepSeek P1 #4); `source:'sean'` typed as a literal while P0-6 demands four provenance values (GLM P1 #4); no idempotency key (Grok, GLM). | Grok, GLM, DeepSeek, Qwen | **ACCEPT.** Corrected schema in §4. |
| **C5** | **The four-way rejection split is scheduled too late.** GPT names "a broken wildlife render teaches 'Sean dislikes wildlife'" then puts the content/style/execution test at visual #4, after Q7/Q8 have already written rows. | Grok (P1 #6), GLM (blocker 1 implication) | **ACCEPT.** `outcomeClass` is a first-class field on every event from event #1; the content-vs-style pair is visual #1 or #2. |
| **C6** | **Q7 forced misses corrupt `rejected.md` on the first visual act** — "3 that clearly miss" become refusals that were only "not my favourite in this set", violating GPT's own "unselected ≠ rejected". | Grok (P1 #5), GLM (schema) | **ACCEPT.** No forced misses. Neutral persists as an event; nothing promotes a neutral to a rejection except an explicit click. |
| **C7** | **Licence boundary is a wish, not a control.** "Local-only" is not enforced by a TypeScript type. | Grok (P0 #3), GLM (P1 #8), Qwen (P0 #2) | **ACCEPT — and this attacks MY week-1 item (c).** Controls in §5. |
| **C8** | **Sequencing collision** (`design-dialogue → grill-me` vs constitution `grill-me → chromie → orchestrator → router`) is GPT committing its own P0-2 failure class. | GLM, DeepSeek, Grok | **ACCEPT.** Visual-taste is a *mode inside grill-me*, invoked mid-grill. No new skill, no new top-level edge. `taste-discovery-grill.md` is a protocol doc the mode loads, not a fourth interview. |
| **C9** | **Straw-man verdicts on Q2** — "creative is the heavy lifter" (scoped to C13/awe, LAW 6) and "2–3 rounds" (variant tournament) are corpus-scoped; GPT is right on rating², 25% floor, personification-as-law, interpolation-as-law, "~100×". | All four agree with my read | **CONFIRMED.** Durable fix per GLM: explicit `SCOPE:` tags on those lines in `field-techniques.md` so no future reviewer re-litigates. |
| **C10** | **The zero-cost, highest-truth input is missing from the grill: kept/shipped artifact triage.** "Pick 2–4 things you already shipped or kept and would ship again — what must a new direction share with these?" Shipped > kept > pairwise is GPT's own hierarchy and its grill never touches it. | Grok, GLM (both name it the #1 missing question) | **ACCEPT as Q0.** |
| **C11** | **P0-1 / P0-2 / P1-7 (governance theatre, token contradictions, temporal QA) are true Swan defects and the wrong workstream** — following them this week ships a linter instead of a courtroom. | Grok, DeepSeek | **ACCEPT.** Split to a doctrine ticket (SWA-163 already tracks the spacing conflict); not on SWA-186's critical path. |

## §2 — ADJUDICATED DISAGREEMENTS

**D1 — Is the catalog index on the week-1 critical path?** Grok: no — it is required for *suggestions*, not *learning*; a hand-maintained ~30-row stub closes the loop. GLM/DeepSeek/me: yes, 630 rows with stable `ml:` IDs. **Ruling: Grok, with a floor.** Week 1 ships a **stub catalog of every SREF/handle that appears in any event** (grows lazily on click) plus the ID scheme; the full 630-row index is week 2, generated from the same file. Grok's point that the catalog blocks "the first time a suggestion must resolve a real SREF not in the stub" is exactly right and is the trigger.

**D2 — Verbal question count before the switch.** GPT: six. GLM: six is right. Grok: one (medium) plus optional non-leading refusals. **Ruling: Grok's count, GLM's mechanism.** Q0 (kept-artifact triage) + Q1 (medium + surface class: hero / module / film title — GLM's missing "where does this live" question) + Q3 (refusals, not led). Q2/Q4/Q5/Q6 are brand recitation; if Sean wants them they are offered *after* two visual rounds as "want my prior?" and logged.

**D3 — Hide style names?** GPT: hide until after choice. Grok: hindsight tagging + blocks the "that's the SREF I already use" resolver signal. GLM: Sean is a heavy MJ user and recognises anyway — blinding degrades logging instead of removing bias. DeepSeek: never leak during the reason step. **Ruling: lock the reason tag, THEN reveal; log `recognized: boolean` post-reveal (GLM); allow an explicit "I know this one" escape that records the ID (Grok); do not reuse a revealed style later except as a deliberate contradiction probe.** Contamination becomes a measured variable instead of a hidden one.

**D4 — Architecture: core + three heads.** GPT: build it. DeepSeek: single profile with a `media` tag and per-media weight mask. GLM: shared facet vocabulary, context-partitioned tallies. Grok: right *query* shape, wrong *build* — collapse-and-drift is a write bug, cured by an append-only log with `medium/brandContext/projectId/outcomeClass` on every event; fit `w_shared/w_media/w_project` from the same log later if counts justify. **Ruling: Grok + GLM.** One JSONL, one shared facet vocabulary, three read-filters. Heads are derived views, never separate stores.

**D5 — 12-up orientation grid as the first visual.** GPT/GLM: keep. Grok: cognitive overload, 44px failure, and it presupposes a fitted predictor ("4 predicted fits") at session 1. **Ruling: Grok on order, GLM on stratification.** First visual = a controlled pair (content-vs-style). The 12-up becomes a *coverage-stratified* grid (GLM: labeled as such, not "predicted") at visual #3, with `eventType: grid-selection` and no forced misses.

**D6 — Security posture.** DeepSeek: negligible, local-only. Grok/GLM: real items exist. **Ruling: Grok/GLM** — the items are cheap and structural (§5). "It's localhost" holds only while 7331 binds loopback.

## §3 — THE WEEK-1 BUILD (what ships, in order, ≤1 day each)

Live in `swan-taste-brain` (private repo), UI on the existing Prompt Studio server. House rules apply to the page: styled-components only, `var(--token,#fallback)`, dark-first, Dual-Button Glow, ≥44px targets, scrim ≥4.5:1 over thumbnails, ≤300 lines/file, Victory if any chart ever appears.

1. **Loopback hardening + licence containment (day 1, first).** Server binds `127.0.0.1` and *refuses* non-loopback; Midlibrary directory lives *outside* the repo, listed in `.gitignore` + `.cursorignore` + `.claudeignore`; a 20-line pre-commit check fails on any image bytes or any event with `source != 'sean'`; grill-me's system prompt says "you never request or receive image bytes." *(Grok's "a day's work that makes the rest optional".)*
2. **Event log + schema (day 1–2).** `events/<session>.jsonl`, append-only, single writer = the page. Schema in §4, with `schemaVersion`. `eventId = hash(sessionId|pairCanonicalId|presentedAt)` for idempotency.
3. **2-up chooser page (day 2–3).** Sources: a drop-folder `taste/inbox/<session>/` for MJ grid exports; local Flux/SDXL fixed-seed pairs via Comfy for controlled tests; Midlibrary thumbs for discovery only. Records A/B/both/neither/depends + **locked reason tag** + `outcomeClass` + optional `notePrivate` (never leaves disk). Reason tag locks → then label reveals → `recognized` captured. Grid mode (12-up, coverage-stratified, no forced misses) as `eventType: grid-selection`.
4. **grill-me visual-taste mode (day 3–4).** Mode, not skill. Runs Q0 (kept triage) → Q1 (medium + surface class) → Q3 (refusals, unled) → prints the page URL → **waits on the JSONL**; reads only event IDs / reason codes / outcome classes, never images; writes nothing to themes/rejected. Done criterion (Grok's, adopted): ≥8 pair events with non-empty reasons + ≥1 content/style pair + Sean clicks Done. Never stops on "model confidence."
5. **Stub catalog + dumb suggester (day 4–5).** `catalog/stub.md` rows: `id | provider | modelVersion | sref-or-handle-or-none | facets | exportBoundary | evidenceEventIds`. After the done criterion, a ~30-line tally compiler emits `taste-profile.json` (context-partitioned tallies) and **3 directions as deterministic catalog queries** over the tally, each with stable IDs and one adjacent alternative. That is the taste brain for week 1.
6. **One number (GLM):** `% of suggestions that survive to kept.md`. Tracked from the first session.

**Deferred, explicitly:** Bradley–Terry / Elo, active sampler, contradiction probes as a *system* (manual repeats are fine), media-head *models*, provider-neutral GenerationSpec, Forge compiler rewrite, temporal QA / LoAF, drift detection, design-dialogue reorder, full 630-row catalog (week 2), image mirroring of Midlibrary CDN assets (still Sean-gated).

**De-risk before writing code (GLM's probe, adopted):** one manual afternoon — 12 local Midlibrary thumbnails, Sean picks ≤3 closest with one reason each, recorded by hand. If his picks include styles he could not have named, the discovery thesis *and* the licence mechanics are proven for $0. If not, rethink the chooser's value before day 1.

## §4 — CORRECTED TasteEvent (v1)

```ts
interface TasteEvent {
  schemaVersion: 1;
  eventId: string;                 // hash(sessionId|pairCanonicalId|presentedAt) — idempotent
  sessionId: string; presentedAt: string; respondedAt: string;
  eventType: 'pair' | 'grid-selection' | 'kept-triage' | 'shipped-outcome' | 'reversal';
  source: 'sean' | 'agent-placeholder' | 'imported' | 'inferred';   // page sets 'sean'; writer REJECTS anything else in prod
  medium: 'web' | 'still' | 'film';           // no 'shared' — applicability is derived, not declared
  surfaceClass?: 'hero' | 'module' | 'film-title' | 'substrate' | 'other';
  brandContext: 'swan-product' | 'swan-marketing' | 'general';
  projectId?: string;
  candidates: CandidateRef[];                 // by ID into the catalog/stub — never nested snapshots, never bytes
  gridPositions?: number[];                   // positional-bias record for grid events
  response: 'A' | 'B' | 'both' | 'neither' | 'depends' | 'skip';
  selected?: string[]; rejected?: string[]; neutral?: string[];      // grid events
  outcomeClass: 'content' | 'style' | 'execution' | 'brand-law' | 'mixed';   // first-class, required
  reasonCode: 'light'|'composition'|'realism'|'material'|'palette'|'subject'|'typography'|'motion'|'pacing'|'density'|'edit-rhythm'|'sound'|'other';
  reasonLockedBeforeReveal: boolean; recognized?: boolean; knownId?: string;
  defaultShown?: boolean;                     // was a "Recommended:" prior visible before this answer
  dependsContext?: string;                    // REQUIRED when response === 'depends'
  notePublic?: string;                        // IDs/enum-safe; scrubbed at the LLM boundary
  notePrivate?: string;                       // never leaves disk
  generatorDistribution: 'midjourney' | 'local-comfy' | 'midlibrary-reference';
  reversalOf?: string; supersededBy?: string; keptArtifactId?: string; shipped?: boolean;
}
interface CandidateRef { id: string; provider: string; modelVersion: string; seed?: number; promptHash?: string;
  localPath: string; contentHash: string; exportBoundary: 'private-reference' | 'owned' | 'licensed'; contentSubject?: string; facets: string[]; }
```
`loved-srefs` keyed by `(provider, modelVersion, referenceValue)` with a demotion rule (a confirmed entry that loses N straight pairs drops to provisional). `themes.md` gets machine-owned delimited blocks so the profile compiler and hand edits never clobber each other. The catalog JSON is the only source of truth; `style-taxonomy.md` prose is generated from it (Qwen).

## §5 — CONTROLS (licence, privacy, integrity)

- Midlibrary bytes: local process → loopback page → Sean's eyes. Never committed, uploaded, sent to any API, used as an MJ image-prompt, indexed by an agent, or placed on an agent-readable repo path. Enforced by directory-outside-repo + ignore files + bind check + bytes-in-commit check.
- `exportBoundary` is consumed: the suggester hard-fails on any export artifact touching a `private-reference` candidate (GLM P1 #8 — "a field with no consumer").
- PII: `notePrivate` never crosses the LLM boundary; `notePublic` passes a scrubber; no client names anywhere in events (Rule 8).
- Integrity: the page is the only writer; agents read IDs/codes only; `source != 'sean'` rejected at write time in prod; no URL-fetch affordance on the page (SSRF footgun); no MJ cookies / Comfy paths in JSONL.
- Budget: hard refuse cloud preview generation; local GPU only for controlled pairs; session cap on generations.

## §6 — WHAT TO DEMAND FROM GPT (the truncated tail, as artifacts not prose)

1. Q13 remainder + any Q14+ **and the done criterion** (or accept Grok's above).
2. Worked example against *documented* Swan taste with: verbal answers, image set as MJ-grid filenames / local hashes (no Midlibrary exports), every JSONL line, every write, the three emitted directions with stable IDs.
3. Twelve style suggestions, each resolvable Monday: `id, provider, modelVersion, sref/handle/none, medium, exportBoundary, evidenceEventIds, why, one adjacent alternative` — zero "query the taxonomy."
4. Action list ≤4 files, ≤1 day each, with an explicit out-of-scope list (BT, sampler, LoAF, media-head models, design-dialogue reorder).
5. A reconciliation sentence: visual-taste is a mode of grill-me and does not reorder the constitution chain.

## §7 — SEAT CALIBRATION + ADDENDUM

| Seat | Cost | Distinct value | Weakest claim |
|---|---|---|---|
| Grok 4.6 | ~$0.10 | Leading-defaults P0; generator-distribution P0; write-path as the single de-risk; Q2 scope verdicts sharpest | Assumed Prompt Studio might ship MUI (inferred, not seen) |
| GLM-5.3 | $0 | "Success-shaped failure"; grid unrepresentable in schema; Q0 kept-triage; one metric; the $0 probe | Wanted full 630-row catalog in week 1 |
| DeepSeek V4 Pro | ~$0.04 | Kept/shipped linkage gap; "physical property" question; deletes-not-inventory fix for P0-1 | Called security "negligible" — Grok/GLM show cheap real items |
| Qwen 3.8 | $0 | Bluntest week-1 (2 images, 3 buttons, a JSON file); catalog as sole source of truth | Thin; nothing the others lacked |
| Ox Alpha | $0 | *pending — addendum below* | |
| Kimi K3 | — | blocked by $0.40 cap | |

**Ox Alpha addendum (retry returned, $0, 150s) — REVISE, concurring on C4/C7, plus five items no other seat raised. All adopted:**

| # | Ox finding | Effect on the build |
|---|---|---|
| O1 | **Two writers, one JSONL, no concurrency rule** — grill-me and the :7331 server both appending will interleave partial lines; corruption in an append-only store is silent and permanent. | §3 step 2 amended: the server's single `POST /api/event` endpoint is the **only** writer; grill-me POSTs, never opens the file. Dedup by `eventId` at the endpoint. |
| O2 | **Dark-first chrome poisons value/palette judgments** — simultaneous contrast biases Sean toward low-key candidates on every light/palette event. | §3 step 3 amended: the judging canvas sits in a **neutral mid-gray surround** (`--taste-judge-bg`, ~#7F7F7F) independent of app chrome. Dark-first still governs the page chrome; the *comparison well* is neutral. Logged as `surroundMode` on the event. |
| O3 | **No cold-start fallback stated** — day 1–30 silently degrades to the keyword filter GPT demolished, and the UI looks identical. | §3 step 5 amended: until the done criterion is met, suggestions are emitted from `themes.md` priors + catalog facets and **labelled `tier: prior`** in the output; `tier: evidence` appears only when backed by `evidenceEventIds`. |
| O4 | **Neutrals have no lifecycle** — they are the cheapest later contradiction-test pool. | §4: `neutral[]` persists; write rule: neutrals are eligible for re-presentation as contradiction probes, never promotable to rejected without an explicit click. |
| O5 | **Freeze schema v1 and push 20 synthetic events through the read side before session 1** (one grid, one agent-placeholder, one reversal) — the log is the one asset you cannot rewrite. | New §3 step 2b, half a day: `schemas/taste-event.schema.json` + `fixtures/synthetic-v1.jsonl` + the tally compiler reading them end-to-end. The `TasteReason` enum is frozen in the schema and the UI chips are generated from it. |
| O6 | Q11 (motion) / Q13 (signature phenomenon) need per-session motion generation — they exceed week 1 and the packet does not admit it. | Marked **phase 2** explicitly. Week 1 = stills only; film/web-motion heads stay empty and say so. |
| O7 | Session IDs must be opaque — never derived from project/client names or dated context (Rule 8). | §5 control added. |
| O8 | Blinding is weak for the corpus owner; lean on controlled same-subject pairs where recognition cannot shortcut the judgment; randomize reveal order across sessions. | Reinforces D3/D5 rulings. |

Ox also independently confirmed the arithmetic (145/4272 = 3.39%, 145/4029 = 3.60%) and the mobile constraint: a 12-up grid with per-image reason chips cannot hold 44px targets in one phone viewport → desktop-first for the grid mode, horizontal paging on phone.

**Calibration row:** Ox Alpha · $0 · single-writer rule, neutral judging surround, cold-start tier label, synthetic fixture — four items no paid seat produced · weakest claim: none disproven. Retention caveat stands (prompts retained by an undisclosed provider; this packet carried no PII or secrets).

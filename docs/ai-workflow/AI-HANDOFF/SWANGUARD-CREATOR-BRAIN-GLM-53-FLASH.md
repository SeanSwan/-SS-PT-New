# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 7023 in / 13336 out (reasoning: 9092) | total 20359
**Wall:** 399.7s

---

## VERDICT (3-5 sentences)

The plan's legal/provenance scaffolding (lanes, restatement band, taint boundary, ledger-before-fetcher ordering) is unusually good; its **operations story is close to nonexistent**, and this is a years-long unattended pipeline on a dev Postgres in Docker on a desktop that sleeps. The single systemic defect: **no per-video fetch state machine and no heartbeat**, so the most probable failure (yt-dlp drift / bot-gating) manifests as *empty-but-clean* runs — silent corpus rot, which is the repo's own documented death pattern ("machinery shipped, feeding never wired") wearing a new costume. Economics are a non-issue and the plan never shows it; backfill wall-clock is the only real cost and it's ~2 weeks of polite fetching plus ~20–40 GPU-hours. Secondary defects: CB2/CB4b are the same slice under two names after the revision, the restatement band breaks on short technical rules, and semantic retrieval — the actual product query — is impossible under the anti-RAG rule, which must be formally re-opened now.

---

## Q1 WHAT BREAKS FIRST

| # | Failure | When | Severity | Why the plan doesn't catch it |
|---|---|---|---|---|
| 1 | **yt-dlp timed-text breakage** — innertub player response change, bot-check ("confirm you're not a bot"), PO-token gating, json3 shape drift. Historically yt-dlp needs an update every few weeks-to-months for some paths. [UNSURE on current gating specifics for timedtext; it rotates monthly] | **First, within weeks–months** | Fatal if silent | No canary, no version pin, and "empty segments" can be stored as a clean run — the plan's own hostile question admits this and then doesn't build the fix. |
| 2 | **Machine availability** — desktop asleep/rebooted at 06:30, Docker Postgres down, Windows Update. | Week 1 | High | No `ingest_run` heartbeat; nobody notices a skipped day. RSS retention (~15 entries) makes discovery recoverable *only if* a run eventually fires. |
| 3 | **Budget misconfig on first prolific channel** — Shorts flood eats N=20/h; one 6-hour podcast needs 360 Whisper-minutes against M=120 and **defers forever in a retry loop** (partial-transcript accumulation doesn't exist). | Week 1–2 | Medium | No `is_short`/duration-aware budgeting; no per-video retry state. |
| 4 | **IP soft-block / 429 wall** | Stochastic | Worst combined with #1 | Symptom is *all fetches empty* — indistinguishable from "no new videos" without a canary on a known-fixed video. Correct response is halt+alert, never backoff-and-retry-harder. |
| 5 | **Deleted/re-uploaded video** → dangling `video_item_id` citations; fetch 404s with no terminal state. | Month 2+ | Medium | Plan asks the question (§7) and ships no tombstone path. |
| 6 | **Members-only / age-gated / private** — require cookies; plan is silent. Owner-cookies raise exposure and expire. [UNSURE on current yt-dlp behavior per case] | Month 2+ | Low-Med | Not mentioned in either doc. |
| 7 | **Non-English creators** — auto-subs in origin language; similarity band + extraction silently degrade; Whisper needs language pinning. | Month 2+ | Medium | No `language` column anywhere in the schema. |

**First to arrive:** #1+#3 combined — an empty-looking "successful" day. **Worst:** silent corpus rot for months because `deferred` became the norm and nothing pages Sean (he *has* a paging channel — Hermes — and the plan doesn't use it). Close second-worst: dev-Postgres volume loss (`docker-compose down -v` deletes years of segments; rules survive in the vault, transcripts re-fetchable *unless deleted*, Whisper re-runs are not cheap). **No backup slice exists.**

## Q2 ECONOMICS (with arithmetic)

Assumptions: 51 creators, ~250 videos avg (12,750 total), 12–15 min avg, ~150 wpm ≈ 12k tokens/transcript-hour. State these in the doc; they drive everything.

**Steady-state daily (~7–15 new videos, ~1.75 transcript-hours):**

| Resource | Arithmetic | Verdict |
|---|---|---|
| Data API quota | subs.list ~2 + videos.list ~1 = **<10 units/day** | Non-issue. Blueprint's quota anxiety is about the wrong resource post-CB0. |
| Extraction, cloud | 30–70k in + 5–10k out/day → $0.01/day (cheap tier) to ~$0.15/day (frontier) = **$5–60/yr** | Trivial. But note tension: piping private transcripts to a cloud API vs the "private, single-owner" posture. |
| Extraction, local 5090 | ~50k prefill @ ~1.5k tok/s + ~8k decode @ ~40 tok/s [UNSURE — depends on Qwen3 size/quant] ≈ **~5 GPU-min/day** | Trivial. |
| Whisper steady | ~1 video/day × 15 min audio, RTF ~0.05–0.1 on 5090 [UNSURE] ≈ 1–2 GPU-min/day | Under M=120 easily. |
| Storage | ~1 MB/transcript-hour incl. Postgres overhead → **~0.6 GB/year** forward | Non-issue. Keep everything; kill retention anxiety. |
| RSS polling | 51 × 96/day = 4,896 requests/day | Harmless [UNSURE] but pointless — creators publish daily; 30–60-min cadence cuts this 3–6×. |

**Backfill (the only real cost):**

| Step | Arithmetic | Recommendation |
|---|---|---|
| Timed-text fetch | 12,750 @ N=20/h = 638 h ≈ **27 days** (too slow) | Backfill budget N=60/h ≈ 9 days; 120/h ≈ 4.5 days but bot-flag risk rises [UNSURE]. |
| Whisper share | ~15% no-track [UNSURE] → ~1,900 videos ≈ 380–475 audio-hrs; RTF 0.05–0.1 → **20–48 GPU-hrs** = 3–6 nights @ 8h | Default M=120min/day makes this take **190 days** — backfill must override M (`M_backfill=8h/night`). The defaults are steady-state defaults mislabeled as global. |
| Extraction | ~50M in + ~8M out → local ~**60 GPU-hrs** (8 nights); cloud **$10–$250** depending on tier | Either works; run it overnight. |
| Storage | ~2.5–3 GB | Non-issue. |

**GPU contention:** there is no scheduling model in the plan. Required: NVML free-VRAM gate + lock file; **ComfyUI interactive always wins**; ingest defers with a `deferred_gpu` ledger entry and retries in the 01:00–06:00 window; startup sweep deletes orphaned audio temp files on every boot (crash mid-Whisper is the plan's own question — `try/finally` is not enough after a hard OOM kill). Failure mode today: ingest fires mid-video-generation → OOM kills *one of them*, possibly ComfyUI mid-render, which is how Sean turns the pipeline off.

**Viability: yes, decisively** — steady-state is minutes of GPU and cents per day. The plan under-costs nothing except backfill sequencing and Whisper defaults.

## Q3 SCHEMA FITNESS

The query — *"what does X say about tear troughs / white balance?"* — splits into two consumers: the editing app (structured rules: good fit) and Hermes/the vault (pages: currently **unsearchable semantically**).

| Attack | Finding |
|---|---|
| `creator_rule` grain | **Over-structured as the only grain.** Transcripts are full of preferences ("I hate the HDR look"), comparisons, critiques, and workflows that have no clean condition→action shape; forcing them into rule fields makes the extractor hallucinate structure. Fix: **claims are the coarse grain, rules the sharp subset** — doc 267 already has claims; use both, feed pages from claims, expose rules to the app. |
| Restatement band (0.85/0.25) | **Does not survive technique text.** It was calibrated on news sentences — long, paraphrasable. "Never blur the tear-trough crease" is 5 words; *every correct restatement is near-verbatim* because the vocabulary is constrained, and a real quote of a rule is exactly what you want to keep. Fix: band applies only ≥ ~25 tokens; below that, use a forbidden-contiguous-n-gram check (e.g., no 8+ word verbatim run) plus an allowlist of technical terms/product names. Also unspecified: **which similarity metric** — embedding cosine? char-3gram? An unspecified metric is an unfalsifiable control. |
| Contradiction/supersession | **Not wired.** No `superseded_by_rule_id`, no `valid_from`/`valid_to` video ids. Fix: nightly pass comparing new claims vs same-creator grounded rules; contradict → mark old `superseded` (keep both; supersession is itself high-value signal). Rank pages by recency. |
| Embeddings / anti-RAG | **Yes, and say it plainly: this use case forces embeddings.** "Tear trough" vs "under-eye hollow" fails lexical search; the photographer app's questions are all paraphrase-distance questions. This is an index over *derived, restated claims*, not RAG-over-transcripts — invoke the re-open gate now with this as the evidence, implement as pgvector + hybrid (FTS/pg_trgm + vector) at the vault CLI/agent boundary. Without it the vault query path returns nothing and CB6's "done when" is a token gesture. |
| Missing columns/tables | (a) **`creator_video_fetch` state machine** — `video_id, state ∈ {pending, fetched, no_track, whisper_queued, deferred, failed_perm, deleted}, attempts, next_retry, last_error, language`. Hash-dedupe cannot express "retry a deferred fetch" or "this 404 is terminal." (b) `language` on documents/segments. (c) `duration_s`, `is_short`, `is_live` for budgeting. (d) per-rule `support_count` (videos stating it) — cheap, high-value. (e) chapters often live in the **pinned comment**, which Lane A never fetches; accepted loss or `commentThreads.list` at 1 unit/50 — cheap. |
| Quota ledger nit | `day` as PK with a `source` column is contradictory (one row, many sources); reservations have no crash protocol — reserve-then-crash = stuck reservation. Use append-only `(ts, kind, units)` + TTL on reservations, or composite `(day, source)` PK. It *does* survive restart (it's a DB row — blueprint §7's question answers itself), but the reservation protocol is undefined. |
| CB2/CB4b collision | Revision says "others unchanged" (CB2 survives) but the new **order omits CB2 entirely**, and CB4b produces the same `creator_rule`/`claim` rows. Documentation defect: merge them or the next agent builds the extractor twice. |

## Q4 MISSING / MISORDERED / OVER-BUILT SLICES

**Missing entirely:**

1. **CB-FSM: fetch state machine** (per-video states above). Load-bearing for unattended ops; CB4's "re-run inserts nothing" done-when is unimplementable without it — re-run of a *failed* video must retry, and only a state table knows the difference.
2. **CB-HB: heartbeat + canary.** Nightly: single fixed-video smoke fetch (validates yt-dlp without touching the catalog) → `ingest_run` row (counts by outcome, quota, yt-dlp version) → alert to **Hermes/Telegram** when: run didn't fire, or 0 successful fetches in 72h while enabled creators published, or success rate < 80%. The owner already owns an alerting channel; the plan doesn't use it.
3. **CB-BK: nightly `pg_dump` to the WSL vault.** One line. Prevents the worst failure.
4. **CB-EV: extractor eval set.** 10 transcripts + hand-expected rules, run on every prompt change. The prompt is the most-changed artifact in a years-long pipeline; CB4b's one-time "20-rule manual read" is a point-in-time check on a moving target.

**Wrong order:** Nothing egregious — ledger-before-fetcher is correct. Two fixes: land a **thin vertical slice early** (5 channels → ~100 rules → hand-run CB6 export) to validate end-to-end shape in week 1 instead of week 6; and the CB2/CB4b merge (above).

**Over-built for v1 — cut:**
- **CB1b OAuth subscription sync** — 51 catalog rows already exist; this adds OAuth secret handling early for ~zero rows produced. Defer until the pipeline has survived a month.
- **Whisper in v1** — most videos >10 min have auto-captions [UNSURE on exact fraction]; start with `no_track → deferred`, add Whisper in v2. This alone removes the GPU-contention and crash-cleanup surface from v1.
- **15-min RSS for all 51** — hourly is plenty for daily publishers.
- **`tier='constitution'` semantics** — meaningless until ≥3 creators have grounded rules. Ship `provisional|grounded`, add the third tier when it can exist.
- **51-creator enable set** — the photographer brain needs 5–10 channels. Enable those; the other 41 stay disabled (the trigger law already supports this).

## Q5 UPGRADES AND ENHANCEMENTS (ranked by value-per-effort)

| # | Upgrade | Effort | Why it's the one |
|---|---|---|---|
| 1 | **Support counting → doctrine detection.** `GROUP BY (creator, normalized_rule)`; a rule restated across 5 videos is the creator's doctrine — auto-promote, top-rank on pages, weight app output. | ~1 day, SQL | Biggest quality gain per hour spent; turns "50 random rules" into "what X actually believes." |
| 2 | **Daily digest to Hermes.** 07:00 push: *"4 new videos, 17 rules, 1 contradiction with existing doctrine (link), quota 22/500, yt-dlp canary OK."* | ~1 day | Directly defeats all three abandonment modes (Q6); reuses existing infra. |
| 3 | **Chapter-aware extraction.** Extract per `creator_item_chapter`, not whole video: better citations ("§ Color Grading — 14:22"), smaller context windows, free topic tags. Chapters are already in the schema from CB1. | ~2 days | The consumer apps (Eightify/Recall class) win on exactly this — timestamped per-section takeaways. |
| 4 | **pgvector hybrid index over claims/rules** (the Q3 re-open-gate item). | ~2–3 days | The vault query is the product; without it the brain is a write-only database. |
| 5 | **Contradiction/supersession pass** → "X changed their mind" digest lines + `superseded` wiring. | ~2 days | High-signal, low-volume events; exactly what a private intelligence hub is for. |
| 6 | **Value-ordered backfill:** top-50 most-viewed per channel before chronological backfill. | ~half day | Brain is ~80% useful after a channel's 50 biggest videos; demo works week 1. |
| 7 | **App-facing rules endpoint:** `GET /api/creators/:id/rules?topic=…` with normalized `magnitude` — the auto-editing app's actual contract. | ~1 day | The photographer brain is the stated driver; make its consumer a first-class client, not a vault afterthought. |
| 8 | **Cross-creator disagreement pages:** "On shadow lift: A says +10 (t=…), B says never (t=…)." | ~2 days after #4 | The blueprint's own taste-thesis made concrete; this is the Karpathy-wiki feature nothing else has. |
| 9 | Keep the **json3 raw blob** even after segmentation — 3 GB over 5 years buys re-parseability when the segment schema changes. It will. | 0 | Cheap insurance. |

## Q6 THREE WAYS THIS DIES

| Death | Mechanism | Month-1 warning sign |
|---|---|---|
| **1. Silent rot** | yt-dlp break or soft-block → `deferred` becomes the permanent state → brain stops growing while *looking* fine → Sean stops trusting it, stops checking. The repo's own death pattern, replayed. | Fetch success rate < 80% in any weekly glance; or a digest that would have said "0 new rules this week." If there's no digest, the absence of one *is* the sign and nobody sees it. |
| **2. Environment death** | Docker not up, desktop asleep, GPU owned by ComfyUI, Whisper temp files accumulating — the pipeline becomes "the thing that makes my machine weird," and a solo owner kills it to get his workstation back. | ≥2 missed 06:30 runs in `ingest_run`; orphaned audio in the temp dir growing week over week. |
| **3. Quality collapse** | Backfill weekend produces 2,000 mediocre rules; the manual read reveals extractor slop (invented conditions, rule-shaped noise); no eval set exists so every prompt "fix" is unfalsifiable → brain reads as AI slop → abandoned as worse than nothing. | The first 20-rule manual read takes >1 hour because most rules need editing; ≥1/3 of rules fail the "would I act on this?" test. |

## THE ONE THING I WOULD CHANGE

Replace CB4's hash-dedupe design with the **per-video fetch state machine + nightly canary + Hermes heartbeat** (CB-FSM + CB-HB) as one slice, landed *before* the first transcript is fetched. Everything else in this plan is fixable after the fact — cost defaults, band tuning, embeddings — but an unattended pipeline that cannot answer *"did it run, did it succeed, and if not, why"* does not fail visibly; it fails as slow silent rot while rendering yesterday's brain with full confidence. This plan's own repo has a name for that failure and a documented scar from it. Observability is not a nice-to-have slice; it is the difference between a system that runs for years and one that dies in month two without making a sound. Runner-up, non-negotiable before CB6 ships: formally re-open the anti-RAG gate and put pgvector under the claims — the vault query is semantic, and right now the honest answer to *"what does X say about tear troughs?"* is nothing, returned instantly.

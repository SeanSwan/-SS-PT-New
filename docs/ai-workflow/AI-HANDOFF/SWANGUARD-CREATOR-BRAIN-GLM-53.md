# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 7023 in / 15466 out (reasoning: 10935) | total 22489
**Wall:** 563.7s

---

## VERDICT
The blueprint's law-keeping (idempotency, fail-closed, restatement band, quota-before-fetcher) is genuinely good — better than most production teams manage. But CB0 signed the front door onto a house with no smoke detector: there is no observability slice, no backfill slice (which the photographer brain — the stated driver — cannot exist without), no GPU scheduling model, and no dependency-rot strategy for a pipeline whose primary fetcher historically breaks every few months. The schema answers "where did this rule come from" beautifully and "what does this creator say about shadow lift" barely at all. Two documents also now contradict each other in ways the plan's own defect law says must be fixed. Most failures below are survivable individually; unattended and unobserved, they compound into the repo's documented death pattern: *machinery shipped, feeding never wired.*

## Q1 WHAT BREAKS FIRST

**First (week 1–2):**

| # | Failure | Mechanism | ETA |
|---|---|---|---|
| F1 | **OAuth refresh token dies at day 8** | If the GCP consent screen is in **Testing** status (the default), Google issues refresh tokens that expire after **7 days** — documented behavior. `subscriptions.list` sync fails daily from day 8; if failure is logged but not surfaced, catalog silently freezes. | Day 8, exactly |
| F2 | **"No captions" exit-0 misroutes to Whisper** | `yt-dlp --write-auto-sub --skip-download` on a video with no track exits **0 with no file** ("There are no automatic captions…"). Naive routing treats file-absence as "no track → Whisper," so a *failed* fetch (bot-check page, transient empty payload) becomes a `-x` audio download of a 3-hour podcast. File-absence cannot distinguish *no track* from *fetch failed*. Must run `--list-subs` (or equivalent) and treat absence-after-declared-presence as failure. | First week |
| F3 | **Auto-caption lag on fresh uploads** | Auto-captions appear hours after publish. The 06:30 fetch of yesterday's video finds no track → Whisper misroute again. Need a **48h "no-track retry lane"** before Whisper is even considered. | First week |

**Worst (months 2–12):**

| # | Failure | Mechanism |
|---|---|---|
| W1 | **yt-dlp timed-text rot** | YouTube innertube/player changes (PO-token requirements, bot-check walls) break unofficial extraction every few months historically. The *worst* manifestation is not a crash — it's **200-with-empty payloads**: runs go green, zero segments stored, brain silently stale for weeks. This violates the repo's own ingest law and nothing in CB4 mechanically enforces it. Fix: parse-time json3 **schema validation** (fail closed on shape change) + a daily **canary fetch** of one known-good video asserted non-empty. |
| W2 | **Two pipelines, one IP, one account** | `swan-scout` (SS-PT, Lane B) still runs with its *own* budget on the same residential IP and account. `creator_fetch_ledger` counts only SwanGuard's fetches. The soft-block day arrives when *combined* volume trips YouTube; each pipeline blames the other. Cross-repo budget unification is missing from CB0. |
| W3 | **Vacation gap > RSS window** | Channel RSS holds only ~15 recent entries. Machine off (or failing silently) for 2 weeks → videos missed **forever**, no error, no gap marker. Need a periodic **uploads-playlist reconciliation sweep** (`playlistItems.list`, 1 unit/50 — trivially cheap) with a high-water mark per creator. |
| W4 | **Re-upload / delete** | Re-upload = new `video_id`. If `content_hash` is globally unique, the identical transcript dedupes silently and citations point at the dead old id. Deleted videos: RSS never tells you; only the reconciliation sweep detects (`videos.list` returns empty) → need `lifecycle='deleted_upstream'`, rules survive with `citation_status='dead'`, never silently orphaned. |
| W5 | **Windows process hygiene** | Task Scheduler missed-run policy must be "start when available" (forced-update reboots at 06:00); Whisper crash mid-transcription orphans temp audio (the CB0 hostile question — no slice answers it); no log rotation; Docker/Postgres volume on the same NVMe as ComfyUI outputs. |
| W6 | **Live/premiere/Shorts/members/age-gated** | Each needs a distinct terminal state, not a retry loop or Whisper fallback: `liveBroadcastContent` → defer 48h; members-only/age-gated → `unavailable_reason`, weekly retry, **never Whisper** (audio is blocked too); Shorts flood (5/day/creator) inflates item count and extractor spend → `is_short` routing column + policy. [UNSURE whether channel RSS includes Shorts; the uploads playlist definitely does.] |
| W7 | **Non-English** | Auto-subs include machine-translated tracks — fetching those gives junk fidelity. Fetch only original-language ASR, store `language`, route extractor accordingly. Restatement band across languages (English rule, German source) breaks lexical similarity entirely (see Q3). |

## Q2 ECONOMICS

**Extraction (using their 10k tokens/hr; my cross-check: 150 wpm ≈ 12k tokens/hr — same order):**

| Scenario | Videos/day | Input tok | Output tok | Cloud @ $3/$15 per M | Local Qwen3 |
|---|---|---|---|---|---|
| Steady, 10 enabled, 0.4 vid/creator/day, 30-min avg | 4 | 20k | 6k | **~$0.15/day (~$4.50/mo)** | ~4 min GPU/day — trivial |
| Max, 51 enabled, 1/day each, 1-hr avg | 51 | 510k | 77k | **~$2.70/day (~$80/mo)** | ~1–2 hr GPU/day |
| **Backfill: photographer set, 10 channels × ~400 videos** | 4,000 once | ~17M | ~6M | **~$140 one-time** | ~65–130 GPU-hrs [UNSURE: 30–60 tok/s for quantized Qwen3-32B] = **3–5 days 24/7**, or weeks at idle-GPU rates |
| Backfill: full 51 × ~300 | 15,300 once | ~77M | ~23M | **~$575 one-time** | ~250–500 GPU-hrs = **weeks of exclusive 5090** |

Verdict: daily trickle is viable either way. **Backfill is only viable in the cloud** (or accept a month of 5090 occupation competing with ComfyUI). Recommend: cloud extraction for backfill, local for daily. Also: extraction *quality* on taste/technique restatement is the real risk — gate with the 20-rule manual read before committing $575.

**Backfill wall-clock under N=20/hr fetch cap (the number nobody computed):** 4,000 timed-text fetches ÷ 20/hr = **200 hours ≈ 8.5 days continuous**. Full 51 channels ≈ **32 days**. This silently converts a "one-time" cost into a month of calendar. Fix: a separate backfill rate lane (40–60/hr, jittered, per-channel pacing) — still conservative for a residential IP.

**GPU contention — no scheduling model exists.** ComfyUI and faster-whisper have no preemption protocol between them. Recommended model, in order: (1) **idle-gate**: query `nvidia-smi` — free VRAM > ~6GB and util < 20% for 10 min → run, else **defer with reason** (never queue onto an active render); (2) hard-cap Whisper VRAM (large-v3 int8 ≈ 3–4GB) so coexistence is possible when ComfyUI's model fits in ~26GB; (3) run Whisper in a **separate process** with its own watchdog so a CUDA crash doesn't kill the ingest runner; (4) budget M rolls as a 24h window, not a calendar day. faster-whisper large-v3 on a 5090: [UNSURE] roughly 15–25× realtime → 6-hr podcast ≈ 15–25 min GPU; M=120 min/day covers ~5–8 hrs of audio — fine for trickle, irrelevant for backfill.

**Storage:** 1-hr video ≈ 40KB text; segments ≈ 1,000–2,000 rows post-dedupe [UNSURE on cue density] at ~200B row+index → **~0.3–0.9MB/video**. Backfill 15,300 videos → **15–30M segment rows, ~4–9GB + indexes, ~0.6GB text**; plus ~2–5GB/yr trickle. Fine on NVMe, but a 30M-row table in Docker-Postgres needs partitioning (`creator_transcript_segments` by creator or month) and autovacuum attention. Missing entirely: a **retention policy** — and note the direct contradiction: blueprint §1 says the transcript is "a transient input, not a durable record"; CB4 stores it durably. The CB4 commit must edit §1 per the plan's own "a contradictory comment is a defect" law. Minimum hygiene: temp audio TTL-verified-deleted on all exit paths, quarterly dead-video sweep, watermark alert at 80% volume.

## Q3 SCHEMA FITNESS

- **The schema answers provenance, not the question.** "What does he say about shadow lift?" over `creator_rule` rows has no topic axis: no normalized vocabulary, no synonyms folded (`tear trough` / `tear-trough` / `nasojugal fold` / `under-eye hollow`). Missing table: `topic` + `rule_topic` join, extracted with the rule. This is the single biggest retrieval gap and it's cheap.
- **`creator_rule` is over-grained.** Transcripts contain demos, banter, sponsor reads, and asides; the fixed 7-field shape (condition/action/magnitude/rationale/constraint/warns_against) fits maybe 20–30% of extractable statements. `magnitude "lexical + normalized 0..1"` is incoherent for "I lift shadows to 100 and pull the black point." Fix: dual grain — `claim` (already exists, loose) as default, `creator_rule` promoted only when condition+action genuinely co-occur; optional structured fields as JSONB, not columns.
- **The restatement band will misfire on technique.** (a) It conflates two checks: *copyright hygiene on shared surfaces* and *grounding fidelity*. These are different tests. (b) The metric is unspecified — rouge-L, Jaccard, embedding cosine give wildly different numbers at the same 0.85/0.25 thresholds; the band is meaningless until the metric is named. (c) Dense paraphrase of technique ("lift"→"raise," "shadow"→"dark areas") has low lexical overlap → false rejects at the ≤0.25 floor; verbatim catchphrases → false rejects at the ceiling. (d) Cross-lingual source/rule breaks lexical similarity entirely. Fix: fidelity = **span-anchored extraction** (extractor returns source span offsets; fidelity = span support), band retained *only* at the shared-surface boundary (pages, vault) with an **embedding** metric, not lexical.
- **Supersession is asked but not built.** No `superseded_by_rule_id`, no statement-level effective date (t_start_ms is in-video time). Per-video extraction cannot see cross-video contradictions. Add: `superseded_by` + a periodic **per-creator stance pass** (local LLM over one creator's rules per topic → "current stance, with citations to both old and new statements"). This is also the product Sean actually wants.
- **Re-upload citation rot:** canonical-video alias map (channel_id + normalized title + duration bucket) so a citation to a dead id resolves through the re-upload.
- **Defects in the DDL as written:** `creator_quota_ledger` PK is `(day)` but `source` is a non-key column — three rows/day are impossible as drawn; PK must be `(day, source)` or drop source to JSONB. Also define the ledger day boundary as **Pacific Time** (YouTube's quota reset), or you'll cap and double-spend across the reset. `units_reserved` needs an expiry timestamp or restarts leak reservations.
- **Missing columns for Q1 routing:** `language`, `duration_s`, `is_short`, `live_state` on `creator_item`; without them CB4 can't route.
- **Embeddings — say it plainly: yes, this use case forces them.** Lexical search over paraphrased technique claims across 100k+ rules fails on synonymy, full stop; the 4,400-doc vault precedent doesn't transfer to this corpus. Reopen the anti-RAP gate narrowly: local multilingual embeddings (bge-m3 class) as a **derived, rebuildable index** over rules + chapters + (selectively) segments; the ledger stays the source of truth; every retrieval result still renders through a citation. Chapters deserve their own embeddings — they're creator-authored topic segmentation and the cheapest high-value retrieval unit in the whole plan.

## Q4 MISSING / MISORDERED / OVER-BUILT SLICES

**Missing entirely (ranked):**
1. **CB-HEART: heartbeat + daily Telegram digest.** Unattended-for-years is the stated condition; there is no slice that makes failure *visible*. Positive heartbeat: the digest fires on success too ("3 new videos, 41 rules, 2 deferred, 412/900 units") — silence must be distinguishable from death. Include the yt-dlp **canary fetch** and OAuth token-health check here. [UNSURE whether Hermes can receive pushes vs. only answer queries — if not, a separate Telegram bot path.]
2. **CB-BACKFILL:** uploads-playlist enumeration, high-water marks, priority ordering (greatest-hits first — top ~50 by view count per channel makes the photographer brain useful in ~3 days), separate rate lane, resumable cursor, 48h no-track retry lane, and the weekly **reconciliation sweep** (also fixes vacation gaps and delete detection). The stated product is impossible without this and no slice produces it.
3. **CB-HYGIENE:** temp-audio deletion on *all* exit paths (crash-safe: delete-on-startup for stale `.tmp`), dead-video sweep, orphan-citation sweep, retention policy, disk watermark, autovacuum/partitioning after backfill.
4. **json3 fixture corpus** (real samples: rolling cues, multi-language, empty, shape-changed) so "fail closed on shape change" is a test, not a hope. Belongs inside CB4.

**Misordered:** The revised order line (`CB1 → CB1b → CB5 → CB4 → CB4b → CB3 → CB6`) **drops CB2 entirely** — internal inconsistency with "others unchanged." CB2 should stay before CB4b: description-based extraction is the cheap tuning surface where the restatement band and extractor get validated *before* transcripts arrive. CB3 should not be gated on CB4b; a description-only entity page proves the render path earlier.

**Over-built / cut for v1:** `tier='constitution'` (≥3-creator agreement machinery before one brain works — defer to post-CB6); **Lane C import** (superseded by CB0 — the 17 cached transcripts enter via the 131B owner-paste path; the blueprint's lane table and §1 ruling are now stale text that must be edited per the plan's own defect law); `magnitude` normalization; embedding-everything ambitions in v1.

## Q5 UPGRADES AND ENHANCEMENTS (ranked by value-per-effort)

| # | Upgrade | Effort | Why |
|---|---|---|---|
| 1 | **Daily digest / heartbeat** (CB-HEART) | S | Doubles as the reliability mechanism *and* the felt product ("here's what your creators taught you today"). Nothing else on this list survives silence. |
| 2 | **Topic/vocabulary axis** on rules | S | The missing half of the retrieval question; cheap at extraction time. |
| 3 | **Backfill, greatest-hits-first** | M | Converts a month-long trickle into a brain that's useful in days; directly serves the photographer driver. |
| 4 | **Per-video 5-bullet digest card** on ingest day | S | The Eightify/Recall feature that gives immediate value *before* a brain accumulates; extractor is already running. |
| 5 | **Chapter-aware chunking + chapter embeddings** | S–M | Creator-authored topic segmentation; fixes 6-hr-podcast context overflow and gives the best retrieval unit. |
| 6 | **Per-creator stance card** (supersession pass) | M | "Current view on X, changed from Y (2024)→Z (2026), both cited" — this is what an editing app needs and what a timeline alone doesn't give. |
| 7 | **Cross-creator disagreement map** | M | Named in §1 as "the signal" but no slice produces it. Same topic key, divergent actions → style axes. After ≥3 creators backfilled. |
| 8 | **Sponsor-segment filtering** | S | Sponsor reads are a large fraction of podcast transcripts and will mint garbage rules ("use code SWAN20"). SponsorBlock skip-segments is crowd-sourced [UNSURE on ToS posture] or an LLM-heuristic flag; at minimum an `is_sponsorish` filter. |
| 9 | **`repeat_count` on rules** | S | Creators repeat their canon; dedupe-by-similarity turns repetition into signal ("core doctrine, said 14×"). |
| 10 | **Citation seek-offset + provenance** | XS | ASR cue drift ±3–5s; render `t=start−3s`, store per-segment `asr|caption|whisper` provenance so citation precision is auditable. |
| 11 | **Hybrid `ask-the-brain` CLI mode** in the vault tool | M | Query-side twin of CB6; natural Hermes surface. |

## Q6 THREE WAYS THIS DIES

| Death mode | Month-1 warning sign |
|---|---|
| **1. The never-fed graveyard** (the repo's own documented pattern: 51 creators, 0 items, wiki never fed). CB0 is signed but `enable_creator` still requires owner-attributed action per creator; the queue of "Sean must do X" steps (enable N creators, sign N reasons, 20-rule manual reads) stalls on one man's attention. | Week 3: `creator_item` ≤ 3 rows, zero enable events this week, any slice blocked >5 days awaiting a manual read. |
| **2. Silent rot** — F1/F2/W1 compound: token expired, captions misrouting, yt-dlp shape-changed; runs green for weeks; brain confidently stale; the photographer app queries it and gets nothing; trust in the brain never recovers. | Any week where the log shows *success* while RSS showed new videos and the fetch ledger shows ~0 timed-text hits — or the digest (which doesn't exist yet) never fires at all. |
| **3. Deferred-work avalanche on the studio machine** — GPU contention defers Whisper daily, Windows reboots orphan temp audio, WSL/Windows path friction (`%LOCALAPPDATA%` secrets, `~/hermes2` vault, Docker Postgres, Windows Node), until the scheduled task is disabled "just for today" during a render and never re-enabled. | >50% of Whisper runs deferred, deferred queue >20, or Sean has manually killed an ingest job twice this month. |

## THE ONE THING I WOULD CHANGE
**Make the positive heartbeat the first slice, before CB1.** A daily Telegram digest that fires on success and failure alike — new videos, rules minted, deferrals with reasons, quota spend, canary result, days-since-last-row-produced — costs a day of work and converts every failure in Q1 from a months-later discovery into a next-morning message. This plan's single point of failure is not yt-dlp, YouTube, or the schema; it is that a one-person system with no observer will rot in exactly the way its own repository has already rot once, and nothing currently in the slice order would notice.

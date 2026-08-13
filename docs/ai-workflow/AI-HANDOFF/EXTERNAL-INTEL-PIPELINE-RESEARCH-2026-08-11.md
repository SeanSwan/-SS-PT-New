---
decision: Build YouTube transcript intel in-repo on yt-dlp (shipped); for social comments use the ALREADY-INSTALLED Playwright MCP persistent logged-in profile before installing or buying anything — Crawl4AI as the step-up, paid aggregator only if it must be unattended
status: shipped
supersedes: none
---

# External Intel Pipeline — research + build record (2026-08-11)

**Ask (Sean):** find two things he remembered from GitHub — (1) a repo that reads
comments across Facebook / X / Instagram / TikTok **without an API key**, and
(2) something that looks up YouTube creators, reads their video transcripts, and
feeds them into the AI chat's context. Then close the workflow gaps around them.

**Outcome in one line:** #2 is **built, tested, and wired** as a local MCP server
(`swan-scout`, $0, no API key). #1 **does not exist** in the form remembered —
the honest options are documented below with a recommendation.

---

## 1. Social comment scraping — the honest finding

> **CORRECTION (same day, after a deeper search pass).** An earlier draft of this
> section said flatly that "no such tool exists." That was overstated and wrong in
> the way that matters: no repo ships *turnkey per-platform comment extractors* for
> all four sites, but several no-API-key engines absolutely can read those comments
> when driven with a logged-in browser profile — and one of them is **already
> installed in this repo**. The corrected map is below.

### The real landscape

| Tool | Stars | Key? | Cost | What it actually gives you |
|---|---|---|---|---|
| **[Playwright MCP](https://github.com/microsoft/playwright-mcp)** — *already in `.mcp.json`* | — | **No** | **$0** | `[VERIFIED]` Persistent profile **by default**: "All the logged in information will be stored in the persistent profile." Log in once, then `browser_snapshot` / `browser_evaluate` / `browser_find` read any page you can see — comments included, on every platform |
| **[Crawl4AI](https://github.com/unclecode/crawl4ai)** | **77.8k** | **No** | **$0** | Apache-2.0. LLM-ready markdown output, browser profiler with "saved authentication states, cookies, and settings", **ships its own MCP server for Claude Code**. General crawler, not social-specific |
| **[Scrapling](https://github.com/D4Vinci/Scrapling)** | **73k** | **No** | **$0** | Adaptive scraping, keeps browser sessions across calls, drives remote browsers over CDP, stealth/anti-detection |
| **[MediaCrawler](https://github.com/NanmiCoder/MediaCrawler)** | *(count unverified)* | **No** | **$0** | **The architectural proof.** Multi-platform **comment** crawlers, no API key, Playwright + login session, even has an MCP server — but targets **Chinese platforms** (RedNote, Douyin, Kuaishou, Bilibili, Weibo, Tieba, Zhihu) |
| **[Zeeschuimer](https://github.com/digitalmethodsinitiative/zeeschuimer)** | — | **No** | **$0** | Capture-while-you-browse via network interception. TikTok + RedNote comments; X/Instagram/Threads posts only. **No Facebook.** In Bellingcat's toolkit |
| **[twikit](https://github.com/d60/twikit)** / `adhikasp/mcp-twikit` | — | **No** | **$0** | X/Twitter specifically, unofficial internal API, no dev account. MCP server exists |
| Paid aggregators — SocialCrawl (48 platforms, MCP), Bright Data, Apify | — | Yes | $$ | Turnkey comments on every platform including Facebook |

### What Sean most likely saw

`[LIKELY]` **Crawl4AI.** It is the viral no-API-key scraping repo of this era
(77.8k stars), it is demoed constantly as "free, no API key, LLM-ready", and it
ships an MCP server that plugs straight into Claude Code. **MediaCrawler** is the
other strong candidate — it is *specifically* famous as "one repo, many platforms,
all the comments, no API key," which matches the memory almost word for word; the
platforms just aren't the Western ones.

### The correction that matters for the workflow

The blocker was never "does a no-API-key tool exist." It does, several times over,
and **Sean already has one wired**. The real gap is that none of them ship
*per-platform comment selectors* for Facebook/X/Instagram/TikTok — that part is
DIY on top of whichever engine you pick, and it is the part that rots when a
platform ships a layout change.

So the cost model is unchanged from the earlier draft, but the framing is honest:
this is **not** "buy a tool," it is "own ~200 lines of per-platform extraction and
re-fix it when it breaks."

### Why no scraper was BUILT in this pass

1. **The engine problem is already solved; only extraction is DIY.** Building
   per-platform selectors before Sean has picked a target list would be guessing
   at the wrong layer.
2. **It is a maintenance treadmill.** Session persistence, proxy rotation, TLS
   fingerprinting, layout churn — a permanent part-time job competing directly
   with the Marketing Command Center, which is the actual #1 revenue focus.
3. **ToS posture is Sean's call, not mine.** Reading comments on pages he is
   logged into and could read by hand is ordinary; doing it at volume from a
   business handling client PII is a different risk profile. That is a decision to
   make deliberately, not to inherit from something installed quietly.
4. **The value is front-loaded, the cost is recurring.** Voice-of-customer mining
   pays off in a burst (one good pass feeds `copy-tournament` and `chromie` for
   months). That profile suits an on-demand Playwright sweep far better than owned
   standing infrastructure.

### Recommendation (revised after the correction)

**Use what is already installed before installing anything.**

1. **Now, $0, zero new dependencies — Playwright MCP.** It is already in
   `.mcp.json` and already keeps a persistent logged-in profile. Sean logs into
   Facebook / Instagram / TikTok / X once in that browser; from then on I can open
   a post and read its comments directly. **This covers Facebook, which nothing
   else free does.** Best first move by a wide margin: no install, no new attack
   surface, no ToS posture change beyond "an automated browser is reading pages
   Sean is logged into and could read by hand."
2. **If volume outgrows that** (dozens of posts per sweep, wanting it unattended),
   add **Crawl4AI** — 77.8k stars, Apache-2.0, its own MCP server, persistent auth
   profiles. Still $0, still no API key.
3. **Only if Sean wants it hands-off and scheduled**, buy one metered aggregator
   month (SocialCrawl ships an MCP server and would wire in exactly like
   `swan-scout` did).

**Still do not** hand-roll and maintain four separate per-platform scrapers as a
standing repo commitment — that is the treadmill. A thin extractor on top of
Playwright MCP, rebuilt when it breaks, is the cheap version of the same thing.

**Open decision for Sean:** point Playwright MCP at a first competitor sweep? It
needs him logged into the target platforms in that profile, and a short list of
accounts/posts worth mining.

---

## 2. YouTube creator + transcript intel — BUILT

### Why this one earned the build

This is not a new capability, it is an **existing manual workflow** that already
produces some of this repo's highest-value output. Rules 63, 64, 65 and the
rule-40 taste-ceiling doctrine were each harvested by hand from a YouTube talk:
watch → extract the doctrine → codify it. The build just removes the transcription
step Sean was doing with his eyes.

### What shipped

| File | Lines | Purpose |
|---|---|---|
| `scripts/swan-scout/yt-scout-lib.mjs` | 216 | Validation, yt-dlp invocation, search + channel listing |
| `scripts/swan-scout/yt-scout-transcript.mjs` | 205 | json3 parsing, timestamped search, disk cache |
| `scripts/swan-scout/yt-scout-lib.test.mjs` | 226 | 21 unit tests, zero network, zero subprocesses |
| `scripts/mcp/swan-scout-server.mjs` | 272 | MCP stdio server, 5 tools |
| `.mcp.json` | +9 | Registers `swan-scout` |

Zero npm dependencies — Node built-ins only, deliberately mirroring
`scripts/mcp/swan-council-server.mjs` so this repo has **one** MCP pattern
(Rule 18). Cost: **$0**. No API key is loaded, so no key can leak.

### Tools

- `yt_search` — find videos/creators by topic
- `yt_channel_videos` — list a creator's uploads (@handle / URL / UC… id)
- `yt_transcript` — fetch + cache; returns a **compact receipt**, not the body
- `yt_find_in_video` — timestamped excerpts for a phrase, with jump-to URLs
- `yt_cache_prune` — housekeeping

### The design constraint, measured not assumed

`[VERIFIED]` Karpathy's "Deep Dive into LLMs" (3.5 h) → 4.3 MB json3 →
**215,347 chars → ~53,837 tokens** for ONE video. Dumping that into a
conversation burns ~5% of a 1M window per talk.

So the full text always goes to a **gitignored cache file** and callers get a
receipt. `yt_find_in_video` then answers the actual question from cues:

```
2 passage(s) matching "context window" in 7xTGNNLPyMI
(~91 tokens returned vs ~53,837 for the full transcript)

[29:21] …the word article followed this context window somewhere in the training documents…
   → https://www.youtube.com/watch?v=7xTGNNLPyMI&t=1761s
[1:28:23] …if the information is in the context window um of this llm this actually works pretty well…
   → https://www.youtube.com/watch?v=7xTGNNLPyMI&t=5303s
```

**~591× cheaper for the same answer.** That ratio is the whole point of the module.

### Why yt-dlp rather than a hosted transcript MCP

`[VERIFIED]` Hosted transcript APIs (TranscriptAPI, etc. — $5/mo after 100 free
credits) exist mainly because **YouTube blocks datacenter IPs**. That constraint
does not apply here: Sean's machine has a residential IP, which YouTube treats as
a normal viewer. Paying for one would buy nothing, and would route every research
query through a third party. Verified live on this machine, 2026-08-11.

**Caveat, stated plainly:** if this ever moves to Render or any cloud host, the
residential-IP advantage disappears and the hosted API becomes the correct answer.
This is a *local operator tool*, not a production service.

### Verification `[VERIFIED]`

- **Unit:** `node --test scripts/swan-scout/yt-scout-lib.test.mjs` → **21/21 pass**
- **Live MCP, real JSON-RPC over stdio** (not a mocked harness): `initialize` →
  `tools/list` → `yt_search` → `yt_transcript` → `yt_find_in_video`, plus both
  error paths (bad id, unknown tool). All correct.
- **Channel listing:** `@AndrejKarpathy` → 3 uploads with view counts.
- **Cache hit:** 2nd fetch = **3 ms** vs ~10 s cold.
- **Gitignore:** `git check-ignore -v` confirms `.ai-workflow/scout-cache/…`
  matches `.gitignore:451`; `git status --porcelain .ai-workflow/` is empty.
- **Secret scan (Rule 44):** `scripts/scan-secrets.sh` → 2 files, 0 hits, CLEAN.
- **Rule 4:** all four files ≤ 272 lines.

### Defects found by the hostile pass and fixed

Four real defects, all caught before reporting — three by tests I wrote, one by
probing the deployment shape:

1. **`Number(0) || 2` ate a legitimate zero.** `context: 0` ("just the matching
   line") silently became `context: 2`, returning five cues and a timestamp two
   cues early. Fixed with an explicit `clampOpt`; regression test locks it.
2. **`Number(null) === 0` is finite.** So `limit: null` from an MCP client fell
   through the isFinite guard, clamped to `min`, and returned **1** result
   instead of 8. Caught by my own regression test for defect #1.
3. **Timestamps could point early.** The first cut matched over a 3-cue lookahead
   window and stamped the *window* start. Replaced with a char-offset index that
   maps each match back to the cue the phrase actually starts in — still catches
   phrases straddling a cue boundary, now with an honest timestamp.
4. **`process.cwd()` as repo root — the one that mattered.** An MCP client may
   spawn a server with any working directory. Launched from `c:\tmp`, the server
   reported `root C:\tmp` and would have written transcripts outside the repo —
   outside the `.ai-workflow/*` gitignore rule, and potentially **inside an
   unrelated git tree where they would be committable**. Root is now derived from
   the module's own location. Verified fixed by re-launching from `c:\tmp`.

Also fixed: yt-dlp's literal `"NA"` for unpopulated fields rendered as a bogus
date; now normalized to `null` → `?`. And `yt-scout-lib.mjs` hit 406 lines
(Rule 4 violation) and was split at the fetch/transcript seam.

---

## 3. Workflow gaps this exposes

Ranked by value, not by effort.

1. **Transcript → doctrine is still manual, and it is the highest-leverage loop
   in this repo.** Four CLAUDE.md rules came from YouTube talks. `swan-scout`
   now supplies the raw material cheaply; nothing yet turns a talk into a
   *proposed rule*. **`skill-harvest` already does the "find repeated patterns →
   propose a skill" half.** Wiring `yt_find_in_video` into it closes the loop:
   "harvest doctrine from this talk" → candidate rules with timestamped citations
   Sean approves or rejects. *This is the single highest-value follow-on.*
2. **Competitor intel has no ingest path at all.** `attack-the-site` and
   `chromie` currently reason from what is already in context. A folder of real
   competitor comments would make both dramatically sharper. **Unblocked** — the
   Playwright MCP persistent profile can start this today; it needs Sean logged in
   and a target list, not new software.
3. **`copy-tournament` judges are invented, not observed.** Its five judge
   personas are written from imagination. Real objection language from actual
   prospect comments would make the panel evaluate against reality.
4. **No cache retention job.** `yt_cache_prune` exists but nothing calls it.
   `scripts/coordination-prune.mjs` is the established pattern to mirror if this
   ever accumulates.

---

## 4. Known limitations / non-goals

- **Local operator tool only.** Depends on a residential IP; will not work from
  Render. Deliberate — not a production service.
- **Literal substring matching, not semantic.** `yt_find_in_video` will miss a
  paraphrase. This is a deliberate trade: semantic search means embeddings, and
  Rule 72 has a standing prohibition on vector/RAG infra with a re-decision gate.
  Grep-first is the house pattern.
- **English default.** `lang` is parameterized but only `en` is exercised.
- **Facebook has no free *turnkey* scraper**, but it is reachable via the
  Playwright MCP logged-in profile like any other site. The earlier claim that
  Facebook "forces the paid path" was wrong and is retracted.
- **yt-dlp is a moving target.** It tracks YouTube changes and occasionally needs
  updating (`uv tool install --upgrade yt-dlp`). Failures surface as a clear
  `yt-dlp failed:` message, not a silent wrong answer.

## 5. Rollback

Delete `scripts/swan-scout/`, delete `scripts/mcp/swan-scout-server.mjs`, remove
the `swan-scout` block from `.mcp.json`. No migrations, no env vars, no
production surface touched, nothing deployed. The cache is gitignored and can be
deleted freely.

## 6. Future review hooks

- Re-check the residential-IP assumption if this is ever invoked from CI or Render
  — the whole $0 argument collapses there.
- Re-examine `parseJson3`'s dedupe rule if YouTube changes its auto-caption
  format; a wrong dedupe would silently drop real speech, which no test would
  catch (the tests use synthetic cues).
- Audit `videoIdFrom` if YouTube introduces a new URL shape; unknown shapes
  currently return `null` (fail-closed, correct) but would look like a bug.
- If the cache ever exceeds a few hundred files, wire `yt_cache_prune` into the
  existing prune cadence rather than growing unbounded.
- Revisit the Rule 72 anti-RAG prohibition **only** if transcript volume crosses
  the stated re-decision threshold — do not drift into embeddings casually.

## 7. Status

Branch `wip/comms-notifications-2026-07-05`, which is **1731 commits behind
origin/main**. This work is self-contained and touches no existing runtime file,
so it cherry-picks to main cleanly — but it is **not on main and not deployed**.
Nothing here reaches production; it is a local operator tool.

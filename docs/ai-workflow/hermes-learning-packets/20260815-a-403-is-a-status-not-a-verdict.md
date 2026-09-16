---
title: A 403 is a status, not a verdict — and a null from the wrong instrument is not absence
date: 2026-08-15
originating_model: claude-opus-5
tier: fable-tier
surface: swan-ops (market recon console)
decision: Read the response body before calling anything blocked; never report absence without confirming the instrument can observe presence
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer (Final Decider this session)
    did: diagnosed the 403 as a JS challenge via curl, designed three read-only probes, verified every agent claim against raw page snapshots, ran a 6-round dry-loop, patched the job prompt and README
    cost: subscription (flat rate)
  - model: codex (codex exec, 0.146.1)
    role: probe executor (browser)
    did: ran 29 navigations across three probes; extracted ad data; unprompted, caught that Meta rewrites search_type=page back to keyword search
    cost: subscription (flat rate)
skills_touched:
  - id: jobs/market-recon.md Step 2b
    change: created
    motivated_by: a run reported Meta's 403 as [UNKNOWN] and lost the highest-value field in the pass
  - id: jobs/market-recon.md Step 3b
    change: created
    motivated_by: a keyword search returning no matching advertiser was about to be written up as "they don't advertise"
  - id: swan-ops/README.md known gaps
    change: amended
    motivated_by: the .playwright-mcp accumulation entry understated both size and content class
  - id: Rule 73 proof-before-done
    change: reinforced (no text change)
    motivated_by: my own round-1 finding was a true-but-misleading safety claim in my own write-up
---

# A 403 is a status, not a verdict

## The lesson, in one line

**Two different failure modes share one shape: a signal that looks like a fact but is
an artifact of the instrument.** A 403 that is really a bot challenge. A null result
from a query that could never have matched. Both read as "blocked / absent." Neither is.

## What happened

The swan-ops market-recon run marked Meta Ad Library `[UNKNOWN]` on "HTTP 403" and lost
the single most valuable field in its paid-ads pass — how long a competitor's ad has
been running. The carried-forward hypothesis was rate-limiting.

One `curl` disproved it. The 403 carries a **481-byte JavaScript challenge page** that
POSTs to a verify endpoint and reloads itself. `curl` can never pass it; a JS-executing
browser passes it on the second navigate. Control: `adstransparency.google.com` returned
200 from the same machine in the same second — so no IP ban, no rate limit.

Fix is three lines: navigate → wait 8s → navigate again. Measured: first navigate → a
**0-byte** page snapshot; second → **120 KB** with result counts, advertiser names,
Library IDs, and 30 `Started running on` dates.

Then the second trap. A sweep of 8 competitors returned "no matching advertiser" for 7.
That was nearly written up as *"golf-fitness competitors don't buy Meta ads"* — a large
strategic claim. It is unsupportable: the URL used `search_type=keyword_unordered`,
which matches **ad text**, not advertisers. On the GolfForever results page the string
"GolfForever" appeared exactly **once — as the searchbox value** — while all 28 rendered
ads belonged to other advertisers. `search_type=page` does not rescue it; Meta silently
normalises it back and the page still renders the words "keyword search."

## Who did what

- **Opus 5 (me)** was wrong first: I inherited "rate-limiting" and would have retried
  the same way. The `curl` body-read is what broke it open, and that was cheap and free
  — I should reach for it before spending an agent call, not after.
- **Opus 5 (me)** also produced the session's worst artifact: a safety claim in my own
  addendum that was true but misleading (below). My hostile round 1 caught it, not review.
- **Codex** executed faithfully and reported accurately — every advertiser name, date and
  Library ID it gave appears verbatim in the raw page snapshot. Zero hallucination across
  three runs.
- **Codex** made the session's best unprompted catch: that Meta had rewritten the
  advertiser-mode URL. That single observation is what stopped the false conclusion.
- **Codex's known weakness held**: handed a null, it reports NO_MATCH without asking
  whether the query could ever have matched. The fix is prompt-level — give it a
  positive control. I did on run three, and it correctly reported the control passing
  while flagging the nulls as untrustworthy.

## Skills created or changed

- **`market-recon.md` Step 2b (new)** — the challenge-clearing sequence. Motivated by a
  run that lost the whole sub-pass to a 403 it read as a denial.
- **`market-recon.md` Step 3b (new)** — an explicit ban on writing "X does not advertise
  on Meta" from a keyword null, with the evidence that makes the ban stick.
- **`README.md` known gaps (amended)** — the `.playwright-mcp` entry said "166 KB, harmless."
  Measured 6.9 MB / 89 files holding 812 JWT-shaped strings from Meta's own scripts. Not
  Sean's credentials (browser `--isolated`, zero session cookies, outside git), but not
  "harmless" either.

## Mistakes I made

- I wrote "zero click, type, fill, press, select or upload calls" as a safety claim. True,
  and misleading: the sweep ran `browser_evaluate` **15 times**, which is sharper than
  clicking because in-page JS can click and submit without touching the click tool.
  `BrowserPolicy.ps1` warns about this exact framing and I reproduced it anyway.
- I nearly reported an absence from an instrument that cannot observe absence — trap 6,
  already documented twice.
- I wrote "byte-identical" when I had compared displayed counts, not bytes.
- I placed a correct new claim directly beneath a stale one that contradicted its spirit
  ("returned ~32,000 results", implying the link just works).
- I assumed my own Playwright was available; the shared-profile collision is live.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What finally stopped it |
|---|---|---|---|
| Believing a negative without validating the instrument | 1 near-miss | **Yes — 3rd write-up** | Procedural check: locate where the term *does* appear on the page (searchbox vs ad card) |
| Absence of clicks presented as read-only | 1 | **Yes — BrowserPolicy note 5** | Grep the server log for per-tool counts; publish the table |
| Agent self-report treated as evidence | 0 (avoided) | Yes — trap 5 | Verified every datum against the raw page snapshot before writing it |
| Overstated precision in my own wording | 1 | No | Round-4 read-back of my own text |

**The highest-signal row is the first.** It has been documented three times and still
nearly recurred. Writing the lesson down did not prevent it. What prevented it was a
*procedural* step with an observable output — "find where the term appears on the page"
— not an instruction to be careful. Convert every recurring lesson into a command you
can run, or expect it back.

## External-model calibration

| Model | Findings real | Disproven | Cost | Verdict |
|---|---|---|---|---|
| codex (exec) | data extraction 100% accurate vs raw snapshots; 1 high-value unprompted catch (URL rewrite) | 0 fabrications across 3 runs | subscription | Trustworthy for bounded extraction; **do not** trust its nulls without a positive control |

## Confirmed empirically, same session — the null WAS wrong

The lesson above was written as a caution. It was then tested and **proved**, which is
why this packet is worth keeping rather than filing as an opinion.

Re-running the same 7 businesses through true advertiser lookup
(`view_all_page_id=<numeric>`, with a positive control) reversed one of them:
**GolfForever, reported by keyword search as having no matching ads, has live Meta
ads** (Library IDs 1532961687777353 and 1578334163945100). Four others were confirmed
to genuinely run none — each on an Ad Library page scoped to them *by name*, reading
"No ads match your search criteria" under both `active` and `all`.

So the keyword null was not merely unproven, it was **factually wrong in 1 of 5
checkable cases — a 20% false-negative rate.** Had it been published as "the golf
competitors don't advertise on Meta," it would have named a competitor's live ad
campaign as nonexistent, in a document intended to guide ad spend.

Two transferable mechanics came out of it:
- **The positive control is what made the nulls usable.** Given a control, the same
  model correctly reported "the nulls can be trusted because the control returned ads."
  Given no control one run earlier, it reported nulls flatly. Same model, same task —
  the prompt carrying a known positive is the entire difference.
- **The obtainable-without-typing path.** The numeric page id is reachable from the
  competitor's own website → their public Facebook page → read the id in the browser.
  No search-box typing, so it stays inside a read-only remit.

## Carry-forward rules

1. **Read the body before believing the status.** A 403/404/empty response is a signal to
   inspect, not a verdict to report.
2. **Before reporting absence, name where presence would appear and confirm the tool can
   see that place.** If you cannot, the finding is `[UNKNOWN]`, not "none."
3. **Give any extraction agent a positive control** when a null is a possible answer.
4. **Zero click calls is not read-only** while `browser_evaluate` exists. Say what bounds
   the run — here, `--isolated`.
5. **When a lesson recurs, the write-up failed.** Replace it with a runnable check.

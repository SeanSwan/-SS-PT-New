# Creator Brains engine — R2 hostile-review consult packet (2026-09-15)

**Remit:** hostile review of `scripts/creator-brains/` (SS-PT) — defects both prior
rounds missed, plus ranked upgrades / enhancements / missing gaps. Verdict format:
`APPROVE | REVISE | REJECT` + a ranked top-10 upgrade list. You may read any file
under `scripts/creator-brains/` and the blueprint; cite `file:line` for every finding.

**Constraints the engine must live under (do not propose against them):**
- Zero npm dependencies (Node 24 + yt-dlp via uv/uvx). Rule 4: max 300 lines/file.
- Windows-first (Sean's machine); store at `.ai-workflow/creator-brains/` (gitignored).
- Tier law: Lane B (`docs/`) is owner-private transcript text — never rendered,
  exported, or digested; Lane C is derived and may leave the machine.
- Any LLM-backed seam stays behind the owner's explicit spend gate (Rule 16) — propose
  the seam, not a silent wiring.
- Extraction output is labelled `candidate` everywhere; it is not a validated statement
  of anyone's position.

## What this engine is (60 seconds)

One brain per YouTube creator, built from the creator's own transcripts, updated by a
daily scheduled run: `add @handle → discover (videos+shorts+streams) → fetch json3
transcripts → derive candidate claims/doctrine/topics/timeline → publish to
`brains/<channelId>/` (fidelity-gated) → stage to a wiki vault. Budget: rolling-hour
cap of yt-dlp transport ops, persisted cross-process; per-run work/time bounds; shared
429/bot-check cooldown; whole-run exclusive lock; run journal + digest on every path.
OAuth (PKCE + loopback + paginated subscriptions.list with a completeness verdict) is
BUILT but never live-authorized — owner action pending.

## Verification state of this tree (2026-09-15, re-verified today)

- Offline suite: **186 tests, 180 pass, 0 fail, 6 skipped** (skips = live network tests).
- Reviewer instruments from R1: `reproduce.mjs` 0/20, `transport-probes.mjs` 0/4 violations.
- Mutation check: 10/10 killed; requirement map + readiness receipt (`structurallyReady: true`).
- **All 81 engine files hash-identical today to the repair record's manifest** — the
  evidence applies to this exact revision.
- Engine is entirely UNTRACKED in git (`?? scripts/creator-brains/`). Nothing committed.

## Prior review coverage (do not re-litigate; assume repaired)

HR01 budget persistence · HR02 selection widening · HR03 exit codes · HR04/05 strict
reads · HR06 polarity · HR07 channelId namespacing · HR08 reconcile/reap · HR09
whole-file fidelity gate · HR10 OAuth lane · HR11 doc hash · HR12 enumeration
completeness · HR13 cue validation · HR14 lock · HR15 contradiction semantics · HR16
startup records · HR17 coverage honesty · HR18 authority · HR19 probe kinds · HR20
yt-dlp allowlist · HR21 run ids · HR22 resumable census · HR23 bounds/throttle/backlog ·
HR24 provenance · HR25 backup/restore/rollback · HR26 receipt reconciliation.
Full detail: `docs/ai-workflow/AI-HANDOFF/CREATOR-BRAINS-REVIEW-REPAIR-RECORD-2026-09-13.md`.

## R2 new findings (GLM 5.3 hostile pass, 2026-09-15)

**N1 [P2, VERIFIED by executed benchmark] — fidelity gate is O(output × corpus) per
published file and will not scale to a real backfill.**
`lib/fidelity.mjs` `longestSharedRun` (fidelity.mjs:79-114) slides an n-word window
over the ENTIRE source corpus for every output window, per binary-search step.
Executed probe (unique-text worst case, 2K-word output): 10 docs × 8K words → 1.0s;
50 docs → 5.6s; **200 docs → 24.6s per output file**. `checkGeneration` runs per
published file (index/topics/timeline/rules.jsonl ≈ 4 files/creator/build, daily, and
builds re-run when docs change). PiXimperfect-class channel (~500 videos) ⇒ ~4 min/day
per creator, growing linearly; multi-creator backfills make the daily build the
longest phase. Fix: build a Set of hashed (maxRun+1)-grams of the source corpus ONCE
per build (O(corpus), cacheable per creator keyed by sorted doc-hash list), then check
each output window against the Set — orders of magnitude faster, same guarantee.

**N2 [P2, VERIFIED by read] — `resolveChannel` output parsing reintroduces the HR12
class.** `lib/ytdlp.mjs:123-139` prints `%(...)s\t%(...)s\t%(...)s` (raw strings,
tab-separated, free-text playlist title included); `lib/registry.mjs:82-88` splits the
last non-empty line on `\t`. A channel TITLE containing a literal tab or newline
(they exist) corrupts the row: `add` fails ("did not resolve") or stores a mangled
title. `enumerate` was fixed to `%(...)j` JSON-per-line for exactly this class (HR12);
`resolveChannel` was missed. Fix: print `%(playlist_channel_id)j` etc. as one JSON
object per line and JSON.parse it.

**N3 [P2, VERIFIED by read] — reservation journal grows unbounded and is fully
re-parsed on every reservation.** `lib/ledger.mjs` `live()` (ledger.mjs:111-119)
`readJsonl`'s the WHOLE `reservations.jsonl` on EVERY `reserveCost` call, and nothing
ever prunes the file. A backfill at 20 ops/hour ≈ 500 lines/day ≈ 180K lines/year;
each of the day's ~500 reservations re-parses the whole file (O(n²) daily work).
Fix: when stale (out-of-window) lines exceed a threshold (e.g. 2× cap), rewrite the
journal in place with only in-window entries — under the run lock that already exists.

**N4 [P3, VERIFIED by read] — per-video deferral reason is hardcoded to
`deferred_budget`.** `lib/fetch.mjs` `deferred()` (fetch.mjs:286-294) always sets
`reason: 'deferred_budget'`; the throttle-vs-budget distinction survives only as prose
in `lastError` (string-scoped later by `noteTransportFailure`). `reserveCost` already
returns a machine-readable `deferredReason` (`deferred_throttle` | `deferred_budget`)
— it is discarded by `takeSlot`/`deferred`. Fix: thread `deferredReason` through so
run records can count deferrals by kind without string matching.

**N5 [P3, VERIFIED by read] — "mode 0600" token storage is a no-op on the deployment
platform.** `lib/oauth.mjs:264-269` writes `token.json` with `mode: 0o600` + chmod;
on Windows neither has effect. Effective protection is NTFS ACL inheritance from
`%LOCALAPPDATA%` (user-scoped — acceptable), but README and the repair record claim
"mode 0600" as the mechanism. Fix: document the Windows reality; optional upgrade:
DPAPI / Windows Credential Manager for the refresh token.

**N6 [P3, defense-in-depth] — reflected query param in the consent HTML page.**
`lib/consent.mjs:121-123` interpolates Google's `error` param into an unescaped HTML
template. Gated by the state check (an attacker without the state is rejected before
this line) and Google error values are enum-like — but the safe pattern is a fixed
string or HTML-escape. Fix: escape or whitelist.

**N7 [P3, VERIFIED by read] — `REQUIRED_FIELDS` in query omits `polarity`.**
`lib/query.mjs:42` requires claim_id/creator_id/video_id/t_start_ms/key_phrase but not
`polarity` — a row missing polarity is a hit that can never participate in
contradiction detection, silently. HR24 made polarity first-class; the query-side
required-fields list was not updated. Fix: add `polarity` (and consider
`validation`/`citation_status`).

**N8 [P3, VERIFIED] — docs drift (Rule 53 class).** `scripts/creator-brains/README.md`
line 6 is a mangled duplicate of the status line (`eproduce.mjs and <tab>ransport-…`,
first letters clipped); README's test command lists 14 files / "130 tests" vs the real
22+ files / 186 tests. Fix: repair line 5-7, regenerate the test block (or point at
`node --test` with a glob/list), sweep adjacent docs for the same counts.

**N9 [P2, VERIFIED] — the R1 reviewer instruments are not in this repo.** The repair
record and evidence receipts reference `creator-brains-hostile-review-2026-09-13/`
relative to AI-HANDOFF; that directory exists only in a DIFFERENT checkout
(`C:\Users\<operator>\Desktop\quick-pt\SS-PT\`), not in this canonical tree
(`@Everything\quick-pt\SS-PT`). The in-repo evidence trail cites instruments whose
source lives outside the repo. Fix: copy the packet (README, reproduce.mjs,
transport-probes.mjs, snapshot) into this tree and re-run, or record the canonical
location explicitly.

**N10 [P3] — subscriptions page ceiling.** `lib/subscriptions.mjs` MAX_PAGES=40 ×
PAGE_SIZE=50 = 2,000 subscriptions; a larger account hits `subscriptions_page_cap`,
sync refuses (safe direction, visible) — but permanently. Fix: raise the cap (or make
it operator-settable with validation) and document the ceiling.

**N11 [P1, process] — 84 files, 16K lines, entirely untracked.** The run.mjs
truncation incident already happened once in this state; the engine's only version
control is a hash manifest. Fix: commit to a branch (owner approval pending per the
builder's report).

## Acknowledged seams (upgrades already admitted — rank, don't re-discover)

- Semantic retrieval (embeddings over rules.jsonl rows) — lexical-only search is the
  top known capability gap ("tear trough" won't find "under-eye hollow").
- LLM-assisted extraction behind the spend gate (rules.jsonl `extractor` field is the
  designed seam; current phrasing is rough, labelled `candidate`).

## Questions for the external seats

1. What defect class do BOTH prior rounds + N1-N11 still miss? (Think: Windows
   scheduler/paths, yt-dlp output-shape drift, state-machine deadlocks, tier-law
   leaks, vault-publishing failure modes.)
2. Rank the top 10 upgrades/enhancements by value-to-effort for the product goal
   (daily-refreshing cited doctrine brains, one operator, ≤5 creators).
3. Is the fidelity-gate contract (7-word verbatim cap vs source corpus) the right
   internal-control design at all once N1's fix lands, or should the cap live
   elsewhere (e.g. at claim level only)?
4. Any gap in the OAuth/token story short of "owner runs authorize"?

# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-KIMI-PACKET-8-SWAN-SCOUT-2026-08-12.md
**Seed:** (none)
**Tokens:** 13977 in / 19878 out | **Cost:** ~$0.3401 | **Wall:** 809.3s | **finish_reason:** stop

---

# swan-scout hostile review — packet 8

## Part 1: Verdicts on the five fixed findings

**1. HIGH — `searchTranscript` offset drift. Fix is CORRECT for the reported bug.** `starts[]` and `hay` are now both built from per-cue lowercased text with `+1` per join space, and `parts.join(' ')` agrees with that arithmetic. I checked the remaining normalization surface you asked about:

- **Unicode normalization forms:** none on this path (no NFC/NFD anywhere). Not an issue.
- **Surrogate pairs:** `String.length` counts code units, but `starts[]`, `hay`, and `indexOf` all use code units consistently. Consistent — not an issue.
- **Needle lowercase length vs. typed query:** irrelevant — both sides are lowercased, so a length change in the needle is self-consistent.
- **`\s+` collapsing in `parseJson3`:** applied to cues, and the haystack is rebuilt *from cues*, so it's self-consistent. **But the needle is not collapsed — see Finding 4 below. This is the one you missed.**
- Case-fold asymmetries remain (`ß` vs `ss`, ligatures): searching "strasse" won't match "straße". Inherent to `toLowerCase` matching; worth a one-line doc note, not a fix.

**2. MEDIUM — `days: null`. Fix is CORRECT.** `effectivePruneDays` is now the single interpretation point; the server calls it and `pruneCache` re-applies it idempotently. Double-clamping is harmless. **However, the fix is incomplete at the other end of the clamp — see Finding 5 (`days: 0` and negatives still mean "delete everything").**

**3. MEDIUM — prune deleting foreign files. Fix is CORRECT; the regex is tight enough.** `readdirSync` returns bare names, so `.*` in `_raw_<id>.*.json3` can never contain a path separator — no traversal is possible through it. Residual: it will delete a file it didn't create *if* the file matches the pattern (e.g., someone's `_raw_<id>.backup.json3`). Acceptable. On `SWAN_SCOUT_ROOT`: I traced every tool — all pass the module-level `ROOT` constant; **no caller input reaches `root`**, so the escape hatch is operator-only, not caller-reachable. That makes it acceptable. One caveat: the "gitignored (verified via `git check-ignore`)" comment at `yt-scout-transcript.mjs:134` was verified only for the repo-default root. An overridden root has no such guarantee, and the comment overclaims. LOW.

**4. MEDIUM — corrupt cues cache. Fix is CORRECT for truncation but INCOMPLETE for a worse case — see Finding 3.** Short answer to your question: **yes, it needs temp-file-plus-rename**, and the reason is stronger than the one you cited.

**5. Hardening — frame ceiling. CORRECT.** The resync keeps the tail after the last newline and clears if still over; a newline-free flood is capped. Chars-not-bytes is fine (worst case 8 MB UTF-16). Edge: a single >4 MB chunk containing many valid frames drops them all — acceptable against a garbage peer.

---

## Part 2: New findings

### MEDIUM

**F1 — `searchTranscript` timestamps and jump-to URLs point at the *context-start* cue, not the match cue. The comment says the opposite.**
`yt-scout-transcript.mjs:118-124`:
```js
const start = Math.max(0, cueIdx - ctx);
...
ms: cues[start].ms,
timestamp: fmtTimestamp(cues[start].ms),
url: ... &t=${Math.floor(cues[start].ms / 1000)}s
```
The comment at lines 76-78 claims mapping back "keeps the timestamp pointing at the cue the phrase actually starts in rather than a couple of cues early." The code stamps `cues[start]` = `cueIdx - ctx` — literally a couple of cues early. With `context: 10` (allowed) and auto-sub cues of 2–8 s, the deep link lands up to a minute+ before the words were said. This is your stated core threat: the agent records "Karpathy says X at 1:23:45" and codifies it, and the timestamp is wrong by a silent, plausible-looking offset. Given your 2-for-2 pattern: this finding sits directly under a comment asserting the code is careful about exactly this.
- **Confirm:** cache any transcript; search a phrase known to be in cue N with `context: 2`; compare returned `ms` to `cues[N].ms`. They will differ by two cues' worth of ms.
- **Kill:** demonstrate the lead-in offset is deliberate product intent — in which case the *comment* is the bug and the field should be renamed (`excerpt_start`) so the agent doesn't read it as the moment of speech.
- **Confidence: HIGH** that code contradicts stated intent; MEDIUM that it's a defect rather than intent.

**F2 — Cache key omits `lang`: a second fetch in a different language silently returns the first language, and the receipt never says which language it is.**
`yt-scout-transcript.mjs:202-205`: paths are `${id}.txt` / `${id}.cues.json`; the cache-hit branch never compares `lang`. Precondition: fetch video V with `lang:'en'`, then fetch V with `lang:'fr'` (or an agent does, weeks later). Result: English transcript returned as fact for a French request, receipt says nothing. Compounding: `yt_find_in_video` exposes no `lang` at all, so it can never escape a wrong-language cache entry except via `yt_transcript refresh`. Related sub-issue: an interrupted fetch (timeout kill at `runYtDlp`, or a `parseJson3` throw) leaves `_raw_<id>.*.json3` files behind (`:243` cleanup is only reached on success); a later fetch's glob at `:233-235` sorts by `-orig` only, never by language, so `produced[0]` can be a **stale file from a previous language** — cached and returned confidently.
- **Confirm:** fetch with `lang:'en'`; fetch same id with `lang:'fr'`; observe `cached: true` and identical chars. For the stale-`_raw_` path: plant `_raw_<id>.de.json3` in the cache dir, fetch with `lang:'en'`, observe which file is parsed.
- **Kill:** none apparent for the cache-key half; the stale-`_raw_` half requires an interrupted first run.
- **Confidence: HIGH** (cache key), MEDIUM (stale-glob poisoning).

**F3 — The non-atomic two-file write has a *stale-but-valid* failure mode your corrupt-cache fix cannot catch.**
`yt-scout-transcript.mjs:241-242`: `writeFileSync(txtPath)` then `writeFileSync(cuesPath)`. On a **refresh**, a kill between the two leaves *new* txt + *old* cues — and the old cues are **valid JSON, an array, well-shaped**. The `:211-221` validation (parse + `Array.isArray`) passes. From then on, `yt_find_in_video` returns excerpts and timestamps from the *previous generation* of the transcript while the receipt reports the new char/token counts. Captions do get edited post-upload, so generations genuinely diverge. This is worse than truncation precisely because nothing throws.
- **Confirm:** fetch a video; hand-edit `cues.json` to plausible-but-different cues (or kill a refresh between writes via a stubbed `writeFileSync`); call `yt_find_in_video` — it serves the stale cues with a fresh-looking receipt.
- **Fix:** write `txt.tmp` + `cues.tmp`, rename both (cues last); or embed a generation token (e.g., hash of text) in the cues file and validate on read. Rename-within-directory is atomic on every filesystem you run on.
- **Confidence: HIGH** that the window and the silent-wrongness mode exist; LOW probability of hitting the kill window by accident — but refresh + Ctrl-C is exactly when it happens.

**F4 — The needle is not whitespace-normalized; the haystack is. False "No match" reported as fact.**
`yt-scout-transcript.mjs:82`: `needle = query.trim().toLowerCase()` — internal whitespace untouched. The haystack is built from cues whose whitespace was collapsed at `:50` and which are joined with single spaces. A query of `"context  window"` (two spaces — common when pasting) or one containing a newline **can never match**, and the tool replies "No match for … Try a shorter or more common phrasing" — a confident, wrong, agent-actionable negative. This is the remaining length-changing-normalization bug you asked about in fix #1: the asymmetry isn't case, it's whitespace.
- **Confirm:** search a cached transcript for a known phrase with a double space inserted; observe "No match"; single-space query matches.
- **Kill:** none — unless you argue the "literal substring" disclaimer covers it, which it doesn't for an agent that pasted wrapped text.
- **Fix:** `query.trim().replace(/\s+/g, ' ').toLowerCase()`.
- **Confidence: HIGH.**

**F5 — `days: 0` or any negative still means "delete the entire cache," and the tool description doesn't say so.**
`yt-scout-transcript.mjs:181`: `clampOpt(days, CACHE_TTL_DAYS, 0, 3650)` — min is **0**. `days: 0` → cutoff = now → every OURS file reaped. Negatives clamp *up* to 0, same result. The null trap is closed, but an agent that computes `days` (e.g., "prune anything older than the last run" and the last run was today) passes 0 and wipes the cache — a deletion primitive one reasoning error away, with a green "Pruned N file(s)" receipt. The prior MEDIUM was `null` doing this by accident; `0`/negative doing it *by design* is the same blast radius with a smaller excuse.
- **Confirm:** seed cache, call `yt_cache_prune {days: 0}` — all gone. `{days: -30}` — same.
- **Kill:** you consider 0 an intentional "delete all" — then document it in the tool description and the receipt ("older than 0 day(s)" should say "entire cache").
- **Fix:** min 1, or require an explicit `all: true` for full reaping.
- **Confidence: HIGH** on behavior; severity MEDIUM because it needs explicit (if erroneous) caller input.

### LOW

**F6 — `parseJson3` dedup can drop legitimate repeated speech, and the comment overclaims.** `:52` `prev.includes(text)` drops an exact consecutive repeat ("No." / "No.") — real repetition *is* touched, contra the comment at `:36-37`. Search then undercounts occurrences and loses the second timestamp. Also verify empirically that the heuristic fires on real rolling auto-subs at all: in the growing-window pattern (cue N+1 = cue N + one word), `prev.includes(text)` is *false* — the dedup only fires on window *resets*. Count dropped cues on a real auto-sub fetch; if it's ~0, the code is dead weight with a confident comment. **Confidence: HIGH** that exact repeats are dropped; MEDIUM on the rolling-pattern direction question.

**F7 — `lastEnd` de-overlap makes the reported hit count a count of *windows*, not occurrences.** `:116`: with `context: 10`, a phrase said 20 times in a dense 21-cue region reports "1 passage(s) matching" — a plausible, wrong completeness claim the agent can codify ("he only mentioned pricing once"). The tradeoff is right for context economy; the wording is the bug. Reword to "matching passage window(s)" or state that nearby repeats are merged. **Confidence: HIGH.**

**F8 — `parsePrintRows` (Q1): real, partially reachable, mostly self-mitigating.** A literal TAB in a title shifts `channel`/`duration`/`upload_date`/`view_count` one field right — `id` is field 0 so it can't be displaced (good design, accidental or not). Degraded fields mostly render `?` via `dur`/`day`/`views`, but `channel` would show the title's tail — a wrong attribution rendered as fact. Reachability hinges on whether YouTube admits tabs/newlines in titles and whether yt-dlp escapes them in `--print` (I believe titles are single-line and whitespace-normalized, but I have not verified). **Confirm:** feed crafted stdout with a tabbed title directly into `parsePrintRows` (proves the shift); separately, `yt-dlp --print '%(title)s' <id>` on a title with unusual whitespace (proves reachability). **Confidence: HIGH on the shift, LOW on reachability.**

**F9 — `resolveYtDlp` caches `null` (Q2) *and* the 20 s probe can produce a false null.** Cold `uvx` cache + slow network → `uvx yt-dlp --version` exceeds 20 s → `_binCache = null` → every call fails with "yt-dlp is not available" until server restart, even after the install finishes. Fix is cheap: cache only positive results (a missing binary costs one probe per call, only in the already-broken state). **Confidence: HIGH.**

**F10 — Comment claims uvx fetches a "pinned copy" (`yt-scout-lib.mjs:114`); the argv contains no pin.** `uvx yt-dlp` resolves to whatever PyPI serves that day. Given the comment-as-suspect rule: this is the third overclaiming comment this packet. Either pin (`uvx yt-dlp@2026.08.11`-style) or fix the comment. Supply-chain, not caller-reachable. **Confidence: HIGH** that the code doesn't pin.

**F11 — Sync `execFileSync` starves `ping` (Q4).** During a ≤180 s fetch, the stdio loop can't answer `ping`/`tools/list`; a client with a shorter health-check timeout marks the server hung and may restart it — killing the in-flight fetch and (see F3) possibly mid-write. For a single-user server, throughput doesn't matter; **liveness signaling does**. Either accept-and-document, or move fetches to async `execFile`. **Confidence: HIGH** on the blocking; MEDIUM on whether your client health-checks aggressively enough to care.

**F12 — `head`/`receipt` always append "…"** (`server:145,151`) even when the transcript is shorter than the slice — implies more content exists when it doesn't. Trivial wrongness in the exact output an agent quotes. **Confidence: HIGH.**

**F13 — `videoIdFrom`/`channelUrlFrom` don't anchor the host.** Any string containing `?v=<11 charset-safe chars>` (e.g., a non-YouTube URL) yields an id. The extracted value is charset-safe so there's no injection — you rebuild rather than pass through, which is the right pattern — but acceptance is over-eager and failures surface as confusing yt-dlp errors. **Confidence: HIGH.**

**F14 — `TOOLS[params?.name]` is prototype-pollutable in lookup.** `tools/call` with `name: "constructor"` or `"hasOwnProperty"` returns a truthy built-in, bypasses the unknown-tool error, and dies on `tool.run is not a function` (caught — no crash, wrong error path). `Object.hasOwn(TOOLS, name)` or a `Map`. **Confidence: HIGH; exploitability: none found.**

**F15 — Titles/channels are interpolated raw into a numbered list** (`server:74`). A title containing newlines could forge extra result rows in the agent's context. YouTube titles are believed single-line — verify; if reachable, this is prompt-injection-via-search-result, which is arguably inherent to the tool's purpose. **Confidence: LOW.**

**F16 — Float limits survive `clampOpt`.** `limit: 7.5` → `ytsearch7.5:` / `--playlist-end 7.5` → opaque yt-dlp failure. `Math.trunc` in `clampOpt`. **Confidence: HIGH; impact cosmetic.**

**F17 — Corrupt-but-valid cues shape passes validation.** `JSON.parse` + `Array.isArray` accepts `[1,2,3]`; `searchTranscript` then stringifies `undefined` text to `''`, the haystack is empty, and every search reports "No match" forever (the entry is never re-fetched because validation "passed"). Add a shape check (`typeof c.ms === 'number' && typeof c.text === 'string'`). **Confidence: HIGH** on behavior; LOW on likelihood (requires hand-edit or partial write landing on valid JSON).

---

## Part 3: Your specific questions

1. **TAB in title:** F8 — the shift is real; reachability unverified; `id` is structurally safe as field 0.
2. **`resolveYtDlp` null-caching:** F9 — worth fixing; cache successes only. The 20 s cold-uvx probe makes the false-null case more likely than "user installs mid-session."
3. **`prev.includes(text)`:** F6 — yes, it discards legitimate consecutive repetition, and it matters for search fidelity (undercounting + lost timestamps). Also verify it fires at all on real rolling auto-subs.
4. **Sync blocking:** F11 — not a throughput problem; a *liveness* problem (ping starvation during 180 s fetches). Document or async-ify; don't re-architect.
5. **`lastEnd`:** F7 — yes, it skips legitimate nearby second occurrences; the tradeoff is fine, the *count semantics* presented to the agent are the defect.
6. **MCP protocol handling:** solid. Notifications dropped correctly (including `id: 0` handled right), unknown methods get -32601, bad JSON is skipped (no -32700 possible without an id — fine), batch arrays degrade to silent drops (acceptable for 2024-11-05), non-object `arguments` degrades to clean `YtScoutError`s, and `initialize` correctly states its own version rather than echoing the client's. Only F14 (prototype-key lookup) and the absence of stdout `error`-handling (client death → EPIPE crash — cosmetic for a child whose parent died) are worth noting.

**argv injection — I tried to break it and couldn't.** The `ytsearch${n}:` prefix neutralizes leading `--`; `execFileSync` with an array has no shell; `--sub-langs` is regex-gated and a single argv entry (the `.*` is yt-dlp's glob, not the shell's); the `-o` template contains the id but the 11-char charset excludes `%` and `(`, so no format-specifier injection; `channelUrlFrom` rebuilds URLs from validated captures rather than passing input through. The one soft spot is that a `SWAN_SCOUT_ROOT` containing `%(...)` would be interpreted as template fields by yt-dlp — but that's operator-controlled env, same trust as the root itself. **This claim survives.**

**Full-body paths:** none. receipt ≤600 chars, head ≤4 000, full ≤40 000 via `capText`, excerpts capped by `capText`, listings bounded by clamped limits. **This claim survives.**

---

## Part 4: The `run.mjs` guard

Refusing is the right call, and the placement is right — after parse, before `createStore`/any side effect, with a distinct exit code (2) and a message that names the valid keys. Two notes: (a) if `parseArgs` builds `handles` via `handles[k] = v` on a plain object, a `--__proto__` key sets the prototype and is **invisible to `Object.keys`** — silently ignored rather than refused; use `Object.create(null)` or a `Map` in the parser, or an own-property check here. (b) `registry.has('constructor')` correctly returns false → refused, so no prototype bypass on the check itself. Otherwise correct.

---

**Calibration summary:** 5 MEDIUM (F1–F5), 12 LOW, 2 claims verified as correct, 1 fix found incomplete (F3 extends your #4; F5 extends your #2). F1 and F4 are the two I'd verify first — both are confident-wrongness in the exact output an agent quotes, and F1 sits under a comment asserting the opposite of what the code does.

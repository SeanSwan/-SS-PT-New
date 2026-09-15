# Creator Brains — R2 hostile review + fix packet (2026-09-15)

> **STATUS UPDATE 2026-09-15 (post-review):** N11 CLOSED — the engine + full
> evidence chain committed at `b8bf3b7b6` on branch
> `creator-brains-engine-r2-20260915` (155 files; suite re-verified 186/180/0/6
> after the readiness regen). N9 CLOSED — R1 packet copied in-repo and
> `readiness.mjs REVIEW_IDENTITY.packet` re-pointed at the canonical relative
> path; receipt/requirement-map/gate-log regenerated to the self-referential
> fixed point (`structurallyReady: true`, byte-stable). Operator-identity in the
> frozen R1 evidence logs handled via `.secretignore` (identity-only; my own docs
> redacted). **N1-N8, N10, N12-N15 remain OPEN — repair order in §4 is the
> builder's worklist.**

**Reviewers:** GLM 5.3-Flash (primary pass, this document) · Fable 5.1 (external,
`FABLE-VERDICT.md`) · Astra `gpt-6-astra` (**BLOCKED — Codex seat usage-limited until
2026-09-19 22:12**; fire the ready-made command in §7 when it resets).

**Scope reviewed:** `scripts/creator-brains/` — 84 files, ~16.3K lines, all UNTRACKED
in git. Consult remit shared by all seats: `CONSULT-PACKET.md` (same directory).

**Verdict for the tree as reviewed: REVISE (GLM + Fable agree) — with Fable's commit
ruling adopted: commit to a branch FIRST, unsatisfied review items are not a reason to
keep 16K reviewed lines unversioned.** Fifteen findings total: N1-N11 (GLM pass) +
N12-N15 (from Fable's hypotheses, verified against source in §2b). Highest priority:
N11 (commit), N1 (fidelity scale), N13 (registry lock race), N2/N3 (robustness).

---

## 0. Verification receipts (all executed today, 2026-09-15)

| Check | Command | Result |
|---|---|---|
| Offline suite | `node --experimental-test-isolation=none --test <22 test files>` | **186 tests · 180 pass · 0 fail · 6 skipped** (skips = `@live` network tests) |
| Source drift vs repair-record evidence | sha256(16)+bytes of all 81 `.mjs` vs `CREATOR-BRAINS-HR23-SOURCE-HASHES-2026-09-13.txt` | **81 / 81 unchanged** — the repair record's 0-violation instrument results and 10/10 mutation result apply to this exact revision |
| Fidelity-gate scale probe | `/tmp/cb-fidelity-probe2.mjs` (unique-text worst case, 2K-word output) | 10 docs → 1.0s · 50 docs → 5.6s · **200 docs → 24.6s per output file** (finding N1) |
| Store gitignored | `git check-ignore -v .ai-workflow/creator-brains/` | yes (`.gitignore:444` `.ai-workflow/*`) — README claim holds |
| Suite claim drift | README test block | README says "130 tests" / 14 files; reality 186 / 22+ files (finding N8) |
| R1 packet location | filesystem | `creator-brains-hostile-review-2026-09-13/` exists ONLY in the other checkout `C:\Users\<operator>\Desktop\quick-pt\SS-PT\` — not in this canonical tree (finding N9) |

Not re-run today: live suite (owner-gated network tests), mutation-check (its 10/10
evidence stands; the hash match above proves the code it tested is this code).

## 1. Findings the builder must fix (agent-ready, in repair order)

### N1 [P1 — scalability blocker, VERIFIED by executed probe] Fidelity gate is O(output × corpus) per published file
- **Where:** `lib/fidelity.mjs:79-114` (`longestSharedRun`), called per published file by `checkGeneration` (fidelity.mjs:139-153).
- **What:** every output window slides an n-word comparison across the ENTIRE source corpus, per binary-search step. Measured (unique-text worst case): 200 docs × 8K words = **24.6s for ONE output file**. A build publishes ~4 files per creator and runs daily; a 500-video channel ⇒ ~4 min/day/creator, growing linearly; multi-creator days make `build` the longest phase.
- **Required fix:** build a `Set` of **hashed (maxRun+1)-grams** (8-grams; 64-bit rolling hash of the normalized word sequence — NOT string joins, which would cost ~500 MB at 4M windows) over the source corpus ONCE per build, then test each output 8-window's hash against the Set. O(corpus + output). Cache the Set per creator keyed by the sorted list of doc content hashes so an unchanged corpus reuses it. Rejection semantics are unchanged: the gate rejects runs > maxRun, and any shared 8-window implies one.
- **Acceptance test:** with a 200-doc × 8K-word synthetic corpus, `checkGeneration` completes < 1s per file and still quarantines a planted 12-word verbatim run (extend `test/bounds.test.mjs` or add `test/fidelity-scale.test.mjs`; keep it offline).

### N2 [P2] `resolveChannel` parsing reintroduces the HR12 class
- **Where:** `lib/ytdlp.mjs:123-139` prints `%(playlist_channel_id)s\t%(playlist_uploader_id)s\t%(playlist_title)s`; `lib/registry.mjs:82-88` splits the last non-empty line on `\t`.
- **What:** a channel **title** containing a literal tab or newline corrupts the parse — `add` fails with "did not resolve", or stores a mangled title. HR12 moved `enumerate` to `%(...)j` JSON-per-line for exactly this class; `resolveChannel` was missed.
- **Required fix:** print one JSON object per line (`--print '%(playlist_channel_id)j\t%(playlist_uploader_id)j\t%(playlist_title)j'` is still tab-joined — better: a single `--print "{...}j"` object), `JSON.parse` it, validate the channel id as today.
- **Acceptance test:** a fake resolver returning a title with an embedded `\t` and `\n` still resolves the correct channelId and preserves the title bytes (extend `test/cli.test.mjs` creator-add coverage).

### N3 [P2] Reservation journal grows unbounded; fully re-parsed per reservation
- **Where:** `lib/ledger.mjs` `live()` (ledger.mjs:111-119) re-reads and `JSON.parse`s ALL of `reservations.jsonl` on EVERY `reserveCost`; nothing prunes the file.
- **What:** backfill at 20 ops/hour ≈ 500 lines/day ≈ 180K lines/year; each of the day's ~500 reservations re-parses the whole file — O(n²) daily work that compounds exactly when the engine is doing its heaviest lifting.
- **Required fix:** inside `reserveCost` (or on budget close), when out-of-window lines exceed a threshold (e.g. `max(2 × perHour, 200)`), rewrite `reservations.jsonl` in place with only in-window entries — the whole-run lock (HR14) already serializes writers, and a crash mid-compaction is the safe direction (an over-large journal only ever over-counts spend, never under-counts).
- **Acceptance test:** seed 5K stale entries + 3 in-window; after one run the file contains exactly the in-window entries and the budget math is unchanged (add to `test/unit.test.mjs` budget block).

### N4 [P3] Per-video deferral reason hardcoded to `deferred_budget`
- **Where:** `lib/fetch.mjs:286-294` (`deferred()`); `reserveCost` already returns machine-readable `deferredReason` (`deferred_throttle` | `deferred_budget`), discarded by `takeSlot` (fetch.mjs:272-279).
- **Required fix:** thread `deferredKind` through `takeSlot` → `deferred()` → the outcome so run records count deferrals by kind without string matching (`pipeline.mjs:184-194` currently re-derives throttle from prose).
- **Acceptance test:** a run whose budget reserve hits the throttle path reports `counts.deferredKind: 'deferred_throttle'`.

### N5 [P3] "mode 0600" token storage is a no-op on Windows
- **Where:** `lib/oauth.mjs:264-269`; claimed as protection in README §OAuth and the repair record.
- **Required fix:** say what is true: on Windows the protection is NTFS ACL inheritance from `%LOCALAPPDATA%` (user-scoped), and `mode 0600` applies only to POSIX platforms. Optional upgrade U5 for real Windows hardening.
- **Acceptance test:** docs-only; grep `0600` across `scripts/creator-brains/` + blueprint and correct each claim (Rule 53 sweep).

### N6 [P3] Reflected `error` param in consent HTML
- **Where:** `lib/consent.mjs:121-123` interpolates Google's `error` into an unescaped HTML template. Gated by the state check and enum-like values today — defense-in-depth only.
- **Required fix:** escape (`error.replace(/[&<>"']/g, …)`) or map to a fixed allowlist of error strings before interpolation.
- **Acceptance test:** consent test with `error=<script>` renders escaped text (extend `test/consent.test.mjs`).

### N7 [P3] `REQUIRED_FIELDS` omits `polarity`
- **Where:** `lib/query.mjs:42`.
- **What:** a rules row missing `polarity` loads as a hit but can never enter contradiction detection — HR24 made polarity first-class; the query-side list lagged.
- **Required fix:** add `'polarity'` to `REQUIRED_FIELDS` (consider also `validation`, `citation_status`, matching HR24's provenance contract).
- **Acceptance test:** a row without polarity is reported in `skipped`, not counted as a hit (extend the HR24 test).

### N8 [P3] Docs drift in engine README (Rule 53 class)
- **Where:** `scripts/creator-brains/README.md` lines 5-6 (mangled duplicate status line: `eproduce.mjs and <TAB>ransport-probes.mjs`, first letters clipped) and the test block (says 14 files / "130 tests"; reality 22+ files / 186 tests).
- **Required fix:** repair lines 5-7 to a single status line; replace the hardcoded file list with the canonical invocation (a documented glob or the maintained list) and the real count — then sweep `CREATOR-BRAINS-SS-PT-ENGINE-BLUEPRINT-2026-09-12.md` §13 and the readiness receipt for the same stale figures before regenerating them.
- **Acceptance test:** `grep -n "130 tests\|eproduce" scripts/creator-brains/README.md` returns nothing; receipt regenerated via `readiness.mjs`.

### N9 [P2] The R1 reviewer instruments are not in this repo
- **Where:** repair record + evidence receipts reference `creator-brains-hostile-review-2026-09-13/` relative to `AI-HANDOFF/`; that directory exists only in `C:\Users\<operator>\Desktop\quick-pt\SS-PT\` (a DIFFERENT checkout that does not even contain the engine).
- **What:** the in-repo evidence trail cites instruments whose source lives outside the repo — the trail is not self-contained, which is exactly what an audit record must be (rule 48).
- **Required fix:** copy the packet (README, `reproduce.mjs`, `transport-probes.mjs`, `snapshot/`, `source-manifest.json`, `verification-receipt.json`) into `docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13/` of THIS tree, re-run both instruments, and refresh `CREATOR-BRAINS-EVIDENCE-REVIEWER-INSTRUMENTS-2026-09-13.txt`. Record in the repair record §0.1 that the canonical packet now lives in-repo.
- **Acceptance test:** `node docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-2026-09-13/reproduce.mjs` runs from this tree and reports 0/20.

### N10 [P3] Subscriptions page ceiling (2,000)
- **Where:** `lib/subscriptions.mjs:45` `MAX_PAGES = 40` × `PAGE_SIZE = 50`.
- **What:** >2,000 subscriptions ⇒ permanent `subscriptions_page_cap`; sync refuses (safe direction, visible) but never succeeds.
- **Required fix:** raise `MAX_PAGES` to a bound that still terminates (e.g. 200 = 10K channels; the cursor-loop guard already bounds pathology) or make it an operator flag validated like `--per-hour`; document the ceiling in README §OAuth.
- **Acceptance test:** offline test with a fake fetchImpl serving 41 pages asserts completion at the new cap.

### N11 [P1 — process] The engine is entirely untracked
- **Where:** `git status` → `?? scripts/creator-brains/` (84 files, ~16.3K lines).
- **What:** the run.mjs truncation incident already happened in exactly this state; the only revision marker is a hash manifest. One bad edit away from losing reviewed work.
- **Required fix:** commit the engine + docs to a branch (NOT a `git add -A`; explicit paths, per rule 67). Commit message should cite this review and the repair record. **Owner approval for committing was already offered by the builder ("Say the word and I'll commit") — this review makes that word: commit it.**

## 2. Upgrade backlog (ranked; ~value-to-effort for 1 operator, ≤5 creators)

1. **U1 — Semantic retrieval lane.** Embeddings over `rules.jsonl` rows (chunk = claim ± context), rebuildable index keyed by `claim_id` + `docRevision`, cosine top-k merged with lexical hits. `tear trough` finding `under-eye hollow` is the difference between a glossary and a brain. Still no npm deps if the index is JSON + a trivial scorer, or sqlite-vec if Sean allows one dep. Behind the spend gate for the embedding API; the index itself is offline.
2. **U2 — LLM-assisted extraction behind `rules.jsonl`'s designed seam.** The `extractor` field already versions this. Deterministic lane stays as the candidate floor; the model pass rewrites phrasing ONLY, polarity/citation carried through, output still fidelity-gated + labelled. Gate: Rule 16 per-run spend.
3. **U3 — Digest delivery.** `run-daily` writes the digest file and prints to stdout a Task Scheduler job nobody watches. "Absence is the alarm" needs an alarm: push the one-paragraph verdict to an operator surface that exists (Hermes/Telegram lane or a scheduled `status --stale` check). Cheapest real UX win in the list.
4. **U4 — Fidelity Set precompute + per-creator n-gram cache** (this is N1's fix — listed once as a finding, carries the cache design).
5. **U5 — DPAPI/Credential-Manager storage for the OAuth refresh token** (closes N5's Windows gap for real; `cmdkey`/PowerShell `Export-Secret` via child_process keeps zero-deps).
6. **U6 — `query --json` output** for downstream consumers (the object already exists; add the flag + stable field contract).
7. **U7 — Near-duplicate doctrine merging** (Levenshtein/Jaccard on key phrases) so "always blur the tear trough" and "always blur tear trough" don't split into two doctrines with 1 video each. With N1's Set in place this is cheap.
8. **U8 — Vault publish helper**: the WSL copy step is the one manual link in the chain; a `publish` command that shells the documented `cp` (or writes a `--dry-run` plan) removes the last hand-step before the vault.

## 2b. Findings added from the Fable verdict (each verified against source before promotion)

Fable 5.1 reviewed from the packet only and honestly flagged every item UNVERIFIED.
Dispositions after source verification (rule 30/55: hypothesis → probe/read or killed):

| Fable item | Disposition | Resulting action |
|---|---|---|
| **R3-01** Lane B leak via failure outputs (gate failure reports, lastError, digest) | **AUDITED CLEAN** — quarantine JSON deliberately excludes the offending text (`render.mjs:105-111`); gate-failure notes carry only counts + file name (`build-phase.mjs:91`); `validateCues` problems quote indices/numbers only (`subtitles.mjs:47-59`); `parseJson3` throws a fixed string (`yt-scout-transcript.mjs:39`); digest carries scrubbed phase reasons, no doc content | Add ONE regression test: quarantine JSON + run record + digest contain no 8-word source run after a forced fidelity failure (pins the design) |
| **R3-02** yt-dlp unpinned under a daily scheduler | **PARTIALLY TRUE** — version IS recorded per run (`run.mjs:100` `record.ytDlp`), but the transport is unpinned (`resolveYtDlp` → bare `yt-dlp`/`uvx yt-dlp`) | New **N15**: pin the uvx spec + operator upgrade ceremony |
| **R3-03** Caption-track identity (ASR vs auto-translated) | **LARGELY MITIGATED** — `originals = /-orig$/` tracks preferred, machine translations refused as no_track substitutes, `originalTrack` provenance per doc (`probe.mjs:73`, `fetch.mjs:108-123,174-177`) | Upgrade: propagate `originalTrack` into rules.jsonl rows; optionally distinguish creator-uploaded vs ASR |
| **R3-04** Fidelity tokenization normalization bypass | **KILLED** — `normalizeWords` (NFKC + lowercase + all non-alphanumerics as separators) is applied symmetrically to output AND sources (`fidelity.mjs:80-82`); smart-quote substitution changes nothing on either side | Design note for N1: the hashed Set must hash the same normalized sequence |
| **R3-05** No dead-man's switch for a run that never starts | **PARTIALLY EXISTS** — `last-success.json` tracked separately and `status` prints "last good Nd ago"; what's missing is DELIVERY (Task Scheduler output is invisible) | Merged into **U3** (digest delivery/staleness alarm) |
| **R3-06** Windows publish atomicity (AV/indexer EBUSY) + filename law | **REAL (narrow)** — `writeTextAtomic` temp+rename has no EBUSY/EPERM retry; filename law is low-risk (slug + channelId suffix defeats reserved-name collision) | New **N12**: bounded rename retry |
| **R3-07c** `add`/`enable` vs the running daily job | **CONFIRMED REAL** — registry mutations (`addCreator`, `setEnabled`, sync's applySnapshot) take NO lock; a run holds the lock ~45 min and rewrites registry.json from its in-memory copy (`touchCreator`), so an enable/disable during a run can be silently lost | New **N13** (P2) |
| **R3-07** PID-reuse stale-lock | **NOTED** — pid-liveness reclaim exists with real child-process tests, but Windows PID reuse can make a dead owner look alive → refusal (safe direction, manual clear) | P3 hardening note: store process-start time in the lock body and compare |
| **R3-07d/e/f** token.json in backups / handle dedupe / permanent-failure burn | **ALL KILLED** — token.json lives in `%LOCALAPPDATA%`, outside backup scope (`backup.mjs` DURABLE lists); `upsertCreator` dedupes by channelId; FSM MAX_ATTEMPTS bounds transient-failure burn | No action |
| **Q4** OAuth gaps | 7-day trap + scope recording + expiry skew + invalid_grant handling ALREADY implemented/documented (`oauth.mjs:44-54,139,149-167`; README §OAuth) | New **N14**: no `revoke` CLI command exists — lifecycle exit missing |

### N12 [P3] Windows publish rename lacks EBUSY/EPERM retry
- **Where:** `lib/paths.mjs` `writeTextAtomic` (paths.mjs:136-147) — used by every publish path.
- **Required fix:** on rename failure with `EPERM`/`EBUSY`, retry ≤3 times with short backoff before rethrowing (Defender/Search Indexer transiently holding the target is the canonical Windows-first failure).
- **Acceptance test:** simulate a rename that fails twice then succeeds; assert publication + report.

### N13 [P2] Registry mutations are not serialized against the run lock
- **Where:** `lib/registry.mjs` `addCreator`/`setEnabled`/`touchCreator`; `lib/subs.mjs` sync apply path; no `withLock` anywhere outside `run.mjs`.
- **Required fix:** wrap registry-mutating CLI commands (`add`, `enable`, `disable`, `sync`) in `withLock` with a short `onBusy` refusal naming the running pid — same protocol, same file.
- **Acceptance test:** concurrency test — a child process running `enable` against a store locked by a simulated run is refused with a recorded outcome and the flip survives the next run.

### N14 [P3] No `revoke` command — the OAuth lifecycle has no operator exit
- **Where:** `lib/oauth.mjs` `revokeToken` exists; no command in `cli.mjs`/`commands.mjs` reaches it.
- **Required fix:** `cli.mjs revoke` — calls `revokeToken`, marks the token record revoked, deletes `token.json`, reports next steps.
- **Acceptance test:** offline consent-style test with injected fetch; assert revocation recorded + local token gone.

### N15 [P3] Pin the yt-dlp transport
- **Where:** `lib/ytdlp.mjs` `resolveYtDlp` — bare `yt-dlp` / `uvx yt-dlp`; version recorded per run but never pinned.
- **Required fix:** when falling back to uvx, resolve once and pin (`uvx yt-dlp==<recorded-version>` persisted in the store; `--upgrade` is a deliberate operator command); document the upgrade ceremony in README.
- **Acceptance test:** resolveYtDlp under a fake PATH yields a pinned spec string; a version change in the store forces re-resolution + run-record note.

## 3. External verdicts

### Fable 5.1 — `FABLE-VERDICT.md` (live call 2026-09-15, ~$0.56, 4345 in / 10294 out)
**REVISE** — no finding architecturally fatal; repair discipline "genuinely above bar";
but tier law and verbatim cap are "asserted, not demonstrated" at their weakest
points (R3-01/R3-04 — both since verified clean/killed by source, §2b). **Commit
ruling: "COMMIT IMMEDIATELY to a branch — do not gate the commit on the REVISE
items… Version control is a precondition for safe repair, not a reward."** Sequence:
(1) secret/Lane-B sweep against .gitignore → (2) commit tree + pull R1 packet in-repo
(closes N9) → (3) REVISE list as reviewable diffs, R3-01-audit first. Full ruling:
`FABLE-VERDICT.md`.

### Astra (`gpt-6-astra`) — BLOCKED
Codex seat usage-limited until **2026-09-19 22:12** (verified live: CLI returns "You've
hit your usage limit… try again at Sep 19th, 2026 10:12 PM"). The consult is
one command, ready to fire when the seat resets — see §7.

## 4. Repair order for the builder agent (Fable's sequencing adopted)

1. **Secret/tier sweep then COMMIT (N11)** — grep the tree for secrets and Lane-B files against `.gitignore` (rule 44 scan), then commit engine + docs to a feature branch with explicit paths (NOT `git add -A`). This includes copying the R1 instrument packet in-repo (**N9**) per Fable's step 2.
2. **R3-01 regression pin** — one test proving quarantine JSON + run record + digest stay free of source runs after a forced fidelity failure (the audit is clean; pin it).
3. **N1** — fidelity hashed-n-gram Set (+ normalization identity preserved) + scale test.
4. **N13** — lock registry mutations; **N2 + N3** — resolver JSON parsing; journal compaction.
5. **N4, N7, N12, N14** — deferral kind, polarity required-field, EBUSY retry, `revoke` command (small, testable batch).
6. **N5, N6, N8, N10, N15** — docs/hardening sweep in one pass (Rule 53 adjacent-doc sweep included).
7. Re-run: offline suite, both reviewer instruments, `mutation-check.mjs`, `readiness.mjs` — update the receipt + hashes. Then this packet's findings move to a repaired table exactly like the R1 repair record did.

## 5. What was verified GOOD in this pass (so the next reviewer doesn't re-derive it)

Store strict-reads + union-merge state save · whole-run lock with pid-liveness reclaim ·
write-ahead reservation ledger · per-operation admission wrapper · allowlist yt-dlp
operation model (`--ignore-config` everywhere, no media-download op exists) ·
authority chain (video.channelId ∧ registry ∧ enabled ∧ state row) · probe-kind
classification · cue validation · polarity-first extraction · channelId namespacing ·
manifest-based vault reaping · backup/verify/restore-into-isolated-root/derived-rollback ·
consent flow (loopback 127.0.0.1:0, state-first, bounded, closes on every path) ·
subscriptions completeness verdict with refresh-retry · throttle never-shortens rule ·
exit-code contract · HR16 journal-on-every-path.

## 6. Review-process notes

- Confidence tags per rule 51: findings marked VERIFIED carry an executed probe, a
  file:line read, or a command output from today's session; none are [HYPOTHESIS].
- Baseline disclosure (rule 56): suite result is **engine-slice-clean AND baseline-clean
  for the engine** (0 failures); the 6 skips are network-gated tests, not failures.
- Sibling sweep (rule 20/54): the `%(...)s` tab-print pattern (N2's class) was swept
  across `lib/` — `ytdlp.mjs` `resolveChannel` is the only remaining instance; `enumerate`
  already uses `%(...)j`. The mode-0600 claim (N5's class) appears in `oauth.mjs` headers,
  README, and the repair record — all listed in the fix.
- Spend: Fable consult = one OpenRouter call (authorized by Sean in this task's prompt,
  ceiling 60K tokens, reasoning budget half). Astra seat = $0 today (blocked). No other
  paid calls.

## 7. Ready-to-fire Astra consult (on/after 2026-09-19 22:12)

```powershell
node scripts/consult-codex.mjs --review --files "docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-r2-2026-09-15/CONSULT-PACKET.md,scripts/creator-brains/lib/fidelity.mjs,scripts/creator-brains/lib/ledger.mjs,scripts/creator-brains/lib/registry.mjs,scripts/creator-brains/lib/ytdlp.mjs,scripts/creator-brains/lib/fetch.mjs,scripts/creator-brains/lib/query.mjs,scripts/creator-brains/lib/oauth.mjs,scripts/creator-brains/lib/consent.mjs"
```

Output lands in `AI-Village-Documentation/codex-consults/latest.md`; append the verdict
to §3 of this packet.

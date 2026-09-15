# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/creator-brains-hostile-review-r2-2026-09-15/CONSULT-PACKET.md
**Seed:** (none)
**Tokens:** 4345 in / 10294 out · **Cost:** ~$0.5581 · **Wall:** 156.0s · **Finish:** stop · **max_tokens:** 60000

---

# R3 Hostile Review — Creator Brains Engine (SS-PT)

**Epistemic disclosure before anything else:** I have the packet, not the tree. I cannot execute `cat lib/fidelity.mjs` from here. Every new finding below is therefore a **defect-class hypothesis derived from the described architecture**, marked UNVERIFIED, with the exact read/probe needed to confirm or kill it. A hostile reviewer who fabricates `file:line` citations for files he hasn't opened is worse than no reviewer. The prior rounds' pattern (N9!) shows this project already has an evidence-provenance problem — I won't add to it.

---

## Q1 — Defect classes BOTH prior rounds and N1–N11 still miss

26 HR items + 11 N items and **not one of them touches the export boundary of the error/log path, the freshness of the transport binary, or the linguistic identity of the fidelity comparison.** Those are the three blind spots.

### R3-01 [P1 candidate — TIER-LAW LEAK, UNVERIFIED] Lane B text escaping via error strings, fidelity-violation reports, and the digest
The tier law says Lane B transcript text is never rendered, exported, or digested. But:
- A **fidelity gate failure** must, to be actionable, identify the offending verbatim run — and that run *is* Lane B text. If `checkGeneration` writes the matched excerpt into the run journal, digest, or a receipt, the gate designed to prevent leakage becomes the leak. HR09/HR17 hardened the gate's *decision*; nobody in 37 findings audited its *failure output*.
- `lastError` free-text (packet confirms it exists, N4: "survives only as prose in `lastError`") flows into run records. yt-dlp stderr, JSON parse errors on json3 files (which quote the failing input!), and extraction exceptions can all embed transcript fragments. `JSON.parse` error context and stack traces quoting file contents are the classic vector.
- The digest fires "on every path" and Lane C "may leave the machine." The digest itself is therefore an export surface and must be fidelity/lane-gated. Nothing in HR01–26 or N1–N11 says it is.

**Probe:** grep every `journal`/`digest`/receipt writer for interpolation of `err.message`, doc content, or gate match context; force a fidelity violation and a malformed json3 file, then inspect the digest for source text. **This is the single highest-priority unread audit in the tree.**

### R3-02 [P1 candidate — TRANSPORT DRIFT, UNVERIFIED] yt-dlp via uvx is (probably) unpinned — the engine's entire input layer floats
"Node 24 + yt-dlp via uv/uvx" with a daily scheduled run means: unless the invocation pins a version (`uvx yt-dlp==2026.x.x` or equivalent), **the transport binary silently upgrades under a running production system.** yt-dlp changes output templates, subtitle-format selection, and extractor behavior routinely; YouTube breaks it routinely in the other direction. N2 fixed one *parsing* fragility; nobody asked whether the thing being parsed is even version-stable. The HR20 allowlist compounds this: after drift, the flag you need may be the flag you banned. **Probe:** read the spawn site for a version pin; check whether the run journal records `yt-dlp --version`. **Fix:** pin, record version per run, add a shape smoke-probe that fails loud on schema drift instead of producing quietly-empty brains.

### R3-03 [P2 candidate — DATA POISONING, UNVERIFIED] Caption-track identity is not first-class: ASR vs. manual vs. auto-translated
json3 tracks come in flavors: creator-uploaded, YouTube ASR, and **auto-translated** tracks. If track selection is "first English json3," a brain can be built on machine-translated or ASR text — then "candidate claims" with millisecond citations are quoting words the creator never said, with full provenance ceremony (HR24) lending them false authority. For a *doctrine* engine this is a correctness defect, not a nicety. **Probe:** read the subtitle-selection logic in `fetch.mjs`/`ytdlp.mjs` for track-kind discrimination; check whether rules.jsonl rows carry `caption_kind`.

### R3-04 [P2 candidate — GATE BYPASS, UNVERIFIED] Fidelity gate tokenization vs. Unicode/typographic normalization
The 7-word verbatim cap compares output windows to source windows. If extraction normalizes anywhere (curly→straight quotes, NFD→NFC, dash folding, whitespace collapse) and the gate tokenizes the *raw* source, a 30-word verbatim quote with one smart-quote substitution sails through — the control is bypassable by the very pipeline it polices. Conversely, over-strict tokenization causes false blocks. N1 fixes the gate's *speed*; its *linguistic soundness* is unexamined. **Probe:** unit test — take 20 source words, swap quote glyphs, publish, assert the gate fires. Note: N1's hashed-n-gram fix makes this *worse* if unaddressed, because hashing is exact-match by construction; normalization must happen before hashing on both sides.

### R3-05 [P2 candidate — SILENT NON-EXECUTION, UNVERIFIED] No dead-man's switch: the run that never starts writes no journal
"Run journal + digest on every path" — every path *inside the process*. Task Scheduler disabled, laptop asleep at trigger time, node version bump, a syntax error introduced above journal init: the daily run simply doesn't happen, and nothing records that it didn't. For a one-operator daily system, staleness detection ("last successful run > 36h ago") surfaced at query time / `status` is the difference between a brain that's fresh and one that quietly froze in March. Also unverified: does the scheduled task wrapper propagate the HR03 exit codes to something the operator ever sees?

### R3-06 [P2 candidate — WINDOWS PUBLISH FAILURE, UNVERIFIED] Non-atomic vault publish + Windows file-locking (AV/indexer/OneDrive/Obsidian)
Publishing to `brains/<channelId>/` and staging to a wiki vault on Windows means renames that fail with `EPERM/EBUSY` when Defender, Search Indexer, OneDrive, or an open Obsidian vault holds a handle — the canonical Windows-first failure mode, absent from all 37 findings. A crash mid-publish leaves a half-old/half-new brain with no marker. Adjacent: Windows filename law on derived files — reserved names (`CON`, `NUL`, `COM1`), trailing dots/spaces, MAX_PATH 260 with long titles. **Probe:** read the publish path for temp-dir-then-swap and retry-on-EBUSY; test a doc titled `aux.`.

### R3-07 [P3 candidates, batched, UNVERIFIED]
- **Stale-lock liveness / PID reuse:** HR14 says "lock"; hard-kill during a run — does the next scheduled run reap a stale lock, and does it validate PID identity (Windows reuses PIDs aggressively)? Failure mode: permanent daily deadlock, which combined with R3-05 is *silent* permanent deadlock.
- **Clock discipline on the rolling-hour ledger:** Windows time-sync jumps / DST — a backward jump can resurrect stale reservations or freeze the cooldown; is the window monotonic-safe or wall-clock-naive?
- **`add` vs. running daily job:** does the manual `add` command take the same exclusive lock as the run, or can it tear registry/ledger writes mid-run?
- **Backup scope (HR25) vs. `token.json`:** if backups include the OAuth refresh token and backups can leave the machine, that's a credential-tier leak nobody classified.
- **Handle rename dedupe:** `add @newhandle` for an already-registered channelId — duplicate registry row or dedupe-by-channelId?
- **Permanent vs. transient fetch failures:** members-only/age-restricted videos fail forever; without a permanent-failure classification they burn daily budget forever (N4 shows the deferral taxonomy is already lossy).

---

## Q2 — Top 10 upgrades, ranked by value-to-effort (one operator, ≤5 creators, daily cited doctrine)

| # | Upgrade | Why here |
|---|---------|----------|
| 1 | **Commit the tree to a branch NOW (N11)** | Existential, near-zero effort. A truncation incident already occurred. Everything else is decoration on an unversioned 16K-line asset. |
| 2 | **Pin yt-dlp version + record version in journal + shape smoke-probe (R3-02)** | Protects the entire input layer from silent drift; hours of work. |
| 3 | **Lane-B export-boundary audit: gate/scrub journal, digest, error strings, fidelity-violation reports (R3-01)** | Tier law is the project's own prime directive; currently unaudited at its weakest surface. |
| 4 | **N1 n-gram-Set fidelity fix + normalization-aware tokenization (R3-04)** | Ship them together — the perf fix hardcodes exact-match semantics, so normalization must land first or simultaneously. |
| 5 | **Dead-man's switch + last-success staleness in `status`/query output (R3-05)** | Trivial to build; converts silent freeze into visible fault. |
| 6 | **Caption-track provenance: prefer manual, label ASR/auto-translated per row (R3-03)** | Directly improves the *truth quality* of the product, not just the plumbing. |
| 7 | **Permanent-vs-transient error taxonomy + threaded `deferredReason` (N4 + R3-07f)** | Stops budget bleed and makes run records machine-analyzable. |
| 8 | **Atomic vault publish (temp+swap, EBUSY retry) + Windows filename sanitization (R3-06)** | Windows-first system; this is the publish path's table stakes. |
| 9 | **Semantic retrieval over rules.jsonl (acknowledged seam)** | Top capability gap by the packet's own admission; local embeddings keep it inside zero-npm/spend-gate constraints if done as a proposed seam. |
| 10 | **Small verified-fix batch: N2 JSON-per-line resolve, N3 ledger compaction, N7 `polarity` in REQUIRED_FIELDS, N10 cap setting, N8 README repair** | One afternoon, five closed findings. |

Just below the cut: LLM-assisted extraction seam (valuable, but `candidate` labeling makes rough phrasing survivable; spend gate rightly slows it), DPAPI token storage (N5), consent-page escaping (N6).

---

## Q3 — Is the whole-file 7-word verbatim gate the right control once N1's fix lands?

**Yes — keep it at the publish boundary, and it's the *only* correct location for the primary control.** Reasoning:

1. **It's a boundary control, and boundary controls belong at the boundary.** The invariant is "what leaves `brains/` contains no long verbatim Lane B runs." Checking the artifact that actually crosses the line is strictly stronger than checking upstream fragments.
2. **Claim-level-only gating has an assembly hole.** Ten adjacent claims of ≤7 words each, stitched contiguously into topics/timeline, can reconstruct a 70-word verbatim run that no claim-level check sees. The whole-file gate catches exactly this.
3. Post-N1, cost is O(corpus) once per build with a cacheable n-gram set — the perf objection to whole-file checking evaporates.

**But amend it in three ways:** (a) add a claim-level check at *extraction* time as a cheap early gate — better error locality, catches problems before build; the whole-file gate remains the enforcement of record; (b) **extend gate coverage to every Lane-C export surface, including the digest and any receipt that quotes content** (R3-01) — right now the gate's jurisdiction is narrower than the tier law's; (c) fix normalization identity (R3-04), because a bypassable gate is worse than none — it produces false attestations of compliance.

Also note the honest limit: the gate is a *verbatim-excerpt* control, not a semantic-leak control. That's fine — Lane C derived meaning is *allowed* to leave; the design intent is sound. Just don't let anyone describe the gate as preventing "transcript leakage" in general.

## Q4 — OAuth/token gaps short of "owner runs authorize"

1. **The 7-day trap (biggest gap):** if the Google Cloud OAuth consent screen is in **Testing** status, refresh tokens expire in 7 days. "Built but never authorized" means nobody has hit this yet. Verify the app is set to Production (or document the weekly re-auth ceremony) *before* the owner's one-time authorization, or the "one-time" claim is false.
2. **`invalid_grant` recovery path:** revoked/expired refresh token during the daily run — must classify as permanent, park the OAuth lane, surface "re-authorize needed" in digest, and not retry-loop. Untested by definition (never been live).
3. **Scope minimality receipt:** confirm request is exactly `youtube.readonly`, recorded in the token record so a future scope creep is diffable.
4. **Access-token expiry skew buffer** (refresh at N−60s, not N) — cheap, prevents flaky 401s under Windows clock sync.
5. **No `revoke` command:** the lifecycle has an entrance and no exit; add token revocation + local delete.
6. **Backup exclusion for `token.json`** (R3-07d) and the N5 documentation fix (state NTFS-ACL as the real mechanism; DPAPI as upgrade).
7. **Client secret hygiene:** installed-app secrets are non-confidential by spec but must still stay out of the (soon-to-exist) git history — check before the N11 commit, not after.

---

## VERDICT

**Engine current state: REVISE.**
Not REJECT — the repair discipline (mutation kills, hash manifest, probe instruments, honest skip accounting) is genuinely above bar, and no finding here is architecturally fatal. Not APPROVE — an unaudited Lane-B leak surface at the journal/digest boundary (R3-01), an unpinned transport binary under a daily scheduler (R3-02), and a fidelity gate whose tokenization soundness is unproven (R3-04) mean the system's two prime invariants (tier law, verbatim cap) are currently *asserted*, not *demonstrated*, at their weakest points. The evidence trail also cites instruments living outside the repo (N9), which taints "structurallyReady: true" as an in-repo claim.

**Commit recommendation: COMMIT IMMEDIATELY to a branch — do not gate the commit on the REVISE items.**
These are orthogonal decisions and the packet conflates them. Version control is a precondition for safe repair, not a reward for finished repair; the truncation incident already proved the cost of the current state, and N9 proves evidence must live *in* the tree. Sequence: (1) sweep for `token.json`/secrets/Lane-B files against `.gitignore`, (2) commit tree + copy the R1 instrument packet in (closing N9), (3) execute the REVISE list — R3-01 audit first, R3-02 pin second, N1+R3-04 together third — as reviewable diffs against that baseline.

An untracked engine with a perfect hash manifest is a museum piece with a burglar alarm and no walls. Put up the walls tonight; fix the alarm this week.

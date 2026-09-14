# Debate: Phase B — Cross-Surface Continuity Bridge

> **Created:** 2026-04-22
> **Author:** Claude Opus 4.7 (CEO)
> **Status:** ROUND 0 — proposal drafted. Architecture decisions pre-locked by Sean in conversation. Open items below need review.
> **Predecessor work:** Phase A permission tightening (`CODEX-PERMISSION-TIGHTENING-DEBATE-2026-04-22.md`) + Orchestrator fix (`ORCHESTRATOR-DRIFT-FIX-DEBATE-2026-04-22.md`).

---

## 1. Context

Four agent surfaces today have no shared state:

1. **VS Code Claude** — this session
2. **VS Code Codex** — Sean's local Codex CLI in VS Code
3. **Hermes-Telegram Claude** — Telegram → Pi (Hermes daemon) → Tailscale → Windows WSL `claude-session` tmux
4. **Hermes-Telegram Codex** — Telegram → Pi → Tailscale → Windows WSL `codex-session` tmux

Without continuity, a debate started on Telegram doesn't show up in VS Code; a session closeout in VS Code is invisible to the next Hermes invocation. Each surface re-reads `CLAUDE.md` + `ACTIVE-INDEX.md` + handoff docs, but has no memory of what *just* happened in another surface.

**Phase B closes this loop** with two shared files (rolling activity log + curated promotions) plus a minimal write/read protocol.

## 2. Sync mechanism — VERIFIED 2026-04-22

Pre-condition for the entire architecture: all 4 surfaces have filesystem access to the same SwanStudios repo on the Windows machine.

**Verification command:**
```bash
wsl -e bash -lc 'for t in claude-session codex-session; do echo "== $t =="; p=$(tmux display-message -p -t "$t" "#{pane_current_path}"); echo "$p"; cd "$p" && pwd && git rev-parse --show-toplevel && test -f docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md && echo REPO_OK; done'
```

**Result (2026-04-22):**
```
== claude-session ==
<REPO>
<REPO>
REPO_OK
== codex-session ==
<REPO>
<REPO>
REPO_OK
```

Both Hermes tmux sessions land in the same SwanStudios repo path that VS Code surfaces use natively.

**Scope of what this verifies (narrow, per Codex Round 2):**
- ✅ Filesystem PATH sync — the 4 surfaces resolve to the same physical files on the Windows machine.
- ❌ NOT verified at debate time: lock atomicity across the WSL/Windows boundary, rename atomicity across the WSL/Windows boundary, concurrent append behavior under contention, AND the Pi Hermes daemon's ability to directly read `/mnt/c/...` over Tailscale (separate from tmux SSH access — see §4.3 disambiguation). These are post-implementation smoke targets, NOT design assumptions.

**Filesystem sync is the canonical mechanism for the WSL tmux + VS Code surfaces.** The Hermes daemon's read path is a separate question handled in §4.3.

---

## 3. Architecture (LOCKED in conversation 2026-04-22)

### 3.1 File layout

```
.ai-workflow/continuity/
├── README.md                 # tracked — schema, append rules, trim rules
├── rolling-last-done.md      # gitignored — append-only, 30 KB cap
└── append.lock               # gitignored — file lock for concurrent-append protection

docs/ai-workflow/AI-HANDOFF/
├── ACTIVE-PRIORITIES.md      # already exists — current priority stack
├── CONTINUITY-GOOD-IDEAS.md  # NEW, tracked — human-curated promotions
└── (existing handoff docs)

ACTIVE-INDEX.md               # already exists at repo root
```

`.gitignore` updates (PRECISE — only the runtime files):
```
.ai-workflow/continuity/rolling-last-done.md
.ai-workflow/continuity/append.lock
```

The continuity directory's `README.md` IS tracked. Per Sean's pushback on a previous draft: the gitignore must be precise to runtime files, not the whole directory.

### 3.2 Sync mechanism

Filesystem only. Verified §2.

### 3.3 Append protocol

Single script: `scripts/continuity-append.mjs`

Required env var (script hard-fails with explicit error if unset):
```
SWAN_AGENT_SURFACE ∈ {vs-claude, vs-codex, tg-claude, tg-codex}
```

Invocation:
```bash
SWAN_AGENT_SURFACE=vs-claude node scripts/continuity-append.mjs \
  --topic "Phase A perms tightening" \
  --files "scripts/validation-orchestrator.mjs,.claude/settings.local.json" \
  --outcome "consensus reached, implemented under executive close-out" \
  --notes "Codex caught deprecated on-failure mid-flight; revised. <!-- PROMOTE: Codex pre-CLI-version-check pattern -->"
```

What it does (atomic sequence under `append.lock`):
1. Verify `SWAN_AGENT_SURFACE` set + valid (4 enum values).
2. **Verify SwanStudios repo context via two checks:**
   - **(a) git toplevel:** `git rev-parse --show-toplevel` succeeds AND its output normalizes to one of the accepted SwanStudios root forms.
   - **(b) repo marker/remote:** EITHER `git config --get remote.origin.url` matches expected SwanStudios origin pattern (e.g. matches `*SeanSwan/*SS-PT*`) OR a marker file (e.g. `CLAUDE.md` with first-line check) is present at the toplevel.
   - **Path normalization** must handle all three shapes that resolve to the same physical repo:
     - Windows native: `<REPO>`
     - WSL: `<REPO>`
     - Git-Bash: `/c<HOME>/Desktop/quick-pt/SS-PT`
   - Normalization function: lowercase + slash-flip + collapse `/mnt/c/` and `/c/` prefixes to a common canonical form, then compare. Both (a) AND (b) must pass; failing either hard-fails the script.
   - Do NOT compare against a single literal path — Windows + WSL + Git-Bash produce different shapes for the same repo.
3. **Acquire `append.lock` via atomic file creation.** Use `fs.open(lockPath, 'wx')` (Node) — atomic create-exclusive that fails with EEXIST if the lock already exists. **Never use "check exists then write"** — that pattern is racy under concurrent contention from 4 surfaces.

   **Lockfile contents (JSON):** `{pid, surface, host, runtime, ts}` where `runtime ∈ {"win-native", "wsl-bash", "git-bash"}` distinguishes PID namespaces. PIDs in WSL and Windows are separate namespaces; a Windows process probing a WSL PID gets meaningless results (per Codex Round 2 HIGH).

   **Acquire retry:** on EEXIST, retry with exponential backoff (initial 50ms, doubling, max total wait 5s).

   **Stale-lock policy** (after 5s acquire-wait timeout — REVISED per Codex Round 4 HIGH: age alone NEVER triggers auto-release, because a hung-but-alive holder may resume and cause concurrent writes):
   - **Same runtime + same host as caller:** PID probe required. If `process.kill(holder.pid, 0)` (or platform equivalent) proves the holder PID is **DEAD** → force-release with logged warning + retry once. If probe proves ALIVE or returns ambiguous error → **fail loud** regardless of `ts` age. Age is informational (logged for diagnostic), never a release trigger.
   - **Different runtime OR different host:** PID probe is meaningless (separate namespaces). Always **fail loud** regardless of `ts` age. No automatic force-release.
   - **Operator override:** any fail-loud condition can be overridden by re-invoking append script with `--force-stale-release` flag. Operator implicitly accepts the risk of concurrent-writer collision.
   - This trades availability (failures during cross-namespace stale conditions, or when same-namespace holder is hung-alive) for safety (no accidental force-release based on age alone). Per Codex Round 4: "age alone does not prove the holder is dead."
4. Run sanitizer pass (§3.4) over all input fields; refuse on Layer-1 hit with structured error showing what matched. Layer-2 substitutions applied automatically.
5. Append to `rolling-last-done.md` with normalized entry format (§3.5).
6. Check file size; if > 30 KB, run trim (§3.6).
7. Release lock (delete lockfile); exit 0.

Fail-loud: any sanitizer Layer-1 hit, any cwd verification failure, any missing env var, any lock-acquire timeout without successful stale-recovery → non-zero exit + structured stderr message. Caller (the agent) MUST notice and adjust.

### 3.4 Sanitizer

Two layers:

**Layer 1: Secret patterns (Rule 44 inheritance)** — reuse the same fingerprint set as `scripts/scan-secrets.sh`:
- Rotated-credential fingerprints (specific known-rotated literals from 2026-04-19)
- Generic patterns: JWTs, PEM keys, DB connection strings, common API key shapes
- Env var values that look like secrets
- HARD FAIL with message naming the pattern matched.

**Layer 2: Path/PII scrubbing** — non-failing transforms applied automatically. Per Codex Round 2 MEDIUM, all real-world path shapes must be covered:

```
Path shapes (all → <USER_HOME>):
  <HOME>\          (Windows backslash, capital C)
  <HOME>\          (Windows backslash, lowercase c)
  <HOME>/          (Windows forward slash, capital C)
  <HOME>/          (Windows forward slash, lowercase c)
  <HOME>\\       (JSON-escaped backslash)
  <HOME>/      (WSL canonical)
  <HOME>/      (WSL lowercase mount)
  /c<HOME>/          (Git-Bash)
  \\?\<HOME>\      (Windows extended path)

Username:
  <OPERATOR> (standalone, case-sensitive) → <USER>
  Excluded: occurrences inside other identifiers (e.g. SeanSwan/<OPERATOR>Tools)

Hostname/IP scrubs (driven by config constant — NOT vague references):
  scripts/continuity-config.json defines:
    tailscale_nodes: [...explicit list of Tailscale node hostnames...]
    pi_hostnames: [...Hermes Pi hostnames...]
    pi_ips: [...Hermes Pi IPs (LAN + Tailscale)...]
  Each list item gets its own substitution token (<TS_NODE_N>, <HERMES_PI>, <HERMES_IP>).
  Maintaining this list is part of Phase B implementation, not a moving target.
```

WSL stack-trace fragments and JSON-encoded path strings should match the JSON-escaped pattern.

Layer 1 is fail-fast. Layer 2 is automatic substitution. The agent never sees what got scrubbed at Layer 2; the rolling log shows the substituted values.

**Disk-write discipline (CRITICAL):** Sanitizer runs **in-memory only** on the candidate entry BEFORE any file write. The unredacted candidate must NEVER touch disk — no temp file, no log, no debug dump.

**Scanner invocation (per Codex Round 2 HIGH):**
- Invoke `scripts/scan-secrets.sh --stdin` from Node via `child_process.spawn()`, writing the candidate to the child process's stdin stream.
- **Do NOT use `echo "$candidate" | scan-secrets.sh`** — shell `echo` puts the candidate in argv, which is visible in the OS process table (`ps`, `Get-Process`, etc.) until the call completes. Process-table visibility is a leak vector.
- `scan-secrets.sh` must currently support `--stdin` mode. Pre-implementation step: inspect `scripts/scan-secrets.sh` for `--stdin` support; if absent, patch it to read from stdin when `--stdin` flag passed. Patch is in scope for Phase B implementation.

**Scanner error format (per Codex Round 2 HIGH):**
- Scanner output on a Layer-1 hit MUST report `pattern <name> matched in field "<field>"` — NOT echo back the matched line content.
- The error log itself must not become a leak vector. `scan-secrets.sh` patch (if needed) includes redacted-error mode.
- Caller (append script) propagates only the redacted error to stderr.

After Layer-1 fail-or-pass and Layer-2 transform, only the cleaned/redacted result reaches the atomic-write step (`.tmp` write → fsync → rename).

### 3.5 Entry format

Each append produces a single block in `rolling-last-done.md`:

```markdown
---
ts: 2026-04-22T16:34:00Z
surface: vs-claude
session: <random-id-or-claude-conversation-id>
---

**Topic:** Phase A perms tightening

**Files touched:** scripts/validation-orchestrator.mjs, .claude/settings.local.json

**Outcome:** consensus reached, implemented under executive close-out

**Notes:** Codex caught deprecated `on-failure` mid-flight; revised.
<!-- PROMOTE: Codex pre-CLI-version-check pattern — always verify deprecated/preferred values against current docs before relying on them -->
```

Promotion markers (`<!-- PROMOTE: ... -->`) are explicit, in-line, scannable. Sean periodically greps for `PROMOTE:` and curates them into `CONTINUITY-GOOD-IDEAS.md` manually.

### 3.6 Trim rule

Cap: **30 KB v1** (smaller than initial 50 KB proposal — proves the pattern without bloating session-start bundle).

On trim:
1. Read entire file.
2. Header (first ~1 KB block: schema version + last-trim timestamp + trim count + instructions for promotion) preserved verbatim.
3. Newest 60% of remaining content (~17 KB) preserved.
4. Middle dropped.
5. Insertion at boundary: `--- TRIM EVENT YYYY-MM-DDTHH:MM:SSZ — dropped <N> KB middle ---`
6. Atomic write: write to `rolling-last-done.md.tmp`, fsync, rename to `rolling-last-done.md`.
7. Trim counter in header incremented; last-trim timestamp updated.

Trim is not destructive of recent work. Mid-trim concurrent reads see consistent state due to atomic rename.

### 3.7 Closeout trigger — explicit only

Continuity-append happens **ONLY when Sean explicitly says** one of:
- `"log this and close"`
- `"session closeout"`
- `/closeout` (if a slash command is added — see §4.1)

No automatic "agent thinks it's done" trigger. Agents do not proactively call the append script. The only proactive thing an agent does is *notice* a continuity-worthy moment and offer a draft closeout for Sean to approve / refine before the explicit trigger fires.

### 3.8 Promotion workflow

1. Agent (any surface) drops `<!-- PROMOTE: <reason> -->` markers in the closeout entry's notes field.
2. Sean greps the rolling log periodically: `grep "PROMOTE:" .ai-workflow/continuity/rolling-last-done.md`.
3. Sean reviews each suggestion, distills/edits, then commits the curated entry to `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md`.
4. Sean removes (optional) the `PROMOTE:` marker from the rolling log to indicate "processed."

Promotion is a thinking step, not a file copy. No automation.

### 3.9 Startup read

All 4 surfaces read at session start (read-only):
1. `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md` (already in handoff)
2. `.ai-workflow/continuity/rolling-last-done.md` (NEW)
3. `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md` (NEW)

Token cost estimate (post-Layer-2 scrubbing):
- ACTIVE-PRIORITIES: ~5 KB (~1.2K tokens)
- rolling-last-done: capped at 30 KB (~7.5K tokens)
- CONTINUITY-GOOD-IDEAS: target ~20 KB (~5K tokens), curation discipline keeps it focused
- Total ~14K tokens added per session start. Acceptable.

---

## 4. Per-surface implementation

Different mechanisms for different surfaces.

### 4.1 VS Code Claude (this surface)

Mechanism: CLAUDE.md instruction. Add to `## Source of Truth & Load Order` section:

> "At session start, after loading CLAUDE.md and ACTIVE-INDEX.md, read these continuity files:
> - `.ai-workflow/continuity/rolling-last-done.md`
> - `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`
> - `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md`"

Optional `/closeout` slash command via skill or simple convention. v1 = convention; v2 might add the skill.

### 4.2 VS Code Codex

Mechanism: `~/.codex/AGENTS.md` startup-read directive.

**KNOWN UNKNOWN per Sean:** local `~/.codex/AGENTS.md` is currently empty. Don't assume it works as a startup-read trigger. **Phase B implementation must include a smoke test:**

Smoke: Add a sentinel directive to `~/.codex/AGENTS.md` like `On session start, run: ls .ai-workflow/continuity/`. Open a fresh Codex session. Confirm Codex actually executes that. If yes, AGENTS.md is the right hook. If no, fall back to Codex `--system` flag, project-local `AGENTS.md`, or a wrapper script.

### 4.3 Hermes-Telegram Claude (claude-session WSL tmux)

Mechanism: **Hermes daemon prepend.**

**File access path — UNVERIFIED at debate time, smoke-test required (per Codex Round 2 BLOCKER).** Two candidate paths exist; smoke must pick one:

**Path A — Direct Tailscale-mounted filesystem access from Pi:**
- ASSUMES: the Pi has the Windows machine's `c:/Users/.../SS-PT/` mounted as a network filesystem over Tailscale.
- NOT verified by §2's check (which only proved WSL tmux sessions resolve to the SwanStudios repo path on the Windows machine).
- If verified working: daemon reads files with normal `fs.readFile` against the mounted path. Lowest latency, simplest code.

**Path B — Remote read via existing SSH/tmux access (verified to exist per Hermes Phase D bridge):**
- Daemon shells out to the existing SSH bridge to run `cat /mnt/c/.../<file>` inside a WSL session, captures stdout.
- Verified to work — Hermes already uses this mechanism for the claude-session/codex-session tmux access.
- Adds latency (per-read SSH round trip) and a failure mode (network blip = no continuity prepend on session start). Mitigation: cache file contents for the session lifetime; fail-soft to "no continuity prepend" with a single warning if read fails (don't block the session start).

**Smoke target (REQUIRED before §4.3 implementation, per Codex Round 2):** test whether the Pi can do `ls <REPO>/CLAUDE.md` directly. If yes → Path A. If no (mount unavailable, permission denied, etc.) → Path B.

**Implementation work either way:** small Hermes-side helper function + one prepend call into the existing system-prompt builder. Path B adds caching + fail-soft logic. In scope per Sean's directive.

### 4.4 Hermes-Telegram Codex (codex-session WSL tmux)

Same Hermes daemon mechanism as 4.3, but inside the codex-session tmux invocation. Adds the same prepend logic when forwarding to Codex.

---

## 5. Decision points (open)

D1, D2, D3, D4 are LOCKED per Sean's conversation message. Listed in §3 architecture. Not re-asked here.

The following are NOT locked yet:

### D5 — Closeout slash command for VS Code Claude

- (a) **Convention only** for v1: Sean types `"log this and close"`, Claude calls `continuity-append.mjs` with summarized fields.
- (b) **Skill-based slash command** `/closeout`: codified, prompts agent to summarize, runs append. More polished but more code.

**My recommendation: (a)** — convention for v1, skill if it proves useful.

### D6 — Promotion marker discoverability

- (a) **Manual grep** by Sean periodically.
- (b) **Helper script** `scripts/continuity-promotions.sh` that lists pending PROMOTE markers for review.
- (c) **Both** (a) for ad-hoc, (b) when batching review.

**My recommendation: (b)** — small helper, low maintenance, makes review frictionless. Append script reports number of pending PROMOTE markers in its success output.

### D7 — Hermes daemon change scope (small but Hermes-side)

- (a) **Minimal:** Hermes daemon reads files at session start, prepends. No changes to Hermes toolset.
- (b) **Plus:** Hermes also invokes `continuity-append.mjs` on closeout request from Telegram.
- (c) **Plus c:** Hermes daemon adds a `/continuity` Telegram command that prints the rolling log summary on demand.

**My recommendation: (a)** for v1. (b) and (c) are nice-to-have but expand Hermes scope; defer.

### D8 — Codex AGENTS.md fallback if smoke test fails

If §4.2 smoke shows AGENTS.md doesn't trigger startup read in Codex CLI:
- (a) Codex `--system` flag wrapper script
- (b) Project-local `AGENTS.md` in repo root
- (c) Hermes daemon-style prepend (treat Codex like Hermes — daemon prepends, Codex receives prebaked prompt)

**Need actual smoke result before deciding.** Phase B implementation order: smoke test FIRST, then pick fallback if needed.

---

## 6. Implementation order

1. **Setup** (tracked):
   - Create `.ai-workflow/continuity/` dir, README.md (schema doc), `.gitignore` updates.
   - Create `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md` with empty-but-structured initial template.
   - Create `scripts/continuity-config.json` with Tailscale + Pi hostname/IP scrub list.
2. **scan-secrets.sh patch:** inspect script for `--stdin` mode; if absent, add it (read from stdin when flag passed; redacted-error output mode).
3. **Append script:** `scripts/continuity-append.mjs` with sanitizer (Layer-1 + Layer-2), env-var enforcement, multi-shape cwd verification (git-toplevel + remote-URL or marker-file), atomic lock with strict stale handling (PID-probe-dead-only, never age alone, per Round 5), trim logic, duplicate-detection (hash check on last N entries), pending-PROMOTE-count in success output.
4. **Promotion helper:** `scripts/continuity-promotions.sh` (per D6) with `--count` mode (returns integer count of pending PROMOTE markers; used at startup-read by all surfaces — see §3.9 + §8 row 5).
5. **Lock + rename contention smoke (per Codex Round 4 MEDIUM):** simultaneous append-script invocations from Windows-native PowerShell AND WSL `/mnt/c/...` AND a third invocation chained behind a small artificial delay (e.g. 100ms). Verify: no file corruption, no lost entries (all 3 appended in some order), lock behavior correct (no overlap), trim still produces valid output if it fires during contention. Document results in the debate's verification log section before moving on. If contention smoke fails, halt and revise lock implementation.
6. **VS Code Claude wiring:** edit CLAUDE.md to add startup-read directive (read 3 continuity files at session start).
7. **Codex AGENTS.md smoke:** sentinel-directive test in fresh Codex session.
8. **Codex wiring:** based on smoke result (AGENTS.md or fallback per D8).
9. **Hermes file-access smoke (per Codex Round 2 BLOCKER):** test whether Pi can directly `ls` Windows `/mnt/c/.../CLAUDE.md` over Tailscale. Pick Path A (direct fs) or Path B (SSH/cat) per result.
10. **Hermes daemon change:** add file-read + prepend per smoke-result path.
11. **Hermes isolated prepend smoke (per Codex Round 2 implementation-order revision):** trigger Hermes session start in isolation; verify the daemon reads continuity files and prepends to the system prompt. Catch Hermes-bugs BEFORE they masquerade as continuity-protocol bugs in step 12.
12. **End-to-end smoke (4-surface):** trigger continuity append from each of 4 surfaces; verify all 4 see it on next session start.
13. **Closeout per protocol:** memory entry + this debate file.

---

## 7. Out of scope

- **Auto-promotion:** automating which entries become "good ideas." Always human-curated.
- **Cross-project continuity:** scope limited to SwanStudios first per Sean's directive.
- **Deletion / archive of old curated good-ideas:** v1 keeps growing. Archive policy = future debate if it becomes a problem.
- **Anything that lets agents read each other's private state** beyond the curated rolling log.
- **Mythos / future LLM integration** as a 5th surface — wait until Mythos exists.

---

## 8. Failure modes

| # | Failure | Mitigation |
|---|---|---|
| 1 | Concurrent appends from 4 surfaces corrupt file | `append.lock` via atomic `fs.open(..., 'wx')` create-exclusive (NOT check-exists-then-write); exponential backoff retry on EEXIST; stale-lock policy per §3.3 (authoritative): PID-probe-DEAD-only triggers force-release in same-namespace, never age alone; cross-namespace fails loud; `--force-stale-release` operator override; atomic rename on trim |
| 2 | Sanitizer false negative leaks a credential, OR sanitizer persists the unredacted candidate to a temp file before scanning | Layer-1 hard-fail discipline; reuse `scripts/scan-secrets.sh` patterns; **stdin-only invocation** of scan-secrets.sh (no temp-file path); unredacted candidate stays in-process-only; only the cleaned result reaches disk via atomic `.tmp` write + rename. |
| 3 | Sanitizer false positive blocks legit content | Structured error message names what matched; agent rephrases or escalates to Sean |
| 4 | Reader sees mid-trim state | Atomic rename guarantees consistent view |
| 5 | PROMOTE markers age out before Sean reviews (agents cannot magically know what's un-promoted) | **Concrete count source (per Codex Round 4 LOW):** `scripts/continuity-promotions.sh --count` returns integer count of pending `PROMOTE:` markers from `rolling-last-done.md`. (a) Append script's success output runs `--count` and prints `N pending PROMOTE markers; review via scripts/continuity-promotions.sh`. (b) Startup-read directive (§3.9) instructs each surface to invoke `scripts/continuity-promotions.sh --count` AFTER reading the rolling log; agent mentions the backlog in its session opening if N > 0. (c) Helper script's no-flag mode is the canonical review path (lists markers + provides edit hints). NO automatic re-surfacing by agents — visibility is the warning, not the action. NO header-counter bookkeeping in `rolling-last-done.md` itself (would go stale after Sean curates without re-running the script). |
| 6 | Hermes-Telegram session not in SwanStudios repo (rare), OR cwd check passes by literal-path match in only one shape (Windows-only / WSL-only) | Two-check verification: (a) normalized git toplevel against multi-shape canonical form + (b) git remote URL OR repo-marker file. Both must pass. Refuses if cwd doesn't normalize to a known SwanStudios shape. |
| 7 | Codex AGENTS.md doesn't trigger startup read | D8 fallback options; smoke test FIRST so we know |
| 8 | Hermes daemon change breaks existing Hermes flows | Test in isolation; daemon change is additive (no removal of existing behavior) |
| 9 | Rolling log fills with noise (sub-trim entries) | Closeout-only discipline; never per-message append |
| 10 | Curated file diverges across branches | Main branch is source of truth; rebase rather than parallel-edit |
| 11 | Same closeout appended twice (Sean repeats trigger phrase, OR agent retries after a transient failure) — per Codex Round 2 LOW | Append script computes `sha256(topic + outcome + notes)` for new entry; checks last 5 entries' hashes; if match, prints WARNING with hash collision and exits 0 without appending. Override flag `--allow-duplicate` for legitimate re-appends. |
| 12 | Hermes Path B (SSH/cat fallback) network blip causes failed file read on session start | Cache file contents for session lifetime; on first-read failure, fail-soft to "no continuity prepend this session" with single warning to Telegram. Don't block the session. Next session retries. |

---

## 9. Review chain

| Round | Reviewer | Status |
|---|---|---|
| 0 | Claude (this draft) | ✅ COMPLETE |
| 1 | Sean — D5=a, D6=b, D7=a locked. D8 deferred to smoke. Path 2 chosen. Three pre-Codex revisions applied. | ✅ COMPLETE |
| 2 | Codex Round 1 — REVISE: 1 BLOCKER + 2 HIGH + 3 MEDIUM + 1 LOW. No Gemini needed. | ✅ COMPLETE |
| 3 | Claude Round 3 — all 7 R2 findings addressed. | ✅ COMPLETE |
| 4 | Codex Round 2 — REVISE (small): 1 HIGH (age-based force-release still allows concurrent writers if hung-alive holder resumes), 1 MEDIUM (no explicit contention smoke in §6), 1 LOW (PROMOTE count source not concrete). No Gemini needed. | ✅ COMPLETE |
| 5 | Claude Round 5 — all 3 R4 findings addressed: §3.3 lock policy strictened (PID-dead-only, never age alone, fail-loud otherwise; `--force-stale-release` operator override), §6 step 5 inserted (lock+rename contention smoke), §8 row 5 specifies `scripts/continuity-promotions.sh --count` as the count source. | ✅ COMPLETE |
| 6 | Codex Round 3 — APPROVE. All 3 R4 findings addressed. CLAUDE.md compliance confirmed (rules 17/28/44/46). Non-blocking cleanup of §8 row 1 wording applied. No Gemini second opinion needed. | ✅ COMPLETE |
| 7 | Implementation + Sean close-out review (BLOCKER gitignore shape, HIGH `.gitattributes` LF, 2 MEDIUMs, 1 LOW — all addressed) | ✅ COMPLETE |

Review depth options (same Path 1/2/3 from previous debates):
- **Path 1 (full 3-brain):** Gemini → Codex → consensus.
- **Path 2 (compressed Codex):** Codex only.
- **Path 3 (Sean only):** executive review.

**Chosen: Path 2.** Codex caught real issues across 3 REVISE cycles (deprecated `on-failure`, D3 verification gap, age-based force-release risk). Gemini not needed.

---

## 10. Implementation log

Chunked delivery 2026-04-22.

### Chunk 1 — Local repo scaffolding + append/read helpers (committed `3620e4579`)

- `.gitignore` carve-out (later shape-fixed after Sean caught BLOCKER)
- `.gitattributes` — `scripts/*.sh text eol=lf` (durable CRLF defense, caught by Sean as HIGH)
- `.ai-workflow/continuity/README.md` (tracked)
- `docs/ai-workflow/AI-HANDOFF/CONTINUITY-GOOD-IDEAS.md` (empty template)
- `scripts/continuity-config.json` (tracked placeholders + hard-fail)
- `scripts/continuity-append.mjs` (~470 lines — lock/sanitizer/trim/dedup/cwd)
- `scripts/continuity-promotions.sh` (`--count` + list)
- `scripts/scan-secrets.sh` — additive `--stdin` (spawn+stdin pipe, redacted errors)
- `CLAUDE.md` item 10 — startup-read directive

**Two real bugs caught during Chunk 1 smoke:**
1. CRLF line endings on `scan-secrets.sh` → `.gitattributes` enforcement added.
2. `die()` / `process.exit()` bypasses `finally{releaseLock()}` → added `lockHeldByThisProcess` flag + `process.on('exit')` backstop + explicit release-before-die.

**Five Chunk-1 review fixes applied before the next commit:**
- BLOCKER gitignore carve-out shape (`.ai-workflow/*` + `!continuity/` pattern)
- HIGH `.gitattributes` created
- MEDIUM duplicate-handling exit code changed to 0 (warn-only) per debate §8 row 11
- MEDIUM stale-lock reacquire now sets `lockHeldByThisProcess`
- LOW scanner error wording clarified (pattern + candidate line, not "field")

### Chunk 1 follow-up — `.local.json` override pattern (pending commit)

- `scripts/continuity-config.local.json` (gitignored) — real Tailscale/Pi identifiers
- `continuity-append.mjs` reads `.local.json` first, falls back to tracked template
- `.gitignore` adds `scripts/continuity-config.local.json`
- README documents the pattern

### Chunk 2 — Codex AGENTS.md startup-read

- `~/.codex/AGENTS.md` sentinel smoke: PASS (fresh `codex exec --ephemeral` printed `AGENTS_MD_WORKS_2026_04_22`)
- Real Phase B `vs-codex` directive landed (backup `~/.codex/AGENTS.md.bak-sentinel-20260422-102636`)
- D8 fallback not needed

### Chunk 3 — Hermes-Telegram Pi-side

- **3.1 File-access smoke:** Path B confirmed (Pi has no `/mnt/c/...` mount, `exit=2 readable=1`)
- **3.2 Daemon patch:** `~/.hermes/hermes-agent/run_agent.py` — `_build_continuity_bridge_context()` helper + insertion point inside `_build_system_prompt()` (once-per-session cache). Reuses the `SSH_TARGET` constant from existing `tools/remote_ai_bridge_tool.py` (real value lives there, not in tracked docs). Session-lifetime cache + fail-soft on read failure.
- **3.3 Isolated prepend smoke:** PASS (Telegram returned `HERMES_PREPEND_WORKS_2026_04_22` from startup context)
- Diagnostic log line temporarily added for journalctl verification, then removed

### Chunk 4 — End-to-end 4-surface smoke

- **4.1 First real closeouts:** vs-codex + vs-claude both appended Phase B closeouts with PROMOTE markers
- **4.2 Local verify:** vs-claude read rolling log, verified both entries + Layer 2 scrubs (0 raw username occurrences in any new content, all paths scrubbed to `<USER_HOME>`)
- **4.3 Hermes daemon code path verified:** single Hermes surface test returned both entries accurately, no tool calls. Since tg-claude + tg-codex share `_build_system_prompt()`, one pass = daemon code path verified. Not overclaimed as "two independent Telegram model surfaces."
- **4.4 Sentinel cleanup:** HERMES SMOKE SENTINEL stub removed from rolling log; real Phase B closeouts preserved as first durable entries

**One LOW issue caught + fixed in Chunk 4.5:** `continuity-promotions.sh --count` undercounted multi-marker-per-line entries (4 markers reported as 2). Fixed with `grep -oE '<!-- PROMOTE:' | wc -l` — counts occurrences not lines. Portable. List mode kept as-is (line context reads better for humans).

---

## 11. Verification log

| Gate | Status | Evidence |
|---|---|---|
| `§2` path-sync verified | ✅ narrow | WSL tmux → SwanStudios repo (pwd + git-toplevel + REPO_OK) |
| Contention smoke (3 concurrent appends, mixed namespaces) | ✅ | 3/3 exit 0, no corruption, lock cleaned up, all entries landed |
| Sanitizer Layer 1 (hit rejects + lock releases cleanly) | ✅ | EX_SANITIZER_HIT + clean lock state |
| Sanitizer Layer 2 (9 path shapes + username + config scrubs) | ✅ | 0 raw username in output |
| Duplicate detection | ✅ | Dup warn + exit 0 (debate §8 row 11 semantic) |
| Trim at 30 KB cap | ✅ | 74 KB pre-fill → 19 KB post-trim, header preserved |
| Placeholder hard-fail | ✅ | EX_CONFIG_PLACEHOLDER with 5 TODO list |
| `.local.json` override pattern | ✅ | Both paths smoke-verified (no override → placeholder fail; override present → succeed) |
| Chunk 2 AGENTS.md startup-read | ✅ | Sentinel smoke: fresh Codex session printed `AGENTS_MD_WORKS_2026_04_22` |
| Chunk 3.1 Path B file-access | ✅ | `rolling-last-done.md: rc=0, SENTINEL_FOUND` via SSH/cat |
| Chunk 3.3 Hermes prepend isolated smoke | ✅ | Telegram: `HERMES_PREPEND_WORKS_2026_04_22` without tool calls |
| Chunk 4.3 Hermes daemon code-path end-to-end | ✅ | Both real closeouts cited accurately, no tool calls |

---

## 12. Final consensus

**CONSENSUS REACHED 2026-04-22.** Phase B continuity bridge is LIVE on all 4 agent surfaces. Filesystem sync (Windows) + Hermes daemon Path B (Pi→SSH/cat→Windows WSL) verified. Layer-1 + Layer-2 sanitizers operational. Lock policy strict per §3.3. First real closeouts seeded. Hermes-Telegram startup prepend confirmed reading new entries after session reset.

**Known limitations (LOW, all deferred separately):**
- Session-lifetime cache on Hermes Path B means fresh content needs a session reset (accepted trade-off per §4.3)
- PROMOTE-count fidelity: fixed in Chunk 4.5 (grep -oE occurrences).
- Codex plugin-sync 403 noise: separate Codex CLI concern.
- `.local.json` override refactor: pending second commit after Chunk 1.
- Pi-side daemon patch: no git history; backup files on Pi are rollback surface. Canonical spec in `docs/ai-workflow/AI-HANDOFF/HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md`.

**Durable lessons captured:** 4 PROMOTE markers in first real closeouts (Sean's vs-codex + Claude's vs-claude) ready for curation to `CONTINUITY-GOOD-IDEAS.md`. See also `memory/project_phase_b_continuity_bridge_complete_2026_04_22.md`.

**Next workstream:** post-Phase-B priorities per `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`.

---

*Phase B is plumbing for cross-surface memory. Architecturally simple, operationally meaningful. The hard part was discipline — closeout only on explicit trigger, promotion only by Sean. Both enforced by design, not just convention.*

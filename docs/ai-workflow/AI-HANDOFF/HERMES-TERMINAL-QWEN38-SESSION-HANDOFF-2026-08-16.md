---
decision: "Session handoff — Hermes terminal (ui-tui) rebuild + Qwen 3.8 upgrade; update + security hardening done, terminal noise unsolved"
status: open
supersedes: none
originating_model: claude-opus-5
date: 2026-08-16
linear: SWA-160
---

# Hermes terminal (ui-tui) rebuild + Qwen 3.8 upgrade — SESSION HANDOFF

> **Linear issue (keep this title, do not rename):**
> `SWA-160 — Hermes terminal (ui-tui) rebuild + Qwen 3.8 upgrade — update 4,657 commits before any reskin`
> https://linear.app/swanstudios/issue/SWA-160

**For:** the next agent picking this up · **From:** Opus 5 · **Read time:** ~4 min

---

## 0. What Sean actually asked for

Verbatim intent, in his order:

1. **Upgrade the local model** — "My Hermes is on Qwen 3.6. 3.8 just came out." ✅ **DONE**
2. **Update Hermes itself** if an update exists. ✅ **DONE**
3. **Audit his "Hermes OS"** — it lacks options the original has, and *"the disgusting looking terminal… every time I have to go work on Hermes it feels like a chore compared to Claude and Codex."* He wants it to **look and feel like the Claude Code / Codex CLI terminal**. ⚠️ **ROOT CAUSE NOT FOUND**
4. Use **GLM 5.3** for the plan/blueprint (mermaid, flowchart, wireframe) and **Kimi K3 + HY3** for hostile review **and hostile security review**. ✅ **DONE**

**His answers to the four gating questions (binding):**
- Update authorized — **stash patches first**
- Codex worktree — **inspect and report only**
- The "chore" is **slow/laggy AND visually noisy** (NOT missing features, NOT maintenance overhead)
- Fork posture — **local patch queue**

---

## 1. Current state — VERIFIED

| Item | State | Evidence |
|---|---|---|
| Hermes version | **v0.20.1 (`v2026.8.13`)**, was v0.19.0 | `hermes --version`, `git describe --exact-match` |
| Security branch | **`swan/alias-security-hardening-20260816` @ `5ce780af2`** on `f80f453ae` | `git log --oneline -2` |
| Hermes tree | **clean**, no uncommitted work | `git status --porcelain` empty |
| Tests | **558 passed** (was 553; +5 security) · wider gateway **1007 / 9 skipped** | pytest |
| Ollama | **0.32.13** (was 0.32.6 — could not pull qwen3.8 at all) | `ollama --version` |
| Models | `qwen3.8:27b-mtp-q4_K_M` **113 tok/s, 100% GPU** · `qwen3.8:27b-mtp-q8_0` **30.5 tok/s, 6% CPU spill, 17s cold load** · qwen3.6 retained | `/api/generate`, `ollama ps` |
| Config | 8 models, both qwen3.8 registered, `compact: False` | `load_config()` **with `HERMES_HOME` set** |

**Rollback assets:** `/tmp/hermes-preupdate-HEAD.txt` (= `a61183b56`) · `stash@{0}` (original pre-update patch) · `~/hermes2/.hermes/config.yaml.bak-20260815-pre-qwen38` · `/tmp/hermes-shallow.lock.bak-20260815`

---

## 2. The security work (done — three HIGH holes, three reviewers)

Sean's uncommitted alias patch was relocated (upstream moved `slash.exec` from `server.py` → `methods_tools.py`) and then hardened three times. **Method that produced this: adversarial relay — each reviewer was briefed to attack the PREVIOUS reviewer's fix, not the original code.** None found the other two; parallel consensus review would have shipped holes 2 and 3.

| # | Reviewer | HIGH finding | Fix |
|---|---|---|---|
| 1 | GLM 5.3 | Chained alias bypassed `_WORKER_BLOCKED_COMMANDS` — one enforcement site, worker re-expands and never re-checks | fixpoint expansion |
| 2 | Kimi K3 | The fix was **fail-OPEN**: gateway + worker hop budgets are **additive** (8+1=9) | **fail-CLOSED** refusal |
| 3 | HY3 | Bare `except: pass` still fail-open on config-load error — whole control silently skipped | try wraps config read only; loop moved out |

**Total spend $0.29.** All 5 regression tests were verified to **FAIL on the unfixed code** — that step is what makes them proof.

**Invariant any future change must preserve:** the blocklist guard must inspect the **terminal** command. `_WORKER_BLOCKED_COMMANDS = frozenset({"snapshot","snap"})` is enforced at exactly one site in `tui_gateway/methods_tools.py`.

---

## 3. ⚠️ THE UNSOLVED PROBLEM — this is the actual next job

**Sean's terminal is visually noisy and he hates it. Root cause NOT found.**

Measured: **34 of 40 rows are box-drawing chrome** at 120×40. **2 of 30** at 70 cols. So the noise is **width-driven** — the renderer gets loud when it has room.

**Hard fact that should crack it:** `load_config()` returns `display.compact = True`, and `cli.py:7437` reads `use_compact = self.compact or term_width < 80` — **and the banner still renders full**. The setting is read and ignored.

### 3.1 ✅ TRACED 2026-08-16 — `display.compact` is provably dead code (but this is NOT the banner's owner)

The suspicion was correct and the chain is now fully traced:

```
cli.py:18375  def main(..., compact: bool = False, ...)
cli.py:18567      HermesCLI(..., compact=compact, ...)
cli.py:4285   def __init__(..., compact: bool = False, ...)
cli.py:4310       self.compact = compact if compact is not None else CLI_CONFIG["display"].get("compact", False)
```

**Both defaults are `False`, never `None`** → `compact is not None` is always True → **the config
branch is unreachable dead code**. There is also **no `--compact` CLI flag**, so `display.compact`
had no route to take effect by any means. Verified by `inspect.signature` on both callables.

**Two-word fix tested and REVERTED:** defaulting both to `None` makes the config branch reachable
(`inspect.signature` confirmed `None` after patch). **It did not change the banner** — still 34/40
chrome with `display.compact: true` AND the snapshot cache cleared. Reverted to keep Sean's tree
minimal (an upstream change with no benefit toward his goal is pure merge debt). `/tmp/cli.py.pre-compact.bak`
was the restore source; the fix script survives at `c:\tmp\hermes-compact-fix.py` if wanted.

**⇒ Conclusion: `self.compact` / `cli.py:7437` is NOT the code path that paints Sean's banner.**
Eliminated hypothesis #7. Worth reporting upstream as a standalone dead-config bug regardless.

**Next probe (untried):** the banner is ~40 rows painted at startup in a two-column layout with a
caduceus on the left and MCP/skill listings on the right. Instrument the *render itself* — e.g. add
a temporary marker string to each candidate emitter and see which one appears — rather than
reasoning from config flags again. Seven hypotheses have now died to code-reading; none to
instrumentation.

**Six hypotheses already eliminated — do not re-run these:**
1. `branding.tsx` `Banner` — `HIDE_BELOW=34`/`COMPACT_FROM=58`, doesn't own the skills box
2. `SessionPanel` accordions — `accordion.tsx` is `{isOpen ? children : null}`, defaults `false`
3. generic `Panel` component
4. `hermes_cli/banner.py` Python path — the compact gate exists and is honored at 7437
5. banner snapshot cache (`~/hermes2/.hermes/cache/banner_snapshot.json`) — cleared, no change
6. "config isn't being read" — it is; `load_config()` returns True

**Also unexplained:** `interface: cli` in config, yet the capture's two-column caduceus layout matches Ink `SessionPanel`. `pgrep -a node` showed only MCP/LSP servers, no Ink TUI.

---

## 4. Open items — Sean-owned decisions

1. **Hermes runs cloud `deepseek-v4-flash`, NOT the Qwen 3.8 just installed.** Config default was never Qwen; installing models changed nothing. One-line change; needs his pick (recommend `q4_K_M`).
2. **Q2 — exec `shell=True` via alias args.** Pre-existing upstream. GLM rated HIGH; HY3 downgraded to MEDIUM (direct `/build; …` already works, so alias only evades *name-based* blocking). Unfixed.
3. **Q3 — alias shadowing of safety builtins** (`model`, `clear`, `quit`, `yolo`). MEDIUM-HIGH. Builtins should win. Unfixed.
4. **Supply chain** (HY3 #1, neither other reviewer looked): 4,657 unsigned upstream commits + ~46 GB unverified model blobs trusted wholesale; **`git fsck --full` never run** after the stale-lock removal.
5. **New DoS surface from fail-closed:** a self-referential alias (`model→/model`) now refuses that command entirely. Correct disposition, thin diagnostics.
6. **Codex worktree `codex/hermes-operations-truth-20260712`** — inspected: 572 files/+31k vs origin/main, touches 4 ui-tui files, but HEAD is an upstream merge PR and it's **5,292 behind**. Looks archivable; Sean's call.

---

## 5. Traps that cost real time tonight — DO NOT REPEAT

- **`git grep <rev> -- <path>` returns EMPTY for every input on a shallow clone.** Silent false negative; produced a full round of confident, bogus results. **`git show <rev>:<path>` works.** Always run a **known-present control term** first — a probe that returns zero for everything is broken, not informative.
- **A stale `.git/shallow.lock` (dated 2026-07-30) silently blocked every fetch** for 17 days. Removed. Check for stale locks before believing any fetch failure.
- **`load_config()` without `HERMES_HOME` reads a non-existent `~/.hermes/config.yaml`** and returns built-in defaults — it will look like Sean's models vanished. Always `export HERMES_HOME=/home/bigotsmasher/hermes2/.hermes`.
- **Module-level constants do NOT resolve inside the `slash.exec` handler's globals.** A `NameError` there was swallowed by the alias `except`, silently disabling the control. Use inlined literals in that function.
- **`pgrep`/`grep -i node` matches `nodev`** in snap mount options. Use `pgrep -a node`.
- **Release notes ≠ product exposure.** The "missing options arrive by updating" claim was substantially FALSE: upstream's slash registry has **68 commands vs local 66** — the entire delta is `focus` + `wake`. `/diff`, `/init`, `/context`, `!` shell are absent upstream **too**.

---

## 6. Reviewer routing (empirical, this session)

| Model | Cost | Use for |
|---|---|---|
| **GLM 5.3** | flat-rate (Z.ai coding plan) | First-pass architecture + **generates executable probes**. Had 1 finding refuted by execution. |
| **Kimi K3** | $0.28 | **Attacking a proposed fix** — its standout strength |
| **HY3** | **$0.008** | Third perspective; supply-chain/posture blind spots; severity calibration |

**GLM 5.3 transport:** `scripts/consult-glm.mjs`, **coding endpoint only** (`https://api.z.ai/api/coding/paas/v4`), streaming mandatory (wall >300s kills a plain fetch; ~84% of output is invisible reasoning). `ZAI_API_KEY` is USER-scope on Windows — load with `[Environment]::GetEnvironmentVariable('ZAI_API_KEY','User')`. Full rules: `docs/ai-workflow/references/GLM-ZAI-ACCESS.md`.

**Prompt shape that produced the escalation:** *"Here is the previous reviewer's report and the fix I made from it. Find what they missed and attack my fix. Echoing them is worthless."*

---

## 7. Artifacts

**Handoff/review docs** (`docs/ai-workflow/AI-HANDOFF/`): `HERMES-OS-TERMINAL-AUDIT-2026-08-15.md` (carries two ⚠ in-place corrections) · `GLM-52-HERMES-TERMINAL-BLUEPRINT.md` · `KIMI-K3-HERMES-TERMINAL-HOSTILE-REVIEW.md` · `GLM-53-HERMES-TERMINAL-REVIEW.md` · `GLM-53-HERMES-AUDIT-REVIEW.md` · `HERMES-TERMINAL-PANEL-VERDICT-2026-08-15.md` · `HERMES-SLICES-SECURITY-REVIEW-PACKET-2026-08-16.md` · `GLM-53-HERMES-SECURITY-REVIEW.md` · `KIMI-K3-HERMES-SECURITY-REVIEW.md` · `HY3-HERMES-SECURITY-REVIEW.md`

**Hermes memos:** `.ai-workflow/hermes-inbox/pending/20260815T234500Z-*`, `20260816T005500Z-*`, `20260816T010000Z-*`
**Learning packets:** `docs/ai-workflow/hermes-learning-packets/20260816-the-control-term-is-the-only-thing-that-worked.md`, `20260816-adversarial-relay-beats-parallel-review.md`

All SwanStudios-side docs are **uncommitted** on `wip/comms-notifications-2026-07-05` (which is ~1,947 behind origin/main). The Hermes-side security work **is** committed, on its own branch.

---

## 8. Recommended next actions, in order

1. **Trace `cli.py:4310`'s constructor** — who passes `compact`, and do they pass `False` explicitly? This is the one probe that likely cracks the banner problem.
2. **Get Sean's model decision** and flip the Hermes default to Qwen 3.8 (recommend `q4_K_M`).
3. **Fix Q3** (builtins win over aliases) — small, self-contained, same file, same test pattern.
4. **Run `git fsck --full`** on the Hermes repo — one command, closes HY3's supply-chain gap partially.
5. Only then revisit the reskin. **Capture before theorising** — no one looked at the running terminal until very late, and it invalidated most of the static analysis.

---
decision: "Master handoff — Hermes upgrade, security hardening, terminal fix, and the chat-UI rebuild. Transport risk retired; next slice is the block-list state model."
status: open
supersedes: none
originating_model: claude-opus-5
date: 2026-08-16
linear: SWA-160
---

# HERMES — MASTER SESSION HANDOFF

> **Linear (do not rename):** `SWA-160 — Hermes terminal (ui-tui) rebuild + Qwen 3.8 upgrade — update 4,657 commits before any reskin`
> **For:** the next agent, with zero context · **From:** Opus 5 · **Read time:** ~8 min
> This replaces reading the session. Everything load-bearing is here.

---

## 1. HOW THIS STARTED, AND HOW IT MOVED

Sean opened with four asks:

1. Upgrade his local model — *"My Hermes is on Qwen 3.6. 3.8 just came out."*
2. Update Hermes itself if an update exists.
3. Audit his Hermes — *"the disgusting looking terminal… every time I have to go work on Hermes it feels like a chore compared to Claude and Codex."*
4. Use GLM 5.3 to plan and Kimi K3 + HY3 to hostile-review, including a **security** review.

It ended somewhere bigger: a full chat-UI redesign to replace the terminal in his web dashboard, with the transport risk probed and retired.

**Sean's binding decisions this session** (do not relitigate):
- Update authorized, **stash patches first**
- Codex worktree: **inspect and report only**
- The "chore" is **slow/laggy AND visually noisy** — not missing features
- Fork posture: **local patch queue**
- Keep 65k context, **accept request queueing** (over 2 concurrent users)
- Network: lock to Tailscale; **Render key rotation deferred — "not yet"**
- Chat UI: **replace xterm with a real chat UI · three panes · NO bubbles · collapsed expandable tool rows · Codex restraint over house brand style**

---

## 2. WHAT SHIPPED — all verified, all committed

**Branch `swan/alias-security-hardening-20260816` on `f80f453ae` (v2026.8.13). Tree clean. 560 tests pass.**

| Commit | What |
|---|---|
| `5ce780af2` | Alias fixpoint + fail-closed (3 HIGH security holes) |
| `21b47e1ed` | `display.compact` honoured — it was unreachable dead config |
| `e55bb4e77` | Blocked command names reserved against alias shadowing |
| `a8f45e7e1` | Pending-input names reserved (HIGH) + shared `_compact_display` resolver |

**Hermes v0.19.0 → v0.20.1**, 4,657 commits, clean fast-forward. Config, sessions, `state.db`, `kanban.db`, `projects.db` all survived.

**Ollama 0.32.6 → 0.32.13** (0.32.6 could not pull qwen3.8 at all).
**Node 20.20.2 → 22.23.2** (v0.20.1 raised the floor; broke the dashboard until fixed).

**Terminal noise: 34/40 chrome rows → 2/40.** Root cause was `hermes_cli/main.py` doing `getattr(args,"compact",False)` with no `--compact` flag existing, so an explicit `False` always won and the config branch was dead code. **Found by instrumentation after seven code-reading hypotheses all failed.**

**Qwen 3.8 live:** `hermes-fast-38:latest` built FROM `qwen3.8:27b-mtp-q4_K_M` with Sean's `num_ctx 65536` / `temperature 1`. **17 GB, 100% GPU at 65k, ~100 tok/s.** Aliases `qwen`/`quinn` repointed; `fast`/`local` left on the 3.6 build as rollback.

**Dashboard GUI rescued** — `npm install --workspace web && npm run build -w web` → `dashboard_ready`, HTTP 200, serving build-matching asset hash.

**Desktop launchers:** `Start Hermes 2.cmd` hardened (null-guard + unconditional pause). New `Hermes.cmd` added — straight into chat, no menu.

### The security work — three reviewers, three different HIGH holes

Run as an **adversarial relay**: each reviewer was briefed to attack *the previous one's fix*, not the original code.

| # | Reviewer | HIGH finding | Fix |
|---|---|---|---|
| 1 | GLM 5.3 | Chained alias bypassed `_WORKER_BLOCKED_COMMANDS` — enforced at ONE site, worker re-expands and never re-checks | fixpoint expansion |
| 2 | Kimi K3 | The fix was **fail-OPEN**: gateway + worker hop budgets are **additive** (8+1=9) | **fail-CLOSED** refusal |
| 3 | HY3 | Bare `except: pass` still fail-open on config-load error — whole control silently skipped | try wraps config read only; loop moved out |

**None found the other two** — holes 2 and 3 only existed *relative to the previous fix*. A parallel consensus panel would have shipped both. **Total spend $0.29.** Every regression test was verified to **fail on the unfixed code** before being accepted.

---

## 3. THE CHAT-UI REBUILD — where it stands

**Target:** replace `web/src/pages/ChatPage.tsx`. Today it is **the Ink TUI rendered into an xterm.js terminal in the browser** — which is why the dashboard looks like a terminal. It *is* one.

**Mockup B is the frozen visual target:** `docs/ai-workflow/design-brain/mockups/hermes-web-chat-mockup-b.html`
Three panes (sessions | conversation | activity) · no bubbles, speaker label + prose · tool calls as collapsed expandable rows with ✓/✗ and timings · approval card with self-contained command, `n of m` queue, resolved state, **focus-to-Deny** · Stop button + turn-state row · responsive 1280/1060/720 with slide-away rails.

### ✅ TRANSPORT RISK RETIRED — the most important finding for the next agent

Kimi's crux was: *the chat is an xterm rendering a TUI, so the gateway may only emit rendered bytes, not structured events — if so ~70% of the mockup is unrenderable.* **Probed. Refuted.** The gateway already emits:

```
message.start · message.delta · message.interim · message.complete
tool.start · tool.generating · tool.complete · tool_call_id · tool.output_risk
approval.request · approval.respond
```

- **Concurrent, ID-addressable approvals: YES** — `_pending[rid] = (sid, ev)` (`tui_gateway/server.py:3289`)
- **First-class deny: YES** — `resolve_gateway_approval(key,"deny",resolve_all=True)`, plus `smart_denied`

**⇒ Mockup B is buildable essentially as drawn. No redesign is forced by the backend.**

### ⚠ Open review findings on Mockup B (not yet fixed)

- **N1 SEV-1** — no ARIA live regions for streaming tokens, turn-state, or approval arrival
- **N2 SEV-1** — closed off-canvas rails retain tab stops at ≤720px
- **N3 SEV-1** — tool-row accessible names polluted by glyph spans
- **#4** — approval "resolvable" is painted-only (no JS on the buttons); pending count hand-maintained in 4 places
- **#10** — GLM's own `#5c626e` spec was miscalibrated: **2.9:1 on `--bg-elev`, fails WCAG 1.4.11.** It self-corrected on re-review.

### 🔑 Kimi's architectural catch — read this before writing any state code

> A turn is **not** a message pair. It is an **ordered, interleaved block list**: text → tool → tool → text → approval → text.

Build the obvious `messages[]` reducer with a `streamingText` field and you will rewrite the store at ~60% completion, when you discover a tool call must sit *between two paragraphs of the same turn, mid-stream, while an approval is pending.* **This is a one-page schema decision that must precede any wiring.**

---

## 4. RECOMMENDED NEXT SLICES — ordered, concrete

Three brains disagreed on sequencing. Fable said "spike token streaming." **Kimi and GLM independently overturned that** — streaming was never the risk; both named cheaper questions that could kill more of the design. Both crux questions are now answered (§3), so the order below reflects the post-probe reality.

**SLICE 1 — Block-list state model (½ day, document + types).**
Write the turn schema before any wiring. A turn is an ordered array of blocks: `{type:'text'|'tool'|'approval', id, …}`. Tool blocks carry `tool_call_id`, status (`running|ok|error`), args, output, duration. Approval blocks carry an addressable id, state (`pending|approved|denied`), the literal command, and a resolved timestamp. Must support: blocks appended mid-stream, a tool block landing between two text blocks of the same turn, approvals resolved out of order, and reload mid-turn. **Deliverable:** one page + TypeScript types. Nothing renders yet.

**SLICE 2 — Mockup B accessibility fixes (½ day, mockup-local).**
Land N1–N3 plus #4 and #10 while it is still static and cheap: `role="log" aria-live="polite"` on the thread with a batching strategy; `inert` on closed rails; `aria-label` on tool rows so the accessible name is not glyph soup; wire the approval buttons to a real resolve transition with a single source of truth for the pending count; fix the composer border to clear 3:1 on `--bg-elev`. **Do this before the renderer exists** — retrofitting live regions into a mature diff pipeline is the expensive version.

**SLICE 3 — Replay harness (1–2 days).**
Build the real `ChatPage.tsx` skeleton rendering Mockup B's DOM against an **event interface**, driven by a scripted fixture: one recorded turn with token deltas, three tool calls (one failing), two approvals (one approved, one denied), and a reload mid-turn. Zero backend dependency. This exercises interleaving, the block-list reducer, the approval round-trip and streaming *together*, and becomes the permanent dev fixture.

**SLICE 4 — Wire the real transport behind the same interface.**
Now the token spike happens, as a formality, against the correct state model. Exit criterion GLM specified: *screen readers announce batched tokens without chaos over `role=log`.*

**SLICE 5 — Virtualization + long-output handling.**
200-message threads and 400-line tool outputs. Deferred deliberately: it is a real problem but it does not invalidate anything above.

**Still unprobed, worth an hour before Slice 3:** do pending approvals survive reconnect? Is there history-replay pagination for the sessions rail? Can Stop cancel mid-tool?

---

## 5. SEAN-GATED — flag, never fix unasked

1. **Render API key rotation — explicitly deferred, "not yet."** Remind, do not act.
2. **`/fast` collides in his config** — `quick_commands.fast = {alias → "/model fast"}` duplicates the builtin `/fast`. Upstream test `test_commands_catalog_has_no_duplicate_or_alias_colliding_names` fails against his real config. **Proven pre-existing.** Fix = renaming his alias = his muscle memory.
3. **Hermes default model is still cloud** `deepseek/deepseek-v4-flash`. Qwen 3.8 lives on `qwen`/`quinn` and menu option 8.
4. **Private-chat path still on the old 3.6 build**, and its config names `qwen2.5:7b` — **not installed**. Works only because an env var overrides it.
5. **Firewall commands not applied** (I lacked admin). GLM's verdict was: second household user gets **raw model only, never the agent** — the agent is a credential vault with hands. Commands are in `GLM-53-MULTIUSER-SECURITY-DECISION.md`. Scope by source address `100.64.0.0/10`, never by network profile. **Never enable Tailscale key expiry** — it would silently kill his roaming access after ~90 days.
6. **4 high-severity npm vulns** in the dashboard deps. Not auto-fixed by design — `npm audit fix` rewrites a working tree.
7. **DMARC live but `p=none` with no `rua=`** — monitor-only, no reports. SPF and DKIM both fine.
8. **Menu 4 (MCP diagnostics) fails** — tests `brain-vault`, which is `enabled: false` **and whose server script does not exist**. Pre-existing.
9. **Q2** — exec quick-commands run via `subprocess.run(shell=True)`; alias args unsanitised. Pre-existing upstream, HY3 rated MEDIUM.
10. **Supply chain** — 4,657 unsigned commits, ~46 GB unverified model blobs. `git fsck --full` passed (integrity only, says nothing about authenticity).

---

## 6. TRAPS — do not re-learn these

- **`git grep <rev> -- <path>` returns EMPTY for every input on a shallow clone.** Silent false negative that produced a full round of confident, bogus conclusions. **`git show <rev>:<path>` works.** Always run a **known-present control term first** — a probe that returns zero for everything is broken, not informative.
- **`load_config()` without `HERMES_HOME` reads a nonexistent `~/.hermes/config.yaml`** and returns defaults. Config-dependent tests then look "flaky" when the real variable is whether that env var was exported. Always `export HERMES_HOME=/home/bigotsmasher/hermes2/.hermes`.
- **`ast.parse` cannot catch structural misplacement.** A method anchored inside `__init__` becomes a nested def — valid Python, "syntax OK" — while silently truncating the constructor. It crashed Hermes with `AttributeError: '_active_session_lease'`. **Assert AST structure**, never just that it parses.
- **A metric that overshoots the target is a defect signal.** Chrome went 34 → 2 (goal), then 2 → **0** on a broken patch. Zero meant the program had crashed and painted nothing.
- **Ollama's tray process being alive is NOT evidence the server is serving.** Found the tray running with port 11434 closed and Hermes silently brainless. **Test the port.**
- **Ollama 0.32.13 crashes on a massively oversized prompt** (229k tokens into a 65k window → server dead, HTTP 000). Bound prompt size before sending.
- **Qwen 3.8 is a reasoning model** — `num_predict: 40` returns an **empty** `response`; the budget goes to `thinking`. Use ≥300 when testing.
- **Unquoted heredocs let bash command-substitute backticks** inside Python strings, silently deleting words from comments written into source files. Use `<<"EOF"` or a file.
- **Git Bash mangles WSL paths** — `MSYS_NO_PATHCONV=1` or you get `Files/Git/home/...`.
- **Three surfaces look nearly identical and are not:** Python CLI (`cli.py`) · Ink TUI (`ui-tui/`) · web dashboard (= Ink TUI via xterm). A fix to one does not touch the others. Several hours were lost measuring one while reasoning about another.
- **A version bump's blast radius includes toolchain versions, not just data.** Post-update verification confirmed config/sessions/DBs survived and never checked Node — the dashboard was broken from the moment of the fast-forward and Sean found it, not me.

---

## 7. REVIEWER ROUTING — empirical, this session

| Model | Cost | Use for |
|---|---|---|
| **GLM 5.3** | flat-rate (Z.ai coding plan) | First-pass architecture + hostile review. **Ships a one-command probe per finding**, which makes disproving it as cheap as agreeing. Audits its own prior advice — caught and owned its own miscalibrated contrast spec. |
| **Kimi K3** | ~$0.18–0.28 | **Attacking a proposed fix**, and reframing the question being asked. Its "wrong experiment" catch was the highest-value call of the session. |
| **HY3** | ~$0.008 | Third perspective; supply-chain and posture blind spots; severity calibration. Astonishing value per cent. |

**GLM transport:** `scripts/consult-glm.mjs`, **coding endpoint only** (`https://api.z.ai/api/coding/paas/v4`), streaming mandatory (wall >300s; ~84% invisible reasoning). `ZAI_API_KEY` is USER-scope on Windows — `[Environment]::GetEnvironmentVariable('ZAI_API_KEY','User')`. Rules: `docs/ai-workflow/references/GLM-ZAI-ACCESS.md`.

**The relay prompt that produced three distinct HIGH findings:**
> *"Here is the previous reviewer's report and the fix I made from it. Find what they missed, and attack my fix. Echoing them is worthless."*

**Note on tooling:** `swan-council-server.mjs` exists but is **not registered in `.mcp.json`** — its brains are the same ones reached directly via the consult scripts. **Mobbin IS connected** and was the highest-value design tool (real Codex/ChatGPT/v0/Zapier UI references).

---

## 8. ROLLBACK ASSETS

`/tmp/hermes-preupdate-HEAD.txt` (=`a61183b56`) · `stash@{0}` · `~/hermes2/.hermes/config.yaml.bak-20260815-pre-qwen38` · `config.yaml.bak-20260816-pre-qwen38-alias` · `/tmp/hermes-shallow.lock.bak-20260815` · `C:\tmp\hermes2-pc-launcher.ps1.bak-20260816` · `Start Hermes 2.cmd.bak-20260816` · `/tmp/main.py.bak` · `hermes-fast:latest` (3.6 build) still installed · Node rollback = same `sed` with `node_22.x` → `node_20.x`.

## 9. KEY DOCUMENTS

`HERMES-OS-TERMINAL-AUDIT-2026-08-15.md` (carries two ⚠ in-place corrections) · `HERMES-TERMINAL-PANEL-VERDICT-2026-08-15.md` · `HERMES-SLICES-SECURITY-REVIEW-PACKET-2026-08-16.md` + GLM/Kimi/HY3 security reviews · `GLM-53-HERMES-CHAT-UI-REVIEW.md` (10-item punch list) · `GLM-53-HERMES-UI-NEXT-STEP.md` (verification of the fixes) · `KIMI-K3-HERMES-UI-NEXT-STEP.md` (the "wrong experiment" call) · `GLM-53-MULTIUSER-SECURITY-DECISION.md` · `HERMES-THROUGHPUT-204-HANDOFF-2026-08-16.md` (the 206 tok/s claim, dissolved) · mockups at `docs/ai-workflow/design-brain/mockups/hermes-web-chat-mockup-{a,b}.html`.

**On throughput, so nobody re-chases it:** the reviewer in Sean's video never measured 206 tok/s — he said *"reportedly"*, on a 4090, and called his own speed slow. Sean's ~100 tok/s is **93% of the memory-bandwidth roofline** (1792 GB/s ÷ 17 GB ≈ 105). 206 requires NVFP4 **and** speculative decoding; NVFP4 alone buys ~30%, and Ollama's NVFP4 build is macOS-gated (HTTP 412).

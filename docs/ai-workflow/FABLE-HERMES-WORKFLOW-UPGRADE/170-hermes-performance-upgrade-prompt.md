# 170 — Hermes Performance + Utilization Upgrade Prompt

- **Date:** 2026-07-07 · **Author:** Fable (claude-fable-5; live-install inventory by a read-only research agent, arbitrated by Fable) · **Status:** READY — §E is the paste-ready prompt Sean asked for ("modify it, fill the gaps I missed, create the new prompt")
- **Boundaries:** HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md §4 (T0–T4; ambiguity rounds UP). Config edits = T2 bounded+backed-up; spend/new-surface = ask Sean. Rule 12 (no Grok) and fail-closed privacy are non-negotiable.
- **TL;DR for Sean:** two live bugs are costing you every day — (1) **your model unloads after 2 minutes idle and cold-reloads 18 GB on the next message** (`OLLAMA_KEEP_ALIVE=120`, `ollama ps` was empty at inspection); (2) **the hermes-inbox loop is write-only** (hooks dir empty; a memo is sitting unread right now). §E fixes both plus the rest in one supervised pass.

---

## A. Current state (live-install inventory, 2026-07-07 — [VERIFIED] unless tagged)

Install: **WSL Ubuntu-22.04 `~/hermes2/`**, config `~/hermes2/.hermes/config.yaml` (the bare `~/.hermes/` has NO config.yaml — do not edit it). Runtime: Nous **hermes-agent v0.18.0**. Pi retired.

- **Brain:** `hermes-qwen3` = Ollama Modelfile `FROM qwen3:30b-a3b-instruct-2507-q4_K_M` (18 GB), `num_ctx 65536`, temp 0.7 — served by Windows-host Ollama 0.31.1 at `http://172.26.128.1:11434/v1`, models on `Z:\ollama-models`. GPU: RTX 5090, 32,607 MiB (≈4.4 GB desktop idle load).
- **Privacy:** `fallback_providers: []` (fail-closed ✓). `/gemini` on-demand → `gemini-3.1-pro-preview`; `/local` returns.
- **The keep-alive bug:** `OLLAMA_KEEP_ALIVE=120` (2 min) → near-every message after idle pays a 5–15s 18 GB reload. `OLLAMA_FLASH_ATTENTION=1` + `OLLAMA_KV_CACHE_TYPE=q8_0` are **User-scope only**; `OLLAMA_NUM_PARALLEL` unset.
- **Context mismatch:** Hermes's cache advertises 262144 while the Modelfile caps 65536 (the 2026-07-07 wedge); mitigation `compression.threshold: 0.2`. A 128K Modelfile is staged, NOT applied.
- **Channels/toolsets:** Telegram allowlisted, `safe` + 7 MCP servers (brain-vault, browser-harness-safe, operator-workflows, supervised-browser-actions, brain-provenance, moa-policy, swanstudios-operator). No raw terminal on Telegram ✓. Discord disabled. MoA enabled (approval-gated, $0.50 cap, grok banned ✓). Voice: local Whisper `base` STT on; TTS edge, auto off. `reasoning_effort: xhigh`, max_turns 60.
- **Dormant:** hooks dir EMPTY (inbox drain unwired — 1 memo unread NOW) · cron: zero user jobs (no digest) · **brain-vault: 2,328 files / 818 PDFs / 13.46 GiB staged + MCP-wired, barely queried** · kanban queue live, unused · memory system on, 2 files · dashboard unexposed · `privacy.redact_pii: false` · idle models on disk: qwen2.5:72b, qwen2.5-coder:32b, gemma4:31b, qwen2.5:7b, gemma3:4b.
- **Local-private lane:** config says `qwen2.5:7b`; `.env` has `HERMES_LOCAL_PRIVATE_MODEL` [UNVERIFIED which wins] — either way your most sensitive lane currently runs the weakest model.

## B. Performance upgrades (Qwen3-30B-A3B on 32 GB)

KV math (48 layers, 4 KV heads, head_dim 128): ≈96 KB/token fp16 → 64K ≈ 6.0 GB fp16 / 3.0 GB q8_0; 128K ≈ 12.1 / 6.3 GB. Weights 18 GB Q4_K_M.

| # | Change | Setting | Effect |
|---|---|---|---|
| B1 | **Kill cold reloads (top win)** | `OLLAMA_KEEP_ALIVE=4h` (or `-1`) at User AND Machine scope; full Ollama restart | −5–15 s on most messages; model stays resident |
| B2 | Mirror KV/FA to Machine scope | `OLLAMA_FLASH_ATTENTION=1`, `OLLAMA_KV_CACHE_TYPE=q8_0` (Machine) | consistency; prevents silent VRAM doubling if service-run |
| B3 | Apply staged 128K Modelfile — **bundle only** | `num_ctx 131072` + retune `compression.threshold: 0.4` — only after B1+B2 verified | 2× context, ends the wedge class; ≈24–26 GB total, fits |
| B4 | Single-slot context | `OLLAMA_NUM_PARALLEL=1` | stops silent per-slot ctx splitting |
| B5 | Faster prefill | Modelfile `PARAMETER num_batch 1024` | +20–40% prompt-eval on Hermes's big system/skills prompts |
| B6 | Model doctrine | Stay Qwen3-30B-A3B Q4_K_M daily (MoE ≈3.3B active → fast). Q6 only at 64K (Q6+128K does NOT fit). Dense 72B = proven RAM-spill, special cases only | latency stays operator-grade |
| B7 | KV q4_0 | NOT recommended (recall loss) — keep q8_0 | — |
| B8 | Speculative decoding | unsupported in Ollama 0.31.x — skip | — |
| B9 | Fast profile | `reasoning_effort: high` for routine; keep `xhigh` for deep (see D1) | snappier chat replies |
| B10 | **Private-lane upgrade (free)** | point `local_private.default_model` + `HERMES_LOCAL_PRIVATE_MODEL` at `hermes-qwen3` (same resident weights) | most-sensitive lane gets the best local brain at zero VRAM cost |
| B11 | STT bump | `stt.local.model: small` | better voice-note transcription |

Per-change verification: `ollama run hermes-qwen3 --verbose "<fixed prompt>"` (prompt-eval + eval tok/s), `nvidia-smi` VRAM, `ollama ps` (resident, 100% GPU, expected ctx).

## C. Underutilized perks (ranked; each starts with one sentence)

1. **Inbox drain (broken loop — fix first):** hooks dir empty, memo unread. → session-start hook/daily cron reads `/mnt/c/Users/BigotSmasher/Desktop/quick-pt/SS-PT/.ai-workflow/hermes-inbox/pending/` (WSL path — `C:\` paths silently fail).
2. **Brain-vault (13.46 GiB, 818 PDFs, wired):** ask "search the brain vault for <topic>" — make it the reflex for research.
3. **Voice notes:** Whisper STT already ON — send a Telegram voice note instead of typing.
4. **Morning digest cron:** engine runs, zero jobs — "create a daily 7am cron: drain inbox + kanban + session summary → message me."
5. **Kanban queue:** "add to kanban: <task>" for anything you'd otherwise forget; auto-decompose works it.
6. **MoA panel:** one-command multi-model second opinion (approval-gated, $0.50) for hard non-private questions.
7. **/gemini ↔ /local:** the deliberate deep-reasoning lane — already verified working.
8. **Supervised browser harness:** "harness: open sswanstudios.com, report console errors + failed requests" — from your phone.
9. **Web search (ddgs):** free; keep OFF inside the private lane (queries egress).
10. **Image gen (OpenRouter):** quick SwanStudios concept/mood boards.
11. **Memory + curator:** end sessions with "remember this: <fact>" so Hermes compounds.
12. **Personas:** "use the concise personality" for phone-speed replies.
13. **18 skill packs installed:** ask "list your skills and the top 5 for a solo SaaS founder."
14. **Dashboard:** leave off — exposing it is a T3 new-surface decision.

## D. `/settings` panel spec (each = T2 bounded write with `config.yaml.bak-*` backup; no-args = T0 print)

| # | Setting | Options (bold = default) | T-tier note |
|---|---|---|---|
| D1 | Model profile | **fast-local** (effort high) / deep-local (xhigh) / gemini / private | gemini stays explicit-command, never sticky |
| D2 | Context budget | **64K** / 128K | paired change only (B3 bundle) |
| D3 | Privacy mode | off / **on-for-private-topics** (kills /gemini, web, MoA, image for session) | fail-closed |
| D4 | Web search | **on** / off | off in privacy mode always |
| D5 | Persona/verbosity | **concise** / helpful / technical | — |
| D6 | Keep-alive | 120s / **4h** / pinned | host env, Ollama restart |
| D7 | Telegram streaming | **on** / off | — |
| D8 | Digest cadence | **off** / daily / weekly | DM to Sean only; any other recipient = T3 |
| D9 | Memory write approval | **off** / on | — |
| D10 | Voice replies (TTS) | **off** / on | — |
| D11 | MoA budget | view/lower = T2; **raise or auto-approve = T3, Sean only** | spend gate |
| D12 | PII redaction | **off (current)** → recommend trial ON | belt-and-suspenders over fail-closed routing |

## E. THE PROMPT (paste this to the agent session that maintains Hermes)

````text
You are the maintainer agent for Hermes 2, Sean's private operator assistant (Nous hermes-agent
v0.18.0, WSL Ubuntu-22.04, ~/hermes2/, Telegram-fronted, LOCAL Qwen3 brain on the Windows-host
Ollama at http://172.26.128.1:11434/v1, RTX 5090 32GB). Fail-closed privacy is law:
fallback_providers stays []; cloud is /gemini on-demand only; never add auto cloud routing.

Effect tiers per HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md §4: config edits here = T2 (bounded,
backed-up, reversible). Anything external-visible, spend-raising, or new-surface = STOP AND ASK
SEAN. Ambiguity rounds UP.

BASELINE FIRST (T0, before any change):
1. ollama run hermes-qwen3 --verbose "Write exactly 200 words about disciplined training."
   Record prompt-eval tok/s and eval tok/s.
2. nvidia-smi --query-gpu=memory.used --format=csv and `ollama ps` — record.
3. hermes fallback list — must show empty; abort and report if not.
4. Copy ~/hermes2/.hermes/config.yaml to config.yaml.bak-<UTC-timestamp>.

APPLY IN ORDER (each step: change → restart what's needed → re-run the baseline bench → report):
5. Keep-alive: OLLAMA_KEEP_ALIVE=4h at BOTH User and Machine scope on Windows; mirror
   OLLAMA_FLASH_ATTENTION=1 and OLLAMA_KV_CACHE_TYPE=q8_0 to Machine scope; set
   OLLAMA_NUM_PARALLEL=1 (both scopes). Fully restart Ollama (tray + service). Verify: after a
   test message + 5 min idle, `ollama ps` still shows hermes-qwen3 resident, 100% GPU.
6. 128K bundle (only if step 5 verified): ollama create hermes-qwen3 from the staged Modelfile
   with num_ctx 131072 (+ PARAMETER num_batch 1024), THEN set compression.threshold: 0.4 in
   config.yaml. Verify: `ollama ps` context=131072, 100% GPU, nvidia-smi ≤ ~27GB. If it spills
   to CPU or exceeds 30GB, roll back to the 64K model immediately.
7. Private-lane upgrade: point local_private.default_model AND HERMES_LOCAL_PRIVATE_MODEL (edit
   the .env key's value in place; NEVER print .env contents) at hermes-qwen3. fallback_allowed
   stays false.
8. Wire the inbox drain: session-start hook (or daily cron) reading
   /mnt/c/Users/BigotSmasher/Desktop/quick-pt/SS-PT/.ai-workflow/hermes-inbox/pending/ (WSL
   path only), absorb memos, record a consumed-through high-water mark, report in Telegram.
   Do not delete memos; archiving is repo-side.
9. Propose (draft-only, do NOT create) one daily-digest cron job (inbox + kanban + session
   summary → Telegram DM to Sean); show Sean the exact job text for a yes/no.
10. Implement /settings as a skill: no-args prints current values (model profile, context
    budget, privacy mode, web search, persona, keep-alive, streaming, digest cadence, memory
    approval, auto-TTS, MoA budget, redact_pii). Each setter echoes old→new + writes a
    config.yaml.bak-* first; REFUSES raising MoA budget or auto-approve (T3 — Sean only).
11. Set stt.local.model: small.

DO NOT:
- print or read .env values, tokens, or auth.json (key NAMES only)
- add any fallback provider, auto cloud route, or new inbound port
- enable Discord, dashboard public_url, or x_search/grok anything (Rule 12)
- raise MoA budget, auto-approve spend, or message anyone but Sean
- change num_ctx without flash-attention + q8 KV verified active first

VERIFY AT END: before/after tok/s table, VRAM before/after, `ollama ps` residency after
10-min idle, one end-to-end Telegram round trip on /local, /gemini, and the private lane,
and `hermes fallback list` still empty.

ROLLBACK: restore newest config.yaml.bak-*, re-create hermes-qwen3 from the 64K Modelfile,
reset OLLAMA_KEEP_ALIVE=120, restart via c:/tmp/hermes2-gateway-bg-stop.sh + -bg-start.sh.

OUTPUT: "Applied changes" / "Benchmark table" / "Deferred items awaiting Sean" / "Rollback
readiness" / "Recommended next safe action".
````

---

**Fable arbitration notes:** the draft passed my review unchanged in substance. The two [UNVERIFIED] items (which value wins for the private lane; staged 128K Modelfile location) are both self-healing inside §E steps 6–7. Step 8 also closes the Rule-69 inbox loop — the OS integration review found the same gap independently (digest should consume the inbox; see the 7★ gap review). Nothing in §E violates the operator bridge; D8/D11 correctly escalate to T3.

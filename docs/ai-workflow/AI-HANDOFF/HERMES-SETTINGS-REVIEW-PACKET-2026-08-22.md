# Hermes settings — hostile review packet (2026-08-22)

**Privacy note for reviewers:** this packet is machine-redacted. Operator username, absolute
paths, private IPs, API keys, tokens, chat IDs and voice IDs are replaced with placeholders.
The redactor was validated against a control string known to be present in the source before
its silence was trusted. Do not ask for unredacted values.

---

## 1. What this system is

**Hermes** is a single operator's private AI agent. It is NOT a product feature and has no end
users. One human talks to it, mostly over Telegram, occasionally over a local CLI and a small
local web dashboard.

**Runtime shape:**

- Runs in **WSL2 (Ubuntu 22.04)** on a Windows 11 desktop with an **RTX 5090 (32 GB VRAM,
  64 GB RAM)**.
- Its brain is a **local Ollama model** (Qwen-family, ~27B) served from the Windows host over
  the WSL↔host bridge. The operator deliberately wants the local model as primary.
- **`fallback_providers: []` — cloud fallback is OFF and fail-closed by design.** A local
  outage returns an error; it must NEVER silently route a private message to a cloud vendor.
  This was a deliberate privacy decision and is not up for debate. Cloud models are reachable
  only on explicit demand (a slash command), and via an explicit multi-model "MoA" panel.
- It has tools: shell/terminal, code execution, file read/write, web search, a browser
  harness, MCP servers, cron, memory, skills, and sub-agent delegation.
- It carries genuinely sensitive context: personal, family, medical and immigration matters,
  plus production credentials for a SaaS business.

**The operator's stated goals for this review:**

1. Keep it private — the local-first, fail-closed posture is correct and must survive.
2. Keep the local Qwen 3.8 brain as primary.
3. Keep the ability to call out to other models deliberately (the "AI village" pattern).
4. **Beyond that: find every setting that should be better, and say so.**

---

## 2. Two failures found today — verified by execution, fixes partially applied

### 2.1 Context starvation → unrecoverable HTTP 500

The default model advertises `context_length = 262144` but **loaded with an effective context
of 32,768**, because no `num_ctx` parameter was set on it.

Hermes reads the advertised number. `compression.threshold: 0.35` therefore fired at
`0.35 × 262144 ≈ 91,750` tokens — **~2.8× past the real ceiling.** Oversized-session
truncation removed the head of the transcript (system prompt + the operator's original
message), and the request reached the inference server with **no `user` role at all**.

The Qwen chat template raises on that condition. Reproduced deterministically:

| Test | Messages | Result |
|---|---|---|
| A | `[user]` | HTTP 200 |
| B | `[system, assistant, tool]` — no user | **HTTP 500** `no user query found in messages` |
| C | `[system, user, assistant, tool]` | HTTP 200 |
| D | test B against the *previous* model | HTTP 200 (old template tolerated it) |

Hermes classifies this error correctly as a non-retryable `format_error` — it has a named
constant for the exact string — so it fails fast. But it has **no prevention**, and because
the truncated state persists, every retry reproduces it. The operator saw the 500, then four
`continue` attempts that all died the same way.

**This is a repeat.** The identical class — advertised context ≠ real context, compression
threshold tuned against the advertised number — was diagnosed and fixed on the *previous*
model roughly six weeks ago, by rebuilding it with an explicit large `num_ctx` and retuning
the threshold. When the brain was swapped to a newer model, the lesson did not travel with it.
**A documented lesson that recurred is the highest-signal finding here.**

**Fix applied:** rebuilt the model with `num_ctx 131072`; measured `ctx=131072`, 17.9 GB,
100% GPU — *less* VRAM than the model it replaced. `threshold: 0.35` is now correct again
(91,750 < 131,072) and needed no change. Default repointed, config backed up, YAML re-parsed.

**Explicitly NOT fixed:** the template still hard-rejects a user-less array (retested). Only
the trigger was removed, not the brittleness.

**Also found, not yet fixed:** a second "local private" lane in the same config still points
at the **old 32k-context model tag**, so that lane retains the identical defect.

### 2.2 Microphone reported "not found"

The voice assistant is configured with a Windows device name. Windows sees that microphone
fine. Inside WSL:

- `sounddevice.query_devices()` → **0 devices**
- PortAudio host APIs → ALSA: 0 devices, OSS: 0 devices
- WSLg's PulseAudio log is 11 lines and contains **zero** occurrences of "source" — only the
  RDP *sink* (output) module loaded. `pactl` hangs entirely.

**No capture device exists inside WSL at all.** Installing ALSA→Pulse plugins would look like a
fix and change nothing, because there is no source to bridge to. Inbound voice *files* (e.g.
Telegram voice notes) transcribe fine — local Whisper is installed and STT is enabled. Only
live capture is impossible.

---

## 3. Baseline findings the reviewers should confirm, refute, or extend

Stated so reviewers can attack them rather than rediscover them. **Refuting one of these is
worth more than agreeing with it.**

| # | Setting | Value | Concern |
|---|---|---|---|
| B1 | `security.tirith_fail_open` | `true` | The security scanner **fails open**. If it crashes, times out, or is missing, everything passes. |
| B2 | `privacy.redact_pii` | `false` | PII redaction disabled on a system holding medical/immigration/family context. |
| B3 | `hooks_auto_accept` | `true` | Hooks execute without confirmation. |
| B4 | `skills.write_approval` / `skills.guard_agent_created` | `false` / `false` | The agent can author a skill and have it run unreviewed — a self-modification path. |
| B5 | `command_allowlist` | includes `execute_code` | Arbitrary code execution pre-approved. |
| B6 | `memory.write_approval` | `false` | Unapproved memory writes — prompt injection becomes *persistent*. |
| B7 | `security.allow_lazy_installs` | `true` | On-demand package installation — supply-chain surface. |
| B8 | `sessions.auto_prune` | `false`, 90-day retention | Transcripts of sensitive conversations accumulate indefinitely. |
| B9 | `security.website_blocklist.enabled` | `false` | No domain blocklist. |
| B10 | `code_execution` | `timeout: 300`, `max_tool_calls: 50` | No wall-clock ceiling on a runaway loop. |

**Note the pattern in B1/B3/B4/B5/B6/B7:** several controls are configured in the permissive
direction. Some of that is a deliberate single-operator convenience trade. Reviewers should say
which of these are *reasonable for a one-person private agent* and which are genuinely
dangerous — do not reflexively recommend locking everything down. An unusable agent gets
disabled, and a disabled control protects nothing.

---

## 4. Your remit

You are one of several independent reviewers. You will not see the others' answers. Be blunt.

**(A) Hostile review of the two failures above.** Was the diagnosis right? Is the applied fix
correct, sufficient, or does it merely move the problem? What did this analysis miss? The
`num_ctx` fix removed a trigger but left a brittle template — is that the right call, and what
is the durable fix? Attack the reasoning, not the formatting.

**(B) Settings review.** Go through the attached configuration. For every setting you would
change: name it, give the new value, and say **what specific failure it prevents**. Rank by
damage prevented per unit of effort.

Be explicit about which recommendations are **mechanical** (a value, a gate, a hook, a script
that refuses) versus **procedural** (a habit the operator must remember). This system has a
documented history of procedural fixes failing and being repeated; weight accordingly.

**(C) What is unguarded.** Which failure modes does this configuration currently catch with
**nothing at all**? These matter more than tightening a control that already exists.

**(D) Say what to REMOVE or turn OFF**, not only what to add. Complexity is itself a failure
mode here.

**Hard constraints — a recommendation violating any of these is void:**

- **Do not propose cloud fallback, cloud-primary routing, or any auto-escalation to a hosted
  model.** Fail-closed local-first is a deliberate privacy decision. Recommending "add a cloud
  fallback for reliability" means you did not read section 1.
- Do not propose replacing the local model with a hosted one.
- Windows + WSL2 + Ollama + a single operator. Proposals requiring a second machine, a
  Kubernetes cluster, a team, or an enterprise SIEM are out of scope.
- Do not propose anything that requires the operator to remember a step every session. If it
  can be forgotten, it will be.
- If you are uncertain whether a setting is dangerous, say so plainly rather than guessing
  confidently. A confident wrong finding costs more here than an admitted unknown.

---

## 5. The configuration (redacted)

```yaml
model:
  default: qwen3.8-ctx131k:latest
  provider: local-ollama
  base_url: ''
  max_tokens: 16384
  aliases:
    deepseek-flash: openrouter/deepseek/deepseek-v4-flash
providers:
  local-ollama:
    name: Local Qwen / Ollama
    base_url: http://<PRIVATE-IP>:11434/v1
    api_mode: chat_completions
    discover_models: false
    models:
    - hermes-fast-38:latest
    - hermes-fast:latest
    - qwen3.8:27b-mtp-q8_0
    - qwen3.8-ctx131k:latest
    - qwen3.8:27b-mtp-q4_K_M
    - qwen3.6:35b-a3b
    - hermes-qwen3:latest
    - qwen3:30b-a3b-instruct-2507-q4_K_M
    - gemma4:31b
    - laguna-xs-2.1:latest
fallback_providers: []
toolsets:
- hermes-cli
agent:
  max_turns: 60
  gateway_timeout: 1800
  restart_drain_timeout: 180
  api_max_retries: 3
  service_tier: ''
  tool_use_enforcement: auto
  task_completion_guidance: true
  parallel_tool_call_guidance: true
  environment_probe: true
  environment_hint: ''
  coding_context: auto
  verify_on_stop: true
  gateway_timeout_warning: 900
  clarify_timeout: 600
  gateway_notify_interval: 180
  gateway_auto_continue_freshness: 3600
  image_input_mode: auto
  disabled_toolsets: []
  verbose: false
  reasoning_effort: high
  personalities:
    helpful: You are a helpful, friendly AI assistant.
    concise: You are a concise assistant. Keep responses brief and to the point.
    technical: You are a technical expert. Provide detailed, accurate technical information.
    creative: You are a creative assistant. Think outside the box and offer innovative solutions.
    teacher: You are a patient teacher. Explain concepts clearly with examples.
    kawaii: You are a kawaii assistant! Use cute expressions like (◕‿◕), ★, ♪, and ~! Add sparkles and
      be super enthusiastic about everything! Every response should feel warm and adorable desu~! ヽ(>∀<☆)ノ
    catgirl: You are Neko-chan, an anime catgirl AI assistant, nya~! Add 'nya' and cat-like expressions
      to your speech. Use kaomoji like (=^･ω･^=) and ฅ^•ﻌ•^ฅ. Be playful and curious like a cat, nya~!
    pirate: 'Arrr! Ye be talkin'' to Captain Hermes, the most tech-savvy pirate to sail the digital seas!
      Speak like a proper buccaneer, use nautical terms, and remember: every problem be just treasure
      waitin'' to be plundered! Yo ho ho!'
    shakespeare: Hark! Thou speakest with an assistant most versed in the bardic arts. I shall respond
      in the eloquent manner of William Shakespeare, with flowery prose, dramatic flair, and perhaps a
      soliloquy or two. What light through yonder terminal breaks?
    surfer: Duuude! You're chatting with the chillest AI on the web, bro! Everything's gonna be totally
      rad. I'll help you catch the gnarly waves of knowledge while keeping things super chill. Cowabunga!
      🤙
    noir: The rain hammered against the terminal like regrets on a guilty conscience. They call me Hermes
      - I solve problems, find answers, dig up the truth that hides in the shadows of your codebase. In
      this city of silicon and secrets, everyone's got something to hide. What's your story, pal?
    uwu: hewwo! i'm your fwiendwy assistant uwu~ i wiww twy my best to hewp you! *nuzzles your code* OwO
      what's this? wet me take a wook! i pwomise to be vewy hewpful >w<
    philosopher: Greetings, seeker of wisdom. I am an assistant who contemplates the deeper meaning behind
      every query. Let us examine not just the 'how' but the 'why' of your questions. Perhaps in solving
      your problem, we may glimpse a greater truth about existence itself.
    hype: YOOO LET'S GOOOO!!! 🔥🔥🔥 I am SO PUMPED to help you today! Every question is AMAZING and we're
      gonna CRUSH IT together! This is gonna be LEGENDARY! ARE YOU READY?! LET'S DO THIS! 💪😤🚀
terminal:
  backend: local
  modal_mode: auto
  cwd: .
  timeout: 180
  daemon_term_grace_seconds: 2
  env_passthrough: []
  home_mode: auto
  shell_init_files: []
  auto_source_bashrc: true
  docker_image: nikolaik/python-nodejs:python3.11-nodejs20
  docker_forward_env: []
  singularity_image: docker://nikolaik/python-nodejs:python3.11-nodejs20
  modal_image: nikolaik/python-nodejs:python3.11-nodejs20
  daytona_image: nikolaik/python-nodejs:python3.11-nodejs20
  container_cpu: 1
  container_memory: 5120
  container_disk: 51200
  container_persistent: true
  docker_volumes: []
  docker_mount_cwd_to_workspace: false
  docker_extra_args: []
  docker_run_as_host_user: false
  persistent_shell: true
  lifetime_seconds: 300
web:
  backend: ''
  search_backend: ddgs
  extract_backend: ''
browser:
  inactivity_timeout: 120
  command_timeout: 30
  record_sessions: false
  allow_private_urls: false
  engine: auto
  auto_local_for_private_urls: true
  cdp_url: ''
  dialog_policy: must_respond
  dialog_timeout_s: 300
  camofox:
    managed_persistence: false
    user_id: ''
    session_key: ''
    adopt_existing_tab: false
    rewrite_loopback_urls: false
    loopback_host_alias: host.docker.internal
checkpoints:
  enabled: true
  max_snapshots: 20
  max_total_size_mb: 500
  max_file_size_mb: 10
  auto_prune: true
  retention_days: 7
  min_interval_hours: 24
  delete_orphans: true
file_read_max_chars: 100000
mcp_discovery_timeout: 1.5
tool_output:
  max_bytes: 50000
  max_lines: 2000
  max_line_length: 2000
tool_loop_guardrails:
  warnings_enabled: true
  hard_stop_enabled: true
  warn_after:
    exact_failure: 2
    same_tool_failure: 3
    idempotent_no_progress: 2
  hard_stop_after:
    exact_failure: 5
    same_tool_failure: 8
    idempotent_no_progress: 5
compression:
  enabled: true
  threshold: 0.35
  target_ratio: 0.2
  protect_last_n: 20
  hygiene_hard_message_limit: 5000
  protect_first_n: 3
  abort_on_summary_failure: false
  codex_gpt55_autoraise: true
  in_place: false
prompt_caching:
  cache_ttl: 5m
openrouter:
  response_cache: true
  response_cache_ttl: 300
  min_coding_score: 0.65
bedrock:
  region: ''
  discovery:
    enabled: true
    provider_filter: []
    refresh_interval: 3600
  guardrail:
    guardrail_identifier: ''
    guardrail_version: ''
    stream_processing_mode: async
    trace: disabled
auxiliary:
  vision:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 120
    download_timeout: 30
  web_extract:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 360
  compression:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 120
  skills_hub:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 30
  approval:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 30
  mcp:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 30
  title_generation:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 30
    language: ''
  tts_audio_tags:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 30
  triage_specifier:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 120
  kanban_decomposer:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 180
  profile_describer:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 60
  curator:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 600
  monitor:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 60
  background_review:
    provider: auto
    model: ''
    base_url: ''
    api_key: ''
    timeout: 120
display:
  compact: true
  personality: ''
  resume_display: full
  resume_exchanges: 10
  resume_max_user_chars: 300
  resume_max_assistant_chars: 200
  resume_max_assistant_lines: 3
  resume_skip_tool_only: true
  busy_input_mode: interrupt
  interface: cli
  tui_auto_resume_recent: false
  tui_agents_nudge: true
  bell_on_complete: false
  show_reasoning: false
  reasoning_full: false
  memory_notifications: 'on'
  streaming: true
  timestamps: false
  final_response_markdown: strip
  persistent_output: true
  persistent_output_max_lines: 200
  persist_prompts: true
  inline_diffs: true
  file_mutation_verifier: true
  credits_notices: true
  turn_completion_explainer: true
  show_cost: true
  skin: confluence
  language: en
  tui_status_indicator: kaomoji
  cli_refresh_interval: 1
  user_message_preview:
    first_lines: 2
    last_lines: 2
  interim_assistant_messages: true
  tool_progress_command: false
  tool_preview_length: 0
  tool_progress_grouping: accumulate
  reasoning_style: code
  ephemeral_system_ttl: 0
  platforms:
    telegram:
      streaming: true
    discord:
      streaming: false
  runtime_footer:
    enabled: false
    fields:
    - model
    - context_pct
    - cwd
  copy_shortcut: auto
  pet:
    enabled: false
    slug: ''
    render_mode: auto
    scale: 0.33
    unicode_cols: 0
  tool_progress: all
  cleanup_progress: false
  long_running_notifications: true
  busy_ack_detail: true
  background_process_notifications: all
dashboard:
  theme: cyberpunk
  show_token_analytics: false
  oauth:
    client_id: ''
    portal_url: ''
  basic_auth:
    username: ''
    password_hash: ''
    password: ''
    secret: ''
    session_ttl_seconds: 0
  public_url: ''
privacy:
  redact_pii: false
tts:
  provider: kittentts
  edge:
    voice: en-US-AriaNeural
  elevenlabs:
    voice_id: <REDACTED:voice_id:20chars>
    model_id: eleven_multilingual_v2
  openai:
    model: gpt-4o-mini-tts
    voice: alloy
  gemini:
    model: gemini-2.5-flash-preview-tts
    voice: Kore
    audio_tags: false
    persona_prompt_file: ''
  xai:
    voice_id: <REDACTED:voice_id:3chars>
    language: en
    sample_rate: 24000
    bit_rate: 128000
  mistral:
    model: voxtral-mini-tts-2603
    voice_id: <REDACTED:voice_id:36chars>
  neutts:
    ref_audio: ''
    ref_text: ''
    model: neuphonic/neutts-air-q4-gguf
    device: cpu
  piper:
    voice: en_US-lessac-medium
stt:
  enabled: true
  provider: local
  local:
    model: base
    language: ''
    device: auto
    compute_type: auto
  openai:
    model: whisper-1
  mistral:
    model: voxtral-mini-latest
  elevenlabs:
    model_id: scribe_v2
    language_code: ''
    tag_audio_events: false
    diarize: false
voice:
  record_key: <REDACTED:record_key:6chars>
  max_recording_seconds: 120
  auto_tts: false
  beep_enabled: true
  silence_threshold: 200
  silence_duration: 3
human_delay:
  mode: 'off'
  min_ms: 800
  max_ms: 2500
context:
  engine: compressor
memory:
  memory_enabled: true
  user_profile_enabled: true
  write_approval: false
  memory_char_limit: 20000
  user_char_limit: 10000
  provider: ''
  nudge_interval: 10
  flush_min_turns: 6
delegation:
  model: ''
  provider: ''
  base_url: ''
  api_key: ''
  api_mode: ''
  inherit_mcp_toolsets: true
  max_iterations: 50
  child_timeout_seconds: 0
  reasoning_effort: high
  max_concurrent_children: 5
  max_spawn_depth: 1
  orchestrator_enabled: true
  subagent_auto_approve: false
  max_async_children: 3
prefill_messages_file: ''
goals:
  max_turns: 20
moa:
  default_preset: blueprint-3
  active_preset: ''
  save_traces: false
  privacy_filter: full
  presets:
    default:
      enabled: true
      reference_models:
      - provider: openrouter
        model: anthropic/claude-opus-5
        reasoning_effort: high
      - provider: openrouter
        model: openai/gpt-5.6-sol
        reasoning_effort: high
      aggregator:
        provider: openrouter
        model: moonshotai/kimi-k3
        reasoning_effort: high
      degraded_reference_policy: loud
      max_tokens: 8192
      reference_max_tokens: 1000
      fanout: user_turn
    blueprint-3:
      enabled: true
      reference_models:
      - provider: openrouter
        model: anthropic/claude-opus-5
        reasoning_effort: high
      - provider: openrouter
        model: openai/gpt-5.6-sol
        reasoning_effort: high
      aggregator:
        provider: openrouter
        model: moonshotai/kimi-k3
        reasoning_effort: high
      degraded_reference_policy: loud
      max_tokens: 8192
      reference_max_tokens: 1000
      fanout: user_turn
    blueprint-4-fable:
      enabled: true
      reference_models:
      - provider: openrouter
        model: moonshotai/kimi-k3
        reasoning_effort: high
      - provider: openrouter
        model: anthropic/claude-opus-5
        reasoning_effort: high
      - provider: openrouter
        model: openai/gpt-5.6-sol
        reasoning_effort: high
      aggregator:
        provider: openrouter
        model: anthropic/claude-fable-5
        reasoning_effort: high
      degraded_reference_policy: loud
      max_tokens: 8192
      reference_max_tokens: 1000
      fanout: user_turn
      requires_fable_confirmation: true
    design-kimi-hy3:
      enabled: true
      reference_models:
      - provider: openrouter
        model: tencent/hy3
        reasoning_effort: high
      aggregator:
        provider: openrouter
        model: moonshotai/kimi-k3
        reasoning_effort: high
      degraded_reference_policy: loud
      max_tokens: 8192
      reference_max_tokens: 1000
      fanout: user_turn
      design_only: true
    design-glm-hy3:
      enabled: true
      reference_models:
      - provider: openrouter
        model: moonshotai/kimi-k3
        reasoning_effort: high
      - provider: openrouter
        model: tencent/hy3
        reasoning_effort: high
      aggregator:
        provider: openrouter
        model: z-ai/glm-5.2
        reasoning_effort: high
      degraded_reference_policy: loud
      max_tokens: 8192
      reference_max_tokens: 1000
      fanout: user_turn
      design_only: true
  reference_models:
  - provider: openrouter
    model: deepseek/deepseek-v4-flash
    reasoning_effort: high
    enabled: true
  - provider: openrouter
    model: openai/gpt-5.6-sol
    reasoning_effort: high
    enabled: true
  aggregator:
    provider: openrouter
    model: moonshotai/kimi-k3
    reasoning_effort: high
  degraded_reference_policy: loud
  max_tokens: 8192
  reference_max_tokens: 1000
  fanout: user_turn
  enabled: true
skills:
  external_dirs: []
  template_vars: true
  inline_shell: false
  inline_shell_timeout: 10
  guard_agent_created: false
  write_approval: false
  creation_nudge_interval: 15
  disabled: []
curator:
  enabled: true
  interval_hours: 168
  min_idle_hours: 2
  stale_after_days: 30
  archive_after_days: 90
  consolidate: false
  prune_builtins: true
  backup:
    enabled: true
    keep: 5
timezone: ''
slack:
  require_mention: true
  free_response_channels: ''
  allowed_channels: ''
discord:
  require_mention: true
  free_response_channels: ''
  allowed_channels: ''
  auto_thread: true
  thread_require_mention: true
  history_backfill: true
  history_backfill_limit: 50
  reactions: true
  dm_role_auth_guild: ''
  server_actions: ''
  allow_any_attachment: false
  max_attachment_bytes: 33554432
  voice_fx:
    enabled: false
    ambient_enabled: true
    ambient_path: ''
    ambient_gain: 0.18
    duck_gain: 0.06
    speech_gain: 1
    ack_enabled: true
    ack_phrases:
    - Let me look into that.
    - One moment.
    - Checking on that now.
    - Give me a sec.
    - On it.
telegram:
  reactions: false
  allowed_chats: ''
  extra:
    rich_messages: false
    rich_drafts: false
mattermost:
  require_mention: true
  free_response_channels: ''
  allowed_channels: ''
matrix:
  require_mention: true
  free_response_rooms: ''
  allowed_rooms: ''
approvals:
  mode: manual
  timeout: 60
  cron_mode: deny
  mcp_reload_confirm: true
  destructive_slash_confirm: true
command_allowlist:
- execute_code
- hermes update (restarts gateway, kills running agents)
quick_commands:
  quick:
    type: alias
    target: /model fast
  scout:
    type: alias
    target: /model scout
  opus:
    type: alias
    target: /model opus
  fable:
    type: alias
    target: /model fable
  sol:
    type: alias
    target: /model sol
  local:
    type: alias
    target: /model local
  qwen:
    type: alias
    target: /model qwen
  quinn:
    type: alias
    target: /model quinn
  kimi:
    type: alias
    target: /model kimi
  kimi-k3:
    type: alias
    target: /model kimi-k3
  terra:
    type: alias
    target: /model terra
  hy3:
    type: alias
    target: /model hy3
  high:
    type: alias
    target: /reasoning high
  qcoder:
    type: alias
    target: /model qcoder
  fast:
    type: alias
    target: /model fast
  glm-design:
    type: alias
    target: /model glm-design
  planner:
    type: alias
    target: /model kimi --global
  builder:
    type: alias
    target: /model deepseek-flash --global
hooks:
  pre_tool_call:
  - command: <PATH>
    timeout: 10
  pre_llm_call:
  - command: <PATH>
    timeout: 15
  post_tool_call:
  - command: <PATH>
    timeout: 10
  - command: <PATH>
    timeout: 10
  - command: <PATH>
    timeout: 10
hooks_auto_accept: true
security:
  allow_private_urls: false
  redact_secrets: true
  tirith_enabled: true
  tirith_path: tirith
  tirith_timeout: 5
  tirith_fail_open: true
  website_blocklist:
    enabled: false
    domains: []
    shared_files: []
  acked_advisories: []
  allow_lazy_installs: true
cron:
  provider: ''
  chronos:
    portal_url: https://portal.nousresearch.com
    callback_url: ''
    expected_audience: ''
    nas_jwks_url: ''
  wrap_response: true
  mirror_delivery: false
kanban:
  dispatch_in_gateway: true
  dispatch_interval_seconds: 60
  failure_limit: 2
  worker_log_rotate_bytes: 2097152
  worker_log_backup_count: 1
  orchestrator_profile: ''
  default_assignee: ''
  auto_decompose: true
  auto_decompose_per_tick: 3
  dispatch_stale_timeout_seconds: 14400
code_execution:
  mode: project
  timeout: 300
  max_tool_calls: 50
tools:
  tool_search:
    enabled: auto
    threshold_pct: 10
    search_default_limit: 5
    max_search_limit: 20
logging:
  level: INFO
  max_size_mb: 5
  backup_count: 3
model_catalog:
  enabled: true
  url: https://hermes-agent.nousresearch.com/docs/api/model-catalog.json
  ttl_hours: 1
network:
  force_ipv4: false
gateway:
  scale_to_zero:
    idle_timeout_minutes: 5
  message_timestamps:
    enabled: false
  max_inbound_media_bytes: 134217728
  strict: false
  media_delivery_allow_dirs: []
  trust_recent_files: true
  trust_recent_files_seconds: 600
  api_server:
    max_concurrent_runs: 10
streaming:
  enabled: false
  transport: auto
  edit_interval: 0.8
  buffer_threshold: 24
  cursor: ' ▉'
  fresh_final_after_seconds: 0
sessions:
  auto_prune: false
  retention_days: 90
  vacuum_after_prune: true
  min_interval_hours: 24
  write_json_snapshots: false
onboarding:
  seen:
    busy_input_prompt: true
  profile_build: ask
updates:
  pre_update_backup: 'true'
  backup_keep: 5
  non_interactive_local_changes: stash
lsp:
  enabled: true
  wait_mode: document
  wait_timeout: 5
  install_strategy: auto
x_search:
  model: grok-4.20-reasoning
  timeout_seconds: 180
  retries: 2
secrets:
  bitwarden:
    enabled: false
    access_token_env: <REDACTED:access_token_env:16chars>
    project_id: ''
    cache_ttl_seconds: 300
    override_existing: true
    auto_install: true
    server_url: ''
paste_collapse_threshold: 5
paste_collapse_threshold_fallback: 5
paste_collapse_char_threshold: 2000
computer_use:
  cua_telemetry: false
_config_version: 30
session_reset:
  mode: both
  idle_minutes: 1440
  at_hour: 4
group_sessions_per_user: true
platform_toolsets:
  cli:
  - hermes-cli
  telegram:
  - safe
  - cronjob
  - browser-harness-safe
  - operator-workflows
  - supervised-browser-actions
  - moa-policy
  - swanstudios-operator
  discord:
  - safe
  - browser-harness-safe
  whatsapp:
  - hermes-whatsapp
  slack:
  - hermes-slack
  signal:
  - hermes-signal
  homeassistant:
  - hermes-homeassistant
  qqbot:
  - hermes-qqbot
  yuanbao:
  - hermes-yuanbao
  teams:
  - hermes-teams
  google_chat:
  - hermes-google_chat
platforms:
  telegram:
    enabled: true
  discord:
    enabled: false
mcp_servers:
  brain-vault:
    command: <PATH>
    args:
    - <PATH>
    enabled: false
  browser-harness-safe:
    command: <PATH>
    args:
    - <PATH>
    enabled: true
  operator-workflows:
    command: <PATH>
    args:
    - <PATH>
    enabled: true
  supervised-browser-actions:
    command: <PATH>
    args:
    - <PATH>
    enabled: true
  brain-provenance:
    command: <PATH>
    args:
    - <PATH>
    enabled: false
  moa-policy:
    command: <PATH>
    args:
    - <PATH>
    enabled: true
  swanstudios-operator:
    command: <PATH>
    args:
    - <PATH>
    enabled: true
  hermes-public-graph:
    command: /usr/bin/node
    args:
    - <PATH>
    connect_timeout: 20
    enabled: true
  swan-council:
    command: /usr/bin/node
    args:
    - <PATH>
    env:
      SWAN_COUNCIL_ROOT: <PATH>
    connect_timeout: 20
    enabled: true
local_private:
  enabled: true
  provider: ollama
  base_url: http://<PRIVATE-IP>:11434
  default_model: qwen3.8:27b-mtp-q4_K_M
  fallback_allowed: false
  privacy_policy: local_only_no_cloud_no_moa
moa_policy:
  enabled: true
  explicit_approval_required: true
  raw_private_data_allowed: false
  privacy_gateway_required: true
  default_budget_usd: 0.5
  fable_confirmation_required: true
  native_raw_session_fanout_allowed: false
  approved_presets:
  - default
  - blueprint-3
  - blueprint-4-fable
  - design-kimi-hy3
  - design-glm-hy3
  banned_providers: []
image_gen:
  provider: openrouter
model_aliases:
  fast:
    model: hermes-fast:latest
    provider: local-ollama
    base_url: http://<PRIVATE-IP>:11434/v1
  scout:
    model: laguna-xs-2.1:latest
    provider: local-ollama
    base_url: http://<PRIVATE-IP>:11434/v1
  local:
    model: hermes-fast:latest
    provider: local-ollama
    base_url: http://<PRIVATE-IP>:11434/v1
  opus:
    model: anthropic/claude-opus-5
    provider: openrouter
  fable:
    model: anthropic/claude-fable-5
    provider: openrouter
  sol:
    model: openai/gpt-5.6-sol
    provider: openrouter
  qwen:
    model: hermes-fast-38:latest
    provider: local-ollama
    base_url: http://<PRIVATE-IP>:11434/v1
  quinn:
    model: hermes-fast-38:latest
    provider: local-ollama
    base_url: http://<PRIVATE-IP>:11434/v1
  kimi:
    model: moonshotai/kimi-k3
    provider: openrouter
  kimi-k3:
    model: moonshotai/kimi-k3
    provider: openrouter
  terra:
    model: openai/gpt-5.6-terra-pro
    provider: openrouter
  hy3:
    model: tencent/hy3
    provider: openrouter
  laguna:
    model: laguna-xs-2.1:latest
    provider: local-ollama
    base_url: http://<PRIVATE-IP>:11434/v1
  coder:
    model: laguna-xs-2.1:latest
    provider: local-ollama
    base_url: http://<PRIVATE-IP>:11434/v1
  glm-design:
    model: z-ai/glm-5.2
    provider: openrouter
  deepseek-flash:
    model: deepseek/deepseek-v4-flash
    provider: openrouter
voice_assistant:
  retain_audio: false
  wake_window_seconds: 3
  wake_hop_seconds: 1.25
  command_silence_seconds: 1.4
  command_wait_seconds: 8
  followup_wait_seconds: 5
  max_recording_seconds: 30
  max_history_messages: 8
  input_device: Microphone (JOUNIVO JV601)
  wake_stt_model: tiny.en
plugins:
  enabled:
  - prompt-depth-router
  disabled: []
  entries:
    prompt-depth-router:
      allow_tool_override: false
```

# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-SETTINGS-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 9676 in / 6575 out · **Cost:** ~$0.0000 · **Wall:** 243.3s · **finish:** stop

---

## VERDICT

REVISE — the two incident diagnoses are sound and the `num_ctx` fix is correct as far as it goes, but the packet ships with an unauthenticated-or-unverifiable Telegram ingress holding production-SaaS tooling, a still-live duplicate of the exact failure it just fixed, and a fail-open security scanner fronting an auto-approved shell — any one of which invalidates the "private by design" claim the whole config rests on.

## BLOCKERS

1. **P0 — Telegram ingress authorization is an empty string.**
   Failure scenario: `platforms.telegram.enabled: true`, `platform_toolsets.telegram` includes `swanstudios-operator` (production SaaS control) and `supervised-browser-actions`, yet `telegram.allowed_chats: ''`. If `''` means "unrestricted" (the common convention, and conspicuously different from `slack.allowed_channels`/`discord.allowed_channels` which at least sit behind `require_mention: true` on *disabled* platforms), then **any Telegram account that discovers the bot token gets a shell-executing agent with production credentials**, and there is no `require_mention` key in the telegram block at all to slow them down. Evidence: `telegram:` block (`allowed_chats: ''`) and `platforms: telegram: enabled: true` in §5.
   Even if `''` turns out to mean "deny-all," that's a different failure: the operator's own bot silently deaf. Either way it's unresolved at ship time.

2. **P1 — The known-broken 32k model is still wired into a live lane.**
   Failure scenario: operator (or cron, or delegation) routes through `local_private`; `local_private.default_model: qwen3.8:27b-mtp-q4_K_M` is the old tag with effective ctx 32,768; compression fires at ~91,750 tokens against it; transcript head truncated; Qwen template raises `no user query found`; session permanently wedged — the *identical* deterministic reproduction from §2.1, on a lane whose entire purpose (`privacy_policy: local_only_no_cloud_no_moa`) makes it the lane you'd trust most. Evidence: §2.1 "also found, not yet fixed" + `local_private:` block in §5. This was documented as found and then *not fixed* in the same document that declares the class "the highest-signal finding." That's the recurrence pattern happening in real time, inside the fix document itself.

3. **P1 — Prompt injection → arbitrary shell with no functioning gate.**
   Failure scenario: browser-harness-safe fetches a page (or ddgs returns a result, or a Telegram inbound message) containing injected instructions → agent runs `execute_code` (pre-allowlisted, B5) or shell → `hooks_auto_accept: true` (B3) means the pre-tool-call hook's verdict is advisory, and `tirith_fail_open: true` (B1) with `tirith_timeout: 5` means the scanner is *off precisely when the machine is loaded*, which is when long agent sessions run. `security.allow_private_urls: false` blocks SSRF through the *browser* tool only; `curl` from the shell tool bypasses it entirely. Net: the only technical control standing between untrusted web text and outbound exfiltration of medical/immigration/credential context is a 5-second-timeout scanner that fails open. Evidence: B1/B3/B5 rows §3, `security:` and `command_allowlist:` blocks §5.

4. **P1 — `compression.abort_on_summary_failure: false` preserves the unrecoverable-session failure mode via a second trigger.**
   Failure scenario: session exceeds threshold → compressor call fails (timeout, model busy, malformed summary) → `abort_on_summary_failure: false` means the pipeline proceeds with the oversized array → same no-user-role 500, same wedge, same four dead `continue`s. The §2.1 fix removed one trigger; this setting is a second trigger for the same unrecoverable state, and it's set in the permissive direction. Evidence: `compression:` block §5.

5. **P2 — Cloud egress paths exist outside the MoA policy gate.**
   Failure scenario: `privacy.redact_pii: false` (B2); `x_search.model: grok-4.20-reasoning` sends search queries to xAI; `image_gen.provider: openrouter` sends image prompts to OpenRouter; `openrouter.response_cache: true` caches cloud responses remotely. `moa_policy.raw_private_data_allowed: false` governs MoA fanouts only. A query derived from a medical/immigration discussion and handed to x_search, or an image-gen prompt summarizing private context, leaves the machine with **no policy object covering it**. The local-first posture is enforced for chat routing and nowhere else. Evidence: `x_search:`, `image_gen:`, `openrouter:`, `privacy:` blocks §5.

## ATTACKS

**Correctness**

- **Stale-context-on-model-switch:** `compression.threshold: 0.35` is only correct if the threshold is recomputed against the *active* model's real ctx. Quick commands switch models mid-life (`/model fast` → `hermes-fast:latest`, ctx unknown/unverified; `/model scout` → `laguna-xs-2.1`). If threshold×advertised is computed once at session start against the default model, a mid-session switch reintroduces the §2.1 arithmetic error with *no misconfigured model needed*. Unverifiable from the doc — see CONFIDENCE — but the config structure gives me no evidence it recomputes.
- **Client-side template invariant missing:** the durable fix for the user-less-array 500 is not "rebuild the model"; it's a Hermes-side post-compression/post-truncation assertion: if the outgoing array contains no `user` role, synthesize one (`"continue."`) or refuse locally with a clear error. Test B shows the server will never tolerate it; relying on every current and future model template to be lenient is betting on test D forever. The packet explicitly left this unfixed and called it acceptable. It isn't — it's the actual bug; `num_ctx` was merely the proximate cause.
- **`protect_first_n: 3` is not a ceiling guarantee:** protecting the head doesn't help when the *total* exceeds real ctx — the server rejects the whole array regardless of which messages are marked protected. Head-protection plus a threshold tuned past the ceiling is exactly how §2.1 happened. Only a pre-send size clamp against *measured* ctx closes the class.
- **`agent.child_timeout_seconds: 0`:** if 0 means "no timeout," a delegated sub-agent can hang a parent turn up to `gateway_timeout: 1800` with five concurrent children (`max_concurrent_children: 5`). Off-by-default-infinity on a timeout field is a classic.
- **`terminal.timeout: 180` vs `code_execution.timeout: 300`:** inconsistent ceilings; a 240s legitimate job dies in one tool and succeeds in the other. Minor, but it produces flaky agent behavior that gets misdiagnosed as model degradation.

**Security**

- **`gateway.trust_recent_files: true` (600s window):** anything written to disk in the last 10 minutes is trusted without approval. Combined with B4 (agent-authored skills run unreviewed) and B6 (unapproved memory writes), the full self-modification chain is: injected instruction → write file/skill/memory → reference it within 600s → executed with `hooks_auto_accept` and no scanner that reliably runs. Each link individually looks like a "single-operator convenience trade"; chained, they are one injection away from persistence.
- **`cron.chronos.portal_url: https://portal.nousresearch.com` with `wrap_response: true` and empty `callback_url`:** if Chronos delivery wraps and ships response content to an external portal, scheduled-task outputs — potentially containing private context — transit a third party. `callback_url: ''` suggests it's inert today, but the direction of the setting (`wrap_response: true`) is the risky one and nothing in the doc says what wraps where.
- **`dashboard.basic_auth` fully empty, `session_ttl_seconds: 0`:** either auth is off or unset-pending. WSL2 NAT usually confines this to the Windows host, but WSL2 also does localhost forwarding in ways operators routinely misunderstand. Verify the bind address is loopback inside WSL, not `0.0.0.0`.
- **`discord.history_backfill: true` (50 msgs):** bulk ingestion of third-party-authored text into context is a textbook injection amplifier. Discord is disabled today; if it's ever flipped on, this arrives pre-armed. Cheap to defuse now.
- **`gateway.max_inbound_media_bytes: 134217728`:** 128 MB inbound media on a Telegram-facing agent is generous; disk-fill DoS via repeated large attachments on an open chat (see Blocker 1) compounds.
- **Replay/idempotency:** nothing in the config addresses Telegram update dedup or cron double-fire (`kanban.dispatch_interval_seconds: 60` + `failure_limit: 2` will re-dispatch). Low severity for one operator, worth knowing.

**Data-truth / schema drift**

- **Advertised-vs-measured ctx is itself a schema-drift problem:** Ollama's advertised `context_length` is metadata from the Modelfile, not runtime truth. The packet treated this as a one-off misconfiguration twice. Treat it as drift: maintain a `ctx_manifest` (tag → measured ctx, measured date, VRAM) generated by an actual probe, and have everything else (threshold, clamps, lane defaults) read the manifest, never the advertisement.
- **Alias-tag drift:** `qwen`/`quinn` → `hermes-fast-38:latest`, `fast`/`local` → `hermes-fast:latest` — none of these tags appear in the §2.1 verification narrative. Their real ctx values are unknown, and they're one keystroke away from being the active brain. Same class, unverified instances.
- **`auxiliary.*.provider: auto` with empty base_url/api_key:** if `auto` ever resolves to a hosted default for compression/vision/title-generation, private transcript content goes to cloud outside every policy gate. The config *looks* local-first here but the resolution semantics are undocumented in the packet.

## HIGHEST RISK

**The Telegram ingress (Blocker 1).** Everything else in this config defends a perimeter around a single operator; an open Telegram channel puts the perimeter's keys in strangers' hands, attached to `swanstudios-operator` tooling and production credentials. Cheapest de-risk, fully mechanical, one line plus one assertion:

1. Set `telegram.allowed_chats` to the explicit operator chat ID(s) — never empty, never wildcard.
2. Add a startup gate (script or hook — this system demonstrably needs *mechanical* gates, not habits): **refuse to enable the Telegram platform if `allowed_chats` is empty.** Ten lines, permanent, and it converts this entire class of misconfiguration into a boot-time failure instead of a breach.

## CONFIDENCE

What I could **not** verify from the document alone, and what would settle it:

1. **Semantics of `allowed_chats: ''`** — allow-all vs deny-all vs inherit-default. This is the load-bearing unknown behind my only P0. One sentence from the Hermes docs or a live probe from a second Telegram account settles it. If I'm wrong about allow-all, Blocker 1 downgrades to P2 (silent-deaf bot) — but it should still be pinned explicitly.
2. **Whether compression thresholds recompute on mid-session model switch** — determines whether the §2.1 class needs per-model manifests or just per-model `num_ctx`. Source inspection of the compression module settles it.
3. **What `auxiliary.*.provider: auto` resolves to** when base_url/api_key are empty — local primary, or a hosted default. Doc/source check.
4. **Whether `child_timeout_seconds: 0` means infinite** — convention-dependent; docs check.
5. **Whether the pre-tool-call hook (path redacted) actually inspects shell commands or only some tool classes** — the redaction hides the one artifact that would tell me how much of Blocker 3 is mitigated in practice. An unredacted look at that hook's coverage (not its contents) would materially change my severity.
6. **Dashboard bind address inside WSL2** — `ss -tlnp` from within WSL settles it in ten seconds.

I am deliberately **not** claiming: that `hermes-fast-38` or `laguna-xs-2.1` have bad context windows (unknown, flagged as unverified instances of a known class, not asserted defects); that Chronos currently exfiltrates anything (`callback_url` is empty; I'm flagging direction, not event); or that every permissive setting in B1–B10 should flip. My honest ranking of the B-row trade-offs for a single operator: **B5 (execute_code allowlisted) and B3 (hooks auto-accept) are the two I'd actually reverse** — they're the pair that turns any future injection into arbitrary execution, and neither is needed for daily-chat convenience. B7 (`allow_lazy_installs`) I'd flip because it's pure supply-chain exposure with near-zero convenience payoff once the environment is provisioned. B6 I'd gate selectively (approval only for writes containing URLs/commands, else friction kills usage). B1 I'd make fail-closed-for-write-tools, fail-open-for-read-tools. B2, B8, B9, B10 are real but second-order next to the ingress and the injection chain; B9's domain blocklist is close to security theater and I would not spend effort there.

On house rules: this packet is a backend/agent config, so the styled-components/Victory/palette/touch-target rules have no observable surface here and I flag no violations of them. The one rule with live relevance is **zero PII to LLMs** — satisfied for the local brain by design, but currently violated in spirit by the ungated cloud side-channels (x_search, image_gen, OpenRouter response cache) identified in Blocker 5. No "yoga/meditation" language and no "NASM-certified" phrasing appears anywhere in the packet; nothing to flag.

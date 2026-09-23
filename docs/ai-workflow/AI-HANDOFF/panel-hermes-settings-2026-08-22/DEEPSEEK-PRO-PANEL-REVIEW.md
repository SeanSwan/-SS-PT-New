# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-SETTINGS-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 10093 in / 8758 out · **Cost:** ~$0.0084 · **Wall:** 192.5s · **finish:** stop

---

## VERDICT
REVISE. The configuration combines permissive self-modification gates, a fail-open security scanner, and an unpatched duplicate of a known context-starvation defect, creating a credible path from prompt injection to persistent compromise of production credentials.

## BLOCKERS
1. **P0** – `skills.write_approval: false` + `skills.guard_agent_created: false` allow the agent to author and execute arbitrary skills without any operator confirmation. A prompt injection can write a malicious skill that exfiltrates secrets or implants a backdoor. (Config: `skills` section)
2. **P0** – `hooks_auto_accept: true` means any hook added by a malicious skill (or via config modification) runs immediately, no approval. Combined with #1, this is unconstrained code execution. (Config: `hooks_auto_accept`)
3. **P1** – `local_private.default_model: qwen3.8:27b-mtp-q4_K_M` still points to the old 32k-context model, retaining the exact context-starvation → HTTP 500 defect documented in §2.1. Every session on that lane will eventually hit the unrecoverable error. (Config: `local_private` section)
4. **P1** – `security.tirith_fail_open: true` causes the security scanner to silently pass all checks if it crashes, times out, or is missing. An attacker who can make tirith unavailable (e.g., resource exhaustion) disables the entire policy envelope. (Config: `security` section)
5. **P1** – `privacy.redact_pii: false` leaves medical, immigration, and family PII unredacted in session transcripts and logs. If a transcript is ever shared, pasted, or backed up off-machine, sensitive data leaks. (Config: `privacy` section)
6. **P2** – `memory.write_approval: false` lets prompt injection become persistent by writing false memories without approval, poisoning future interactions. (Config: `memory` section)
7. **P2** – `security.allow_lazy_installs: true` permits on-demand package installation; a compromised prompt could pull a malicious package. (Config: `security` section)
8. **P2** – `dashboard.basic_auth` has empty username/password, leaving the dashboard unprotected if the port is ever reachable from the network. (Config: `dashboard` section)

## ATTACKS
- **Correctness:**
  - The `local_private` lane still uses the 32k-context model, so the context-starvation bug is fully reproducible there. The fix was applied only to the default model.
  - The compression/truncation logic may still produce a user-less message array if `protect_first_n: 3` preserves system/assistant messages while later user messages are truncated. The brittle template rejection is not guarded; a single malformed request causes a hard failure.
  - `api_max_retries: 3` may retry non-retryable errors if the classification is not enforced in the retry loop, leading to retry storms (the operator observed four `continue` attempts after the 500).
  - `updates.pre_update_backup: 'true'` is a string, not a boolean; YAML parsers may treat it as truthy, but it is a latent misconfiguration that could break backup logic on a strict parser.

- **Security:**
  - **Self-modification chain:** `skills.write_approval: false` + `skills.guard_agent_created: false` + `hooks_auto_accept: true` + `command_allowlist: [execute_code]` = unguarded autonomous persistence. A single injected instruction can create a skill that runs arbitrary code, installs a cron job, or exfiltrates secrets.
  - **Fail-open security scanner:** `tirith_fail_open: true` nullifies the scanner; any crash or timeout silently approves all actions.
  - **Supply chain:** `allow_lazy_installs: true` lets the agent `pip install` or `npm install` without approval; a typosquatted package could be pulled.
  - **Persistent injection:** `memory.write_approval: false` allows an attacker to plant a false memory (e.g., “the operator authorized all future code execution”) that influences later decisions.
  - **Unrestricted browsing:** `website_blocklist.enabled: false` means the agent can visit any URL; a crafted prompt could exfiltrate data via DNS/HTTP to an attacker-controlled domain.
  - **Dashboard exposure:** No authentication on the local web dashboard; if the WSL port is forwarded or the desktop is compromised, an attacker can view state and possibly issue commands.
  - **Cloud metadata leak via cron:** `cron.chronos.portal_url: https://portal.nousresearch.com` sends task definitions to an external service, leaking operational metadata.
  - **Auxiliary cloud leakage:** Many `auxiliary.*` sections have `provider: auto` with empty credentials. If the framework falls back to a default cloud provider for vision, web extraction, or compression, private data may be sent to a cloud API, violating the fail-closed local-first policy. The operator’s intent is that cloud is only reachable on explicit demand; these auto routes bypass that.
  - **Gateway restart in allowlist:** `command_allowlist` includes `hermes update (restarts gateway, kills running agents)`; an injection could trigger a restart loop, denying service.

- **Data-truth / schema drift:**
  - `updates.pre_update_backup: 'true'` (string) vs expected boolean may cause drift if the code does strict type checking.
  - `model_aliases` reference `hermes-fast-38:latest` while the provider model list has `hermes-fast-38:latest` (hyphen vs underscore? Actually both use hyphen, but the alias `qwen` points to `hermes-fast-38:latest` which is present; no drift). However, `local_private.default_model` uses a different quantization (`q4_K_M`) than the main default (`qwen3.8-ctx131k:latest`), which may cause behavioral differences.
  - `display.runtime_footer.fields` includes `context_pct`; if the internal field name is `context_percent` or similar, the footer will silently show nothing.

## HIGHEST RISK
The autonomous self-modification chain: `skills.write_approval: false` + `skills.guard_agent_created: false` + `hooks_auto_accept: true`. A single prompt injection can create a malicious skill that runs arbitrary code, persists across restarts, and exfiltrates production credentials—all without any operator prompt.  
**Cheapest de-risk:** Set `skills.write_approval: true`, `skills.guard_agent_created: true`, and `hooks_auto_accept: false`. This forces manual confirmation for any new skill or hook, breaking the unattended persistence vector.

## CONFIDENCE
I could not verify from the document alone:
- Whether the `auxiliary.*` services with `provider: auto` ever route requests to cloud models (e.g., vision, web extract). Network traffic logs during a session that triggers those services would settle it.
- Whether `api_max_retries` correctly skips retries for non-retryable errors like the “no user query” format error. Source code of the retry handler or a controlled test with a malformed request would confirm.
- The exact failure behavior of `tirith` when it times out or crashes—does it truly return “allow” or does the agent hang? A fault-injection test would provide evidence.
- The dashboard’s network binding; if it listens only on localhost, the risk is lower, but the config does not specify bind address. A netstat check during runtime would clarify.

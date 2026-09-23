# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 2945 in / 15099 out (reasoning: 11997) | total 18044
**Wall:** 320.0s

---

## Verdict up front

- **Your template-level chain is proven.** The model rejects `high`; Hermes sent `high`; the error body proves both.
- **Your selector-level chain (spelling miss) is plausible but unproven**, and you underweighted a competing explanation that your own quoted code makes at least as likely: **request-level reasoning outranks per-model overrides** on the api_server path. Both hypotheses fit every fact you've collected, including restart-proofness.
- The §4 "inversion" is explained by Ollama canonicalizing `reasoning_effort` to its own vocabulary before Jinja sees it — which has a consequence you haven't drawn yet: **`xhigh` is unreachable through this endpoint, ever, by any client.**

Details below. Where I'm inferring rather than citing verified behavior, I say so.

---

## Q1 — Root-cause chain: confirmed with one gap

**Proven:** template raises on `high` → Hermes sent `high` (the error string `Unexpected reasoning effort h...` is the template echoing back the exact value it received — this is your best forensic artifact and you left it truncated; go read the full body).

**Unproven:** *why* `high` was sent. Two live candidates:

| | H1: spelling miss (yours) | H2: request-level override outranks per-model |
|---|---|---|
| Mechanism | Desktop resolves against bare `qwen3.8-uncensored`; override keyed on tagged form misses; global `high` applies | Desktop client or session pins `reasoning_effort: high` and sends it per-request; `api_server.py:3221` takes `request_reasoning_config` **first**, so the override never runs |
| Explains failure after restart | ✅ | ✅ (backend restart doesn't clear Electron-side state or session rows) |
| Explains session id predating config save | neutral | ✅ |
| Explains your resolver test | ✅ (it proves the *resolver's* matching, not the runtime's input) | ✅ (irrelevant to it) |

Note your own quoted line is the smoking gun for H2's existence: `request_reasoning_config if request_reasoning_config is not None else _load_reasoning_config(model)`. You analyzed the session-override branch in `run.py:10534` but not the request-level branch, which is the *first* check on the actual failing path.

**Cheap decisive experiments, in order of cost:**

1. **Read the full error body** from the Hermes failure and from `curl -d '{"reasoning_effort":"xhigh"}'`. The raise message contains the exact value that reached Jinja. This is a free oracle you're not using.
2. **Add both spellings** (below). If it works → H1 confirmed. Two-line YAML change, zero risk.
3. **Start a brand-new desktop conversation.** New session id, post-config. If new sessions succeed and the old one fails → H2 (session/client-pinned reasoning).
4. **Differential via the gateway:** send a Telegram message to `qwen3.8-uncensored:latest`. Gateway sessions have no desktop client state. If gateway works with the override in place while desktop fails → H2. If both fail identically → H1 becomes much more likely.
5. **Canary:** temporarily set global `agent.reasoning_effort: low`, restart desktop, test. If the error disappears, the desktop consults the *global* (i.e., the per-model override missed → H1). If it persists, something request/session-scoped is pinning `high` → H2. Revert immediately after.
6. Last resort: `OLLAMA_DEBUG=1` on the Ollama server (it logs the parsed request) or a `socat`/mitmproxy logging shim on a second port. Stays local, reversible.

Also adversarial on H1's specifics: you tested exactly three strings against the resolver. The provider-prefixed form `local-ollama/qwen3.8-uncensored:latest` should hit via "strip provider prefix" (step 3), so it isn't a risk. **The only failing spelling in the entire variant space is the tag-stripped bare form.** That's convenient — it means one extra YAML key covers H1 completely.

One more thing to verify: `_load_reasoning_config` is not the same name as `resolve_reasoning_config`. Confirm the former actually delegates to the documented "single chokepoint" and isn't a stale duplicate with its own parsing. Your whole H1 rests on that delegation existing.

---

## Q2 — Correct fix layer, ranked

| Rank | Fix | Why |
|---|---|---|
| **1** | **Hermes per-model override, keyed correctly** — targeted version of (a), not a shotgun: `qwen3.8-uncensored:latest: medium` **and** `qwen3.8-uncensored: medium`. Plus, if H2 confirmed: reset the desktop session / start a new conversation. | Smallest, reversible, config-only, satisfies all four constraints, covers *both* surfaces since gateway and desktop share `config.yaml`. |
| **2** | **(c), done properly:** patch the GGUF's `tokenizer.chat_template` metadata and `ollama create` from the patched file. Widen the tuple to `('xhigh','high','medium','low')`, map `high` into the `xhigh` branch. | This is the only fix on the artifact itself; benefits every client forever. Cost: a full 17 GB file rewrite (GGUF KV edits change offsets, so no in-place patch), disk space, and a **new blob id — expected, not corruption**. Your "same blob id" verification method will flag it; that's fine. Do this only if you want `high` to *work* rather than be clamped. |
| **3** | Local stripping proxy (see Q4). | Only if Hermes couldn't express the clamp — it can, so don't. |
| ✗ | (b) global `medium` | Violates your constraint, hurts the stock model. |
| ✗ | Modelfile `TEMPLATE` rebuild | Your Attempt A conclusion is correct: Modelfile `TEMPLATE` parses as Go text/template (the `function "content" not defined` error is Go's parser choking on Jinja), and even if you wrote a valid Go ChatML template you'd throw away the Jinja reasoning-effort/thinking logic entirely. Wrong tool for a thinking model. |

Nuance on the override value: your resolver's output shows the schema is `{'enabled': True, 'effort': 'medium'}` — so it plausibly supports `enabled: false`. If `false` means "omit the field," that's semantically the *model author's intent*: the template's own `default('xhigh')` applies (max thinking). If you want faster/cheaper, use `medium`. Verify which wire behavior `enabled: false` produces before relying on it.

---

## Q3 — The inversion: Ollama canonicalizes before Jinja

I don't have 0.33.2 source memorized (it postdates my certain knowledge), so this is inference — but it's the **only transform consistent with all seven rows** of your table:

| You send | Ollama's OpenAI-compat layer | Var injected into Jinja context | Template evaluates | Result |
|---|---|---|---|---|
| omitted | — | (undefined) | `default('xhigh')` → `xhigh` ∈ tuple | 200 |
| `none` | recognized: thinking **off** | **withheld** | default → `xhigh` | 200 |
| `minimal` | unrecognized/off-scale → dropped (or → `low`) | withheld (or `low`) | default or `low` | 200 |
| `low` | canonical | `low` | ∈ tuple | 200 |
| `medium` | canonical | `medium` | ∈ tuple | 200 |
| `high` | canonical | `high` | ∉ tuple → **raise** | 500 |
| `xhigh` | **not canonical → clamped/aliased to `high`** (or unknown-value fallback = default effort `high`) | `high` | ∉ tuple → **raise** | 500 |

If Ollama passed values through verbatim, `xhigh` would pass its own tuple check and `none`/`minimal` would fail it — the exact opposite of what you measured. Passthrough is falsified by your own data. The endpoint speaks OpenAI's effort vocabulary (`none/low/medium/high`, plus `minimal`), translates to its internal thinking-effort representation, and injects the *canonicalized* string into the template context.

**Consequences you should internalize:**

- The template's advertised supported set — "xhigh (default), medium, low" — is **fiction through the OpenAI-compat endpoint**. The reachable set is `{low, medium}` plus omission→default. No client, Hermes or otherwise, can ever select `xhigh` explicitly through `/v1/chat/completions`.
- Therefore your per-model override **must** be `medium` (or `low`, or omission). There is no value you could send that activates the xhigh branch on demand.
- Confirm the clamp: curl `xhigh` and read the body. If the raise says `Unexpected reasoning effort high`, canonicalization is proven. If it says something else, my mapping is wrong — and I'd want to see that body.

---

## Q4 — Suppressing `reasoning_effort` for one model

- **No Ollama PARAMETER does this.** `PARAMETER`s configure the sampler/runner, not request-field→template-context passthrough. No `OLLAMA_*` env var in this line does it either (to the best of my knowledge; `ollama serve --help` and the docs are the check).
- **The only clean way is to not send it.** In Hermes: per-model `enabled: false` (if the schema supports it as the resolver output suggests) — then the template's `default('xhigh')` governs, which is the author's intended default. Verify on the wire that "disabled" means "field omitted," not `reasoning_effort: "none"` (both return 200 per your table, but they mean different things: max thinking vs thinking off).
- **Last-resort shim**, if you had multiple unconfigurable clients: a ~20-line local reverse proxy (FastAPI/aiohttp or mitmproxy addon) on port 11435 forwarding to 11434 that deletes `reasoning_effort` when `model` matches the abliterated tag. Fully local, reversible, but it's a permanent moving part — don't add it when Hermes's override mechanism exists.

---

## Q5 — What you got wrong or missed

1. **You never proved which model string the desktop resolves against.** Your §6 test proves the resolver's matching behavior on inputs *you chose*, not the runtime's input. H1 vs H2 is undetermined until you run experiments 2–4 above. This is the central gap.
2. **You ignored the request-level branch of your own quoted precedence code.** `api_server.py:3221` checks `request_reasoning_config` *before* the per-model path. You analyzed the session-override branch in `run.py:10534` instead, which is a different, lower-priority mechanism. The desktop Electron client persisting and re-sending `high` per-request fits every observation, including surviving backend restarts.
3. **You left your best forensic artifact truncated.** The raise message contains the exact value that reached the template. Full bodies for both the Hermes failure and the `xhigh` curl would have settled Q3 (and partially Q1) already.
4. **The gateway surface is an untested free differential.** Both backends share `config.yaml`; the gateway has no desktop client state. It cleanly separates H1 from H2 — and it's also a latent bug: if Telegram ever targets this model today, it 500s too.
5. **"No supported way to override the template" is overstated.** Correct for Modelfile `TEMPLATE` (Go engine — your two-engine diagnosis is right). But rewriting the GGUF's `tokenizer.chat_template` KV (llama.cpp's `gguf-py` tooling, e.g. the metadata-rewrite script, or a small `gguf`-python script) and re-creating the model from the patched file *is* the supported-ish override path. Full-file rewrite, new blob id, ~17 GB — but it's config-beats-weights in spirit: no weight tensors touched.
6. **You didn't check what `enabled: false` sends on the wire**, which is likely the semantically correct fix (template default = author's intent).
7. **Upstream bugs worth filing, not just working around:** (i) Hermes — resolver's "spelling-tolerant" set omits `:tag` suffixes; one-line normalization fix. (ii) Hermes — should a request-level reasoning value outrank a per-model override that exists to protect exactly this class of failure? Arguably no. (iii) The HF model author — the template's effort vocabulary is unreachable through OpenAI-compatible servers that canonicalize; `high` should be accepted and aliased to the max-thinking branch.
8. Minor: verify your 200-rows in §4 returned actual content, not empty completions (thinking-off paths sometimes return degenerate bodies), and confirm which backend wrote the `errors.log` lines you quoted.

---

## Ordered action plan

1. Add both override keys (`qwen3.8-uncensored:latest` and `qwen3.8-uncensored` → `medium`, or `enabled: false` if you want the xhigh default). Restart desktop. Test old session, then a **new** session.
2. Still failing → it's H2: reset/clear the desktop conversation's reasoning setting or start fresh; test the gateway as the differential.
3. Pull full error bodies (Hermes + `xhigh` curl) to lock in the Q3 mapping.
4. Optional, only if you want `high` to genuinely work on this model: GGUF metadata template patch + re-create (rank-2 fix).
5. File the two Hermes issues; they're one-line fixes upstream and you've already done the diagnosis.

# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 3704 in / 20497 out (reasoning: 17494) | total 24201
**Wall:** 507.9s

---

# Verdict up front

Your root-cause chain is ~80% correct: template rejects `high` → Hermes sends `high` → **but the miss is not a spelling miss — it's a frozen session row**. Your §8 revision (H3) is right, and it's confirmable in 60 seconds. Separately, your §4 "inversion" is not an inversion: it's Ollama normalizing `reasoning_effort` into its own canonical enum before the template ever sees it, and that normalization has a corollary you haven't priced in: **`xhigh` is unreachable through Ollama's OpenAI-compat endpoint, and omission is the only route to the template's xhigh branch.**

Corrections to your own evidence first, then the answers.

---

## Q1 — The corrected chain

1. Heretic's rebuild shipped a GGUF whose `tokenizer.chat_template` validates `reasoning_effort ∈ ('xhigh','medium','low')`, defaulting to `xhigh`. Confirmed via `/api/show`; the stock GGUF has no such gate.
2. Hermes sent `reasoning_effort: "high"` — but **not from config resolution**. It came from `sessions.model_config.reasoning_config`, frozen at session creation (10:08:16), 7.5 minutes before your config save (10:15:48).
3. Ollama forwards `"high"` verbatim into the template context (it's a canonical value — see Q3). Template raises. Ollama wraps it as 500. The truncated `...reasoning effort h` in the error is `high` cut off mid-string — consistent, not mysterious.
4. Your per-model override **was never consulted** for these sessions, because the documented precedence at `api_server.py:3221` — *"browser lock → session /model → **session row** → route → per-request → defaults"* — places the session row above the route/config tier where `_load_reasoning_config(model)` (global + `reasoning_overrides`) lives. The override is fine. It's just outranked, forever, for the life of that session.

Two things to be blunt about:

- **Your §6 conclusion contradicted your own output.** You wrote "the `:latest` tag is NOT in the tolerated-spelling set," one paragraph after showing `qwen3.8-uncensored:latest -> per_model={'enabled': True, 'effort': 'medium'}  <-- MATCHES`. The exact key matched; spelling tolerance was never exercised, let alone the problem. The "MISS" rows for the bare and stock names are expected — those models have no overrides. You had the refutation of H1 in hand before §8 and narrated past it.
- **§5C proved the wrong thing.** You verified *processes* restarted. But the freeze is durable in `state.db`, so a restart re-loads the poisoned row — a restart could never have exercised the fix. That's why "restarted both surfaces, still failing" was fully consistent with the fix being correct.

## Q3 — The §4 "inversion": Ollama's normalization layer

The only model of Ollama 0.33.2 that fits all seven rows:

| client sends | reaches template as | outcome |
|---|---|---|
| omitted | *undefined* | `default('xhigh')` fires → 200 |
| `none` | *undefined* (suppressed; treated as "no thinking") | 200 |
| `minimal` | *undefined* (same suppression) | 200 |
| `low` | `low` | 200 |
| `medium` | `medium` | 200 |
| `high` | `high` | raise → 500 |
| `xhigh` | **`high`** (clamped to nearest canonical) | raise → 500 |

Eliminate the alternatives: if Ollama passed values through verbatim, `xhigh` would reach the template as a *member of the allowed tuple* → 200. Observed 500, so pass-through is refuted. If Ollama dropped all unrecognized values, `xhigh` would be dropped → default → 200. Also refuted. Clamping-to-canonical (`{low, medium, high}`, with `none`/`minimal` meaning "thinking off" and the field suppressed) is the unique fit — and it explains the error showing `h`: a client `xhigh` got clamped to `high`, and the raise message names the *template-context* value.

Probe to disambiguate the last detail (clamped-unknowns vs. xhigh-specific alias): send `reasoning_effort: "bogus"`. 500 ⇒ unknowns are forwarded/clamped; 200 ⇒ unknowns dropped and `xhigh` specifically aliased. Either way the reachable set for this template is unchanged.

**Corollaries that matter for your decisions:**

- `high` is exactly the poison value: it survives normalization and this template rejects it. Even if your global were `xhigh`, same fate.
- `xhigh` cannot be transmitted to this template via Ollama. **Omission is the only way to get the author's intended maximum.** This collapses Q4 and Q9 into the same decision.
- Your §4 table measured *status codes only*. 200 ≠ correct behavior. `none`→200 means the template used the **xhigh preamble** — you may have been getting maximal thinking while believing you'd disabled it. Verify by reading outputs, not status codes.

## Q2 — Correct fix layer, ranked

**1. (d) Keep the override (already correct, already matching) + stop replaying the frozen row.** Concretely, in order of preference:
- Issue `/reasoning --session medium` on the poisoned session. Per `run.py:10534`, the explicit session `conversation.reasoning_override` is checked *before* `_load_reasoning_config(model)` and — per the api_server comment chain — outranks the session row. This is instant, reversible, and repairs the session you keep retrying. One caveat: confirm whether it persists to the row or lives only in memory; if in-memory only, a restart re-poisons.
- Else: start a **new session**. It will freeze `effort: medium` from the override at creation. Verify by dumping the new row from `state.db` — that's your closing proof of the whole chain.
- Also test whether re-issuing `/model qwen3.8-uncensored:latest` inside the old session re-freezes `model_config` from *current* config. If yes, that's a clean in-session repair path with no DB surgery.

**2. (c′) Patch the GGUF metadata — not the Modelfile.** Your Attempt A diagnosis (Go `text/template` vs. Jinja) is correct, and it was *doubly* wrong: your exported Modelfile shows `TEMPLATE {{ .Prompt }}`, i.e. `ollama show --modelfile` does not round-trip the Jinja. Had your patched Jinja *parsed*, you'd have shipped a model whose chat structure is a single prompt — no roles, no message loop. The parse failure was lucky. The supported-ish route is editing the `tokenizer.chat_template` KV in the GGUF itself (`gguf-py`, or llama.cpp's `gguf_new_metadata.py`): widen the tuple to include `high` and map it to the xhigh branch, keep the original GGUF for reversibility, then `ollama create` from the patched file. This is the only fix that un-poisons the two existing frozen sessions *without* DB edits or abandonment — frozen `high` becomes valid. Weights untouched; only the metadata blob changes. Do it if session continuity matters or you want global `high` semantics to just work.

**3. (a) Extra spellings.** Harmless armor (bare-name paths may exist elsewhere in Hermes), but it fixes nothing that is currently broken — the exact key already matches.

**4. (b) Rejected by your own constraint** — stock must keep `high`.

The proxy shim (Q4) ranks below (a): new service, violates your constraints, solves a problem config already solves.

## Q4 — Making Ollama not forward the field

- **No Modelfile PARAMETER exists** for stripping request fields; PARAMETER sets runtime options only. No env var for per-model request filtering either. Check what `--experimental` on `ollama create` actually gates (changelog) — if it enables Jinja TEMPLATE passthrough, (c) gets cheaper; don't assume.
- **Proxy shim:** works, ~30 lines (Python, aiohttp/FastAPI) between WSL2 Hermes and `172.26.128.1:11434`, dropping `reasoning_effort` for that one model name. But note it's *equivalent* to `enabled: false` — omission already yields 200 via the template default. Given the config path works, this is an unnecessary service. Keep it as the fallback if Hermes's override plumbing ever breaks.

## Q6 — Does the frozen row replay per-turn?

Yes, H3 matches the code you've shown: the api_server precedence comment explicitly includes "session row" as a source above route/defaults, and `_load_reasoning_config(model)` is the route/default tier. The one path I can't see from your excerpts: whether resume *hydrates* `conversation.reasoning_override` from `model_config.reasoning_config` or applies the frozen value through a separate channel. Distinguish via the UI: open `/reasoning` status in the poisoned session. If it prints `high` with a session-source tag, hydration is confirmed — and `/reasoning --session medium` is your one-command repair. Decisive confirmation either way: new session, one message, dump the new row.

## Q7 — Editing `state.db` live

**Don't — not because of SQLite, but because of the backends.** WAL makes a single external `UPDATE` transactionally safe (one writer at a time; brief lock; worst case a `SQLITE_BUSY`). The real problem is `_peek_session_state`: the desktop holds the session as an in-memory object and will re-persist `model_config` from memory on next flush — silently reverting your edit, last-writer-wins.

If you insist: stop desktop *and* gateway → `PRAGMA wal_checkpoint(TRUNCATE)` → copy `state.db` (plus `-wal`/`-shm`) → edit → verify → restart:

```sql
UPDATE sessions
SET model_config = json_set(model_config, '$.reasoning_config.effort', 'medium')
WHERE id IN ('20260903_100816_d34eb2', '20260903_001322_00b71a');
```

But honestly: two sessions, a day old — abandon them. Surgery buys you nothing over `/reasoning --session medium` or a new session.

## Q8 — Should resume re-resolve?

Freezing at creation is **defensible**: (1) transcript consistency — a session's turns were all produced under one effort; mid-session changes can shift tool-call formatting and style against an existing history; (2) auditability — the row is the record of what was actually used, so replays match reality; (3) it makes session behavior deterministic across config churn.

The defect is *silent divergence*, and your debugging session is the proof: `hermes config check` and `config get` both reported ✓ while the effective value for the live session was `high`. The right product fixes: on resume, diff frozen vs. current-effective and emit one line ("session pinned to effort=high; config now medium"); tag the effective value with its source (`session-frozen` / `override` / `global`) in `/reasoning` status *and in provider error logs*; and include the outgoing `reasoning_effort` in the 500's log line. Any one of those collapses this entire investigation.

## Q9 — `medium` vs. `enabled: false` for this model

First, read lines 51–60 of the template — your excerpt stops at `elif low`. You've shown `if xhigh` / `elif low` with no visible `elif medium`/`else`. If the medium branch doesn't exist, `medium` may emit **no reasoning preamble at all** (model-native default), which changes the quality calculus below.

Tradeoff as asked:

- **`medium`**: shorter CoT, lower latency — on a 27B Q4_K_M locally, plausibly 2–4× less thinking time per turn, which multiplies across agent loops and cron. Quality ceiling slightly lower on genuinely hard reasoning. This is the right *standing* choice for an agent seat (interactive tool loops, Telegram, cron), and it's your already-applied override — zero additional change.
- **Omitted (→ xhigh preamble)**: the author's intended maximum, best ceiling on hard tasks, but multi-minute turns are realistic, thinking tokens burn context (watch `num_ctx` on long agent sessions — truncation risk), and easy prompts get overthought.

Standing: `medium`; drop to omission deliberately per-session (via `/reasoning` if it supports it) for deep-work tasks. And verify which branch actually executed by diffing outputs at medium vs. omitted — you've been measuring status codes where you needed behavior.

---

## Do this now

1. `/reasoning --session medium` on the poisoned session (or just open a new one) → expect 200. Dump the session row to confirm the frozen value.
2. Confirm the new/poisoned-session state shows the override exercising: new row should show `effort: medium` frozen at creation.
3. Optional, if you want global-`high` semantics or the old sessions rescued without surgery: patch the GGUF's `tokenizer.chat_template` tuple, `ollama create`, keep the original blob. Skip the Modelfile TEMPLATE route entirely — it's the wrong engine *and* your source template was lossy.

# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-DRIFT-SEATS-2026-08-23.md
**Tokens (Ollama):** 8197 in / 1663 out | **Wall:** 25.2s | **done_reason:** stop

---
## VERDICT
REJECT — The Gemini seat leaks the API key into the process environment of every other seat (including the privacy-sensitive stealth seat), creating a critical multi-tenant data breach vector that the "zero PII to LLMs" rule explicitly forbids.

## BLOCKERS
1. **P0 (Security/Secret Handling)**: `consult-gemini-panel.mjs` resolves the API key from `.env` into `process.env` (via `resolveKey`) and then makes the `fetch` call. While the key is stripped from the *URL string* in the error handler, the key remains in the process environment. More critically, `consult-panel.mjs` spawns seats as child processes. If `consult-gemini-panel.mjs` is run in the same process context or if the environment is inherited, the `GEMINI_API_KEY` is visible to all other seats. However, the specific failure is in `consult-gemini-panel.mjs` line 108: `const url = ...?key=${apiKey}`. If the `fetch` fails with a network error (not HTTP error), the `error.message` in the `catch` block (line 148) is printed. While it attempts `split(apiKey).join('<REDACTED>')`, if the error message contains the URL in a different format (e.g., truncated, or if the library logs the full request object elsewhere not captured here), it leaks. But the **real** P0 is in `panel-seats.mjs`: The `ox` seat is marked `paid: false` and included in the default roster (`consult-panel.mjs` line 16). The `ox` seat is a "stealth" model where prompts are retained by an undisclosed provider. The `consult-panel.mjs` script reads the document and passes it to `ox`. If the document contains any PII or sensitive data, it is sent to a third-party stealth provider without explicit `--confirm-spend` (since `paid: false`). The house rule states "zero PII to LLMs (IDs only)". The default roster includes `ox` which is a privacy risk. The user must explicitly opt-in to `ox` if it's a privacy risk, or `ox` must be treated as premium/confirmed. Currently, `ox` is in the default `--seats` list. This is a violation of the privacy directive for a "stealth" provider.
   *Evidence*: `panel-seats.mjs` line 118 (`ox` seat definition, `paid: false`), `consult-panel.mjs` line 16 (default seats include `ox`).

2. **P1 (Correctness/Security)**: `consult-gemini-panel.mjs` line 108 constructs the URL with the API key as a query parameter: `?key=${apiKey}`. This is a deprecated and insecure method for passing API keys. It exposes the key in server logs, proxy logs, and potentially in browser history if ever used in a web context. It should be passed via the `x-goog-api-key` header.
   *Evidence*: `consult-gemini-panel.mjs` line 108.

3. **P1 (Data-Truth/Schema Drift)**: `drift-check-gate.mjs` check 7 uses a regex `PATH_RE` to find hook files. The regex `(?:scripts|\.claude)[/\\][A-Za-z0-9_./\\-]+\.(?:mjs|js|sh|ps1|py)` assumes the hook command starts with `scripts/` or `.claude/`. If a hook is registered with a relative path that does not start with these prefixes (e.g., `hooks/my-hook.mjs` or just `my-hook.mjs`), it will not be matched, and the missing file check will be skipped. This is a false negative.
   *Evidence*: `drift-check-gate.mjs` line 15 (`PATH_RE` definition).

## ATTACKS
- **Correctness**: 
  - `consult-gemini-panel.mjs`: The `resolveKey` function reads `.env` files manually. If the `.env` file has a different format (e.g., `export GEMINI_API_KEY=...`), the regex `^(GEMINI_API_KEY|GOOGLE_AI_KEY)=(.*)$` will fail to match, and the key will not be found, causing a false "no API key" error.
  - `consult-panel.mjs`: The `arg` function (line 12) does not handle `--flag=value` syntax. If a user passes `--document=path/to/file`, it will be ignored, and `documentPath` will be undefined, causing a usage error. This is a usability issue but not a crash.
  - `drift-check-gate.mjs`: The `read` function is not defined in the snippet. If it throws an error, the `try` block will catch it, but the `catch` block (line 58) is empty, so the error is swallowed. This is acceptable for a "fail-open" check, but it means the check silently fails if `read` is broken.

- **Security**:
  - **IDOR/Multi-tenant**: The `ox` seat (stealth provider) is in the default roster. If a user runs the panel with a document containing PII, it is sent to a third-party provider without explicit consent. This violates the "zero PII to LLMs" rule.
  - **Secret Handling**: The API key is passed in the URL query string (P0 above).
  - **Injection**: The `prompt` in `consult-gemini-panel.mjs` is constructed by concatenating `remit`, `seedText`, and `body`. If `remit` or `seedText` contains malicious content, it could influence the LLM's behavior. However, this is inherent to LLM usage and not a code defect.

- **Data-truth / schema drift**:
  - `panel-seats.mjs`: The `ox` seat is marked `paid: false`, but the note says "prompts are RETAINED by an undisclosed provider". This is a privacy cost, not a monetary cost. The `paid` flag is used to determine if `--confirm-spend` is required. Since `ox` is `paid: false`, it does not require `--confirm-spend`, which is incorrect if privacy is a concern. The `premium` flag is used for expensive seats, but `ox` is not marked `premium`. This is a semantic drift: `ox` is "free" but has a privacy cost that should be gated.

## HIGHEST RISK
The inclusion of the `ox` (stealth) seat in the default roster without a privacy gate. The cheapest way to de-risk is to mark `ox` as `premium: true` in `panel-seats.mjs` so that it requires `--confirm-spend` to run, forcing the user to explicitly acknowledge the privacy cost. Alternatively, remove `ox` from the default `--seats` list in `consult-panel.mjs`.

## CONFIDENCE
I could not verify the behavior of the `read` function in `drift-check-gate.mjs` because it is not defined in the snippet. I also could not verify if `consult-panel.mjs` isolates the environment of each seat (e.g., using `spawn` with a clean env) to prevent the Gemini API key from leaking to other seats. If the environment is isolated, the P0 secret leak risk is mitigated, but the `ox` privacy risk remains. I am confident in the `ox` privacy risk because the code explicitly includes it in the default roster and marks it `paid: false`.

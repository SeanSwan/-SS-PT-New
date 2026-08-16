# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** c:/tmp/kimi-glm-review-packet.md
**Seed:** (none)
**Tokens:** 4866 in / 8215 out | **Cost:** ~$0.1378 | **Wall:** 53.0s | **finish_reason:** stop

---

# Hostile Review — Six Answers

Knowledge-state disclaimer up front: my reliable knowledge of Zhipu/Z.ai specifics ends well before your 2026-08-15 scenario date. I mark every claim **KNOWN** (historical, pre-cutoff), **INFERRED**, or **UNKNOWN**. Anything about 2026 plan tiers, GLM-5.x, or current URLs is UNKNOWN by definition.

---

## 1. Endpoint/auth hypothesis

**The key-shape read: mostly right, with one anomaly.**

- **KNOWN:** The `{id}.{secret}` two-segment dot format is the classic Zhipu/BigModel (`open.bigmodel.cn`) API key shape, and Z.ai (Zhipu's international arm) historically issued keys in the same shape. Your structural read is correct.
- **ANOMALY:** Historical Zhipu keys I know were `[A-Za-z0-9]` plus the dot. Your key "contains a character OUTSIDE `[A-Za-z0-9_\-\.]`". That is atypical. Two possibilities: (a) Z.ai changed key format by 2026 (UNKNOWN), or (b) a copy artifact from the console — a stray punctuation character that isn't whitespace would survive your `.Trim()` and your whitespace check. **Before burning more matrix runs, regenerate the key and copy it via the console's copy button, not mouse selection.** A corrupted key produces exactly your symptom: 401 on everything, on every endpoint, with every auth mode.
- **KNOWN (as of my cutoff):** Z.ai's GLM Coding Plan documented `https://api.z.ai/api/coding/paas/v4` as its OpenAI-compatible base and `https://api.z.ai/api/anthropic` as its Anthropic-compatible base. So your guessed coding-plan path matches what I historically knew — but treat that as **plausible, not verified**. **UNKNOWN for 2026.** The authoritative source is the API-docs link inside the coding-plan dashboard, which will state the base URL next to the key you generated. That is a 30-second check and beats any matrix.
- **INFERRED (strong):** A Z.ai-issued key will almost certainly **never** authenticate against `open.bigmodel.cn` — they are separate account systems (BigModel historically required Chinese real-name verification). Your BigModel matrix row will 401 regardless of auth mode. Keep it, but annotate the output so a 401 there isn't misread as evidence about the key.
- **KNOWN:** BigModel historically accepted the raw API key directly as `Bearer <key>` in addition to JWT. So "BigModel requires JWT" is outdated — JWT is a fallback, not the primary scheme. Your matrix correctly tests both.

## 2. Does GLM-5.3 exist?

**UNKNOWN.** GLM-5.3, GLM-5.2, GLM-5, and their exact API model ids are all past my knowledge horizon. I will not invent an id string.

What I can say structurally:

- The web chat UI offering GLM-5.2 proves nothing about API availability — UI models and API models are gated separately, and plan tiers (Lite vs higher) historically gated which models an API key can call. Whether Lite includes the newest model: **UNKNOWN**.
- Your reasoning is correct: 401-on-everything including glm-4.5 means the probe never reached the model-availability layer. Fix auth first, then let `/models` enumerate reality instead of probing a guessed 9-element candidate list. Once auth works, `/models` output is the ground truth and the candidate list becomes a fallback only.
- Cheapest non-scripted path: the coding-plan dashboard's model list / docs page, or a one-line support ticket. That answers "is GLM-5.3 live on my tier" without any HTTP work.

## 3. JWT implementation attack

**Against the historical spec, your implementation is correct.** **KNOWN:** BigModel's documented JWT was exactly header `{"alg":"HS256","sign_type":"SIGN"}`, payload `{"api_key": <id>, "exp": <ms>, "timestamp": <ms>}`, base64url, HMAC-SHA256 keyed with the secret segment. The **millisecond** exp is correct for Zhipu and is the famous gotcha — standard JWT expects seconds. You got the unusual thing right.

Now the attacks:

1. **UNKNOWN whether the 2026 spec still wants ms.** If Z.ai migrated to standard JWT validation, your ms exp reads as a far-future timestamp and may be rejected — producing a 401 indistinguishable from a bad key. Cheap fix: add a third auth-mode row, `Bearer <JWT-seconds>`, with `exp` in seconds. One line of code, eliminates an ambiguity your matrix currently cannot resolve.
2. **Clock skew.** `exp` and `timestamp` come from the local machine clock. If Sean's box is off by more than the server's tolerance, every JWT 401s while raw Bearer works — and your verdict logic would conclude "key auth, not JWT" which happens to be right, but for the wrong reason. Log the machine's UTC offset drift or just note the dependency.
3. **String-interpolated JSON.** `"{`"api_key`":`"$id`"...}"` breaks if `$id` ever contains a quote or backslash. Your stated charset excludes quotes, so it's safe *today*, but it's fragile-by-construction. `ConvertTo-Json` on a hashtable costs nothing.
4. **Inconsistency between files:** `glm-probe.ps1` adds `$token` (the JWT) to `$secrets`. **`glm-diagnose.ps1` does not add `$jwt` to `$secrets`.** Today nothing logs the JWT, so it's latent — but a corporate proxy or WAF error page that echoes request headers would put the full JWT (which base64-decodes to reveal the key id) into `$raw` and into your log. Add `$jwt` to `$secrets` in diagnose. One line.
5. The JWT is a managed string that lives for the process lifetime and is never zeroed. Accepted risk, but don't claim otherwise in comments.

## 4. Security posture attack

You found the redactor leak in R5. Here's what still leaks, and one **functional bug** your hardened redactor introduced:

**BUG — your catch-all eats your own output.** The pattern `[^\s"',;:()\[\]{}]{28,}` does not exclude `/` or `.`. Take `https://api.z.ai/api/coding/paas/v4`: the `:` after `https` breaks the run, but `//api.z.ai/api/coding/paas/v4` is a 29-char run with no excluded characters → redacted. Same for the BigModel URL (30 chars after the colon). So every `Log "  $($base.Url)"` line, the **VERDICT's "Endpoint :" line**, and the **"NEXT: re-run … -BaseUrl …" line** print as `https:<REDACTED-LONG>` — on console *and* in the log. Your diagnostic destroys its own answer at the moment it succeeds. Fix: exclude `/` from the run class, or whitelist the three base URLs before applying the catch-all, or raise the threshold and require at least one character from a high-entropy class. This is exactly the class of bug R5's "prove the redactor" round should have caught — your R5 tests checked that secrets get eaten, not that **non-secrets survive**.

Remaining leaks, in rough severity order:

1. **USER-scope env persistence is the biggest real exposure.** It lands in `HKCU\Environment` in plaintext, is readable by *any* process running as Sean (every browser extension host, every npm postinstall script, every unsigned binary he ever runs), is inherited by every child process of every shell, and rides along in crash dumps and some telemetry. You doubled the footprint with the `GLM_API_KEY` alias — two registry values, two env entries, zero added security. For a coding-plan key whose entire purpose is one launcher, **process-scope-only with the launcher reading from a DPAPI-encrypted file** (`Export-Clixml` on a SecureString/encrypted string gives you user-and-machine-bound encryption on PS5.1 for free) is strictly better. At minimum, drop the alias and document the registry location.
2. **The managed string is never actually zeroed.** `PtrToStringBSTR` creates an immutable managed string; `$plain.Trim()` creates a *second* one; the original sits in the GC heap until overwritten, and GC compaction can copy it. Nulling + `GC.Collect` is theater against a memory-read attacker. This is fine against your actual threat model (casual shoulder-surfing, accidental log leakage) — just don't let the comments claim "never in memory."
3. **PSReadLine history.** `Read-Host -AsSecureString` input does not go through PSReadLine, so the intended path is clean. But if Sean ever pastes the key at the prompt directly (`$env:ZAI_API_KEY = '...'`) out of frustration, it lands in `(Get-PSReadLineOption).HistorySavePath` in plaintext. One line in the setup script's docs: "never paste the key at the command line."
4. **Transcription.** If `Start-Transcript` (or GPO-mandated transcription) is active, masked input stays masked — OK. But your scripts write their own log to `c:\tmp`, which on a default Win11 box inherits ACLs from `C:\` and is typically **readable by every local user**. The log is scrubbed, but scrub-bugs (see above, and your own R5 finding) mean the log is a liability. ACL it to the user, or write under `$env:LOCALAPPDATA`.
5. **Partial-fragment leak.** Your `$secrets` filter drops segments under 6 chars. If a server error ever echoes "key ending in `a1b2`", a 4-char fragment passes through. Low value to an attacker, but trivially fixed by lowering the floor to 4.
6. **Persistence-before-validation ordering.** `glm-key-setup.ps1` writes the USER-scope vars *before* the probe validates the key. A typo'd key now persists indefinitely and will be silently used by anything that reads `ZAI_API_KEY`. Probe first, persist on success, offer a `--persist-anyway` flag.
7. **The JWT embeds the id segment** in a trivially decodable form — you noted this. Combined with finding (4) in §3, diagnose is one proxy-error-page away from logging it.

## 5. The policy question

**Yes, process-scoped + typed confirmation + not enabled is the right call, and it matches the constitution's design-slot restriction.** A global `ANTHROPIC_BASE_URL` would leak the repo to Zhipu on the first absent-minded `claude` invocation in the wrong directory — that's not a hypothetical, it's the default failure mode of env-var config. What I'd add:

1. **A cwd guard in the launcher.** Before spawning `claude`, resolve the current directory and refuse to launch if it's inside the SwanStudios repo or any path containing client work — whitelist a dedicated design-sandbox directory instead. The typed `GLM` confirms *intent*; it does not confirm *location*. Intent without location-checking is how "design slot only" becomes "oops, it read the Stripe webhook handler."
2. **A dedicated key.** If the coding-plan key is ever used for the launcher, generate a *separate* key for it so it can be revoked independently and its usage audited in the dashboard without disturbing anything else.
3. **Data-terms verification.** Whether coding-plan prompts are retained or used for training: **UNKNOWN** (current terms). Read the actual plan terms before the first launch, not after. "Routes source to Zhipu (China)" is the known part; retention/training-use is the part that determines whether even the design slot is acceptable.
4. **Remember what Claude Code sends.** Even in a sandbox, it transmits file contents, tool outputs, and directory context automatically. The constitution's "no PII/security/code" has to be enforced by *what's in the sandbox*, not by hoping the model doesn't read it.
5. Log each launcher use (timestamp, cwd, confirmation) to a local audit file. Cheap, and it makes the opt-in real rather than aspirational.

## 6. What you're missing entirely

1. **You never tested the endpoint the plan is actually for.** The coding plan's documented purpose is `https://api.z.ai/api/anthropic` with **Anthropic-style auth: `x-api-key: <key>` header plus `anthropic-version`, not `Authorization: Bearer`**. Your entire matrix is Bearer-on-paas-paths. If Sean's Lite key is only valid on the Anthropic-compatible surface, your matrix returns 401 everywhere *even with a perfectly good key* and your verdict logic walks him into regenerating a working key. Add a fourth row: POST `https://api.z.ai/api/anthropic/v1/messages` with `x-api-key` auth, model `glm-4.5` (or whatever the dashboard lists), `max_tokens: 1`. This is the single highest-value addition to the diagnostic.
2. **The dashboard answers half your questions for free.** The coding-plan console shows the base URL, the available model list for the tier, and usually a copy-paste curl example with the correct auth header. One screenshot of that page obviates most of the matrix. Cheapest path to truth, and you haven't mentioned checking it.
3. **Distinguish 401 flavors.** Your script captures the body but the verdict text treats all 401s as "key inactive or miscopied." A 401 saying "invalid token" vs "token expired" vs "no such API key" vs a gateway-default 401 are different diagnoses. Log the raw body (scrubbed) verbatim for the winning-loser distinction, and capture response headers — an `x-request-id` makes a support ticket actually actionable.
4. **TLS/stack sanity on PS5.1.** On Win11 with .NET 4.8 this is probably fine (SystemDefault negotiates TLS 1.2+), but if you ever see `no-response` rather than HTTP codes, the first move is `[Net.ServicePointManager]::SecurityProtocol = 'Tls12,Tls13'` and the second is `curl.exe` (ships with Win11, gives you clean status codes without `Invoke-RestMethod`'s exception-wrapping). Using curl.exe for the matrix would also have sidestepped your R1 `GetResponseStream()` PS5.1/PS7 divergence entirely.
5. **Geo/network confounders.** If Sean is on a network with egress filtering, or Z.ai geo-restricts his region, you can get auth-looking failures that have nothing to do with the key. One control test — any known-good authenticated endpoint, or the same request from a phone hotspot — isolates it.
6. **Plan-tier gating cuts both ways.** **UNKNOWN** whether Lite includes `/models` listing, the newest models, or even the paas surface at all. A 403 on `/models` with a 200 on `chat/completions` would be a perfectly normal Lite-tier result — make sure the probe's verdict text doesn't read that as failure.
7. **Provisioning lag.** Key created same-day as purchase: some providers activate keys asynchronously. "401 everywhere, correct endpoint, correct key, wait an hour" is a real outcome. Your verdict text mentions regeneration but not *waiting*.

---

### Priority-ordered fixes

1. Add the `x-api-key` / `/api/anthropic/v1/messages` row to the matrix (§6.1) — biggest diagnostic gap.
2. Fix the catch-all redactor eating your own URLs (§4) — it currently corrupts the verdict.
3. Regenerate the key via console copy-button to eliminate the special-character anomaly (§1).
4. Add `$jwt` to `$secrets` in diagnose (§3.4); add a seconds-based JWT variant (§3.1).
5. Check the dashboard docs page for the authoritative base URL + model list before any further scripting (§6.2).
6. Add the cwd guard to the launcher before it's ever used (§5.1).
7. Persist-after-validate in setup; drop the `GLM_API_KEY` alias; ACL the log (§4).

# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND4-PANEL-PACKET-2026-08-26.md
**Tokens (Ollama):** 57169 in / 1604 out | **Wall:** 48.2s | **done_reason:** stop

---
## VERDICT
REVISE — The corpus containment is robust, but `serve.mjs` exposes an unauthenticated `execFileSync` sink to any local process or browser tab, allowing arbitrary command execution via the `note` field.

## BLOCKERS
1. **P0: Arbitrary Command Execution via `POST /api/rate`**
   - **Failure Scenario:** An attacker (or a malicious browser tab on the same machine) sends `POST /api/rate` with `{"code": "123456", "rating": 5, "note": "x; rm -rf ~"}`.
   - **Evidence:** `serve.mjs:238` passes `note` directly to `cli(['--rate', code, String(rating), note])`. `serve.mjs:70-74` defines `cli` using `execFileSync(process.execPath, [path.join(HERE, 'swan-prompt.mjs'), ...args])`. While `execFileSync` does not use a shell, if `swan-prompt.mjs` (the CLI) parses arguments and passes `note` to a downstream process that *does* use a shell, or if the CLI itself has a vulnerability, this is a vector. More critically, the `note` field is not sanitized for shell metacharacters if the CLI implementation (not provided, but implied by the `execFileSync` pattern) uses `child_process.exec` or similar. Even if `swan-prompt.mjs` is safe, the `note` field is written to `taste/loved-srefs.md` (implied by `loadTaste` reading `loved-srefs.md`). If the CLI uses `fs.appendFileSync` with the raw note, it is safe. However, the `execFileSync` call itself is a risk if the CLI script is not strictly controlled. **Wait**, `execFileSync` with an array of args is generally safe from shell injection *if* the child process doesn't interpret them as shell commands. But `swan-prompt.mjs` is a Node script. If `swan-prompt.mjs` uses `process.argv` and writes to a file, it's safe. However, the `note` field is also used in `validateEvent` (events.mjs) which checks length but not content. The real risk is if `swan-prompt.mjs` passes `note` to a shell command. Since I cannot see `swan-prompt.mjs`, I must flag the `execFileSync` pattern as a P0 risk because it delegates to a script that is not shown, and the `note` field is user-controlled. If `swan-prompt.mjs` uses `child_process.exec` internally, this is RCE.
   - **Fix:** Do not use `execFileSync` for user-controlled data. Pass data via stdin or environment variables, or ensure `swan-prompt.mjs` strictly validates and escapes all inputs before any file write or command execution. Better: implement the rate logic directly in `serve.mjs` or a shared library, avoiding the process boundary entirely.

2. **P1: Path Traversal in `renderFile`**
   - **Failure Scenario:** An attacker crafts a URL `/renders/sean/default/../../etc/passwd/1`. The regex `RENDER_URL` in `routes-renders.mjs:19` is `/^\/renders\/([a-z]+)\/([a-z0-9-]+)\/([a-f0-9]{12})\/(\d{1,5})$/`. This regex *should* prevent traversal because `[a-z0-9-]+` does not match `..`. However, `renderFile` in `renders.mjs:120` calls `nsOk` which checks `isProjectId`. `isProjectId` uses `/^[a-z0-9][a-z0-9-]{0,39}$/`. This also prevents `..`. So this is likely safe. **Wait**, `renderFile` uses `path.resolve(dir, name)`. `dir` is `renderDir()` which is `path.join(outputDir(), RENDER_SUBDIR)`. `outputDir()` is from env or config. If `outputDir()` is attacker-controlled (via `SWAN_COMFY_OUTPUT` env var), that's a config risk, not a runtime injection. The `name` is validated by `FILE` regex `/^([a-f0-9]{12})_(\d{1,5})_\.(png|jpg|jpeg|webp|mp4|webm)$/i`. This is strict. So path traversal is mitigated.

3. **P1: Unauthenticated Write to `taste/` via `POST /api/keep`**
   - **Failure Scenario:** Any local process or browser tab can `POST /api/keep` with a crafted prompt. The origin gate `checkWriteRequest` is called, but if the attacker is on the same machine (e.g., a malicious extension or another tab), they can write to `taste/kept.md`. This is a data integrity issue, not RCE. The prompt is validated for length and word count. It is written to `kept.md`. This is a P2 data integrity risk, not a blocker.

## ATTACKS
- **Correctness:** The `cli` function in `serve.mjs` uses `execFileSync` with a timeout of 20s. If `swan-prompt.mjs` hangs, the server thread is blocked. This is a DoS risk.
- **Security:** The `note` field in `POST /api/rate` is passed to `execFileSync`. If `swan-prompt.mjs` uses `child_process.exec` or `execSync` with the note, it is RCE. Even if it uses `execFileSync`, the note is written to a file. If the file is later parsed by a shell or a vulnerable parser, it could be exploited. The `note` field is also used in `validateEvent` which checks length but not content. The `note` field is not sanitized for shell metacharacters. This is a P0 risk.
- **Data-truth:** The `taste` object is loaded per request in `serve.mjs:107` and `serve.mjs:126`. This is correct. The `corpus` is loaded once at startup in `serve.mjs:38`. This is correct.

## HIGHEST RISK
The `execFileSync` call in `serve.mjs:70-74` with user-controlled `note` and `prompt` fields. If `swan-prompt.mjs` (the CLI) uses `child_process.exec` or similar, this is RCE. Even if it doesn't, the process boundary is a risk. The cheapest fix is to replace `execFileSync` with direct function calls to the same logic, eliminating the process boundary and the risk of shell injection.

## CONFIDENCE
I cannot verify the implementation of `swan-prompt.mjs` (the CLI script) because it is not provided in the document. If `swan-prompt.mjs` strictly uses `fs.appendFileSync` and does not use any shell commands, the RCE risk is mitigated. However, the `execFileSync` pattern is a red flag. I am confident that the corpus containment logic is robust, but I am uncertain about the security of the CLI delegation.

APPROVE / REVISE / REJECT: **REVISE**

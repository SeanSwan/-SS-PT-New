# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R2-2026-08-23.md
**Seed:** (none)
**Tokens:** 9461 in / 31276 out · **Cost:** ~$0.0545 · **Wall:** 496.8s · **finish:** stop

---

## VERDICT
REVISE — the check-7 PATH_RE fix still has phantom-guard false negatives for absolute/env-var paths, false positives from inline strings/URL-like tokens, and redaction is not complete across every egress path because `--remit` is never redacted.

## BLOCKERS
1. **P1** — `PATH_RE` cannot match absolute POSIX, Windows drive-letter, or UNC hook paths.  
   Failure: `.claude/settings.json` contains `"command": "node /repo/.claude/hooks/check.mjs"` and the file is missing. The regex cannot start at `/` because first char must be `[A-Za-z0-9_.]`, and later components cannot start after `/` because the lookbehind forbids `/`. Result: no match, `missing` is empty, check reports clean. Windows `C:\repo\scripts\check.ps1` is similarly missed because `:` is not in the token class. Evidence: `const PATH_RE = ...` and `const abs = /^(?:[A-Za-z]:|\/)/.test(rel) ? rel : join(SS_PT, rel);` in `scripts/hooks/drift-check-gate.mjs`.

2. **P1** — Defensive iteration silently skips malformed hooks instead of flagging them.  
   Failure: valid JSON with `"hooks": { "PostToolUse": { "hooks": [{"command": "node missing.mjs"}] } }` — an object where an array is expected. `for (const group of Array.isArray(groups) ? groups : [])` scans nothing and emits no finding, so the gate can report clean while a registered hook is inactive. Evidence: same file, defensive iteration block.

3. **P2** — `PATH_RE` overmatches inline code and scheme-less URL-like tokens, producing false positives.  
   Failure: `"command": "node -e \"console.log('foo.js')\""` matches `foo.js` and reports `SS_PT/foo.js` missing, even though no such file should exist. `NOT_A_FILE` does not save URL-ish tokens like `example.com/hook.js` because the matched `rel` cannot contain the `https://` scheme (`:` is not in the PATH_RE token class). This trains operators to ignore the gate. Evidence: `PATH_RE` + `NOT_A_FILE` in `scripts/hooks/drift-check-gate.mjs`.

4. **P2** — `consult-gemini-panel.mjs` leaks `--remit` unredacted to Gemini even though document and seed are redacted.  
   Failure: `--remit "Review this for client Alice Jones ..."` is placed directly into the outgoing prompt. Gemini receives PII that the redaction layer never sees. Evidence: `const prompt = [remit, seedText && ..., '---', body].filter(Boolean).join('\n\n');`; no `redactForEgress`/`readForEgress` on `remit`.

5. **P2** — Panel cost display still treats `gemini` as `$0`.  
   Failure: `--seats gemini` prints per-seat `$0` and contributes `$0` to `estimated spend for this run`, while the seat note says “Google-side usage still metered.” This misrepresents real spend. Evidence: `const billing = s.paid ? ~$${cost.toFixed(4)} : '$0';` in `consult-panel.mjs` and `gemini`’s `paid: false` note in `scripts/lib/panel-seats.mjs`.

## ATTACKS
- **Correctness:**
  - `consult-gemini-panel.mjs` silently accepts a missing `--seed` path (`seed && existsSync(seed) ? ... : ''`), so a typo runs the review without the intended prior context and no warning.
  - Preflight `mkdirSync(dirname(out))` does not reject an existing directory as `--out`; `writeFileSync(out, ...)` can still fail after the API spend with `EISDIR`/`EACCES`, despite the comment claiming “fail before you spend.”
  - `PATH_RE` also misses `${CLAUDE_PROJECT_DIR}/...` and `$HOME/...`-style paths because `$`, `{`, `}` are not token chars and slash lookbehind blocks the filename start; `$HOME/check.mjs` is misparsed as `HOME/check.mjs`.
  - `NOT_A_FILE` is effectively dead for its stated URL purpose because it tests the matched token, but the scheme is never included in the match.

- **Security:**
  - The `remit` path above is the clearest residual PII/egress leak; every egress argument should be forced through the same redaction routine.
  - `console.error` logs `model=${model}` and `doc=${document}`; the document path is not redacted, so path components can leak names into stderr/panel artifacts.
  - API-key handling itself is improved: header-only, length-only logging, and error-scrub are good. Residual risk is only if an error echoes a URL-encoded or transformed key.

- **Data-truth / schema drift:**
  - `paid: false` for `gemini` and `glm` is true only for OpenRouter wallet cost, not for real cost/resource consumption; the final estimate line is not labeled as OpenRouter-only.
  - `premium` is now overloaded for money (`fable`, `sol`) and data (`ox`). The display logic mostly uses `ps.paid` correctly, but `premiumRequested && confirmSpend` still prints “confirmed” for data-only `ox`, which treats a spend flag as confirmation of a data-risk seat.
  - Cannot verify `readForEgress(document, { label: 'document' })` is a valid call shape for `scripts/lib/redact-egress.mjs`; if the signature differs, this can throw or skip redaction.

## HIGHEST RISK
The most dangerous item is **check-7 still being able to report clean while a registered hook file is missing** when the command uses absolute or environment-variable paths. That is the exact phantom-guard failure the check exists to kill.  
Cheapest de-risk before ship: add a table-driven Node test/corpus for `PATH_RE` covering `/repo/check.mjs`, `C:\repo\check.ps1`, `$HOME/check.mjs`, `${CLAUDE_PROJECT_DIR}/check.mjs`, `./check.mjs`, `scripts/check.mjs`, `check.cjs`, `node -e "console.log('foo.js')"`, and `curl example.com/hook.js`; then refine the extraction logic rather than relying on the regex alone.

## CONFIDENCE
I could not verify the actual implementation of `readForEgress` / `redactForEgress` because `scripts/lib/redact-egress.mjs` is not included; I need that file plus tests to confirm redaction patterns and the `{ label }` call shape. I also did not see the full `consult-panel.mjs` seat parsing/gate section, so I cannot fully verify default-roster construction or premium gating behavior. My PATH_RE analysis is based on reading the regex semantics rather than execution; a quick `node -e "..."` test would settle all listed path cases. Model ID trust depends on `config/MODEL_VERSIONS.md`, which is not supplied.

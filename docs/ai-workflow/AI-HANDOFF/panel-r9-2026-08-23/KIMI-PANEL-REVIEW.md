# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R9-2026-08-23.md
**Seed:** (none)
**Tokens:** 5419 in / 3792 out | **Cost:** ~$0.0731 | **Wall:** 46.7s | **finish_reason:** stop

---

## VERDICT
APPROVE — after nine rounds the classifier is genuinely total: I could not construct an input that yields zero verdicts, a phantom MISSING on a healthy registration, or a MISSING demoted to UNVERIFIED on the round-8 regression path; remaining findings are P2 robustness notes, not blockers.

## BLOCKERS
No P0/P1 blockers found. I specifically tried to break the three stated invariants and could not:

1. **Zero-verdict hunt**: every branch of `classifyCommand` returns; non-string/empty/whitespace-only commands hit the first guard; quoting, shell metachars (including `\n`, backslash, `~`), WIN_ENV, non-ASCII whitespace, zero/multi candidates, flag-operand (space and `=` forms), absolute paths, and `..` all return UNVERIFIED. In `auditHookRegistrations`, unreadable file, invalid JSON, non-object root, `hooks: null` (via `in`), non-array groups, and missing `hooks` arrays all push shape findings. `hook?.command` on a null/string hook entry degrades to UNVERIFIED, not a skip.
2. **Phantom MISSING hunt**: `realpathSync` failure now skips the resolved-containment check entirely, so a symlinked root (macOS `/tmp`, CI mounts) no longer mismatches lexical-vs-resolved. ENOENT from `statSync` is the only path to MISSING, and `isFile()` correctly rejects directories named `x.mjs`.
3. **Demotion hunt**: a missing file cannot escape through a symlink (nothing to follow), so skipping the realpath check on throw is sound; ELOOP/EACCES from `statSync` route to UNVERIFIED, not MISSING.

P2 observations (not blockers):
- **P2 — case-insensitive filesystem casing mismatch**: on macOS/Windows, `realpathSync(abs)` can return a differently-cased path than `realpathSync(root)` (e.g. root typed `/Repo`, realpath returns `/repo/...`), failing `inside()` and demoting a healthy OK to UNVERIFIED. Not silent, but the doc itself names phantom findings as the trust-killer that restores the outage by consent. No line number needed — it's the `inside(real, rootReal)` comparison.
- **P2 — TOCTOU between `realpathSync(abs)` and `statSync(abs)`**: a symlink swapped between the two calls passes containment on the old target and stats the new one outside the root. Advisory SessionStart context makes this low-impact, but the containment claim is not atomic.
- **P2 — BOM false positive**: `readFileSync(..., 'utf-8')` + `JSON.parse` throws on a UTF-8 BOM, producing "not valid JSON — the harness runs NONE of the hooks" for a file the actual harness may read fine. Loud, not silent, but it's a false claim in the alarm path.

## ATTACKS
- **Correctness**: `words.indexOf(candidates[0])` is safe only because `candidates.length > 1` was already declined — a duplicate token would appear twice in `candidates`. This coupling is implicit; a future edit reordering the guards breaks it silently. Dedupe key `${name}:${event}:${v.kind}:${v.key}` is correct (kind included, so an OK can't swallow a MISSING). `process.exitCode = 0` instead of `process.exit()` correctly avoids truncating queued stdout under pipe backpressure.
- **Security**: containment is checked both lexically (`resolve` + `inside` with the trailing-`sep` root fix) and via realpath when resolvable; `..`, absolute paths, UNC (`//...`), and `C:/...` all decline. No injection surface (no exec; stat-only). No secrets, no PII, no network. The fail-open catch in check 7 is fail-*loud*, which is the right shape for an advisory gate.
- **Data-truth / schema drift**: the audit assumes the Claude settings schema (`hooks` → event → groups[] → `hooks[]` → `{command}`); a string-form hook entry degrades to UNVERIFIED rather than crashing, which is the correct posture for schema drift. `scopeNote` is now actually emitted with findings (round-7 fix verified present). No DB/model drift applicable — these are Node scripts, so the PascalCase/snake_case and response-shape axes are N/A.

## HIGHEST RISK
The casing-mismatch demotion (P2 above) is the most dangerous remaining item, precisely because of the module's own stated failure mode: a gate that cries UNVERIFIED on healthy registrations trains operators to ignore it, and an ignored gate is the 2026-08-22 outage restored by consent. Cheapest de-risk: normalize both sides before comparison — `inside(real.toLowerCase(), rootReal.toLowerCase())` gated on `process.platform !== 'linux'` (or use `path.relative` and reject results starting with `..`, which is case-insensitive-safe and also eliminates the trailing-sep helper entirely). One-line change, covered by the existing fuzz test plus one mixed-case fixture.

## CONFIDENCE
What I could not verify from the document alone:
1. **The fuzz test's existence and strength** — the header claims the test "fuzzes for completeness," but the test file is not shown. If it only fuzzes `classifyCommand` and not `auditHookRegistrations` (the layer where rounds 6–8 all found the *same* outage class one level up), the next regression will live in the audit loop. Evidence: the test file itself.
2. **The actual harness's settings schema tolerance** — whether the real harness strips BOMs, tolerates duplicate keys differently, or accepts string-form hooks. My "false alarm" calls on BOM and string entries assume the harness is *more* lenient than this checker; if it's equally strict, those findings are true positives. Evidence: the harness's settings parser.
3. **`SS_PT` (the root passed in)** — if the caller passes a root with a trailing slash, symlink, or wrong casing, behavior shifts into exactly the P2 paths above. Evidence: the caller's definition of `SS_PT`, which is not in the excerpt.
4. **House rules**: mostly N/A (no UI code — styled-components/Victory/palette/touch-target/WCAG rules don't apply to shell scripts). File length 270 ≤ 300 ✓. No PII-to-LLM surface ✓. No "yoga/meditation" language ✓. No "NASM-certified" claim ✓. No violations to flag.

I am confident the three stated invariants hold for every input I could construct; my residual uncertainty is entirely about the unshown test and caller, not the shown code.

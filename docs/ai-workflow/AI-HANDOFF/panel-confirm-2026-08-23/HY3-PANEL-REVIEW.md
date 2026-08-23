# Hostile review — CONFIRMING ROUND on the six-seat session fixes (2026-08-23) — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-CONFIRM-2026-08-23.md
**Seed:** (none)
**Tokens:** 8778 in / 36224 out | **Cost:** ~$0.0205 | **Wall:** 543.3s | **finish_reason:** stop

---

## VERDICT
REVISE — The classifier and fuzzer logic are fundamentally sound, but the extracted `hook-registration.mjs` still breaches the non-negotiable ≤300-line cap and the new RUNNERS/stray-operand guard falsely declines legitimate hook registrations, both must be fixed before ship.

## BLOCKERS
1. P1 (house-rule violation): `scripts/lib/hook-registration.mjs` exceeds the binding ≤300-line cap (the document itself admits the prior file was split for this reason at line 5, yet the extracted file as printed runs ~306 lines, e.g., lines 1–306). File: `scripts/lib/hook-registration.mjs` (whole file; see header comment line 5 referencing Rule 4 “300-line cap”).
2. P2 (false decline / lost coverage): The hardcoded `RUNNERS` regex (line 110) and absolute-path guard (line 128) cause commands like `sudo node hooks/x.mjs`, `lua hooks/x.lua`, or `/usr/bin/node hooks/x.mjs` to hit the `strayOperand` check (lines 112–115) or absolute-path UNVERIFIED, returning UNVERIFIED instead of inspecting the script. Input: `sudo node hooks/absent.mjs` (file missing) → classifier returns UNVERIFIED, so a genuinely missing hook is never reported as MISSING (lost coverage; trains operators to ignore UNVERIFIED). File: `scripts/lib/hook-registration.mjs:110,128,112-115`.

## ATTACKS
- Correctness:
  - Happy-path-only logic: mitigated by fuzzer P1–P4; however the fuzzer’s plain generator only uses a subset of interpreters and does not include wrapper commands (see Blocker 2).
  - Null/undefined/type mismatch: `classifyCommand` handles non-string (line 51), `auditHookRegistrations` handles `hook?.command` (line 272).
  - Stale state: none observed; `seen` Set is per-audit (line 212).
  - Race conditions: none (synchronous FS ops).
  - Off-by-one: none.
  - Unhandled error paths: `auditHookRegistrations` collapses non-ENOENT read errors into `shape` (line 220); `classifyCommand` catches stat errors and distinguishes ENOENT/ENOTDIR (lines 195–201).
- Security:
  - authn/authz/IDOR: N/A (local CLI, no multi-tenant scope).
  - injection/SSRF: none; paths are only stat’d, never executed.
  - secret handling: none.
  - replay/idempotency: N/A.
  - multi-tenant scope leaks: audit scope explicitly limited to project `.claude` (scopeNote line 304); user-global not inspected (by design).
  - rate-limit/DoS: fuzzer default 20k iterations is bounded.
- Data-truth / schema drift:
  - Model column vs caller field drift: `auditHookRegistrations` assumes `hooks[event][].hooks[].command` shape (lines 261–272); if the settings schema changes (e.g., `cmd` instead of `command`), it silently yields UNVERIFIED/empty (no schema validation). Not evidenced but unguarded.
  - PascalCase-vs-snake_case table drift: N/A.
  - FK target drift: N/A.
  - Frontend response-shape drift: N/A (no frontend).

## HIGHEST RISK
The RUNNERS/stray-operand false-decline (Blocker 2) is the most dangerous: it silently drops coverage for legitimate hooks (e.g., `sudo node`, `lua`, absolute runner paths), and a missing file behind such a command will read as “UNKNOWN” rather than “MISSING” — recreating the original “silence looks like success” outage by consent. Cheapest de-risk: either (a) extend `RUNNERS` to include common wrappers (`sudo`, `perl`, `php`, `lua`, `cmd`) and treat an absolute path to an executable as a possible runner, or (b) explicitly document that such forms are out-of-scope and add a unit test asserting the intended UNVERIFIED verdict so the gap is conscious, not accidental.

## CONFIDENCE
Could NOT verify from the document alone:
- Exact line count of `hook-registration.mjs` (estimated ~306 by visual count; needs `wc -l`).
- Behavior on case-insensitive filesystems (e.g., `hooks/present.MJS` matching `present.mjs`) and on symlink-rooted checkouts (realpath fallback paths).
- That the fuzzer’s weighted generator reliably produces both OK and MISSING across all seeds (degenerate guard depends on it).
- The other referenced fixes (HY3 spend gate, panel null reporting, seat registry) are not in the provided files.

Evidence to settle: run `wc -l` on both files; add CI step that fails if any file >300 lines; add fuzz seed 1 and a few others and confirm exit 0 only with both verdicts present; unit-test `classifyCommand('sudo node hooks/absent.mjs', root)` to lock the intended behavior.

# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-R3-2026-08-20.md
**Seed:** (none)
**Tokens:** 15832 in / 2927 out | **Cost:** ~$0.0914 | **Wall:** 71.7s | **finish_reason:** stop

---

## ROUND 3 VERDICT: NOT DRY. Two new findings, both in the round-2 attack surface.

---

### FINDING 1 (a): The record-format anchor is evadable — blockquote and numbered list hide a real record, and a newline in ad copy reopens a weaker DoS

The new pattern is:

```
$bodySaysInjection = $text -match '(?m)^[ 	]*(?:[-*+][ 	]+)?INJECTION ATTEMPT OBSERVED'
```

The optional prefix covers `[ \t]*` and `[-*+][ \t]+`. It does **not** cover:

- **Blockquote:** `> INJECTION ATTEMPT OBSERVED: https://x` — `>` is neither whitespace nor a bullet. No match.
- **Numbered list:** `1. INJECTION ATTEMPT OBSERVED: https://x` — `1.` is not in `[-*+]`. No match.

Both are entirely natural ways for an agent to format a record — a numbered list of observed attempts is arguably the *most* natural. Consequence: header `INJECTION_OBSERVED: NO` + body record in a blockquote or numbered list = the discrepancy check sees nothing, and the report **publishes clean**. The packet's own comment claims the check catches "body records an injection while the header claims NO" — it does not, for two common markdown forms. The tests pin bullets (`'PANEL: record as bullet + lying header'`) but never pin a blockquote or numbered list, so 39/39 does not cover this.

The parity problem is genuinely gone — but it was traded for a **line-position problem**, and attacker-controlled text can still reach it. The job prompt mandates verbatim quoting of hostile ad copy. Ad copy containing an embedded newline followed by `INJECTION ATTEMPT OBSERVED` at column zero, quoted verbatim by a compliant agent (e.g., inside a fenced block or an inline backtick span that the agent does not re-prefix per line), produces a line that *starts* with the phrase. Honest agent, honest `NO` header, quarantined run — the Kimi F7 DoS, surviving in reduced form. The round-2 fix narrowed the attack surface; it did not close it, and the packet's framing ("Only a line that STARTS with the phrase... counts as a record") overclaims.

This is fail-open in one direction (missed discrepancy) and fail-closed-by-attacker in the other (residual DoS). The honest statement is: the cross-check is a heuristic tripwire over agent formatting the gate does not control, and the documentation should say so.

### FINDING 2 (c): The `.FLAGGED.txt` bare `try/catch` is wrong — and it is *inconsistent with this file's own quarantine path*

```powershell
try { Set-Content -LiteralPath "$ReportPath.FLAGGED.txt" -Value $fnote -Encoding UTF8 } catch { }
```

Compare the quarantine path, twenty lines below:

```powershell
} catch {
    $verdict.Reasons += "(could not write the reasons file: $($_.Exception.Message))"
}
```

The quarantine path records the failure; the flag path swallows it silently. If the `.FLAGGED.txt` write fails (locked file, AV, permissions), the report publishes **byte-identical to a clean one on disk** — which is the exact Kimi R2-F1 defect this fix exists to close, recreated silently, with the console flag gone the moment the scrollback scrolls. The file's own stated rule — "the reason is worthless if it only ever existed in a console scrollback the operator did not watch" — is honoured for QUARANTINE and still violated for FLAG whenever the write fails. Minimum fix: mirror the quarantine path and append a failure note to `Flags` so `Write-PublishOutcome` prints it.

---

### The other attack vectors: clean

**(b) Exit-code refactor — no missed path.** I traced every return: `Publish-Report` returns `PUBLISHED | FLAGGED | QUARANTINED | NOTHING | ERROR`; `Write-PublishOutcome` handles `PUBLISHED/FLAGGED` (returns `$Result.Status`), `QUARANTINED`, `ERROR`, and `default` (returns `'NOTHING'`, which also absorbs `NOTHING` and any hypothetical future status — fails closed into exit 1). The runner's early `'ABORTED'` returns land in the launcher's `default { exit 1 }`. The interactive menu discards the string via `& $selected.Runner -Job $selected | Out-Null` — correct. No success-stream leakage: `Write-Host`/`Write-Rule`/`Write-Field` emit nothing, the `Get-Item` in the size field is consumed by the `-f` argument, and `$null = Test-ReportLinks` covers the one helper that emits. The 5 new outcome tests assert scalar string type and value. This fix is sound.

**(d) No further `.Count`-on-scalar/empty-pipeline instances in the shown code.** I checked every `.Count`: `$head.Count` (wrapped `@()`), `$urls.Count` / `$checked.Count` / `$bare` (all `@()`), `$held.Count` / `$kept.Count` (both `@()` in the test), `$reasons.Count` / `$flags.Count` (initialized `@()`), `$Result.Flags.Count` (gate always returns arrays). That class is dry in the shown code.

**(e) Documentation overclaims, per Finding 1.** Section 5's "carrying a flag" is now true *when the write succeeds* (Finding 2). The in-code comment "Only a DISCREPANCY - body records an injection while the header claims NO - quarantines" overclaims the cross-check's coverage given the blockquote/numbered-list evasion. Nothing else in the docs claims more than the code does.

---

**Loop status: not dry.** Two actionable findings, both in code round 2 touched — the project's rule holds for a fifth time. Neither is catastrophic; both are one-pattern and three-line fixes respectively. I expect round 4 to be the dry one if these land with tests pinning the blockquote and numbered-list record forms.

REVISE

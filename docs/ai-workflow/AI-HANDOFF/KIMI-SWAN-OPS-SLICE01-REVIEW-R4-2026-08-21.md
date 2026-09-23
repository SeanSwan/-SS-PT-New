# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-SLICE01-REVIEW-PACKET-R4-2026-08-21.md
**Seed:** (none)
**Tokens:** 14217 in / 1415 out | **Cost:** ~$0.0639 | **Wall:** 60.3s | **finish_reason:** stop

---

Working through the round-4 attack surface honestly:

**1. Demotion to FLAG.** The reasoning holds. The anchor cannot distinguish record from faithful quote, and the test suite now pins both directions (`record at line start + lying header` → FLAGGED; `GLM R3-a: multi-line quoted ad, honest NO` → FLAGGED, not quarantined). What was "given away" is only the ability to suppress publication, which was the attacker's tool, not the defender's. The discrepancy signal is preserved (console + sidecar + exit 3). Correct trade.

**2. Widened anchor.** `(?m)^[ \t>]*(?:(?:[-*+]|\d+[.)])[ \t]+)?[*_]{0,2}INJECTION ATTEMPT OBSERVED` — the `^` anchor plus a prefix alphabet of only whitespace, `>`, list markers, and `[*_]` means no ordinary word can precede the phrase, so it cannot match mid-line. `Their ad said INJECTION ATTEMPT OBSERVED` and table-cell forms stay quoted copy, and the mid-line prose test pins this. The widening cost is that a blockquoted *quote* of ad copy now flags — but flagging is cheap and publishable, so that's the acceptable side.

Two candidate residues I checked and rejected as findings:
- Heading form (`## INJECTION ATTEMPT OBSERVED`) or triple-emphasis (`***...***`) slips the anchor — but the prompt defines the record as "a line beginning INJECTION ATTEMPT OBSERVED:", a heading render is non-compliant output, and a captured agent omits the record anyway. Same impossibility class; no textual anchor is both necessary and sufficient. Not actionable.
- FLAGGED path doesn't delete a stale sidecar if `Set-Content` fails — but a failed write to an existing path implies delete would fail too, and the failure is recorded into `Flags`. Not a real hole.

**3. Documentation vs code.** The header comment still says "Only a DISCREPANCY ... quarantines" in design note 2 — reading carefully, that entire numbered note describes the round-1/2 design that shaped the file, and the code comment at the discrepancy site explicitly documents the round-3 re-decision. The job prompt §5 matches the code ("flagged, not failed"). No live contradiction found.

**4. .Count/StrictMode/stream-pollution.** `$head`, `$urls`, `$checked`, `$bare`, `$held`, `$kept` are all `@()`-wrapped; the bare-string single-line and single-URL cases are tested; `Write-PublishOutcome`'s return type is asserted scalar for every status. Clean.

**5. Dry?** Yes. I could not produce a new defect that survives the "would a fix change behaviour an attacker or honest run can reach" test. Every string I quoted above is in the packet.

APPROVE

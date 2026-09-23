# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-flash` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 24869 in / 6897 out · **Cost:** ~$0.0032 · **Wall:** 64.2s · **finish:** stop

---

## VERDICT
REVISE — The plan contains a factual error (claims 28-form sweep, test has 34) and the Slice 2 acceptance test is underspecified (how to cause the agent to attempt the actions), both of which will mislead a next agent.

## BLOCKERS
1. **P1** — Plan claims "A 28-form sweep in the test suite pins it" (PART 1 §6), but the test code (PART 2, `test-publish-gate.ps1`, array `$mustFlag`) has 34 entries. The number is wrong, and a next agent relying on the plan may think the sweep is smaller than it is.  
   *Evidence:* Plan §6: "A 28-form sweep in the test suite pins it" vs. code: `$mustFlag = @('', '  ', ...` — 34 items.

2. **P1** — Slice 2 acceptance test (§14) says "from inside a run, attempt (a) `curl https://example.com` and (b) reading `~/.ssh` — both must fail, and the failure must appear in the log." It does **not** specify how to make the agent attempt those actions (e.g., modify the job prompt, create a test script, or use a separate test harness). A competent agent cannot execute this without asking a question.  
   *Evidence:* §14, acceptance paragraph.

3. **P2** — Slice 2 step 3 ("Deny-read the credential paths if the platform allows it") is conditional and vague. On Windows, it is unclear how to deny read access to `~/.ssh`, `~/.codex`, etc. (no built-in ACL mechanism for user home paths that is standard). The plan provides no concrete method or fallback.  
   *Evidence:* §14, step 3.

4. **P2** — The plan admits the gate has never been exercised through a live codex run (§3) but does **not** include a live test in Slice 2 or as a prerequisite. This leaves the gate's real-world behavior unverified, and any future work built on the gate’s correctness is at risk.  
   *Evidence:* §3: "The gate has NEVER been exercised through a live codex run" and §14 does not propose a live test.

## ATTACKS
- **Correctness:** The injection detection regex `(?m)^[ \t>#]*(?:(?:[-*+]|\d+[.)])[ \t]+)?[*_]*INJECTION ATTEMPT OBSERVED` matches lines starting with `#` without a following space (e.g., `#INJECTION ATTEMPT...`), which is not a valid markdown heading. This could cause a false flag on a heading that happens to begin with that phrase (unlikely, but possible). The accepted limit of backtick is documented and acceptable. The head-scan boundary logic appears correct and passes the provided test cases. The `ConvertFrom-ReportBytes` function’s fail-closed mechanism (mojibake → quarantine) is well-designed and tested.
- **Security:** The plan correctly labels the publish gate as a non-security control. The real security risk is OPEN-1 (unsandboxed egress and unscrubbed child environment), which the plan honestly identifies as CRITICAL and blocks further unattended runs. The recommendation to stop and ask is appropriate; the tool is not ready for unattended operation without Slice 2.
- **Data-truth / schema drift:** The plan’s file map line counts (e.g., `lib/Publish.ps1` 506 lines) are claimed to be measured, but we cannot verify them from the code block alone (the block is a continuous excerpt). The plan states v3’s line counts were stale; this one may be correct. No evidence of contradiction with the provided code. The verdict block format (four contiguous lines) is consistent between the plan and the code.

## HIGHEST RISK
The gate has never been tested with a live codex invocation. If the verdict block parsing fails in a real run (e.g., due to unexpected output format, encoding issues, or launcher argument passing), the entire gate is unreliable. The cheapest de-risk: run a single live codex with a test job prompt that writes a knowable verdict block, and verify the gate’s output and exit code. This should be done before any work on Slice 2, as the gate’s correctness is a prerequisite for the freeze-lift verification.

## CONFIDENCE
I cannot verify the actual test suite results (53/53 and 5/5) because I cannot execute the code. The plan provides the test code, which appears correct, but environment-specific issues (path, encoding, dependencies) could cause failures. I also cannot verify the line count of `Swan-Ops.ps1` (299) or the exact behavior of the freeze refusal. To settle these, I would need to run the test suites on the target machine and check the file sizes. The plan is internally consistent and transparent about its limitations, so I am moderately confident that the plan is largely accurate — but the factual error (28 vs. 34 forms) and underspecification of the Slice 2 acceptance test are concrete issues that need correction before the plan is trustworthy.

REVISE

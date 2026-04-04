## Skill: verification-before-completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command or observable outcome proves this claim?
2. RUN/OBSERVE: Execute the FULL command (fresh, complete) or visually inspect the UI/system behavior.
3. READ/ANALYZE: Full output, check exit code, count failures, inspect UI for expected changes or absence of errors.
4. VERIFY: Does output/observation confirm the claim?
   - If NO: State actual status with evidence, including any error messages observed or unexpected UI states.
   - If YES: State claim WITH evidence.
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 (successful compilation) | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes, check for regressions, ensure no new errors are introduced | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes, UI/system behaves as expected, no error logs | Agent reports "success" |
| Requirements met | Line-by-line checklist, verification of UI changes (with screenshots), data integrity, and error handling | Tests passing |
| UI change applied | Screenshot of new UI state, confirm interactive elements function as expected, check console for errors | Code merged, local build looks good |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification or observed the system.**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification / OBSERVE the system |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler, Linter ≠ runtime behavior |
| "Agent said success" | Verify independently, check actual system state |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing, check all relevant aspects |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build command] [See: non-zero exit code indicating build failure OR successful compilation message] "Build succeeds"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each (including UI/behavioral aspects, error handling, and taking screenshots for UI changes) → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes (code, UI, logs) → Report actual state, including any observed errors or unexpected behaviors
❌ Trust agent report
```

**UI Changes:**
```
✅ Apply change → Run application → Take screenshot of relevant UI → Interact with UI elements to confirm functionality → Check browser console/server logs for errors → "UI change applied, screenshot attached, no console errors."
❌ "UI code merged, should be fine."
```

**Error Handling/Edge Cases:**
```
✅ Identify potential error conditions or edge cases → Simulate each condition → Verify error message is correct/expected behavior occurs → Log observed outcome → "Error condition X handled correctly, message 'Y' displayed."
❌ "Error handling is in place."
```

## Why This Matters

From 24 failure memories:
- your human partner said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion → redirect → rework
- Violates: "Honesty is a core value. If you lie, you'll be replaced."
- **Incorrect UI changes shipped - user experience degraded**
- **Uncaught errors shipped - system instability**

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## The Bottom Line

**No shortcuts for verification.**

Run the command. Observe the system. Read the output. Inspect the UI (and take screenshots for UI changes). Test error states. Confirm successful compilation if applicable. THEN claim the result.

This is non-negotiable.
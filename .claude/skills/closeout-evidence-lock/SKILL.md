---
name: closeout-evidence-lock
description: End-of-task closeout gate for SwanStudios. Enforces Claim-to-Evidence Lock (rule 28), dual-pass hostile review (rule 17), post-task hygiene check (rule 38), and forbidden-language filter (rule 34). Inherits the full substantive code-review checklist (security, performance, test coverage, breaking changes, conventions) from the retired requesting-code-review skill. Use at the end of every non-trivial task before declaring complete.
---

# Closeout Evidence Lock

**Role:** end-of-task gate. Replaces the broken `requesting-code-review` at the default layer (which depended on a missing `superpowers:code-reviewer` subagent) and preserves its substantive review checklist so nothing load-bearing is lost.

This skill exists because Claude has demonstrably declared victory before verification, used speculative success language ("should be fixed," "looks good"), and missed obvious hostile-review failure modes under time pressure. A closeout skill that produces a structured evidence report converts the closeout from a natural-language summary into an artifact that either passes or fails.

## When to invoke

At the end of every task that touched any of:
- Runtime code (frontend or backend)
- Tests
- Config or infrastructure files
- UI/visible surfaces
- Database models or migrations
- API contracts
- Documentation that other tasks will rely on

Do NOT invoke for:
- Read-only exploration with no changes
- Pure discussion with no commits planned

## Mandatory output (produce all sections)

```
=== CLOSEOUT EVIDENCE LOCK ===

TASK: [one-sentence description]
SCOPE: [files touched — exact paths]

=== SECTION 1 — Claim-to-Evidence Lock (rule 28) ===
Claim made: [exact wording of the completion claim]
Canonical Surface Receipt present? [Y/N — link to artifact if Y]
If claim says "end-to-end" / "live surface fixed" / "truth restored" / "canonical":
  The receipt MUST be present. If missing, narrow the claim to what was actually verified.

=== SECTION 2 — Forbidden-Language Filter (rule 34) ===
Scan the closeout text for these forbidden phrases:
  [ ] "should be fixed"
  [ ] "looks good"
  [ ] "likely fixed"
  [ ] "safe to delete"
  [ ] "guaranteed deletable"
  [ ] "nothing to lose"
  [ ] "definitely dead"
  [ ] "100% unused"
  [ ] "end-to-end fixed" (without a Canonical Surface Receipt)
If any found, rewrite before the closeout ships.

=== SECTION 3 — Dual-Pass Hostile Review (rule 17) ===
Hostile review checklist:
  [ ] stale state / race conditions
  [ ] null/undefined/type mismatches
  [ ] wrong route / base URL / env / proxy / service worker / deploy drift
  [ ] auth / header / permission mismatches
  [ ] mobile overflow / squeezed UI
  [ ] keyboard / focus / touch target issues
  [ ] nested interactive elements / invalid DOM
  [ ] import / path mistakes
  [ ] happy-path-only logic
For each checked item: state what was verified or why not applicable.

=== SECTION 4 — Substantive Code Review Checklist (inherited from retired requesting-code-review) ===

4.1 Security vulnerabilities:
  [ ] XSS — any new user input rendered to DOM without escape?
  [ ] SQL / command injection — any query built from user input without parameterization?
  [ ] Auth bypasses — any new route missing protect/authorize middleware?
  [ ] Insecure direct object references — any :userId/:clientId param without ownership check?
  [ ] Sensitive data exposure — any secret, password, token, PII logged or returned?

4.2 Performance:
  [ ] N+1 queries — any loop calling .findOne / .findAll inside?
  [ ] Unnecessary re-renders — any component re-rendering on every parent tick?
  [ ] Excessive computations — any expensive work on hot render paths? If memoization is used, it must follow repo conventions rather than defaulting to useMemo / useCallback blindly.
  [ ] Inefficient algorithms — any O(n²) where O(n) would do?
  [ ] Large data transfers — any endpoint returning more than needed? (prefer attributes: [...])

4.3 Test coverage:
  [ ] New functions have unit tests
  [ ] Changed behavior has updated tests
  [ ] Edge cases named and covered (empty, null, boundary, error)
  [ ] Regression test written first for bug fixes (rule 18)

4.4 Breaking changes:
  [ ] Public API shapes unchanged, or migration path documented
  [ ] Database schema changes are additive OR paired with migration
  [ ] Interface/type exports unchanged, or callers updated in same PR
  [ ] Env vars unchanged, or render.env.example updated

4.5 Project conventions:
  [ ] styled-components-first (no Tailwind, no MUI)
  [ ] Crystalline Swan tokens only (no Galaxy-Swan)
  [ ] Dark-first fallbacks
  [ ] File under 300 lines (rule 4)
  [ ] 7-star documentation if new file (rule 14)
  [ ] 44px min touch targets (rule 2)
  [ ] WCAG 4.5:1 contrast (rule 7)
  [ ] Victory for charts (rule 10)
  [ ] No yoga/meditation language (rule 9)
  [ ] Commit style type(scope): description (rule 13)

=== SECTION 5 — Verification Evidence ===
Test commands run: [exact commands]
Test results: [pass/fail counts]
Typecheck: [command and result, or "not run — reason"]
Build: [command and result, or "not run — reason"]
Manual verification: [what you clicked / loaded / observed]
Real caller path checked: [file:line of the actual caller, not an isolated component]

=== SECTION 6 — Post-Task Hygiene Check (rule 38) ===
Did this work create:
  [ ] New temp artifacts? — [list]
  [ ] New screenshots? — [list]
  [ ] New debate docs? — [list]
  [ ] New obsolete files? — [list]
If any yes, add to cleanup backlog or archive plan.

=== SECTION 7 — Residual Risk ===
Things NOT verified in this session:
  - [explicit list]
Things that may break if assumption X is wrong:
  - [explicit list]
Next smoke test Sean should run before committing:
  - [explicit steps]

=== SECTION 8 — Reporting Order ===
Report to Sean in this order:
  1. Blockers (anything failed or unverified)
  2. What was verified
  3. Residual risk
Never: summary before blockers. Never: "looks good" without evidence.

STATUS: [PASS | NARROW-CLAIM-PASS | FAIL]
```

## How STATUS is determined

- **PASS** — every mandatory checkbox ticked, every forbidden phrase absent, Canonical Surface Receipt present if claimed, all sections filled
- **NARROW-CLAIM-PASS** — the wider claim had to be narrowed to what was actually verified (e.g., "schema drift in legacy file fixed, canonical surface status not verified"). This is an honest outcome, not a failure.
- **FAIL** — blocker found during the closeout (broken test, missing receipt, forbidden language that can't be removed without lying). Task does not ship.

## Integration with existing skills

- **`verification-before-completion`** remains as a standalone KEEP core skill and is called *before* this one. Verification proves the code works; this closeout locks the claims about the work.
- **`test-driven-development`** is called *earlier* in the task. This closeout checks that TDD was actually followed when applicable.
- **`systematic-debugging`** is called *during* bug investigation. This closeout checks that the debugging produced a root cause, not just a symptom patch.

## Retired dependency note

This skill replaces `requesting-code-review` at the default layer. The retired skill depends on a `superpowers:code-reviewer` subagent that does not exist in this repo's skill infrastructure, so any dispatch to it would silently fail. This skill preserves the substantive review checklist from that skill's `code-reviewer.md` template (sections 4.1-4.5 above) so nothing load-bearing is lost.

The `requesting-code-review` file itself remains on disk until Phase 3 quarantine execution, at which point it relocates to `archive/quarantined-skills/YYYY-MM-DD/` alongside the quarantined aesthetic skills.

## Non-goals

- This skill does not run tests (that's the task's own responsibility, using TDD + verification-before-completion)
- This skill does not perform design reviews (that's `swan-design-router` during the task, not at closeout)
- This skill does not fix bugs found during the checklist — it reports them back as blockers
- This skill does not dispatch a separate review subagent by default. If Sean wants a second-pair-of-eyes Agent call for a specific high-stakes commit, he can request it explicitly.

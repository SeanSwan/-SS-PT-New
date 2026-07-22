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

=== SECTION 1b — Gate Evidence (rule 73) ===
If the slice was substantial (Rule 61/73 bar): paste the passing gate.mjs output
(gate path + git hash-object at authoring AND at closeout). Hash mismatch between
the two = the builder touched the gate = automatic REVISE, regardless of output.
If exempt (trivial/doc-only): state "Gate Evidence: exempt — <reason>".

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

=== SECTION 3 — DRY-LOOP Hostile Review (rule 17 + Sean's Dry-Loop Law, 2026-07-21) ===

THE LAW (Sean, 2026-07-21 — "this is just protocol from here on out"): a single
hostile pass is NOT completion. For every build/fix/feature task, hostile-review
rounds repeat UNTIL A ROUND FINDS NOTHING FIXABLE — and then ONE MORE full
confirmation round runs on top of that ("the second final"). Only two consecutive
clean rounds = dry. Sean must NEVER have to ask for another round.

Loop mechanics (each round, before the checklists below):
  1. Every round must gather NEW evidence — execute from a vantage not yet tried
     (different cwd/worktree, different mode/flag, different role/viewport, the
     real caller path, the unusual input) — re-reading code you already read is
     NOT a round.
  2. A round that APPLIED fixes is itself a defect source: its own changes are
     the primary attack surface of the next round (proven 2026-07-21: round 3
     introduced the MAIN-TREE blind spot; only round 4's different-vantage
     execution caught it).
  3. Record the round ledger in the closeout: Round N — vantage tried — found →
     fixed | found → flagged (gated) | CLEAN. The ledger must end with TWO
     consecutive CLEAN rounds.
  4. Findings that are Sean-gated (rule 34 cleanup, DECISION-class, paid spend)
     count as "flagged", not "fixable" — they don't keep the loop alive, but
     they MUST be captured to Linear (linear-todo Mode 1) before dry is declared.
  5. Scale rounds to blast radius: trivial one-liners may dry in 2 rounds
     (1 find-nothing + 1 confirm); production/money/auth surfaces should expect
     3-5+. Token cost is not a reason to stop early — Sean's standing directive.
  6. HARNESS ENFORCEMENT: a deterministic Stop hook (`scripts/hooks/dry-loop-gate.mjs`)
     blocks the turn from ending when files changed / commits landed without the
     ledger. The closeout MUST end with the literal marker `DRY-LOOP: CLEAN×2
     (rounds: N)` — or `DRY-LOOP: N/A — <reason>` for genuinely non-build turns.
     The marker is a CLAIM: emitting it without the rounds behind it violates
     rules 19/28.

Hostile review checklist (apply EVERY round):
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

Design/product hostile review for UI work:
  [ ] Primary job is obvious in the first viewport
  [ ] Primary action is visually dominant and wired to a real handler/route/state change
  [ ] Secondary actions are limited, purposeful, and not competing with the primary action
  [ ] No inert buttons, decorative controls, fake tabs, or mystery icon buttons
  [ ] Desktop/QHD/4K scale is professional, not a tiny centered widget
  [ ] Mobile tabs/actions do not overlap, clip, or require hover
  [ ] Scroll ownership is deliberate; no nested scrollbar maze without a named reason
  [ ] Cards/lists do not clip long realistic content or hide required details
  [ ] Empty/loading/error states preserve the same layout quality
  [ ] One named signature visual/information decision is present; generic admin-template structure is not the dominant impression
For every unchecked item: fix it, narrow the claim, or mark STATUS: FAIL.

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
Visual evidence for UI work: [screenshots, Playwright viewport checks, CSS/source contracts, or "not run - reason"]
Viewport evidence for UI work: [320/375/414/768/1024/1280/1440/1920/2560/3440 plus 3840 when 4K was in scope]
Action evidence for UI work: [primary/secondary/dead-control sweep results]
Scroll evidence for UI work: [page/panel scroll owner, nested-scroll justification, wheel/touch result]

=== SECTION 6 — Post-Task Hygiene Check (rule 38) ===
Did this work create:
  [ ] New temp artifacts? — [list]
  [ ] New screenshots? — [list]
  [ ] New debate docs? — [list]
  [ ] New obsolete files? — [list]
If any yes, add to cleanup backlog or archive plan.

=== SECTION 6.5 — Hermes Closeout Emission (rules 68-69) ===
Substantial transferable work completed? [Y/N + reason]
Hermes Inbox memo: [path | not required]
Fable-tier permanent lesson? [Y/N + originating model]
Hermes Learning Packet: [path | not required | QUARANTINE]
Privacy/secret scan: [command + result | not applicable]

=== SECTION 6.6 — Linear Board Sync (linear-todo Mode 1/2) ===
Does this task have (or deserve) a SWA issue? [Y/N]
  - If it advanced/finished an EXISTING issue: update that issue THIS turn — final state,
    commit range, evidence, Done/Todo transition. Do NOT wait for Sean to ask (the whole
    system exists so he never has to). SWA issue: [SWA-N updated | none applies + why]
  - If it was substantial NET-NEW work with no issue: capture one (Mode 1, dedup first).
  - New Sean-gated findings surfaced this turn (Rule 34 / DECISION / spend): [SWA-N each | none]
Board synced? [Y — SWA-N | N/A — trivial/no-issue task]

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
- This skill does not replace `swan-design-router`'s first-pass design review; it verifies the final UI evidence and blocks weak visual/product claims at closeout
- This skill does not fix bugs found during the checklist — it reports them back as blockers
- This skill does not dispatch a separate review subagent by default. If Sean wants a second-pair-of-eyes Agent call for a specific high-stakes commit, he can request it explicitly.

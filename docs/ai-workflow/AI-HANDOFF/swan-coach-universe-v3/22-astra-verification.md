# SCU-VERIFICATION — latest local implementation evidence

Owner: Astra. 2026-09-06 UTC. Verdict: **REVISE; full upgrade unfinished.**
Scope: isolated worktree, unlocked repairs, source audit and synthetic checks.
Supplements 17, which was released for independent planning amendments.
No production operation, paid provider call, commit or push occurred in this pass.

## Fresh results

| Gate | Actual result | Evidence |
|---|---|---|
| Frontend supported typecheck | PASS, exit 0 | evidence/astra-typecheck-supported.log; npm run type-check, 12GB heap |
| Frontend production bundle | PASS, exit 0, 18.39s | evidence/astra-frontend-build.log; npm run build |
| Logger producer + existing interaction | 17/17 pass | useWorkoutLoggerDictation.provenance.test.tsx plus existing .test.tsx |
| Selected nested workspace suites | 45/45 pass across nine suites | evidence/astra-nested-tab-tests.log |
| Current helper regression set | 45 pass, 3 fail out of 48; exit 1 | evidence/astra-runtime-tests.log |
| Planning integration | 9/9 pass after final link changes | tests/review-integration.test.mjs; documentation checks only |
| Synthetic reference browser | 84 layout/state cases pass | evidence/astra-wireframe-check.json and six width screenshots |
| Actual authenticated dashboards | NOT RUN | No real-user/browser acceptance claim |
| Actual SQL/Redis write races | NOT RUN | S3/S4 integration remains open |

Reproduce the current backend/plan result with tests/astra-verify.mjs. It writes
evidence/astra-current-verification.json with exact command exits, failed test
names and SHA256 hashes of the changed sources and current planning artifacts.
Its current exit is 1 because the three runtime acceptance failures remain.
git diff --check also completed with exit 0; this is whitespace validation only.

The first typecheck used an 8GB heap and exited 134 from heap exhaustion; its log
is retained. The supported repository command at 12GB completed successfully.
Vite bundling is not a replacement for typechecking; both were separately run.
After those frontend checks, subsequent runtime edits affected backend pure helpers
only; no frontend source changed after the successful checks.

## Repairs and their limits

1. Versioned strict workout normalization preserves exercise identity, unit and
   unique instances, and rejects invalid set data. Thirteen strict cases pass.
   The actual daily-form writer still uses legacy normalization: activation awaits
   its reviewed caller/schema contract, not an unconditional global switch.
2. Read-back verifier accepts actual UUID form IDs, rejects name-only identity and
   duplicate set ordinals. The second pass added explicit scalar validation:
   null/blank/boolean data cannot equal zero, repetitions are integers, dates must
   exist, load aliases cannot conflict, units are allowlisted and identities must
   be scalar. Eleven new failures were observed before repair; all twelve value
   cases now pass including the explicit-zero control.
3. Progress helper no longer invents a scheduled denominator when completed
   sessions exceed it. Map accumulation now prevents exercise-key collisions with
   __proto__/constructor from mutating inherited objects; both regressions were
   reproduced and pass after repair. Actual schedule membership and duplicate-row
   handling still need the S8 domain adapter. Malformed/missing progress input
   quality is not fully implemented; don't activate this helper as chart authority.
4. Default Logger dictation keeps origin atomically with its text, including edited,
   appended and unchanged speech. Six request-boundary cases plus eleven existing
   interactions pass. The shared command hook's omitted-origin default and other
   producers remain part of S1-close.

The verifier/progress functions remain dormant helpers. Pure comparison does not
prove a commit or authorize a target. The versioned footprint still needs its real
DB adapter/schema fingerprint; legacy numeric references and session labels are
retained for compatibility with existing helper tests.

## Remaining reproduced failures

- AR03: failed receipt has a committed timestamp derived from completion time.
- AR04: a caller-shaped result can self-certify verification.
- AR05: found-only reconciliation is accepted without matching effect evidence.

All three fail for behavioral assertions in coachIntentService. That file is
still locked by the earlier implementation lane. Ownership was queried; it has
not been silently seized. R3-1 lost-response replay and AF13 bounded authorized
pagination likewise remain open. The updated AF13 contract retains empty-page
continuation, never skips readable lookahead, and requires explicit user fetch-next.

## Dashboard evidence interpretation

127 source route/tab entries map to 24 One Coach domains, including all four roles.
Source counts include aliases and secondary paths. 21 adds six Client Hub views,
seven nested training sections, fifteen Nutrition branches and six Content Studio
tabs with actual renderer and role/entitlement evidence.
The 45 nested tests establish selected component behaviors only. Remaining deep
walks and authenticated denied/error/save/reload journeys are explicitly open.
No claim of a complete functional audit of every tab is made.

## Wireframe verification and hostile design pass

Viewport matrix: 320x800, 414x896, 768x1024, 1440x900, 2560x1440, 3840x2160.
Seven states, three mobile views; 84 layout cases. Checks include no horizontal
overflow, 44px controls, no composer/task overlap, denied record visibility,
unknown-state actions, keyboard tab navigation and zero external requests.
Manual screenshot inspection found mobile composer overlap missed by the initial
checks. A new assertion reproduced it, the layout was corrected, and the expanded
matrix passed. Mobile mic target width was also corrected after its first failure.
Synthetic screenshots are build references, not screenshots of the mounted app.

## Continuation and artifact hygiene

Read 11 then 12–16 and 18–22. Preserve all supplied review artifacts and the
independent review's amendments to 15/17. The prior source-hashed review receipt
describes its own captured planning snapshot; later handoff/flow amendments need
fresh hashes and checks, not a claim that the old snapshot proves current bytes.
Before edits, re-read current lane ownership. Resolve the old Coach lane before
touching its runtime locks; keep the shared dirty checkout out of this build.

New logs, screenshots and test artifacts are under packet/evidence or packet/tests.
Local frontend/dist is generated build output; preservation snapshot stays under
tmp. No archive/move/delete, root screenshot, continuity closeout or production
change occurred. These local artifacts do not require a repository-wide cleanup.

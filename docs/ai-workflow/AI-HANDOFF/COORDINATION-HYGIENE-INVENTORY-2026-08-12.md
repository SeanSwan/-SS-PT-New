# Coordination hygiene inventory — 2026-08-12

**Phase 1, NON-DESTRUCTIVE (Rules 32–39).** Nothing here has been moved, pruned, or deleted.
No worktree was removed. No lane file was touched. This is an inventory plus a proposal
awaiting Sean's explicit approval (Rule 34).

**Author:** vs-claude (Opus 5) · **Generated from:** `node scripts/tree-sentinel.mjs --json`
(origin/main ref: fresh) + `node scripts/lane.mjs doctor`.

---

## 1. Headline

| Thing | Count |
|---|---|
| Git worktrees registered | **187** (main + 186 linked) |
| — fully merged, zero uncommitted files | **79** |
| — merged but holding uncommitted files | **42** |
| — unmerged, genuinely ahead of origin/main | **37** |
| — detached HEAD (ahead-ness not computable) | **28** |
| Orphaned worktree-local ledgers | **8** (9 stray files) |
| Lane files in the canonical ledger | 10 |
| — holding locks and older than 14 days | 1 (`codex-comms-recovery`, 27d, 186 locks) |
| Oversized ledger artifact | `review-queue.md.orig`, 220 KB, since 2026-07-19 |
| Main tree working copy | 225 dirty / 176 untracked |

## 2. What is safe, what is not

**A. MERGED-CLEAN (79)** — branch fully contained in `origin/main`, working copy clean.
Removing these loses nothing: every commit is on main and there are no uncommitted files.
This is the only group I would call low-risk, and even here the removal is Sean's call.

**B. MERGED-DIRTY (42)** — merged, **but each holds uncommitted files that would be
destroyed** by `git worktree remove --force`. These must be triaged individually: the dirty
files are either abandoned scratch or somebody's unfinished work, and the ledger cannot tell
us which. **Do not batch-remove this group.**

**C. UNMERGED (37)** — real work ahead of `origin/main` that has never landed. **Do not
touch.** Several are recognisable in-flight lanes. If any are genuinely dead, that is a
per-branch decision with the author, not a cleanup sweep.

**D. DETACHED (28)** — no branch, so "is it merged" cannot be answered by ref comparison.
Needs per-item inspection before any action.

## 3. The stale lock

`codex-comms-recovery.lane.md` — last written **27 days ago**, status still holding **186
locks**, all pointing into `C:/tmp/sspt-comms-recovery-20260715/`. Under R5 a stale claim is
never silently seized: it is flagged to Sean. Two questions for him: is that work still live,
and can the lane be released? Until then those 186 paths read as claimed to every agent.

*(Note: this lane is also why a parser regression was caught today — a refactor briefly
reported it as holding ONE lock instead of 186. A digest that under-reports locks is worse
than no digest, because it reports a locked file as free.)*

## 4. Proposed cleanup — NOT EXECUTED, needs Sean's approval

Ordered safest first. Each step is independently approvable; approving one does not approve
the next.

1. **Release the stale lane** (after Sean confirms the work is done):
   `SWAN_AGENT_SURFACE=codex-comms-recovery node scripts/lane.mjs release --outcome "..."`
   Zero risk — rewrites one gitignored file, deletes nothing.
2. **Archive the 220 KB `review-queue.md.orig`** (a merge artifact from 2026-07-19). Move,
   not delete. Also worth adding `*.orig` to the ledger's ignore rules so it cannot return.
3. **Reconcile the 8 orphaned worktree ledgers.** They contain nine lane files nobody can
   read. Recommendation: leave the files in place and let the worktrees age out with group A
   — merging their contents forward would mean writing other agents' lanes (R4) and importing
   phantom locks from dead sessions (R5).
4. **Remove group A (79 merged-clean worktrees)** — the actual space and noise win. Per item:
   `git worktree remove <path>` (no `--force`; it refuses if anything is dirty, which is the
   safety property we want). I would do this in batches of ~20 with a re-verify between.
5. **Triage group B (42 merged-dirty)** — produce a per-worktree list of exactly which files
   are dirty, for Sean to skim. Only then decide. This is its own slice.
6. **Leave C and D alone** pending explicit per-branch decisions.

**Not proposed:** any use of `--force`, any batch operation over B/C/D, and any deletion of
lane files. The phrases "safe to delete" and "nothing to lose" are avoided deliberately
(Rule 34) — group A is a *likely* removal candidate pending Sean's approval and a final
reference check at execution time.

---

MAIN TREE: C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT
TOTAL WORKTREES: 187  (main + 186 linked)

## A. MERGED-CLEAN — 79 (fully merged into origin/main, zero uncommitted files)
| path | branch | ahead | dirty | last commit |
|---|---|---|---|---|
| `tmp/ss-brain-fable-20260707` | claude/second-brain-fable-mode-20260707 | 0 | 0 | 2026-07-08 |
| `tmp/ss-progress-delta-20260708` | claude/progress-delta-20260708 | 0 | 0 | 2026-07-09 |
| `tmp/sspt-coach-command-center-20260709` | codex/coach-command-center-20260709 | 0 | 0 | 2026-07-09 |
| `tmp/sspt-nutrition-hotfile-20260709` | codex/nutrition-hotfile-review-20260709 | 0 | 0 | 2026-07-09 |
| `tmp/sspt-nutrition-render-20260709` | codex/nutrition-decision-logger-render-20260709 | 0 | 0 | 2026-07-09 |
| `tmp/ss-plan-pdf-rename` | claude/plan-pdf-swan-coach-rename | 0 | 0 | 2026-07-10 |
| `tmp/sspt-coach-client-notebook-20260709` | codex/coach-client-notebook-voice-20260709 | 0 | 0 | 2026-07-10 |
| `tmp/sspt-nutrition-seven-star-20260709` | codex/nutrition-seven-star-20260709 | 0 | 0 | 2026-07-10 |
| `tmp/sspt-workout-design-lab-25views-20260710` | codex/workout-design-lab-25views-20260710 | 0 | 0 | 2026-07-10 |
| `tmp/sspt-workout-design-lab-release` | codex/workout-design-lab-release | 0 | 0 | 2026-07-10 |
| `tmp/ss-equipment-slice1` | claude/equipment-p0-safety | 0 | 0 | 2026-07-11 |
| `tmp/ss-hermes-os-visual-20260711` | codex/hermes-os-visual-20260711 | 0 | 0 | 2026-07-11 |
| `tmp/ss-marketing-epic1` | feat/consult-cta | 0 | 0 | 2026-07-11 |
| `tmp/sspt-hermes-closeout-hook-20260711` | claude/self-review-fixes-20260712 | 0 | 0 | 2026-07-11 |
| `tmp/sspt-pdf-a1b2-20260710` | claude/pdf-white-label-a1b2-2026-07-10 | 0 | 0 | 2026-07-11 |
| `tmp/sspt-style-lens-os-build-20260711` | codex/style-lens-os-foundation-20260711 | 0 | 0 | 2026-07-11 |
| `tmp/ss-cortex-audit` | claude/cortex-p0-safety-20260712 | 0 | 0 | 2026-07-12 |
| `tmp/ss-lens-vision-20260711` | claude/lens-vision-20260711 | 0 | 0 | 2026-07-12 |
| `tmp/ss-quality-arc-20260712` | claude/quality-arc-20260712 | 0 | 0 | 2026-07-12 |
| `tmp/ss-review-loop` | claude/heatmap-local-admin-reg-20260712 | 0 | 0 | 2026-07-12 |
| `tmp/ss-storefront-deals` | claude/storefront-custom-deals-20260708 | 0 | 0 | 2026-07-12 |
| `tmp/sspt-chat-400-20260712` | codex/chat-message-400-20260712 | 0 | 0 | 2026-07-12 |
| `tmp/sspt-five-day-hostile-release-20260712` | codex/five-day-hostile-release-20260712 | 0 | 0 | 2026-07-12 |
| `tmp/sspt-hostile-review-20260712` | codex/hostile-review-reconciliation-20260712 | 0 | 0 | 2026-07-12 |
| `tmp/sspt-ph` | claude/client-plan-home-v2 | 0 | 0 | 2026-07-12 |
| `tmp/ss-dash-batch-20260713` | claude/dashboard-batch-20260713 | 0 | 0 | 2026-07-13 |
| `tmp/sspt-coach-mobile-20260713` | codex/coach-mobile-20260713 | 0 | 0 | 2026-07-13 |
| `tmp/ss-planpdf-20260714` | claude/plan-pdf-swap-20260714 | 0 | 0 | 2026-07-14 |
| `tmp/ss-world-engine-release-20260714` | codex/world-engine-release-20260714 | 0 | 0 | 2026-07-14 |
| `tmp/sspt-order-reconcile-20260713` | claude/trainer-compensation-20260714 | 0 | 0 | 2026-07-14 |
| `tmp/ss-dictation-20260714` | claude/dictation-planner-logger-20260714 | 0 | 0 | 2026-07-15 |
| `tmp/ss-social-groups-20260714` | claude/social-groups-20260714 | 0 | 0 | 2026-07-15 |
| `tmp/sspt-client-export-hostile-20260715` | codex/client-export-hostile-20260715 | 0 | 0 | 2026-07-15 |
| `tmp/ss-auditdoc` | claude/secfix-auditdoc-20260716 | 0 | 0 | 2026-07-16 |
| `tmp/ss-ctp-ship-20260716` | main | 0 | 0 | 2026-07-16 |
| `tmp/ss-hostile-audit-20260715` | claude/hostile-audit-20260715 | 0 | 0 | 2026-07-16 |
| `tmp/sspt-canonical-training-plan-20260715` | codex/canonical-training-plan-20260715 | 0 | 0 | 2026-07-16 |
| `tmp/sspt-swan-support-report-room-20260716` | codex/swan-support-report-room-20260716 | 0 | 0 | 2026-07-16 |
| `tmp/sspt-unified-brain-20260715` | codex/unified-brain-20260715 | 0 | 0 | 2026-07-16 |
| `tmp/sspt-prelaunch-integration-v2-20260716` | codex/prelaunch-integration-v2-20260716 | 0 | 0 | 2026-07-17 |
| `tmp/sspt-recent-commit-hostile-20260719` | codex/recent-commit-hostile-20260719 | 0 | 0 | 2026-07-19 |
| `tmp/ss-logger-handoff-20260718` | feat/logger-post-save-handoff | 0 | 0 | 2026-07-20 |
| `tmp/ss-proof-card-20260721` | claude/completion-proof-card-20260721 | 0 | 0 | 2026-07-20 |
| `tmp/ss-pt-pwd` | feat/client-change-password | 0 | 0 | 2026-07-21 |
| `tmp/ss-client-dash-responsive` | fix/client-dashboard-responsive | 0 | 0 | 2026-07-22 |
| `tmp/ss-crystal-ring` | feat/client-home-crystal-ring | 0 | 0 | 2026-07-22 |
| `tmp/ss-rule75-stick-20260722` | claude/rule75-dryloop-stick-20260722 | 0 | 0 | 2026-07-22 |
| `tmp/ss-s0-idor` | fix/bootcamp-profile-idor-s0 | 0 | 0 | 2026-07-22 |
| `tmp/ss-swan-lens-gallery-20260722` | claude/swan-lens-new-colorways-20260722 | 0 | 0 | 2026-07-22 |
| `tmp/ss-hotfix-c05` | hotfix/coach-wrong-client-write | 0 | 0 | 2026-07-24 |
| `tmp/ss-admin-trainer-norm` | feat/admin-trainer-normalization | 0 | 0 | 2026-07-25 |
| `tmp/ss-launch-release-20260726` | codex/launch-readiness-20260726 | 0 | 0 | 2026-07-26 |
| `tmp/sspt-mobbin-protocol-v3-20260725` | codex/mobbin-protocol-v3-20260725 | 0 | 0 | 2026-07-26 |
| `tmp/ss-charts-g3` | charts-loop-g3 | 0 | 0 | 2026-07-27 |
| `tmp/ss-coach-hive-20260724` | claude/coach-hive-mind-20260724 | 0 | 0 | 2026-07-29 |
| `tmp/ss-fable-launch-20260728` | fable/launch-hardening-20260728 | 0 | 0 | 2026-07-29 |
| `tmp/ss-nutrition-safety-20260728` | claude/nutrition-safety-p0-20260728 | 0 | 0 | 2026-07-29 |
| `tmp/sspt-auth-modernization-20260728` | feat/auth-modernization-20260728 | 0 | 0 | 2026-07-29 |
| `tmp/sspt-trust` | claude/plan-edit-trust-upgrade-20260728 | 0 | 0 | 2026-07-29 |
| `tmp/sspt-bootcamp-crystalline-rail-20260801` | codex/bootcamp-v2-crystalline-rail-20260801 | 0 | 0 | 2026-08-01 |
| `tmp/sspt-bootcamp-quality-20260801` | codex/bootcamp-selection-quality-20260801 | 0 | 0 | 2026-08-01 |
| `tmp/sspt-jarvis-postdeploy-hostile-20260801` | codex/jarvis-postdeploy-hostile-20260801 | 0 | 0 | 2026-08-01 |
| `tmp/sspt-workout-planner-themes-20260801` | codex/workout-planner-themes-20260801 | 0 | 0 | 2026-08-01 |
| `tmp/sspt-agent-workflow-20260802` | codex/agent-workflow-integration-20260802 | 0 | 0 | 2026-08-02 |
| `tmp/ss-launch-audit-20260727` | claude/session-hostile-review-20260731 | 0 | 0 | 2026-08-03 |
| `tmp/ss-workout-os-audit-20260729` | claude/plan-surfacing-a-20260803 | 0 | 0 | 2026-08-03 |
| `tmp/ss-drift-audit-20260803` | fix/schema-drift-audit-20260803 | 0 | 0 | 2026-08-04 |
| `tmp/ss-equipment-v3-20260804` | claude/equipment-overhaul-20260804 | 0 | 0 | 2026-08-04 |
| `tmp/ss-launch-audit-lane3-20260803` | claude/launch-audit-lane3-20260803 | 0 | 0 | 2026-08-04 |
| `tmp/ss-nutrition-v1-20260804` | claude/nutrition-overhaul-20260804 | 0 | 0 | 2026-08-04 |
| `tmp/ss-painchart-v2-20260804` | claude/painchart-upgrade-20260804 | 0 | 0 | 2026-08-04 |
| `tmp/ss-secaudit-20260804` | claude/sec-schema-audit-20260804 | 0 | 0 | 2026-08-04 |
| `tmp/ss-swa87-main-20260729` | verify57 | 0 | 0 | 2026-08-04 |
| `tmp/sspt-recent-commits-hostile-20260803` | codex/recent-commits-hostile-20260803 | 0 | 0 | 2026-08-04 |
| `tmp/ss-launch-audit-lane2-20260803` | integrate/launch-audit-20260803 | 0 | 0 | 2026-08-05 |
| `tmp/ss-waiver-v4-20260804` | claude/waiver-overhaul-20260804 | 0 | 0 | 2026-08-05 |
| `tmp/ss-launch-audit-lane1-20260803` | claude/lateral-probe-20260805 | 0 | 0 | 2026-08-10 |
| `Users/BigotSmasher/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/45b0249b-52ad-45d9-b9bc-f9ecd285bdc1/scratchpad/main-audit` | feat/swa-138-ops-wave-final | 0 | 0 | 2026-08-10 |
| `tmp/ss-creator-local-video` | claude/creator-schema-hold-20260811 | 0 | 0 | 2026-08-12 |

## B. MERGED-DIRTY — 42 (merged, but hold UNCOMMITTED files that would be LOST)
| path | branch | ahead | dirty | last commit |
|---|---|---|---|---|
| `tmp/sspt-prelaunch-audit-20260716` | codex/prelaunch-audit-20260716 | 0 | 1361 | 2026-07-15 |
| `tmp/sspt-prelaunch-integration-20260716` | codex/prelaunch-integration-20260716 | 0 | 1336 | 2026-07-16 |
| `tmp/sspt-recursive-audit-slice1-20260629` | codex/recursive-audit-slice1-20260629 | 0 | 383 | 2026-06-28 |
| `tmp/sspt-comms-recovery-20260715` | codex/comms-recovery-20260715 | 0 | 191 | 2026-07-15 |
| `tmp/sspt-challenge-render-20260630` | codex/challenge-render-20260630 | 0 | 139 | 2026-06-30 |
| `tmp/ss-trainer-dash` | fix/trainer-dashboard-pixel | 0 | 133 | 2026-07-25 |
| `tmp/sspt-swan-lens-direction-a-release-20260801` | codex/swan-lens-direction-a-release-20260801 | 0 | 87 | 2026-08-01 |
| `tmp/sspt-nutrition-origin-main-20260625` | codex/nutrition-aaa-release-20260625 | 0 | 53 | 2026-06-25 |
| `Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/coach-hive-ui-20260809` | codex/coach-hive-ui-20260809 | 0 | 53 | 2026-08-06 |
| `tmp/sspt-swan-lens-runner-audit-20260801` | codex/swan-lens-runner-audit-20260801 | 0 | 51 | 2026-08-01 |
| `tmp/sspt-nutrition-staged-replay-20260626` | codex/nutrition-staged-replay-20260626 | 0 | 47 | 2026-06-25 |
| `tmp/sspt-hermes-privacy-router-20260731` | codex/hermes-privacy-router-20260731 | 0 | 45 | 2026-07-31 |
| `tmp/ss-fable-vision-20260705` | fable/vision-arc-20260705 | 0 | 39 | 2026-07-07 |
| `tmp/sspt-workout-unified-20260628` | codex/workout-unified-20260628 | 0 | 38 | 2026-06-27 |
| `tmp/sspt-lens-world-fusion-20260714` | codex/lens-world-fusion-20260714 | 0 | 34 | 2026-07-14 |
| `tmp/sspt-google-linking-20260730` | codex/google-linking-20260730 | 0 | 33 | 2026-07-30 |
| `tmp/sspt-coach-command-release-20260627` | codex/coach-command-center-pro-ux-20260627 | 0 | 30 | 2026-06-26 |
| `tmp/sspt-trainer-home-shell-release-20260625` | codex/trainer-home-shell-release-20260625 | 0 | 25 | 2026-06-25 |
| `tmp/ss-pt-four-surface-clean` | codex/user-dashboard-v3-style-ownership | 0 | 24 | 2026-05-09 |
| `tmp/ss-homepage-v2-20260804` | claude/homepage-redesign-20260804 | 0 | 19 | 2026-08-04 |
| `tmp/sspt-swan-design-brain-upgrade-20260809` | codex/swan-design-brain-upgrade-20260809 | 0 | 18 | 2026-08-06 |
| `tmp/ss-hermes-cosmic-os-20260807` | codex/hermes-cosmic-os-20260807 | 0 | 17 | 2026-08-06 |
| `tmp/ss-coach-hostile-fix-20260725` | codex/coach-hive-hostile-fixes-20260725 | 0 | 12 | 2026-07-25 |
| `tmp/sspt-jarvis-s2-20260731` | codex/jarvis-s2-vocab-bias-20260731 | 0 | 12 | 2026-08-01 |
| `tmp/sspt-recovery-mobbin-phase2-20260721` | codex/recovery-mobbin-phase2-20260721 | 0 | 11 | 2026-07-21 |
| `tmp/sspt-challenge-render-core-20260630` | codex/challenge-render-core-20260630 | 0 | 6 | 2026-06-30 |
| `tmp/ss-bootcamp-v2-20260731` | claude/bootcamp-v2-20260731 | 0 | 5 | 2026-08-04 |
| `tmp/sspt-swan-coach-voice-20260629` | codex/swan-coach-voice-20260629 | 0 | 5 | 2026-06-28 |
| `tmp/sspt-workout-suite-audit-20260709` | codex/workout-concept-lab-20260709 | 0 | 5 | 2026-07-09 |
| `tmp/sspt-arctic-dawn-contrast-20260715` | codex/arctic-dawn-contrast-20260715 | 0 | 4 | 2026-07-14 |
| `tmp/ss-launch-audit-lane4-20260803` | claude/launch-audit-lane4-20260803 | 0 | 3 | 2026-08-04 |
| `tmp/ss-pt-creative-release-20260625` | codex/creative-dashboard-release-20260625 | 0 | 3 | 2026-06-24 |
| `tmp/ss-brain-20260708` | claude/brain-cockpit-slice2-20260708 | 0 | 2 | 2026-07-10 |
| `tmp/ss-trust-triple-20260706` | claude/wave16-compliance-buttons-20260706 | 0 | 2 | 2026-07-06 |
| `tmp/sspt-client-onboarding-handoff-20260628` | codex/client-onboarding-handoff-20260628 | 0 | 2 | 2026-06-27 |
| `tmp/ss-build-swan-lens` | claude/build-swan-lens | 0 | 1 | 2026-07-30 |
| `tmp/ss-kimi-blueprints-20260717` | claude/kimi-design-blueprints-20260717 | 0 | 1 | 2026-07-17 |
| `tmp/ss-lane1-20260713` | claude/lane1-batch2-20260713 | 0 | 1 | 2026-07-13 |
| `tmp/ss-pt-workout-clienthub-unify` | codex/workout-clienthub-unify | 0 | 1 | 2026-06-21 |
| `tmp/ss-social-distribution` | claude/social-distribution-plan-20260811 | 0 | 1 | 2026-08-10 |
| `tmp/sspt-codex-launch-core-20260728` | codex/launch-core-audit-20260728 | 0 | 1 | 2026-07-28 |
| `tmp/sspt-user-dashboard-carousel-pan-20260626` | codex/user-dashboard-carousel-pan-release-20260626 | 0 | 1 | 2026-06-26 |

## C. UNMERGED — 37 (real WIP ahead of origin/main — DO NOT TOUCH)
| path | branch | ahead | dirty | last commit |
|---|---|---|---|---|
| `tmp/ss-launch-audit-lane5-20260803` | claude/launch-audit-lane5-20260803 | 35 | 0 | 2026-08-04 |
| `tmp/sspt-verify-until-dry-20260808` | codex/verify-until-dry-20260808 | 22 | 0 | 2026-08-09 |
| `tmp/ss-badge-forge-20260804` | claude/badge-forge-20260804 | 16 | 0 | 2026-08-04 |
| `tmp/sspt-native-mobile-20260714` | codex/native-mobile-20260714 | 13 | 0 | 2026-07-14 |
| `tmp/swan-cardiac-clamp` | fix/cardiac-phase-clamp | 10 | 0 | 2026-08-04 |
| `tmp/ss-econ-s1` | feat/trainer-economics-s1 | 7 | 0 | 2026-07-24 |
| `tmp/ss-mega-audit-20260715` | claude/mega-audit-20260715 | 6 | 0 | 2026-07-15 |
| `tmp/ss-arcb-batch1-20260722` | claude/arcb-mobbin-batch1-20260722 | 5 | 2 | 2026-07-22 |
| `tmp/ss-coach-audit` | claude/swancoach-operator-blueprint-20260722 | 5 | 3 | 2026-07-22 |
| `tmp/sspt-mobbin-resume-proof-20260719` | codex/mobbin-resume-proof-20260719 | 5 | 0 | 2026-07-19 |
| `tmp/sspt-qwen-kimi-privacy-20260726` | codex/qwen-kimi-privacy-review-20260726 | 5 | 0 | 2026-07-26 |
| `Users/BigotSmasher/Desktop/quick-pt/SS-PT/.claude/worktrees/unified-world-gallery-2026-07-16` | worktree-unified-world-gallery-2026-07-16 | 5 | 1 | 2026-07-17 |
| `Users/BigotSmasher/Desktop/quick-pt/SS-PT-context-gateway` | feat/swan-context-gateway | 5 | 1 | 2026-07-29 |
| `tmp/ss-swan-collect-20260812` | claude/swan-collect-scout-20260812 | 4 | 0 | 2026-08-12 |
| `tmp/ss-apex` | feat/apex-dashboard-redesign | 3 | 0 | 2026-07-10 |
| `tmp/ss-qa-harness-slice0` | claude/qa-harness-slice0-20260811 | 3 | 1 | 2026-08-12 |
| `tmp/ss-lane-v2-20260812` | claude/lane-v2-20260812 | 2 | 0 | 2026-08-12 |
| `tmp/ss-swan-guide-20260716` | claude/swan-guide-20260716 | 2 | 0 | 2026-07-16 |
| `tmp/sspt-context-gateway-20260721` | codex/context-gateway-phase0-20260721 | 2 | 15 | 2026-07-21 |
| `tmp/sspt-cortex-p1` | codex/cortex-phase1 | 2 | 6 | 2026-07-14 |
| `tmp/sspt-opus-then-kimi-20260725` | codex/opus-then-kimi-review-20260725 | 2 | 5 | 2026-07-26 |
| `tmp/sspt-planhome-20260711` | claude/client-plan-home-2026-07-11 | 2 | 1196 | 2026-07-11 |
| `Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/mobbin-governance` | codex/mobbin-governance-loop-20260719 | 2 | 0 | 2026-07-19 |
| `tmp/ss-bootcamp-s2-reintegrate-20260802` | claude/bootcamp-s2-reintegrate-20260802 | 1 | 0 | 2026-08-02 |
| `tmp/ss-coach-cc-20260716` | claude/coach-command-center-rebuild-20260716 | 1 | 1 | 2026-07-17 |
| `tmp/ss-coach-cc-v2-20260717` | claude/codex-findings-20260717 | 1 | 0 | 2026-07-17 |
| `tmp/ss-recovery-compass` | claude/recovery-compass-20260721 | 1 | 0 | 2026-07-21 |
| `tmp/ss-store-inquiry` | claude/store-inquiry-button | 1 | 0 | 2026-07-11 |
| `tmp/ss-world-engine-20260712` | codex/world-engine-20260712 | 1 | 9 | 2026-07-14 |
| `tmp/sspt-coach-v2-hostile-20260717` | codex/coach-v2-hostile-20260717 | 1 | 9 | 2026-07-16 |
| `tmp/sspt-degate-design-20260721` | codex/degate-design-overhaul-20260721 | 1 | 0 | 2026-07-21 |
| `tmp/sspt-fable-canonical-final-20260715` | codex/fable-canonical-plan-final-20260715 | 1 | 0 | 2026-07-15 |
| `tmp/sspt-five-day-hostile-review-20260712` | codex/five-day-hostile-review-20260712 | 1 | 0 | 2026-07-12 |
| `tmp/sspt-mcp-lifecycle-20260808` | codex/mcp-lifecycle-hygiene-20260808 | 1 | 0 | 2026-08-09 |
| `tmp/sspt-messaging-group-release-20260626` | codex/messaging-group-release-20260626 | 1 | 18 | 2026-06-25 |
| `tmp/sspt-speed-to-lead-email-20260716` | claude/speed-to-lead-email | 1 | 0 | 2026-07-16 |
| `tmp/swan-brain-v2` | feat/swan-brain-v2-atelier | 1 | 2 | 2026-08-12 |

## D. DETACHED — 28 (no branch; ahead-ness not computable)
| path | branch | ahead | dirty | last commit |
|---|---|---|---|---|
| `tmp/ss-autoreview` | (detached) | — | 0 | 2026-08-06 |
| `tmp/ss-lens-finish-20260714` | (detached) | — | 1 | 2026-07-20 |
| `tmp/ss-main-audit` | (detached) | — | 0 | 2026-08-10 |
| `tmp/ss-pt-client-dashboard-release-20260623-01` | (detached) | — | 15 | 2026-06-22 |
| `tmp/ss-pt-client-dashboard-release-20260623-03` | (detached) | — | 6 | 2026-06-22 |
| `tmp/ss-pt-review-pr7-merge` | (detached) | — | 31 | 2026-06-21 |
| `tmp/ss-pt-review-pr8-merge` | (detached) | — | 2 | 2026-06-21 |
| `tmp/ss-pt-review-pr8-merge2` | (detached) | — | 2 | 2026-06-21 |
| `tmp/ss-pt-user-dashboard-restore-20260623` | (detached) | — | 4 | 2026-06-22 |
| `tmp/ss-pt-video-library-v3-release-20260623` | (detached) | — | 2 | 2026-06-22 |
| `tmp/ss-user-dashboard-audit-20260714` | (detached) | — | 7 | 2026-07-14 |
| `tmp/sspt-base` | (detached) | — | 0 | 2026-07-11 |
| `tmp/sspt-coach-release-20260630-111620` | (detached) | — | 1 | 2026-06-30 |
| `tmp/sspt-coderabbit-codex-slice-20260708` | (detached) | — | 12 | 2026-07-05 |
| `tmp/sspt-dash-audit-20260713` | (detached) | — | 0 | 2026-07-13 |
| `tmp/sspt-dashboard-fable-audit-20260704` | (detached) | — | 1 | 2026-07-04 |
| `tmp/sspt-degate-baseline-20260721` | (detached) | — | 0 | 2026-07-21 |
| `tmp/sspt-fable-training-plan-review-20260715-wt` | (detached) | — | 100 | 2026-07-15 |
| `tmp/sspt-kimi-after-opus-20260726` | (detached) | — | 0 | 2026-07-26 |
| `tmp/sspt-mobbin-proof-origin-main-20260719` | (detached) | — | 2 | 2026-07-19 |
| `tmp/sspt-nutrition-staged-review-20260625-01` | (detached) | — | 108 | 2026-06-22 |
| `tmp/sspt-pr18-render-mergecheck-20260702` | (detached) | — | 16 | 2026-07-01 |
| `tmp/sspt-render-hostile-20260718` | (detached) | — | 0 | 2026-07-18 |
| `tmp/sspt-render-postreview-20260719` | (detached) | — | 0 | 2026-07-19 |
| `tmp/sspt-style-lens-village-20260711` | (detached) | — | 4 | 2026-07-11 |
| `Users/BigotSmasher/.hermes/runner-repo` | (detached) | — | 0 | 2026-07-29 |
| `Users/BigotSmasher/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/99b24a8a-bf2c-4b79-8876-0c48f5596d3c/scratchpad/main-audit` | (detached) | — | 0 | 2026-08-04 |
| `Users/BigotSmasher/AppData/Local/Temp/lane4-baseline` | (detached) | — | 0 | 2026-08-02 |

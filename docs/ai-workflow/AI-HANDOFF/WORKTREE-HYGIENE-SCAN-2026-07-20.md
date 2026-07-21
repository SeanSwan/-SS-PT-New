---
decision: 111 worktrees inventoried — 47 merged+clean likely removable pending Phase 2 approval; 41 ambiguous; 23 unmerged kept
status: open
supersedes: none
---
# Worktree Graveyard — Hygiene Scan (Phase 1, NON-DESTRUCTIVE) — 2026-07-20

> Rule 32/33/34 inventory. **Nothing was moved or deleted.** Classification is evidence-based (merge-ancestry vs `origin/main` + working-tree dirtiness at scan time). Execution of ANY removal is a separate Phase 2 pass requiring Sean's explicit approval. Worktrees marked LIKELY-REMOVABLE are "likely deletion candidates pending Phase 2 approval" — final reference check (`git worktree remove` without `--force`, which refuses dirty trees) still applies per worktree.
> **Totals: 111 worktrees · 47 MERGED+CLEAN (likely removable) · 41 MERGED but dirty/missing-dir (ambiguous — uncommitted local changes or stale registration) · 23 UNMERGED (keep/review — may hold unshipped work).**
> Suggested Phase 2 command per approved row: `git worktree remove <path>` (no --force) then `git worktree prune`. Branches deletable only after their own unmerged check.

## MERGED + CLEAN — likely removable pending approval (47)
| worktree | branch | last commit | dirty files |
|---|---|---|---|
| C:/tmp/ss-auditdoc | claude/secfix-auditdoc-20260716 | 2026-07-16 | 0 |
| C:/tmp/ss-brain-fable-20260707 | claude/second-brain-fable-mode-20260707 | 2026-07-08 | 0 |
| C:/tmp/ss-cortex-audit | claude/cortex-p0-safety-20260712 | 2026-07-12 | 0 |
| C:/tmp/ss-ctp-ship-20260716 | main | 2026-07-16 | 0 |
| C:/tmp/ss-dash-batch-20260713 | claude/dashboard-batch-20260713 | 2026-07-13 | 0 |
| C:/tmp/ss-dictation-20260714 | claude/dictation-planner-logger-20260714 | 2026-07-15 | 0 |
| C:/tmp/ss-equipment-slice1 | claude/equipment-p0-safety | 2026-07-11 | 0 |
| C:/tmp/ss-hermes-os-visual-20260711 | codex/hermes-os-visual-20260711 | 2026-07-11 | 0 |
| C:/tmp/ss-hostile-audit-20260715 | claude/hostile-audit-20260715 | 2026-07-16 | 0 |
| C:/tmp/ss-lens-vision-20260711 | claude/lens-vision-20260711 | 2026-07-12 | 0 |
| C:/tmp/ss-logger-handoff-20260718 | feat/logger-post-save-handoff | 2026-07-20 | 0 |
| C:/tmp/ss-marketing-epic1 | feat/consult-cta | 2026-07-11 | 0 |
| C:/tmp/ss-plan-pdf-rename | claude/plan-pdf-swan-coach-rename | 2026-07-10 | 0 |
| C:/tmp/ss-planpdf-20260714 | claude/plan-pdf-swap-20260714 | 2026-07-14 | 0 |
| C:/tmp/ss-progress-delta-20260708 | claude/progress-delta-20260708 | 2026-07-09 | 0 |
| C:/tmp/ss-proof-card-20260721 | claude/completion-proof-card-20260721 | 2026-07-20 | 0 |
| C:/tmp/ss-quality-arc-20260712 | claude/quality-arc-20260712 | 2026-07-12 | 0 |
| C:/tmp/ss-review-loop | claude/heatmap-local-admin-reg-20260712 | 2026-07-12 | 0 |
| C:/tmp/ss-social-groups-20260714 | claude/social-groups-20260714 | 2026-07-15 | 0 |
| C:/tmp/ss-storefront-deals | claude/storefront-custom-deals-20260708 | 2026-07-12 | 0 |
| C:/tmp/ss-world-engine-release-20260714 | codex/world-engine-release-20260714 | 2026-07-14 | 0 |
| C:/tmp/sspt-canonical-training-plan-20260715 | codex/canonical-training-plan-20260715 | 2026-07-16 | 0 |
| C:/tmp/sspt-chat-400-20260712 | codex/chat-message-400-20260712 | 2026-07-12 | 0 |
| C:/tmp/sspt-client-export-hostile-20260715 | codex/client-export-hostile-20260715 | 2026-07-15 | 0 |
| C:/tmp/sspt-coach-client-notebook-20260709 | codex/coach-client-notebook-voice-20260709 | 2026-07-10 | 0 |
| C:/tmp/sspt-coach-command-center-20260709 | codex/coach-command-center-20260709 | 2026-07-09 | 0 |
| C:/tmp/sspt-coach-mobile-20260713 | codex/coach-mobile-20260713 | 2026-07-13 | 0 |
| C:/tmp/sspt-dash-audit-20260713 | DETACHED | 2026-07-13 | 0 |
| C:/tmp/sspt-five-day-hostile-release-20260712 | codex/five-day-hostile-release-20260712 | 2026-07-12 | 0 |
| C:/tmp/sspt-hermes-closeout-hook-20260711 | claude/self-review-fixes-20260712 | 2026-07-11 | 0 |
| C:/tmp/sspt-hostile-review-20260712 | codex/hostile-review-reconciliation-20260712 | 2026-07-12 | 0 |
| C:/tmp/sspt-nutrition-hotfile-20260709 | codex/nutrition-hotfile-review-20260709 | 2026-07-09 | 0 |
| C:/tmp/sspt-nutrition-render-20260709 | codex/nutrition-decision-logger-render-20260709 | 2026-07-09 | 0 |
| C:/tmp/sspt-nutrition-seven-star-20260709 | codex/nutrition-seven-star-20260709 | 2026-07-10 | 0 |
| C:/tmp/sspt-order-reconcile-20260713 | claude/trainer-compensation-20260714 | 2026-07-14 | 0 |
| C:/tmp/sspt-pdf-a1b2-20260710 | claude/pdf-white-label-a1b2-2026-07-10 | 2026-07-11 | 0 |
| C:/tmp/sspt-ph | claude/client-plan-home-v2 | 2026-07-12 | 0 |
| C:/tmp/sspt-prelaunch-integration-v2-20260716 | codex/prelaunch-integration-v2-20260716 | 2026-07-17 | 0 |
| C:/tmp/sspt-recent-commit-hostile-20260719 | codex/recent-commit-hostile-20260719 | 2026-07-19 | 0 |
| C:/tmp/sspt-render-hostile-20260718 | DETACHED | 2026-07-18 | 0 |
| C:/tmp/sspt-render-postreview-20260719 | DETACHED | 2026-07-19 | 0 |
| C:/tmp/sspt-style-lens-os-build-20260711 | codex/style-lens-os-foundation-20260711 | 2026-07-11 | 0 |
| C:/tmp/sspt-swan-support-report-room-20260716 | codex/swan-support-report-room-20260716 | 2026-07-16 | 0 |
| C:/tmp/sspt-unified-brain-20260715 | codex/unified-brain-20260715 | 2026-07-16 | 0 |
| C:/tmp/sspt-workout-design-lab-25views-20260710 | codex/workout-design-lab-25views-20260710 | 2026-07-10 | 0 |
| C:/tmp/sspt-workout-design-lab-release | codex/workout-design-lab-release | 2026-07-10 | 0 |
| C:/Users/BigotSmasher/.hermes/runner-repo | DETACHED | 2026-07-11 | 0 |

## MERGED but DIRTY or MISSING-DIR — ambiguous, do not touch without per-tree review (41)
| worktree | branch | last commit | state | dirty files |
|---|---|---|---|---|
| C:/tmp/ss-brain-20260708 | claude/brain-cockpit-slice2-20260708 | 2026-07-10 | exists | 2 |
| C:/tmp/ss-build-swan-lens | claude/build-swan-lens | 2026-07-20 | exists | 1 |
| C:/tmp/ss-fable-vision-20260705 | fable/vision-arc-20260705 | 2026-07-07 | exists | 39 |
| C:/tmp/ss-kimi-blueprints-20260717 | claude/kimi-design-blueprints-20260717 | 2026-07-17 | exists | 1 |
| C:/tmp/ss-lane1-20260713 | claude/lane1-batch2-20260713 | 2026-07-13 | exists | 1 |
| C:/tmp/ss-lens-finish-20260714 | DETACHED | 2026-07-20 | exists | 1 |
| C:/tmp/ss-pt-client-dashboard-release-20260623-01 | DETACHED | 2026-06-22 | exists | 15 |
| C:/tmp/ss-pt-client-dashboard-release-20260623-03 | DETACHED | 2026-06-22 | exists | 6 |
| C:/tmp/ss-pt-creative-release-20260625 | codex/creative-dashboard-release-20260625 | 2026-06-24 | exists | 3 |
| C:/tmp/ss-pt-four-surface-clean | codex/user-dashboard-v3-style-ownership | 2026-05-09 | exists | 24 |
| C:/tmp/ss-pt-review-pr7-merge | DETACHED | 2026-06-21 | exists | 31 |
| C:/tmp/ss-pt-review-pr8-merge | DETACHED | 2026-06-21 | exists | 2 |
| C:/tmp/ss-pt-review-pr8-merge2 | DETACHED | 2026-06-21 | exists | 2 |
| C:/tmp/ss-pt-user-dashboard-restore-20260623 | DETACHED | 2026-06-22 | exists | 4 |
| C:/tmp/ss-pt-video-library-v3-release-20260623 | DETACHED | 2026-06-22 | exists | 2 |
| C:/tmp/ss-pt-workout-clienthub-unify | codex/workout-clienthub-unify | 2026-06-21 | exists | 1 |
| C:/tmp/ss-trust-triple-20260706 | claude/wave16-compliance-buttons-20260706 | 2026-07-06 | exists | 2 |
| C:/tmp/ss-user-dashboard-audit-20260714 | DETACHED | 2026-07-14 | exists | 7 |
| C:/tmp/sspt-arctic-dawn-contrast-20260715 | codex/arctic-dawn-contrast-20260715 | 2026-07-14 | exists | 4 |
| C:/tmp/sspt-challenge-render-20260630 | codex/challenge-render-20260630 | 2026-06-30 | exists | 139 |
| C:/tmp/sspt-challenge-render-core-20260630 | codex/challenge-render-core-20260630 | 2026-06-30 | exists | 6 |
| C:/tmp/sspt-client-onboarding-handoff-20260628 | codex/client-onboarding-handoff-20260628 | 2026-06-27 | exists | 2 |
| C:/tmp/sspt-coach-command-release-20260627 | codex/coach-command-center-pro-ux-20260627 | 2026-06-26 | exists | 30 |
| C:/tmp/sspt-coach-release-20260630-111620 | DETACHED | 2026-06-30 | exists | 1 |
| C:/tmp/sspt-comms-recovery-20260715 | codex/comms-recovery-20260715 | 2026-07-15 | exists | 191 |
| C:/tmp/sspt-dashboard-fable-audit-20260704 | DETACHED | 2026-07-04 | exists | 1 |
| C:/tmp/sspt-fable-training-plan-review-20260715-wt | DETACHED | 2026-07-15 | exists | 100 |
| C:/tmp/sspt-lens-world-fusion-20260714 | codex/lens-world-fusion-20260714 | 2026-07-14 | exists | 34 |
| C:/tmp/sspt-mobbin-proof-origin-main-20260719 | DETACHED | 2026-07-19 | exists | 2 |
| C:/tmp/sspt-nutrition-origin-main-20260625 | codex/nutrition-aaa-release-20260625 | 2026-06-25 | exists | 53 |
| C:/tmp/sspt-nutrition-staged-replay-20260626 | codex/nutrition-staged-replay-20260626 | 2026-06-25 | exists | 47 |
| C:/tmp/sspt-pr18-render-mergecheck-20260702 | DETACHED | 2026-07-01 | exists | 16 |
| C:/tmp/sspt-prelaunch-audit-20260716 | codex/prelaunch-audit-20260716 | 2026-07-15 | exists | 1361 |
| C:/tmp/sspt-prelaunch-integration-20260716 | codex/prelaunch-integration-20260716 | 2026-07-16 | exists | 1336 |
| C:/tmp/sspt-recursive-audit-slice1-20260629 | codex/recursive-audit-slice1-20260629 | 2026-06-28 | exists | 383 |
| C:/tmp/sspt-style-lens-village-20260711 | DETACHED | 2026-07-11 | exists | 4 |
| C:/tmp/sspt-swan-coach-voice-20260629 | codex/swan-coach-voice-20260629 | 2026-06-28 | exists | 5 |
| C:/tmp/sspt-trainer-home-shell-release-20260625 | codex/trainer-home-shell-release-20260625 | 2026-06-25 | exists | 25 |
| C:/tmp/sspt-user-dashboard-carousel-pan-20260626 | codex/user-dashboard-carousel-pan-release-20260626 | 2026-06-26 | exists | 1 |
| C:/tmp/sspt-workout-suite-audit-20260709 | codex/workout-concept-lab-20260709 | 2026-07-09 | exists | 5 |
| C:/tmp/sspt-workout-unified-20260628 | codex/workout-unified-20260628 | 2026-06-27 | exists | 38 |

## UNMERGED — keep / review for unshipped work (23)
| worktree | branch | last commit | state | dirty files |
|---|---|---|---|---|
| C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT | wip/comms-notifications-2026-07-05 | 2026-07-20 | exists | 1104 |
| C:/tmp/ss-apex | feat/apex-dashboard-redesign | 2026-07-10 | exists | 0 |
| C:/tmp/ss-coach-cc-20260716 | claude/coach-command-center-rebuild-20260716 | 2026-07-17 | exists | 1 |
| C:/tmp/ss-coach-cc-v2-20260717 | claude/codex-findings-20260717 | 2026-07-17 | exists | 0 |
| C:/tmp/ss-dry-loop-20260720 | claude/dry-loop-fixes-20260720 | 2026-07-20 | exists | 0 |
| C:/tmp/ss-mega-audit-20260715 | claude/mega-audit-20260715 | 2026-07-15 | exists | 0 |
| C:/tmp/ss-store-inquiry | claude/store-inquiry-button | 2026-07-11 | exists | 0 |
| C:/tmp/ss-swan-guide-20260716 | claude/swan-guide-20260716 | 2026-07-16 | exists | 0 |
| C:/tmp/ss-world-engine-20260712 | codex/world-engine-20260712 | 2026-07-14 | exists | 9 |
| C:/tmp/sspt-base | DETACHED | 2026-07-11 | exists | 0 |
| C:/tmp/sspt-coach-v2-hostile-20260717 | codex/coach-v2-hostile-20260717 | 2026-07-16 | exists | 9 |
| C:/tmp/sspt-coderabbit-codex-slice-20260708 | DETACHED | 2026-07-05 | exists | 12 |
| C:/tmp/sspt-cortex-p1 | codex/cortex-phase1 | 2026-07-14 | exists | 6 |
| C:/tmp/sspt-fable-canonical-final-20260715 | codex/fable-canonical-plan-final-20260715 | 2026-07-15 | exists | 0 |
| C:/tmp/sspt-five-day-hostile-review-20260712 | codex/five-day-hostile-review-20260712 | 2026-07-12 | exists | 0 |
| C:/tmp/sspt-messaging-group-release-20260626 | codex/messaging-group-release-20260626 | 2026-06-25 | exists | 18 |
| C:/tmp/sspt-mobbin-resume-proof-20260719 | codex/mobbin-resume-proof-20260719 | 2026-07-19 | exists | 0 |
| C:/tmp/sspt-native-mobile-20260714 | codex/native-mobile-20260714 | 2026-07-14 | exists | 0 |
| C:/tmp/sspt-nutrition-staged-review-20260625-01 | DETACHED | 2026-06-22 | exists | 108 |
| C:/tmp/sspt-planhome-20260711 | claude/client-plan-home-2026-07-11 | 2026-07-11 | exists | 1196 |
| C:/tmp/sspt-speed-to-lead-email-20260716 | claude/speed-to-lead-email | 2026-07-16 | exists | 0 |
| C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/.claude/worktrees/unified-world-gallery-2026-07-16 | worktree-unified-world-gallery-2026-07-16 | 2026-07-17 | exists | 1 |
| C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/mobbin-governance | codex/mobbin-governance-loop-20260719 | 2026-07-19 | exists | 0 |

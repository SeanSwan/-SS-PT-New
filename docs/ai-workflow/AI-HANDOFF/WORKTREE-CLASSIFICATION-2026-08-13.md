# Worktree classification — 2026-08-13T06:38:37.042Z

READ-ONLY. Nothing removed. Each row carries the proof a removal decision needs.

Main tree: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`
Total: 115 (main + 114 linked)

| class | count | what removal costs |
|---|---:|---|
| A — merged, clean | 4 | nothing: every commit is on origin/main, no uncommitted files |
| B — merged, DIRTY | 44 | 4247 uncommitted files, unrecoverable without an archive ref |
| C — unmerged | 35 | 177 commits not on origin/main |
| D — detached | 31 | ahead-ness not computable; needs per-item inspection |

## A — merged & clean (removable with one batch yes)

| worktree | branch | ahead | dirty | untracked | last commit | removal proof |
|---|---|---:|---:|---:|---|---|
| `tmp/ss-mediasync` | claude/media-sync-20260812 | 0 | 0 | 0 | 2026-08-12 | `git log origin/main..branch` empty AND clean → safe |
| `tmp/ss-publish-truth-land` | claude/publish-truth-p0-land | 0 | 0 | 0 | 2026-08-12 | `git log origin/main..branch` empty AND clean → safe |
| `tmp/ss-retry-land` | claude/publish-retry-land | 0 | 0 | 0 | 2026-08-12 | `git log origin/main..branch` empty AND clean → safe |
| `tmp/ss-swan-collect-20260812` | claude/swan-collect-scout-20260812 | 0 | 0 | 0 | 2026-08-12 | `git log origin/main..branch` empty AND clean → safe |

## B — merged but holding uncommitted work

**Do not batch-remove.** Each needs an archive ref or an explicit discard.

| worktree | branch | ahead | dirty | untracked | last commit | removal proof |
|---|---|---:|---:|---:|---|---|
| `tmp/sspt-prelaunch-audit-20260716` | codex/prelaunch-audit-20260716 | 0 | 1361 | 34 | 2026-07-15 | ARCHIVE FIRST — 1361 uncommitted (34 untracked) |
| `tmp/sspt-prelaunch-integration-20260716` | codex/prelaunch-integration-20260716 | 0 | 1336 | 0 | 2026-07-16 | ARCHIVE FIRST — 1336 uncommitted (0 untracked) |
| `tmp/sspt-recursive-audit-slice1-20260629` | codex/recursive-audit-slice1-20260629 | 0 | 383 | 88 | 2026-06-28 | ARCHIVE FIRST — 383 uncommitted (88 untracked) |
| `tmp/sspt-comms-recovery-20260715` | codex/comms-recovery-20260715 | 0 | 191 | 123 | 2026-07-15 | ARCHIVE FIRST — 191 uncommitted (123 untracked) |
| `tmp/sspt-challenge-render-20260630` | codex/challenge-render-20260630 | 0 | 139 | 74 | 2026-06-30 | ARCHIVE FIRST — 139 uncommitted (74 untracked) |
| `tmp/ss-trainer-dash` | fix/trainer-dashboard-pixel | 0 | 133 | 64 | 2026-07-25 | ARCHIVE FIRST — 133 uncommitted (64 untracked) |
| `tmp/sspt-swan-lens-direction-a-release-20260801` | codex/swan-lens-direction-a-release-20260801 | 0 | 87 | 27 | 2026-08-01 | ARCHIVE FIRST — 87 uncommitted (27 untracked) |
| `tmp/sspt-nutrition-origin-main-20260625` | codex/nutrition-aaa-release-20260625 | 0 | 53 | 0 | 2026-06-25 | ARCHIVE FIRST — 53 uncommitted (0 untracked) |
| `Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/coach-hive-ui-20260809` | codex/coach-hive-ui-20260809 | 0 | 53 | 23 | 2026-08-06 | ARCHIVE FIRST — 53 uncommitted (23 untracked) |
| `tmp/sspt-swan-lens-runner-audit-20260801` | codex/swan-lens-runner-audit-20260801 | 0 | 51 | 0 | 2026-08-01 | ARCHIVE FIRST — 51 uncommitted (0 untracked) |
| `tmp/sspt-nutrition-staged-replay-20260626` | codex/nutrition-staged-replay-20260626 | 0 | 47 | 0 | 2026-06-25 | ARCHIVE FIRST — 47 uncommitted (0 untracked) |
| `tmp/sspt-hermes-privacy-router-20260731` | codex/hermes-privacy-router-20260731 | 0 | 45 | 39 | 2026-07-31 | ARCHIVE FIRST — 45 uncommitted (39 untracked) |
| `tmp/ss-fable-vision-20260705` | fable/vision-arc-20260705 | 0 | 39 | 1 | 2026-07-07 | ARCHIVE FIRST — 39 uncommitted (1 untracked) |
| `tmp/sspt-workout-unified-20260628` | codex/workout-unified-20260628 | 0 | 38 | 6 | 2026-06-27 | ARCHIVE FIRST — 38 uncommitted (6 untracked) |
| `tmp/sspt-lens-world-fusion-20260714` | codex/lens-world-fusion-20260714 | 0 | 34 | 20 | 2026-07-14 | ARCHIVE FIRST — 34 uncommitted (20 untracked) |
| `tmp/sspt-google-linking-20260730` | codex/google-linking-20260730 | 0 | 33 | 8 | 2026-07-30 | ARCHIVE FIRST — 33 uncommitted (8 untracked) |
| `tmp/sspt-coach-command-release-20260627` | codex/coach-command-center-pro-ux-20260627 | 0 | 30 | 0 | 2026-06-26 | ARCHIVE FIRST — 30 uncommitted (0 untracked) |
| `tmp/sspt-trainer-home-shell-release-20260625` | codex/trainer-home-shell-release-20260625 | 0 | 25 | 1 | 2026-06-25 | ARCHIVE FIRST — 25 uncommitted (1 untracked) |
| `tmp/ss-pt-four-surface-clean` | codex/user-dashboard-v3-style-ownership | 0 | 24 | 2 | 2026-05-09 | ARCHIVE FIRST — 24 uncommitted (2 untracked) |
| `tmp/ss-homepage-v2-20260804` | claude/homepage-redesign-20260804 | 0 | 19 | 3 | 2026-08-04 | ARCHIVE FIRST — 19 uncommitted (3 untracked) |
| `tmp/sspt-swan-design-brain-upgrade-20260809` | codex/swan-design-brain-upgrade-20260809 | 0 | 18 | 14 | 2026-08-06 | ARCHIVE FIRST — 18 uncommitted (14 untracked) |
| `tmp/ss-hermes-cosmic-os-20260807` | codex/hermes-cosmic-os-20260807 | 0 | 17 | 4 | 2026-08-06 | ARCHIVE FIRST — 17 uncommitted (4 untracked) |
| `tmp/ss-coach-hostile-fix-20260725` | codex/coach-hive-hostile-fixes-20260725 | 0 | 12 | 1 | 2026-07-25 | ARCHIVE FIRST — 12 uncommitted (1 untracked) |
| `tmp/sspt-jarvis-s2-20260731` | codex/jarvis-s2-vocab-bias-20260731 | 0 | 12 | 12 | 2026-08-01 | ARCHIVE FIRST — 12 uncommitted (12 untracked) |
| `tmp/sspt-recovery-mobbin-phase2-20260721` | codex/recovery-mobbin-phase2-20260721 | 0 | 11 | 8 | 2026-07-21 | ARCHIVE FIRST — 11 uncommitted (8 untracked) |
| `tmp/ss-qa-harness-slice0` | claude/qa-harness-slice0-20260811 | 0 | 9 | 3 | 2026-08-12 | ARCHIVE FIRST — 9 uncommitted (3 untracked) |
| `tmp/sspt-challenge-render-core-20260630` | codex/challenge-render-core-20260630 | 0 | 6 | 0 | 2026-06-30 | ARCHIVE FIRST — 6 uncommitted (0 untracked) |
| `tmp/ss-bootcamp-v2-20260731` | claude/bootcamp-v2-20260731 | 0 | 5 | 5 | 2026-08-04 | ARCHIVE FIRST — 5 uncommitted (5 untracked) |
| `tmp/sspt-swan-coach-voice-20260629` | codex/swan-coach-voice-20260629 | 0 | 5 | 2 | 2026-06-28 | ARCHIVE FIRST — 5 uncommitted (2 untracked) |
| `tmp/sspt-workout-suite-audit-20260709` | codex/workout-concept-lab-20260709 | 0 | 5 | 2 | 2026-07-09 | ARCHIVE FIRST — 5 uncommitted (2 untracked) |
| `tmp/sspt-arctic-dawn-contrast-20260715` | codex/arctic-dawn-contrast-20260715 | 0 | 4 | 1 | 2026-07-14 | ARCHIVE FIRST — 4 uncommitted (1 untracked) |
| `tmp/ss-launch-audit-lane4-20260803` | claude/launch-audit-lane4-20260803 | 0 | 3 | 2 | 2026-08-04 | ARCHIVE FIRST — 3 uncommitted (2 untracked) |
| `tmp/ss-pt-creative-release-20260625` | codex/creative-dashboard-release-20260625 | 0 | 3 | 0 | 2026-06-24 | ARCHIVE FIRST — 3 uncommitted (0 untracked) |
| `tmp/ss-publish-truth-20260812` | claude/publish-truth-p0-20260812 | 0 | 3 | 3 | 2026-08-12 | ARCHIVE FIRST — 3 uncommitted (3 untracked) |
| `tmp/ss-brain-20260708` | claude/brain-cockpit-slice2-20260708 | 0 | 2 | 0 | 2026-07-10 | ARCHIVE FIRST — 2 uncommitted (0 untracked) |
| `tmp/ss-trust-triple-20260706` | claude/wave16-compliance-buttons-20260706 | 0 | 2 | 2 | 2026-07-06 | ARCHIVE FIRST — 2 uncommitted (2 untracked) |
| `tmp/sspt-client-onboarding-handoff-20260628` | codex/client-onboarding-handoff-20260628 | 0 | 2 | 1 | 2026-06-27 | ARCHIVE FIRST — 2 uncommitted (1 untracked) |
| `tmp/ss-build-swan-lens` | claude/build-swan-lens | 0 | 1 | 1 | 2026-07-30 | ARCHIVE FIRST — 1 uncommitted (1 untracked) |
| `tmp/ss-kimi-blueprints-20260717` | claude/kimi-design-blueprints-20260717 | 0 | 1 | 1 | 2026-07-17 | ARCHIVE FIRST — 1 uncommitted (1 untracked) |
| `tmp/ss-lane1-20260713` | claude/lane1-batch2-20260713 | 0 | 1 | 1 | 2026-07-13 | ARCHIVE FIRST — 1 uncommitted (1 untracked) |
| `tmp/ss-pt-workout-clienthub-unify` | codex/workout-clienthub-unify | 0 | 1 | 1 | 2026-06-21 | ARCHIVE FIRST — 1 uncommitted (1 untracked) |
| `tmp/ss-social-distribution` | claude/social-distribution-plan-20260811 | 0 | 1 | 1 | 2026-08-10 | ARCHIVE FIRST — 1 uncommitted (1 untracked) |
| `tmp/sspt-codex-launch-core-20260728` | codex/launch-core-audit-20260728 | 0 | 1 | 1 | 2026-07-28 | ARCHIVE FIRST — 1 uncommitted (1 untracked) |
| `tmp/sspt-user-dashboard-carousel-pan-20260626` | codex/user-dashboard-carousel-pan-release-20260626 | 0 | 1 | 1 | 2026-06-26 | ARCHIVE FIRST — 1 uncommitted (1 untracked) |

## C — unmerged, real commits not on main

**Do not touch** without a per-branch decision.

| worktree | branch | ahead | dirty | untracked | last commit | removal proof |
|---|---|---:|---:|---:|---|---|
| `tmp/sspt-planhome-20260711` | claude/client-plan-home-2026-07-11 | 2 | 1196 | 244 | 2026-07-11 | ARCHIVE FIRST — 2 unmerged commit(s) |
| `tmp/sspt-messaging-group-release-20260626` | codex/messaging-group-release-20260626 | 1 | 18 | 0 | 2026-06-25 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/sspt-context-gateway-20260721` | codex/context-gateway-phase0-20260721 | 2 | 15 | 0 | 2026-07-21 | ARCHIVE FIRST — 2 unmerged commit(s) |
| `tmp/ss-world-engine-20260712` | codex/world-engine-20260712 | 1 | 9 | 1 | 2026-07-14 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/sspt-coach-v2-hostile-20260717` | codex/coach-v2-hostile-20260717 | 1 | 9 | 0 | 2026-07-16 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/ss-forge-variantrun` | claude/forge-variantrun-20260812 | 9 | 7 | 2 | 2026-08-12 | ARCHIVE FIRST — 9 unmerged commit(s) |
| `tmp/sspt-cortex-p1` | codex/cortex-phase1 | 2 | 6 | 3 | 2026-07-14 | ARCHIVE FIRST — 2 unmerged commit(s) |
| `tmp/sspt-opus-then-kimi-20260725` | codex/opus-then-kimi-review-20260725 | 2 | 5 | 3 | 2026-07-26 | ARCHIVE FIRST — 2 unmerged commit(s) |
| `tmp/ss-coach-audit` | claude/swancoach-operator-blueprint-20260722 | 5 | 3 | 1 | 2026-07-22 | ARCHIVE FIRST — 5 unmerged commit(s) |
| `tmp/ss-arcb-batch1-20260722` | claude/arcb-mobbin-batch1-20260722 | 5 | 2 | 0 | 2026-07-22 | ARCHIVE FIRST — 5 unmerged commit(s) |
| `Users/BigotSmasher/Desktop/quick-pt/SS-PT/.claude/worktrees/unified-world-gallery-2026-07-16` | worktree-unified-world-gallery-2026-07-16 | 5 | 1 | 1 | 2026-07-17 | ARCHIVE FIRST — 5 unmerged commit(s) |
| `Users/BigotSmasher/Desktop/quick-pt/SS-PT-context-gateway` | feat/swan-context-gateway | 5 | 1 | 0 | 2026-07-29 | ARCHIVE FIRST — 5 unmerged commit(s) |
| `tmp/ss-coach-cc-20260716` | claude/coach-command-center-rebuild-20260716 | 1 | 1 | 1 | 2026-07-17 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/ss-launch-audit-lane5-20260803` | claude/launch-audit-lane5-20260803 | 35 | 0 | 0 | 2026-08-04 | ARCHIVE FIRST — 35 unmerged commit(s) |
| `tmp/sspt-verify-until-dry-20260808` | codex/verify-until-dry-20260808 | 22 | 0 | 0 | 2026-08-09 | ARCHIVE FIRST — 22 unmerged commit(s) |
| `tmp/ss-badge-forge-20260804` | claude/badge-forge-20260804 | 16 | 0 | 0 | 2026-08-04 | ARCHIVE FIRST — 16 unmerged commit(s) |
| `tmp/sspt-native-mobile-20260714` | codex/native-mobile-20260714 | 13 | 0 | 0 | 2026-07-14 | ARCHIVE FIRST — 13 unmerged commit(s) |
| `tmp/swan-cardiac-clamp` | fix/cardiac-phase-clamp | 10 | 0 | 0 | 2026-08-04 | ARCHIVE FIRST — 10 unmerged commit(s) |
| `tmp/ss-econ-s1` | feat/trainer-economics-s1 | 7 | 0 | 0 | 2026-07-24 | ARCHIVE FIRST — 7 unmerged commit(s) |
| `tmp/ss-mega-audit-20260715` | claude/mega-audit-20260715 | 6 | 0 | 0 | 2026-07-15 | ARCHIVE FIRST — 6 unmerged commit(s) |
| `tmp/sspt-mobbin-resume-proof-20260719` | codex/mobbin-resume-proof-20260719 | 5 | 0 | 0 | 2026-07-19 | ARCHIVE FIRST — 5 unmerged commit(s) |
| `tmp/sspt-qwen-kimi-privacy-20260726` | codex/qwen-kimi-privacy-review-20260726 | 5 | 0 | 0 | 2026-07-26 | ARCHIVE FIRST — 5 unmerged commit(s) |
| `tmp/ss-apex` | feat/apex-dashboard-redesign | 3 | 0 | 0 | 2026-07-10 | ARCHIVE FIRST — 3 unmerged commit(s) |
| `tmp/ss-swan-guide-20260716` | claude/swan-guide-20260716 | 2 | 0 | 0 | 2026-07-16 | ARCHIVE FIRST — 2 unmerged commit(s) |
| `Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/mobbin-governance` | codex/mobbin-governance-loop-20260719 | 2 | 0 | 0 | 2026-07-19 | ARCHIVE FIRST — 2 unmerged commit(s) |
| `tmp/ss-bootcamp-s2-reintegrate-20260802` | claude/bootcamp-s2-reintegrate-20260802 | 1 | 0 | 0 | 2026-08-02 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/ss-coach-cc-v2-20260717` | claude/codex-findings-20260717 | 1 | 0 | 0 | 2026-07-17 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/ss-lane-v2-20260812` | claude/lane-v2-20260812 | 1 | 0 | 0 | 2026-08-12 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/ss-recovery-compass` | claude/recovery-compass-20260721 | 1 | 0 | 0 | 2026-07-21 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/ss-store-inquiry` | claude/store-inquiry-button | 1 | 0 | 0 | 2026-07-11 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/sspt-degate-design-20260721` | codex/degate-design-overhaul-20260721 | 1 | 0 | 0 | 2026-07-21 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/sspt-fable-canonical-final-20260715` | codex/fable-canonical-plan-final-20260715 | 1 | 0 | 0 | 2026-07-15 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/sspt-five-day-hostile-review-20260712` | codex/five-day-hostile-review-20260712 | 1 | 0 | 0 | 2026-07-12 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/sspt-mcp-lifecycle-20260808` | codex/mcp-lifecycle-hygiene-20260808 | 1 | 0 | 0 | 2026-08-09 | ARCHIVE FIRST — 1 unmerged commit(s) |
| `tmp/sspt-speed-to-lead-email-20260716` | claude/speed-to-lead-email | 1 | 0 | 0 | 2026-07-16 | ARCHIVE FIRST — 1 unmerged commit(s) |

## D — detached HEAD

Ahead-ness is not answerable by ref comparison; inspect individually.

| worktree | branch | ahead | dirty | untracked | last commit | removal proof |
|---|---|---:|---:|---:|---|---|
| `tmp/sspt-nutrition-staged-review-20260625-01` | (detached) | — | 108 | 0 | 2026-06-22 | inspect: detached, no branch |
| `tmp/sspt-fable-training-plan-review-20260715-wt` | (detached) | — | 100 | 7 | 2026-07-15 | inspect: detached, no branch |
| `tmp/sspt-gpt-claude-review-20260812` | (detached) | — | 32 | 13 | 2026-08-12 | inspect: detached, no branch |
| `tmp/ss-pt-review-pr7-merge` | (detached) | — | 31 | 0 | 2026-06-21 | inspect: detached, no branch |
| `tmp/sspt-pr18-render-mergecheck-20260702` | (detached) | — | 16 | 0 | 2026-07-01 | inspect: detached, no branch |
| `tmp/ss-pt-client-dashboard-release-20260623-01` | (detached) | — | 15 | 12 | 2026-06-22 | inspect: detached, no branch |
| `tmp/sspt-coderabbit-codex-slice-20260708` | (detached) | — | 12 | 0 | 2026-07-05 | inspect: detached, no branch |
| `tmp/sspt-site-audit-20260812` | (detached) | — | 9 | 9 | 2026-08-12 | inspect: detached, no branch |
| `tmp/ss-user-dashboard-audit-20260714` | (detached) | — | 7 | 7 | 2026-07-14 | inspect: detached, no branch |
| `tmp/ss-pt-client-dashboard-release-20260623-03` | (detached) | — | 6 | 0 | 2026-06-22 | inspect: detached, no branch |
| `tmp/ss-pt-user-dashboard-restore-20260623` | (detached) | — | 4 | 0 | 2026-06-22 | inspect: detached, no branch |
| `tmp/sspt-style-lens-village-20260711` | (detached) | — | 4 | 4 | 2026-07-11 | inspect: detached, no branch |
| `tmp/ss-pt-review-pr8-merge` | (detached) | — | 2 | 0 | 2026-06-21 | inspect: detached, no branch |
| `tmp/ss-pt-review-pr8-merge2` | (detached) | — | 2 | 0 | 2026-06-21 | inspect: detached, no branch |
| `tmp/ss-pt-video-library-v3-release-20260623` | (detached) | — | 2 | 2 | 2026-06-22 | inspect: detached, no branch |
| `tmp/sspt-mobbin-proof-origin-main-20260719` | (detached) | — | 2 | 2 | 2026-07-19 | inspect: detached, no branch |
| `tmp/ss-lens-finish-20260714` | (detached) | — | 1 | 1 | 2026-07-20 | inspect: detached, no branch |
| `tmp/sspt-coach-release-20260630-111620` | (detached) | — | 1 | 0 | 2026-06-30 | inspect: detached, no branch |
| `tmp/sspt-dashboard-fable-audit-20260704` | (detached) | — | 1 | 1 | 2026-07-04 | inspect: detached, no branch |
| `tmp/ss-autoreview` | (detached) | — | 0 | 0 | 2026-08-06 | inspect: detached, no branch |
| `tmp/ss-coach-gate0-20260812` | (detached) | — | 0 | 0 | 2026-08-12 | inspect: detached, no branch |
| `tmp/ss-main-audit` | (detached) | — | 0 | 0 | 2026-08-10 | inspect: detached, no branch |
| `tmp/sspt-base` | (detached) | — | 0 | 0 | 2026-07-11 | inspect: detached, no branch |
| `tmp/sspt-dash-audit-20260713` | (detached) | — | 0 | 0 | 2026-07-13 | inspect: detached, no branch |
| `tmp/sspt-degate-baseline-20260721` | (detached) | — | 0 | 0 | 2026-07-21 | inspect: detached, no branch |
| `tmp/sspt-kimi-after-opus-20260726` | (detached) | — | 0 | 0 | 2026-07-26 | inspect: detached, no branch |
| `tmp/sspt-render-hostile-20260718` | (detached) | — | 0 | 0 | 2026-07-18 | inspect: detached, no branch |
| `tmp/sspt-render-postreview-20260719` | (detached) | — | 0 | 0 | 2026-07-19 | inspect: detached, no branch |
| `Users/BigotSmasher/.hermes/runner-repo` | (detached) | — | 0 | 0 | 2026-07-29 | inspect: detached, no branch |
| `Users/BigotSmasher/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/99b24a8a-bf2c-4b79-8876-0c48f5596d3c/scratchpad/main-audit` | (detached) | — | 0 | 0 | 2026-08-04 | inspect: detached, no branch |
| `Users/BigotSmasher/AppData/Local/Temp/lane4-baseline` | (detached) | — | 0 | 0 | 2026-08-02 | inspect: detached, no branch |


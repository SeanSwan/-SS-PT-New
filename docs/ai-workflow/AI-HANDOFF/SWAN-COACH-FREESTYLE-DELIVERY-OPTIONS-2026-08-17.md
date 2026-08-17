---
title: "Swan Coach freestyle — delivery options (the §9 branch blocker, resolved into a decision)"
date: 2026-08-17
author: Claude Fable 5 (vs-claude)
decision: "Recommend Option A — cherry-pick the workstream onto a fresh branch cut from origin/main; 12 of 16 files are new and cannot conflict"
status: open
supersedes: none
linear: SWA-107
---

# The branch problem, measured rather than assumed

**Verified 2026-08-17 against a fresh `git fetch origin main`:**

- Working branch `wip/comms-notifications-2026-07-05` is **2,076 commits behind** `origin/main`
  and **207 ahead**.
- The 207 ahead are **not all mine** — this tree is shared with other agents (classroom-copilot,
  hermes, video-compliance workstreams all committed here during the session).
- **None of the freestyle files exist on `origin/main`.** Pushing this branch does not reach
  production, and merging it wholesale would drag 207 unrelated commits with it.

## The delivery surface — 16 files, and only 4 can conflict

| Class | Count | Files | Conflict risk |
|---|---|---|---|
| **NEW** | 12 | `CoachFreestyleOverlay.tsx` · `.styles.ts` · `.hearing.test.tsx` · `hooks/useFreestyleSession.ts` + `.test.ts` · `hooks/useFreestyleSpeech.ts` · `hooks/useCoachCapture.ts` + `.lifecycle.test.ts` · `hooks/useVoiceRecorder.latch.test.ts` · `VoiceRecordingOverlay.hotMic.test.tsx` · `docs/…/coach-brain/10-freestyle-intake.md` · `backend/scripts/inspect-minors-ai-exposure.mjs` | **None** — absent on main |
| **MODIFIED** | 4 | `hooks/useVoiceRecorder.ts` · `VoiceRecordingOverlay.tsx` · `Social/Messaging/MessagingStyles.ts` · `Social/Messaging/MessageThread.tsx` | **Real** — main has diverged |

### What the 4 modified files need

- **`useVoiceRecorder.ts`** — main gained a level meter (`getAudioLevel`, `LevelRing`) after this
  branch forked. My changes are the safety floor: permission-window cancellation latch, per-flight
  generation, synchronous track release in `stop()`, unmount cleanup, `setRecState` mirror.
  **These are additive and orthogonal to the level meter** — a manual merge keeping both is
  straightforward, and this is the single highest-value file to land because **main's
  `VoiceRecordingOverlay` consumes this primitive directly**, so the fixes harden a live surface.
- **`VoiceRecordingOverlay.tsx`** — main added a portal, initial focus, and the level ring; my
  branch adopted `useCoachCapture`. These genuinely conflict in intent. **Recommend: take main's
  version and re-apply the `useCoachCapture` adoption on top**, rather than the reverse.
- **`MessagingStyles.ts` / `MessageThread.tsx`** — the S9 accessibility/contrast work plus the
  landscape `min-height` fix. Main is unchanged here since the fork for these files, so they apply
  cleanly.

## Options

**Option A — cherry-pick onto a fresh branch (RECOMMENDED).**
Cut `feat/swan-coach-freestyle` from `origin/main`, cherry-pick the freestyle commits (or simply
copy the 12 new files and hand-merge the 4 modified ones), run the full gates, open a PR.
*Why:* isolates this workstream from 207 unrelated commits; 12 of 16 files cannot conflict; the
review trail (25 rounds of verdict docs) travels with it as evidence.

**Option B — rebase the whole branch onto main.**
*Why not:* 2,076 commits of drift across four other agents' workstreams. High conflict volume in
code this session never touched, and a rebase failure risks the shared tree again (it was already
hard-reset twice today).

**Option C — leave on the branch, deliver later.**
*Why not:* the capture layer is behind a flag and harmless where it sits, but the
`useVoiceRecorder` safety fixes are NOT freestyle-specific — they close a real microphone leak on
a surface **main ships today**. Delaying keeps that leak live in production.

## Recommendation

**Option A, split into two PRs:**

1. **`useVoiceRecorder` safety floor alone** (1 modified file + its latch test). Small, reviewable,
   fixes a live production leak, no feature flag needed.
2. **The freestyle capture layer** (the remaining 11 new files + the 3 other modified ones), behind
   its flag, once Sean answers the audio-transport decision — which still gates S4 and shapes what
   the layer is allowed to do.

## Still Sean's calls

1. **The audio transport decision** (gate cloud recognisers / bundle on-device / accept-and-document)
   — blocks S4, and belongs in the retention contract before ratification.
2. **Retention contract ratification** (`implementation_authorized: false` today).
3. **Approve `coach-brain/10-freestyle-intake.md`** (`review_status: draft`, non-ingestible).
4. **Is "Marcus" a real client name?** It appears as sample data in
   `GLM-COACH-JARVIS-REVIEW-2026-08-15.md`; scrub before that doc goes anywhere public (Rule 8).
5. **This delivery choice** — A (recommended), B, or C.

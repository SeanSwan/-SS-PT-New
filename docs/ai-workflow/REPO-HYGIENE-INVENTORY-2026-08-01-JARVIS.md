# JARVIS Post-Deploy Hygiene Inventory — 2026-08-01

Scope: non-destructive inventory for the hostile review of deployed
`origin/main@f09e1b0e1`. This document classifies only the voice, planner-lens,
and teach-mode surfaces reached by `2eb569d64..f09e1b0e1`. No file movement,
deletion, archive execution, or `.gitignore` edit is authorized here.

## Root inventory

The clean review worktree contains operating/config files only at repo root:
`AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md`, `README.md`, package manifests,
Render examples/config, skill/config manifests, and dotfiles. Classification:
active operating docs, active runtime/config, or active reference docs.
No root log, screenshot, generated build, or ad-hoc review artifact is present.
`archive/` is the existing root archive.

The pre-existing worktree `C:/tmp/sspt-jarvis-s2-20260731` contains twelve
untracked `opus-*` / `kimi-*` review packet and response files at its root.
They are **QA/review artifacts**, outside this clean branch. They are candidates
for an approved move into the existing debate/archive structure after reference
checks; this review does not move or delete them. Because model-review packets
can be durable evidence, no broad `.gitignore` rule is proposed.

## Canonical Surface Receipt — Workout Logger voice

| Requirement | Evidence |
|---|---|
| Route mounts | Role-partitioned dashboard routes mount admin self logger at `UniversalDashboardLayout.routes.tsx:148`, trainer enhanced logger at `:187`, and client logger at `:219`. |
| Mounted JSX | `AdminPersonalWorkoutLogger.tsx:29` mounts `WorkoutLogger`; the client route mounts it directly. `WorkoutLogger.tsx:870` mounts `JarvisVoiceMode` when the flag and local open state are true. |
| Consumer hook | `WorkoutLogger.tsx:288` consumes `useJarvisVoiceCutover`; `:864` switches the one ActionBar mic between JARVIS and legacy dictation. |
| Frontend API literals | `services/voice/decodeTranscript.ts:61` posts `/api/ai-chat/transcribe`; `:85` posts `/api/workout-logs/upload`. |
| Backend route matches / mount order | `core/routes.mjs:427` mounts `/api/workout-logs` before `:695` mounts `/api/ai-chat`. Exact handlers are `workoutLogUploadRoutes.mjs:187` (`POST /upload`) and `aiChatRoutes.mjs:1038` (`POST /transcribe`). No overlapping mount for either touched literal was found. |
| Authoritative model fields | The overlay/capture fixes are interaction-state only and do not read an ORM model. Decoded rows remain local until the existing byte-pinned Workout Logger save path; that contract is outside this review and unchanged. |

## Canonical Surface Receipt — Planner lens / Teach mode

| Requirement | Evidence |
|---|---|
| Route mounts | Admin and trainer `/workout-planner` both mount `WorkoutPlannerPage` at `UniversalDashboardLayout.routes.tsx:150` and `:195`. |
| Mounted JSX | `WorkoutPlannerPage.tsx:16` mounts `WorkoutPlannerPageLayout`; the layout mounts `PlannerLensHost` at `:237`; the host renders the resolved lens at `lens/PlannerLensHost.tsx:53`. |
| Consumer hook | `WorkoutPlannerPageLayout.tsx:215` creates `TeachModeSidebar`; `TeachModeSidebar.tsx:129` consumes `useExerciseTeachData`. |
| Frontend API literal | `features/teach-mode/hooks/useExerciseTeachData.ts:60` requests `/api/exercises/${id}/teach-mode`. |
| Backend route match / mount order | `core/routes.mjs:748` mounts `/api/exercises`; `exerciseRoutes.mjs:602` is the exact authenticated `GET /:id/teach-mode` handler. No competing mount for the touched literal was found. |
| Authoritative model fields | `models/Exercise.mjs:14-29` defines `id`, `name`, `description`, and `instructions`; `:70-82` defines primary/secondary muscles; `:350` pins table `Exercises`. The handler reads these model-backed fields. |

## Surface classification

| Surface | Classification | Evidence / boundary |
|---|---|---|
| `WorkoutLogger` + `JarvisVoiceMode` | canonical, flag-gated | Canonical client/admin-self logger mounts above; `WorkoutLogger.tsx:870`. |
| `LoggerDictationStrip` / `useWorkoutLoggerDictation` | canonical compatibility path, mutually exclusive | `WorkoutLogger.tsx:204` disables it when voice V2 is on; `:864` routes the same mic. It is not an orphan while the kill switch remains required. |
| Trainer `EnhancedWorkoutLogger` | canonical separate role surface | `UniversalDashboardLayout.routes.tsx:187`; it is not the JARVIS-mounted logger. |
| Coach-assistant, support, and nutrition voice components | active separate product surfaces | Repo references show their own consumers/routes; they do not mount into this logger cutover. |
| `studio-classic` planner lens | canonical default | `lens/registry.ts` sets it as `PLANNER_LENS_DEFAULT_ID`. |
| `thumb-deck` planner lens | canonical optional lens, flag-gated | Registered in `lens/registry.ts`; resolved by `PlannerLensHost.tsx` when the lens feature and stored selection are active. |
| Planner `TeachModeSidebar` | canonical conditional slot | Built in `WorkoutPlannerPageLayout.tsx:215` and supplied to the lens host at `:237`. |
| Coach Command Center teach panel | canonical separate route surface | The auth-pipeline fence identifies it as a second active consumer, not a competing planner mount. |

## Duplicate/route and archive conclusions

- Voice implementations are numerous but product-partitioned. Only JARVIS and
  legacy logger dictation compete for the same ActionBar mic, and their flag
  predicates are mutually exclusive.
- Planner lenses deliberately compete as registered layouts over one slot
  contract; the default and optional status is explicit rather than ambiguous.
- No dormant route for either exact voice API literal or teach-mode literal was
  found.
- No runtime code is proposed for archival. The twelve untracked paid-review
  files in the older worktree remain a cleanup candidate pending a separate
  approved pass and final reference check.

## Kimi K3 final-review receipt

Sean explicitly replaced the pending Fable gate with Kimi K3 for this release.
The exact sanitized packet combined the tracked repair diff with this canonical
surface receipt.

| Item | Evidence |
|---|---|
| Reviewer | OpenRouter `moonshotai/kimi-k3`, high effort, one call only |
| Packet | SHA-256 `499b49c451cfc86f090aafc21937397a269224a2c7d14670a24ac6675196c492` |
| Spend gate | 60,000-token ceiling; $1.0224 worst-case estimate; $3 hard cap; Sean approved after the zero-call preflight |
| Actual call | 10,875 input tokens, 9,702 output tokens, approximately $0.1782, 292.5 seconds |
| Completeness | `finish_reason=stop`; no truncation and no automatic retry |
| Verdict | `REVISE` |

### Finding disposition

| Finding | Repository validation and disposition |
|---|---|
| F1 late speech callback can disown a newer utterance | Valid. Added generation ownership and an A-to-B late-callback regression. |
| F2 disabled transition can swallow an armed release | Valid. Release now follows a local hold latch, not the current disabled prop. |
| F3 explicit cancel can terminate unrelated page speech | Valid. Cancellation is scoped to utterances owned by this hook. |
| F4 Teach placement drift and dead desktop `aria-label` | Valid. Teach is restored below the Rolodex on desktop; dialog labeling exists only while the mobile sheet is open. |
| F5 incomplete modal semantics | Valid. The sheet now moves and traps focus, closes on Escape/backdrop, makes background regions inert, and restores focus. |
| F6 pointer-only next-interaction barge-in | Valid. Owned speech now cancels on the next pointer or keyboard interaction. |
| F7 no keyboard or assistive-technology activation path | Valid. Non-pointer clicks use an explicit start/stop latch while pointer input remains hold-to-talk. |
| F8 whitespace-exact contract fence | Valid. The fence now pins semantic tokens independently. |

The repair review also found and closed one responsive sibling risk not named
by Kimi: a sheet opened below 1280px now clears its modal/inert state when the
viewport expands to desktop. AudioContext cleanup, line-count policy, and the
lock-confirm continuation were verified from the current source and tests.
Real-device iOS voice behavior remains the previously disclosed flag-enable
gate; this release does not enable `VOICE_MODE_V2`.

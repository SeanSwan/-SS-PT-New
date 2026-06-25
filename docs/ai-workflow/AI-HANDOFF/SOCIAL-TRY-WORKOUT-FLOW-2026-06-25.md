# Social Try This Workout Flow - 2026-06-25

## Scope

Make workout-tagged feed posts actionable without colliding with the current chart lane. Hostile review on 2026-06-25 split the surface truth:

- Active shipped surface: `/user-dashboard` Home lazy-loads `HomeCommunityFeed -> PostCard -> PostContent`, so the `Try This Workout` card/detail modal is live.
- Active composer surface: `/user-dashboard` Home uses `HomeTabVisionCenter -> useHomeComposer`; it attaches the latest real workout session via `workoutSessionId` when `Share my week` is armed.
- Legacy/unmounted surface: `SocialFeed -> CreatePostCard` still has the structured workout attachment builder, but `/social` redirects to `/user-dashboard`, so that builder is not currently user-visible.

## Canonical Surface Receipt

| Surface | Evidence |
|---|---|
| User dashboard route | `frontend/src/routes/main-routes.tsx` mounts `/user-dashboard` and `/user-dashboard/:tab` to `UserDashboardV3`. |
| Dashboard home feed | `UserDashboard.V3.tsx` renders `UserDashboardTabsV3`; `UserDashboardTabsV3.tsx` renders `HomeTab`; `HomeTab.tsx` calls `useSocialFeed()` and passes posts into the home feed. |
| Active composer owner | `frontend/src/components/UserDashboard/components/HomeTab.tsx` mounts `useHomeComposer`; `HomeTabVisionCenter.tsx` renders the Quick Post form; `useHomeComposer.ts` submits through the stateful `useSocialFeed.createPost`. |
| Active workout attachment | `useHomeComposer.ts` attaches the latest real workout by `workoutSessionId` after `HomeTabTrainingProof` arms `handleShareProgress`; it does not expose the structured exercise builder. |
| Legacy composer owner | `frontend/src/components/Social/Feed/CreatePostCard.tsx` renders `CreatePostForm` and `CreateWorkoutAttachmentPanel`, but this is behind `SocialFeedReady`, and the route file marks `SocialPage.V3 / SocialPage` as unmounted legacy. |
| Legacy exercise library source | `CreateWorkoutAttachmentPanel.tsx` uses `useExerciseSearch`, which loads the authenticated `/api/exercises/library` Swan exercise library. |
| Feed card content | `frontend/src/components/Social/Feed/PostCard.tsx` renders `PostContent` for each post. |
| CTA owner | `frontend/src/components/Social/Feed/components/PostContent.tsx` renders `Try This Workout` whenever `post.type === 'workout'`. |
| Frontend API | `frontend/src/hooks/social/useSocialFeed.ts` reads `GET /api/social/posts/feed` and appends `workoutData` to `POST /api/social/posts` when present. |
| Backend mount | `backend/core/routes.mjs` mounts `socialRoutes` at `/api/social`; `backend/routes/social/index.mjs` mounts `postsRoutes` at `/posts`. |
| Backend handlers | `backend/routes/social/posts.mjs` owns `GET /feed`, `GET /user/:userId`, `GET /:postId`, trending reads, and `POST /`. |
| Model storage | `backend/models/social/SocialPost.mjs` includes `metadata` JSON and `workoutSessionId`; workout detail payloads live in `metadata.workoutData` until a normalized workout-share table exists. |

## Current Wireframe

```text
Composer - expanded workout mode
| textarea: workout caption
| [Pull from Workout History]
| stats grid: duration / exercises / volume / calories
| Workout details
|   Find exercise: search Swan exercise library
|   result rows: [Add Bench Press]
|   attached exercise slate
|     Bench Press [remove]
|     sets / reps-time / weight / rest / notes
| [Post]

Feed Post
| media / hero
| author + tag: Workout
| post copy
| workout stats if attached
| [Try This Workout]

Click [Try This Workout]
| modal: Try This Workout
| title / focus / source
| metric row: duration, exercises, volume, calories
| exercise list
| notes
| honest status if no details were attached
```

## Flow

1. On the active Home composer, `HomeTabTrainingProof` can arm `useHomeComposer.handleShareProgress` with the latest real session id.
2. `useHomeComposer.submitPost` submits through `useSocialFeed.createPost` with `workoutSessionId` when proof is armed.
3. The backend links the post to the workout session and can still sanitize optional structured `workoutData` when a mounted caller provides it.
4. Feed reads attach `workoutData` back onto the post DTO when present.
5. `Try This Workout` opens the details modal from the active `HomeCommunityFeed` card.
6. If `workoutData` exists, the modal shows the shared workout details.
7. If a post is only typed as workout or only linked by session id without embedded details, the modal explains that no workout details were attached.
8. The structured `CreatePostCard` builder remains implemented but legacy/unmounted until a future route intentionally reactivates it or ports it into the Home composer.

## Data Contract

```ts
type WorkoutPostData = {
  title?: string;
  focus?: string;
  source?: 'manual' | 'logger' | 'plan' | 'pdf' | 'composer' | string;
  duration?: string;
  exerciseCount?: string;
  totalWeight?: string;
  caloriesBurned?: string;
  notes?: string;
  exercises?: Array<{
    name?: string;
    sourceExerciseId?: string;
    sets?: string;
    reps?: string;
    weight?: string;
    duration?: string;
    rest?: string;
    notes?: string;
  }>;
};
```

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| Try This Workout modal | Implemented | CTA opens a keyboard-accessible modal with attached and no-details states. |
| Active Home proof attach | Implemented | `Share my week` submits the latest real `workoutSessionId` through the active Home composer. |
| Legacy structured composer attach | Implemented, not mounted | `CreatePostCard` can create structured `workoutData`, but this path is behind legacy `SocialFeed` and is not currently user-visible. |
| Rolodex picker | Implemented, not mounted | Uses existing `/api/exercises/library` search; keep it dormant until ported into the active Home composer or a new mounted Social route. |
| Workout-history truth | Partial | Active Home proof uses the latest real workout session id. Embedded modal details still depend on `metadata.workoutData` until a normalized workout-share table/session expansion exists. |
| PDF upload | Deferred | Needs file safety, preview, and clear distinction between uploaded file and structured exercises. |
| Exercise suggestion | Deferred | Queue for admin review before adding to the Rolodex. |
| Chart card | Deferred | Integrate after the current chart lane stabilizes; current DTO fields are reserved for that lane. |

## Definition Of Done For Current Slice

- Active `/user-dashboard` Home feed loads the `Try This Workout` modal from `HomeCommunityFeed`.
- Active Home composer can publish workout proof with a real `workoutSessionId`.
- Backend sanitizer keeps only approved workout/exercise fields and drops arbitrary payload fields when structured `workoutData` is provided.
- Existing Try This Workout modal still opens attached and no-details states.
- Tests cover the legacy composer attachment, modal behavior, feed display contract, and backend sanitizer contract; future active-composer builder work must add Home composer coverage before shipping.

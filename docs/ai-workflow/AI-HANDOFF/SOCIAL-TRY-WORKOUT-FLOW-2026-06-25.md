# Social Try This Workout Flow - 2026-06-25

## Scope

Make workout-tagged feed posts actionable without colliding with the current chart lane. The first slice turned the existing `Try This Workout` button from a no-op into a details modal. The next slice adds a workout attachment builder to the canonical Social Feed composer so workout posts can carry structured routine data at publish time.

## Canonical Surface Receipt

| Surface | Evidence |
|---|---|
| User dashboard route | `frontend/src/routes/main-routes.tsx` mounts `/user-dashboard` and `/user-dashboard/:tab` to `UserDashboardV3`. |
| Dashboard home feed | `UserDashboard.V3.tsx` renders `UserDashboardTabsV3`; `UserDashboardTabsV3.tsx` renders `HomeTab`; `HomeTab.tsx` calls `useSocialFeed()` and passes posts into the home feed. |
| Composer owner | `frontend/src/components/Social/Feed/CreatePostCard.tsx` renders `CreatePostForm` and submits through `useCreatePostForm`. |
| Workout attachment builder | `CreatePostForm.tsx` renders `CreateWorkoutAttachmentPanel` when expanded post type is `workout`. |
| Exercise library source | `CreateWorkoutAttachmentPanel.tsx` uses `useExerciseSearch`, which loads the authenticated `/api/exercises/library` Swan exercise library. |
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

1. User writes a post and expands `More Options`.
2. User chooses `Workout`, or the existing smart intent can still classify workout-style copy.
3. In explicit workout mode, the composer can pull recent completed workout stats or attach exercises from the Swan exercise library.
4. Selected Rolodex exercises keep `sourceExerciseId`; custom exercises stay post-local until the future admin-review queue exists.
5. `useCreatePostForm` submits `workoutData` with `source: 'composer'`, the caption title, stats, and up to 12 exercises.
6. The backend sanitizes the limited payload and stores it in `SocialPost.metadata.workoutData`.
7. Feed reads attach `workoutData` back onto the post DTO.
8. `Try This Workout` opens the details modal.
9. If `workoutData` exists, the modal shows the shared workout.
10. If a post is only auto-tagged as workout, the modal explains that no workout details were attached.

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
| Composer attach | Implemented | Expanded workout composer now creates structured workoutData. |
| Rolodex picker | Implemented, bounded | Uses existing `/api/exercises/library` search; does not duplicate the Rolodex or create exercise records. |
| Workout-history truth | Partial | Existing completed-workout pull fills stats and can carry exercise names when the API response includes them. A normalized workout share table is still future work. |
| PDF upload | Deferred | Needs file safety, preview, and clear distinction between uploaded file and structured exercises. |
| Exercise suggestion | Deferred | Queue for admin review before adding to the Rolodex. |
| Chart card | Deferred | Integrate after the current chart lane stabilizes; current DTO fields are reserved for that lane. |

## Definition Of Done For Current Slice

- Composer workout mode has a keyboard-accessible workout attachment builder.
- Rolodex-selected exercises are included in `workoutData.exercises` with `sourceExerciseId` preserved.
- Backend sanitizer keeps only approved workout/exercise fields and drops arbitrary payload fields.
- Existing Try This Workout modal still opens attached and no-details states.
- Tests cover composer attachment, modal behavior, feed display contract, and backend sanitizer contract.
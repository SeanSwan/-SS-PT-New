# Social Try This Workout Flow - 2026-06-25

## Scope

Make workout-tagged feed posts actionable without colliding with the current chart lane. This slice turns the existing `Try This Workout` button from a no-op into a details modal and preserves a clear contract for richer workout sharing later.

## Canonical Surface Receipt

| Surface | Evidence |
|---|---|
| User dashboard route | `frontend/src/routes/main-routes.tsx` mounts `/user-dashboard` and `/user-dashboard/:tab` to `UserDashboardV3`. |
| Dashboard home feed | `UserDashboard.V3.tsx` renders `UserDashboardTabsV3`; `UserDashboardTabsV3.tsx` renders `HomeTab`; `HomeTab.tsx` calls `useSocialFeed()` and passes posts into the home feed. |
| Feed card content | `frontend/src/components/Social/Feed/PostCard.tsx` renders `PostContent` for each post. |
| CTA owner | `frontend/src/components/Social/Feed/components/PostContent.tsx` renders `Try This Workout` whenever `post.type === 'workout'`. |
| Frontend API | `frontend/src/hooks/social/useSocialFeed.ts` reads `GET /api/social/posts/feed` and already appends `workoutData` to `POST /api/social/posts` when present. |
| Backend mount | `backend/core/routes.mjs` mounts `socialRoutes` at `/api/social`; `backend/routes/social/index.mjs` mounts `postsRoutes` at `/posts`. |
| Backend handlers | `backend/routes/social/posts.mjs` owns `GET /feed`, `GET /user/:userId`, `GET /:postId`, trending reads, and `POST /`. |
| Model storage | `backend/models/social/SocialPost.mjs` includes `metadata` JSON and `workoutSessionId`; workout detail payloads should live in `metadata.workoutData` until a normalized workout-share table exists. |

## Current Wireframe

```text
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
| status state if no details were attached
```

## Flow

1. User writes a post. The existing auto-tagging can classify it as `workout`.
2. If the composer or a future workout-log share flow sends `workoutData`, the backend sanitizes and stores a limited payload in `SocialPost.metadata.workoutData`.
3. Feed reads attach `workoutData` back onto the post DTO.
4. `Try This Workout` opens a modal.
5. If `workoutData` exists, the modal shows the shared workout.
6. If the post is only auto-tagged as workout, the modal explains that no workout details were attached.

## Data Contract

```ts
type WorkoutPostData = {
  title?: string;
  focus?: string;
  source?: 'manual' | 'logger' | 'plan' | 'pdf' | string;
  duration?: string;
  exerciseCount?: string;
  totalWeight?: string;
  caloriesBurned?: string;
  notes?: string;
  exercises?: Array<{
    name?: string;
    sets?: string;
    reps?: string;
    weight?: string;
    duration?: string;
    rest?: string;
    notes?: string;
  }>;
};
```

## Deferred Phases

| Phase | Purpose | Notes |
|---|---|---|
| Composer attach | Add `Attach workout` to the post composer. | Prefer logged workouts first so shared data stays truthful. |
| Rolodex picker | Let users assemble a share workout from the Swan Coach Rolodex. | Use existing exercise library search; do not duplicate the Rolodex. |
| PDF upload | Parse or attach PDF workouts. | Needs file safety, preview, and clear distinction between uploaded file and structured exercises. |
| Exercise suggestion | Let users suggest a missing exercise. | Queue for admin review before adding to the Rolodex. |
| Chart card | Render the workout in the premium progress/chart card language. | Integrate after the current chart lane stabilizes; this slice only reserves the DTO fields. |

## Definition Of Done For This Slice

- CTA opens a keyboard-accessible modal.
- Modal has a useful attached-workout state and an honest no-details state.
- Backend does not store raw arbitrary `workoutData`; it sanitizes and limits fields.
- Feed, user, trending, and single-post reads return attached workout data.
- Tests cover the frontend modal behavior and backend source contract.
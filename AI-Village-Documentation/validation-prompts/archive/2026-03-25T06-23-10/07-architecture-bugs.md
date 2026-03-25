# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 73.6s
> **Files:** frontend/src/components/Social/Feed/SocialFeed.tsx, frontend/src/components/Social/Feed/CreatePostCard.tsx, frontend/src/components/Social/Feed/PostCard.tsx, frontend/src/components/Social/Feed/hooks/useCreatePostForm.ts, frontend/src/components/Social/Feed/components/PostContent.tsx, frontend/src/components/Social/Feed/components/PostActions.tsx
> **Generated:** 3/24/2026, 11:23:10 PM

---

# Deep Code Review: SwanStudios Social Feed Components

## Executive Summary

This review identifies **5 CRITICAL**, **8 HIGH**, **12 MEDIUM**, and **15 LOW** severity issues across the 6 files reviewed. The codebase has solid architectural foundations but ships with several production-blocking bugs, incomplete features, and hardcoded values that must be addressed before deployment.

---

## 1. BUG DETECTION

### CRITICAL

| Severity | File & Line | What's Wrong | Fix |
|----------|------------|--------------|-----|
| **CRITICAL** | `PostCard.tsx:158` | Hardcoded URL `https://swanstudios.com` in share dialog — breaks in dev/staging environments, not configurable | Replace with `window.location.origin` or environment variable: `` `${process.env.REACT_APP_PUBLIC_URL \|\| window.location.origin}/social/posts/${post.id}` `` |
| **CRITICAL** | `useCreatePostForm.ts:95-102` | Cleanup effect has empty dependency array but references state variables. If component unmounts/remounts, cleanup won't run for initial mount's blob URLs — **memory leak** | Add dependencies: `useEffect(() => { return () => { ... }; }, [mediaPreview, beforePreview, afterPreview]);` |
| **CRITICAL** | `PostCard.tsx:189` | `window.confirm()` for delete — blocks UI thread, not accessible, ugly UX. Also blocks thread while waiting for user response | Replace with custom modal component with proper accessibility: `<DeleteConfirmModal isOpen={showDeleteConfirm} onConfirm={confirmDelete} onCancel={() => setShowDeleteConfirm(false)} />` |
| **CRITICAL** | `PostContent.tsx:89-95` | `handleTryWorkout` only logs to console — non-functional feature ships as working UI. Users click expecting workout generator | Either implement functionality or disable/hide button: `const handleTryWorkout = () => { if (post.workoutData?.workoutId) navigate(\`/workouts/generator?template=${post.workoutData.workoutId}\`); };` |
| **CRITICAL** | `PostCard.tsx:103` | `transformationSliderValue` is hardcoded to `useState(50)` and never changes — transformation comparison slider is non-functional | Implement slider state: `const [transformationSliderValue, setTransformationSliderValue] = useState(50);` and wire to `<input type="range" />` |

### HIGH

| Severity | File & Line | What's Wrong | Fix |
|----------|------------|--------------|-----|
| **HIGH** | `SocialFeed.tsx:309` | `user?.firstName` can be undefined — displays "Welcome back, undefined!" | Add fallback: `` `${user?.firstName \|\| 'Athlete'}!` `` |
| **HIGH** | `useCreatePostForm.ts:150-165` | `selectWorkoutFromHistory` accesses `workout.duration \|\| workout.durationMinutes` — mixed types (string vs number) can cause concatenation instead of addition in post content | Normalize to string: `const duration = String(workout.duration \|\| workout.durationMinutes \|\| '');` |
| **HIGH** | `PostCard.tsx:158` | Fallback `onLike as any` masks type errors — if `onLike` is undefined, runtime error occurs | Add explicit check: `if (!isActive && onReact) { ... } else if (onLike) { result = await onLike(post.id); } else { return; }` |
| **HIGH** | `useCreatePostForm.ts:233-238` | Validation allows empty content if media exists: `postType !== 'transformation' && postType !== 'workout' && !postContent.trim() && !media` — user can post media with no text | Require at least one: `(!postContent.trim() && !media)` → `(!postContent.trim() && !media && postType !== 'general')` or add minimum content length |

### MEDIUM

| Severity | File & Line | What's Wrong | Fix |
|----------|------------|--------------|-----|
| **MEDIUM** | `SocialFeed.tsx:238-247` | Recent activity timer uses `setTimeout` but effect has `posts` in dependency — if posts array reference changes (new fetch), timer resets but previous timer may not clear if posts changed during timeout | Use ref for timer: `const timerRef = useRef<NodeJS.Timeout>(); useEffect(() => { ... if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(...); return () => clearTimeout(timerRef.current); }, [posts]);` |
| **MEDIUM** | `PostCard.tsx:127-132` | Toast visibility effect has potential race condition — if `showPointNotification` toggles rapidly, nested timeouts can stack | Use single timeout with ref: `const toastTimeoutRef = useRef<NodeJS.Timeout>(); useEffect(() => { if (showPointNotification) { setToastVisible(true); toastTimeoutRef.current = setTimeout(() => { setToastVisible(false); setTimeout(() => setShowPointNotification(false), 300); }, 3000); } return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); }; }, [showPointNotification]);` |
| **MEDIUM** | `useCreatePostForm.ts:167-181` | `handleFileSelect` revokes old URL then creates new one — if user selects files rapidly, race condition can revoke valid URL | Revoke after setting new: `setMedia(file); const newPreview = isVideo ? URL.createObjectURL(file) : ...; if (mediaPreview?.startsWith('blob:')) URL.revokeObjectURL(mediaPreview); setMediaPreview(newPreview);` |

---

## 2. ARCHITECTURE FLAWS

### HIGH

| Severity | File & Line | What's Wrong | Fix |
|----------|------------|--------------|-----|
| **HIGH** | `SocialFeed.tsx:1-350` | Component is ~350 lines — approaches 300-line suspect threshold. Does too much: feed stats calculation, recent activity, gamification header, conditional rendering | Extract to smaller components: `<FeedStats />`, `<RecentActivityIndicator />`, `<GamificationHeader />` |
| **HIGH** | `PostCard.tsx:1-250` | PostCard is ~250 lines doing too much: menu, report modal, share dialog, toast, comments toggle all in one component | Extract: `<PostMenu />`, `<ShareDialog />`, `<ReportModal />`, `<PointToast />` |
| **HIGH** | `useCreatePostForm.ts:87` | `categorySuggestion` is always `null` — AI category suggestion feature is stubbed out but code ships as if implemented | Either implement or remove: `// TODO: Implement AI category suggestion` with `useState<CategorySuggestion | null>(null)` |

### MEDIUM

| Severity | File & Line | What's Wrong | Fix |
|----------|------------|--------------|-----|
| **MEDIUM** | `SocialFeed.tsx:232` | `variant` prop controls two very different layouts ("full" vs "compact") — violates single responsibility | Split into two components: `<SocialHubFeed />` (full) and `<DashboardFeed />` (compact) |
| **MEDIUM** | `PostCard.tsx:113` |

---

*Part of SwanStudios 11-Brain Recursive Consensus System*

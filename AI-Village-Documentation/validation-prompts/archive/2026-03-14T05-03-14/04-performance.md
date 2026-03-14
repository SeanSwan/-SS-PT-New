# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.8s
> **Files:** backend/routes/social/friendships.mjs, frontend/src/pages/Social/SocialPage.V3.tsx, frontend/src/components/Social/Feed/SocialFeed.tsx
> **Generated:** 3/13/2026, 10:03:14 PM

---

This performance and scalability review is conducted under the **Enchanted Apex: Crystalline Swan** design constraints.

---

### 1. Database & Backend Efficiency (backend/routes/social/friendships.mjs)

**[CRITICAL] N+1 Query Pattern in Search & Suggestions**
*   **Finding:** The `/search` and `/suggestions` endpoints perform a `User.findAll` followed by a separate `Friendship.findAll` to map statuses. As the user base grows, this creates significant overhead.
*   **Impact:** Linear degradation of response times as `limit` increases.
*   **Recommendation:** Use a `LEFT JOIN` via Sequelize `include` with a literal attribute or a subquery to fetch the friendship status in a single database round-trip.

**[HIGH] Missing Pagination on Friends & Requests**
*   **Finding:** `router.get('/')` and `router.get('/requests')` fetch all records without a `limit` or `offset`. 
*   **Impact:** Users with 500+ friends will cause massive JSON payloads, high memory consumption on the Node.js heap, and slow DOM rendering.
*   **Recommendation:** Implement `limit` and `cursor-based` pagination (using `createdAt` or `id`).

**[MEDIUM] Unbounded "Exclude" Arrays**
*   **Finding:** In `/suggestions`, the code builds an `excludeIds` array containing all friends and blocked users: `id: { [Op.notIn]: excludeIds }`.
*   **Impact:** For power users, this array could contain thousands of IDs, leading to a massive SQL `NOT IN (...)` clause which tanks PostgreSQL query plan performance.
*   **Recommendation:** Use a `NOT EXISTS` subquery instead of passing a raw array of IDs from Node.js to SQL.

---

### 2. Render Performance & Bundle Size (frontend/src/pages/Social/SocialPage.V3.tsx)

**[HIGH] Massive Component Over-importing**
*   **Finding:** `SocialPage.V3.tsx` imports `SocialFeed`, `FriendsList`, and `ChallengesView` statically. 
*   **Impact:** Even if a user only looks at the "Feed," they are downloading the code for the entire Challenges system and Friends management. This increases the "Time to Interactive" (TTI).
*   **Recommendation:** Use `React.lazy()` for `SocialFeed`, `FriendsList`, and `ChallengesView`. You already did this for `VerticalReels`; apply it to all tab content.

**[MEDIUM] Framer Motion Layout Thrashing**
*   **Finding:** Multiple `ScrollReveal` and `motion.div` components are nested within a parallax container.
*   **Impact:** On mid-range mobile devices, the combination of `backdrop-filter: blur`, `opacity: 0.04` noise textures, and parallax `y` transforms will cause frame drops (below 60fps).
*   **Recommendation:** Add `will-change: transform` to the `HeroBg` and use `layout="position"` sparingly. Ensure the `NoiseOverlay` uses a fixed size and `transform: translateZ(0)` to promote it to a GPU layer.

**[LOW] Redundant `useMediaQuery` Listeners**
*   **Finding:** The hook creates a new listener on every mount.
*   **Impact:** Minimal, but can be optimized.
*   **Recommendation:** Move the `matchMedia` call outside the component or memoize the listener to prevent re-attaching on every re-render of the parent.

---

### 3. Network & Data Handling (frontend/src/components/Social/Feed/SocialFeed.tsx)

**[HIGH] Lack of Virtualization in Feed**
*   **Finding:** `posts.map(post => <PostCard ... />)` renders the entire list into the DOM.
*   **Impact:** As a user clicks "Load More" multiple times, the DOM tree grows indefinitely. This leads to "Scroll Jitter" and high memory usage.
*   **Recommendation:** Implement `react-window` or `@tanstack/react-virtual` to only render the posts currently in the viewport.

**[MEDIUM] Heavy Computation in Render Path**
*   **Finding:** `feedStats` uses a `.reduce()` on the `posts` array.
*   **Impact:** While memoized, any update to the `posts` array (like a single "Like" update) triggers a full re-scan of the array to recalculate stats.
*   **Recommendation:** If the backend provides these stats in a summary object, use that. Otherwise, update the stats locally based on the specific action (increment/decrement) rather than a full array reduce.

**[LOW] Asset Loading Strategy**
*   **Finding:** `HeroBgImage` uses `loading="eager"`.
*   **Impact:** Correct for LCP (Largest Contentful Paint), but ensure the image is served in `.webp` or `.avif` via a CDN to match the "Crystalline Swan" luxury performance standard.

---

### 4. Scalability & Memory

**[MEDIUM] In-Memory Search Logic**
*   **Finding:** The backend `friendshipMap` is built in-memory after fetching users.
*   **Impact:** This is fine for small results, but if the `limit` is ever removed or increased significantly, the O(N) mapping adds latency.
*   **Recommendation:** Move mapping logic into the SQL query using `JSONB_AGG` or similar PostgreSQL features if the dataset exceeds 100 results per page.

**[LOW] Event Listener Cleanup**
*   **Finding:** `SocialFeed.tsx` has a `setTimeout` for `recentActivity`.
*   **Impact:** You correctly implemented the cleanup function `return () => clearTimeout(timer)`. This is a **Good Practice** pass.

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **N+1 Queries in Search/Suggestions** | **CRITICAL** | Database Efficiency |
| **Missing Pagination on Friends List** | **HIGH** | Network Efficiency |
| **Lack of List Virtualization (Feed)** | **HIGH** | Render Performance |
| **Static Imports for Tab Components** | **HIGH** | Bundle Size |
| **Unbounded SQL `NOT IN` Arrays** | **MEDIUM** | Scalability |
| **Parallax GPU Overdraw** | **MEDIUM** | Render Performance |

**Engineer's Note:** The transition from the retired Galaxy-Swan theme to **Crystalline Swan** introduces heavy CSS effects (Glassmorphism + Noise). To maintain "Luxury" performance, **Code Splitting** and **Database Indexing** on `requesterId/recipientId` are now mandatory, not optional.

---

*Part of SwanStudios 9-Brain Recursive Consensus System*

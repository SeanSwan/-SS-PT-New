# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.5s
> **Files:** frontend/src/pages/GalleryPage.tsx
> **Generated:** 3/12/2026, 12:41:12 AM

---

This review focuses on the performance and scalability of the `GalleryPage.tsx` for the **SwanStudios** platform.

### Executive Summary
The component is a "Mega-Page" that handles event listing, authentication gates, photo grids, and multiple complex modals. While the UI is high-fidelity, the architectural approach will lead to significant performance degradation as the photo gallery grows.

---

### 1. Bundle Size & Code Splitting
**Finding: Monolithic Import Structure**
**Rating: HIGH**
*   **Issue:** All modals (`VIPConversionModal`, `PhotoDetailModal`, `MessageModal`, `DonationModal`) are imported statically at the top of the file.
*   **Impact:** Even if a user only looks at the event list, they download the code for the entire payment and enhancement system.
*   **Recommendation:** Use `React.lazy()` and `Suspense` for all modals.
    ```tsx
    const VIPConversionModal = React.lazy(() => import('./gallery/VIPConversionModal'));
    ```

**Finding: Heavy Animation Library**
**Rating: MEDIUM**
*   **Issue:** `framer-motion` and `styled-components` are used extensively. While great for UX, they add ~30kb+ (gzipped) to the entry point.
*   **Recommendation:** Ensure `framer-motion` is used with the `m` component and `LazyMotion` features to reduce bundle size if used globally.

---

### 2. Render Performance
**Finding: Object/Array Reference Instability**
**Rating: HIGH**
*   **Issue:** The `votesMap` and `enhanceSelections` (a `Set`) are updated frequently. Passing `new Set(prev)` or `{...m}` causes every `PhotoCard` to re-render because they likely don't use `React.memo` or the props change every time the parent state updates.
*   **Impact:** In a gallery of 500+ photos, clicking "Like" or "Select" will feel sluggish (input lag).
*   **Recommendation:** 
    1. Wrap `PhotoCard` (or the internal `PhotoFeedback`) in `React.memo`.
    2. Use a specialized state management approach or a `useReducer` for complex gallery interactions.

**Finding: Inline Function Definitions in Render**
**Rating: MEDIUM**
*   **Issue:** `onMouseEnter={() => setHoveredPhotoId(photo.id)}` is defined inside the `.map()`.
*   **Impact:** Creates new function references on every render, breaking `React.memo` optimizations on child components.

---

### 3. Network Efficiency
**Finding: Lack of Pagination/Infinite Scroll**
**Rating: CRITICAL**
*   **Issue:** `loadPhotos` fetches the entire photo array at once: `res = await fetch(.../photos)`.
*   **Impact:** If an event has 1,000 photos, the JSON payload will be massive, and the DOM will struggle to paint 1,000 `PhotoCard` components simultaneously.
*   **Recommendation:** Implement cursor-based pagination (e.g., `?limit=50&offset=0`).

**Finding: Redundant Credit Fetching**
**Rating: LOW**
*   **Issue:** `fetchCredits` is called inside a `useEffect` that depends on `galleryToken`. It's also called manually after enhancements.
*   **Recommendation:** Use a library like `React Query` (TanStack Query) to handle caching and automatic revalidation of credits/votes.

---

### 4. Memory Leaks & Cleanup
**Finding: Unsafe `setTimeout` in `showToast`**
**Rating: MEDIUM**
*   **Issue:** While there is a `toastTimerRef`, the nested `setTimeout` inside `showToast` (the one that sets `setShowWelcomeToast(false)` after 400ms) is **not** cleared in the cleanup function.
*   **Impact:** If the component unmounts during the exit animation, it will attempt to update state on an unmounted component.
*   **Recommendation:** 
    ```tsx
    // Store both timers or use a single animation-end listener
    const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // ... in cleanup
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    ```

---

### 5. Database & Scalability (Backend Implications)
**Finding: N+1 Potential in Vote Loading**
**Rating: MEDIUM**
*   **Issue:** The frontend calls `/votes` separately from `/photos`. 
*   **Impact:** While this decouples the data, ensure the backend query for `/votes` uses a `GROUP BY` or an indexed join. If the backend loops through photos to find votes, it will fail under load.
*   **Recommendation:** Ensure the `GalleryPhoto` model has an index on `eventId`.

**Finding: Session Storage Token Management**
**Rating: MEDIUM**
*   **Issue:** `sessionStorage.getItem('gallery-token-...')` uses the slug as a key.
*   **Impact:** If a user accesses many galleries, session storage fills up. More importantly, there is no logic to handle expired JWTs stored in session storage, leading to "Infinite Loading" states if the token is invalid but present.
*   **Recommendation:** Add a global fetch interceptor to clear storage on `401 Unauthorized`.

---

### 6. Scalability Concerns
**Finding: CSS-Only Watermarking**
**Rating: LOW (Security/Business Logic)**
*   **Issue:** The watermark is a CSS overlay. 
*   **Impact:** While the code notes "downloads stay clean," savvy users can simply "Right Click -> Save Image As" on the grid thumbnails to get unwatermarked (albeit low-res) images. 
*   **Recommendation:** For true scalability and IP protection, thumbnails should be processed server-side with a burnt-in watermark using a library like `sharp`.

---

### Summary of Ratings
| Finding | Rating | Area |
| :--- | :--- | :--- |
| **Missing Pagination** | **CRITICAL** | Network / Render |
| **Static Modal Imports** | **HIGH** | Bundle Size |
| **Unmemoized Grid Items** | **HIGH** | Render Performance |
| **Nested Timeout Cleanup** | **MEDIUM** | Memory |
| **N+1 Vote Queries** | **MEDIUM** | Database |

---

*Part of SwanStudios 7-Brain Validation System*

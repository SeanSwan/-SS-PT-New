# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 8.8s
> **Files:** docs/ai-workflow/blueprints/ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md
> **Generated:** 4/2/2026, 8:47:53 PM

---

As a Web Performance Engineer, I have reviewed the **Onboarding Workflow Overhaul Plan**. While the functional logic is sound, the introduction of heavy Markdown processing, real-time AI interactions, and "glowing" animations presents specific risks to the **Crystalline Swan** UX—particularly for the target demographic of wealthy professionals who expect "snappy" premium interfaces.

### 1. Bundle Size & Dependency Management
**Finding: MEDIUM**
The addition of `react-markdown`, `remark-gfm`, and `rehype-highlight` adds ~65KB (gzipped) to the main bundle if not handled correctly.
*   **Optimization:** Do **not** include these in the main vendor bundle. Use `React.lazy()` to wrap the `CoachAssistant` and `MarkdownRenderer` components.
*   **Strategy:** Load the Markdown engine only when the user opens the Coach Assistant or the Onboarding Summary.
*   **Code:** `const Markdown = lazy(() => import('./MarkdownRenderer'));`

### 2. Render Performance (Conversation Sidebar)
**Finding: HIGH**
The plan involves complex AI-driven JSON extraction and multi-stage onboarding updates. If the chat sidebar re-renders the entire message history on every keystroke or AI stream chunk, interaction latency will exceed the 100ms "perceived lag" threshold.
*   **Optimization:** Implement `React.memo` on individual `ChatMessage` components.
*   **Virtualization:** Since the conversation history can grow long during onboarding, use `react-window` or `virtuoso` for the message list to keep DOM nodes constant.
*   **Logic:** Only the "latest" message (the one currently streaming) should be updating its state.

### 3. Voice Recording & Memory Management
**Finding: HIGH**
The "Voice-first AI coach" differentiator implies long-form dictation. Storing raw `Blob` data in component state will cause memory leaks and browser crashes on mobile devices.
*   **Optimization:** Use a `Web Worker` to process audio chunks into a `SharedArrayBuffer`.
*   **Cleanup:** Explicitly call `URL.revokeObjectURL()` on any temporary audio URLs once the transcription is returned or the component unmounts.

### 4. Markdown Parsing Cost
**Finding: LOW**
Parsing Markdown on every render is expensive, especially with `rehype-highlight` (syntax highlighting).
*   **Optimization:** Memoize the parsed output using `useMemo`.
*   **Constraint:** Only re-parse when the `message.content` string changes.
*   **Example:** `const renderedContent = useMemo(() => <ReactMarkdown ... />, [message.content]);`

### 5. Network Waterfall & Data Fetching
**Finding: MEDIUM**
The plan requires checking onboarding status, user roles, and claim codes. Sequential fetching will lead to a "stuttering" dashboard load.
*   **Optimization:** Use **Parallel Data Fetching**. In the Dashboard root, trigger `Promise.all([fetchUser(), fetchOnboardingStatus(), fetchMessages()])`.
*   **Caching:** Use `React Query` or `SWR` with a `stale-while-revalidate` strategy for the `ClientOnboardingQuestionnaire` status to ensure the "Glow" appears instantly on return visits.

### 6. Image Attachments & Memory
**Finding: MEDIUM**
NASM assessments (Overhead Squat) require image uploads. Large 12MP photos from iPhones will lag the UI if rendered directly.
*   **Optimization:** Use a `Canvas` to generate a 200px thumbnail locally for the "preview" before uploading the original blob to S3.
*   **CSS:** Use `aspect-ratio` and `object-fit: cover` to prevent layout shifts (CLS) during image loading.

### 7. Code Splitting Boundaries
**Finding: LOW**
The "Teach Mode" and "Onboarding Wizard" are distinct heavy modules.
*   **Proposed Split:**
    1.  `OnboardingWizardModule`: Contains the 8-step logic.
    2.  `CoachAssistantModule`: Contains the AI chat and Markdown logic.
    3.  `AdminAnalyticsModule`: Contains the master-detail tables for trainers.

### 8. Animation Budget (The "Glow" Effect)
**Finding: CRITICAL**
The "Wing Purple (#8B5CF6) pulsing border" can cause significant **Layout Thrashing** if it animates `box-shadow` or `border-width`, which trigger "Paint" and "Layout" cycles.
*   **Optimization:** Use **GPU-accelerated properties only**. Animate `opacity` and `transform: scale()` on a `::before` pseudo-element.
*   **CSS Strategy:**
    ```css
    @keyframes onboardingGlow {
      0% { opacity: 0.4; transform: scale(1); }
      100% { opacity: 0.8; transform: scale(1.05); }
    }
    /* Use will-change: transform, opacity; to promote to a compositor layer */
    ```

---

### Summary of Performance Ratings

| Category | Rating | Optimization Priority |
| :--- | :--- | :--- |
| **Bundle Size** | MEDIUM | Lazy-load Markdown & Highlight.js |
| **Render Perf** | HIGH | Memoize chat messages; Virtualize list |
| **Memory** | HIGH | Audio buffer cleanup; Canvas thumbnails |
| **Animations** | CRITICAL | Use Compositor-only (Opacity/Transform) |
| **Network** | MEDIUM | Parallelize status checks via React Query |

**Engineer's Note:** To maintain the "Crystalline" feel, the AI's "thinking" indicator should be a simple CSS-based SVG animation rather than a heavy GIF or Lottie file to ensure the main thread remains free for processing the incoming JSON stream.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*

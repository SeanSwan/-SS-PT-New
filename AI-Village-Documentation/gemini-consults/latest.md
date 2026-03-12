# Gemini 3.1 Pro — Plan Review

> **Generated:** 3/11/2026, 9:36:28 PM
> **Mode:** plan
> **Duration:** 37.3s
> **Tokens:** 1154 in / 2208 out

---

## Input

Gallery Upload Queue System Improvements for SwanStudios:

CONTEXT: SwanStudios gallery runs on Render starter plan (512MB RAM). RAW photo uploads (ARW files ~120MB each) cause OOM crashes. Current batch upload of 5 files loads all into multer memory simultaneously. Sharp RAW→JPEG conversion is CPU/memory intensive. R2 direct upload has broken CORS, so all uploads go through server proxy (legacy path).

PROBLEMS SOLVED:
1. Reduced batch to 2 files, but still fails on RAW
2. Added --max-old-space

---

## Gemini 3.1 Pro Response

Claude, excellent backend triage. You’ve correctly identified the bottleneck: Render’s 512MB RAM limit cannot handle concurrent 120MB RAW file processing. Moving to a strict sequential queue is the right architectural move. 

However, as the Lead UI/UX Design Authority, I need to ensure this technical pivot doesn't degrade the premium SwanStudios experience. A long, sequential upload process for 20+ RAW files means the user will be waiting. **We must design for the wait.** We cannot have a generic, blocking loading spinner. This needs to feel like a high-end "Command Center" operation.

Here are my answers to your architectural questions, followed by my strict design directives.

### Answers to Your Questions (UX & Architecture Perspective)
*   **Chunked/Resumable Uploads (tus):** **YES.** If a trainer is uploading a 120MB RAW file on a spotty gym Wi-Fi and it fails at 95%, restarting is a catastrophic UX failure. Implement chunked uploads.
*   **WebSockets vs Polling:** **YES to WebSockets.** Because Sharp conversion (Processing) happens *after* the network upload, a standard HTTP response isn't enough. We need real-time events (`upload_complete` -> `processing_started` -> `processing_complete`) to drive the UI animations.
*   **24h JWT:** **REJECTED.** Extending an admin token to 24h is a security risk. Instead, implement a **Silent Token Refresh** in the background. As long as the upload queue is active and the WebSocket is connected, the client should request a token extension.
*   **Error Recovery:** Granular retry is mandatory. If File 4 fails, the queue should automatically pause, flag File 4, and proceed to File 5, allowing the user to click a specific "Retry" button on File 4 later.

---

### 1. Design Gaps in Your Plan

*   **Blocking vs. Non-Blocking UI:** Your plan implies the user stays on an upload screen. **Gap:** The upload queue must be a *global, non-blocking floating widget* (or bottom sheet on mobile). The trainer should be able to start a 20-file RAW upload and navigate away to manage client workouts while it runs in the background.
*   **State Granularity:** "Processing" is too vague. We need distinct visual states for: *Queued, Uploading (Network), Processing (CPU/Sharp), Success, and Error.*
*   **Mobile Responsiveness:** A complex list of 40 files will overwhelm a 320px/375px screen. We need a collapsed "Mini Progress" state that expands into a full sheet.
*   **Accessibility (a11y):** Screen readers need to know when a batch finishes without the user looking at the screen. We need an `aria-live="polite"` region announcing "File 3 of 20 complete."

### 2. Enhancement Opportunities (The Premium Feel)

*   **The RAW vs JPEG Toggle:** Reject standard radio buttons. We will use a premium, iOS-style Segmented Control with a glassmorphic sliding pill.
*   **Processing Animation:** When a file enters the "Processing" phase (Sharp conversion), the progress bar should transition from a linear fill to an infinite cosmic pulse (using our Cosmic Purple `#7851A9`) to indicate server-side work.
*   **Micro-interactions:** Use Framer Motion for the queue list. When a file finishes, it shouldn't just snap to "Done". It should glow Swan Cyan, shrink slightly, and slide to a "Completed" accordion at the bottom of the list, keeping the active uploads at the top.

### 3. Architecture Recommendations

*   **State Management:** Use a robust context or Zustand store for the `UploadQueue`. It must persist across route changes within the admin dashboard.
*   **Component Structure:**
    *   `GlobalUploadManager` (Invisible logic wrapper)
    *   `UploadWidget` (Floating glass panel)
    *   `UploadModeToggle` (Segmented control)
    *   `QueueList` (Framer Motion `<AnimatePresence>`)
    *   `QueueItem` (Individual file row)
*   **Animation Approach:** Use Framer Motion for layout changes (reordering the list) and pure CSS for high-performance continuous animations (progress bars, pulsing glows).

---

### 4. Implementation Directives for Claude (Strict Specs)

Claude, build the UI exactly to these specifications. No MUI, no generic components.

**A. The Upload Widget (Container)**
*   **Desktop (1024px+):** Fixed bottom-right. `width: 380px; max-height: 600px;`
*   **Mobile (320px - 768px):** Fixed bottom sheet. `width: 100%; border-radius: 24px 24px 0 0;`
*   **Surface:** Premium Glassmorphism.
    *   `background: rgba(10, 10, 26, 0.75);` (Galaxy Core with opacity)
    *   `backdrop-filter: blur(24px);`
    *   `border: 1px solid rgba(0, 255, 255, 0.15);` (Subtle Swan Cyan border)
    *   `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px inset rgba(255, 255, 255, 0.05);`

**B. RAW vs HQ JPEG Toggle (Segmented Control)**
*   **Dimensions:** `height: 44px;` (Strict touch target), `border-radius: 12px;`
*   **Background:** `rgba(255, 255, 255, 0.05)`
*   **Active Pill:** `background: linear-gradient(135deg, #7851A9 0%, #0a0a1a 100%);` (Cosmic Purple gradient for RAW), or `linear-gradient(135deg, #00FFFF 0%, #0a0a1a 100%);` (Swan Cyan for JPEG).
*   **Animation:** `transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);`

**C. Queue Item (Individual File Row)**
*   **Layout:** Flexbox. Thumbnail (left), Filename/Status (center), Action/Progress (right).
*   **Height:** `min-height: 64px;` (Comfortable spacing).
*   **Typography:** Filename: `font-size: 14px; font-weight: 500; color: #FFFFFF;`. Status: `font-size: 12px; font-weight: 400; color: rgba(255, 255, 255, 0.6);`
*   **State Colors & Animations:**
    *   *Queued:* `color: rgba(255, 255, 255, 0.4);`
    *   *Uploading (Network):* Progress bar fills with Swan Cyan `#00FFFF`.
    *   *Processing (Sharp CPU):* Progress bar becomes indeterminate. `background: linear-gradient(90deg, transparent, #7851A9, transparent); background-size: 200% 100%; animation: shimmer 1.5s infinite linear;`
    *   *Success:* Icon changes to a checkmark. `color: #00FF9D;` (Neon Mint).
    *   *Error:* Icon changes to a retry arrow. `color: #FF3366;` (Neon Rose).

**D. Photo Type Badges (Gallery View)**
*   For the admin and client views, the `sourceType` badge must be elegant, not distracting.
*   **Position:** Top-right of the image thumbnail. `margin: 8px;`
*   **Style:** `padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; backdrop-filter: blur(8px);`
*   **RAW Badge:** `background: rgba(120, 81, 169, 0.3); border: 1px solid rgba(120, 81, 169, 0.5); color: #E6D5FF;`
*   **JPEG Badge:** `background: rgba(0, 255, 255, 0.15); border: 1px solid rgba(0, 255, 255, 0.3); color: #E0FFFF;`

### 5. Verdict

**APPROVED WITH MODIFICATIONS.**

Your backend strategy to save the Render server from OOM crashes is sound. Proceed with the single-file endpoint, sequential queue, and the repair script. 

However, you must implement the chunked uploads (tus), WebSockets for processing state, and the non-blocking global UI widget exactly as I have specified above. Do not use a 24h JWT; implement the silent refresh.

**Next Steps for You (Claude):**
1. Setup the tus protocol and WebSocket infrastructure first.
2. Build the `GlobalUploadManager` context.
3. Implement the UI components using my exact CSS tokens and Framer Motion directives.
4. Ping me when the RAW vs JPEG toggle and the Processing shimmer animation are ready for visual review. 

Let's build this. Make it flawless.

---

*SwanStudios Co-Orchestrator — Gemini 3.1 Pro (Lead Design Authority)*

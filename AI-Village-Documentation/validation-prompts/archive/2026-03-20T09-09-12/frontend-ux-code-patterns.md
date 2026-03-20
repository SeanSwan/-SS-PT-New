# Frontend UX & Code Patterns — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 8.3s
> **Files:** backend/services/voiceTranscriptionService.mjs, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/components/AIAssistant/VoiceUpload.tsx, backend/routes/aiChatRoutes.mjs
> **Generated:** 3/20/2026, 2:09:12 AM

---

This review evaluates the SwanStudios AI integration against the **Crystalline Swan** design system and production-grade standards.

### 1. React Component Patterns
*   **`DictationOrb.tsx` (HIGH):** The component uses `window.SpeechRecognition` directly. This is fragile across browsers (Safari/Firefox support is inconsistent). **Recommendation:** Use a wrapper library like `react-speech-recognition` or implement a robust fallback strategy that gracefully degrades to `VoiceUpload` if the Web Speech API is unavailable.
*   **`VoiceUpload.tsx` (MEDIUM):** The `handleFileChange` logic is clean, but the error handling is limited to `onTranscript`. **Recommendation:** Implement a dedicated `onError` callback to allow the parent component to trigger a toast notification rather than injecting error text into the chat stream.

### 2. styled-components Best Practices
*   **Theme Consistency (HIGH):** `DictationOrb.tsx` uses hardcoded hex values (e.g., `#8B5CF6`, `#94a3b8`).
    *   **Fix:** Import the `CS` (Crystalline Swan) theme object used in `VoiceUpload.tsx` to ensure `CS.wingPurple` and `CS.textMuted` are used globally. This prevents "theme drift" when the brand palette updates.
*   **Glassmorphism (LOW):** The `InterimBubble` uses `backdrop-filter: blur(8px)`. Ensure this is consistent with the global `glass` mixin if one exists in your `crystallineSwanTheme.ts`.

### 3. Animation & Interaction
*   **Reduced Motion (HIGH):** Excellent use of `@media (prefers-reduced-motion)`.
*   **Interaction (MEDIUM):** The `DictationOrb` lacks a "loading" state while the audio is being processed by the backend. The orb just stops listening, leaving the user wondering if the request was sent. **Recommendation:** Add a `processing` state to the orb to show a spinner while `onTranscript` is awaiting the API response.

### 4. Form UX
*   **`VoiceUpload.tsx` (CRITICAL):** The file input accepts `audio/*` but the backend `audioUpload` middleware has a strict whitelist. If a user uploads an unsupported format (e.g., `.ogg` on some browsers), the UI provides no feedback until the request fails.
    *   **Fix:** Validate the file extension/MIME type in the `onChange` handler *before* sending the request to provide immediate feedback.
*   **Progressive Disclosure (MEDIUM):** The `DictationOrb` keyboard shortcut (`Cmd+Shift+K`) is powerful but invisible. **Recommendation:** Add a small tooltip or a subtle hint in the UI when the user hovers over the orb.

### 5. State Management
*   **`DictationOrb.tsx` (MEDIUM):** The `accumulatedRef` is used to store text. While performant, it bypasses React's render cycle. If the component re-renders for other reasons, the interim state might flicker. Ensure the `onTranscript` callback is memoized with `useCallback` to prevent unnecessary re-renders of parent components.

### 6. Accessibility Gaps
*   **`DictationOrb.tsx` (HIGH):** The `aria-label` changes based on state, which is good, but the `aria-live` region is only updated when `listening` is true.
    *   **Fix:** Ensure that when the transcription is received, the `aria-live` region announces "Transcription complete" or "Input received" to confirm the action for screen reader users.
*   **Color-only Indicators (MEDIUM):** The `WaveBarEl` uses color to indicate activity. While there is an animation, ensure that the `aria-pressed` state is correctly toggled to provide non-visual confirmation of the listening state.

---

### Backend Logic Review (`voiceTranscriptionService.mjs` & `aiChatRoutes.mjs`)

*   **Security (CRITICAL):** In `aiChatRoutes.mjs`, you are parsing AI output for `update_client_data` using a regex.
    *   **Risk:** Prompt injection. An LLM could be tricked into outputting a string that matches your regex, potentially allowing unauthorized data writes.
    *   **Fix:** Use a structured output format (e.g., Gemini's `responseSchema` feature) to force the AI to return JSON, then validate that JSON against a strict schema (e.g., using `Zod`) before processing.
*   **Rate Limiting (MEDIUM):** The `userTranscriptions` Map is in-memory. If the Node.js process restarts, all rate limits reset.
    *   **Recommendation:** Move this to Redis if you scale to multiple instances, or at least persist the counts to the database if strict enforcement is required.
*   **Error Handling (LOW):** The `transcribeAudio` function uses a 60s timeout. This is appropriate, but ensure the `AbortController` is correctly handled in the `fetch` call to prevent dangling promises.

### Summary Table

| Finding | Severity | Location |
| :--- | :--- | :--- |
| **Prompt Injection Risk in AI Data Updates** | **CRITICAL** | `aiChatRoutes.mjs` |
| **Hardcoded Colors (Theme Drift)** | **HIGH** | `DictationOrb.tsx` |
| **Web Speech API Browser Incompatibility** | **HIGH** | `DictationOrb.tsx` |
| **Missing Pre-upload Validation** | **HIGH** | `VoiceUpload.tsx` |
| **Lack of "Processing" UI State** | **MEDIUM** | `DictationOrb.tsx` |
| **In-Memory Rate Limiting** | **MEDIUM** | `voiceTranscriptionService.mjs` |

---

*Part of SwanStudios 11-Brain Recursive Consensus System*

# UX & Accessibility — Validation Report

> **Status:** PASS | **Model:** google/gemini-2.5-flash | **Duration:** 20.1s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-ASSISTANT-MASTER-BLUEPRINT.md, frontend/src/components/Shared/AITerminalPanel.tsx, frontend/src/components/AIAssistant/AIContextSelector.tsx, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/config/dashboard-tabs.ts
> **Generated:** 3/30/2026, 5:26:33 PM

---

As a UX and accessibility expert auditor, I've reviewed the provided code and blueprint for SwanStudios. The Enchanted Apex: Crystalline Swan theme is ambitious and well-defined, and the focus on mobile-first and voice interaction for the Coach Assistant is commendable.

Here's a detailed breakdown of findings across the requested categories:

---

## Overall Impression

The **SWAN-COACH-ASSISTANT-MASTER-BLUEPRINT.md** is exceptionally thorough and demonstrates a strong understanding of the target user (Sean, the admin/trainer on the gym floor). The mobile-first approach, explicit font size requirements, and generous touch targets are excellent. The detailed wireframes, component architecture, and theme integration guidelines are also very strong.

The **AITerminalPanel.tsx** component, while exceeding the stated line limit, implements many of the blueprint's core ideas for a compact, embeddable AI chat. The **DictationOrb.tsx** is a complex but crucial component for the voice-first strategy, and its V3 fixes show attention to detail. The **AIContextSelector.tsx** provides good context management.

However, there are areas where the implementation or blueprint details could be improved to fully meet WCAG 2.1 AA, mobile UX best practices, and design consistency.

---

## 1. WCAG 2.1 AA Compliance

### Color Contrast
**Finding:** MEDIUM
**Details:**
*   **Blueprint:** States "High contrast text: 4.5:1 minimum (Frost White on dark bg = guaranteed)". This is a good intention, but needs to be verified against the actual color palette and component usage.
    *   **Frost White (#E0ECF4) on Midnight Sapphire (#002060):** Contrast ratio is 11.5:1 (AA & AAA pass).
    *   **Frost White (#E0ECF4) on Royal Depth (#003080):** Contrast ratio is 9.7:1 (AA & AAA pass).
    *   **Frost White (#E0ECF4) on Wing Purple (#8B5CF6):** Contrast ratio is 3.5:1 (FAIL AA for normal text). This is used for `AiBadge` background and `SendButton` background in `AITerminalPanel.tsx`. While the text/icon on these is `Frost White` or `Midnight Sapphire`, the `Wing Purple` itself is a background.
    *   **Gilded Fern (#C6A84B) on Midnight Sapphire (#002060):** Contrast ratio is 7.5:1 (AA & AAA pass).
    *   **Arctic Cyan (#50A0F0) on Midnight Sapphire (#002060):** Contrast ratio is 4.5:1 (AA pass).
    *   **`AITerminalPanel.tsx`:**
        *   `PanelHeader` text (`#f0f0ff`) on `rgba(0, 32, 96, 0.5)` (which is `Royal Depth` with 50% opacity). This needs to be calculated against the actual background color it renders on, which appears to be `rgba(0, 20, 60, 0.6)` (Midnight Sapphire with 60% opacity). If `PanelHeader` is `Royal Depth` (003080) and text is `#f0f0ff`, contrast is 9.7:1 (PASS).
        *   `AiBadge` background `linear-gradient(135deg, #8b5cf6 0%, #60c0f0 100%)` with `color: #002060`. The `Midnight Sapphire` text on `Wing Purple` is 3.5:1 (FAIL AA). The `Midnight Sapphire` text on `Ice Wing` is 4.5:1 (PASS AA). This gradient needs careful checking.
        *   `EmptyHint` text `rgba(255, 255, 255, 0.4)` on `rgba(0, 20, 60, 0.6)` (Midnight Sapphire 60%). This is likely to fail. `rgba(255, 255, 255, 0.4)` on a dark background is usually too low.
        *   `ErrorBar` text `#fca5a5` on `rgba(153, 27, 27, 0.3)`. This is a red-on-red scenario. `#fca5a5` (light red) on `rgba(153, 27, 27, 0.3)` (darker red, 30% opacity) needs to be checked against the actual background. If the background is `rgba(0, 20, 60, 0.6)`, then `#fca5a5` on `rgba(0, 20, 60, 0.6)` is 6.5:1 (PASS).
        *   `ChatInput` placeholder `rgba(255, 255, 255, 0.3)` on `rgba(0, 32, 96, 0.4)`. This will likely fail.
        *   `TtsToggle` inactive state `rgba(255, 255, 255, 0.4)` on `transparent` (which means it's on `rgba(0, 20, 60, 0.6)`). This will likely fail.
    *   **`DictationOrb.tsx`:**
        *   `OrbButton` text `CS.frostWhite` on `CS.wingPurple` (listening state): 3.5:1 (FAIL AA).
        *   `OrbButton` text `CS.textOnGlass` (`#E0ECF4`) on `CS.glassOverlayStrong` (`rgba(0, 32, 96, 0.85)`): 9.7:1 (PASS).
        *   `OrbButton` border `CS.glassBorder` (`rgba(224, 236, 244, 0.3)`) on `CS.glassOverlayStrong`. This is non-text contrast, but the border is thin.
        *   `InterimBubble` text `CS.frostWhite` on `CS.midnightSapphire95`. 11.5:1 (PASS).
*   **Recommendation:** Conduct a thorough color contrast audit for *all* text and interactive elements against their *actual rendered backgrounds*, considering transparency and layered elements. Use a tool like WebAIM Contrast Checker. Prioritize fixing elements that fail AA, especially for text. For `AiBadge` and `SendButton`, ensure the icon/text color has sufficient contrast with *both* ends of the gradient or choose a single, contrasting color. For placeholder text and inactive states, ensure a minimum 3:1 contrast for non-text elements (like icons) and 4.5:1 for text.

### Aria Labels & Roles
**Finding:** HIGH
**Details:**
*   **Blueprint:** Explicitly mentions `role="log"` on message list, `aria-live="polite"` on new messages, and `aria-label` on all buttons. This is excellent.
*   **`AITerminalPanel.tsx`:**
    *   `PanelHeader` is a `<button>` but lacks an `aria-label` or `aria-expanded` attribute. It toggles the panel's visibility.
    *   `MessagesArea` lacks `role="log"` and `aria-live="polite"`. New messages are appended, but screen readers won't announce them automatically without these.
    *   `MessageBubble` elements don't have explicit roles or labels, which is fine for static content, but the overall list needs the log role.
    *   `SendButton` has `type="button"` but no `aria-label`. The `Send` icon is not sufficient on its own.
    *   `TtsToggle` has `aria-label` and `title` attributes, which is good.
    *   `CompactTrigger` has `type="button"` but no `aria-label` or `aria-expanded`.
*   **`AIContextSelector.tsx`:**
    *   `ContextPill` and `StylePill` use `aria-pressed`, which is appropriate for toggle buttons. Good.
    *   `SendBtn` has `aria-label` and `title` attributes, which is good.
*   **`DictationOrb.tsx`:**
    *   `OrbButton` has comprehensive `aria-label`, `aria-pressed`, `aria-describedby`, and `title` attributes. This is excellent.
    *   Includes a `div` with `role="status"` and `aria-live="polite"` for screen reader announcements, which is also excellent.
    *   `InterimBubble` has `aria-hidden="true"`, which is good for content that is visually present but not critical for screen reader users to hear twice (as the final transcript will be read).
*   **Recommendation:**
    *   Add `aria-label="Toggle AI Assistant Panel"` and `aria-expanded={isOpen}` to `PanelHeader` in `AITerminalPanel.tsx`.
    *   Add `role="log"` and `aria-live="polite"` to the `MessagesArea` in `AITerminalPanel.tsx`.
    *   Add `aria-label="Send message"` to the `SendButton` in `AITerminalPanel.tsx`.
    *   Add `aria-label="Toggle AI Assistant"` and `aria-expanded={isOpen}` to `CompactTrigger` in `AITerminalPanel.tsx`.

### Keyboard Navigation & Focus Management
**Finding:** MEDIUM
**Details:**
*   **Blueprint:** Mentions "Keyboard: Tab navigation, Escape to close, Enter to send" and "Focus management: auto-focus input after AI responds." This is a good start.
*   **`AITerminalPanel.tsx`:**
    *   `PanelHeader` (a button) is tabbable.
    *   `ChatInput` (textarea) is tabbable.
    *   `TtsToggle` (button) is tabbable.
    *   `SendButton` (button) is tabbable.
    *   The `DictationOrb` (button) is tabbable.
    *   The blueprint mentions "auto-focus input after AI responds." This is not implemented in the provided `AITerminalPanel.tsx` code. The `inputRef` is there, but no `inputRef.current.focus()` call after `sendMessageWithConversation` completes.
    *   Escape key to close modals/drawers is mentioned in the blueprint but not implemented in `AITerminalPanel.tsx` (which is a panel, not a modal, but still good to consider).
*   **`AIContextSelector.tsx`:**
    *   `ContextPill` and `StylePill` are buttons and are tabbable. Good.
    *   `SendBtn` is a button and is tabbable. Good.
*   **`DictationOrb.tsx`:**
    *   The `OrbButton` is tabbable. Good.
    *   Keyboard shortcut `Cmd/Ctrl+Shift+K` is implemented, which is a nice power-user feature.
*   **Recommendation:**
    *   Implement the "auto-focus input after AI responds" feature in `AITerminalPanel.tsx`. After `sendMessageWithConversation` completes (and `sending` becomes false), call `inputRef.current?.focus()`.
    *   Ensure all interactive elements have a clear and visible focus indicator (the default browser `outline` is often sufficient but can be styled with `:focus-visible`). The `OrbButton` has `outline` styling, which is good.

### Other WCAG Considerations
**Finding:** LOW
**Details:**
*   **Blueprint:** Mentions `prefers-reduced-motion` for animations. This is excellent.
*   **`DictationOrb.tsx`:** Implements `prefers-reduced-motion` for `crystallinePulse` and `waveBar` animations. This is a strong positive.
*   **`AITerminalPanel.tsx`:** `TypingDots` animation does not appear to respect `prefers-reduced-motion`.
*   **Recommendation:** Apply `prefers-reduced-motion` to the `TypingDots` animation in `AITerminalPanel.tsx` as well.

---

## 2. Mobile UX

### Touch Targets (must be 44px min)
**Finding:** MEDIUM
**Details:**
*   **Blueprint:** Excellent, explicit touch target requirements (Send Button 56x56, Voice Orb 64x64, Context Chips 44px height, Style Toggle 44px height, Quick Action Buttons 48px height). This is a strong foundation.
*   **`AITerminalPanel.tsx`:**
    *   `PanelHeader`: `min-height: 48px`. PASS.
    *   `SendButton`: `width: 44px; height: 44px;`. This meets the *minimum* 44px, but the blueprint specifies 56x56 for the Coach Assistant's primary send button. This component is an *embeddable* panel, so 44x44 might be acceptable here, but it's a discrepancy with the blueprint's primary CTA.
    *   `TtsToggle`: `width: 36px; height: 36px;`. FAIL. This is below the 44px minimum.
    *   `CompactTrigger`: `min-height: 44px`. PASS.
*   **`AIContextSelector.tsx`:**
    *   `ContextPill` and `StylePill` are not explicitly sized in the provided `AIDrawerStyles` (which are not included). However, the blueprint specifies "Context Chips 44px height" and "Style Toggle 44px height". Assuming `AIDrawerStyles` implements this.
*   **`DictationOrb.tsx`:**
    *   `OrbButton`: `width: 44px; height: 44px; min-width: 44px; min-height: 44px;`. This meets the *minimum* 44px, but the blueprint specifies 64x64 for the *primary CTA on mobile*. Similar to `SendButton`, this component is embeddable, so 44x44 might be acceptable, but it's a discrepancy. The blueprint also mentions "Make the voice orb the PRIMARY CTA on mobile (center-bottom, 64px)" specifically for the *full-screen Coach Assistant*. This `DictationOrb` is likely used in the `AITerminalPanel`, which is a smaller embed.
*   **Recommendation:**
    *   For `AITerminalPanel.tsx`, increase `TtsToggle` to `min-width: 44px; min-height: 44px;`.
    *   Clarify if the `AITerminalPanel`'s `SendButton` and `DictationOrb` should adhere to the 56x56 and 64x64 sizes, or if the 44x44 is acceptable for the *embeddable* version. If the latter, document this distinction. The blueprint is very clear about the *full-screen Coach Assistant* having larger targets.

### Responsive Breakpoints
**Finding:** HIGH
**Details:**
*   **Blueprint:** Provides a detailed responsive breakpoint matrix and explicit font size requirements for mobile (16px minimum for AI Response, User Message, Input Field). This is excellent and critical for the target user.
*   **`AITerminalPanel.tsx`:**
    *   `MessageBubbleUser` and `MessageBubbleAI` have `font-size: 13px;` which is a direct contradiction to the blueprint's "16px minimum" for mobile. This is a critical issue for Sean's use case.
    *   `HeaderTitle` has `font-size: 14px;`. This is also below the 16px minimum for primary text.
    *   `EmptyHint` `p` has `font-size: 13px;`. Also below 16px.
    *   `ErrorBar` `font-size: 12px;`. Also below 16px.
    *   `ChatInput` `font-size: 13px;`. Also below 16px.
    *   The `max-width` for message bubbles is hardcoded to `80%` for AI and `85%` for user, which is fine for mobile, but the blueprint mentions "messages get max-width 85%" for tablet and "messages centered (max-width 800px)" for desktop. The current implementation doesn't seem to have these media queries for `max-width` changes.
*   **`DictationOrb.tsx`:** The `OrbButton` is fixed at 44px, but the blueprint specifies 64px for the *primary CTA on mobile* for the full Coach Assistant. This component is likely reused, so its size might be overridden by the parent, but it's important to ensure the *final rendered size* meets the blueprint.
*   **Recommendation:**
    *   **CRITICAL:** Adjust all font sizes in `AITerminalPanel.tsx` to meet the blueprint's 16px minimum for mobile (320-430px). This is explicitly called out as "CRITICAL" in the blueprint.
    *   Add media queries to `MessageBubble` styles in `AITerminalPanel.tsx` to implement the `max-width` changes for tablet and desktop as specified in the blueprint (e.g., `max-width: 85%` for tablet, `max-width: 800px` for desktop).
    *   Ensure the `DictationOrb` is rendered at 64x64px when used as the primary CTA in the full `SwanCoachAssistantPage`.

### Gesture Support
**Finding:** LOW
**Details:**
*   **Blueprint:** Mentions "Voice Input (Already Built — Enhance): DictationOrb with Web Speech API (already exists)". "Enh

---

*Part of SwanStudios 11-Brain Recursive Consensus System*

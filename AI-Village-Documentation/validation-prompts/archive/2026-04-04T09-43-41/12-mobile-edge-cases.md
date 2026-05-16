# Mobile & Edge Case Analysis — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 47.7s
> **Files:** docs/ai-workflow/blueprints/TEACH-ME-COMPREHENSIVE-UPGRADE-PLAN.md
> **Generated:** 4/4/2026, 2:43:41 AM

---

# Mobile & Edge Case Review: Teach Me Comprehensive Upgrade Plan

## Overview
Reviewing the **Teach Me content expansion** plan through the lens of mobile UX and edge cases. While the plan focuses on content depth, the delivery interface (likely integrated into chat/coaching workflows) must handle the 10 mandatory breakpoints and edge scenarios.

---

## 1. Sidebar on 320px
**Rating:** CRITICAL
**Issue:** 85vw = 272px on 320px screens. Conversation titles (auto-generated from first message), timestamps, and action buttons (voice, video, etc.) will compete for space. Risk of horizontal scroll or clipped content.

**Solutions:**
```css
/* styled-components */
.sidebarItem {
  min-height: 56px; /* touch target */
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversationTitle {
  font-size: 14px;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
}

.timestamp {
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.actionButtons {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.actionButton {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}
```
**React adjustments:**
- Use `flex-wrap: wrap` on action buttons to prevent overflow.
- Consider hiding less critical actions (e.g., "delete") behind a "more" kebab menu on <375px.
- On 320px, reduce padding and font sizes (use `clamp()` for fluid typography).

---

## 2. Voice Recording on iOS Safari
**Rating:** CRITICAL
**Issue:** iOS Safari requires `webkit` prefix for `MediaRecorder`. Auto-play policies block TTS without user gesture. Voice orb UI must indicate permission states.

**Solutions:**
```javascript
// Check MediaRecorder support with prefixes
const hasMediaRecorder = () => {
  return !!(window.MediaRecorder ||
    (window as any).webkitMediaRecorder ||
    (window as any).mozMediaRecorder);
};

// Request microphone permission with fallback
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new (window.MediaRecorder || (window as any).webkitMediaRecorder)(stream);
    // ... handle data
  } catch (err) {
    // Show iOS-specific guidance: "Go to Settings > Safari > Microphone"
  }
};

// TTS must be triggered by user interaction
const speakText = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance); // Works on iOS after user tap
};
```
**CSS:** Add `.voiceOrb.paused` state with pulsing animation paused via `animation-play-state: paused` when permission denied.

---

## 3. Keyboard on Mobile
**Rating:** CRITICAL
**Issue:** Virtual keyboard pushes viewport up, potentially hiding sidebar or input. `100vh` is unreliable on mobile browsers.

**Solutions:**
```javascript
// Use visual viewport API to adjust layout
const [keyboardHeight, setKeyboardHeight] = useState(0);

useEffect(() => {
  const handleResize = () => {
    if (window.visualViewport) {
      setKeyboardHeight(window.innerHeight - window.visualViewport.height);
    }
  };
  window.visualViewport?.addEventListener('resize', handleResize);
  return () => window.visualViewport?.removeEventListener('resize', handleResize);
}, []);

// In layout:
<main style={{
  height: `calc(100vh - ${keyboardHeight}px)`,
  paddingBottom: keyboardHeight > 0 ? 16 : 0
}}>
```
**CSS:** Avoid `position: fixed` for sidebar/input containers. Use `position: sticky` or flexbox with `flex-shrink: 0` on input area.

---

## 4. Offline/Slow Network
**Rating:** HIGH
**Issue:** Conversations list fails to load. Empty state must guide user (retry, cached data). Voice messages may fail to upload.

**Solutions:**
```tsx
// Empty state component
const ConversationsEmpty = ({ error, onRetry }) => (
  <div role="status" aria-live="polite">
    {error ? (
      <>
        <Icon name="wifi-off" size={48} />
        <p>Unable to load conversations.</p>
        <Button onClick={onRetry}>Retry</Button>
        <p><small>Last updated: {lastSyncTime}</small></p>
      </>
    ) : (
      <p>No conversations yet. Start a chat with your coach!</p>
    )}
  </div>
);

// Network status hook
const useNetworkStatus = () => {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return online;
};
```
**CSS:** Show subtle offline indicator (e.g., top border `3px solid var(--color-gilded-fern)`) when offline.

---

## 5. Long Conversation Titles
**Rating:** MEDIUM
**Issue:** Auto-generated from first message. May exceed container width or wrap awkwardly.

**Solutions:**
```css
.conversationTitle {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 2.6em; /* 2 lines at 1.3 line-height */
  word-break: break-word;
}

/* Fallback for non-webkit */
@supports not (-webkit-line-clamp: 2) {
  .conversationTitle {
    display: block;
    max-height: 2.6em;
    overflow: hidden;
    position: relative;
  }
  .conversationTitle::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 50px;
    height: 1.3em;
    background: linear-gradient(to right, transparent, var(--color-bg));
  }
}
```
**React:** Truncate at 100 characters in the backend before sending to frontend, but keep full title in `title` attribute.

---

## 6. Large Message History
**Rating:** HIGH
**Issue:** 100+ messages cause DOM bloat, jank on scroll, memory pressure on low-end devices.

**Solutions:**
```tsx
// Use react-window or react-virtualized
import { FixedSizeList as List } from 'react-window';

const MessageList = ({ messages }) => (
  <List
    height={window.innerHeight - inputHeight}
    itemCount={messages.length}
    itemSize={80} /* average message height */
    width="100%"
    overscanCount={5}
  >
    {({ index, style }) => (
      <MessageBubble
        message={messages[index]}
        style={style}
      />
    )}
  </List>
);

// For variable height messages, use VariableSizeList with estimated heights.
// Implement "load more" on scroll to top for history (infinite scroll reverse).
```
**CSS:** Ensure `position: sticky` for input area doesn't interfere with virtual list.

---

## 7. RTL Languages
**Rating:** LOW (but proactive)
**Issue:** Sidebar layout must flip. Current CSS likely uses `margin-left`, `padding-left`.

**Solutions:**
```css
/* Use logical properties everywhere */
.sidebarItem {
  padding-inline-start: 12px; /* instead of padding-left */
  margin-inline-end: 8px; /* instead of margin-right */
  text-align: start; /* instead of left */
}

.actionButtons {
  flex-direction: row-reverse; /* if icons should appear on left in RTL */
}

/* For icons that are directional (e.g., chevron) */
.icon-chevron {
  transform: rotate(180deg) in rtl; /* or use logical properties for rotation */
}
```
**React:** Wrap app in `< dir="rtl">` when language is RTL. Use `i18n` library (e.g., `react-i18next`) that sets `dir` attribute automatically.

---

## 8. Reduced Motion
**Rating:** HIGH
**Issue:** Voice orb pulsing, sidebar slide, thinking indicator may cause discomfort.

**Solutions:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .voiceOrb {
    animation: none !important;
    transform: scale(1);
  }

  .sidebar {
    transform: none !important; /* disable slide */
    width: 100%; /* show full sidebar on mobile without animation */
  }
}
```
**React:** Conditionally apply animation classes only if `!prefersReducedMotion`.

---

## 9. Screen Reader
**Rating:** CRITICAL
**Issue:** Sidebar landmark, conversation list navigation, message bubble roles, voice recording status announcements.

**Solutions:**
```tsx
// Sidebar landmark
<aside aria-label="Conversations" role="complementary">
  <h2 className="sr-only">Your conversations</h2>
  <ul role="list" aria-label="Conversation list">
    {conversations.map(conv => (
      <li
        key={conv.id}
        role="listitem"
        aria-current={activeId === conv.id ? 'true' : undefined}
      >
        <button
          aria-label={`Conversation with ${conv.title}, last message ${conv.timestamp}`}
          onClick={() => select(conv.id)}
        >
          {/* ... */}
        </button>
      </li>
    ))}
  </ul>
</aside>

// Voice recording status
const [recordingStatus, setRecordingStatus] = useState<'idle'|'recording'|'processing'>('idle');

useEffect(() => {
  if (recordingStatus === 'recording') {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.textContent = 'Recording voice message. Tap to stop.';
    document.body.appendChild(announcer);
    return () => document.body.removeChild(announcer);
  }
}, [recordingStatus]);

// Message bubbles
<div
  role="article"
  aria-label={`Message from ${sender.name} at ${timestamp}`}
  aria-sort={isOwn ? 'descending' : 'ascending'}
>
```

---

## 10. 4K Ultrawide
**Rating:** MEDIUM
**Issue:** Max-width constraints? Or full-stretch? Content readability on 3840px+ screens.

**Solutions:**
```css
/* Container constraints */
.appContainer {
  display: flex;
  max-width: 1920px; /* or 2560px for very large screens */
  margin: 0 auto;
  min-height: 100vh;
}

/* Sidebar and chat area */
.sidebar {
  flex: 0 0 320px;
  max-width: 320px;
}

.chatArea {
  flex: 1;
  max-width: 1200px; /* prevent lines from becoming too long */
  margin: 0 auto;
}

/* At 3840px, consider 2-column chat layout for productivity? */
@media (min-width: 3840px) {
  .chatArea {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
}
```
**React:** Use `useMediaQuery` hook to adjust layout at `3840px` breakpoint (e.g., show multiple conversations side-by-side).

---

## Summary Table

| # | Issue | Rating | Key Fix |
|---|-------|--------|---------|
| 1 | Sidebar on 320px | CRITICAL | Truncate titles (2 lines), wrap action buttons, reduce padding |
| 2 | iOS voice recording | CRITICAL | Prefix `MediaRecorder`,

---

*Part of SwanStudios 14-Brain Recursive Consensus System*

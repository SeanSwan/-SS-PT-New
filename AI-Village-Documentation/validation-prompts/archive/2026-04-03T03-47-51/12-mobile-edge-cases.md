# Mobile & Edge Case Analysis — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 42.7s
> **Files:** docs/ai-workflow/blueprints/ONBOARDING-WORKFLOW-OVERHAUL-PLAN.md
> **Generated:** 4/2/2026, 8:47:53 PM

---

# Mobile & Edge Case Review: SwanStudios Onboarding Workflow Overhaul

## 1. Sidebar on 320px (85vw = 272px)
**Rating:** HIGH  
**Issue:** 272px width must accommodate conversation title (auto-generated, potentially long), timestamp, and action buttons (3+ icons). Risk of text truncation or horizontal scroll on smallest breakpoint.  
**Solution:**  
- **CSS:** Use flex column layout with `gap: 8px`. Hide timestamps on screens <375px. Truncate titles to 1 line on 320px, 2 lines on 375px+.  
- **React:** Conditionally render action buttons as icon-only on 320px, with `title` tooltips. Use `line-clamp` for titles.  
```css
.conversationItem {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 8px;
  min-height: 80px; /* touch target */
}
.title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 374px) {
  .timestamp { display: none; }
  .actions { gap: 4px; }
  .actionBtn { padding: 8px; } /* icon-only */
}
```

## 2. Voice Recording on iOS Safari
**Rating:** CRITICAL  
**Issue:** `MediaRecorder` has partial iOS Safari support (requires WebKit prefix, limited MIME types). Auto-play policies block TTS without user gesture.  
**Solution:**  
- **Feature detection:** `const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);`  
- **Fallback recording:** Use `AudioContext` + `ScriptProcessorNode` for iOS, or send raw audio to backend for processing.  
- **TTS:** Require explicit user click to play; use `speechSynthesis.speak()` after interaction. Add `playsinline` to `<audio>` elements.  
```tsx
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let recorder;
  if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) {
    recorder = new MediaRecorder(stream);
  } else if (isIOS) {
    // iOS fallback: use AudioContext to capture chunks
    recorder = new IOSAudioRecorder(stream); // custom class
  }
  // ... handle data
};
```

## 3. Keyboard on Mobile
**Rating:** HIGH  
**Issue:** Virtual keyboard pushes content up; sidebar may be pushed off-screen or cause layout shift. Chat input area must remain visible.  
**Solution:**  
- Use `visualViewport` API to detect keyboard height and adjust layout.  
- Fix chat input area to bottom with `position: sticky` or `fixed`, and add bottom padding equal to keyboard height.  
```tsx
const [keyboardHeight, setKeyboardHeight] = useState(0);
useEffect(() => {
  const vv = window.visualViewport;
  const update = () => setKeyboardHeight(window.innerHeight - vv.height);
  vv?.addEventListener('resize', update);
  return () => vv?.removeEventListener('resize', update);
}, []);
// In chat container:
style={{ paddingBottom: `${keyboardHeight}px` }}
```

## 4. Offline/Slow Network
**Rating:** MEDIUM  
**Issue:** Conversations list fails to load; need empty state with retry, cached data fallback.  
**Solution:**  
- Implement skeleton loaders for initial load.  
- Use `react-query` or SWR with `staleTime` and `cacheTime` for offline support.  
- Show retry button with exponential backoff.  
```tsx
const { data, error, isLoading, refetch } = useQuery('conversations', fetchConversations, {
  retry: 3,
  staleTime: 5 * 60 * 1000,
});
if (error) return <ErrorState onRetry={refetch} />;
if (isLoading) return <SkeletonList />;
```

## 5. Long Conversation Titles
**Rating:** MEDIUM  
**Issue:** Auto-generated from first message; may be very long. Need truncation strategy.  
**Solution:**  
- CSS `line-clamp: 2` for titles on ≥375px, `line-clamp: 1` on 320px.  
- Add tooltip on hover/focus showing full title.  
```css
.title {
  display: -webkit-box;
  -webkit-line-clamp: var(--lines, 2);
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (max-width: 374px) {
  .title { --lines: 1; }
}
```

## 6. Large Message History (100+ Messages)
**Rating:** HIGH  
**Issue:** Performance degradation, memory usage. Virtual scrolling needed.  
**Solution:**  
- Use `react-window` or `react-virtualized` for message list.  
- Estimate item height or use `VariableSizeList` if messages vary.  
- Implement message pagination/infinite scroll with `useInfiniteQuery`.  
```tsx
import { FixedSizeList as List } from 'react-window';
const Row = ({ index, style }) => (
  <div style={style}>
    <MessageBubble message={messages[index]} />
  </div>
);
return <List height={windowHeight} itemCount={messages.length} itemSize={80} width="100%" />;
```

##

---

*Part of SwanStudios 14-Brain Recursive Consensus System*

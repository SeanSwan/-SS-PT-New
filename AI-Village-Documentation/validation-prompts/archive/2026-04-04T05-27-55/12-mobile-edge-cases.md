# Mobile & Edge Case Analysis — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 35.9s
> **Files:** docs/ai-workflow/blueprints/CLAUDE-MD-TOKEN-OPTIMIZATION-PLAN.md
> **Generated:** 4/3/2026, 10:27:55 PM

---

# Mobile & Edge Case Review: SwanStudios Platform

## Executive Summary
**Overall Risk Level: HIGH** — Multiple critical mobile UX issues require immediate attention before production launch. The 320px sidebar design is particularly concerning given the target demographic (wealthy golf clients, working professionals) who often use high-end mobile devices but expect polished experiences.

---

## Detailed Breakdown

### 1. Sidebar on 320px Viewport
**Rating: CRITICAL**  
**Issue:** 85vw = 272px on 320px leaves only 48px for chat area. With conversation titles, timestamps, and action buttons, content will overflow or require excessive truncation.

**CSS/React Solutions:**
```tsx
// Responsive sidebar strategy
const Sidebar = styled.aside`
  /* Mobile-first: full width on smallest screens */
  width: 100%;
  
  @media (min-width: 430px) {
    width: 85vw; /* Only apply 85vw at/above 430px */
    max-width: 320px;
  }
  
  /* Ensure minimum content area */
  @media (max-width: 429px) {
    .conversation-item {
      padding: 12px 8px;
      font-size: 0.875rem;
    }
    
    .timestamp {
      display: none; /* Hide timestamps on 320-375px */
    }
    
    .action-buttons {
      opacity: 0.7;
      padding: 4px;
    }
  }
`;

// Alternative: Bottom navigation on mobile
const MobileNav = styled.nav`
  display: block;
  
  @media (min-width: 768px) {
    display: none;
  }
`;
```

**Recommendation:** Switch to full-width sidebar on 320-375px with condensed UI, or implement bottom tab navigation for conversations on mobile.

---

### 2. Voice Recording on iOS Safari
**Rating: HIGH**  
**Issue:** iOS Safari requires WebKit prefixes for MediaRecorder and has strict auto-play policies for TTS.

**CSS/React Solutions:**
```tsx
// MediaRecorder with iOS Safari compatibility
const useMediaRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Check for MediaRecorder support with WebKit prefix
      const MediaRecorderClass = window.MediaRecorder || 
        (window as any).webkitMediaRecorder;
      
      if (!MediaRecorderClass) {
        throw new Error('MediaRecorder not supported on this browser');
      }
      
      const recorder = new MediaRecorderClass(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      // iOS Safari requires user interaction for audio playback
      const audioContext = new (window.AudioContext || 
        (window as any).webkitAudioContext)();
      
      return recorder;
    } catch (error) {
      console.error('Voice recording failed:', error);
      // Fallback: show UI instructions for iOS
    }
  };
  
  return { startRecording, isRecording };
};

// TTS with iOS auto-play policy workaround
const speakText = async (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    // iOS requires resume on user interaction
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    }
    
    speechSynthesis.speak(utterance);
  }
};
```

**Recommendation:** Implement feature detection with graceful fallbacks. Add iOS-specific UI hints: "Tap to enable voice" with explicit user gesture requirements.

---

### 3. Mobile Keyboard Management
**Rating: HIGH**  
**Issue:** Virtual keyboard can push sidebar off-screen or cause layout shifts. Need to manage viewport height dynamically.

**CSS/React Solutions:**
```tsx
// Keyboard-aware layout
const ChatContainer = styled.div<{ keyboardOpen: boolean }>`
  /* Use dynamic viewport units */
  height: ${props => props.keyboardOpen ? '100dvh' : '100vh'};
  height: ${props => props.keyboardOpen ? 'calc(100vh - env(keyboard-inset-height, 0px))' : '100vh'};
  
  /* iOS Safari safe area */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  
  /* Prevent layout shift */
  display: flex;
  flex-direction: column;
  
  .messages-area {
    flex: 1;
    overflow-y: auto;
    /* Ensure visible when keyboard opens */
    -webkit-overflow-scrolling: touch;
  }
  
  .input-area {
    /* Fixed position at bottom */
    position: sticky;
    bottom: 0;
    background: var(--bg-base, #0A0A0F);
    border-top: 1px solid var(--border-color, #1A1A24);
  }
`;

// Hook for keyboard detection
const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  useEffect(() => {
    const handleResize = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        const heightDiff = window.innerHeight - visualViewport.height;
        setKeyboardHeight(heightDiff > 100 ? heightDiff : 0);
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('visualViewportChange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('visualViewportChange', handleResize);
    };
  }, []);
  
  return keyboardHeight;
};
```

**Recommendation:** Use `100dvh` (dynamic viewport height) with fallbacks. Test on iOS Safari specifically as it handles viewport units differently.

---

### 4. Offline/Slow Network Handling
**Rating: MEDIUM**  
**Issue:** Conversations list failure needs graceful empty states and retry mechanisms.

**CSS/React Solutions:**
```tsx
// Offline-aware component
const ConversationsList = () => {
  const { data, error, isLoading, refetch } = useConversations();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!isOnline) {
    return (
      <OfflineBanner>
        <WifiOffIcon />
        <span>You're offline. Showing cached conversations.</span>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </OfflineBanner>
    );
  }
  
  if (error) {
    return (
      <ErrorState 
        title="Couldn't load conversations"
        message="Check your connection and try again"
        onRetry={refetch}
      />
    );
  }
  
  if (isLoading) {
    return <SkeletonLoader count={5} />;
  }
  
  if (data?.length === 0) {
    return (
      <EmptyState
        icon={<ChatIcon />}
        title="No conversations yet"
        description="Start a chat with your AI coach to begin your fitness journey"
        action={{
          label: "Start First Conversation",
          onClick: () => navigate('/chat/new')
        }}
      />
    );
  }
  
  return <ConversationListContent data={data} />;
};

// Service Worker for offline caching (if PWA)
// public/sw.js - cache conversations list and recent messages
```

**Recommendation:** Implement service worker for offline caching of recent conversations. Add network status indicator in header.

---

### 5. Long Conversation Titles
**Rating: MEDIUM**  
**Issue:** Auto-generated titles from first message need truncation strategy.

**CSS/React Solutions:**
```tsx
// Truncated title component
const ConversationTitle = styled.h3<{ isMobile: boolean }>`
  /* Line clamp based on viewport */
  display: -webkit-box;
  -webkit-line-clamp: ${props => props.isMobile ? 2 : 1};
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  
  /* Fallback for non-webkit */
  max-height: ${props => props.isMobile ? '3rem' : '1.5rem'};
  
  /* Ensure readability */
  font-size: ${props => props.isMobile ? '0.875rem' : '1rem'};
  line-height: 1.5;
  
  /* Prevent title from breaking UI */
  word-break: break-word;
`;

// Smart title generation
const generateTitle = (firstMessage: string, maxLength: number = 50) => {
  const words = firstMessage.trim().split(/\s+/);
  let title = words[0];
  
  for (let i = 1; i < words.length; i++) {
    if ((title + ' ' + words[i]).length > maxLength) {
      return title + '...';
    }
    title += ' ' + words[i];
  }
  
  return title || 'New Conversation';
};

// Usage in conversation item
const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const title = useMemo(() => 
    generateTitle(conversation.firstMessage), 
    [conversation.firstMessage]
  );
  
  return (
    <div className="conversation-item">
      <ConversationTitle isMobile={isMobile}>
        {title}
      </ConversationTitle>
      <Timestamp>{formatTimestamp(conversation.lastActivity)}</Timestamp>
    </div>
  );
};
```

**Recommendation:** Use CSS line-clamp with fallback. Generate titles with 50-char limit. Consider showing full title on hover/tap on desktop.

---

### 6. Large Message History (100+ messages)
**Rating: HIGH**  
**Issue:** Unoptimized rendering of long conversations will cause performance issues on mobile devices.

**CSS/React Solutions:**
```tsx
// Virtual scrolling with react-window or react-virtualized
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const MessageList = ({ messages }: { messages: Message[] }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  );
  
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          width={width}
          itemCount={messages.length}
          itemSize={80} // Approximate message height
          overscanCount={5} // Render 5 extra items above/below viewport
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
};

// Alternative: Windowing with CSS containment
const MessageContainer = styled.div`
  /* Enable GPU acceleration */
  transform: translateZ(0);
  
  /* CSS containment for performance */
  contain: content;
  
  /* Smooth scrolling */
  scroll-behavior: smooth;
  
  /* Message items */
  .message {
    /* Promote to own layer */
    will-change: transform;
    contain: layout style paint;
  }
`;

// Lazy load older messages
const useInfiniteMessages = (conversationId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const oldestMessage = messages[messages.length - 1];
      const newMessages = await fetchMessages(conversationId, {
        before: oldestMessage?.id,
        limit: 30
      });
      
      setMessages(prev => [...prev, ...newMessages]);
      setHasMore(newMessages.length === 30);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messages, isLoading, hasMore]);
  
  // Intersection Observer for infinite scroll
  const observerRef = useRef<IntersectionObserver>();
  const lastMessageRef = useCallback((node: HTMLDivElement) => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [hasMore, loadMore]);
  
  return { messages, hasMore, isLoading, lastMessageRef };
};
```

**Recommendation:** Implement virtual scrolling for >50 messages. Use `react-window` or `react-virtualized`. Add message grouping by date to reduce count.

---

### 7. RTL Language Support
**Rating: LOW** (Not immediate but architectural)  
**Issue:** Sidebar and layout need to flip correctly for RTL languages.

**CSS/React Solutions:**
```tsx
// Use CSS logical properties throughout
const Sidebar = styled.aside`
  /* Instead of margin-left, use margin-inline-start */
  margin-inline-start: 0;
  
  /* Instead of padding-left/right */
  padding-inline: 16px;
  
  /* Instead of left/right positioning */
  inset-inline-start: 0;
  
  /* Text alignment */
  text-align: start; /* Automatically LTR/RTL */
  
  /* Flexbox with logical

---

*Part of SwanStudios 14-Brain Recursive Consensus System*

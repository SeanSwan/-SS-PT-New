# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 46.1s
> **Files:** frontend/src/pages/GalleryPage.tsx
> **Generated:** 3/12/2026, 12:41:12 AM

---

# Code Review: frontend/src/pages/GalleryPage.tsx

## 🔴 CRITICAL Issues

### 1. Missing Error Boundaries
**Severity:** CRITICAL  
**Location:** Component root  
**Issue:** No error boundary wrapping async operations or child components. A single unhandled error will crash the entire gallery experience.

```tsx
// Missing error boundary wrapper
const GalleryPage: React.FC = () => {
  // 1000+ lines of code with no error boundary protection
```

**Fix:**
```tsx
// Create ErrorBoundary.tsx
class GalleryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Wrap component
export default () => (
  <GalleryErrorBoundary>
    <GalleryPage />
  </GalleryErrorBoundary>
);
```

---

### 2. Unsafe `any` Type in Redux Selector
**Severity:** CRITICAL  
**Location:** Line 1035  
**Issue:** `state: any` bypasses all type safety for Redux state access.

```tsx
const authUser = useSelector((state: any) => state.auth?.user);
```

**Fix:**
```tsx
// types/redux.ts
interface RootState {
  auth: {
    user: {
      id: number;
      email: string;
      availableSessions?: number;
    } | null;
  };
}

// In component
const authUser = useSelector((state: RootState) => state.auth?.user);
```

---

### 3. Unguarded sessionStorage Access
**Severity:** CRITICAL  
**Location:** Lines 1038-1042, 1126, 1231  
**Issue:** sessionStorage can throw in private browsing mode or when disabled. Multiple unguarded accesses will crash the app.

```tsx
const saved = sessionStorage.getItem(`gallery-token-${slug || ''}`);
// No error handling if sessionStorage is unavailable
```

**Fix:**
```tsx
// utils/storage.ts
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      console.warn('sessionStorage unavailable');
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      console.warn('sessionStorage unavailable');
    }
  },
  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      console.warn('sessionStorage unavailable');
    }
  }
};

// Usage
const saved = safeSessionStorage.getItem(`gallery-token-${slug || ''}`);
```

---

### 4. Missing Abort Controllers for Fetch Requests
**Severity:** CRITICAL  
**Location:** All fetch calls (lines 1095-1105, 1112-1123, 1128-1138, etc.)  
**Issue:** No cleanup for in-flight requests when component unmounts. Causes memory leaks and race conditions.

```tsx
useEffect(() => {
  if (galleryToken) {
    fetchCredits(); // No cleanup if component unmounts
  }
}, [galleryToken, fetchCredits]);
```

**Fix:**
```tsx
useEffect(() => {
  if (!galleryToken) return;
  
  const controller = new AbortController();
  
  const fetchCredits = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/gallery/credits`, {
        headers: { Authorization: `Bearer ${galleryToken}` },
        signal: controller.signal,
      });
      // ... rest of logic
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Handle other errors
    }
  };
  
  fetchCredits();
  
  return () => controller.abort();
}, [galleryToken]);
```

---

## 🟠 HIGH Priority Issues

### 5. Stale Closure in `handleVote` Callback
**Severity:** HIGH  
**Location:** Lines 1155-1197  
**Issue:** `handleVote` depends on `votesMap` but doesn't declare it in dependencies. Optimistic updates will use stale data.

```tsx
const handleVote = useCallback(async (photoId: number, voteType: 1 | -1) => {
  const prev = votesMap[photoId] || { ... }; // Stale closure
  // ...
}, [galleryToken, votesMap]); // votesMap missing from deps
```

**Fix:**
```tsx
const handleVote = useCallback(async (photoId: number, voteType: 1 | -1) => {
  if (!galleryToken) return;
  
  setVotesMap(currentVotes => {
    const prev = currentVotes[photoId] || { thumbsUp: 0, thumbsDown: 0, userVote: null };
    // ... compute optimistic update using currentVotes
    return { ...currentVotes, [photoId]: optimistic };
  });
  
  // ... rest of logic
}, [galleryToken]); // No votesMap dependency needed
```

---

### 6. Missing Loading States for Async Operations
**Severity:** HIGH  
**Location:** Lines 1095-1105, 1128-1138, 1155-1197  
**Issue:** No loading indicators for `fetchCredits`, `loadVotes`, `handleVote`. Users see no feedback during network operations.

```tsx
const fetchCredits = useCallback(async () => {
  if (!galleryToken) return;
  try {
    const res = await fetch(/* ... */);
    // No loading state set
  } catch { }
}, [galleryToken]);
```

**Fix:**
```tsx
const [creditsLoading, setCreditsLoading] = useState(false);

const fetchCredits = useCallback(async () => {
  if (!galleryToken) return;
  setCreditsLoading(true);
  try {
    const res = await fetch(/* ... */);
    // ...
  } catch {
    // ...
  } finally {
    setCreditsLoading(false);
  }
}, [galleryToken]);
```

---

### 7. Hardcoded Color Values in Styled Components
**Severity:** HIGH  
**Location:** Throughout (lines 100-900+)  
**Issue:** 50+ instances of hardcoded colors like `#8B5CF6`, `#60C0F0`, `#002060` instead of theme tokens. Violates design system.

```tsx
const PageTitle = styled.h1`
  background: linear-gradient(135deg, #8B5CF6, #60C0F0); // Hardcoded
`;
```

**Fix:**
```tsx
// theme.ts
export const theme = {
  colors: {
    primary: '#8B5CF6',
    secondary: '#60C0F0',
    background: {
      dark: '#002060',
      darker: '#001030',
    },
    gold: {
      primary: '#C6A84B',
      dark: '#AA801E',
    }
  }
};

// Component
const PageTitle = styled.h1`
  background: linear-gradient(135deg, ${p => p.theme.colors.primary}, ${p => p.theme.colors.secondary});
`;
```

---

### 8. Inline Function Creation in Render
**Severity:** HIGH  
**Location:** Lines 1380-1385, 1450-1455, 1520-1525  
**Issue:** Anonymous functions created on every render cause unnecessary re-renders of child components.

```tsx
<HeroPrimaryButton
  onClick={() => {
    const eventsSection = document.getElementById('events-section');
    eventsSection?.scrollIntoView({ behavior: 'smooth' });
  }}
>
```

**Fix:**
```tsx
const scrollToEvents = useCallback(() => {
  const eventsSection = document.getElementById('events-section');
  eventsSection?.scrollIntoView({ behavior: 'smooth' });
}, []);

// Usage
<HeroPrimaryButton onClick={scrollToEvents}>
```

---

### 9. Missing Keys in Shimmer Loading Array
**Severity:** HIGH  
**Location:** Lines 1395-1397  
**Issue:** Array map without stable keys causes React reconciliation issues.

```tsx
{[1,2,3].map(i => <LoadingShimmer key={i} />)}
```

**Fix:**
```tsx
const SHIMMER_COUNT = 3;
const shimmerKeys = useMemo(() => 
  Array.from({ length: SHIMMER_COUNT }, (_, i) => `shimmer-${i}`), 
  []
);

{shimmerKeys.map(key => <LoadingShimmer key={key} />)}
```

---

### 10. Unsafe Optional Chaining in Critical Path
**Severity:** HIGH  
**Location:** Lines 1520, 1525  
**Issue:** `photos[lightboxIndex!]` uses non-null assertion but lightboxIndex can be null. Runtime crash risk.

```tsx
photo={lightboxIndex !== null ? photos[lightboxIndex] : null}
// Later:
onDownloadOriginal={handleDownloadOriginal}
onRequestEnhancement={handleEnhanceClick}
// These assume photo exists
```

**Fix:**
```tsx
const currentPhoto = useMemo(() => {
  if (lightboxIndex === null || lightboxIndex < 0 || lightboxIndex >= photos.length) {
    return null;
  }
  return photos[lightboxIndex];
}, [lightboxIndex, photos]);

<PhotoDetailModal
  isOpen={currentPhoto !== null}
  photo={currentPhoto}
  // ...
/>
```

---

## 🟡 MEDIUM Priority Issues

### 11. Duplicated Fetch Logic
**Severity:** MEDIUM  
**Location:** Lines 1095-1105, 1112-1123, 1128-1138, 1155-1197  
**Issue:** Repeated fetch patterns with identical error handling and auth headers.

**Fix:**
```tsx
// hooks/useGalleryApi.ts
const useGalleryApi = (galleryToken: string | null) => {
  const apiFetch = useCallback(async <T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    if (!galleryToken) return { success: false, error: 'No token' };
    
    const controller = new AbortController();
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
          ...options?.headers,
        },
        signal: controller.signal,
      });
      const data = await res.json();
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Cancelled' };
      }
      return { success: false, error: 'Network error' };
    }
  }, [galleryToken]);
  
  return { apiFetch };
};
```

---

### 12. Missing Prop Types for Styled Component Transient Props
**Severity:** MEDIUM  
**Location:** Lines 150, 300, 650, 750  
**Issue:** Transient props (`$src`, `$loading`, `$selected`) lack TypeScript interfaces.

```tsx
const EventCover = styled.div<{ $src: string | null }>`
  // No interface definition
`;
```

**Fix:**
```tsx
interface EventCoverProps {
  $src: string | null;
}

const EventCover = styled.div<EventCoverProps>`
  width: 100%;
  height: 200px;
  background: ${p => p.$src ? `url(${p.$src}) center/cover` : 'linear-gradient(135deg, #1a1035, #002060)'};
`;
```

---

### 13. Unvalidated Environment Variable
**Severity:** MEDIUM  
**Location:** Line 20  
**Issue:** `API_BASE` fallback logic can fail silently in production if env var is empty string.

```tsx
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');
```

**Fix:**
```tsx
const getApiBase = (): string => {
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase && typeof envBase === 'string') return envBase;
  
  if (import.meta.env.PROD) {
    console.error('VITE_API_BASE not configured in production');
    return ''; // Same-origin fallback
  }
  
  return 'http://localhost:10000';
};

const API_BASE = getApiBase();
```

---

### 14. Missing Accessibility Labels
**Severity:** MEDIUM  
**Location:** Lines 650-750 (PhotoCard, PhotoImg)  
**Issue:** Images lack proper alt text. PhotoCard clickable divs lack ARIA labels.

```tsx
<PhotoImg
  src={photo.thumbnailUrl || photo.url}
  alt={photo.displayName} // Generic, not descriptive
/>
```

**Fix:**
```tsx
<PhotoCard
  role="button"
  aria-label={`View photo ${photo.displayName} in lightbox`}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPhotoModal(photos.indexOf(photo));
    }
  }}
>
  <PhotoImg
    src={photo.thumbnailUrl || photo.url}
    alt={`${selectedEvent?.name || 'Event'} photo ${photo.photoNumber}: ${photo.displayName}`}
    loading="lazy"
  />
</PhotoCard>
```

---

### 15. Potential Memory Leak in Toast Timer
**Severity:** MEDIUM  
**Location:** Lines 1110-1119  
**Issue:** `toastTimerRef.current` cleanup only happens on unmount, not when toast is manually dismissed.

```tsx
const showToast = useCallback(() => {
  setShowWelcomeToast(true);
  setToastExiting(false);
  toastTimerRef.current = setTimeout(() => { /* ... */ }, 4000);
  // No cleanup if showToast called multiple times
}, []);
```

**Fix:**
```tsx
const showToast = useCallback(() => {
  // Clear existing timer
  if (toastTimerRef.current) {
    clearTimeout(toastTimerRef.current);
  }
  
  setShowWelcomeToast(true);
  setToastExiting(false);
  toastTimerRef.current = setTimeout(() => {
    setToastExiting(true);
    setTimeout(() => setShowWelcomeToast(false), 400);
  }, 4000);
}, []);
```

---

## 🟢 LOW Priority Issues

### 16. Magic Numbers in Styled Components
**Severity:** LOW  
**Location:** Throughout  
**Issue:** Hardcoded spacing values (24px, 16px, 40px) instead of theme spacing scale.

```tsx
padding: 40px 28px;
gap: 24px;
margin-bottom: 16px;
```

**Fix:**
```tsx
// theme.ts
export const theme = {
  spacing: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '40px',
    xl: '64px',
  }
};

// Usage
padding: ${p => p.theme.spacing.lg} ${p => p.theme.spacing.md};
```

---

*Part of SwanStudios 7-Brain Validation System*

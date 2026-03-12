# AI Data Enrichment v5.0 + Gallery Resilience Plan
## SwanStudios — Maximum Granularity AI & Bulletproof Photo Gallery

---

## Part 1: AI Data Enrichment v5.0 — ZERO LIMITS on Client Data

### Problem
The AI workout generation system had arbitrary `limit` constraints on data queries:
- `masterPromptBuilder.mjs`: WorkoutSession capped at 30, BodyMeasurement at 5, PainEntries at 10, TrainerNotes at 5, Goals at 5
- `aiWorkoutController.mjs`: WorkoutSession capped at 30, BodyMeasurement at 5
- Result: AI only sees a small window of client history, missing long-term trends, seasonal patterns, and complete injury/recovery timelines

### Solution: Remove ALL Query Limits
Every data source that feeds into AI workout generation now has **no `limit` parameter**. The AI sees:
- **Every single workout session** the client has ever logged
- **Every body measurement** ever recorded
- **Every pain entry** (active and historical)
- **Every trainer note** (high/critical severity)
- **Every active goal** with full progress data

### Files Modified
| File | Change | Before → After |
|------|--------|----------------|
| `backend/services/masterPromptBuilder.mjs` | WorkoutSession | `limit: 30` → no limit |
| `backend/services/masterPromptBuilder.mjs` | ClientPainEntry | `limit: 10` → no limit |
| `backend/services/masterPromptBuilder.mjs` | BodyMeasurement | `limit: 5` → no limit |
| `backend/services/masterPromptBuilder.mjs` | ClientNote | `limit: 5` → no limit |
| `backend/services/masterPromptBuilder.mjs` | Goal | `limit: 5` → no limit |
| `backend/controllers/aiWorkoutController.mjs` | WorkoutSession | `limit: 30` → no limit |
| `backend/controllers/aiWorkoutController.mjs` | BodyMeasurement | `limit: 5` → no limit |

### Data Flow Architecture (v5.0)
```
Client Request → AI Workout Controller
  ├── Phase 1: User Model (profile, preferences, fitnessLevel)
  ├── Phase 2: masterPromptBuilder v5.0
  │   ├── WaiverRecord (medical clearance, injuries)
  │   ├── MovementAnalysis (OHSA, postural, corrective strategies)
  │   ├── EquipmentProfile + Items (ALL active profiles)
  │   ├── WorkoutSession + WorkoutLogs (ALL sessions, ALL logs per session)
  │   ├── ClientBaselineMeasurements (latest)
  │   ├── ClientOnboardingQuestionnaire (goals, preferences)
  │   ├── ClientPainEntry (ALL entries, severity-sorted)
  │   ├── BodyMeasurement (ALL measurements, trend analysis)
  │   ├── ClientNote (ALL high/critical trainer notes)
  │   └── Goal (ALL active/in-progress goals)
  ├── Phase 5A: Progress Context (from ALL sessions)
  │   ├── Exercise frequency analysis
  │   ├── Volume progression trends
  │   ├── 1RM calculations (Epley formula)
  │   ├── Form quality trends
  │   └── NASM category distribution
  ├── Phase 11F: Body Composition Context (ALL measurements)
  │   ├── Weight trajectory
  │   ├── Body fat percentage trend
  │   ├── Muscle mass changes
  │   └── Progress scores over time
  └── AI Prompt Assembly → Gemini/OpenAI → Workout Plan
```

### Performance Consideration
For clients with 500+ workout sessions, the full history query may take 2-5 seconds. This is acceptable because:
1. Workout generation is already a 5-15 second process (AI API call)
2. The data is fetched in parallel with other queries (Promise.all)
3. The richer context produces significantly better workout plans
4. We can add pagination/summarization later if needed for extreme cases

### AI Context Enhancement Checklist
- [x] Complete workout history (every session, every set, every rep)
- [x] Full body measurement timeline (weight, body fat, muscle mass trends)
- [x] All pain/injury entries with aggravating movements and relieving factors
- [x] All trainer flags and critical notes
- [x] All active goals with progress percentages
- [x] Movement analysis with compensations and corrective strategies
- [x] Equipment availability across all profiles
- [x] Consistency metrics (streaks, weekly averages, gaps)
- [x] Onboarding questionnaire data (experience level, preferences, dislikes)

---

## Part 2: Gallery Photo Resilience — Never Lose Photos on Navigation

### Problem
Gallery photos fail to load or disappear when:
1. User navigates away and comes back (no AbortController cleanup)
2. User opens another tab (in-flight requests orphaned, state updates on unmounted components)
3. Large photo grids overwhelm browser (no error recovery, broken images stay broken)
4. Image URLs expire or R2 returns 403 (no retry mechanism)

### Root Causes Found
| Issue | Location | Impact |
|-------|----------|--------|
| No AbortController | `loadPhotos()` line 1173 | Stale state updates after navigation |
| No AbortController | `loadVotes()` line 1206 | Orphaned requests |
| No AbortController | `fetchCredits()` line 1123 | Memory leak |
| No image error handler | `<PhotoImg>` line 1702 | Broken images show alt text forever |
| No image retry | All image loads | One failure = permanent broken image |
| No cleanup on unmount | All useEffect hooks | React warnings, stale updates |
| Nested fetch in setState | `loadPhotos()` line 1192 | Uncancellable background request |
| No download progress | Download flow line 1458 | Downloads proceed after modal close |

### Solution: 5-Layer Resilience System

#### Layer 1: AbortController on ALL Fetch Calls
```typescript
// Pattern for every API call:
const abortControllerRef = useRef<AbortController | null>(null);

const loadPhotos = async (eventSlug: string) => {
  // Cancel any in-flight request
  abortControllerRef.current?.abort();
  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${galleryToken}` },
      signal: controller.signal,
    });
    if (controller.signal.aborted) return; // Don't update state if aborted
    // ... process response
  } catch (err) {
    if (err.name === 'AbortError') return; // Expected cancellation
    setError('Failed to load photos');
  }
};

// Cleanup on unmount
useEffect(() => {
  return () => abortControllerRef.current?.abort();
}, []);
```

#### Layer 2: Image Error Recovery with Retry
```typescript
// Add onError handler to every <img> with retry logic
<PhotoImg
  src={photo.thumbnailUrl || photo.url}
  alt={photo.displayName}
  loading="lazy"
  onLoad={e => { (e.target as HTMLImageElement).style.animation = 'none'; }}
  onError={e => {
    const img = e.target as HTMLImageElement;
    const retryCount = parseInt(img.dataset.retryCount || '0');
    if (retryCount < 3) {
      img.dataset.retryCount = String(retryCount + 1);
      // Retry with cache-busting param after 1s delay
      setTimeout(() => {
        img.src = `${photo.thumbnailUrl || photo.url}?retry=${retryCount + 1}&t=${Date.now()}`;
      }, 1000 * (retryCount + 1));
    } else {
      // Show placeholder after 3 failed attempts
      img.src = '/placeholder-photo.svg';
      img.style.opacity = '0.5';
    }
  }}
/>
```

#### Layer 3: Photo State Persistence (SessionStorage)
```typescript
// Cache loaded photos in sessionStorage per event slug
const CACHE_KEY = `gallery-photos-${eventSlug}`;

// On successful load:
sessionStorage.setItem(CACHE_KEY, JSON.stringify({
  photos: data.photos,
  timestamp: Date.now(),
}));

// On mount: restore from cache first, then fetch fresh
const cached = sessionStorage.getItem(CACHE_KEY);
if (cached) {
  const { photos: cachedPhotos, timestamp } = JSON.parse(cached);
  // Show cached immediately (< 5 min old)
  if (Date.now() - timestamp < 5 * 60 * 1000) {
    setPhotos(cachedPhotos);
    setLoading(false);
  }
}
// Always fetch fresh in background
loadPhotos(slug);
```

#### Layer 4: Visibility API for Tab Switch Handling
```typescript
// Detect when user returns to tab and refresh stale data
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && slug && galleryToken) {
      // Re-validate images that may have failed while tab was hidden
      document.querySelectorAll('img[data-gallery-photo]').forEach(img => {
        const imgEl = img as HTMLImageElement;
        if (!imgEl.complete || imgEl.naturalHeight === 0) {
          // Force reload failed images
          const src = imgEl.src;
          imgEl.src = '';
          imgEl.src = src;
        }
      });
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [slug, galleryToken]);
```

#### Layer 5: Progressive Loading with Error Boundaries
- Wrap photo grid in React ErrorBoundary to catch render crashes
- Show "Some photos failed to load. Tap to retry" banner when errors detected
- Keep successfully loaded photos visible even if later batches fail

### Files to Modify
| File | Changes |
|------|---------|
| `frontend/src/pages/GalleryPage.tsx` | AbortController, image error handling, sessionStorage cache, visibility API |
| `frontend/src/pages/gallery/PhotoDetailModal.tsx` | Image error handling in lightbox, loading state recovery |

### Testing Scenarios
1. Load gallery → navigate to Store → navigate back to gallery → photos still visible
2. Load gallery → open new tab → wait 30s → return → photos reload gracefully
3. Load gallery with slow connection → some images 404 → retry shows them eventually
4. Load gallery → click photo for detail → image loads even if grid thumbnail failed
5. Load 100+ photos → scroll down → navigate away → come back → scroll position + photos restored

---

## Part 3: Additional AI Intelligence Rules

### Pain-Aware Exercise Selection
When `painAndInjuries.activePainEntries` contains entries:
- **Level 7-10:** EXCLUDE all exercises with aggravating movements for that body region
- **Level 4-6:** MODIFY exercises (reduce ROM, lower weight, add isometric alternatives)
- **Level 1-3:** NOTE in workout plan but allow normal training
- Always include the `aiGuidance` field verbatim in the AI prompt

### Form Quality Regression Detection
When `averageFormRating` drops below 70 over 3+ consecutive sessions:
- AI should reduce intensity by 10-15%
- Add 1-2 corrective exercises targeting the declining form areas
- Flag for trainer review

### Goal-Driven Periodization
When `activeGoals` are present:
- Weight loss goals → higher rep ranges (12-20), shorter rest (30-60s), metabolic circuits
- Strength goals → lower reps (3-6), longer rest (2-4min), compound movements
- Muscle gain goals → moderate reps (8-12), progressive overload, volume prioritization
- Endurance goals → circuit training, timed sets, cardio integration

### Consistency-Based Progression
When `consistency.averageSessionsPerWeek` data shows:
- < 2 sessions/week → Conservative progression, maintain rather than advance
- 2-3 sessions/week → Standard progression model
- 4+ sessions/week → Aggressive progression with recovery management
- If `daysSinceLastWorkout` > 14 → Deload week before resuming normal training

---

## Verification Checklist
- [ ] All query limits removed from masterPromptBuilder.mjs
- [ ] All query limits removed from aiWorkoutController.mjs
- [ ] AI workout generation works with full history
- [ ] Gallery photos persist across navigation
- [ ] Gallery photos recover from load failures
- [ ] Gallery photo cache in sessionStorage
- [ ] Tab switching doesn't break photo loading
- [ ] Error boundary catches gallery render crashes

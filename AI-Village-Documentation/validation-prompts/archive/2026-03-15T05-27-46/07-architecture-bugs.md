# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 93.5s
> **Files:** frontend/src/components/Charts/BadgeGallery.tsx, scripts/generate-badges.mjs, scripts/badge-manifest.json
> **Generated:** 3/14/2026, 10:27:46 PM

---

# Deep Code Review: SwanStudios Badge System

**Reviewer:** Principal Software Engineer  
**Files:** `frontend/src/components/Charts/BadgeGallery.tsx`, `scripts/generate-badges.mjs`, `scripts/badge-manifest.json`  
**Theme:** Enchanted Apex: Crystalline Swan  
**Production URL:** sswanstudios.com

---

## Executive Summary

This review identifies **4 CRITICAL bugs**, **3 HIGH severity issues**, **6 MEDIUM issues**, and **8 LOW issues** across the three files. The badge gallery has fundamental data integrity issues and missing production safeguards. The generation script has architectural problems and potential credential exposure.

---

## 1. Bug Detection

### CRITICAL

#### 1.1 Empty Styles Array Crash
| Severity | File | Line |
|----------|------|------|
| **CRITICAL** | BadgeGallery.tsx | 46 |

**What's Wrong:** The `buildBadgeList` function divides by zero and crashes when `manifest.styles` is empty:
```typescript
const style = manifest.styles[i % manifest.styles.length];  // NaN when empty
```

**Fix:**
```typescript
if (manifest.styles.length === 0) {
  return items; // Early return with empty array
}
const style = manifest.styles[i % manifest.styles.length];
```

---

#### 1.2 Image State Collision (Load + Fail)
| Severity | File | Line |
|----------|------|------|
| **CRITICAL** | BadgeGallery.tsx | 162-167 |

**What's Wrong:** If an image fails to load (`failedImages`), and the user triggers a re-render (e.g., changing filters), the component re-attempts to load the same failed URL. There's no mechanism to "un-fail" an image, but worse: there's no way to retry a failed load without clearing the entire state.

**Fix:** Add a retry mechanism for failed images:
```typescript
const handleImageError = useCallback((filename: string) => {
  setFailedImages(prev => new Set(prev).add(filename));
  // Optional: Auto-retry after 5 seconds
  setTimeout(() => {
    setFailedImages(prev => {
      const next = new Set(prev);
      next.delete(filename);
      return next;
    });
  }, 5000);
}, []);
```

---

#### 1.3 Missing Import - `CHART_COLORS.textSecondary`
| Severity | File | Line |
|----------|------|------|
| **CRITICAL** | BadgeGallery.tsx | 9 |

**What's Wrong:** The component imports `CHART_COLORS` and uses `CHART_COLORS.textSecondary` extensively (lines 230, 252, 267, 277, 286, 340, 361), but this key is NOT in the provided color palette:
- Midnight Sapphire, Royal Depth, Ice Wing, Arctic Cyan, Gilded Fern, Frost White, Swan Lavender, Wing Purple

**Fix:** Either add `textSecondary` to `chartTheme.ts`:
```typescript
textSecondary: '#8A9BB8', // Add appropriate color
```
Or replace all usages with an existing color like `arcticCyan` or computed value.

---

#### 1.4 Hardcoded API Key Variable Name
| Severity | File | Line |
|----------|------|------|
| **CRITICAL** | generate-badges.mjs | 36 |

**What's Wrong:** The script expects `GEMINI_API_KEY` but there's no validation that this exact env var exists. If `.env` is missing or misspelled, the error message is unhelpful:
```javascript
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env'); // But doesn't say WHERE it looked
  process.exit(1);
}
```

**Fix:**
```javascript
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  console.error('Checked paths:', [join(ROOT, '.env'), join(ROOT, 'backend', '.env')]);
  process.exit(1);
}
```

---

### HIGH

#### 1.5 Race Condition: Favorites State Desync
| Severity | File | Line |
|----------|------|------|
| HIGH | BadgeGallery.tsx | 93-96 |

**What's Wrong:** The favorites persistence useEffect runs on every `favorites` change, but localStorage writes are async and can fail. If a user rapidly toggles favorites, there's no debouncing and writes can race:
```typescript
useEffect(() => {
  localStorage.setItem('ss-badge-favorites', JSON.stringify([...favorites]));
}, [favorites]); // Fires immediately on every change
```

**Fix:** Add debouncing:
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    try {
      localStorage.setItem('ss-badge-favorites', JSON.stringify([...favorites]));
    } catch (e) {
      console.error('Failed to persist favorites:', e);
    }
  }, 500);
  return () => clearTimeout(timeoutId);
}, [favorites]);
```

---

#### 1.6 Manifest Fetch Has No Loading State
| Severity | File | Line |
|----------|------|------|
| HIGH | BadgeGallery.tsx | 77-87 |

**What's Wrong:** The component shows a "Loading badge manifest..." subtitle but doesn't actually track loading state separately from the manifest data. If the fetch is slow, there's no spinner or skeleton - just the text. More critically, if the fallback import also fails, the component renders the empty state with NO indication that loading failed vs. still loading.

**Fix:** Add explicit loading/error states:
```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  setLoading(true);
  fetch('/badge-manifest.json')
    .then(r => r.ok ? r.json() : Promise.reject('not found'))
    .then(data => {
      setManifest(data);
      setLoading(false);
    })
    .catch(err => {
      // Fallback logic...
      setLoading(false);
      setError(err.message);
    });
}, []);
```

---

#### 1.7 Missing Input Validation on CLI Args
| Severity | File | Line |
|----------|------|------|
| HIGH | generate-badges.mjs | 44-50 |

**What's Wrong:** The `getArg` and `hasFlag` functions don't validate input types:
```typescript
const batchNum = getArg('batch');  // Returns string | null
// Later:
const start = parseInt(batchNum) * batchSize;  // If batchNum is "abc", parseInt returns NaN
```

**Fix:**
```typescript
const getArg = (name: string): string | null => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};

const batchNum = getArg('batch');
const batchNumInt = batchNum !== null ? parseInt(batchNum, 10) : null;
if (batchNumInt !== null && (isNaN(batchNumInt) || batchNumInt < 0)) {
  console.error('Invalid batch number:', batchNum);
  process.exit(1);
}
```

---

### MEDIUM

#### 1.8 Unused Variable in buildQueue
| Severity | File | Line |
|----------|------|------|
| MEDIUM | generate-badges.mjs | 57 |

```javascript
const subjectsPerStyle = Math.ceil(500 / styles.length);  // NEVER USED
```

**Fix:** Remove the unused variable.

---

#### 1.9 Prop Drilling: `CHART_COLORS` Implicit Dependency
| Severity | File | Line |
|----------|------|------|
| MEDIUM | BadgeGallery.tsx | 9, throughout |

**What's Wrong:** The component imports `CHART_COLORS` from `./chartTheme` but doesn't validate its shape. If `chartTheme.ts` is refactored, this component will silently break.

**Fix:** Add runtime validation or TypeScript guard:
```typescript
import { CHART_COLORS, hexAlpha } from './chartTheme';

// Runtime validation
const requiredColors = ['wingPurple', 'gildedFern', 'iceWing', 'frostWhite'];
for (const color of requiredColors) {
  if (!(color in CHART_COLORS)) {
    throw new Error(`Missing required color: ${color}`);
  }
}
```

---

#### 1.10 Modal Escape Key Not Handled
| Severity | File | Line |
|----------|------|------|
| MEDIUM | BadgeGallery.tsx | 189-240 |

**What's Wrong:** The modal opens when `selectedBadge` is set, but there's no keyboard handler to close it with Escape key. Users expect Escape to close modals.

**Fix:** Add useEffect for keyboard handling:
```typescript
useEffect(() => {
  if (!selectedBadge) return;
  
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelectedBadge(null);
  };
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
}, [selectedBadge]);
```

---

#### 1.11 Generated Count Calculation Bug
| Severity | File | Line |
|----------|------|------|
| MEDIUM | BadgeGallery.tsx | 113 |

```typescript
const pendingCount = filteredBadges.length - generatedCount - failedImages.size;
```

**What's Wrong:** `generatedCount` is `loadedImages.size` (total loaded across ALL badges), but `filteredBadges.length` is the current filter view. This comparison is invalid - it's comparing apples to oranges.

**Fix:**
```typescript
const filteredLoaded = filteredBadges.filter(b => loadedImages.has(b.filename)).length;
const filteredFailed = filteredBadges.filter(b => failedImages.has(b.filename)).length;
const pendingCount = filteredBadges.length - filteredLoaded - filteredFailed;
```

---

#### 1.12 Accessibility: Missing Focus Trap in Modal
| Severity | File | Line |
|----------|------|------|
| MEDIUM | BadgeGallery.tsx | 189-240 |

**What's Wrong:** When the modal opens, focus isn't programmatically moved to it, and there's no focus trap - users can tab outside the modal while it's open.

**Fix:** Use a focus trap library or implement basic focus management:
```typescript
const modalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (selectedBadge && modalRef.current) {
    modalRef.current.focus();
  }
}, [selectedBadge]);
```

---

### LOW

#### 1.13 Inconsistent Error Handling in Fetch Chain
| Severity | File | Line |
|----------|------|------|
| LOW | BadgeGallery.tsx | 79-87 |

**What's Wrong:** The `.catch()` swallows errors without logging:
```typescript
.catch(() => {
  import('../../../../scripts/badge-manifest.json')
    .then(...)
    .catch(() => setManifest(null)); // Silent failure
});
```

**Fix:** Add proper error logging:
```typescript
.catch((err) => {
  console.warn('Failed to fetch manifest, trying fallback:', err);
  import(...)
    .catch((fallbackErr) => {
      console.error('All manifest sources failed:', fallbackErr);
      setManifest(null);
    });
});
```

---

#### 1.14 Magic Numbers
| Severity | File | Line |
|----------|------|------|
| LOW | generate-badges.mjs | 52, 53 |

```javascript
const batchSize = 25;
// ...
await new Promise(r => setTimeout(r, 1500));
```

**Fix:** Extract to named constants:
```javascript
const BATCH_SIZE = 25;
const RATE_LIMIT_DELAY_MS = 1500;
```

---

## 2. Architecture Flaws

### HIGH

#### 2.1 God Component - BadgeGallery.tsx
| Severity | File | Lines |
|----------|------|-------|
| HIGH | BadgeGallery.tsx | 62-248 (186 lines of logic) |

**What's Wrong:** The component handles: manifest loading, filtering logic, search, favorites management, image loading tracking, modal state, accessibility, and rendering. This violates Single Responsibility Principle.

**Fix:** Extract into smaller components:
- `useBadgeManifest` hook for data loading
- `useBadgeFilters` hook for filter state
- `BadgeCard` component (already styled, but logic can be extracted)
- `BadgeModal` component
- `FilterBar` component

---

#### 2.2 Mixed Concerns in generate-badges.mjs
| Severity | File | Lines |
|----------|------|-------|
| HIGH | generate-badges.mjs | All |

**What's Wrong:** One file contains: env loading, CLI parsing, queue building, API communication, file I/O, and main orchestration. Impossible to unit test individual functions.

**Fix:** Refactor into modules:
```
scripts/
  badge-generator/
    config.ts          # Env loading
    cli.ts             # Argument parsing
    queue.ts           # Queue building
    api.ts             # Gemini API client
    index.ts           # Main orchestration
```

---

### MEDIUM

#### 2.3 buildBadgeList Duplication
| Severity | File | Line |
|----------|------|------|
| MEDIUM | BadgeGallery.tsx | 27-52, generate-badges.mjs | 56-83 |

**What's Wrong:** The badge list building logic is duplicated between the frontend (`buildBadgeList`) and the script (`buildQueue`). They have slightly different implementations and could drift.

**Fix:** Create a shared module or generate the manifest with pre-computed badge entries:
```typescript
// In badge-manifest.json, add:
"badges": [
  { "styleId": "claymation", "categoryId": "swan", "subject": "baby swan...", "filename": "..." }
]
```

---

## 3. Integration Issues

### HIGH

#### 3.1 Frontend-Backend Contract Mismatch
| Severity | File | Line |
|----------|------|------|
| HIGH | BadgeGallery.tsx | 46-47 |

**What's Wrong:** The `buildBadgeList` function generates filenames using:
```typescript
const filename = `badge_${style.id}_${categoryId}_${slug}.png`;
```

But `generate-badges.mjs` uses:
```javascript
const filename = `badge_${style.id}_${categoryId}_${slug}.png`;
```

These MUST match exactly. However, the manifest `namingConvention` says `badge_{style}_{category}_{subject}.png` but uses `style.id` (e.g., "claymation") not "style" - potential confusion.

**Fix:** Add validation test:
```typescript
// In buildBadgeList, validate against manifest's namingConvention pattern
const expectedPattern = manifest.meta.namingConvention
  .replace('{style}', '(\\w+)')
  .replace('{category}', '(\\w+)')
  .replace('{subject}', '([\\w-]+)');
//

---

*Part of SwanStudios 9-Brain Recursive Consensus System*

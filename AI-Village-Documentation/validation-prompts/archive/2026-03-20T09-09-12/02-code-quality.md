# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 59.0s
> **Files:** backend/services/voiceTranscriptionService.mjs, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/components/AIAssistant/VoiceUpload.tsx, backend/routes/aiChatRoutes.mjs
> **Generated:** 3/20/2026, 2:09:12 AM

---

# Code Review: Voice Transcription & Dictation System

## CRITICAL Issues

### 1. **Memory Leak: Global Rate Limit Map Never Cleaned for Active Users**
**File:** `backend/services/voiceTranscriptionService.mjs`  
**Lines:** 13-14, 38-43

```mjs
const userTranscriptions = new Map(); // userId → { count, resetAt }
// ...
rateLimitCleanup only runs every 30 minutes
```

**Issue:** Active users who transcribe regularly will have their entries refreshed (`resetAt` updated) every hour, preventing cleanup. The Map grows unbounded in long-running processes.

**Fix:**
```mjs
// Add max size guard
const MAX_RATE_LIMIT_ENTRIES = 10000;

export function recordTranscription(userId) {
  const now = Date.now();
  const entry = userTranscriptions.get(userId);
  
  // Prevent unbounded growth
  if (userTranscriptions.size >= MAX_RATE_LIMIT_ENTRIES && !entry) {
    // Evict oldest expired entry
    const sortedEntries = Array.from(userTranscriptions.entries())
      .sort((a, b) => a[1].resetAt - b[1].resetAt);
    userTranscriptions.delete(sortedEntries[0][0]);
  }
  
  if (!entry || entry.resetAt < now) {
    userTranscriptions.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
  } else {
    entry.count++;
  }
}
```

---

### 2. **Race Condition: SpeechRecognition State Desync**
**File:** `frontend/src/components/AIAssistant/DictationOrb.tsx`  
**Lines:** 123-130, 136-141

```tsx
const startListening = useCallback(() => {
  if (!recognitionRef.current || disabled) return;
  try {
    accumulatedRef.current = '';
    recognitionRef.current.start();
    setListening(true); // ⚠️ State set BEFORE async start completes
  } catch {
    // Already started — but listening state is now incorrect
  }
}, [disabled]);
```

**Issue:** `recognition.start()` can throw if already started, but `setListening(true)` executes before the error. UI shows "listening" when recognition isn't actually running.

**Fix:**
```tsx
const startListening = useCallback(() => {
  if (!recognitionRef.current || disabled || listening) return;
  try {
    accumulatedRef.current = '';
    recognitionRef.current.start();
    // State will be set by onstart handler
  } catch (err) {
    console.warn('Recognition start failed:', err);
    setListening(false);
  }
}, [disabled, listening]);

// In useEffect setup:
recognition.onstart = () => setListening(true);
```

---

### 3. **Stale Closure: Keyboard Shortcut Captures Old `listening` State**
**File:** `frontend/src/components/AIAssistant/DictationOrb.tsx`  
**Lines:** 105-117

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      if (!disabled && recognitionRef.current) {
        toggleListening(); // ⚠️ Captures `listening` from initial render
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [listening, disabled]); // ⚠️ Re-creates listener on every state change
```

**Issue:** Effect re-runs on every `listening` change, adding/removing listeners constantly. Also, `toggleListening` depends on `listening` but isn't in the dependency array.

**Fix:**
```tsx
const toggleListeningRef = useRef(toggleListening);
toggleListeningRef.current = toggleListening;

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      toggleListeningRef.current();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []); // Only mount/unmount
```

---

## HIGH Priority Issues

### 4. **Missing TypeScript Declarations for Web Speech API**
**File:** `frontend/src/components/AIAssistant/DictationOrb.tsx`  
**Lines:** 66-69

```tsx
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
// ⚠️ TypeScript error: Property 'SpeechRecognition' does not exist on type 'Window'
```

**Issue:** No type declarations for `SpeechRecognition`, `webkitSpeechRecognition`, or related interfaces.

**Fix:** Add to `src/types/webSpeech.d.ts`:
```typescript
interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';
  message?: string;
}
```

---

### 5. **Hardcoded Theme Values in DictationOrb**
**File:** `frontend/src/components/AIAssistant/DictationOrb.tsx`  
**Lines:** 40-60, 78-90

```tsx
border: 2px solid ${({ $listening }) => $listening ? '#8B5CF6' : 'rgba(255, 255, 255, 0.15)'};
background: ${({ $listening }) => $listening ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
color: ${({ $listening }) => $listening ? '#8B5CF6' : '#94a3b8'};
// ... more hardcoded colors
```

**Issue:** Direct color values instead of theme tokens. Violates Crystalline Swan theme system.

**Fix:**
```tsx
import { CS } from '../../styles/crystallineSwanTheme';

const OrbButton = styled.button<{ $listening: boolean }>`
  border: 2px solid ${({ $listening }) => $listening ? CS.wingPurple : CS.borderSubtle};
  background: ${({ $listening }) => $listening ? `${CS.wingPurple}26` : CS.surfaceOverlay};
  color: ${({ $listening }) => $listening ? CS.wingPurple : CS.textMuted};
  
  &:hover:not(:disabled) {
    border-color: ${CS.wingPurple};
    color: ${CS.wingPurple};
    background: ${CS.wingPurple}14;
  }
  
  &:focus-visible {
    outline: 2px solid ${CS.wingPurple};
  }
`;

const WaveBarEl = styled.div<{ $delay: number }>`
  background: ${CS.wingPurple};
  // ...
`;

const InterimBubble = styled.div`
  background: ${CS.midnightSapphire}F2; // 95% opacity
  border: 1px solid ${CS.wingPurple}4D; // 30% opacity
  color: ${CS.textSecondary};
`;
```

---

### 6. **Missing Error Boundary for SpeechRecognition Failures**
**File:** `frontend/src/components/AIAssistant/DictationOrb.tsx`  
**Lines:** 66-69, 86-92

```tsx
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  setSupported(false);
  return; // ⚠️ Silent failure, no user feedback
}

recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
  setListening(false);
  setInterim('');
  holdingRef.current = false;
  if (event.error === 'not-allowed') {
    console.warn('Microphone permission denied — enable in browser settings');
    // ⚠️ No UI feedback to user
  }
};
```

**Issue:** Errors logged to console but not surfaced to user. No toast/alert for permission denials or API failures.

**Fix:**
```tsx
interface DictationOrbProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onError?: (error: string) => void; // NEW
  holdToTalk?: boolean;
  disabled?: boolean;
}

// In component:
const [error, setError] = useState<string | null>(null);

recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
  setListening(false);
  setInterim('');
  holdingRef.current = false;
  
  const errorMessages = {
    'not-allowed': 'Microphone access denied. Please enable in browser settings.',
    'no-speech': 'No speech detected. Please try again.',
    'audio-capture': 'Microphone not available.',
    'network': 'Network error during transcription.',
    'aborted': 'Transcription cancelled.',
  };
  
  const message = errorMessages[event.error] || 'Voice recognition error';
  setError(message);
  onError?.(message);
  
  // Clear error after 5s
  setTimeout(() => setError(null), 5000);
};

// Add error display in JSX:
{error && (
  <ErrorToast role="alert" aria-live="assertive">
    {error}
  </ErrorToast>
)}
```

---

### 7. **Unvalidated File MIME Type in Backend**
**File:** `backend/services/voiceTranscriptionService.mjs`  
**Lines:** 155-169

```mjs
function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap = { /* ... */ };
  if (!mimeMap[ext]) {
    throw new Error(`Unsupported audio format: .${ext}`);
  }
  return mimeMap[ext];
}

// Called with user-provided filename:
const mimeType = getMimeType(filename); // ⚠️ Trusts client-provided extension
```

**Issue:** Relies solely on file extension from client. Attacker can rename `malicious.exe` → `malicious.mp3`.

**Fix:**
```mjs
import { fileTypeFromBuffer } from 'file-type';

export async function transcribeAudio(buffer, filename) {
  // Validate actual file type from magic bytes
  const detectedType = await fileTypeFromBuffer(buffer);
  const allowedMimes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac'];
  
  if (!detectedType || !allowedMimes.includes(detectedType.mime)) {
    throw new Error(`Invalid audio file. Detected type: ${detectedType?.mime || 'unknown'}`);
  }
  
  const mimeType = detectedType.mime;
  // ... rest of function
}
```

---

## MEDIUM Priority Issues

### 8. **DRY Violation: Duplicate Rate Limit Logic**
**Files:** `backend/services/voiceTranscriptionService.mjs` (lines 20-35) and `backend/middleware/aiRateLimiter.mjs` (assumed similar pattern)

**Issue:** Rate limiting logic duplicated across services. Should use shared utility.

**Fix:** Extract to `backend/utils/rateLimiter.mjs`:
```mjs
export class RateLimiter {
  constructor(maxRequests, windowMs, maxEntries = 10000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
    
    this.cleanup = setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of this.store.entries()) {
        if (entry.resetAt < now) this.store.delete(id);
      }
    }, windowMs / 2);
    this.cleanup.unref();
  }

  check(userId) {
    const now = Date.now();
    const entry = this.store.get(userId);

    if (!entry || entry.resetAt < now) {
      this.store.set(userId, { count: 0, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests };
    }

    const remaining = this.maxRequests - entry.count;
    return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
  }

  record(userId) {
    const now = Date.now();
    const entry = this.store.get(userId);
    
    if (this.store.size >= this.maxEntries && !entry) {
      const oldest = Array.from(this.store.entries())
        .sort((a, b) => a[1].resetAt - b[1].resetAt)[0];
      this.store.delete(oldest[0]);
    }
    
    if (!entry || entry.resetAt < now) {
      this.store.set(userId, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count++;
    }
  }

  destroy() {
    clearInterval(this.cleanup);
    this.store.clear();
  }
}
```

---

### 9. **Missing Abort Controller Cleanup in VoiceUpload**
**File:** `frontend/src/components/AIAssistant/VoiceUpload.tsx`  
**Lines:** 56-75

```tsx
const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  // ...
  try {
    const res = await fetch(`${API_BASE}/api/ai-chat/transcribe`, {

---

*Part of SwanStudios 11-Brain Recursive Consensus System*

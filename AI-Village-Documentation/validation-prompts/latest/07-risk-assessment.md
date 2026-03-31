# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7-20260318 | **Duration:** 129.4s
> **Files:** docs/ai-workflow/blueprints/TEACH-MODE-EXPANSION-PLAN.md
> **Generated:** 3/31/2026, 12:58:53 AM

---

# Risk Assessment: TEACH-MODE-EXPANSION-PLAN

## Executive Overview

| Risk Category | Overall Rating | Primary Concern |
|---------------|----------------|-----------------|
| Dependency Risks | **HIGH** | Sequential blocking without parallelization paths |
| Technical Unknowns | **CRITICAL** | Voice SDK and API scope undefined |
| Scope Creep | **HIGH** | 3 major expansion vectors identified |
| Effort Accuracy | **MEDIUM** | Achievable but aggressive on complex components |
| Testing Gaps | **HIGH** | No unified strategy across phases |
| Rollback Plan | **CRITICAL** | Feature flags do not exist |
| Database Migration | **MEDIUM** | Phase 1 claim of "zero backend work" is incorrect |
| Phase Ordering | **LOW** | Current order is optimal |

---

## 1. Dependency Risks — HIGH

### Blocking Relationships

| Phase | Blocks | Reason |
|-------|--------|--------|
| Phase 1 | All Phases 2-5 | Establishes Teach Mode component architecture |
| Phase 1.3 (API changes) | Phase 1.1-1.2 UI | UI needs data contract to render |
| Phase 2 | None | Depends only on Phase 1 architecture |
| Phase 3 | None | Can run parallel to Phase 2 |
| Phase 4 | None | Can run parallel to Phase 2-3 |
| Phase 5 | None | Can run parallel to Phase 2-4 |

### Phase 4 Voice Concern (Note: Misalignment)

**⚠️ Discrepancy Identified:** The plan references "voice-first AI coach" in differentiators and mentions "Voice & Attachment Features" in Phase 2 content, but **no Phase 4 implements voice**. The plan labels Phase 4 as "Client Management Teach Mode."

**Clarification Required:** If voice implementation is planned, it needs its own phase with:
- Audio recording integration
- Gemini API voice endpoints
- Browser MediaRecorder handling
- Transcription pipeline

**If voice IS in scope but not in plan:** This is a CRITICAL gap.

### Mitigation

```
RECOMMENDED: Parallel Track Execution
├── Track A: Phase 1 (Critical Path)
│   ├── 1.1: TeachModeProvider architecture (foundation)
│   ├── 1.2: API expansion (can start immediately)
│   └── 1.3: UI tabs (depends on 1.1 + 1.2)
│
├── Track B: Phase 2 (parallel after Phase 1.1 complete)
├── Track C: Phase 3 (parallel with Track B)
├── Track D: Phase 4 (parallel with Track B-C)
└── Track E: Phase 5 (parallel with Track B-D)
```

**Buffer Strategy:** Phase 1 has 50% schedule contingency built in. Phase 2-5 can begin UI scaffolding after Phase 1.1 (TeachModeProvider) ships.

---

## 2. Technical Unknowns — CRITICAL

### 2.1 Gemini SDK Version — CRITICAL

| Unknown | Risk | Mitigation |
|---------|------|------------|
| SDK version not specified | May need migration mid-sprint | Lock to specific version (e.g., `@google/gemini-api@0.3.0`) |
| API changes between versions | Voice features may break | Pin exact version in package.json |
| Browser auth flow changes | User authentication may break | Document current auth approach |

**Action Required:** Before Phase 2, create a voice feature spike:
- Confirm Gemini SDK supports browser-based voice
- Test audio capture → transcription → response cycle
- Document API quota/cost implications

### 2.2 MediaRecorder Browser Compatibility — HIGH

| Browser | Support | Risk |
|---------|---------|------|
| Chrome 57+ | ✅ Full | Low |
| Firefox 76+ | ✅ Full | Low |
| Safari 14.1+ | ⚠️ Limited | HIGH — No MP3 encoding, only WebM |
| Edge 79+ | ✅ Full | Low |
| iOS Safari | ⚠️ Limited | HIGH — No background audio |
| Samsung Internet | ⚠️ Variable | MEDIUM |

**Mitigation:**
```typescript
// Detect support before showing voice UI
const voiceSupported = MediaRecorder.isTypeSupported('audio/webm') || 
                       MediaRecorder.isTypeSupported('audio/mp4');
```

**Feature Detection Implementation:**
```typescript
// src/hooks/useVoiceSupport.ts
export const useVoiceSupport = () => {
  const [supported, setSupported] = useState(false);
  
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const types = ['audio/webm', 'audio/mp4', 'audio/ogg'];
        const isSupported = types.some(t => MediaRecorder.isTypeSupported(t));
        stream.getTracks().forEach(t => t.stop());
        setSupported(isSupported);
      } catch {
        setSupported(false);
      }
    };
    checkSupport();
  }, []);
  
  return { supported };
};
```

### 2.3 react-markdown Bundle Size — MEDIUM

**Current Status:** Plan mentions react-markdown but doesn't provide baseline bundle size analysis.

**Required Analysis:**
```bash
# Measure current bundle
npx bundlephobia react-markdown@latest
npx bundlephobia remark-gfm@latest  # GitHub Flavored Markdown
```

**Estimated Impact:** 
- react-markdown: ~45KB gzipped
- remark-gfm: ~15KB gzipped
- Total: ~60KB for markdown features

**Mitigation:** Lazy-load markdown renderer:
```typescript
const LazyMarkdown = lazy(() => import('./MarkdownRenderer'));
// Show skeleton until loaded
<Suspense fallback={<MarkdownSkeleton />}><LazyMarkdown content={text} /></Suspense>
```

### 2.4 API Data Contract — HIGH

| Option | Risk | Recommendation |
|--------|------|----------------|
| Expand existing GET | Break existing Rolodex consumers | ❌ Not recommended |
| New `/api/exercises/:id/teach-mode` | Extra network request | ✅ Preferred |
| GraphQL fragment | Requires GraphQL setup | Only if already in use |

**Recommended Approach:** Create dedicated endpoint
```
GET /api/exercises/:id/teach-mode
Response: TeachModeDTO (separate from ExerciseSlim)
```

This preserves backward compatibility and allows independent caching.

---

## 3. Scope Creep Indicators — HIGH

### 3.1 Markdown Rendering — HIGH creep potential

| Base Scope | Expansion Vectors |
|------------|-------------------|
| Step-by-step instructions | Custom exercise-specific callouts |
| Coaching cues | NASM-specific formatting (OPT phases, form cues) |
| Safety tips | Warning/caution/note boxes |
| Scientific references | Video embeds, interactive diagrams |

**Creep Trigger:** "comprehensive exercise encyclopedia" implies infinite detail expansion.

**Mitigation:**
```
SCOPE BOUNDARY:
├── ✅ Render markdown with GFM support
├── ✅ Custom components: Callout, ProgressionPath, PhaseBadge
├── ❌ NOT: Interactive exercise simulators
├── ❌ NOT: Embedded video players (link only)
└── ❌ NOT: Custom exercise diagrams (image URL only)
```

**Enforcement:** Create `TeachModeContentGuidelines.md` specifying what's in/out of scope.

### 3.2 Voice Features — CRITICAL creep potential

**Expansion Vectors:**
- Real-time voice streaming vs. record-then-send
- Multi-language transcription
- Speaker diarization (multiple people)
- Custom wake words
- Offline capability
- Voice cloning/personalization

**Mitigation:** Define MVP voice scope explicitly:
```
VOICE MVP BOUNDARY:
├── ✅ Record audio (up to 60 seconds)
├── ✅ Transcribe to text
├── ✅ Send to Coach Assistant
├── ✅ Display transcription
├── ❌ NOT: Real-time streaming
├── ❌ NOT: Multi-turn voice conversation
├── ❌ NOT: Custom voice models
└── ❌ NOT: Offline voice processing
```

### 3.3 Progression Path Visualization — MEDIUM creep potential

| Base Scope | Expansion Vectors |
|------------|-------------------|
| Linear progression | Non-linear progressions (A→B→C or branches) |
| 5-6 exercise chain | 20+ exercise chains |
| Static display | Interactive drag-and-drop |
| One progression per exercise | Multiple progression types (strength, mobility, skill) |

**Mitigation:**
```
PROGRESSION MVP:
├── ✅ Render linear chain (max 10 exercises)
├── ✅ Show current position
├── ✅ Link to parent/child exercises
├── ❌ NOT: Interactive editing
├── ❌ NOT: Multiple progression types
└── ❌ NOT: Custom paths per trainer
```

---

## 4. Effort Accuracy — MEDIUM

### File Count Validation

| Phase | Files | Risk | Confidence |
|-------|-------|------|------------|
| Phase 1 | ~10 files | LOW | High — detailed component list |
| Phase 2 | ~4 files | MEDIUM | Medium — Coach Assistant context |
| Phase 3 | ~3 files | LOW | High — similar pattern |
| Phase 4 | ~3 files | LOW | High — similar pattern |
| Phase 5 | ~2 files | LOW | High — simpler scope |
| **Total** | **22 files** | **MEDIUM** | Achievable with discipline |

### Line Count Risk Assessment

| Component | Estimated Lines | Exceed Risk | Reason |
|-----------|-----------------|-------------|--------|
| TeachModeProvider | 200 | LOW | Infrastructure, well-scoped |
| ExerciseDetailPanel | 280 | **HIGH** | Dense data display |
| PhaseProgressionViz | 250 | **HIGH** | Complex visualization |
| MarkdownRenderer | 180 | MEDIUM | Wraps library |
| CoachingCuesList | 120 | LOW | Simple list |
| SafetyTipsPanel | 100 | LOW | Simple list |
| ScientificRefs | 150 | MEDIUM | Link handling |
| VoiceRecorder | 200 | **HIGH** | Browser APIs |
| CoachAssistantGuide | 220 | **HIGH** | 5 accordion sections |
| **Average** | **~180** | **MEDIUM** | Within 300 limit |

### Likely Exceeders

```typescript
// HIGH RISK: May exceed 300 lines
1. src/components/teach-mode/ExerciseDetailPanel.tsx
   Reason: 3 tabs × multiple sections × rich content
   
2. src/components/teach-mode/CoachAssistantGuide.tsx
   Reason: 5 large accordion sections with examples
   
3. src/components/teach-mode/VoiceRecorder.tsx
   Reason: State management for recording, playback, error handling

// MITIGATION: Break into sub-components
ExerciseDetailPanel/
├── HowToPerformTab.tsx      (100 lines)
├── PhaseProgressionTab.tsx (120 lines)
├── LearnWatchTab.tsx        (80 lines)
└── index.tsx                (30 lines, composes above)
```

### Mitigation

```json
// .claudirc or linting rule
{
  "maxLinesPerFile": 300,
  "enforce": true,
  "exclude": ["*.test.tsx", "*.stories.tsx"]
}
```

**Hard Stop:** CI fails if any source file exceeds 300 lines (except tests/stories).

---

## 5. Testing Gaps — HIGH

### Current State: No Testing Strategy Defined

| Area | Current | Gap |
|------|---------|-----|
| Unit tests | Not mentioned | No coverage strategy |
| Integration tests | Not mentioned | No API contract tests |
| E2E tests | Not mentioned | No user flow validation |
| Visual regression | Not mentioned | No UI consistency checks |
| Accessibility | Not mentioned | a11y gaps likely |

### Recommended Testing Strategy

```typescript
// 1. UNIT TESTS: Hooks and Utilities
// src/components/teach-mode/__tests__/

// TeachModeProvider.test.tsx
describe('TeachModeProvider', () => {
  it('provides teach mode context to children');
  it('handles open/close state');
  it('persists tab selection to localStorage');
});

// useExerciseData.test.ts
describe('useExerciseData', () => {
  it('fetches deep data on exercise selection');
  it('caches data after first fetch');
  it('returns loading state during fetch');
  it('handles API errors gracefully');
});

// 2. INTEGRATION TESTS: API Contracts
// src/api/__tests__/

describe('GET /api/exercises/:id/teach-mode', () => {
  it('returns all required fields');
  it('returns null for missing optional fields');
  it('respects pagination for large progressions');
});

// 3. E2E TESTS: Critical User Flows
// e2e/teach-mode.spec.ts

test.describe('Teach Mode Exercise Flow', () => {
  test('opens teach mode sidebar for selected exercise');
  test('switches between 3 tabs');
  test('displays phase progression visualization');
  test('lazy loads video content on tab open');
});

test.describe('Voice Coach Flow', () => {
  test('shows voice button on supported browsers');
  test('hides voice button on unsupported browsers');
  test('records and transcribes audio');
  test('submits transcription to Coach Assistant');
});

// 4. VISUAL REGRESSION
// storybook/addons visual-tests addon

// Using Chromatic or Percy
test.visual('Teach Mode Sidebar', () => {
  await page.goto('/workout-planner');
  await page.selectExercise('Barbell Bench Press');
  await page.openTeachMode();
  // Captures baseline for regression
});

// 5. ACCESSIBILITY TESTS
// axe-playwright integration

test('Teach Mode meets accessibility standards', async ({ page }) => {
  await page.goto('/workout-planner');
  await page.openTeachMode();
  const violations = await new AxeBuilder({ page }).analyze();
  expect(violations.length).toBe(0);
});
```

### Testing Coverage Target

| Phase | Unit | Integration | E2E | Visual |
|-------|------|-------------|-----|--------|
| Phase 1 | 80% | 90% | 3 flows | Yes |
| Phase 2 | 70% | 80% | 2 flows | Yes |
| Phase 3 | 70% | 70% | 1 flow | Partial |
| Phase 4 | 70% | 70% | 1 flow | Partial |
| Phase 5 | 60% | 60% | 1 flow | Partial |

---

## 6. Rollback Plan — CRITICAL

### Current State: NO FEATURE FLAGS EXIST

**This is the highest-priority risk.** Without feature flags, any phase failure requires:
1. Code rollback (git revert)
2. Re-deployment
3. Potential data inconsistency
4. Emergency release process

### Required Feature Flag Architecture

```typescript
// src/config/featureFlags.ts
export const FeatureFlags = {
  TEACH_MODE_PHASE_1: process.env.REACT_APP_FLAG_TEACH_MODE_PHASE_1 === 'true',
  TEACH_MODE_PHASE_2: process.env.REACT_APP_FLAG_TEACH_MODE_PHASE_2 === 'true',
  TEACH_MODE_PHASE_3: process.env.REACT_APP_FLAG_TEACH_MODE_PHASE_3 === 'true',
  TEACH_MODE_PHASE_4: process.env.REACT_APP_FLAG_TEACH_MODE_PHASE_4 === 'true',
  TEACH_MODE_PHASE_5: process.env.REACT_APP_FLAG_TEACH_MODE_PHASE_5 === 'true',
  VOICE_FEATURES: process.env.REACT_APP_FLAG_VOICE === 'true',
} as const;

// src/components/teach-mode/TeachModeGate.tsx
export const TeachModeGate: React.FC<{
  phase: keyof typeof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ phase, children, fallback = null }) => {
  const flag = FeatureFlags[phase];
  
  if (!flag) {
    console.log(`[FeatureFlag] ${phase} is disabled`);
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Usage
<TeachModeGate phase="TEACH_MODE_PHASE_1">
  <ExerciseDetailPanel />
</TeachModeGate>

<TeachModeGate phase="VOICE_FEATURES" fallback={<TextInputOnly />}>
  <VoiceRecorder />
</TeachMode

---

*Part of SwanStudios 14-Brain Recursive Consensus System*

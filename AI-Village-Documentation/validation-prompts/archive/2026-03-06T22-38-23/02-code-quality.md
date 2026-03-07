# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 67.0s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-CLASS-BUILDER-DESIGN.md
> **Generated:** 3/6/2026, 2:38:23 PM

---

# Code Quality Review: Boot Camp Class Builder Design Document

## Executive Summary
**Document Type:** Design Specification (Markdown)  
**Review Status:** ⚠️ **Pre-Implementation Review**  
**Overall Risk Level:** MEDIUM

This is a design document, not implementation code. However, reviewing it now prevents critical issues during implementation. The design shows strong domain understanding but has significant technical debt risks in the proposed schema and architecture.

---

## 1. TypeScript Best Practices

### CRITICAL Issues

#### C-TS-1: Missing Type Definitions for Core Domain Models
**Location:** Section B (Database Schema)  
**Issue:** SQL schema provided without corresponding TypeScript interfaces/types.

```typescript
// ❌ MISSING - Should be defined before implementation:
interface BootcampTemplate {
  id: number;
  trainerId: number;
  name: string;
  description: string | null;
  classFormat: 'stations_4x' | 'stations_3x5' | 'stations_2x7' | 'full_group' | 'custom';
  targetDurationMin: number;
  demoDurationMin: number;
  clearDurationMin: number;
  dayType: 'lower_body' | 'upper_body' | 'cardio' | 'full_body' | 'custom' | null;
  difficultyBase: 'easy' | 'medium' | 'hard' | 'mixed';
  equipmentProfileId: number | null;
  spaceProfileId: number | null;
  maxParticipants: number;
  optimalParticipants: number;
  isActive: boolean;
  tags: string | null; // ⚠️ Should be string[]
  aiGenerated: boolean;
  lastUsedAt: Date | null;
  timesUsed: number;
  metadata: Record<string, unknown>; // ⚠️ JSONB needs proper typing
  createdAt: Date;
  updatedAt: Date;
}

// ✅ RECOMMENDED: Discriminated union for class formats
type ClassFormat = 
  | { type: 'stations_4x'; exercisesPerStation: 4; stationCount: number }
  | { type: 'stations_3x5'; exercisesPerStation: 3; stationCount: 5 }
  | { type: 'stations_2x7'; exercisesPerStation: 2; stationCount: 7 }
  | { type: 'full_group'; exerciseCount: 15; rounds: 2 }
  | { type: 'custom'; config: CustomConfig };
```

**Impact:** Without proper types, implementation will use `any` or weak types, losing type safety.

---

#### C-TS-2: JSONB Fields Lack Type Safety
**Location:** Multiple tables use `JSONB` without type definitions

```typescript
// ❌ CURRENT (from schema):
metadata: JSONB
exercises_used: JSONB NOT NULL
lap_exercises: JSONB

// ✅ RECOMMENDED:
interface BootcampMetadata {
  trendExercisesUsed?: string[];
  aiGenerationVersion?: string;
  customNotes?: string;
  difficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
}

interface ExerciseSnapshot {
  exerciseName: string;
  durationSec: number;
  stationNumber?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  modificationsUsed?: string[];
}

interface LapExercise {
  name: string;
  durationSec: number;
  instructions: string;
  equipment: 'none';
}

// Then in Sequelize model:
@Column({ type: DataType.JSONB })
metadata!: BootcampMetadata;

@Column({ type: DataType.JSONB })
exercisesUsed!: ExerciseSnapshot[];

@Column({ type: DataType.JSONB })
lapExercises!: LapExercise[];
```

**Impact:** Runtime errors from malformed JSON data, no autocomplete, difficult debugging.

---

### HIGH Issues

#### H-TS-1: String-Based Enums Instead of Union Types
**Location:** Throughout schema (class_format, day_type, etc.)

```typescript
// ❌ AVOID:
class_format VARCHAR(30) NOT NULL
// Then in code: classFormat: string

// ✅ RECOMMENDED:
type ClassFormatType = 'stations_4x' | 'stations_3x5' | 'stations_2x7' | 'full_group' | 'custom';
type DayType = 'lower_body' | 'upper_body' | 'cardio' | 'full_body' | 'custom';
type DifficultyTier = 'easy' | 'medium' | 'hard' | 'modified';
type PainArea = 'knee' | 'shoulder' | 'ankle' | 'wrist' | 'back';

// In Sequelize:
@Column({ 
  type: DataType.STRING(30),
  validate: {
    isIn: [['stations_4x', 'stations_3x5', 'stations_2x7', 'full_group', 'custom']]
  }
})
classFormat!: ClassFormatType;
```

**Impact:** Typos in string literals won't be caught at compile time.

---

#### H-TS-2: Missing Input Validation Types for API
**Location:** Section F (REST API Endpoints)

```typescript
// ❌ MISSING - Should be defined:
interface GenerateClassRequest {
  classFormat: ClassFormatType;
  dayType: DayType;
  expectedParticipants: number; // Should have min/max validation
  equipmentProfileId: number;
  spaceProfileId: number;
  targetDuration: number; // Should be 45 | 50 | 55
  preferences: ClassPreferences;
}

interface ClassPreferences {
  includeCardioFinisher: boolean;
  heavySetupFirst: boolean;
  lowImpactFriendly: boolean;
  avoidExercises?: string[]; // Exercise names to exclude
  prioritizeTrends?: boolean;
}

// ✅ Add runtime validation with Zod:
import { z } from 'zod';

const GenerateClassRequestSchema = z.object({
  classFormat: z.enum(['stations_4x', 'stations_3x5', 'stations_2x7', 'full_group', 'custom']),
  dayType: z.enum(['lower_body', 'upper_body', 'cardio', 'full_body', 'custom']),
  expectedParticipants: z.number().int().min(1).max(50),
  equipmentProfileId: z.number().int().positive(),
  spaceProfileId: z.number().int().positive(),
  targetDuration: z.number().int().min(30).max(60),
  preferences: z.object({
    includeCardioFinisher: z.boolean(),
    heavySetupFirst: z.boolean(),
    lowImpactFriendly: z.boolean(),
    avoidExercises: z.array(z.string()).optional(),
    prioritizeTrends: z.boolean().optional()
  })
});

type GenerateClassRequest = z.infer<typeof GenerateClassRequestSchema>;
```

**Impact:** Invalid API requests won't be caught until runtime, poor error messages.

---

## 2. React Patterns

### MEDIUM Issues

#### M-REACT-1: Component Structure Not Defined
**Location:** Section H (Frontend Components)

**Recommendation:** Define component hierarchy before implementation:

```typescript
// ✅ RECOMMENDED Component Structure:

// Container (data fetching, state management)
const BootcampDashboard: React.FC = () => {
  const { data: schedule, isLoading } = useBootcampSchedule();
  const { data: rotationHealth } = useRotationHealth();
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <DashboardLayout>
      <ScheduleWeekView schedule={schedule} />
      <RotationHealthWidget health={rotationHealth} />
    </DashboardLayout>
  );
};

// Presentational (pure, memoized)
interface ScheduleWeekViewProps {
  schedule: WeekSchedule;
}

const ScheduleWeekView = React.memo<ScheduleWeekViewProps>(({ schedule }) => {
  return (
    <WeekGrid>
      {schedule.days.map(day => (
        <DayCard key={day.date} day={day} />
      ))}
    </WeekGrid>
  );
});

// Avoid inline object creation in render:
// ❌ BAD:
<StationCard station={station} config={{ showDifficulty: true }} />

// ✅ GOOD:
const stationConfig = useMemo(() => ({ showDifficulty: true }), []);
<StationCard station={station} config={stationConfig} />
```

---

#### M-REACT-2: Missing State Management Strategy
**Location:** Class Builder View (Section H)

**Issue:** Complex state (stations, exercises, timing) needs proper management.

```typescript
// ✅ RECOMMENDED: Use reducer for complex class builder state

interface ClassBuilderState {
  config: ClassConfig;
  stations: Station[];
  overflowPlan: OverflowPlan | null;
  aiInsights: AIInsight[];
  isDirty: boolean;
  validationErrors: ValidationError[];
}

type ClassBuilderAction =
  | { type: 'SET_CONFIG'; payload: Partial<ClassConfig> }
  | { type: 'ADD_STATION'; payload: Station }
  | { type: 'UPDATE_EXERCISE'; payload: { stationId: number; exerciseId: number; updates: Partial<Exercise> } }
  | { type: 'GENERATE_SUCCESS'; payload: { stations: Station[]; overflowPlan: OverflowPlan; insights: AIInsight[] } }
  | { type: 'VALIDATE'; payload: ValidationError[] };

const classBuilderReducer = (state: ClassBuilderState, action: ClassBuilderAction): ClassBuilderState => {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload }, isDirty: true };
    case 'GENERATE_SUCCESS':
      return { 
        ...state, 
        stations: action.payload.stations,
        overflowPlan: action.payload.overflowPlan,
        aiInsights: action.payload.insights,
        isDirty: false 
      };
    // ... other cases
    default:
      return state;
  }
};

const ClassBuilder: React.FC = () => {
  const [state, dispatch] = useReducer(classBuilderReducer, initialState);
  
  const handleGenerate = useCallback(async () => {
    try {
      const result = await generateClass(state.config);
      dispatch({ type: 'GENERATE_SUCCESS', payload: result });
    } catch (error) {
      // Handle error
    }
  }, [state.config]);
  
  // ...
};
```

---

## 3. Styled-Components

### HIGH Issues

#### H-SC-1: No Theme Token Definitions Provided
**Location:** Section H (Frontend Components)

**Issue:** Design shows hardcoded values, no theme integration mentioned.

```typescript
// ✅ REQUIRED: Define theme tokens before implementation

// theme.ts
export const bootcampTheme = {
  colors: {
    stationCard: {
      background: 'rgba(20, 25, 45, 0.6)', // Galaxy-Swan dark
      border: 'rgba(100, 200, 255, 0.2)', // Swan Cyan
      hover: 'rgba(100, 200, 255, 0.1)',
    },
    exercise: {
      cardio: '#FF6B6B', // Red for cardio finishers
      strength: '#64C8FF', // Swan Cyan
      setup: '#FFD93D', // Yellow for heavy setup
    },
    difficulty: {
      easy: '#4ECDC4',
      medium: '#64C8FF',
      hard: '#FF6B6B',
      modified: '#A78BFA',
    }
  },
  spacing: {
    stationGap: '1.5rem',
    exerciseGap: '0.75rem',
    panelPadding: '1.5rem',
  },
  breakpoints: {
    tablet: '768px',
    desktop: '1440px',
  }
} as const;

// ❌ AVOID:
const StationCard = styled.div`
  background: rgba(20, 25, 45, 0.6);
  border: 1px solid rgba(100, 200, 255, 0.2);
  padding: 1.5rem;
`;

// ✅ USE:
const StationCard = styled.div`
  background: ${({ theme }) => theme.colors.stationCard.background};
  border: 1px solid ${({ theme }) => theme.colors.stationCard.border};
  padding: ${({ theme }) => theme.spacing.panelPadding};
  
  &:hover {
    background: ${({ theme }) => theme.colors.stationCard.hover};
  }
`;
```

---

#### M-SC-1: Component Naming Convention Needed
**Location:** Section H (Frontend Components)

```typescript
// ✅ RECOMMENDED: Establish naming convention

// Layout components (suffix: Layout, Container, Wrapper)
const BootcampDashboardLayout = styled.div`...`;
const ThreePaneContainer = styled.div`...`;

// Card components (suffix: Card)
const StationCard = styled.article`...`;
const ExerciseCard = styled.div`...`;

// Interactive components (suffix: Button, Input, etc.)
const GenerateButton = styled.button`...`;
const ParticipantSlider = styled.input`...`;

// Typography (prefix: Text, Heading)
const StationHeading = styled.h3`...`;
const ExerciseText = styled.p`...`;
```

---

## 4. DRY Violations

### HIGH Issues

#### H-DRY-1: Repeated Difficulty Tier Logic
**Location:** Sections A6, C (Algorithm), Database Schema

**Issue:** Difficulty tier structure repeated in multiple places.

```typescript
// ✅ EXTRACT to shared utility:

// types/difficulty.ts
export const DIFFICULTY_TIERS = ['easy', 'medium', 'hard', 'modified'] as const;
export type DifficultyTier = typeof DIFFICULTY_TIERS[number];

export interface ExerciseVariations {
  easy: string;
  medium: string;
  hard: string;
  modified?: string;
}

export interface PainModifications {
  knee?: string;
  shoulder?: string;
  ankle?: string;
  wrist?: string;
  back?: string;
}

// utils/difficultyGenerator.ts
export class DifficultyGenerator {
  static generateVariations(baseExercise: string, exerciseType: string): ExerciseVariations {
    // Centralized logic for generating easy/medium/hard variations
    // Based on exercise type (squat, press, pull, etc.)
  }
  
  static generatePainMods(baseExercise: string, muscleTargets: string[]): PainModifications {
    // Centralized logic for pain modifications
  }
}

// Now use consistently across:
// - Database models
// - API responses
// - Frontend components
// - AI generation algorithm
```

---

#### H-DRY-2: Timing Calculation Logic Duplicated
**Location:** Section A2 (Time-Aware Structure), Section C (Algorithm Step 4)

```typescript
// ✅ EXTRACT to shared service:

// services/timingCalculator.ts
export interface TimingConfig {
  exerciseDurationSec: number;
  exercisesPerStation: number;
  stationCount: number;
  transitionTimeSec: number;
  interStationRestSec: number;
}

export class BootcampTimingCalculator {
  static readonly DEMO_TIME_MIN = 5;
  static readonly CLEAR_TIME_MIN = 5;

---

*Part of SwanStudios 7-Brain Validation System*

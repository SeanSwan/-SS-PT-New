# MCP Type Definitions

## Overview

This directory contains TypeScript interface definitions for the Model Context Protocol (MCP) services used in the SwanStudios fitness application. These type definitions provide type safety, autocompletion, and documentation for the MCP API services.

## Structure

```
types/mcp/
├── workout.types.ts        # TypeScript interfaces for workout MCP API
├── gamification.types.ts   # TypeScript interfaces for gamification MCP API
├── index.ts               # Re-exports all types
└── README.md              # Documentation
```

## Type Definitions

### Workout MCP Types (`workout.types.ts`)

Contains interfaces for workout-related data and API methods:

- **WorkoutProgress**: Comprehensive workout progress data
- **BodyStats**: Body measurements and tracking
- **NasmProtocol**: NASM protocol assessment data
- **TrainingProgramData**: Training program information
- **Exercise**: Individual exercise definitions
- **WorkoutStatistics**: Workout statistics and analytics
- **BodyMeasurement**: Body measurement tracking
- **WorkoutRecommendation**: Workout recommendation data
- **API Method Parameters**: Parameter interfaces for all API methods
- **WorkoutMcpApi**: Complete interface for the workoutMcpApi object

### Gamification MCP Types (`gamification.types.ts`)

Contains interfaces for gamification-related data and API methods:

- **GamificationProfile**: User's gamification profile and stats
- **Achievement**: Achievement data structure
- **Challenge**: Challenge data structure
- **KindnessQuest**: Kindness quest data structure
- **BoardPosition**: Game board position data
- **DiceRollResult**: Dice roll result data
- **API Method Parameters**: Parameter interfaces for all API methods
- **GamificationMcpApi**: Complete interface for the gamificationMcpApi object

## Usage

Import types directly from the specific file:

```typescript
import { WorkoutProgress, Exercise } from '../../types/mcp/workout.types';
import { GamificationProfile, Achievement } from '../../types/mcp/gamification.types';
```

Or import from the index file:

```typescript
import { 
  WorkoutProgress, 
  GamificationProfile,
  Achievement
} from '../../types/mcp';
```

## Using with MCP Services

The MCP service implementations are strongly typed with these interfaces:

```typescript
// In workoutMcpService.ts
import { WorkoutMcpApi } from '../../types/mcp/workout.types';

const workoutMcpApi: WorkoutMcpApi = {
  // Implementation...
};
```

## Using with Hooks

The custom hooks are also strongly typed with these interfaces:

```typescript
// In useGamificationMcp.ts
import { 
  GamificationProfile, 
  Achievement, 
  Challenge 
} from '../../types/mcp/gamification.types';

const useGamificationMcp = () => {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  
  // Rest of the hook implementation...
};
```

## Benefits

Using these type definitions provides several benefits:

1. **Type Safety**: Catch type-related errors at compile time
2. **Code Completion**: Get autocompletion for available properties and methods
3. **Self-Documentation**: Interfaces serve as documentation for data structures
4. **Consistency**: Ensure consistent data structure usage across the application
5. **Refactoring Support**: TypeScript compiler helps identify affected code during refactoring

## Maintenance

When updating the MCP API services, remember to also update the corresponding type definitions to ensure type safety and consistency.

## Future Enhancements

Planned enhancements for the type system:

1. **Zod schema validation**: Add runtime validation for API responses
2. **Automated documentation generation**: Generate API documentation from TypeScript interfaces
3. **Stricter types**: Add more specific string literal types for enum-like values
4. **Generic error handling**: Improve error type definitions for better error handling
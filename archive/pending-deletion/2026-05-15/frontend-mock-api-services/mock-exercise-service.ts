// services/mock-exercise-service.ts
import { Exercise, RecommendedExercisesResponse } from './exercise-service';

/**
 * Creates mock recommended exercises data for development and fallback purposes
 * @returns A mock recommended exercises response
 */
export const getMockRecommendedExercises = (): RecommendedExercisesResponse => {
  const mockExercises: Exercise[] = [
    {
      id: 'ex-001',
      name: 'Basic Squats',
      description: 'A fundamental lower body exercise targeting quadriceps, hamstrings, and glutes',
      exerciseType: 'compound',
      difficulty: 1,
      recommendedSets: 3,
      recommendedReps: 12,
      primaryMuscles: ['quadriceps', 'glutes', 'hamstrings'],
      secondaryMuscles: ['calves', 'core'],
      equipment: ['none'],
      videoUrl: null,
      imageUrl: null,
      instructions: [
        'Stand with feet shoulder-width apart',
        'Keep back straight, core engaged',
        'Bend knees and lower as if sitting in a chair',
        'Keep weight in heels, knees tracking over toes',
        'Lower until thighs are parallel to floor',
        'Push through heels to return to starting position'
      ],
      isFeatured: true,
      nasmCategory: 'calisthenics'
    },
    {
      id: 'ex-002',
      name: 'Forward Lunges',
      description: 'Single-leg exercise targeting legs and improving balance',
      exerciseType: 'compound',
      difficulty: 2,
      recommendedSets: 3,
      recommendedReps: 10,
      primaryMuscles: ['quadriceps', 'glutes', 'hamstrings'],
      secondaryMuscles: ['calves', 'core'],
      equipment: ['none'],
      videoUrl: null,
      imageUrl: null,
      instructions: [
        'Stand with feet hip-width apart',
        'Step forward with right foot, lowering body until both knees form 90° angles',
        'Keep front knee aligned with ankle',
        'Push through front heel to return to starting position',
        'Repeat with left leg',
        'Alternate legs for prescribed repetitions'
      ],
      isFeatured: true,
      nasmCategory: 'balance'
    },
    {
      id: 'ex-003',
      name: 'Plank',
      description: 'Core stabilization exercise that engages multiple muscle groups',
      exerciseType: 'core',
      difficulty: 1,
      recommendedSets: 3,
      recommendedReps: 1,
      recommendedDuration: 30, // in seconds
      primaryMuscles: ['core', 'abdominals'],
      secondaryMuscles: ['shoulders', 'glutes', 'back'],
      equipment: ['none'],
      videoUrl: null,
      imageUrl: null,
      instructions: [
        'Start in push-up position with arms straight',
        'Lower onto forearms, keeping elbows under shoulders',
        'Form straight line from head to heels',
        'Engage core and glutes',
        'Hold position while breathing normally',
        'Avoid sagging hips or raised buttocks'
      ],
      isFeatured: true,
      nasmCategory: 'core'
    },
    {
      id: 'ex-004',
      name: 'Mountain Climbers',
      description: 'Dynamic exercise for cardiovascular fitness and core strength',
      exerciseType: 'compound',
      difficulty: 2,
      recommendedSets: 3,
      recommendedReps: 20,
      primaryMuscles: ['core', 'hip flexors'],
      secondaryMuscles: ['shoulders', 'chest', 'quads'],
      equipment: ['none'],
      videoUrl: null,
      imageUrl: null,
      instructions: [
        'Start in high plank position',
        'Keeping core tight and hips level',
        'Quickly drive right knee toward chest',
        'Return to starting position',
        'Immediately repeat with left knee',
        'Alternate legs at desired pace'
      ],
      isFeatured: false,
      nasmCategory: 'calisthenics'
    },
    {
      id: 'ex-005',
      name: 'Leg Extensions',
      description: 'Isolation exercise for quadriceps strengthening',
      exerciseType: 'isolation',
      difficulty: 1,
      recommendedSets: 3,
      recommendedReps: 12,
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: [],
      equipment: ['leg extension machine'],
      videoUrl: null,
      imageUrl: null,
      instructions: [
        'Sit on leg extension machine',
        'Adjust seat so knees align with pivot point',
        'Place shins behind pad',
        'Grasp handles for stability',
        'Extend legs until knees are straight',
        'Control weight as you lower back to starting position'
      ],
      isFeatured: false,
      nasmCategory: 'isolation'
    }
  ];
  
  // Focus categories for recommended exercises
  const mockFocusCategories = ['core', 'balance', 'flexibility', 'calisthenics'];
  
  return {
    success: true,
    message: 'Mock recommended exercises loaded successfully',
    recommendedExercises: mockExercises,
    focusCategories: mockFocusCategories
  };
};

/**
 * Mock exercise service that can be used as a fallback
 * when the real service fails or for development purposes
 */
export const mockExerciseService = {
  getRecommendedExercises: async () => {
    return getMockRecommendedExercises();
  },
  
  getExerciseById: async (id: string) => {
    const allExercises = getMockRecommendedExercises().recommendedExercises;
    const exercise = allExercises.find(ex => ex.id === id);
    
    if (!exercise) {
      throw new Error(`Exercise with ID ${id} not found`);
    }
    
    return {
      success: true,
      exercise
    };
  },
  
  getExercisesByType: async (type: string) => {
    const allExercises = getMockRecommendedExercises().recommendedExercises;
    const exercises = allExercises.filter(ex => ex.exerciseType === type || ex.nasmCategory === type);
    
    return {
      success: true,
      exercises
    };
  },
  
  getExercisesByMuscleGroup: async (muscleGroup: string) => {
    const allExercises = getMockRecommendedExercises().recommendedExercises;
    const exercises = allExercises.filter(ex => 
      ex.primaryMuscles.includes(muscleGroup) || 
      ex.secondaryMuscles.includes(muscleGroup)
    );
    
    return {
      success: true,
      exercises
    };
  },
  
  searchExercises: async (query: string) => {
    const allExercises = getMockRecommendedExercises().recommendedExercises;
    const lowercaseQuery = query.toLowerCase();
    
    const exercises = allExercises.filter(ex => 
      ex.name.toLowerCase().includes(lowercaseQuery) || 
      ex.description.toLowerCase().includes(lowercaseQuery) || 
      ex.exerciseType.toLowerCase().includes(lowercaseQuery) ||
      ex.primaryMuscles.some(muscle => muscle.toLowerCase().includes(lowercaseQuery)) ||
      ex.secondaryMuscles.some(muscle => muscle.toLowerCase().includes(lowercaseQuery))
    );
    
    return {
      success: true,
      exercises
    };
  }
};

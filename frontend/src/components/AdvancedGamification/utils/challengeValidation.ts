/**
 * 🔍 CHALLENGE VALIDATION UTILITIES
 * ==================================
 * Validation rules and functions for admin challenge creation and management
 */

import type { 
  CreateChallengeRequest,
  UpdateChallengeRequest,
  ChallengeTarget,
  ChallengeDuration,
  ChallengeFormErrors,
  ChallengeFormValidation
} from '../types/challenge.types';

// ================================================================
// VALIDATION CONSTANTS
// ================================================================

const VALIDATION_RULES = {
  title: {
    minLength: 3,
    maxLength: 100,
    required: true
  },
  description: {
    minLength: 10,
    maxLength: 1000,
    required: true
  },
  shortDescription: {
    minLength: 5,
    maxLength: 200,
    required: true
  },
  duration: {
    minDays: 1,
    maxDays: 365,
    required: true
  },
  participants: {
    min: 1,
    max: 10000
  },
  xpPoints: {
    min: 1,
    max: 5000
  },
  target: {
    minValue: 1,
    maxValue: 1000000
  }
};

// Common challenge metrics and their validation rules
const METRIC_VALIDATION = {
  workout_count: { min: 1, max: 100, unit: 'workouts' },
  calories_burned: { min: 100, max: 50000, unit: 'calories' },
  duration_minutes: { min: 30, max: 10080, unit: 'minutes' }, // max 1 week
  steps: { min: 1000, max: 1000000, unit: 'steps' },
  distance_km: { min: 1, max: 1000, unit: 'kilometers' },
  weight_lifted_kg: { min: 100, max: 100000, unit: 'kilograms' },
  sessions_logged: { min: 1, max: 200, unit: 'sessions' },
  streak_days: { min: 3, max: 365, unit: 'days' }
};

// ================================================================
// INDIVIDUAL FIELD VALIDATORS
// ================================================================

/**
 * Validate challenge title
 */
export const validateTitle = (title: string): string | null => {
  if (!title || title.trim().length === 0) {
    return 'Title is required';
  }
  
  const trimmed = title.trim();
  if (trimmed.length < VALIDATION_RULES.title.minLength) {
    return `Title must be at least ${VALIDATION_RULES.title.minLength} characters`;
  }
  
  if (trimmed.length > VALIDATION_RULES.title.maxLength) {
    return `Title must be less than ${VALIDATION_RULES.title.maxLength} characters`;
  }
  
  // Check for profanity or inappropriate content (basic check)
  const inappropriateWords = ['spam', 'scam', 'fake', 'cheat'];
  if (inappropriateWords.some(word => trimmed.toLowerCase().includes(word))) {
    return 'Title contains inappropriate content';
  }
  
  return null;
};

/**
 * Validate challenge description
 */
export const validateDescription = (description: string): string | null => {
  if (!description || description.trim().length === 0) {
    return 'Description is required';
  }
  
  const trimmed = description.trim();
  if (trimmed.length < VALIDATION_RULES.description.minLength) {
    return `Description must be at least ${VALIDATION_RULES.description.minLength} characters`;
  }
  
  if (trimmed.length > VALIDATION_RULES.description.maxLength) {
    return `Description must be less than ${VALIDATION_RULES.description.maxLength} characters`;
  }
  
  return null;
};

/**
 * Validate short description
 */
export const validateShortDescription = (shortDescription: string): string | null => {
  if (!shortDescription || shortDescription.trim().length === 0) {
    return 'Short description is required';
  }
  
  const trimmed = shortDescription.trim();
  if (trimmed.length < VALIDATION_RULES.shortDescription.minLength) {
    return `Short description must be at least ${VALIDATION_RULES.shortDescription.minLength} characters`;
  }
  
  if (trimmed.length > VALIDATION_RULES.shortDescription.maxLength) {
    return `Short description must be less than ${VALIDATION_RULES.shortDescription.maxLength} characters`;
  }
  
  return null;
};

/**
 * Validate challenge duration
 */
export const validateDuration = (duration: Partial<ChallengeDuration>): string | null => {
  if (!duration.startDate) {
    return 'Start date is required';
  }
  
  if (!duration.endDate) {
    return 'End date is required';
  }
  
  const startDate = new Date(duration.startDate);
  const endDate = new Date(duration.endDate);
  const now = new Date();
  
  // Check if dates are valid
  if (isNaN(startDate.getTime())) {
    return 'Invalid start date';
  }
  
  if (isNaN(endDate.getTime())) {
    return 'Invalid end date';
  }
  
  // Check if start date is in the past (allow same day)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (startDate < todayStart) {
    return 'Start date cannot be in the past';
  }
  
  // Check if end date is after start date
  if (endDate <= startDate) {
    return 'End date must be after start date';
  }
  
  // Calculate duration in days
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
  
  if (durationDays < VALIDATION_RULES.duration.minDays) {
    return `Challenge must be at least ${VALIDATION_RULES.duration.minDays} day(s)`;
  }
  
  if (durationDays > VALIDATION_RULES.duration.maxDays) {
    return `Challenge cannot exceed ${VALIDATION_RULES.duration.maxDays} days`;
  }
  
  return null;
};

/**
 * Validate challenge target
 */
export const validateTarget = (target: Partial<ChallengeTarget>): string | null => {
  if (!target.metric) {
    return 'Target metric is required';
  }
  
  if (!target.value || target.value <= 0) {
    return 'Target value must be greater than 0';
  }
  
  // Validate against metric-specific rules
  const metricRules = METRIC_VALIDATION[target.metric as keyof typeof METRIC_VALIDATION];
  if (metricRules) {
    if (target.value < metricRules.min) {
      return `Target value must be at least ${metricRules.min} ${metricRules.unit}`;
    }
    
    if (target.value > metricRules.max) {
      return `Target value cannot exceed ${metricRules.max} ${metricRules.unit}`;
    }
  }
  
  if (!target.operator) {
    return 'Target operator is required';
  }
  
  const validOperators = ['greater_than', 'less_than', 'equal_to', 'between'];
  if (!validOperators.includes(target.operator)) {
    return 'Invalid target operator';
  }
  
  return null;
};

/**
 * Validate participant limits
 */
export const validateParticipantLimits = (
  maxParticipants?: number,
  minParticipants?: number
): string | null => {
  if (maxParticipants !== undefined) {
    if (maxParticipants < VALIDATION_RULES.participants.min) {
      return `Maximum participants must be at least ${VALIDATION_RULES.participants.min}`;
    }
    
    if (maxParticipants > VALIDATION_RULES.participants.max) {
      return `Maximum participants cannot exceed ${VALIDATION_RULES.participants.max}`;
    }
  }
  
  if (minParticipants !== undefined) {
    if (minParticipants < 0) {
      return 'Minimum participants cannot be negative';
    }
    
    if (maxParticipants !== undefined && minParticipants > maxParticipants) {
      return 'Minimum participants cannot exceed maximum participants';
    }
  }
  
  return null;
};

/**
 * Validate XP rewards
 */
export const validateXpRewards = (xpPoints: number): string | null => {
  if (xpPoints <= 0) {
    return 'XP reward must be greater than 0';
  }
  
  if (xpPoints < VALIDATION_RULES.xpPoints.min) {
    return `XP reward must be at least ${VALIDATION_RULES.xpPoints.min}`;
  }
  
  if (xpPoints > VALIDATION_RULES.xpPoints.max) {
    return `XP reward cannot exceed ${VALIDATION_RULES.xpPoints.max}`;
  }
  
  return null;
};

/**
 * Validate tags
 */
export const validateTags = (tags: string[]): string | null => {
  if (tags.length > 10) {
    return 'Cannot have more than 10 tags';
  }
  
  for (const tag of tags) {
    if (tag.length < 2) {
      return 'Tags must be at least 2 characters';
    }
    
    if (tag.length > 20) {
      return 'Tags cannot exceed 20 characters';
    }
    
    if (!/^[a-zA-Z0-9\s-_]+$/.test(tag)) {
      return 'Tags can only contain letters, numbers, spaces, hyphens, and underscores';
    }
  }
  
  // Check for duplicate tags
  const uniqueTags = new Set(tags.map(tag => tag.toLowerCase().trim()));
  if (uniqueTags.size !== tags.length) {
    return 'Duplicate tags are not allowed';
  }
  
  return null;
};

// ================================================================
// COMPREHENSIVE VALIDATION FUNCTIONS
// ================================================================

/**
 * Validate complete challenge creation request
 */
export const validateCreateChallenge = (
  data: Partial<CreateChallengeRequest>
): ChallengeFormValidation => {
  const errors: ChallengeFormErrors = {};
  const warnings: string[] = [];
  
  // Validate required fields
  const titleError = validateTitle(data.title || '');
  if (titleError) errors.title = titleError;
  
  const descriptionError = validateDescription(data.description || '');
  if (descriptionError) errors.description = descriptionError;
  
  const shortDescriptionError = validateShortDescription(data.shortDescription || '');
  if (shortDescriptionError) errors.description = shortDescriptionError;
  
  // Validate duration
  if (data.duration) {
    const durationError = validateDuration(data.duration);
    if (durationError) errors.duration = durationError;
  } else {
    errors.duration = 'Duration is required';
  }
  
  // Validate targets
  if (data.targets && data.targets.length > 0) {
    for (let i = 0; i < data.targets.length; i++) {
      const targetError = validateTarget(data.targets[i]);
      if (targetError) {
        errors.targets = `Target ${i + 1}: ${targetError}`;
        break;
      }
    }
  } else {
    errors.targets = 'At least one target is required';
  }
  
  // Validate participant limits
  const participantError = validateParticipantLimits(data.maxParticipants);
  if (participantError) errors.participants = participantError;
  
  // Validate rewards
  if (data.rewards?.xpPoints) {
    const xpError = validateXpRewards(data.rewards.xpPoints);
    if (xpError) errors.rewards = xpError;
  } else {
    errors.rewards = 'XP reward is required';
  }
  
  // Validate tags
  if (data.tags && data.tags.length > 0) {
    const tagsError = validateTags(data.tags);
    if (tagsError) errors.general = [tagsError];
  }
  
  // Generate warnings for potential issues
  if (data.difficulty === 'expert' && (!data.maxParticipants || data.maxParticipants > 100)) {
    warnings.push('Expert challenges typically have lower participation rates');
  }
  
  if (data.duration) {
    const durationDays = calculateDurationDays(data.duration.startDate, data.duration.endDate);
    if (durationDays > 30) {
      warnings.push('Long-duration challenges may have lower completion rates');
    }
  }
  
  if (data.rewards?.xpPoints && data.rewards.xpPoints > 1000) {
    warnings.push('High XP rewards may cause progression imbalance');
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

/**
 * Validate challenge update request
 */
export const validateUpdateChallenge = (
  data: Partial<UpdateChallengeRequest>
): ChallengeFormValidation => {
  const errors: ChallengeFormErrors = {};
  const warnings: string[] = [];
  
  // Only validate provided fields
  if (data.title !== undefined) {
    const titleError = validateTitle(data.title);
    if (titleError) errors.title = titleError;
  }
  
  if (data.description !== undefined) {
    const descriptionError = validateDescription(data.description);
    if (descriptionError) errors.description = descriptionError;
  }
  
  if (data.shortDescription !== undefined) {
    const shortDescriptionError = validateShortDescription(data.shortDescription);
    if (shortDescriptionError) errors.description = shortDescriptionError;
  }
  
  if (data.duration !== undefined) {
    const durationError = validateDuration(data.duration);
    if (durationError) errors.duration = durationError;
  }
  
  if (data.targets !== undefined && data.targets.length > 0) {
    for (let i = 0; i < data.targets.length; i++) {
      const targetError = validateTarget(data.targets[i]);
      if (targetError) {
        errors.targets = `Target ${i + 1}: ${targetError}`;
        break;
      }
    }
  }
  
  if (data.maxParticipants !== undefined) {
    const participantError = validateParticipantLimits(data.maxParticipants);
    if (participantError) errors.participants = participantError;
  }
  
  if (data.rewards?.xpPoints !== undefined) {
    const xpError = validateXpRewards(data.rewards.xpPoints);
    if (xpError) errors.rewards = xpError;
  }
  
  if (data.tags !== undefined) {
    const tagsError = validateTags(data.tags);
    if (tagsError) errors.general = [tagsError];
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Calculate duration in days between two dates
 */
const calculateDurationDays = (startDate?: string, endDate?: string): number => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationMs = end.getTime() - start.getTime();
  
  return Math.ceil(durationMs / (1000 * 60 * 60 * 24));
};

/**
 * Get available metrics for target validation
 */
export const getAvailableMetrics = (): Array<{
  value: string;
  label: string;
  description: string;
  unit: string;
}> => {
  return [
    {
      value: 'workout_count',
      label: 'Workouts Completed',
      description: 'Number of workout sessions completed',
      unit: 'workouts'
    },
    {
      value: 'calories_burned',
      label: 'Calories Burned',
      description: 'Total calories burned during activities',
      unit: 'calories'
    },
    {
      value: 'duration_minutes',
      label: 'Exercise Duration',
      description: 'Total minutes spent exercising',
      unit: 'minutes'
    },
    {
      value: 'steps',
      label: 'Steps Taken',
      description: 'Total number of steps recorded',
      unit: 'steps'
    },
    {
      value: 'distance_km',
      label: 'Distance Covered',
      description: 'Total distance covered in activities',
      unit: 'kilometers'
    },
    {
      value: 'weight_lifted_kg',
      label: 'Weight Lifted',
      description: 'Total weight lifted in strength training',
      unit: 'kilograms'
    },
    {
      value: 'sessions_logged',
      label: 'Sessions Logged',
      description: 'Number of training sessions logged',
      unit: 'sessions'
    },
    {
      value: 'streak_days',
      label: 'Streak Days',
      description: 'Consecutive days of activity',
      unit: 'days'
    }
  ];
};

/**
 * Get validation rules for a specific metric
 */
export const getMetricValidationRules = (metric: string) => {
  return METRIC_VALIDATION[metric as keyof typeof METRIC_VALIDATION];
};

/**
 * Check if a challenge can be modified based on its current state
 */
export const canModifyChallenge = (
  challengeStatus: string,
  hasParticipants: boolean,
  field: string
): { canModify: boolean; reason?: string } => {
  // Can't modify completed or archived challenges
  if (challengeStatus === 'completed' || challengeStatus === 'archived') {
    return {
      canModify: false,
      reason: 'Cannot modify completed or archived challenges'
    };
  }
  
  // Some fields can't be modified if challenge has participants
  if (hasParticipants) {
    const restrictedFields = ['targets', 'duration', 'difficulty', 'type'];
    if (restrictedFields.includes(field)) {
      return {
        canModify: false,
        reason: 'Cannot modify core challenge parameters after users have joined'
      };
    }
  }
  
  // Active challenges have more restrictions
  if (challengeStatus === 'active' && hasParticipants) {
    const activeRestrictedFields = ['maxParticipants'];
    if (activeRestrictedFields.includes(field)) {
      return {
        canModify: false,
        reason: 'Cannot modify participant limits for active challenges'
      };
    }
  }
  
  return { canModify: true };
};

// ================================================================
// EXPORT ALL VALIDATORS
// ================================================================

export {
  validateTitle,
  validateDescription,
  validateShortDescription,
  validateDuration,
  validateTarget,
  validateParticipantLimits,
  validateXpRewards,
  validateTags,
  validateCreateChallenge,
  validateUpdateChallenge,
  getAvailableMetrics,
  getMetricValidationRules,
  canModifyChallenge,
  VALIDATION_RULES,
  METRIC_VALIDATION
};

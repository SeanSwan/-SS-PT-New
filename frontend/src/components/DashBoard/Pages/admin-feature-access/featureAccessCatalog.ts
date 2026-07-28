export interface FeatureAccessOption {
  key: string;
  label: string;
}

export const CLIENT_CHALLENGE_CREATION_FEATURE_KEY = 'client_challenge_creation';

export const FEATURE_ACCESS_FEATURES: readonly FeatureAccessOption[] = Object.freeze([
  { key: 'content-studio', label: 'Content Studio' },
  { key: 'workout-planner-pro', label: 'Workout Planner Pro' },
  { key: CLIENT_CHALLENGE_CREATION_FEATURE_KEY, label: 'Client Challenge Creation' },
]);
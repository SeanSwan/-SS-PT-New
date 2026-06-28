export interface ClientOnboardingCategoryDefinition {
  key: string;
  label: string;
}

export interface ClientOnboardingCoverageFieldDefinition {
  coverageKey: string;
  key: string;
  label: string;
  category: string;
  trainerPrompt?: string;
  clientPrompt?: string;
  requiredFor?: string[];
  chartDataPriority?: number;
  defaultStatus?: string;
  canAskTrainer?: boolean;
  canAskClient?: boolean;
  isSensitive?: boolean;
  ledgerOnly?: boolean;
}

export const CLIENT_ONBOARDING_CATEGORY_KEYS: readonly string[];
export const CLIENT_ONBOARDING_REQUIRED_FOR: readonly string[];
export const CLIENT_ONBOARDING_QUESTION_BANK_CATEGORIES: readonly ClientOnboardingCategoryDefinition[];
export function getClientOnboardingCoverageFields(): ClientOnboardingCoverageFieldDefinition[];

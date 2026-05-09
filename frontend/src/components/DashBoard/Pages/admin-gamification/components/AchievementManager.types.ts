/**
 * Shared types for the canonical admin achievement manager tab.
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: AchievementTier;
  isActive: boolean;
  badgeImageUrl?: string;
}

export type AchievementDraft = Omit<Achievement, 'id'>;

export interface AchievementManagerProps {
  achievements: Achievement[];
  onCreateAchievement: (achievement: AchievementDraft) => void;
  onUpdateAchievement: (id: string, achievement: Partial<Achievement>) => void;
  onDeleteAchievement: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

export interface SelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

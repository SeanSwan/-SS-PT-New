/**
 * Shared types for the canonical admin reward manager tab.
 */

export type RewardTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointCost: number;
  tier: RewardTier;
  stock: number;
  isActive: boolean;
  redemptionCount: number;
  imageUrl?: string;
  expiresAt?: string;
}

export type RewardDraft = Omit<Reward, 'id' | 'redemptionCount'>;

export interface RewardManagerProps {
  rewards: Reward[];
  onCreateReward: (reward: RewardDraft) => void;
  onUpdateReward: (id: string, reward: Partial<Reward>) => void;
  onDeleteReward: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onUpdateStock: (id: string, stock: number) => void;
}

import type { LucideIcon } from 'lucide-react';

export type JobClass = 'paladin' | 'monk' | 'ranger' | 'white_mage' | 'dark_knight';

export interface JobClassConfig {
  id: JobClass;
  name: string;
  title: string;
  icon: LucideIcon;
  color: string;
  description: string;
  bonusText: string;
  focus: string;
  xpMultiplier: number;
  matchingCategories: string[];
}

export interface JobClassSelectorProps {
  userId: number;
  currentJobClass?: JobClass | null;
  onClassChange?: (jobClass: JobClass) => void;
  className?: string;
}

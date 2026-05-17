/**
 * Community tab discovery card definitions.
 */

import { Rss, Swords, Trophy, UserPlus, type LucideIcon } from 'lucide-react';

export interface CommunityCardDef {
  label: string;
  Icon: LucideIcon;
  colorRgb?: string;
  action?: 'tab-feed' | 'nav';
  path?: string;
  soon?: boolean;
}

export const COMMUNITY_CARDS: CommunityCardDef[] = [
  {
    label: 'Community Feed',
    Icon: Rss,
    action: 'tab-feed',
  },
  {
    label: 'Challenges',
    Icon: Trophy,
    colorRgb: '198, 168, 75',
    soon: true,
  },
  {
    label: 'Find Friends',
    Icon: UserPlus,
    colorRgb: '96, 192, 240',
    action: 'nav',
    path: '/social/friends',
  },
  {
    label: 'Factions & XP',
    Icon: Swords,
    colorRgb: '139, 92, 246',
    soon: true,
  },
];

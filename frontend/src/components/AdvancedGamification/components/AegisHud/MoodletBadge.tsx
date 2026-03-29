/**
 * ┌─── SUB-COMPONENT: MoodletBadge ────────────────────────────┐
 * │ PARENT: AegisHud                                            │
 * │ PURPOSE: Inline pill badge showing current mood derived     │
 * │          from needs state (energized, drained, etc.)        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────┐                                    │
 * │ │ ⚡ Energized         │                                    │
 * │ └──────────────────────┘                                    │
 * │ Props: MoodletBadgeProps                                    │
 * │ CLICK-OUTCOMES: None (display only)                         │
 * │ GAMIFICATION: Shows current moodlet state                   │
 * └────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import {
  Crown, Zap, Sparkles, Shield, Moon,
  Scale, HeartPulse, BatteryLow, Ghost, Minus,
} from 'lucide-react';
import type { MoodletBadgeProps } from './AegisHudTypes';
import { MoodletPill } from './AegisHudStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Moodlet Icon Map
// ─────────────────────────────────────────────────────────────

const MOODLET_ICONS: Record<string, React.ElementType> = {
  crown: Crown,
  zap: Zap,
  sparkles: Sparkles,
  shield: Shield,
  moon: Moon,
  scale: Scale,
  bandage: HeartPulse,
  'battery-low': BatteryLow,
  ghost: Ghost,
  minus: Minus,
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const MoodletBadge: React.FC<MoodletBadgeProps> = React.memo(({ moodlet, size = 'md' }) => {
  const IconComponent = MOODLET_ICONS[moodlet.icon] || Minus;

  return (
    <MoodletPill $size={size}>
      <IconComponent />
      {moodlet.label}
    </MoodletPill>
  );
});

MoodletBadge.displayName = 'MoodletBadge';

export default MoodletBadge;

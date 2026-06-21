/**
 * COMPONENT: MoodletBadge
 * PURPOSE: Inline Aegis HUD pill showing the current moodlet state.
 */
import React from 'react';
import {
  Crown, Zap, Sparkles, Shield, Moon,
  Scale, HeartPulse, BatteryLow, Ghost, Minus,
} from 'lucide-react';
import type { MoodletBadgeProps } from './AegisHudTypes';
import { MoodletPill } from './AegisHudStyles';

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

const MoodletBadge: React.FC<MoodletBadgeProps> = React.memo(({ moodlet, size = 'md' }) => {
  const IconComponent = MOODLET_ICONS[moodlet.icon] || Minus;

  return (
    <MoodletPill $size={size}>
      <IconComponent size={size === 'sm' ? 10 : 12} aria-hidden />
      {moodlet.label}
    </MoodletPill>
  );
});

MoodletBadge.displayName = 'MoodletBadge';

export default MoodletBadge;

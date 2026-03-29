/**
 * ┌─── SUB-COMPONENT: NeedBarComponent ────────────────────────┐
 * │ PARENT: AegisHud                                            │
 * │ PURPOSE: Single horizontal need bar with icon, label, value │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────────────────┐│
 * │ │ [Icon] Athletic Power               72/100              ││
 * │ │        ████████████████████░░░░░░░░                     ││
 * │ └──────────────────────────────────────────────────────────┘│
 * │ Props: NeedBarProps                                         │
 * │ CLICK-OUTCOMES: None (display only)                         │
 * │ GAMIFICATION: None (displays need state)                    │
 * └────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import {
  Dumbbell, HeartPulse, Users, Brain, Zap,
} from 'lucide-react';
import type { NeedBarProps } from './AegisHudTypes';
import {
  NeedBarRow,
  NeedIcon,
  NeedInfo,
  NeedLabelRow,
  NeedLabel,
  NeedValue,
  BarTrack,
  BarFill,
} from './AegisHudStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Icon Map
// ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  dumbbell: Dumbbell,
  'heart-pulse': HeartPulse,
  users: Users,
  brain: Brain,
  zap: Zap,
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const NeedBarComponent: React.FC<NeedBarProps> = React.memo(({ need, animate = true }) => {
  const IconComponent = ICON_MAP[need.icon] || Zap;
  const percentage = Math.min(100, Math.max(0, (need.value / need.maxValue) * 100));

  return (
    <NeedBarRow>
      <NeedIcon $color={need.color}>
        <IconComponent />
      </NeedIcon>
      <NeedInfo>
        <NeedLabelRow>
          <NeedLabel>{need.label}</NeedLabel>
          <NeedValue $color={need.color} $value={need.value}>
            {Math.round(need.value)}/{need.maxValue}
          </NeedValue>
        </NeedLabelRow>
        <BarTrack>
          <BarFill
            $width={percentage}
            $color={need.color}
            $animate={animate}
          />
        </BarTrack>
      </NeedInfo>
    </NeedBarRow>
  );
});

NeedBarComponent.displayName = 'NeedBarComponent';

export default NeedBarComponent;

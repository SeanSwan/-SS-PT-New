/**
 * COMPONENT: NeedBarComponent
 * PURPOSE: Single Aegis HUD need row with icon, label, value, and bar fill.
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

const ICON_MAP: Record<string, React.ElementType> = {
  dumbbell: Dumbbell,
  'heart-pulse': HeartPulse,
  users: Users,
  brain: Brain,
  zap: Zap,
};

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

const parseProgressNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return fallback;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProgress = (value: number, maxValue: number) => {
  const parsedMax = parseProgressNumber(maxValue, 100);
  const parsedValue = parseProgressNumber(value, 0);
  const safeMax = parsedMax > 0 ? parsedMax : 100;
  const safeValue = parsedValue;
  const clampedValue = Math.min(safeMax, Math.max(0, safeValue));

  return {
    displayValue: Math.round(clampedValue),
    displayMax: Math.round(safeMax),
    percentage: Math.min(100, Math.max(0, (clampedValue / safeMax) * 100)),
  };
};

const NeedBarComponent: React.FC<NeedBarProps> = React.memo(({ need, animate = true }) => {
  const IconComponent = ICON_MAP[need.icon] || Zap;
  const { displayValue, displayMax, percentage } = normalizeProgress(need.value, need.maxValue);

  return (
    <NeedBarRow>
      <NeedIcon $color={need.color}>
        <IconComponent size={16} aria-hidden />
      </NeedIcon>
      <NeedInfo>
        <NeedLabelRow>
          <NeedLabel>{need.label}</NeedLabel>
          <NeedValue $color={need.color} $value={displayValue}>
            {displayValue}/{displayMax}
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

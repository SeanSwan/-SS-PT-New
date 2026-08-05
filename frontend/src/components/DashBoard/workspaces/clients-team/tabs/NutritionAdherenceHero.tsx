/**
 * ============================================================================
 * FILE: NutritionAdherenceHero.tsx
 * PURPOSE: Phase 4A adherence hero — adherence % (Gilded Fern), streak with
 *          Ice Wing glow, and data-truth flag chips ("Verify N" /
 *          "N estimated") so inferred data is visibly discounted (HY3 §(a)2).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 * Supersedes NutritionTriageCard on the Nutrition tab (the card itself stays
 * mounted on the Overview tab — out of Phase 4A scope by design).
 */
import React from 'react';
import { Flame } from 'lucide-react';
import type { AdherenceHeroView } from './NutritionCoachTab.logic';
import {
  AdherenceChipRow,
  AdherenceChipTag,
  AdherenceHeroCard,
  AdherenceHeroLabel,
  AdherenceHeroStreak,
  AdherenceHeroTopRow,
  AdherenceHeroValue,
} from './NutritionCoachTab.styles';

interface NutritionAdherenceHeroProps {
  view: AdherenceHeroView;
}

const NutritionAdherenceHero: React.FC<NutritionAdherenceHeroProps> = ({ view }) => (
  <AdherenceHeroCard aria-label="Nutrition adherence">
    <AdherenceHeroTopRow>
      <AdherenceHeroValue>{view.adherenceLabel}</AdherenceHeroValue>
      <AdherenceHeroLabel>{view.rangeLabel}</AdherenceHeroLabel>
      <AdherenceHeroStreak $active={view.streakActive}>
        <Flame size={13} aria-hidden="true" />
        {view.streakLabel}
      </AdherenceHeroStreak>
    </AdherenceHeroTopRow>
    <AdherenceChipRow aria-label="Nutrition adherence flags">
      {view.chips.map((chip) => (
        <AdherenceChipTag key={chip.id} $tone={chip.tone}>
          {chip.label}
        </AdherenceChipTag>
      ))}
    </AdherenceChipRow>
  </AdherenceHeroCard>
);

export default NutritionAdherenceHero;

/**
 * ============================================================================
 * FILE: NutritionDiaryList.tsx
 * PURPOSE: Phase 4A diary list — preserves the proven meal-row rendering +
 *          Mark-verified action from the thin tab, adding the Wing Purple
 *          left-border on needs-review rows (HY3 §(a)6).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 */
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { NutritionTimelineRow } from './NutritionTabContent.logic';
import {
  NutritionTimelineActions,
  NutritionTimelineBadge,
  NutritionTimelineBadges,
  NutritionTimelineDescription,
  NutritionTimelineList,
  NutritionTimelineMeal,
  NutritionTimelineMeta,
  NutritionTimelineRowCard,
  NutritionTimelineRowHeader,
  NutritionTimelineTime,
  NutritionTimelineVerifyButton,
} from './NutritionTabContent.styles';

interface NutritionDiaryListProps {
  rows: NutritionTimelineRow[];
  verifyingId: number | string | null;
  onVerify: (row: NutritionTimelineRow) => void;
}

const NutritionDiaryList: React.FC<NutritionDiaryListProps> = ({ rows, verifyingId, onVerify }) => (
  <NutritionTimelineList>
    {rows.map((row) => (
      <NutritionTimelineRowCard key={row.id} $needsReview={row.needsAttention}>
        <NutritionTimelineRowHeader>
          <NutritionTimelineMeal>{row.title}</NutritionTimelineMeal>
          <NutritionTimelineTime>{row.createdAtLabel}</NutritionTimelineTime>
        </NutritionTimelineRowHeader>
        <NutritionTimelineDescription>{row.description}</NutritionTimelineDescription>
        <NutritionTimelineMeta>{row.macroLine} / {row.sourceLabel}</NutritionTimelineMeta>
        <NutritionTimelineBadges aria-label={`${row.title} review status`}>
          {row.reviewLabels.map((label) => (
            <NutritionTimelineBadge key={label} $attention={label === 'Needs review'}>
              {label}
            </NutritionTimelineBadge>
          ))}
        </NutritionTimelineBadges>
        {row.canVerify ? (
          <NutritionTimelineActions>
            <NutritionTimelineVerifyButton
              type="button"
              aria-label={`Mark ${row.title} verified`}
              disabled={verifyingId !== null}
              aria-busy={verifyingId === row.id}
              onClick={() => onVerify(row)}
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              Mark verified
            </NutritionTimelineVerifyButton>
          </NutritionTimelineActions>
        ) : null}
      </NutritionTimelineRowCard>
    ))}
  </NutritionTimelineList>
);

export default NutritionDiaryList;

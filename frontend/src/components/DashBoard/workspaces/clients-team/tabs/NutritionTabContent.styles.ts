import styled from 'styled-components';
import { swanDataCardShell, swanMetricTile } from '../clientCardSystem';

const alpha = (token: string, fallback: string, amount: number) =>
  `color-mix(in srgb, var(${token}, ${fallback}) ${amount}%, transparent)`;

export const NutritionTimelineShell = styled.section`
  --swan-card-padding: 18px;
  ${swanDataCardShell}
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

/* Phase 4A: the old header/title/date primitives were superseded by
   CoachClientNutritionHeader + NutritionDateStepper (HY3 §(a)1/§(a)4). */

export const NutritionTimelineList = styled.div`
  display: grid;
  gap: 10px;
`;

/** Phase 4A: needs-review rows carry a Wing Purple left border (HY3 §(a)6). */
export const NutritionTimelineRowCard = styled.article<{ $needsReview?: boolean }>`
  ${swanMetricTile}
  display: grid;
  gap: 9px;
  min-width: 0;
  padding: 12px;
  border-left: ${({ $needsReview }) => (
    $needsReview
      ? '3px solid color-mix(in srgb, var(--accent-purple, #8B5CF6) 78%, transparent)'
      : '1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'
  )};
`;

export const NutritionTimelineRowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
`;

export const NutritionTimelineMeal = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 900;
`;

export const NutritionTimelineTime = styled.span`
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 68)});
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
`;

export const NutritionTimelineDescription = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
`;

export const NutritionTimelineMeta = styled.span`
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 75)});
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
`;

export const NutritionTimelineBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const NutritionTimelineBadge = styled.span<{ $attention?: boolean }>`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $attention }) => (
    $attention
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'
  )};
  border: 1px solid ${({ $attention }) => (
    $attention
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 26%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'
  )};
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 850;
`;

export const NutritionTimelineActions = styled.div`
  display: flex;
  justify-content: flex-end;
  min-width: 0;

  @media (max-width: 520px) {
    justify-content: stretch;
  }
`;

export const NutritionTimelineVerifyButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--button-primary-bg, #002060) 88%, transparent),
    color-mix(in srgb, var(--accent-purple, #8B5CF6) 18%, var(--surface-elevated, #003080))
  );
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-purple, #8B5CF6) 18%, transparent);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 900;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
    box-shadow: 0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: progress;
    opacity: 0.68;
  }

  @media (max-width: 520px) {
    width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
  }
`;

export const NutritionTimelineState = styled.div`
  ${swanMetricTile}
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 78)});
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
`;

/** 5.4: context path to the Nutrition Plan Builder (staff-only header action). */
export const SetTargetsButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.85rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background: transparent;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

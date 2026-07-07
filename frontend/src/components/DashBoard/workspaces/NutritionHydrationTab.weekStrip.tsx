/**
 * NutritionHydrationTab.weekStrip.tsx — 7-day hydration history (BP02 5.2)
 * ==========================================================================
 * The first consumer of GET /api/hydration/weekly (previously zero consumers).
 * Extracted from the tab shell for the Rule-4 line cap. Background request —
 * never pops the global paywall; empty response renders nothing (honest).
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import apiService from '../../../services/api.service';

interface WeeklyHydrationDay {
  date: string;
  glassesFilled: number;
  dailyGoal: number;
}

const StripCard = styled.div`
  padding: 16px 20px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px;
`;

const StripTitle = styled.h3`
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  margin: 0;
`;

const DotsRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const Dot = styled.span<{ $onGoal: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-family: 'Fira Code', monospace;
  color: var(--text-primary, #E0ECF4);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: ${({ $onGoal }) =>
    $onGoal
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent)'
      : 'transparent'};
`;

const dayInitial = (iso: string): string =>
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${iso}T12:00:00`).getDay()] ?? '·';

/** refreshKey: bump on local changes (e.g. today's fill count) to refetch. */
const HydrationWeekStrip: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [days, setDays] = useState<WeeklyHydrationDay[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiService
      .get('/api/hydration/weekly', { _isBackgroundRequest: true } as never)
      .then((response) => {
        if (cancelled) return;
        setDays(Array.isArray(response?.data?.days) ? response.data.days : []);
      })
      .catch(() => {
        if (!cancelled) setDays([]);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (days.length === 0) return null;

  return (
    <StripCard aria-label="Seven day hydration history">
      <StripTitle>This Week</StripTitle>
      <DotsRow>
        {days.map((day) => (
          <Dot
            key={day.date}
            $onGoal={day.glassesFilled >= day.dailyGoal}
            title={`${day.date}: ${day.glassesFilled}/${day.dailyGoal} glasses`}
          >
            {dayInitial(day.date)}
          </Dot>
        ))}
      </DotsRow>
    </StripCard>
  );
};

export default HydrationWeekStrip;

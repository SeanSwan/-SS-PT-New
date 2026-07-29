/**
 * Blueprint: ClientTodayHero
 * Parent: ClientMyWorkoutsPage (mounted first — Workout-OS C4c "today-first")
 * Purpose: the Runna-lane Today band the probe scored ABSENT: a 7-day local
 * week strip (logged = earned gold, today = Ice Wing, rest = dim Frost —
 * Train state language) + one primary next action. Real data only: the strip
 * reads the same 28-day completed-session source as the weekly rings; on
 * error or no auth it degrades to the CTA row alone, never a crash and never
 * fabricated dots. If today is already logged the CTA flips to Progress —
 * re-logging a logged day would only meet the same-day 409.
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { TRAIN } from '../../../../styles/train-tokens';
import { CANONICAL_SURFACES } from '../../../../config/canonical-surface-names';
import { bucketWeekDays, type WeekDayState } from './clientWeeklyRings.logic';

const Hero = styled.section`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.4rem;
  margin-bottom: 1.25rem;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-primary-faint, rgba(80, 160, 240, 0.15));
  border-left: 3px solid ${TRAIN.active};
  border-radius: 1rem;
`;

const StripBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
`;

const StatusLine = styled.p`
  margin: 0;
  font: 600 0.95rem 'Plus Jakarta Sans', sans-serif;
  color: var(--text-primary, #E0ECF4);
`;

const DayRow = styled.div`
  display: flex;
  gap: 0.45rem;
`;

const DayChip = styled.span<{ $state: 'logged' | 'today' | 'idle' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font: 700 0.7rem 'Sora', sans-serif;
  color: ${({ $state }) => ($state === 'idle' ? TRAIN.pending : 'var(--text-primary, #E0ECF4)')};
  background: ${({ $state }) => ($state === 'logged'
    ? `color-mix(in srgb, ${TRAIN.done} 18%, transparent)`
    : 'transparent')};
  border: 2px solid ${({ $state }) => ($state === 'logged'
    ? TRAIN.done
    : $state === 'today'
      ? TRAIN.active
      : `color-mix(in srgb, ${TRAIN.pending} 35%, transparent)`)};
`;

const HeroCta = styled.button`
  min-height: 44px;
  padding: 0.65rem 1.4rem;
  border-radius: 0.65rem;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent);
  background: var(--accent-primary-deep, #002060);
  color: var(--text-primary, #E0ECF4);
  font: 600 0.9rem 'Sora', sans-serif;
  cursor: pointer;
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover { box-shadow: 0 0 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const chipState = (day: WeekDayState): 'logged' | 'today' | 'idle' =>
  (day.logged ? 'logged' : day.isToday ? 'today' : 'idle');

const useOptionalAuthAxios = () => {
  // Provider-safe: page-level suites render this page without an
  // AuthProvider; the hero degrades to its static CTA instead of throwing.
  try {
    return useAuth()?.authAxios ?? null;
  } catch {
    return null;
  }
};

const ClientTodayHero: React.FC = () => {
  const authAxios = useOptionalAuthAxios();
  const navigate = useNavigate();
  const [week, setWeek] = useState<WeekDayState[] | null>(null);
  // One fetch per mount — waits out late auth hydration, immune to context
  // identity churn (an unstable authAxios must never refire the effect).
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!authAxios || fetchedRef.current) return;
    fetchedRef.current = true;
    let alive = true;
    authAxios
      .get('/api/client/analytics/ring-weekly-source')
      .then((response) => {
        if (!alive) return;
        setWeek(bucketWeekDays(response.data?.data?.sessions ?? []));
      })
      .catch(() => { /* strip stays hidden — CTA still renders */ });
    return () => { alive = false; };
  }, [authAxios]);

  const todayLogged = Boolean(week?.some((day) => day.isToday && day.logged));

  return (
    <Hero aria-label="Today's training">
      <StripBlock>
        <StatusLine>
          {todayLogged ? 'Today is logged — nice work.' : "Today's session is waiting."}
        </StatusLine>
        {week && (
          <DayRow role="img" aria-label={`This week: ${week.filter((d) => d.logged).length} of 7 days logged`}>
            {week.map((day) => (
              <DayChip
                key={day.dayIndex}
                $state={chipState(day)}
                title={`${DAY_NAMES[day.dayIndex]}${day.logged ? ' — logged' : day.isToday ? ' — today' : ''}`}
              >
                {DAY_LETTERS[day.dayIndex]}
              </DayChip>
            ))}
          </DayRow>
        )}
      </StripBlock>
      <HeroCta
        type="button"
        onClick={() => navigate(todayLogged
          ? '/dashboard/client/progress'
          : `${CANONICAL_SURFACES.logWorkout.routes.client}?loadPlan=today`)}
      >
        {todayLogged ? 'See your progress' : "Start today's session"}
      </HeroCta>
    </Hero>
  );
};

export default ClientTodayHero;

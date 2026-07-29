/**
 * Blueprint: WeeklyRingsCard
 * Parent: ClientProgressDashboardPage
 * Purpose: Apex weekly rings — the daily-glance answer to "am I on my
 * pace?" (Workout-OS C3; lights the previously dead ring-weekly-source
 * endpoint). Three rings: workouts / volume / minutes, THIS local week vs
 * the trailing-3-week average. Real data only: loading, honest empty, and
 * error states — never fabricated targets.
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { ProgressRing } from '../../v2/sections/ProgressRing';
import { bucketWeeklyRings, type WeeklyRings } from './clientWeeklyRings.logic';

const Card = styled.section`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-primary-faint, rgba(80, 160, 240, 0.15));
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
`;

const Title = styled.h3`
  margin: 0 0 0.25rem;
  font: 600 0.95rem 'Plus Jakarta Sans', sans-serif;
  color: var(--text-primary, #E0ECF4);
`;

const Sub = styled.p`
  margin: 0 0 1rem;
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
`;

const RingRow = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: space-around;
`;

const StateLine = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted, #94a3b8);
`;

const fmt = (n: number): string => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

type RingsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; rings: WeeklyRings };

const WeeklyRingsCard: React.FC = () => {
  const { authAxios } = useAuth();
  const [state, setState] = useState<RingsState>({ status: 'loading' });
  // One fetch per mount — same guard as ClientTodayHero: unstable context
  // identity must never refire the effect.
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!authAxios || fetchedRef.current) return;
    fetchedRef.current = true;
    let alive = true;
    authAxios
      .get('/api/client/analytics/ring-weekly-source')
      .then((response) => {
        if (!alive) return;
        const sessions = response.data?.data?.sessions ?? [];
        setState({ status: 'ready', rings: bucketWeeklyRings(sessions) });
      })
      .catch(() => {
        if (alive) setState({ status: 'error' });
      });
    return () => { alive = false; };
  }, [authAxios]);

  return (
    <Card aria-label="Weekly activity rings">
      <Title>Weekly Rings</Title>
      <Sub>This week vs your 4-week pace</Sub>
      {state.status === 'loading' && <StateLine role="status">Loading your week…</StateLine>}
      {state.status === 'error' && <StateLine role="status">Rings unavailable right now — your logged workouts are safe.</StateLine>}
      {state.status === 'ready' && (
        state.rings.hasPace || state.rings.workouts.value > 0 ? (
          <RingRow>
            <ProgressRing
              pct={state.rings.workouts.pct}
              label={`${state.rings.workouts.value} workouts`}
              caption={state.rings.hasPace ? `pace ${fmt(state.rings.workouts.pace)}` : 'first weeks'}
            />
            <ProgressRing
              pct={state.rings.volume.pct}
              label={`${fmt(state.rings.volume.value)} lbs`}
              caption={state.rings.hasPace ? `pace ${fmt(state.rings.volume.pace)}` : 'volume'}
            />
            <ProgressRing
              pct={state.rings.minutes.pct}
              label={`${fmt(state.rings.minutes.value)} min`}
              caption={state.rings.hasPace ? `pace ${fmt(state.rings.minutes.pace)}` : 'minutes'}
            />
          </RingRow>
        ) : (
          <StateLine>Log a workout to start your rings — they track this week against your own pace.</StateLine>
        )
      )}
    </Card>
  );
};

export default WeeklyRingsCard;

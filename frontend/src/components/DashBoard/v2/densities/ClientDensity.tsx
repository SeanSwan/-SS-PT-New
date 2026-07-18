/**
 * Dashboards v2 — ClientDensity (KIMI-DASHBOARDS §2.4 "athlete-density"). Scan cost < 5s to "am I on
 * track and what's next?". Fixed order: adherence ring + week strip → next best action → progress →
 * milestones. ZERO --dash-action fill (ring uses --dash-accent); the ONE exception is the Crystallize
 * moment on a milestone tile (§2.5 action-budget). M2 motion (200ms entrances). Crystallize is
 * confirm-first: the server records it (200) BEFORE the cinematic overlay plays, then we refetch.
 */
import styled from 'styled-components';
import type { DashboardSummary } from '../types';
import { useDensityMotion } from '../motion/useDensityMotion';
import { Panel } from '../shell/DashboardShell.grid';
import { SectionHeader } from '../sections/SectionHeader';
import { ProgressRing } from '../sections/ProgressRing';
import { NextBestActionCard } from '../sections/NextBestActionCard';
import { TrendChart } from '../sections/TrendChart';
import { MilestoneTile } from '../sections/MilestoneTile';
import { EmptyState } from '../sections/EmptyState';
import { useCrystallizeMilestone } from '../sections/useCrystallizeMilestone';
import { CrystallizeOverlay } from '../lensBindings';

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: var(--dash-pad, 20px);
`;
const RingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
`;
const Week = styled.ol`
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`;
const Day = styled.li<{ $done: boolean; $today: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 36px;
  font-size: 11px;
  color: var(--dash-ink-2);
  &::before {
    content: '';
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ $done }) => ($done ? 'var(--dash-accent)' : 'var(--dash-line)')};
    outline: ${({ $today }) => ($today ? '2px solid var(--dash-accent)' : 'none')};
    outline-offset: 2px;
  }
`;
const MilestoneGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`;

export function ClientDensity({ summary, onRefresh }: { summary: DashboardSummary; onRefresh: () => void }) {
  const motion = useDensityMotion('dashboard.client');
  const { onCrystallize, overlayProps } = useCrystallizeMilestone('client', onRefresh);
  if (summary.role !== 'client') return null;

  return (
    <Stack data-testid="dash-density-client">
      <Panel>
        <SectionHeader kicker="This week" title="Adherence" />
        <RingRow>
          <ProgressRing pct={summary.adherencePct} label="Weekly adherence" caption="of plan" />
          <Week aria-label="Plan week">
            {summary.planWeek.map((d, i) => (
              <Day key={`${d.dayLabel}-${i}`} $done={d.done} $today={d.today}>
                {d.dayLabel}
              </Day>
            ))}
          </Week>
        </RingRow>
      </Panel>

      <NextBestActionCard action={summary.nextBestAction} accent="lens" />

      <Panel>
        <SectionHeader kicker="Progress" title="Your trend" />
        <TrendChart series={summary.progress} variant="area" height={200} animate={motion.chartAnimate} />
      </Panel>

      <Panel>
        <SectionHeader kicker="Milestones" title="Your achievements" />
        {summary.milestones.length ? (
          <MilestoneGrid>
            {summary.milestones.map((m) => (
              <MilestoneTile key={m.id} milestone={m} onCrystallize={onCrystallize} />
            ))}
          </MilestoneGrid>
        ) : (
          <EmptyState icon="prism" title="No milestones yet" body="Log workouts to start earning them." />
        )}
      </Panel>

      <CrystallizeOverlay {...overlayProps} />
    </Stack>
  );
}

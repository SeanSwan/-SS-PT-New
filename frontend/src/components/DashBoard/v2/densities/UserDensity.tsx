/**
 * Dashboards v2 — UserDensity (KIMI-DASHBOARDS §2.4 "community-density"). Scan cost < 5s to "what's my
 * momentum and what can I celebrate/share?". Fixed order: stats → progress → milestones → next action →
 * community. M2 motion. Crystallize is confirm-first (server 200 before the overlay plays), then refetch.
 */
import styled from 'styled-components';
import type { DashboardSummary } from '../types';
import { useDensityMotion } from '../motion/useDensityMotion';
import { StatBand, Panel } from '../shell/DashboardShell.grid';
import { StatCard } from '../sections/StatCard';
import { SectionHeader } from '../sections/SectionHeader';
import { TrendChart } from '../sections/TrendChart';
import { MilestoneTile } from '../sections/MilestoneTile';
import { NextBestActionCard } from '../sections/NextBestActionCard';
import { EmptyState } from '../sections/EmptyState';
import { useCrystallizeMilestone } from '../sections/useCrystallizeMilestone';
import { CrystallizeOverlay } from '../lensBindings';

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: var(--dash-pad, 20px);
`;
const MilestoneGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`;
const Community = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`;
const CommunityRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--dash-r-row, 12px);
  background: var(--dash-glass);
  border: 1px solid var(--dash-line);
  font-size: 13px;
  color: var(--dash-ink);
`;
const Age = styled.span`
  color: var(--dash-ink-2);
  font-size: 12px;
`;

export function UserDensity({ summary, onRefresh }: { summary: DashboardSummary; onRefresh: () => void }) {
  const motion = useDensityMotion('dashboard.user');
  const { onCrystallize, overlayProps } = useCrystallizeMilestone('user', onRefresh);
  if (summary.role !== 'user') return null;

  return (
    <Stack data-testid="dash-density-user">
      <StatBand>
        {summary.stats.map((s) => (
          <StatCard key={s.key} stat={s} />
        ))}
      </StatBand>

      <Panel>
        <SectionHeader kicker="Momentum" title="Your trend" />
        <TrendChart series={summary.progress} variant="area" height={200} animate={motion.chartAnimate} />
      </Panel>

      <Panel>
        <SectionHeader kicker="Milestones" title="Achievements" />
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

      <NextBestActionCard action={summary.nextBestAction} accent="action" />

      <Panel>
        <SectionHeader kicker="Community" title="Around you" />
        {summary.community.length ? (
          <Community aria-label="Community activity">
            {summary.community.map((c, i) => (
              <CommunityRow key={`${c.ref}-${i}`}>
                <span>
                  {c.ref} · {c.actionLabel}
                </span>
                <Age>{c.ageLabel}</Age>
              </CommunityRow>
            ))}
          </Community>
        ) : (
          <EmptyState icon="roster" title="Quiet for now" body="Community activity will show up here." />
        )}
      </Panel>

      <CrystallizeOverlay {...overlayProps} />
    </Stack>
  );
}

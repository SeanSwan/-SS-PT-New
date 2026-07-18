/**
 * Dashboards v2 — AdminDensity (KIMI-DASHBOARDS §2.5 "ops-density"). Composes sections from the
 * server AdminSummary. Scan cost < 5s to "is the studio healthy?". Fixed section order.
 * [Note vs §2.5 item 4: the ops NextBestAction is not in AdminSummary's type, so it is omitted to
 *  stay type-safe — server does not send it; add when the summary contract grows a field.]
 */
import styled from 'styled-components';
import type { DashboardSummary } from '../types';
import { useDensityMotion } from '../motion/useDensityMotion';
import { StatBand, Grid, Cell, Panel } from '../shell/DashboardShell.grid';
import { StatCard } from '../sections/StatCard';
import { SectionHeader } from '../sections/SectionHeader';
import { AlertList } from '../sections/AlertList';
import { TrendChart } from '../sections/TrendChart';
import { DataTable } from '../sections/DataTable';

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: var(--dash-pad, 20px);
`;

const SESSION_COLUMNS = [
  { key: 'ref' as const, label: 'Client', width: '30%' },
  { key: 'trainerRef' as const, label: 'Trainer', width: '20%' },
  { key: 'startLabel' as const, label: 'Start', width: '20%' },
  { key: 'endLabel' as const, label: 'End', width: '15%' },
  { key: 'status' as const, label: 'Status', width: '15%' },
];

export function AdminDensity({ summary }: { summary: DashboardSummary }) {
  const motion = useDensityMotion('dashboard.admin');
  if (summary.role !== 'admin') return null;

  return (
    <Stack data-testid="dash-density-admin">
      <StatBand>
        {summary.stats.map((s) => (
          <StatCard key={s.key} stat={s} />
        ))}
      </StatBand>

      <Grid>
        <Cell $span={5}>
          <Panel>
            <SectionHeader kicker="Attention" title="Alerts" />
            <AlertList alerts={summary.alerts} />
          </Panel>
        </Cell>
        <Cell $span={7}>
          <Panel>
            <SectionHeader kicker="Volume" title="Weekly sessions" />
            <TrendChart series={summary.weeklySessions} variant="area" height={220} animate={motion.chartAnimate} />
          </Panel>
        </Cell>
      </Grid>

      <Panel>
        <SectionHeader kicker="Today" title="Sessions" />
        <DataTable
          columns={SESSION_COLUMNS}
          rows={summary.sessionsToday}
          emptyState={{ icon: 'calendar', title: 'No sessions today', body: 'Nothing is on the floor right now.' }}
        />
      </Panel>

      <Grid>
        <Cell $span={12}>
          <Panel>
            <SectionHeader kicker="Load" title="Trainer load" />
            <TrendChart series={summary.trainerLoad} variant="bar" height={200} animate={motion.chartAnimate} />
          </Panel>
        </Cell>
      </Grid>
    </Stack>
  );
}

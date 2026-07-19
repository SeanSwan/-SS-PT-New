/**
 * Dashboards v2 — TrainerDensity (KIMI-DASHBOARDS §2.4 "coach-density"). Scan cost < 5s to "what do I
 * do next on the floor?". Fixed order: log hero → roster → today's sessions → client progress. The
 * LogSessionHero is the density's ONE --dash-action fill (action-budget §2.5). M1 motion (opacity-only).
 * [Deferred, additive: the §2.4 sticky-bottom log bar on hand/lap — the in-flow hero already satisfies
 *  the action; the sticky variant is polish, tracked as a follow-up, and needs no contract change.]
 */
import styled from 'styled-components';
import type { DashboardSummary } from '../types';
import { useDensityMotion } from '../motion/useDensityMotion';
import { Panel } from '../shell/DashboardShell.grid';
import { SectionHeader } from '../sections/SectionHeader';
import { LogSessionHero } from '../sections/LogSessionHero';
import { RosterStrip } from '../sections/RosterStrip';
import { DataTable } from '../sections/DataTable';
import { TrendChart } from '../sections/TrendChart';

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: var(--dash-pad, 20px);
`;

const SESSION_COLUMNS = [
  { key: 'ref' as const, label: 'Client', width: '38%' },
  { key: 'startLabel' as const, label: 'Start', width: '22%' },
  { key: 'endLabel' as const, label: 'End', width: '20%' },
  { key: 'status' as const, label: 'Status', width: '20%' },
];

export function TrainerDensity({ summary }: { summary: DashboardSummary }) {
  const motion = useDensityMotion('dashboard.trainer');
  if (summary.role !== 'trainer') return null;

  return (
    <Stack data-testid="dash-density-trainer">
      <LogSessionHero now={summary.now} next={summary.next} minutesUntilNext={summary.minutesUntilNext} />

      <Panel>
        <SectionHeader kicker="Roster" title="Your clients" />
        <RosterStrip roster={summary.roster} />
      </Panel>

      <Panel>
        <SectionHeader kicker="Today" title="Sessions" />
        <DataTable
          columns={SESSION_COLUMNS}
          rows={summary.today}
          emptyState={{ icon: 'calendar', title: 'No sessions today', body: 'Nothing on your floor right now.' }}
        />
      </Panel>

      <Panel>
        <SectionHeader kicker="Progress" title="Client progress" />
        <TrendChart series={summary.clientProgress} variant="area" height={200} animate={motion.chartAnimate} />
      </Panel>
    </Stack>
  );
}

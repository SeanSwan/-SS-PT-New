/**
 * Dashboards v2 — TrainerDensity (KIMI-DASHBOARDS §2.5). Slice-2 placeholder — full sections land next
 * slice. Kept type-complete + testid-correct so the shell + gate compile and route today (flag-gated off).
 */
import styled from 'styled-components';
import type { DashboardSummary } from '../types';
import { EmptyState } from '../sections/EmptyState';

const Stack = styled.div`
  padding: var(--dash-pad, 20px);
`;

export function TrainerDensity({ summary }: { summary: DashboardSummary }) {
  if (summary.role !== 'trainer') return null;
  return (
    <Stack data-testid="dash-density-trainer">
      <EmptyState icon="prism" title="Trainer dashboard" body="Full trainer sections arrive in the next slice." />
    </Stack>
  );
}

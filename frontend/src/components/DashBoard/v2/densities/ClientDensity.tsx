/**
 * Dashboards v2 — ClientDensity (KIMI-DASHBOARDS §2.5). Slice-2 placeholder — full sections land next
 * slice. Kept type-complete + testid-correct so the shell + gate compile and route today (flag-gated off).
 */
import styled from 'styled-components';
import type { DashboardSummary } from '../types';
import { EmptyState } from '../sections/EmptyState';

const Stack = styled.div`
  padding: var(--dash-pad, 20px);
`;

export function ClientDensity({ summary }: { summary: DashboardSummary }) {
  if (summary.role !== 'client') return null;
  return (
    <Stack data-testid="dash-density-client">
      <EmptyState icon="prism" title="Client dashboard" body="Full client sections arrive in the next slice." />
    </Stack>
  );
}

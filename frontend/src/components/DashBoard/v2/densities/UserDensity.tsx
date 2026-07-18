/**
 * Dashboards v2 — UserDensity (KIMI-DASHBOARDS §2.5). Slice-2 placeholder — full sections land next
 * slice. Kept type-complete + testid-correct so the shell + gate compile and route today (flag-gated off).
 */
import styled from 'styled-components';
import type { DashboardSummary } from '../types';
import { EmptyState } from '../sections/EmptyState';

const Stack = styled.div`
  padding: var(--dash-pad, 20px);
`;

export function UserDensity({ summary }: { summary: DashboardSummary }) {
  if (summary.role !== 'user') return null;
  return (
    <Stack data-testid="dash-density-user">
      <EmptyState icon="prism" title="User dashboard" body="Full user sections arrive in the next slice." />
    </Stack>
  );
}

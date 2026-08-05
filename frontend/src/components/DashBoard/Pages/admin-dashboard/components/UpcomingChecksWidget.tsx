/**
 * UpcomingChecksWidget
 * ─────────────────────────────────────────────────────────────
 * Dashboard widget showing clients with upcoming or overdue
 * measurement check-ins, sorted by urgency (RED first).
 *
 * SWA-138 S1 — first adopter of the WidgetShell foundation:
 * error is now DISTINCT from empty (a failed fetch renders
 * "Data unavailable" + Retry, never "All clients are up to
 * date"), data auto-refreshes via usePolledFetch, and stale
 * data survives a failed refresh with a visible notice.
 *
 * Architecture: styled-components + lucide-react + framer-motion
 * Theme: Crystalline Swan (cosmic dark, cyan accents, glass surfaces)
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Ruler, Scale } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../shell';

/* ─── Styled Components ─────────────────────────────────── */

const ClientList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 350px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
    border-radius: 3px;
  }
`;

const ClientItem = styled(motion.li)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-tertiary, #4070C0) 12%, transparent);

  &:last-child {
    border-bottom: none;
  }
`;

const StatusDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 6px color-mix(in srgb, ${({ $color }) => $color} 50%, transparent);
  flex-shrink: 0;
`;

const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CheckType = styled.div`
  color: var(--text-muted, #94A3B8);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const DaysBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: color-mix(in srgb, ${({ $color }) => $color} 20%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 40%, transparent);
  white-space: nowrap;
  flex-shrink: 0;
`;

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

/* ─── Types ──────────────────────────────────────────────── */

interface UpcomingCheck {
  userId: number;
  firstName: string;
  lastName: string;
  checkType: 'measurement' | 'weighIn';
  status: 'red' | 'yellow' | 'green';
  daysRemaining: number;
}

type CheckStatusPayload = {
  status?: UpcomingCheck['status'];
  daysRemaining?: number;
};

type NormalizedCheckStatus = {
  status: UpcomingCheck['status'];
  daysRemaining: number;
};

const STATUS_COLORS: Record<UpcomingCheck['status'], string> = {
  red: 'var(--error, #EF4444)',
  yellow: 'var(--warning, #EAB308)',
  green: 'var(--success, #22C55E)',
};

const STATUS_FALLBACK = 'var(--text-muted, #94A3B8)';

const normalizeCheckStatus = (value: unknown): NormalizedCheckStatus | null => {
  if (!value || typeof value !== 'object') return null;

  const payload = value as CheckStatusPayload;
  if (!payload.status || !(payload.status in STATUS_COLORS)) return null;
  const rawDaysRemaining = payload.daysRemaining;

  return {
    status: payload.status,
    daysRemaining: typeof rawDaysRemaining === 'number' && Number.isFinite(rawDaysRemaining) ? rawDaysRemaining : 0,
  };
};

/* ─── Component ──────────────────────────────────────────── */

const UpcomingChecksWidget: React.FC = () => {
  const { authAxios } = useAuth();

  const fetchUpcoming = useCallback(async (): Promise<UpcomingCheck[]> => {
    const res = await authAxios.get('/api/measurements/schedule/upcoming');
    const clientsData =
      res.data?.data?.clients ??
      res.data?.clients ??
      res.data?.data ??
      [];

    // Flatten: each client may have measurement + weighIn entries
    const flattened: UpcomingCheck[] = [];
    for (const c of (Array.isArray(clientsData) ? clientsData : [])) {
      const measurementStatus = normalizeCheckStatus(c.measurementStatus);
      if (measurementStatus) {
        flattened.push({
          userId: c.id || c.userId,
          firstName: c.firstName,
          lastName: c.lastName,
          checkType: 'measurement',
          status: measurementStatus.status,
          daysRemaining: measurementStatus.daysRemaining ?? 0,
        });
      }
      const weighInStatus = normalizeCheckStatus(c.weighInStatus);
      if (weighInStatus) {
        flattened.push({
          userId: c.id || c.userId,
          firstName: c.firstName,
          lastName: c.lastName,
          checkType: 'weighIn',
          status: weighInStatus.status,
          daysRemaining: weighInStatus.daysRemaining ?? 0,
        });
      }
    }

    // Sort: red first, then yellow, then green
    const priority: Record<string, number> = { red: 0, yellow: 1, green: 2 };
    flattened.sort((a, b) => (priority[a.status] ?? 2) - (priority[b.status] ?? 2));

    return flattened.slice(0, 10);
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } =
    usePolledFetch<UpcomingCheck[]>(fetchUpcoming);

  const checks = data ?? [];

  const formatDays = (days: number) => {
    if (days <= 0) return `${Math.abs(days)}d overdue`;
    return `${days}d left`;
  };

  return (
    <WidgetShell
      title="Upcoming Check-ins"
      icon={<Ruler size={20} />}
      loading={loading}
      error={error}
      empty={checks.length === 0}
      emptyMessage="All clients are up to date"
      hasData={data !== null && checks.length > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <ClientList>
        {checks.map((check, index) => (
          <ClientItem
            key={`${check.userId}-${check.checkType}`}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.08 }}
          >
            <StatusDot $color={STATUS_COLORS[check.status] || STATUS_FALLBACK} />
            <ClientInfo>
              <ClientName>{check.firstName} {check.lastName}</ClientName>
              <CheckType>
                {check.checkType === 'measurement' ? (
                  <><Ruler size={12} /> Full Measurement</>
                ) : (
                  <><Scale size={12} /> Weigh-In</>
                )}
              </CheckType>
            </ClientInfo>
            <DaysBadge $color={STATUS_COLORS[check.status] || STATUS_FALLBACK}>
              {formatDays(check.daysRemaining)}
            </DaysBadge>
          </ClientItem>
        ))}
      </ClientList>
    </WidgetShell>
  );
};

export default UpcomingChecksWidget;

/**
 * UpcomingChecksWidget
 * ─────────────────────────────────────────────────────────────
 * Dashboard widget showing clients with upcoming or overdue
 * measurement check-ins, sorted by urgency (RED first).
 *
 * Phase 11D — Admin Dashboard Widget
 * Architecture: styled-components + lucide-react + framer-motion
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass surfaces)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Ruler, Scale } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import WidgetSkeleton from './WidgetSkeleton';
import { CommandCard } from '../admin-dashboard-view';

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
    background: rgba(0, 255, 255, 0.2);
    border-radius: 3px;
  }
`;

const ClientItem = styled(motion.li)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);

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
  box-shadow: 0 0 6px ${({ $color }) => $color}80;
  flex-shrink: 0;
`;

const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.div`
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CheckType = styled.div`
  color: #94a3b8;
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
  background: ${({ $color }) => $color}20;
  border: 1px solid ${({ $color }) => $color}40;
  white-space: nowrap;
  flex-shrink: 0;
`;

const EmptyMsg = styled.div`
  text-align: center;
  color: #94a3b8;
  padding: 24px 0;
  font-size: 0.875rem;
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

const STATUS_COLORS: Record<string, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
};

/* ─── Component ──────────────────────────────────────────── */

const UpcomingChecksWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [checks, setChecks] = useState<UpcomingCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAxios.get('/api/measurements/schedule/upcoming');
      const data = res.data?.data || res.data?.clients || [];

      // Flatten: each client may have measurement + weighIn entries
      const flattened: UpcomingCheck[] = [];
      for (const c of (Array.isArray(data) ? data : [])) {
        if (c.measurementStatus) {
          flattened.push({
            userId: c.id || c.userId,
            firstName: c.firstName,
            lastName: c.lastName,
            checkType: 'measurement',
            status: c.measurementStatus,
            daysRemaining: c.measurementDaysRemaining ?? 0,
          });
        }
        if (c.weighInStatus) {
          flattened.push({
            userId: c.id || c.userId,
            firstName: c.firstName,
            lastName: c.lastName,
            checkType: 'weighIn',
            status: c.weighInStatus,
            daysRemaining: c.weighInDaysRemaining ?? 0,
          });
        }
      }

      // Sort: red first, then yellow, then green
      const priority: Record<string, number> = { red: 0, yellow: 1, green: 2 };
      flattened.sort((a, b) => (priority[a.status] ?? 2) - (priority[b.status] ?? 2));

      setChecks(flattened.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch upcoming checks:', err);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { fetchUpcoming(); }, [fetchUpcoming]);

  const formatDays = (days: number) => {
    if (days <= 0) return `${Math.abs(days)}d overdue`;
    return `${days}d left`;
  };

  return (
    <CommandCard style={{ padding: '2rem', height: '100%', marginBottom: '1.5rem' }}>
      <h3 style={{
        color: '#00ffff',
        margin: '0 0 1rem 0',
        fontSize: '1.25rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Ruler size={20} />
        Upcoming Check-ins
      </h3>

      {loading ? (
        <WidgetSkeleton count={4} />
      ) : checks.length === 0 ? (
        <EmptyMsg>All clients are up to date</EmptyMsg>
      ) : (
        <ClientList>
          {checks.map((check, index) => (
            <ClientItem
              key={`${check.userId}-${check.checkType}`}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.08 }}
            >
              <StatusDot $color={STATUS_COLORS[check.status] || '#94a3b8'} />
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
              <DaysBadge $color={STATUS_COLORS[check.status] || '#94a3b8'}>
                {formatDays(check.daysRemaining)}
              </DaysBadge>
            </ClientItem>
          ))}
        </ClientList>
      )}
    </CommandCard>
  );
};

export default UpcomingChecksWidget;

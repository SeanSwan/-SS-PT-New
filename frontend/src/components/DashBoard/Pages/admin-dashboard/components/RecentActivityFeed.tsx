/**
 * RecentActivityFeed — Last 10 platform actions
 * Shows signups, workouts logged, payments, achievements.
 * Theme: Crystalline Swan
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Activity, UserPlus, Dumbbell, DollarSign, Trophy,
  Shield, Clock, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CHART_COLORS, hexAlpha } from '../../../../Charts/chartTheme';

type ActivityType = 'signup' | 'workout' | 'payment' | 'achievement' | 'session' | 'system';

interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
  meta?: string;
}

const ICON_MAP: Record<ActivityType, { icon: React.ReactNode; color: string }> = {
  signup:      { icon: <UserPlus size={14} />,  color: CHART_COLORS.iceWing },
  workout:     { icon: <Dumbbell size={14} />,  color: CHART_COLORS.wingPurple },
  payment:     { icon: <DollarSign size={14} />, color: CHART_COLORS.gildedFern },
  achievement: { icon: <Trophy size={14} />,    color: CHART_COLORS.gildedFern },
  session:     { icon: <Clock size={14} />,     color: CHART_COLORS.arcticCyan },
  system:      { icon: <Shield size={14} />,    color: CHART_COLORS.swanLavender },
};

const ACTIVITY_TYPES: ActivityType[] = ['signup', 'workout', 'payment', 'achievement', 'session', 'system'];

const normalizeText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeActivityType = (value: unknown): ActivityType => (
  typeof value === 'string' && ACTIVITY_TYPES.includes(value as ActivityType)
    ? value as ActivityType
    : 'system'
);

const normalizeFeed = (value: unknown): ActivityItem[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const id = normalizeText(row.id, String(index));
    return {
      id,
      type: normalizeActivityType(row.type),
      message: normalizeText(row.message ?? row.description, 'Activity recorded'),
      timestamp: normalizeText(row.timeAgo ?? row.timestamp, 'Timestamp unavailable'),
      meta: typeof row.meta === 'string' ? row.meta : undefined,
    };
  });
};

const RecentActivityFeed: React.FC = () => {
  const { authAxios } = useAuth();
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/gamification/activity-feed', {
        params: { limit: 10 },
      });
      setFeed(normalizeFeed(res.data?.data));
      setError(null);
    } catch {
      setFeed([]);
      setError('Recent activity could not be loaded.');
    }
  }, [authAxios]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  return (
    <Wrapper>
      <Header>
        <IconWrap><Activity size={18} /></IconWrap>
        <div>
          <Title>Recent Activity</Title>
          <Subtitle>Last 10 platform events</Subtitle>
        </div>
      </Header>

      <FeedList>
        {error ? (
          <ErrorState role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <RetryInline type="button" onClick={fetchFeed}>
              <RefreshCw size={14} />
              Retry
            </RetryInline>
          </ErrorState>
        ) : feed.length === 0 ? (
          <EmptyState>No recent platform activity yet.</EmptyState>
        ) : (
          feed.map((item) => {
            const config = ICON_MAP[item.type] ?? ICON_MAP.system;
            return (
              <FeedItem key={item.id}>
                <FeedIcon $color={config.color}>{config.icon}</FeedIcon>
                <FeedContent>
                  <FeedMessage>{item.message}</FeedMessage>
                  <FeedTime>{item.timestamp}</FeedTime>
                </FeedContent>
              </FeedItem>
            );
          })
        )}
      </FeedList>
    </Wrapper>
  );
};

export default RecentActivityFeed;

/* ── Styled Components ── */

const Wrapper = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-radius: 16px;
  padding: 20px;
`;

const Header = styled.div`
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
`;

const IconWrap = styled.div`
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
  color: ${CHART_COLORS.iceWing};
`;

const Title = styled.h3`
  font-size: 15px; font-weight: 700;
  color: var(--text-primary, #E0ECF4); margin: 0;
`;

const Subtitle = styled.p`
  font-size: 11px; margin: 2px 0 0;
  color: var(--text-secondary, rgba(224,236,244,0.5));
`;

const FeedList = styled.div`
  display: flex; flex-direction: column; gap: 2px;
`;

const ErrorState = styled.div`
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px;
  min-height: 44px; padding: 10px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--warning, #F59E0B) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning, #F59E0B) 26%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 12px;
  @media (max-width: 430px) { grid-template-columns: auto 1fr; }
`;

const RetryInline = styled.button`
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent); border-radius: 8px; padding: 0 12px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 40%, transparent); color: var(--text-primary, #E0ECF4);
  font-size: 12px; font-weight: 700; cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  @media (max-width: 430px) { grid-column: 1 / -1; width: 100%; }
`;

const EmptyState = styled.div`
  min-height: 44px; display: flex; align-items: center;
  padding: 10px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 20%, transparent);
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  color: var(--text-secondary, rgba(224,236,244,0.7));
  font-size: 12px;
`;

const FeedItem = styled.div`
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  transition: background 0.15s;
  &:hover { background: color-mix(in srgb, var(--royal-depth, #003080) 20%, transparent); }
`;

const FeedIcon = styled.div<{ $color: string }>`
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  background: ${p => hexAlpha(p.$color, 0.12)};
  color: ${p => p.$color};
`;

const FeedContent = styled.div`
  flex: 1; min-width: 0;
`;

const FeedMessage = styled.div`
  font-size: 13px; color: var(--text-primary, #E0ECF4);
  line-height: 1.4;
`;

const FeedTime = styled.div`
  font-size: 11px; color: var(--text-muted, rgba(224,236,244,0.4));
  margin-top: 2px; font-family: 'Fira Code', monospace;
`;

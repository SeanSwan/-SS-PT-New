/**
 * RecentActivityFeed — Last 10 platform actions
 * Shows signups, workouts logged, payments, achievements.
 * Theme: Crystalline Swan
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Activity, UserPlus, Dumbbell, DollarSign, Trophy,
  Shield, Bell, Clock,
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
  achievement: { icon: <Trophy size={14} />,    color: '#10B981' },
  session:     { icon: <Clock size={14} />,     color: CHART_COLORS.arcticCyan },
  system:      { icon: <Shield size={14} />,    color: CHART_COLORS.swanLavender },
};

const DEMO_FEED: ActivityItem[] = [
  { id: '1', type: 'signup',      message: 'New user registered',                timestamp: '2 min ago' },
  { id: '2', type: 'workout',     message: 'Client completed Upper Body workout', timestamp: '8 min ago' },
  { id: '3', type: 'payment',     message: 'Payment received — $186.00',          timestamp: '15 min ago' },
  { id: '4', type: 'achievement', message: 'Achievement unlocked: 10-Day Streak', timestamp: '22 min ago' },
  { id: '5', type: 'session',     message: 'Training session scheduled',          timestamp: '35 min ago' },
  { id: '6', type: 'workout',     message: 'Client completed Leg Day',            timestamp: '1 hr ago' },
  { id: '7', type: 'signup',      message: 'New user registered',                timestamp: '1.5 hr ago' },
  { id: '8', type: 'payment',     message: 'Subscription renewed — $24.99/mo',    timestamp: '2 hr ago' },
  { id: '9', type: 'system',      message: 'Daily backup completed',              timestamp: '3 hr ago' },
  { id: '10', type: 'achievement', message: 'Achievement unlocked: First Workout', timestamp: '4 hr ago' },
];

const RecentActivityFeed: React.FC = () => {
  const { authAxios } = useAuth();
  const [feed, setFeed] = useState<ActivityItem[]>(DEMO_FEED);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/gamification/activity-feed', {
        params: { limit: 10 },
      });
      if (res.data?.data?.length) {
        setFeed(res.data.data.map((item: any, i: number) => ({
          id: item.id ?? String(i),
          type: item.type ?? 'system',
          message: item.message ?? item.description ?? 'Activity recorded',
          timestamp: item.timeAgo ?? item.timestamp ?? 'just now',
          meta: item.meta,
        })));
      }
    } catch {
      setFeed(DEMO_FEED);
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
        {feed.map((item) => {
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
        })}
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

const FeedItem = styled.div`
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  transition: background 0.15s;
  &:hover { background: rgba(0, 32, 96, 0.2); }
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
  font-size: 11px; color: rgba(224,236,244,0.4);
  margin-top: 2px; font-family: 'Fira Code', monospace;
`;

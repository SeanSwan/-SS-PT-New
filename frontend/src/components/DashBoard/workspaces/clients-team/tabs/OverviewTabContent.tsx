/**
 * FILE: OverviewTabContent.tsx
 * PURPOSE: Live bento overview dashboard for a selected client.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Flame,
  BarChart3,
  Award,
  DollarSign,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import apiService from '../../../../../services/api.service';
import NutritionTriageCard from './NutritionTriageCard';
import { getClientSessionSignal } from '../clientSessionSignal';
import { getNumericClientId } from './clientTabId';
import {
  BentoCard,
  BentoGrid,
  CardHeader,
  CardIcon,
  CardSubtext,
  CardTitle,
  CardValue,
  HeroRow,
  HeroStat,
  HeroStatLabel,
  HeroStatValue,
} from './OverviewTabContent.styles';

interface OverviewTabContentProps {
  clientId: number | string;
  clientName?: string;
}

interface ClientOverviewData {
  totalWorkouts: number;
  points: number;
  level: number;
  tier: string;
  streakDays: number;
  sessionsRemaining: number;
  clientSource: string;
  totalRevenue: number;
  lastWorkoutDate: string | null;
  nextSessionDate: string | null;
  achievementCount: number;
  optPhase: number;
}

function useClientOverview(clientId: number | string) {
  const [data, setData] = useState<ClientOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const numericClientId = getNumericClientId(clientId);
    if (!numericClientId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    apiService.get(`/api/admin/clients/${numericClientId}`)
      .then(response => {
        if (cancelled) return;

        const json = response.data;
        const c = json.data?.client || json.client || json.data || json;
        const availableSessions = c.availableSessions ?? c.sessionsRemaining ?? c.remainingSessions ?? 0;

        setData({
          totalWorkouts: c.totalWorkouts || c.workoutCount || 0,
          points: c.points || 0,
          level: c.level || 1,
          tier: c.tier || 'Bronze Forge',
          streakDays: c.streakDays || 0,
          sessionsRemaining: Number.isFinite(Number(availableSessions)) ? Number(availableSessions) : 0,
          clientSource: typeof c.clientSource === 'string' ? c.clientSource : 'swanstudios',
          totalRevenue: c.totalRevenue || c.revenue || 0,
          lastWorkoutDate: c.lastWorkoutDate || c.lastActiveDate || null,
          nextSessionDate: c.nextSessionDate || null,
          achievementCount: c.achievementCount || c.badges || 0,
          optPhase: c.currentPhase || c.optPhase || 1,
        });
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { data, loading };
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'None scheduled';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'None scheduled';

  const now = new Date();
  const diff = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `In ${diff} days`;
};

const formatCurrency = (value: number): string => {
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const OverviewTabContent: React.FC<OverviewTabContentProps> = React.memo(({ clientId, clientName }) => {
  const { data, loading } = useClientOverview(clientId);

  const cards = useMemo(() => {
    const sessionSignal = data
      ? getClientSessionSignal({
          clientSource: data.clientSource,
          availableSessions: data.sessionsRemaining,
        })
      : null;

    return [
      {
        id: 'ai-protocol',
        title: `${clientName || 'Client'} - Training Overview`,
        icon: <Brain size={18} />,
        iconColor: 'var(--accent-secondary, #8B5CF6)',
        span: 4,
        heroAccent: 'var(--accent-secondary, #8B5CF6)',
        isHero: true,
      },
      {
        id: 'opt-phase',
        title: 'OPT Phase',
        icon: <TrendingUp size={18} />,
        iconColor: 'var(--accent-primary, #60C0F0)',
        span: 1,
        value: data ? `Phase ${data.optPhase}` : '--',
        subtext: data ? `Level ${data.level} - ${data.tier}` : 'Loading...',
      },
      {
        id: 'xp-streak',
        title: 'XP / Streak',
        icon: <Flame size={18} />,
        iconColor: 'var(--accent-gold, #C6A84B)',
        span: 1,
        value: data ? `${data.points.toLocaleString()} XP` : '0 XP',
        subtext: data ? `${data.streakDays}-day streak` : '0-day streak',
      },
      {
        id: 'workouts',
        title: 'Total Workouts',
        icon: <BarChart3 size={18} />,
        iconColor: 'var(--accent-primary, #60C0F0)',
        span: 1,
        value: data ? `${data.totalWorkouts}` : '--',
        subtext: data?.lastWorkoutDate ? `Last: ${formatDate(data.lastWorkoutDate)}` : 'No workouts logged',
      },
      {
        id: 'badges',
        title: 'Achievements',
        icon: <Award size={18} />,
        iconColor: 'var(--accent-secondary, #8B5CF6)',
        span: 1,
        value: data ? `${data.achievementCount}` : '0',
        subtext: 'Badges earned',
      },
      {
        id: 'revenue',
        title: 'Revenue / Sessions',
        icon: <DollarSign size={18} />,
        iconColor: 'var(--accent-gold, #C6A84B)',
        span: 2,
        value: data ? formatCurrency(data.totalRevenue) : '--',
        subtext: sessionSignal ? `${sessionSignal.label} - ${sessionSignal.note}` : 'Loading...',
      },
      {
        id: 'schedule',
        title: 'Next Session',
        icon: <Calendar size={18} />,
        iconColor: 'var(--accent-primary, #60C0F0)',
        span: 2,
        value: data ? formatDate(data.nextSessionDate) : '--',
        subtext: 'Upcoming scheduled session',
      },
    ];
  }, [data, clientName]);

  return (
    <BentoGrid>
      {cards.map((card) => (
        <BentoCard key={card.id} $span={card.span} $heroAccent={card.heroAccent}>
          <CardHeader>
            <CardIcon $color={card.iconColor}>
              {card.icon}
            </CardIcon>
            <CardTitle>{card.title}</CardTitle>
          </CardHeader>

          {card.isHero ? (
            <HeroRow>
              <HeroStat>
                <HeroStatLabel>Level</HeroStatLabel>
                <HeroStatValue>{data?.level || '--'}</HeroStatValue>
              </HeroStat>
              <HeroStat>
                <HeroStatLabel>Tier</HeroStatLabel>
                <HeroStatValue>{data?.tier || '--'}</HeroStatValue>
              </HeroStat>
              <HeroStat>
                <HeroStatLabel>OPT Phase</HeroStatLabel>
                <HeroStatValue>{data?.optPhase || '--'}</HeroStatValue>
              </HeroStat>
              <HeroStat>
                <HeroStatLabel>Workouts</HeroStatLabel>
                <HeroStatValue>{data?.totalWorkouts || 0}</HeroStatValue>
              </HeroStat>
              <HeroStat>
                <HeroStatLabel>Streak</HeroStatLabel>
                <HeroStatValue>{data?.streakDays || 0}d</HeroStatValue>
              </HeroStat>
            </HeroRow>
          ) : (
            <>
              <CardValue>{loading ? '...' : card.value}</CardValue>
              <CardSubtext>{card.subtext}</CardSubtext>
            </>
          )}
        </BentoCard>
      ))}
      <NutritionTriageCard clientId={clientId} />
    </BentoGrid>
  );
});

OverviewTabContent.displayName = 'OverviewTabContent';

export default OverviewTabContent;

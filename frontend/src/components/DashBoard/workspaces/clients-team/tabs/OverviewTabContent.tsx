/**
 * ============================================================================
 * FILE: OverviewTabContent.tsx
 * PURPOSE: Bento grid overview dashboard for a selected client (LIVE DATA)
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-04-02
 * AI VILLAGE VALIDATED: 2026-04-02
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a bento-grid of dashboard cards for a client's
 * overview tab. Fetches real data from /api/admin/clients/:id and gamification
 * endpoints to show live stats, sessions, and engagement data.
 *
 * HOW IT FITS IN THE APP: ClientDetailView → OverviewTabContent (renderOverview prop)
 * KEY DECISIONS: Cards now show real data where available, with graceful '--' fallbacks.
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import {
  Brain, Gauge, Flame, BarChart3,
  Award, DollarSign, Calendar, TrendingUp,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

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
  totalRevenue: number;
  lastWorkoutDate: string | null;
  nextSessionDate: string | null;
  achievementCount: number;
  optPhase: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 0;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const BentoCard = styled.div<{ $span?: number; $heroAccent?: string }>`
  grid-column: span ${({ $span }) => $span || 1};
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 200ms ease, box-shadow 200ms ease;

  ${({ $heroAccent }) => $heroAccent && `
    border-left: 3px solid ${$heroAccent};
  `}

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  }

  @media (max-width: 1024px) {
    grid-column: span ${({ $span }) => ($span && $span > 2 ? 2 : $span || 1)};
  }

  @media (max-width: 430px) {
    grid-column: span 1;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CardIcon = styled.div<{ $color?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'} 12%, transparent);
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  flex-shrink: 0;
`;

const CardTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const CardValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const CardSubtext = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  margin: 0;
  line-height: 1.5;
`;

const HeroRow = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
`;

const HeroStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const HeroStatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const HeroStatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Data Fetching
// ─────────────────────────────────────────────────────────────

function useClientOverview(clientId: number | string) {
  const [data, setData] = useState<ClientOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    const token = localStorage.getItem('token');

    fetch(`/api/admin/clients/${clientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(json => {
        // Backend `getClientDetails` (adminClientController.mjs:570-576) wraps
        // the client one extra level deep: `{ data: { client, mcpStats } }`.
        // Pierce that first; preserve legacy `client` / `data` fallbacks.
        const c = json.data?.client || json.client || json.data || json;
        setData({
          totalWorkouts: c.totalWorkouts || c.workoutCount || 0,
          points: c.points || 0,
          level: c.level || 1,
          tier: c.tier || 'Bronze Forge',
          streakDays: c.streakDays || 0,
          sessionsRemaining: c.sessionsRemaining ?? c.remainingSessions ?? 0,
          totalRevenue: c.totalRevenue || c.revenue || 0,
          lastWorkoutDate: c.lastWorkoutDate || c.lastActiveDate || null,
          nextSessionDate: c.nextSessionDate || null,
          achievementCount: c.achievementCount || c.badges || 0,
          optPhase: c.currentPhase || c.optPhase || 1,
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [clientId]);

  return { data, loading };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'None scheduled';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'None scheduled';
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `In ${diff} days`;
};

const formatCurrency = (val: number): string => {
  if (val === 0) return '$0';
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const OverviewTabContent: React.FC<OverviewTabContentProps> = React.memo(({ clientId, clientName }) => {
  const { data, loading } = useClientOverview(clientId);

  const cards = useMemo(() => {
    const d = data;
    return [
      {
        id: 'ai-protocol',
        title: `${clientName || 'Client'} — Training Overview`,
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
        value: d ? `Phase ${d.optPhase}` : '--',
        subtext: d ? `Level ${d.level} · ${d.tier}` : 'Loading...',
      },
      {
        id: 'xp-streak',
        title: 'XP / Streak',
        icon: <Flame size={18} />,
        iconColor: 'var(--accent-gold, #C6A84B)',
        span: 1,
        value: d ? `${d.points.toLocaleString()} XP` : '0 XP',
        subtext: d ? `${d.streakDays}-day streak` : '0-day streak',
      },
      {
        id: 'workouts',
        title: 'Total Workouts',
        icon: <BarChart3 size={18} />,
        iconColor: 'var(--accent-primary, #60C0F0)',
        span: 1,
        value: d ? `${d.totalWorkouts}` : '--',
        subtext: d?.lastWorkoutDate ? `Last: ${formatDate(d.lastWorkoutDate)}` : 'No workouts logged',
      },
      {
        id: 'badges',
        title: 'Achievements',
        icon: <Award size={18} />,
        iconColor: 'var(--accent-secondary, #8B5CF6)',
        span: 1,
        value: d ? `${d.achievementCount}` : '0',
        subtext: 'Badges earned',
      },
      {
        id: 'revenue',
        title: 'Revenue / Sessions',
        icon: <DollarSign size={18} />,
        iconColor: 'var(--accent-gold, #C6A84B)',
        span: 2,
        value: d ? formatCurrency(d.totalRevenue) : '--',
        subtext: d ? `${d.sessionsRemaining} sessions remaining` : 'Loading...',
      },
      {
        id: 'schedule',
        title: 'Next Session',
        icon: <Calendar size={18} />,
        iconColor: 'var(--accent-primary, #60C0F0)',
        span: 2,
        value: d ? formatDate(d.nextSessionDate) : '--',
        subtext: 'Upcoming scheduled session',
      },
    ];
  }, [data, clientName]);

  return (
    <BentoGrid>
      {cards.map((card) => (
        <BentoCard
          key={card.id}
          $span={card.span}
          $heroAccent={card.heroAccent}
        >
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
    </BentoGrid>
  );
});

OverviewTabContent.displayName = 'OverviewTabContent';

export default OverviewTabContent;

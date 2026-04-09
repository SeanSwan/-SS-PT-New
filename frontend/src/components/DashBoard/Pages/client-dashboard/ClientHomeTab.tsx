/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientHomeTab                                    ║
 * ║  PURPOSE: Default client landing surface — guided journey    ║
 * ║  OWNER: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-09        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * REPLACES: ClientOverviewPage (same /overview route, new component)
 * MOUNTS AT: /dashboard/client/overview
 *
 * WIREFRAME:
 * ┌───────────────────────────────────────────┐
 * │ MomentumCard                              │
 * │  🔥 14d streak   Lv.12 Silver            │
 * │  ████████░░ 76% to Level 13              │
 * ├───────────────────────────────────────────┤
 * │ SwanCoachDockClient (consent-aware dock)  │
 * ├───────────────────────────────────────────┤
 * │ NextSession  "Book your next session →"   │
 * ├───────────────────────────────────────────┤
 * │ Quick Actions (2×2)                       │
 * │  [Log Workout]     [Book Session]         │
 * │  [View Progress]   [Community]            │
 * └───────────────────────────────────────────┘
 *
 * DATA FLOW:
 *   useGamificationData → momentum stats (level, streak, XP)
 *   SwanCoachDockClient → useAiConsent internally
 *   Next Session → static CTA (no /api/schedule/upcoming endpoint exists yet)
 *   Quick Actions → navigate only, no data fetch
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell, TrendingUp, Users, Calendar, Flame, Zap,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import SwanCoachDockClient from './SwanCoachDockClient';

// ─── Animations ─────────────────────────────────────────────────────────────

const countUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const barGrow = keyframes`
  from { width: 0%; }
`;

// ─── Styled Components ───────────────────────────────────────────────────────

const PageWrap = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 860px;

  @media (max-width: 414px) { padding: 1rem; gap: 0.875rem; }
  @media (max-width: 375px) { padding: 0.875rem; }
`;

// ── MomentumCard ──────────────────────────────────────────────

const MomentumCard = styled.div`
  background: linear-gradient(135deg,
    rgba(0, 32, 96, 0.9) 0%,
    rgba(0, 48, 128, 0.75) 100%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 20px;
  padding: 1.5rem;
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;

  @media (max-width: 414px) { padding: 1.25rem; border-radius: 16px; }
`;

const MomentumTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 375px) { flex-direction: column; gap: 0.75rem; }
`;

const StatPair = styled.div`
  display: flex;
  gap: 1.5rem;

  @media (max-width: 375px) { gap: 1rem; }
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const StatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  line-height: 1;
`;

const StatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const TierBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  background: ${({ $color }) => $color}1A;
  border: 1px solid ${({ $color }) => $color}40;
  color: ${({ $color }) => $color};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

const XpSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
`;

const XpLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
`;

const XpTrack = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
`;

const XpFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 4px;
  width: ${({ $pct }) => Math.min(Math.max($pct, 0), 100)}%;
  background: linear-gradient(90deg,
    var(--accent-secondary, #8B5CF6),
    var(--accent-primary, #60C0F0));
  box-shadow: 0 0 8px rgba(96, 192, 240, 0.3);
  animation: ${barGrow} 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.2s;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const XpPct = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  white-space: nowrap;
`;

// ── NextSession ───────────────────────────────────────────────

const NextSessionCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 16px;
  padding: 1.125rem 1.375rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SessionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const SessionLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const SessionValue = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const BookBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0.625rem 1.125rem;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  background: rgba(96, 192, 240, 0.07);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;

  &:hover {
    background: rgba(96, 192, 240, 0.13);
    border-color: rgba(96, 192, 240, 0.45);
    box-shadow: 0 0 14px rgba(96, 192, 240, 0.15);
  }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

// ── Quick Actions ─────────────────────────────────────────────

const SectionHeading = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin: 0;
`;

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;

const ActionCard = styled.button<{ $accentRgb: string }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  min-height: 64px;
  padding: 1rem 1.125rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(${({ $accentRgb }) => $accentRgb}, 0.1);
  border-radius: 14px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  animation: ${countUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 50ms);

  &:hover {
    border-color: rgba(${({ $accentRgb }) => $accentRgb}, 0.3);
    background: rgba(${({ $accentRgb }) => $accentRgb}, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(${({ $accentRgb }) => $accentRgb}, 0.12);
  }
  &:focus-visible {
    outline: 2px solid rgba(${({ $accentRgb }) => $accentRgb}, 0.7);
    outline-offset: 2px;
  }
  &:active { transform: translateY(0); }
`;

const ActionIconWrap = styled.span<{ $accentRgb: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  background: rgba(${({ $accentRgb }) => $accentRgb}, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(${({ $accentRgb }) => $accentRgb}, 1);
  border: 1px solid rgba(${({ $accentRgb }) => $accentRgb}, 0.15);
`;

const ActionLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

// ─── Constants ───────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  bronze: { label: 'Bronze Forge', color: '#CD7F32' },
  silver: { label: 'Silver Edge', color: '#C0C0C0' },
  gold:   { label: 'Titanium Core', color: '#878681' },
  platinum: { label: 'Obsidian Warrior', color: '#8B5CF6' },
  bronze_forge: { label: 'Bronze Forge', color: '#CD7F32' },
  silver_edge:  { label: 'Silver Edge', color: '#C0C0C0' },
  titanium_core: { label: 'Titanium Core', color: '#878681' },
  obsidian_warrior: { label: 'Obsidian Warrior', color: '#8B5CF6' },
  crystalline_swan: { label: 'Crystalline Swan', color: '#60C0F0' },
};

const QUICK_ACTIONS = [
  { label: 'Log Workout', Icon: Dumbbell, path: '/dashboard/client/log-workout', accentRgb: '96, 192, 240', i: 0 },
  { label: 'Book Session', Icon: Calendar, path: '/dashboard/client/schedule', accentRgb: '198, 168, 75', i: 1 },
  { label: 'View Progress', Icon: TrendingUp, path: '/dashboard/client/progress', accentRgb: '139, 92, 246', i: 2 },
  { label: 'Community', Icon: Users, path: '/dashboard/client/community', accentRgb: '64, 112, 192', i: 3 },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

const ClientHomeTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading } = useGamificationData();

  const p = profile.data;
  const level = p?.level ?? 1;
  const streakDays = p?.streakDays ?? 0;
  const nextLevelProgress = p?.nextLevelProgress ?? 0;
  const tier = p?.tier ?? 'bronze';
  const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS.bronze;
  const displayName = user?.firstName ?? user?.username ?? 'Athlete';

  return (
    <PageWrap>
      {/* ── Momentum Card ──────────────────────────────────── */}
      <MomentumCard aria-label="Your momentum summary">
        <MomentumTop>
          <StatPair>
            <Stat>
              <StatValue>
                <Flame size={18} color="var(--accent-gold, #C6A84B)" aria-hidden="true" />
                {isLoading ? '—' : `${streakDays}d`}
              </StatValue>
              <StatLabel>Streak</StatLabel>
            </Stat>
            <Stat>
              <StatValue>
                <Zap size={16} color="var(--accent-primary, #60C0F0)" aria-hidden="true" />
                {isLoading ? '—' : level}
              </StatValue>
              <StatLabel>Level</StatLabel>
            </Stat>
          </StatPair>
          {!isLoading && (
            <TierBadge $color={tierInfo.color} aria-label={`Tier: ${tierInfo.label}`}>
              {tierInfo.label}
            </TierBadge>
          )}
        </MomentumTop>

        <XpSection>
          <XpLabel>Lv.{level} → {level + 1}</XpLabel>
          <XpTrack role="progressbar" aria-label="XP progress to next level" aria-valuenow={nextLevelProgress} aria-valuemin={0} aria-valuemax={100}>
            <XpFill $pct={nextLevelProgress} />
          </XpTrack>
          <XpPct>{nextLevelProgress}%</XpPct>
        </XpSection>
      </MomentumCard>

      {/* ── Swan Coach Dock ────────────────────────────────── */}
      <SwanCoachDockClient
        userName={displayName}
        level={level}
        streakDays={streakDays}
        onNavigate={navigate}
      />

      {/* ── Next Session ───────────────────────────────────── */}
      {/* /api/schedule/upcoming does not exist yet — static CTA */}
      <NextSessionCard>
        <SessionInfo>
          <SessionLabel>Schedule</SessionLabel>
          <SessionValue>Book your next training session</SessionValue>
        </SessionInfo>
        <BookBtn
          onClick={() => navigate('/dashboard/client/schedule')}
          aria-label="Book a session"
        >
          <Calendar size={15} aria-hidden="true" />
          Book Session
        </BookBtn>
      </NextSessionCard>

      {/* ── Quick Actions ──────────────────────────────────── */}
      <SectionHeading>Quick Actions</SectionHeading>
      <QuickGrid>
        {QUICK_ACTIONS.map(({ label, Icon, path, accentRgb, i }) => (
          <ActionCard
            key={path}
            $accentRgb={accentRgb}
            style={{ '--i': i } as React.CSSProperties}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            <ActionIconWrap $accentRgb={accentRgb} aria-hidden="true">
              <Icon size={18} />
            </ActionIconWrap>
            <ActionLabel>{label}</ActionLabel>
          </ActionCard>
        ))}
      </QuickGrid>
    </PageWrap>
  );
};

export default ClientHomeTab;

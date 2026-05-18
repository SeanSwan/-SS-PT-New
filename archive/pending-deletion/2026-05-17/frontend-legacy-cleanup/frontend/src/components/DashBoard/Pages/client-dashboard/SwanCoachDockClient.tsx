/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: SwanCoachDockClient                              ║
 * ║  PURPOSE: Consent-aware Swan Coach dock for client HomeTab   ║
 * ║  OWNER: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-09        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * GATE MODEL: Consent-gated (not subscription-gated).
 *   All tiers can use Swan Coach after granting consent.
 *
 * STATES:
 *   loading  → skeleton placeholder
 *   none     → inline consent ask banner (grant / dismiss)
 *   granted  → full dock: greeting + 3 action chips
 *   withdrawn → paused state + resume button
 *
 * PRIVACY: userName displayed only client-side — never sent to any API.
 *
 * WIREFRAME:
 * ┌─────────────────────────────────────────┐
 * │ [Avatar]  "Good morning, Alex."         │
 * │           Streak: 14d  |  Level 12      │
 * │ [Log Workout] [View Progress] [Chat]    │
 * └─────────────────────────────────────────┘
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Brain, ShieldCheck, ShieldOff, Dumbbell,
  TrendingUp, MessageSquare, Shield, RefreshCw, AlertCircle,
} from 'lucide-react';
import { useAiConsent } from '../../../../hooks/useAiConsent';

// ─── Animations ─────────────────────────────────────────────────────────────

const coachPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(96, 192, 240, 0.08); }
  50% { box-shadow: 0 0 30px rgba(96, 192, 240, 0.18); }
`;

const shimmerAnim = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─── Styled Components ───────────────────────────────────────────────────────

const DockWrap = styled.div`
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 20px;
  padding: 1.25rem 1.5rem;
  animation: ${coachPulse} 5s ease-in-out infinite;

  @media (max-width: 414px) { padding: 1rem 1.125rem; border-radius: 16px; }
  @media (max-width: 375px) { padding: 0.875rem 1rem; }
`;

const DockSkeleton = styled.div`
  height: 108px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  background: linear-gradient(90deg,
    rgba(96, 192, 240, 0.04) 0%,
    rgba(96, 192, 240, 0.08) 50%,
    rgba(96, 192, 240, 0.04) 100%);
  background-size: 200% 100%;
  animation: ${shimmerAnim} 1.8s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0.5; }
`;

const CoachRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const CoachAvatar = styled.div`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg,
    var(--brand-primary, #002060),
    var(--accent-secondary, #8B5CF6));
  border: 1px solid rgba(96, 192, 240, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.2);
`;

const CoachTextBlock = styled.div`
  flex: 1;
  overflow: hidden;
`;

const CoachGreeting = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CoachMeta = styled.p`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  margin: 0;
  letter-spacing: 0.04em;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 0.625rem;
  flex-wrap: wrap;

  @media (max-width: 375px) { gap: 0.5rem; }
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  padding: 0.5rem 0.875rem;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(96, 192, 240, 0.06);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: rgba(96, 192, 240, 0.12);
    border-color: rgba(96, 192, 240, 0.4);
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.15);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
  @media (max-width: 375px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
  }
`;

// Consent ask banner
const ConsentBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
`;

const ConsentHeading = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConsentBody = styled.p`
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  margin: 0;
  line-height: 1.55;
`;

const ConsentActions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg,
    var(--brand-primary, #002060),
    var(--accent-secondary, #8B5CF6));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 16px rgba(139, 92, 246, 0.25);

  &:hover:not(:disabled) {
    box-shadow: 0 0 24px rgba(139, 92, 246, 0.4);
    transform: scale(1.02);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const GhostBtn = styled.button`
  min-height: 44px;
  padding: 0.625rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(224, 236, 244, 0.1);
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { border-color: rgba(224, 236, 244, 0.25); color: var(--text-secondary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

// Paused / withdrawn state
const PausedRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PausedText = styled.p`
  flex: 1;
  font-size: 0.875rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ErrorMsg = styled.p`
  font-size: 0.75rem;
  color: var(--danger, #C92A54);
  margin: 0.5rem 0 0;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${prefix}, ${name}.`;
}

const CHIPS = [
  { label: 'Log Workout', path: '/dashboard/client/log-workout', Icon: Dumbbell },
  { label: 'View Progress', path: '/dashboard/client/progress', Icon: TrendingUp },
  { label: 'Chat with Swan', path: '/dashboard/client/coach-assistant', Icon: MessageSquare },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

interface SwanCoachDockClientProps {
  /** Display name — rendered locally only, never sent to any API */
  userName: string;
  level: number;
  streakDays: number;
  onNavigate: (path: string) => void;
}

const SwanCoachDockClient: React.FC<SwanCoachDockClientProps> = ({
  userName, level, streakDays, onNavigate,
}) => {
  const { status, loading, actionLoading, error, grant } = useAiConsent();

  if (loading) {
    return <DockSkeleton aria-hidden="true" />;
  }

  if (status === 'granted') {
    return (
      <DockWrap role="region" aria-label="Swan Coach">
        <CoachRow>
          <CoachAvatar aria-hidden="true"><Brain size={20} /></CoachAvatar>
          <CoachTextBlock>
            <CoachGreeting>{getGreeting(userName)}</CoachGreeting>
            <CoachMeta>
              🔥 {streakDays}d streak &nbsp;·&nbsp; Lv.{level}
            </CoachMeta>
          </CoachTextBlock>
        </CoachRow>
        <ChipRow>
          {CHIPS.map(({ label, path, Icon }) => (
            <Chip key={path} onClick={() => onNavigate(path)} aria-label={label}>
              <Icon size={14} aria-hidden="true" />
              {label}
            </Chip>
          ))}
        </ChipRow>
        {error && <ErrorMsg>{error}</ErrorMsg>}
      </DockWrap>
    );
  }

  if (status === 'withdrawn') {
    return (
      <DockWrap role="region" aria-label="Swan Coach paused">
        <PausedRow>
          <PausedText>
            <ShieldOff size={16} aria-hidden="true" />
            Swan Coach is paused. Resume to get AI-guided training.
          </PausedText>
          <PrimaryBtn onClick={grant} disabled={actionLoading} aria-label="Resume Swan Coach">
            {actionLoading
              ? <><RefreshCw size={14} /> Enabling...</>
              : <><ShieldCheck size={14} /> Resume</>}
          </PrimaryBtn>
        </PausedRow>
        {error && <ErrorMsg>{error}</ErrorMsg>}
      </DockWrap>
    );
  }

  // status === 'none' — inline consent ask
  return (
    <DockWrap role="region" aria-label="Enable Swan Coach">
      <ConsentBanner>
        <ConsentHeading>
          <Shield size={16} color="var(--accent-primary, #60C0F0)" aria-hidden="true" />
          Swan Coach is ready for you
        </ConsentHeading>
        <ConsentBody>
          Enable AI-guided coaching to get personalized workouts, progress feedback,
          and training insights. Your identity stays private — de-identified data only.
        </ConsentBody>
        <ConsentActions>
          <PrimaryBtn onClick={grant} disabled={actionLoading} aria-label="Enable Swan Coach">
            {actionLoading
              ? <><RefreshCw size={14} /> Enabling...</>
              : <><ShieldCheck size={14} /> Enable Swan Coach</>}
          </PrimaryBtn>
          <GhostBtn
            onClick={() => onNavigate('/dashboard/client/ai-consent')}
            aria-label="Learn more about Swan Coach privacy"
          >
            Learn more
          </GhostBtn>
        </ConsentActions>
        {error && <ErrorMsg><AlertCircle size={12} style={{ marginRight: 4 }} />{error}</ErrorMsg>}
      </ConsentBanner>
    </DockWrap>
  );
};

export default SwanCoachDockClient;

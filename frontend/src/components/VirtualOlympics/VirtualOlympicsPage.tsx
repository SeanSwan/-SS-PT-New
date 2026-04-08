/**
 * ┌─── PAGE: VirtualOlympicsPage ─────────────────────────────────┐
 * │ PURPOSE: Ghost Racing competitive events — Pull-ups, Push-ups,│
 * │   Sprint. Users record performances and race against ghosts   │
 * │   of other users' best times/reps.                            │
 * │ CEO RULING: Async Ghost Racing, NOT real-time multiplayer.    │
 * │ BACKEND: /api/olympics/*                                       │
 * └───────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Trophy, Medal, Timer, Dumbbell, Zap, ChevronRight,
  Play, ArrowUp, Users, Star, TrendingUp, Loader,
  Heart,
} from 'lucide-react';

// ── Animations ──
const shine = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ── Styled Components ──
const Page = styled.div`
  min-height: 100%;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding-bottom: 40px;
`;

const HeroBanner = styled.div`
  padding: 32px 24px;
  background: linear-gradient(135deg, #0A0A0F, #002060 50%, #0A0A0F);
  background-size: 200% 100%;
  animation: ${shine} 8s ease-in-out infinite;
  border-bottom: 1px solid rgba(96, 192, 240, 0.15);
  text-align: center;
`;

const HeroTitle = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  @media (max-width: 640px) { font-size: 22px; }
`;

const HeroSub = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--accent-primary, #60C0F0);
  margin: 0;
`;

const Disclaimer = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  margin: 8px 0 0;
`;

const Content = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
`;

const SectionTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EventGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const EventCard = styled.div<{ $active: boolean }>`
  padding: 20px;
  border-radius: 14px;
  background: var(--bg-elevated, #141419);
  border: 2px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'rgba(96, 192, 240, 0.1)'};
  cursor: pointer;
  transition: all 0.15s;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const EventHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const EventName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EventMetric = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const StatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatVal = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
`;

const NoBestYet = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.4);
  font-style: italic;
`;

// ── Submission Panel ──
const SubmitPanel = styled.div`
  padding: 24px;
  border-radius: 14px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.15);
  margin-bottom: 32px;
`;

const SubmitTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InputGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const InputLabel = styled.label`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  display: block;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(10, 10, 15, 0.6);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  min-height: 44px;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: var(--accent-primary, #60C0F0); }
`;

const SubmitBtn = styled.button`
  min-height: 44px;
  padding: 12px 28px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #002060, #8B5CF6);
  color: #E0ECF4;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.15s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ResultBanner = styled.div<{ $pb: boolean }>`
  padding: 16px 20px;
  border-radius: 10px;
  background: ${({ $pb }) => $pb ? 'rgba(198, 168, 75, 0.1)' : 'rgba(96, 192, 240, 0.06)'};
  border: 1px solid ${({ $pb }) => $pb ? 'rgba(198, 168, 75, 0.3)' : 'rgba(96, 192, 240, 0.15)'};
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ResultText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

const XPBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #C6A84B;
`;

// ── Leaderboard ──
const LeaderboardTable = styled.div`
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(96, 192, 240, 0.1);
  margin-bottom: 32px;
`;

const LBRow = styled.div<{ $isUser?: boolean; $rank: number }>`
  display: grid;
  grid-template-columns: 50px 1fr 120px;
  align-items: center;
  padding: 12px 16px;
  background: ${({ $isUser, $rank }) =>
    $isUser ? 'rgba(96, 192, 240, 0.08)' :
    $rank <= 3 ? 'rgba(198, 168, 75, 0.04)' :
    'var(--bg-elevated, #141419)'};
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
  min-height: 44px;

  &:last-child { border-bottom: none; }
`;

const Rank = styled.div<{ $rank: number }>`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: ${({ $rank }) =>
    $rank === 1 ? '#C6A84B' :
    $rank === 2 ? '#A0A0B0' :
    $rank === 3 ? '#CD7F32' :
    'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
`;

const AthleteName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
`;

const Score = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  text-align: right;
`;

const LBHeader = styled(LBRow)`
  background: rgba(0, 32, 96, 0.3);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  min-height: 36px;
  padding: 8px 16px;
`;

// ── Recovery Day ──
const RecoveryCard = styled.div`
  padding: 20px;
  border-radius: 14px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(139, 92, 246, 0.2);
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 480px) {
    flex-direction: column;
    text-align: center;
  }
`;

const RecoveryInfo = styled.div`
  flex: 1;
`;

const RecoveryTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RecoveryDesc = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  margin: 0;
`;

const RecoveryBtn = styled.button`
  min-height: 44px;
  padding: 10px 24px;
  border-radius: 10px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.1);
  color: #8B5CF6;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover { background: rgba(139, 92, 246, 0.18); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const LoadingCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif;
  gap: 8px;
`;

// ── Types ──
interface EventInfo {
  eventType: string;
  label: string;
  metric: string;
  userBest: { score: number; date: string } | null;
  totalAttempts: number;
  totalParticipants: number;
}

interface LeaderboardEntry {
  rank: number;
  athleteId: number;
  athleteName: string;
  score: number;
  date: string;
}

interface SubmitResult {
  isPersonalBest: boolean;
  xpAwarded: number;
  rank: number;
  score: number;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  pullups: <Dumbbell size={18} />,
  pushups: <ArrowUp size={18} />,
  sprint: <Timer size={18} />,
};

const VirtualOlympicsPage: React.FC = () => {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [activeEvent, setActiveEvent] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [score, setScore] = useState('');
  const [duration, setDuration] = useState('');
  const [recoveryDone, setRecoveryDone] = useState(false);

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/olympics/events', { headers });
      const d = await res.json();
      if (d.success) {
        setEvents(d.data);
        if (!activeEvent && d.data.length > 0) setActiveEvent(d.data[0].eventType);
      }
    } catch { /* best-effort */ }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLeaderboard = useCallback(async (eventType: string) => {
    try {
      const res = await fetch(`/api/olympics/leaderboard/${eventType}?limit=20`, { headers });
      const d = await res.json();
      if (d.success) {
        setLeaderboard(d.data.leaderboard);
        setUserRank(d.data.userRank);
      }
    } catch { /* best-effort */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { if (activeEvent) fetchLeaderboard(activeEvent); }, [activeEvent, fetchLeaderboard]);

  const handleSubmit = async () => {
    const s = parseFloat(score);
    const d = parseInt(duration);
    if (!s || s <= 0 || !d || d <= 0 || !activeEvent) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/olympics/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ eventType: activeEvent, score: s, duration: d }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult(data.data);
        setScore('');
        setDuration('');
        fetchEvents();
        fetchLeaderboard(activeEvent);
      }
    } catch { /* best-effort */ }
    setSubmitting(false);
  };

  // Check if recovery day was already logged today
  const checkRecoveryStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/olympics/recovery-status', { headers });
      const d = await res.json();
      if (d.success && d.data?.doneToday) setRecoveryDone(true);
    } catch { /* best-effort */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { checkRecoveryStatus(); }, [checkRecoveryStatus]);

  const handleRecoveryDay = async () => {
    // Already checked on mount; button should be disabled if done
    if (recoveryDone) return;
    try {
      const res = await fetch('/api/olympics/recovery-day', { method: 'POST', headers });
      const d = await res.json();
      if (d.success || res.status === 409) setRecoveryDone(true);
    } catch { /* best-effort */ }
  };

  if (loading) {
    return (
      <Page>
        <LoadingCenter>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading Olympics...
        </LoadingCenter>
      </Page>
    );
  }

  const activeEventInfo = events.find(e => e.eventType === activeEvent);
  const isSprintEvent = activeEvent === 'sprint';

  return (
    <Page>
      <HeroBanner>
        <HeroTitle><Trophy size={28} /> Virtual Olympics</HeroTitle>
        <HeroSub>Ghost Racing — compete against the best performances</HeroSub>
        <Disclaimer>This is a fitness game, not a medical assessment.</Disclaimer>
      </HeroBanner>

      <Content>
        {/* Events */}
        <SectionTitle><Medal size={18} /> Events</SectionTitle>
        <EventGrid>
          {events.map(ev => (
            <EventCard
              key={ev.eventType}
              $active={activeEvent === ev.eventType}
              onClick={() => { setActiveEvent(ev.eventType); setSubmitResult(null); }}
            >
              <EventHeader>
                <EventName>{EVENT_ICONS[ev.eventType]} {ev.label}</EventName>
                <EventMetric>{ev.metric}</EventMetric>
              </EventHeader>
              <StatRow>
                <StatLabel><Star size={12} /> Your Best</StatLabel>
                {ev.userBest ? <StatVal>{ev.userBest.score}{ev.eventType === 'sprint' ? 's' : ' reps'}</StatVal> : <NoBestYet>Not yet</NoBestYet>}
              </StatRow>
              <StatRow>
                <StatLabel><Play size={12} /> Attempts</StatLabel>
                <StatVal>{ev.totalAttempts}</StatVal>
              </StatRow>
              <StatRow>
                <StatLabel><Users size={12} /> Athletes</StatLabel>
                <StatVal>{ev.totalParticipants}</StatVal>
              </StatRow>
            </EventCard>
          ))}
        </EventGrid>

        {/* Submit Performance */}
        {activeEventInfo && (
          <SubmitPanel>
            <SubmitTitle>
              <Play size={16} /> Record {activeEventInfo.label} Performance
            </SubmitTitle>
            <InputGroup>
              <div>
                <InputLabel>{isSprintEvent ? 'Time (seconds)' : 'Reps Completed'}</InputLabel>
                <Input
                  type="number"
                  min="1"
                  step={isSprintEvent ? '0.1' : '1'}
                  placeholder={isSprintEvent ? 'e.g. 12.5' : 'e.g. 25'}
                  value={score}
                  onChange={e => setScore(e.target.value)}
                />
              </div>
              <div>
                <InputLabel>Duration (seconds)</InputLabel>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 60"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                />
              </div>
            </InputGroup>
            <SubmitBtn onClick={handleSubmit} disabled={submitting || !score || !duration}>
              <TrendingUp size={16} />
              {submitting ? 'Submitting...' : 'Submit Performance'}
            </SubmitBtn>

            {submitResult && (
              <ResultBanner $pb={submitResult.isPersonalBest}>
                {submitResult.isPersonalBest ? <Trophy size={20} style={{ color: '#C6A84B' }} /> : <Medal size={20} />}
                <ResultText>
                  {submitResult.isPersonalBest ? 'New Personal Best! ' : 'Performance recorded. '}
                  Rank #{submitResult.rank}.{' '}
                  <XPBadge>+{submitResult.xpAwarded} XP</XPBadge>
                </ResultText>
              </ResultBanner>
            )}
          </SubmitPanel>
        )}

        {/* Leaderboard */}
        <SectionTitle><Trophy size={18} /> {activeEventInfo?.label || ''} Leaderboard</SectionTitle>
        {leaderboard.length === 0 ? (
          <StatLabel style={{ marginBottom: 32 }}>No performances yet — be the first!</StatLabel>
        ) : (
          <LeaderboardTable>
            <LBHeader as="div" $rank={0}>
              <div>#</div>
              <div>Athlete</div>
              <div style={{ textAlign: 'right' }}>Score</div>
            </LBHeader>
            {leaderboard.map(entry => (
              <LBRow key={`${entry.rank}-${entry.athleteId}`} $rank={entry.rank}>
                <Rank $rank={entry.rank}>
                  {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                </Rank>
                <AthleteName>{entry.athleteName}</AthleteName>
                <Score>
                  {entry.score}{activeEvent === 'sprint' ? 's' : ' reps'}
                </Score>
              </LBRow>
            ))}
          </LeaderboardTable>
        )}
        {userRank && (
          <StatLabel style={{ marginBottom: 32 }}>
            <Zap size={12} /> Your rank: #{userRank}
          </StatLabel>
        )}

        {/* Recovery Day */}
        <SectionTitle><Heart size={18} /> Recovery Day</SectionTitle>
        <RecoveryCard>
          <RecoveryInfo>
            <RecoveryTitle><Zap size={16} /> Wisdom XP</RecoveryTitle>
            <RecoveryDesc>
              Rest days are training days. Complete a recovery routine to earn Wisdom XP — your body rewards smart decisions, not just volume.
            </RecoveryDesc>
          </RecoveryInfo>
          <RecoveryBtn onClick={handleRecoveryDay} disabled={recoveryDone}>
            {recoveryDone ? 'Done Today ✓' : 'Log Recovery Day'}
          </RecoveryBtn>
        </RecoveryCard>
      </Content>
    </Page>
  );
};

export default VirtualOlympicsPage;

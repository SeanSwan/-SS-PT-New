/**
 * COMPONENT: ProofCard
 * PURPOSE: S2 Proof Card (MEGA-BLUEPRINT.md §4.4). A chrome-edge card built from the
 *          member's OWN logged workout session — the "real data only" rule made visible.
 *
 * WHAT IT DOES: loads GET /api/social/proof-card/:sessionId, renders the session's real
 * metrics, compares this session's sets against the member's own 30-day baseline
 * (Victory mini-bar), and offers two actions: native share (image via html2canvas, with
 * a graceful text fallback) and "Post to feed" through the EXISTING POST /api/social/posts
 * route — no new write path, no new table.
 *
 * PRIVACY: own-stats only. The endpoint 404s on another member's session, so this
 * component never receives — and never renders — another user's data (rule 8).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Share2, Send, TrendingUp } from 'lucide-react';
import { VictoryAxis, VictoryBar, VictoryChart } from 'victory';
import { useAuth } from '../../../../context/AuthContext';
import {
  ActionRow,
  ChartCaption,
  ChartFrame,
  ErrorLine,
  ExportSurface,
  ProofButton,
  ProofCardShell,
  ProofKicker,
  ProofMeta,
  ProofTitle,
  StatCell,
  StatLabel,
  StatStrip,
  StatValue,
  StatusLine,
} from './ProofCard.styles';

export interface ProofCardBaseline {
  windowDays: number;
  sampleSize: number;
  avgSets: number;
  avgVolume: number;
}

export interface ProofCardData {
  sessionId: string;
  memberDisplayName: string;
  workoutName: string;
  date: string;
  durationMin: number;
  totalVolume: number;
  totalReps: number;
  setsCount: number;
  xpEarned: number;
  streakDays: number;
  baseline: ProofCardBaseline;
}

interface ProofCardProps {
  sessionId: string;
  onPosted?: () => void;
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(Math.round(value));

const buildCaption = (card: ProofCardData) =>
  `${card.workoutName} — ${formatNumber(card.totalVolume)} lb moved across ${formatNumber(card.setsCount)} sets.`;

const ProofCard: React.FC<ProofCardProps> = ({ sessionId, onPosted }) => {
  const { authAxios } = useAuth();
  const [card, setCard] = useState<ProofCardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'share' | 'post' | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authAxios.get(`/api/social/proof-card/${encodeURIComponent(sessionId)}`);
        if (!cancelled) setCard(res.data?.proofCard ?? null);
      } catch (error: any) {
        if (cancelled) return;
        const code = error?.response?.status;
        setLoadError(
          code === 409
            ? 'Only completed workouts have a proof card.'
            : 'We could not load that proof card.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authAxios, sessionId]);

  const handleShare = useCallback(async () => {
    if (!card || busy) return;
    setBusy('share');
    setStatus(null);
    try {
      // Export an image when the platform can share files; otherwise share text.
      let files: File[] | undefined;
      const nav = navigator as Navigator & { canShare?: (data: unknown) => boolean };
      if (exportRef.current && typeof nav.canShare === 'function') {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(exportRef.current, { backgroundColor: '#030712' });
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const file = new File([blob], `proof-${card.sessionId}.png`, { type: 'image/png' });
          if (nav.canShare({ files: [file] })) files = [file];
        }
      }

      if (typeof nav.share === 'function') {
        await nav.share({
          title: card.workoutName,
          text: buildCaption(card),
          ...(files ? { files } : {}),
        });
        setStatus('Shared.');
      } else {
        await navigator.clipboard.writeText(buildCaption(card));
        setStatus('Caption copied to your clipboard.');
      }
    } catch (error: any) {
      // A user-cancelled share sheet is not a failure worth shouting about.
      if (error?.name !== 'AbortError') setStatus('Sharing did not complete — try again.');
    } finally {
      setBusy(null);
    }
  }, [busy, card]);

  const handlePost = useCallback(async () => {
    if (!card || busy) return;
    setBusy('post');
    setStatus(null);
    try {
      await authAxios.post('/api/social/posts', {
        content: buildCaption(card),
        type: 'workout',
        workoutSessionId: card.sessionId,
      });
      setStatus('Posted to your feed.');
      onPosted?.();
    } catch {
      setStatus('That post did not go through — give it another tap.');
    } finally {
      setBusy(null);
    }
  }, [busy, card, onPosted]);

  if (loadError) {
    return (
      <ProofCardShell aria-label="Workout proof card">
        <ErrorLine role="status">{loadError}</ErrorLine>
      </ProofCardShell>
    );
  }

  if (!card) {
    return (
      <ProofCardShell aria-label="Workout proof card">
        <StatusLine>Building your proof card…</StatusLine>
      </ProofCardShell>
    );
  }

  const setsDelta = card.baseline.avgSets > 0 ? card.setsCount - card.baseline.avgSets : 0;
  const comparison = [
    { label: 'This session', sets: card.setsCount },
    { label: `${card.baseline.windowDays}-day avg`, sets: card.baseline.avgSets },
  ];

  return (
    <ProofCardShell aria-label="Workout proof card" data-testid="proof-card">
      <ProofKicker>
        <TrendingUp size={13} /> Proof of work
      </ProofKicker>
      <ProofTitle>{card.workoutName}</ProofTitle>
      <ProofMeta>
        {card.memberDisplayName} · {card.date}
      </ProofMeta>

      <StatStrip data-testid="proof-card-stats">
        <StatCell>
          <StatLabel>Volume</StatLabel>
          <StatValue>{formatNumber(card.totalVolume)}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>Sets</StatLabel>
          <StatValue>{formatNumber(card.setsCount)}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>Reps</StatLabel>
          <StatValue>{formatNumber(card.totalReps)}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>Minutes</StatLabel>
          <StatValue>{formatNumber(card.durationMin)}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>Streak</StatLabel>
          <StatValue>{formatNumber(card.streakDays)}</StatValue>
        </StatCell>
        <StatCell>
          <StatLabel>XP</StatLabel>
          <StatValue>{formatNumber(card.xpEarned)}</StatValue>
        </StatCell>
      </StatStrip>

      {card.baseline.sampleSize > 0 ? (
        <ChartFrame data-testid="proof-card-chart">
          <VictoryChart
            height={110}
            width={340}
            domainPadding={{ x: 40 }}
            padding={{ top: 8, bottom: 28, left: 8, right: 8 }}
          >
            <VictoryAxis
              style={{ tickLabels: { fill: '#E0ECF4', fontSize: 10 }, axis: { stroke: 'transparent' } }}
            />
            <VictoryBar
              data={comparison}
              x="label"
              y="sets"
              style={{ data: { fill: '#60C0F0' } }}
              cornerRadius={{ top: 4 }}
            />
          </VictoryChart>
          <ChartCaption>
            Sets vs your own {card.baseline.windowDays}-day average
            {setsDelta === 0
              ? ' — right on your usual.'
              : setsDelta > 0
                ? ` — ${setsDelta.toFixed(1)} above your usual.`
                : ` — ${Math.abs(setsDelta).toFixed(1)} below your usual.`}
          </ChartCaption>
        </ChartFrame>
      ) : (
        <ChartCaption>Log a few more sessions and we&apos;ll compare this against your usual.</ChartCaption>
      )}

      <ActionRow>
        <ProofButton
          type="button"
          $primary
          onClick={handleShare}
          disabled={busy !== null}
          aria-label="Share this proof card"
        >
          <Share2 size={15} />
          {busy === 'share' ? 'Preparing…' : 'Share'}
        </ProofButton>
        <ProofButton
          type="button"
          onClick={handlePost}
          disabled={busy !== null}
          aria-label="Post this proof card to your feed"
        >
          <Send size={15} />
          {busy === 'post' ? 'Posting…' : 'Post to feed'}
        </ProofButton>
      </ActionRow>

      {status ? <StatusLine role="status">{status}</StatusLine> : null}

      {/* Off-screen capture node — literal colors so the PNG survives outside the cascade. */}
      <ExportSurface ref={exportRef} aria-hidden="true">
        <p className="export-kicker">Proof of work</p>
        <p className="export-title">{card.workoutName}</p>
        <div className="export-row">
          <span>Volume</span>
          <span>{formatNumber(card.totalVolume)} lb</span>
        </div>
        <div className="export-row">
          <span>Sets</span>
          <span>{formatNumber(card.setsCount)}</span>
        </div>
        <div className="export-row">
          <span>Reps</span>
          <span>{formatNumber(card.totalReps)}</span>
        </div>
        <div className="export-row">
          <span>Duration</span>
          <span>{formatNumber(card.durationMin)} min</span>
        </div>
        <p className="export-foot">
          {card.streakDays > 0 ? `${card.streakDays}-day streak · ` : ''}
          {card.memberDisplayName}
        </p>
      </ExportSurface>
    </ProofCardShell>
  );
};

export default ProofCard;

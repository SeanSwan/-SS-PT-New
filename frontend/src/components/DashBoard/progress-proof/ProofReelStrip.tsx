/**
 * COMPONENT: ProofReelStrip
 * PURPOSE: A swipeable "reel" of the client's REAL proof moments (proof level, personal
 *   record, biggest gain) — the celebratory, community-trophy format the progress deck
 *   feeds into. Each slide can be shared as a truthful text caption.
 * DATA POLICY: every slide is a genuine fact (proofReel core); renders nothing when there's
 *   nothing real to celebrate. NOT an AI-generated video — a rendered video export is a
 *   future backend hook, deliberately not faked here (Rule 74/75).
 * A11Y/MOTION: no autoplay — the user swipes/scrolls (reduced-motion-safe by construction);
 *   scroll-snap only. Share button is a real 44px+ target with a focus ring and a polite
 *   live-region confirmation. All color via --token,#fallback (Rule 6).
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Award, Share2, Sparkles, TrendingUp } from 'lucide-react';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';
import { buildProofReel, type ProofReelKind, type ProofReelSlide } from './proofReel';

interface Props {
  charts: CanonicalProgressCharts;
  nonEmptyChartCount: number;
}

const kindTint: Record<ProofReelKind, string> = {
  level: 'var(--accent-primary, #60C0F0)',
  pr: 'var(--accent-gold, #C6A84B)',
  gain: 'var(--success, #34D399)',
};

const KindIcon: Record<ProofReelKind, typeof Award> = { level: Sparkles, pr: Award, gain: TrendingUp };
const KindBadge: Record<ProofReelKind, string> = { level: 'Proof', pr: 'Record', gain: 'Gain' };

const Panel = styled.section`
  margin: 1rem 0;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent);
  background:
    radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent), transparent 46%),
    var(--bg-elevated, #141419);
`;

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-primary, #E0ECF4);
  font: 800 0.9rem/1.2 'Sora', sans-serif;
  svg { color: var(--accent-gold, #C6A84B); flex: 0 0 auto; }
`;

const Count = styled.span`
  margin-left: auto;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 700 0.66rem/1 'Sora', sans-serif;
`;

const Micro = styled.p`
  margin: 0.25rem 0 0.7rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 56%, transparent));
  font: 650 0.66rem/1.4 'Sora', sans-serif;
`;

const Track = styled.ul`
  display: flex;
  gap: 0.7rem;
  margin: 0;
  padding: 0 0 0.4rem;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
`;

const Slide = styled.li<{ $tint: string }>`
  scroll-snap-align: start;
  flex: 0 0 min(15rem, 78%);
  display: grid;
  gap: 0.4rem;
  align-content: start;
  padding: 0.9rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, ${({ $tint }) => $tint} 40%, transparent);
  background:
    radial-gradient(circle at 100% 0%, color-mix(in srgb, ${({ $tint }) => $tint} 16%, transparent), transparent 55%),
    var(--surface-graphite, #1A1A24);
`;

const Badge = styled.span<{ $tint: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: ${({ $tint }) => $tint};
  font: 800 0.6rem/1 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  svg { flex: 0 0 auto; }
`;

const Headline = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 800 1.02rem/1.15 'Sora', sans-serif;
`;

const Detail = styled.p`
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 80%, transparent));
  font: 650 0.76rem/1.35 'Fira Code', monospace;
`;

const ShareBtn = styled.button`
  margin-top: 0.2rem;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.9rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 700 0.72rem/1 'Sora', sans-serif;
  cursor: pointer;
  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

const Live = styled.p`
  margin: 0.5rem 0 0;
  min-height: 1em;
  color: var(--success, #34D399);
  font: 700 0.66rem/1 'Sora', sans-serif;
`;

const ProofReelStrip: React.FC<Props> = ({ charts, nonEmptyChartCount }) => {
  const slides = useMemo(() => buildProofReel(charts, nonEmptyChartCount), [charts, nonEmptyChartCount]);
  const [note, setNote] = useState('');

  if (slides.length === 0) return null;

  const share = async (slide: ProofReelSlide) => {
    const caption = slide.shareCaption;
    if (!caption) { setNote('Nothing to share yet'); return; }
    try {
      const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
      if (typeof nav.share === 'function') {
        await nav.share({ text: caption });
        setNote('Shared');
      } else if (nav.clipboard && typeof nav.clipboard.writeText === 'function') {
        await nav.clipboard.writeText(caption);
        setNote('Copied to clipboard');
      } else {
        setNote('Sharing not available on this device');
      }
    } catch {
      setNote('Share cancelled');
    }
  };

  return (
    <Panel data-testid="proof-reel-strip" aria-label="Your proof reel">
      <Head>
        <Sparkles size={16} aria-hidden="true" />
        Proof reel
        <Count>{slides.length} {slides.length === 1 ? 'moment' : 'moments'}</Count>
      </Head>
      <Micro>Your real wins from verified logs — swipe through, and share the ones you're proud of.</Micro>
      <Track>
        {slides.map((s) => {
          const tint = kindTint[s.kind];
          const Icon = KindIcon[s.kind];
          return (
            <Slide key={s.key} $tint={tint}>
              <Badge $tint={tint}><Icon size={12} aria-hidden="true" />{KindBadge[s.kind]}</Badge>
              <Headline>{s.headline}</Headline>
              <Detail>{s.detail}</Detail>
              <ShareBtn type="button" onClick={() => share(s)} aria-label={`Share: ${s.headline}, ${s.detail}`}>
                <Share2 size={14} aria-hidden="true" />Share
              </ShareBtn>
            </Slide>
          );
        })}
      </Track>
      <Live role="status" aria-live="polite">{note}</Live>
    </Panel>
  );
};

export default React.memo(ProofReelStrip);

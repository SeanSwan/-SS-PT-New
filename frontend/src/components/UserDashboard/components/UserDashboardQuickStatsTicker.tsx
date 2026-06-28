import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Pause, Play, RadioTower, type LucideIcon } from 'lucide-react';
import {
  SlideDot,
  SlideDots,
  SponsorBody,
  SponsorCard,
  SponsorCopy,
  SponsorLabel,
  SponsorLink,
  SponsorMediaImage,
  SponsorMediaVideo,
  SponsorTitle,
  TickerCounter,
  TickerControlButton,
  TickerFooterControls,
  TickerGrid,
  TickerHeader,
  TickerIconWrap,
  TickerShell,
  TickerStatCaption,
  TickerStatCard,
  TickerStatLabel,
  TickerStatValue,
  TickerTitle,
  TickerViewport,
} from './UserDashboardQuickStatsTicker.styles';

export interface QuickStatsTickerStat {
  id: string;
  label: string;
  value: string;
  caption?: string;
  Icon?: LucideIcon;
}

export interface QuickStatsSponsorSpot {
  label: string;
  title: string;
  body: string;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  href?: string;
  ctaLabel?: string;
}

interface UserDashboardQuickStatsTickerProps {
  stats: QuickStatsTickerStat[];
  rotateMs?: number;
  sponsorSpot?: QuickStatsSponsorSpot | null;
  showHeader?: boolean;
}

type TickerSlide =
  | { kind: 'stats'; stats: QuickStatsTickerStat[] }
  | { kind: 'sponsor'; sponsor: QuickStatsSponsorSpot };

const chunkStats = (stats: QuickStatsTickerStat[]): QuickStatsTickerStat[][] => {
  const chunks: QuickStatsTickerStat[][] = [];
  for (let index = 0; index < stats.length; index += 3) {
    chunks.push(stats.slice(index, index + 3));
  }
  return chunks;
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const toSafeHttpUrl = (value?: string): string | undefined => {
  if (!value || value.trim() === '') return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
};

const isDirectVideoUrl = (value: string): boolean => /\.(mp4|webm|ogg)$/i.test(new URL(value).pathname);

const sanitizeSponsorSpot = (sponsor: QuickStatsSponsorSpot | null): QuickStatsSponsorSpot | null => {
  if (!sponsor) return null;
  const href = toSafeHttpUrl(sponsor.href);
  const candidateMediaType = sponsor.mediaType === 'video' || sponsor.mediaType === 'image'
    ? sponsor.mediaType
    : undefined;
  const candidateMediaUrl = toSafeHttpUrl(sponsor.mediaUrl);
  const mediaUrl = candidateMediaType === 'video'
    ? (candidateMediaUrl && isDirectVideoUrl(candidateMediaUrl) ? candidateMediaUrl : undefined)
    : candidateMediaType === 'image'
      ? candidateMediaUrl
      : undefined;

  return {
    ...sponsor,
    href,
    mediaType: mediaUrl ? candidateMediaType : undefined,
    mediaUrl,
  };
};

const SponsorSlide = ({ sponsor }: { sponsor: QuickStatsSponsorSpot }) => (
  <SponsorCard aria-label={`${sponsor.label} sponsor spot`}>
    <SponsorCopy>
      <SponsorLabel>{sponsor.label}</SponsorLabel>
      <SponsorTitle>{sponsor.title}</SponsorTitle>
      <SponsorBody>{sponsor.body}</SponsorBody>
      {sponsor.href && sponsor.ctaLabel && (
        <SponsorLink href={sponsor.href} target="_blank" rel="noopener noreferrer">
          {sponsor.ctaLabel}
          <ExternalLink size={14} aria-hidden="true" />
        </SponsorLink>
      )}
    </SponsorCopy>
    {sponsor.mediaUrl && sponsor.mediaType === 'video' && (
      <SponsorMediaVideo
        data-testid="quick-stats-sponsor-video"
        src={sponsor.mediaUrl}
        muted
        playsInline
        controls
        preload="metadata"
      />
    )}
    {sponsor.mediaUrl && sponsor.mediaType !== 'video' && (
      <SponsorMediaImage src={sponsor.mediaUrl} alt={`${sponsor.title} sponsor media`} loading="lazy" />
    )}
  </SponsorCard>
);

const StatsSlide = ({ stats }: { stats: QuickStatsTickerStat[] }) => (
  <TickerGrid>
    {stats.map(({ id, label, value, caption, Icon }) => (
      <TickerStatCard key={id}>
        <TickerStatLabel>
          {Icon && (
            <TickerIconWrap>
              <Icon size={15} aria-hidden="true" />
            </TickerIconWrap>
          )}
          {label}
        </TickerStatLabel>
        <TickerStatValue>{value}</TickerStatValue>
        {caption && <TickerStatCaption>{caption}</TickerStatCaption>}
      </TickerStatCard>
    ))}
  </TickerGrid>
);

const UserDashboardQuickStatsTicker: React.FC<UserDashboardQuickStatsTickerProps> = ({
  stats,
  rotateMs = 5000,
  sponsorSpot = null,
  showHeader = true,
}) => {
  const safeSponsorSpot = useMemo(() => sanitizeSponsorSpot(sponsorSpot), [sponsorSpot]);
  const slides = useMemo<TickerSlide[]>(() => {
    const statSlides = chunkStats(stats).map<TickerSlide>((group) => ({ kind: 'stats', stats: group }));
    return safeSponsorSpot ? [...statSlides, { kind: 'sponsor', sponsor: safeSponsorSpot }] : statSlides;
  }, [safeSponsorSpot, stats]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [motionReduced] = useState(prefersReducedMotion);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setSlideIndex(0);
  }, [slides.length]);

  const canAutoRotate = slides.length > 1 && rotateMs > 0 && !motionReduced;

  useEffect(() => {
    if (!canAutoRotate || isPaused) return undefined;
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length);
    }, rotateMs);
    return () => window.clearInterval(timer);
  }, [canAutoRotate, isPaused, rotateMs, slides.length]);

  if (slides.length === 0) return null;

  const activeSlide = slides[Math.min(slideIndex, slides.length - 1)];
  const PauseIcon = isPaused ? Play : Pause;
  const pauseLabel = isPaused ? 'Resume quick stats ticker' : 'Pause quick stats ticker';

  return (
    <TickerShell aria-label="Quick stats ticker">
      {showHeader && (
        <TickerHeader>
          <TickerTitle>
            <RadioTower size={15} aria-hidden="true" />
            Quick Stats Signal
          </TickerTitle>
          <TickerCounter>{slideIndex + 1}/{slides.length}</TickerCounter>
        </TickerHeader>
      )}
      <TickerViewport>
        {activeSlide.kind === 'stats'
          ? <StatsSlide stats={activeSlide.stats} />
          : <SponsorSlide sponsor={activeSlide.sponsor} />}
      </TickerViewport>
      {slides.length > 1 && (
        <TickerFooterControls>
          <SlideDots aria-hidden="true">
            {slides.map((slide, index) => (
              <SlideDot key={`${slide.kind}-${index}`} $active={index === slideIndex} />
            ))}
          </SlideDots>
          {canAutoRotate && (
            <TickerControlButton
              type="button"
              aria-label={pauseLabel}
              aria-pressed={isPaused}
              title={pauseLabel}
              onClick={() => setIsPaused((current) => !current)}
            >
              <PauseIcon size={16} aria-hidden="true" />
            </TickerControlButton>
          )}
        </TickerFooterControls>
      )}
    </TickerShell>
  );
};

export default React.memo(UserDashboardQuickStatsTicker);
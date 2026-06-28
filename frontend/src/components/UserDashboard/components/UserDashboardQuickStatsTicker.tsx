import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, RadioTower, type LucideIcon } from 'lucide-react';
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

const SponsorSlide = ({ sponsor }: { sponsor: QuickStatsSponsorSpot }) => (
  <SponsorCard aria-label={`${sponsor.label} sponsor spot`}>
    <SponsorCopy>
      <SponsorLabel>{sponsor.label}</SponsorLabel>
      <SponsorTitle>{sponsor.title}</SponsorTitle>
      <SponsorBody>{sponsor.body}</SponsorBody>
      {sponsor.href && sponsor.ctaLabel && (
        <SponsorLink href={sponsor.href} target="_blank" rel="noreferrer">
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
      <SponsorMediaImage src={sponsor.mediaUrl} alt="" loading="lazy" />
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
  const slides = useMemo<TickerSlide[]>(() => {
    const statSlides = chunkStats(stats).map<TickerSlide>((group) => ({ kind: 'stats', stats: group }));
    return sponsorSpot ? [...statSlides, { kind: 'sponsor', sponsor: sponsorSpot }] : statSlides;
  }, [sponsorSpot, stats]);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    setSlideIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || rotateMs <= 0 || prefersReducedMotion()) return undefined;
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length);
    }, rotateMs);
    return () => window.clearInterval(timer);
  }, [rotateMs, slides.length]);

  if (slides.length === 0) return null;

  const activeSlide = slides[Math.min(slideIndex, slides.length - 1)];

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
        <SlideDots aria-hidden="true">
          {slides.map((slide, index) => (
            <SlideDot key={`${slide.kind}-${index}`} $active={index === slideIndex} />
          ))}
        </SlideDots>
      )}
    </TickerShell>
  );
};

export default React.memo(UserDashboardQuickStatsTicker);
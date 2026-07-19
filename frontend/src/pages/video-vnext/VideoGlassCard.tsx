/**
 * Video V-next — VideoGlassCard (Kimi (d): "refraction = access"). The material is SEMANTIC:
 *  · LOCKED  → diffuse/frosted glass — desaturated thumbnail under a milk-glass layer, ZERO dispersion +
 *    a lock chip. "Clarity is earned."
 *  · UNLOCKED → clear glass; the cool spectral fringe (ice→white→one purple) appears ONLY on hover/focus
 *    (and press on touch) — a reward, not wallpaper (loudness budget). Opacity-capped, transform/opacity only.
 * Glass is FAKED (layered gradients + 1px chrome edge + inner highlight) — NO live backdrop-filter (perf).
 * ONE stretched link (the whole card → watch; the watch page owns the gate) — no button-in-anchor. 16:9
 * thumbnail, solid duration chip (never text-on-image). Fringe def is shared at the grid level (one <defs>).
 */
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import type { VideoItem } from '../VideoLibraryV3.types';
import { formatDuration, getVideoWatchPath } from '../VideoLibraryV3.logic';

const Card = styled.article<{ $locked: boolean }>`
  position: relative;
  border-radius: var(--video-r-card, 16px);
  padding: 1px; /* chrome edge */
  background: linear-gradient(160deg, var(--video-chrome), var(--video-ice-14) 44%, transparent 72%);
  transition: transform 200ms var(--video-ease-standard), box-shadow 200ms var(--video-ease-standard);
  &:hover,
  &:focus-within {
    transform: translateY(-3px);
    box-shadow: var(--video-elev-2);
  }
`;
const Clip = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: calc(var(--video-r-card, 16px) - 1px);
  background: linear-gradient(165deg, var(--video-card-hi), var(--video-card-lo));
`;
const Thumb = styled.div<{ $img: string | null; $locked: boolean }>`
  position: relative;
  aspect-ratio: 16 / 9;
  background:
    ${({ $img }) => ($img ? `center / cover no-repeat url(${JSON.stringify($img)})` : 'transparent')},
    linear-gradient(135deg, var(--video-card-hi), var(--video-card-lo));
  /* locked → diffuse: desaturate + a milk-glass veil (no live blur, perf-legal) */
  filter: ${({ $locked }) => ($locked ? 'saturate(0.45) brightness(0.72)' : 'none')};
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $locked }) =>
      $locked
        ? 'linear-gradient(180deg, transparent, color-mix(in oklab, var(--video-surface) 62%, transparent))'
        : 'none'};
  }
`;
/* the cool spectral fringe — unlocked only, reveals on hover/focus (opacity-capped, cool spectrum) */
const Fringe = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  border-radius: inherit;
  background: linear-gradient(
    115deg,
    transparent 40%,
    color-mix(in oklab, var(--video-ice) 40%, transparent) 48%,
    rgba(255, 255, 255, 0.28) 52%,
    color-mix(in oklab, var(--video-wing) 34%, transparent) 58%,
    transparent 66%
  );
  transition: opacity 260ms var(--video-ease-crystallize);
  ${Card}:hover &,
  ${Card}:focus-within & {
    opacity: 0.65;
  }
`;
const DurationChip = styled.span`
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 3px 8px;
  border-radius: 6px;
  background: color-mix(in oklab, var(--video-bg) 78%, transparent);
  color: var(--video-ink);
  font-size: 12px;
  font-weight: 600;
`;
const LockChip = styled.span`
  position: absolute;
  left: 8px;
  top: 8px;
  padding: 3px 9px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--video-bg) 74%, transparent);
  border: 1px solid var(--video-ice-14);
  color: var(--video-ice);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;
const Body = styled.div`
  padding: 12px 14px 14px;
`;
const Type = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--video-ink-2);
`;
const Title = styled.h3`
  margin: 4px 0 0;
  font: 600 15px / 1.25 var(--video-font-display, inherit);
  color: var(--video-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
const StretchedLink = styled(Link)`
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  text-indent: -9999px;
  overflow: hidden;
`;

export function VideoGlassCard({ video }: { video: VideoItem }) {
  const duration = video.durationSeconds ? formatDuration(video.durationSeconds) : null;
  const watchPath = getVideoWatchPath(video.slug);
  return (
    <Card $locked={video.locked} data-testid={`video-card-${video.id}`}>
      <Clip>
        <Thumb $img={video.thumbnail} $locked={video.locked} aria-hidden="true">
          {!video.locked && <Fringe />}
          {video.locked && <LockChip>Members</LockChip>}
          {duration && <DurationChip>{duration}</DurationChip>}
        </Thumb>
        <Body>
          {video.contentType && <Type>{video.contentType}</Type>}
          <Title>{video.title}</Title>
        </Body>
      </Clip>
      {/* ONE stretched link — the watch page owns the gate for locked content */}
      {watchPath && <StretchedLink to={watchPath}>{video.title}</StretchedLink>}
    </Card>
  );
}

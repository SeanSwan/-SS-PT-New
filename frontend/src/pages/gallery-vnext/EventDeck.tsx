/**
 * Gallery vNext — EventDeck (Direction A "Cascade", Kimi ideation 2026-07-20). The RARE pattern: each event
 * renders as a deck of vertical photo strips CUT FROM ITS COVER IMAGE (background-position slices — never
 * gated photos, which stay behind the paywall). At rest the strips sit like a hand of cards; on a fine
 * pointer, the strip under the cursor expands (flex-grow) while siblings compress — a cascading accordion.
 * On touch/reduced-motion the strips rest equal, which perfectly reconstructs the cover (clean fallback).
 * The whole deck is ONE button → opens the existing gate (money path untouched). Decks deal in bottom-up
 * (translateY+opacity, 70ms stagger) and stack with a subtle waterfall overlap in EventsView.
 * ZERO raw hex — all color via var(--gallery-*) (CI token discipline).
 */
import styled, { css, keyframes } from 'styled-components';
import type { GalleryEventSummary } from './gallery.types';

const STRIPS = 6;

const dealIn = keyframes`
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Deck = styled.button<{ $i: number }>`
  position: relative;
  display: flex;
  gap: 3px;
  width: 100%;
  height: clamp(220px, 30vw, 320px);
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--gallery-chrome-edge);
  border-radius: var(--gallery-r-card, 12px);
  background: var(--gallery-surface-1);
  color: var(--gallery-ink);
  cursor: pointer;
  text-align: left;
  box-shadow: var(--gallery-elev-1);
  contain: layout paint;
  animation: ${dealIn} 460ms var(--gallery-ease-standard) both;
  animation-delay: ${(p) => Math.min(p.$i, 6) * 70}ms;
  transition: transform 260ms var(--gallery-ease-standard), box-shadow 260ms var(--gallery-ease-standard);

  &:hover,
  &:focus-visible {
    transform: translateY(-4px);
    box-shadow: 0 0 0 1px var(--gallery-chrome-edge), 0 14px 40px var(--gallery-wing-22);
    z-index: 2;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
    &:hover,
    &:focus-visible {
      transform: none;
    }
  }
`;

/** One vertical slice of the cover. Equal widths tile the cover exactly; hover fans the accordion. */
const Strip = styled.div<{ $src: string | null; $pos: number }>`
  flex: 1 1 0;
  min-width: 0;
  background-color: var(--gallery-surface-2);
  ${(p) =>
    p.$src &&
    css`
      background-image: url('${p.$src}');
    `}
  background-size: ${STRIPS * 100}% 100%;
  background-position: ${(p) => p.$pos}% 50%;
  transition: flex-grow 340ms var(--gallery-ease-standard);

  /* fine pointers only — touch keeps the reconstructed cover (equal strips) */
  @media (hover: hover) and (pointer: fine) {
    ${Deck}:hover &:hover {
      flex-grow: 2.6;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/** Bottom scrim bar — name/meta hold AA over any photograph; meta row rises on deck hover.
 *  Dry-loop R2 fix: the gradient reaches higher (48px head-start, solid by 62%) and the name is clamped to
 *  2 lines — an extreme-length name can no longer climb out of the dark zone onto a bright sky. */
const NameBar = styled.span`
  position: absolute;
  inset: auto 0 0 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 48px 16px 14px;
  background: linear-gradient(180deg, transparent, var(--gallery-scrim-solid) 48%);
  pointer-events: none;
`;

const DeckName = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-family: var(--gallery-font-display);
  font-size: clamp(1.05rem, 2.2vw, 1.45rem);
  font-weight: 700;
  line-height: 1.15;
  /* R4: halo (home-hero pattern) — the name holds AA over ANY photograph, not just dark ones */
  text-shadow: 0 2px 18px var(--gallery-bg), 0 1px 4px var(--gallery-bg);
`;

const DeckMeta = styled.span`
  color: var(--gallery-ink-2);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 12px var(--gallery-bg), 0 1px 3px var(--gallery-bg);
  transform: translateY(4px);
  opacity: 0.85;
  transition: transform 300ms var(--gallery-ease-standard), opacity 300ms var(--gallery-ease-standard);

  ${Deck}:hover &, ${Deck}:focus-visible & {
    transform: translateY(0);
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transform: none;
    transition: none;
  }
`;

const DeckBadge = styled.span`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--gallery-frost);
  border: 1px solid var(--gallery-line);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  pointer-events: none;
`;

const DeckCount = styled.span`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--gallery-scrim-solid);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
`;

const formatDate = (d: string | null): string =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

export interface EventDeckProps {
  event: GalleryEventSummary;
  index: number;
  onOpen(event: GalleryEventSummary): void;
}

export function EventDeck({ event, index, onOpen }: EventDeckProps) {
  return (
    <Deck
      type="button"
      $i={index}
      onClick={() => onOpen(event)}
      aria-label={`Open ${event.name} gallery — ${event.photoCount} photos`}
      data-testid="event-deck"
    >
      {Array.from({ length: STRIPS }, (_, i) => (
        <Strip key={i} $src={event.coverPhotoUrl} $pos={(i / (STRIPS - 1)) * 100} aria-hidden="true" />
      ))}
      {event.sport && <DeckBadge data-testid="event-cover-badge">{event.sport}</DeckBadge>}
      <DeckCount data-testid="event-cover-count">
        {event.photoCount} {event.photoCount === 1 ? 'photo' : 'photos'}
      </DeckCount>
      <NameBar>
        <DeckName>{event.name}</DeckName>
        <DeckMeta>
          {formatDate(event.eventDate)}
          {event.location ? ` · ${event.location}` : ''}
        </DeckMeta>
      </NameBar>
    </Deck>
  );
}

export default EventDeck;

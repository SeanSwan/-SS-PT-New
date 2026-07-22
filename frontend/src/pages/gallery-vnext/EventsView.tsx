/**
 * Gallery vNext — pre-gate events view (Direction A "Cascade", Kimi ideation 2026-07-20). The hero is
 * de-templated: the infinite ShimmerWord sheen is DEAD (two competing signature moments = none — the
 * Crystallize overlay is THE beat); the gradient word stays as a static brand accent. Events render as
 * cascading EventDecks (cover sliced into accordion strips) stacked in a subtle waterfall — the index IS
 * the signature. Skeletons are deck-shaped so load-in doesn't morph the layout.
 */
import { useRef } from 'react';
import styled from 'styled-components';
import {
  GradientWord,
  Hero,
  HeroActions,
  HeroEyebrow,
  HeroHeadline,
  HeroPrimary,
  HeroSecondary,
  HeroSub,
  SkeletonTile,
} from './GalleryVNext.chrome.styles';
import { RetryBtn, State, Sub, Title } from './GalleryVNext.styles';
import { EventDeck } from './EventDeck';
import type { GalleryEventSummary } from './gallery.types';

/** Waterfall stack: decks overlap 12px with later decks on top; hover lifts a deck out (see EventDeck). */
const DeckList = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 18px;

  > * + * {
    margin-top: -12px;
  }

  @media (prefers-reduced-motion: reduce) {
    > * + * {
      margin-top: 14px; /* no overlap theatrics — a calm list */
    }
  }
`;

const DeckSkeletons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
`;

export interface EventsViewProps {
  events: GalleryEventSummary[];
  loading: boolean;
  error: string;
  onOpenEvent(event: GalleryEventSummary): void;
  onRetry(): void;
}

export function EventsView({ events, loading, error, onOpenEvent, onRetry }: EventsViewProps) {
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <Hero aria-label="SwanStudios Photography">
        <HeroEyebrow>SwanStudios Photography</HeroEyebrow>
        <HeroHeadline>
          Every moment, <GradientWord>immortalized</GradientWord>.
        </HeroHeadline>
        <HeroSub>
          Competition, portrait, and transformation photography — preserved in the SwanStudios vault.
        </HeroSub>
        <HeroActions>
          <HeroPrimary
            type="button"
            onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Access event galleries
          </HeroPrimary>
          <HeroSecondary href="/contact" aria-label="Inquire about photography services">
            Inquire about photography
          </HeroSecondary>
        </HeroActions>
      </Hero>

      <div ref={listRef}>
        <Title as="h2">Recent events</Title>
        <Sub>Pick an event — your email and the event password unlock its gallery.</Sub>

        {error && !loading && (
          <State role="alert">
            {error}
            <RetryBtn type="button" onClick={onRetry}>
              Try again
            </RetryBtn>
          </State>
        )}

        {loading && (
          <DeckSkeletons aria-hidden="true">
            <SkeletonTile $flex={1} $h={240} />
            <SkeletonTile $flex={1} $h={240} />
          </DeckSkeletons>
        )}

        {!loading && !error && events.length === 0 && (
          <State>No galleries are published yet. Check back soon.</State>
        )}

        {!loading && events.length > 0 && (
          <DeckList>
            {events.map((event, i) => (
              <EventDeck key={event.id} event={event} index={i} onOpen={onOpenEvent} />
            ))}
          </DeckList>
        )}
      </div>
    </>
  );
}

export default EventsView;

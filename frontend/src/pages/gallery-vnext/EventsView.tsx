/**
 * Gallery vNext — pre-gate events view: hero (the landing moment; ONE primary + the photography-inquiry
 * lead link), the event grid with real covers/badges (parity with the shipped listing), skeletons while
 * loading, and a designed empty/error state with one recovery CTA (Kimi b7).
 */
import { useRef } from 'react';
import {
  CoverBadge,
  CoverCount,
  EventBody,
  EventCover,
  Hero,
  HeroActions,
  HeroEyebrow,
  HeroHeadline,
  HeroPrimary,
  HeroSecondary,
  HeroSub,
  SkeletonRow,
  SkeletonTile,
} from './GalleryVNext.chrome.styles';
import { EventCard, EventList, EventMeta, EventName, RetryBtn, State, Sub, Title } from './GalleryVNext.styles';
import type { GalleryEventSummary } from './gallery.types';

const formatDate = (d: string | null): string =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

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
        <HeroHeadline>Every moment, immortalized.</HeroHeadline>
        <HeroSub>
          Premium photography for life&apos;s defining moments — events, portraits, fitness
          transformations, and everything in between. Preserved securely in the SwanStudios vault.
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
          <SkeletonRow aria-hidden="true">
            <SkeletonTile $flex={1.4} />
            <SkeletonTile $flex={1} />
            <SkeletonTile $flex={1.2} />
          </SkeletonRow>
        )}

        {!loading && !error && events.length === 0 && (
          <State>No galleries are published yet. Check back soon.</State>
        )}

        {!loading && events.length > 0 && (
          <EventList>
            {events.map((event) => (
              <EventCard key={event.id} type="button" onClick={() => onOpenEvent(event)}>
                <EventCover $src={event.coverPhotoUrl}>
                  {event.sport && <CoverBadge>{event.sport}</CoverBadge>}
                  <CoverCount>
                    {event.photoCount} {event.photoCount === 1 ? 'photo' : 'photos'}
                  </CoverCount>
                </EventCover>
                <EventBody>
                  <EventName>{event.name}</EventName>
                  <EventMeta>
                    {formatDate(event.eventDate)}
                    {event.location ? ` · ${event.location}` : ''}
                  </EventMeta>
                </EventBody>
              </EventCard>
            ))}
          </EventList>
        )}
      </div>
    </>
  );
}

export default EventsView;

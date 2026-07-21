/**
 * ============================================================================
 * FILE: LooksCarousel.tsx — FUSION F2
 * PURPOSE: The scroll-snap looks rail. Native scroll only (NO carousel
 * library — 06-bans #7); ◄ ► buttons for keyboard/desktop with the exact
 * aria-labels; cards are 44px+ buttons carrying the WORN badge (committed)
 * and the v2 mini-tag (catalog-map presence). Tap = preview, never commit.
 * ============================================================================
 */
import React, { useRef } from 'react';
import type { StyleLensManifest } from '../../../core/style-lens-os';
import { SWAN_STYLE_LENS_VISUALS } from '../../../adapters/style-lens-swan';
import { V2_RECIPE_BY_CATALOG_ID } from '../../../adapters/style-lens-swan/v2/catalogV2Map';
import { LensDot } from '../../DashBoard/Pages/workout-design-lab/WorkoutDesignLabAtmosphere.styles';
import {
  ArrowButton,
  CardMetaRow,
  CarouselRail,
  CarouselRow,
  LookCard,
  LookItem,
  V2Tag,
  WornBadge,
} from './CrownHeader.styles';

interface LooksCarouselProps {
  looks: readonly StyleLensManifest[];
  committedId: string;
  activeId: string;
  onPreview: (id: string) => void;
}

const LooksCarousel: React.FC<LooksCarouselProps> = ({
  looks,
  committedId,
  activeId,
  onPreview,
}) => {
  const railRef = useRef<HTMLUListElement>(null);
  const scrollByCards = (direction: 1 | -1) =>
    railRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });

  return (
    <CarouselRow>
      <ArrowButton type="button" aria-label="Previous looks" onClick={() => scrollByCards(-1)}>
        ◄
      </ArrowButton>
      <CarouselRail ref={railRef} role="list" aria-label="Looks carousel">
        {looks.map((look) => {
          const visual = SWAN_STYLE_LENS_VISUALS[look.id];
          return (
            <LookItem key={look.id} role="listitem">
              <LookCard
                type="button"
                data-look-id={look.id}
                aria-label={`Preview ${look.name}`}
                aria-pressed={look.id === activeId}
                $canvas={visual?.backgroundFallback ?? '#0A0A0F'}
                $accent={visual?.accentFallback ?? '#60C0F0'}
                $active={look.id === activeId}
                onClick={() => onPreview(look.id)}
              >
                <CardMetaRow>
                  <LensDot
                    aria-hidden="true"
                    $canvas={visual?.backgroundFallback ?? '#0A0A0F'}
                    $accent={visual?.accentFallback ?? '#60C0F0'}
                  />
                  {look.id === committedId ? <WornBadge>WORN</WornBadge> : null}
                  {look.emotionalJob}
                  {V2_RECIPE_BY_CATALOG_ID[look.id] ? <V2Tag>v2</V2Tag> : null}
                </CardMetaRow>
                {look.name}
              </LookCard>
            </LookItem>
          );
        })}
      </CarouselRail>
      <ArrowButton type="button" aria-label="Next looks" onClick={() => scrollByCards(1)}>
        ►
      </ArrowButton>
    </CarouselRow>
  );
};

export default LooksCarousel;

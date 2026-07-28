/**
 * COMPONENT: CoverStudioPanel.primarySections
 * PURPOSE: Cover type, layout, media, and framing sections for the feed cover studio panel.
 */
import React from 'react';
import { Check, Film, Plus, Shuffle } from 'lucide-react';
import {
  BANNER_COLLAGE_MEDIA_TYPES,
  MAX_BANNER_COLLAGE_PHOTOS,
  MAX_BANNER_COLLAGE_VIDEOS,
  type BannerCollageLayout,
  type BannerObjectFit,
} from '../../../../services/profileService';
import { isBannerVideoUrl } from '../../../UserDashboard/utils/bannerCompositionMedia';
import {
  DirGrid,
  DirTile,
  DirTileName,
  DirTilePreview,
  DirTileRec,
  LibAddTile,
  LibGrid,
  LibItem,
  LibPickNumber,
  LibVideoTag,
  RecTag,
  Schem,
  SectionHelp,
  SectionLabel,
  Seg,
  SegButton,
  TypeCard,
  TypeCardCheck,
  TypeCardDesc,
  TypeCardMeta,
  TypeCardName,
  TypeCardPreview,
} from './CoverStudioPanel.styles';
import {
  COVER_TYPES,
  LAYOUT_LABELS,
  SCHEMATIC,
  getTypeSchematicKind,
  type CoverType,
} from './CoverStudioPanel.types';

type SchematicProps = { kind: string };

function Schematic({ kind }: SchematicProps) {
  return (
    <Schem style={{ alignItems: 'center', justifyContent: 'center' }}>
      {(SCHEMATIC[kind] ?? SCHEMATIC.single).map((bar, index) => (
        <i key={index} style={{ width: bar.w, height: bar.h }} />
      ))}
    </Schem>
  );
}

export function CoverTypeSection({
  coverType,
  onSelectType,
}: {
  coverType: CoverType;
  onSelectType: (next: CoverType) => void;
}) {
  return (
    <div>
      <SectionLabel><span className="num">01</span> Cover type</SectionLabel>
      {COVER_TYPES.map((type) => (
        <TypeCard
          key={type.id}
          type="button"
          $active={coverType === type.id}
          aria-pressed={coverType === type.id}
          onClick={() => onSelectType(type.id)}
          style={{ marginBottom: 12 }}
        >
          <TypeCardPreview><Schematic kind={getTypeSchematicKind(type.id)} /></TypeCardPreview>
          <TypeCardMeta>
            <TypeCardName>{type.name}{type.rec && <RecTag>Recommended</RecTag>}</TypeCardName>
            <TypeCardDesc>{type.desc}</TypeCardDesc>
          </TypeCardMeta>
          <TypeCardCheck $active={coverType === type.id}><Check size={12} /></TypeCardCheck>
        </TypeCard>
      ))}
    </div>
  );
}

export function LayoutSection({
  coverType,
  layoutOptions,
  selectedLayout,
  stickyCarousel,
  onLayoutCommit,
  onStickyCarouselChange,
}: {
  coverType: CoverType;
  layoutOptions: BannerCollageLayout[];
  selectedLayout: BannerCollageLayout;
  stickyCarousel: boolean;
  onLayoutCommit: (layout: BannerCollageLayout) => void;
  onStickyCarouselChange: (sticky: boolean) => void;
}) {
  if (coverType === 'single') return null;
  return (
    <div>
      <SectionLabel><span className="num">02</span> {coverType === 'stage' ? 'Stage layout' : coverType === 'carousel' ? 'Carousel layout' : 'Collage pattern'}</SectionLabel>
      {coverType === 'stage' && (
        <SectionHelp><b>Smart</b> is our pick - selected media plus crystalline fill tiles. <b>Vitrine</b> keeps the hero whole with atmospheric fill.</SectionHelp>
      )}
      {coverType === 'stage' && selectedLayout !== 'smart-carousel' && selectedLayout !== 'vitrine' && (
        <SectionHelp>Need the full photo visible? Use Smart or Vitrine, then choose Tall or Cinema height for portrait media.</SectionHelp>
      )}
      <DirGrid>
        {layoutOptions.map((layout) => (
          <DirTile
            key={layout}
            type="button"
            $active={selectedLayout === layout}
            aria-pressed={selectedLayout === layout}
            aria-label={`${LAYOUT_LABELS[layout]} layout`}
            onClick={() => onLayoutCommit(layout)}
          >
            {coverType === 'stage' && layout === 'smart-carousel' && <DirTileRec><Check size={9} /></DirTileRec>}
            <DirTilePreview><Schematic kind={layout} /></DirTilePreview>
            <DirTileName>{LAYOUT_LABELS[layout]}</DirTileName>
          </DirTile>
        ))}
      </DirGrid>
      {coverType === 'carousel' && (
        <Seg role="group" aria-label="Carousel follow behavior" style={{ marginTop: 10 }}>
          <SegButton type="button" $active={!stickyCarousel} onClick={() => onStickyCarouselChange(false)}>
            In cover
          </SegButton>
          <SegButton type="button" $active={stickyCarousel} onClick={() => onStickyCarouselChange(true)}>
            Sticky strip
          </SegButton>
        </Seg>
      )}
    </div>
  );
}
function MediaPreview({ url }: { url: string }) {
  if (isBannerVideoUrl(url)) {
    return (
      <>
        <video src={url} muted playsInline preload="metadata" />
        <LibVideoTag><Film size={9} /></LibVideoTag>
      </>
    );
  }
  return <img src={url} alt="" />;
}

export function MediaLibrarySection({
  coverType,
  fileRef,
  isFull,
  photos,
  onFiles,
  onRemove,
  onShuffle,
}: {
  coverType: CoverType;
  fileRef: React.RefObject<HTMLInputElement>;
  isFull: boolean;
  photos: string[];
  onFiles: (files: FileList | File[]) => void;
  onRemove: (index: number) => void;
  onShuffle?: () => void;
}) {
  if (coverType === 'single') return null;
  return (
    <div>
      <SectionLabel><span className="num">03</span> Media - mix photos + video</SectionLabel>
      <SectionHelp>Up to {MAX_BANNER_COLLAGE_PHOTOS} items ({MAX_BANNER_COLLAGE_VIDEOS} short videos). Tap a frame to remove it.</SectionHelp>
      <LibGrid>
        {photos.map((photo, index) => (
          <LibItem
            key={`${photo}-${index}`}
            type="button"
            $selected
            aria-label={`Remove media ${index + 1}`}
            onClick={() => onRemove(index)}
          >
            <MediaPreview url={photo} />
            <LibPickNumber>{index + 1}</LibPickNumber>
          </LibItem>
        ))}
        <LibAddTile
          type="button"
          disabled={isFull}
          aria-label={isFull ? 'Media full' : 'Add photos or videos'}
          onClick={() => fileRef.current?.click()}
        >
          <Plus size={18} />
        </LibAddTile>
        <LibAddTile
          type="button"
          disabled={photos.length < 2 || !onShuffle}
          aria-label="Shuffle cover media"
          onClick={onShuffle}
        >
          <Shuffle size={18} />
        </LibAddTile>
      </LibGrid>
      <input
        ref={fileRef}
        type="file"
        accept={BANNER_COLLAGE_MEDIA_TYPES.join(',')}
        multiple
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        aria-label="Add cover media"
        onChange={(event) => {
          if (event.target.files) onFiles(event.target.files);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}

export function FramingSection({
  coverType,
  fit,
  onFitChange,
}: {
  coverType: CoverType;
  fit: BannerObjectFit;
  onFitChange: (fit: BannerObjectFit) => void;
}) {
  if (coverType !== 'single') return null;
  return (
    <div>
      <SectionLabel>Framing</SectionLabel>
      <Seg>
        <SegButton type="button" $active={fit === 'smart'} onClick={() => onFitChange('smart')}>Smart fit</SegButton>
        <SegButton type="button" $active={fit === 'cover'} onClick={() => onFitChange('cover')}>Fill crop</SegButton>
        <SegButton type="button" $active={fit === 'contain'} onClick={() => onFitChange('contain')}>Fit whole</SegButton>
      </Seg>
    </div>
  );
}

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: TransformationPhotoShowcase                      ║
 * ║  PURPOSE: Before/after photo slider with privacy controls    ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-22                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌─────────────────────────────────────────────────────────┐
 * │  🔄 Transformation  [👁 Friends Only]                   │
 * ├─────────────────────────────────────────────────────────┤
 * │                                                         │
 * │  ┌─ BEFORE ──┬── AFTER ──┐                              │
 * │  │           │           │  (drag slider)               │
 * │  │   photo   │   photo   │                              │
 * │  │           │           │                              │
 * │  └───────────┴───────────┘                              │
 * │                                                         │
 * ├── [Front] [Side] [Back] ────────────────────────────────┤
 * │  📅 12 weeks apart                    [Upload Photos]   │
 * └─────────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[TransformationPhotoShowcase] --> B[SliderContainer]
 *   A --> C[AngleTabs]
 *   A --> D[FooterRow]
 *   B --> E[PhotoLayer before]
 *   B --> F[PhotoLayer after + clip]
 *   B --> G[SliderDivider]
 *
 * DATA FLOW:
 * Props In:  { photos, visibility, isOwnProfile, onUpload }
 * State:     { sliderPosition, activeAngle }
 * API Calls: GET /api/photos/:userId (via parent hook)
 * Children:  Styled sub-components from TransformationPhotoStyles
 */
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Camera, Eye, EyeOff, Users, Lock, Upload } from 'lucide-react';
import type { TransformationPhoto, PhotoAngle, PhotoVisibility } from './TransformationPhotoTypes';
import { VISIBILITY_LABELS, ANGLE_LABELS } from './TransformationPhotoTypes';
import {
  ShowcaseContainer,
  ShowcaseHeader,
  ShowcaseTitle,
  VisibilityBadge,
  SliderContainer,
  PhotoLayer,
  SliderDivider,
  PhotoLabel,
  DateLabel,
  EmptyState,
  EmptyIcon,
  EmptyText,
  UploadButton,
  AngleTabs,
  AngleTab,
  FooterRow,
  TimeDelta,
} from './TransformationPhotoStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface TransformationPhotoShowcaseProps {
  photos: TransformationPhoto[];
  visibility: PhotoVisibility;
  isOwnProfile: boolean;
  onUpload?: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getTimeDelta = (before: string, after: string): string => {
  const diff = new Date(after).getTime() - new Date(before).getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} apart`;
  const weeks = Math.round(days / 7);
  if (weeks < 12) return `${weeks} week${weeks !== 1 ? 's' : ''} apart`;
  const months = Math.round(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} apart`;
};

const getVisibilityIcon = (vis: PhotoVisibility) => {
  switch (vis) {
    case 'public': return <Eye size={10} />;
    case 'friends': return <Users size={10} />;
    case 'private': return <Lock size={10} />;
    case 'hidden': return <EyeOff size={10} />;
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const TransformationPhotoShowcase: React.FC<TransformationPhotoShowcaseProps> = ({
  photos,
  visibility,
  isOwnProfile,
  onUpload,
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [activeAngle, setActiveAngle] = useState<PhotoAngle>('front');
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Group photos by angle, sorted by date (oldest first)
  const photosByAngle = useMemo(() => {
    const grouped: Record<PhotoAngle, TransformationPhoto[]> = {
      front: [], side: [], back: [], other: [],
    };
    photos.forEach((p) => {
      if (grouped[p.photoType]) grouped[p.photoType].push(p);
    });
    // Sort each group by date
    Object.values(grouped).forEach((arr) =>
      arr.sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())
    );
    return grouped;
  }, [photos]);

  // Available angles (only those with 2+ photos)
  const availableAngles = useMemo(() =>
    (Object.keys(photosByAngle) as PhotoAngle[]).filter(
      (angle) => photosByAngle[angle].length >= 2
    ),
    [photosByAngle]
  );

  // Get before/after pair for current angle
  const currentPair = useMemo(() => {
    const anglePhotos = photosByAngle[activeAngle];
    if (anglePhotos.length < 2) return null;
    return {
      before: anglePhotos[0],
      after: anglePhotos[anglePhotos.length - 1],
    };
  }, [photosByAngle, activeAngle]);

  // Auto-select first available angle
  React.useEffect(() => {
    if (!photosByAngle[activeAngle] || photosByAngle[activeAngle].length < 2) {
      if (availableAngles.length > 0) {
        setActiveAngle(availableAngles[0]);
      }
    }
  }, [availableAngles, activeAngle, photosByAngle]);

  // Slider drag handlers
  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateSlider(e.clientX);
  }, [updateSlider]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateSlider(e.clientX);
  }, [updateSlider]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // If hidden and not own profile, show nothing
  if (visibility === 'hidden' && !isOwnProfile) return null;

  const hasPhotos = photos.length > 0;
  const hasPair = currentPair !== null;

  return (
    <ShowcaseContainer>
      <ShowcaseHeader>
        <ShowcaseTitle>
          <Camera size={16} />
          Transformation
        </ShowcaseTitle>
        <VisibilityBadge $vis={visibility}>
          {getVisibilityIcon(visibility)}
          {VISIBILITY_LABELS[visibility]}
        </VisibilityBadge>
      </ShowcaseHeader>

      {hasPair ? (
        <>
          <SliderContainer
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            role="slider"
            aria-label="Before and after photo comparison slider"
            aria-valuenow={Math.round(sliderPos)}
            aria-valuemin={5}
            aria-valuemax={95}
          >
            {/* Before photo (full width background) */}
            <PhotoLayer
              $position="before"
              style={{ backgroundImage: `url(${currentPair.before.url})` }}
            />

            {/* After photo (clipped to right side of slider) */}
            <PhotoLayer
              $position="after"
              style={{
                backgroundImage: `url(${currentPair.after.url})`,
                clipPath: `inset(0 0 0 ${sliderPos}%)`,
              }}
            />

            <SliderDivider $x={sliderPos} />

            <PhotoLabel $side="left">Before</PhotoLabel>
            <PhotoLabel $side="right">After</PhotoLabel>

            <DateLabel style={{ left: 12 }}>
              {formatDate(currentPair.before.takenAt)}
            </DateLabel>
            <DateLabel style={{ right: 12 }}>
              {formatDate(currentPair.after.takenAt)}
            </DateLabel>
          </SliderContainer>

          {availableAngles.length > 1 && (
            <AngleTabs>
              {availableAngles.map((angle) => (
                <AngleTab
                  key={angle}
                  $active={activeAngle === angle}
                  onClick={() => setActiveAngle(angle)}
                >
                  {ANGLE_LABELS[angle]}
                </AngleTab>
              ))}
            </AngleTabs>
          )}

          <FooterRow>
            <TimeDelta>
              {getTimeDelta(currentPair.before.takenAt, currentPair.after.takenAt)}
            </TimeDelta>
            {isOwnProfile && onUpload && (
              <UploadButton onClick={onUpload}>
                <Upload size={14} />
                Update Photos
              </UploadButton>
            )}
          </FooterRow>
        </>
      ) : (
        <EmptyState>
          <EmptyIcon>
            <Camera size={28} />
          </EmptyIcon>
          <EmptyText>
            {hasPhotos
              ? 'Upload at least 2 photos of the same angle to see your transformation.'
              : 'Track your transformation journey with before & after photos.'}
          </EmptyText>
          {isOwnProfile && onUpload && (
            <UploadButton onClick={onUpload}>
              <Upload size={14} />
              Upload Progress Photos
            </UploadButton>
          )}
        </EmptyState>
      )}
    </ShowcaseContainer>
  );
};

export default React.memo(TransformationPhotoShowcase);

/**
 * ┌─── SUB-COMPONENT: CreatePostMediaUpload ───────────────────┐
 * │ PARENT: CreatePostCard                                      │
 * │ PURPOSE: Handles image/video upload + preview for general   │
 * │          posts AND before/after photos for transformation   │
 * │          posts.                                             │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────────────┐    │
 * │ │ [General] ┌──────────────┐                           │    │
 * │ │           │ preview img  │ [X remove]                │    │
 * │ │           └──────────────┘                           │    │
 * │ │ [Transform] ┌──────┐ ┌──────┐                       │    │
 * │ │             │Before│ │After │                        │    │
 * │ │             └──────┘ └──────┘                        │    │
 * │ └──────────────────────────────────────────────────────┘    │
 * │ Props: CreatePostMediaUploadProps                           │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Before box] -> opens file picker -> sets beforePreview     │
 * │ [After box]  -> opens file picker -> sets afterPreview      │
 * │ [X button]   -> revokes blob URL -> clears preview          │
 * │ GAMIFICATION: Transformation posts earn 50pts (highest)     │
 * └────────────────────────────────────────────────────────────┘
 */

/**
 * ============================================================================
 * FILE: CreatePostMediaUpload.tsx
 * PURPOSE: Media upload and preview for general + transformation posts
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders media preview for general posts (image or
 * video) and side-by-side before/after upload boxes for transformation posts.
 * Handles blob URL display and delegates file selection to parent callbacks.
 *
 * HOW IT FITS IN THE APP: CreatePostCard -> CreatePostMediaUpload
 * KEY DECISIONS: Hidden <input type="file"> elements are managed via refs
 * passed from parent to maintain a single source of truth for file state.
 * Video preview uses native <video> with controls.
 */

import React from 'react';
import { Camera, X } from 'lucide-react';
import {
  MediaPreviewWrapper,
  MediaPreview,
  RemoveMediaButton,
  TransformationImageContainer,
  TransformationImageBox,
  PlaceholderContent,
  BodyText,
} from '../styles/CreatePostStyles';
import type { CreatePostMediaUploadProps } from '../types/CreatePostTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Transformation Upload
// PURPOSE: Side-by-side before/after photo boxes
// ─────────────────────────────────────────────────────────────

const TransformationUpload: React.FC<Pick<
  CreatePostMediaUploadProps,
  'beforePreview' | 'afterPreview' | 'beforeImageRef' | 'afterImageRef' |
  'onBeforeImageSelect' | 'onAfterImageSelect' | 'onRemoveBeforeImage' | 'onRemoveAfterImage'
>> = ({
  beforePreview,
  afterPreview,
  beforeImageRef,
  afterImageRef,
  onBeforeImageSelect,
  onAfterImageSelect,
  onRemoveBeforeImage,
  onRemoveAfterImage,
}) => (
  <TransformationImageContainer>
    <input
      ref={beforeImageRef}
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={onBeforeImageSelect}
    />
    <input
      ref={afterImageRef}
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={onAfterImageSelect}
    />

    <MediaPreviewWrapper style={{ flex: 1, marginTop: 0 }}>
      <TransformationImageBox onClick={() => beforeImageRef.current?.click()}>
        {beforePreview ? (
          <img
            src={beforePreview}
            alt="Before"
            style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }}
          />
        ) : (
          <PlaceholderContent>
            <Camera size={32} />
            <BodyText>Before Photo</BodyText>
          </PlaceholderContent>
        )}
      </TransformationImageBox>
      {beforePreview && (
        <RemoveMediaButton onClick={onRemoveBeforeImage} aria-label="Remove before image">
          <X size={16} />
        </RemoveMediaButton>
      )}
    </MediaPreviewWrapper>

    <MediaPreviewWrapper style={{ flex: 1, marginTop: 0 }}>
      <TransformationImageBox onClick={() => afterImageRef.current?.click()}>
        {afterPreview ? (
          <img
            src={afterPreview}
            alt="After"
            style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }}
          />
        ) : (
          <PlaceholderContent>
            <Camera size={32} />
            <BodyText>After Photo</BodyText>
          </PlaceholderContent>
        )}
      </TransformationImageBox>
      {afterPreview && (
        <RemoveMediaButton onClick={onRemoveAfterImage} aria-label="Remove after image">
          <X size={16} />
        </RemoveMediaButton>
      )}
    </MediaPreviewWrapper>
  </TransformationImageContainer>
);

// ─────────────────────────────────────────────────────────────
// SECTION: General Media Preview
// PURPOSE: Single image or video preview with remove button
// ─────────────────────────────────────────────────────────────

const GeneralMediaPreview: React.FC<Pick<
  CreatePostMediaUploadProps,
  'media' | 'mediaPreview' | 'onRemoveMedia'
>> = ({ media, mediaPreview, onRemoveMedia }) => {
  if (!mediaPreview) return null;

  return (
    <MediaPreviewWrapper>
      {media?.type.startsWith('video/') ? (
        <video
          src={mediaPreview}
          controls
          style={{
            width: '100%',
            maxHeight: '300px',
            borderRadius: '8px',
            objectFit: 'contain',
            background: '#000',
          }}
        />
      ) : (
        <MediaPreview src={mediaPreview} alt="Upload preview" />
      )}
      <RemoveMediaButton onClick={onRemoveMedia} aria-label="Remove attached media">
        <X size={16} />
      </RemoveMediaButton>
    </MediaPreviewWrapper>
  );
};

// ─────────────────────────────────────────────────────────────
// SECTION: Main Export
// PURPOSE: Combines transformation + general media into one
//          component that renders based on postType
// ─────────────────────────────────────────────────────────────

const CreatePostMediaUpload: React.FC<CreatePostMediaUploadProps> = (props) => {
  const { postType, showCreateOptions } = props;

  return (
    <>
      {/* Transformation before/after photos */}
      {showCreateOptions && postType === 'transformation' && (
        <TransformationUpload
          beforePreview={props.beforePreview}
          afterPreview={props.afterPreview}
          beforeImageRef={props.beforeImageRef}
          afterImageRef={props.afterImageRef}
          onBeforeImageSelect={props.onBeforeImageSelect}
          onAfterImageSelect={props.onAfterImageSelect}
          onRemoveBeforeImage={props.onRemoveBeforeImage}
          onRemoveAfterImage={props.onRemoveAfterImage}
        />
      )}

      {/* General media preview (image or video) */}
      <GeneralMediaPreview
        media={props.media}
        mediaPreview={props.mediaPreview}
        onRemoveMedia={props.onRemoveMedia}
      />
    </>
  );
};

export default React.memo(CreatePostMediaUpload);

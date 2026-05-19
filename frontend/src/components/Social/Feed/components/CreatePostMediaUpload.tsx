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
import styled from 'styled-components';
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

const HiddenFileInput = styled.input`
  display: none;
`;

const CompactMediaPreviewWrapper = styled(MediaPreviewWrapper)`
  flex: 1;
  margin-top: 0;
`;

const TransformationPreviewImage = styled.img`
  width: 100%;
  max-height: 150px;
  object-fit: cover;
`;

const VideoPreview = styled.video`
  width: 100%;
  max-height: 300px;
  border-radius: 8px;
  object-fit: contain;
  background: #000;
`;

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
    <HiddenFileInput
      ref={beforeImageRef}
      type="file"
      accept="image/*"
      onChange={onBeforeImageSelect}
    />
    <HiddenFileInput
      ref={afterImageRef}
      type="file"
      accept="image/*"
      onChange={onAfterImageSelect}
    />

    <CompactMediaPreviewWrapper>
      <TransformationImageBox onClick={() => beforeImageRef.current?.click()}>
        {beforePreview ? (
          <TransformationPreviewImage
            src={beforePreview}
            alt="Before"
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
    </CompactMediaPreviewWrapper>

    <CompactMediaPreviewWrapper>
      <TransformationImageBox onClick={() => afterImageRef.current?.click()}>
        {afterPreview ? (
          <TransformationPreviewImage
            src={afterPreview}
            alt="After"
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
    </CompactMediaPreviewWrapper>
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
        <VideoPreview
          src={mediaPreview}
          controls
        >
          <track kind="captions" label="Uploaded video captions" srcLang="en" />
        </VideoPreview>
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

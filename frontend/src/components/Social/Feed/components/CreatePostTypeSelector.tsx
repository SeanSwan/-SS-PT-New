/**
 * ┌─── SUB-COMPONENT: CreatePostTypeSelector ──────────────────┐
 * │ PARENT: CreatePostCard                                      │
 * │ PURPOSE: Renders 11 post-type chips so the user can pick    │
 * │          the content category (workout, art, comedy, etc.)  │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────────────┐    │
 * │ │ [General] [Workout] [Transformation] [Achievement]   │    │
 * │ │ [Challenge] [Dance] [Music] [Singing] [Art]          │    │
 * │ │ [Gaming] [Comedy]                                    │    │
 * │ │ ── description text ──                               │    │
 * │ └──────────────────────────────────────────────────────┘    │
 * │ Props: CreatePostTypeSelectorProps                          │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Chip click] -> sets postType on parent -> updates          │
 * │   description text + placeholder + point preview            │
 * │ GAMIFICATION: No direct XP events; controls point preview   │
 * └────────────────────────────────────────────────────────────┘
 */

/**
 * ============================================================================
 * FILE: CreatePostTypeSelector.tsx
 * PURPOSE: Post-type selection chip row for the CreatePost form
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a horizontal chip row of 11 post types.
 * Selecting a chip updates the parent's postType state, which drives the
 * form fields, placeholder text, and gamification point preview.
 *
 * HOW IT FITS IN THE APP: CreatePostCard -> CreatePostTypeSelector
 * KEY DECISIONS: React.memo prevents re-renders when other form state
 * (like postContent) changes. Chips have 44px min touch targets.
 */

import React from 'react';
import {
  PostTypeSelectorWrapper,
  PostTypeChip,
  DescriptionRow,
  BodyText,
} from '../styles/CreatePostStyles';
import type { CreatePostTypeSelectorProps, PostType } from '../types/CreatePostTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Renders post-type chips with selected state
// ─────────────────────────────────────────────────────────────

const CreatePostTypeSelector: React.FC<CreatePostTypeSelectorProps> = ({
  postType,
  onPostTypeChange,
  postTypeOptions,
  currentDescription,
}) => {
  return (
    <>
      <PostTypeSelectorWrapper>
        {postTypeOptions.map((option) => (
          <PostTypeChip
            key={option.value}
            type="button"
            $selected={postType === option.value}
            aria-pressed={postType === option.value}
            onClick={() => onPostTypeChange(option.value as PostType)}
          >
            {option.icon}
            {option.label}
          </PostTypeChip>
        ))}
      </PostTypeSelectorWrapper>

      <DescriptionRow>
        <BodyText>{currentDescription}</BodyText>
      </DescriptionRow>
    </>
  );
};

export default React.memo(CreatePostTypeSelector);

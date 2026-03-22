/**
 * ============================================================================
 * FILE: CreatePostStyles.ts
 * PURPOSE: All styled-components for the CreatePost feature
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Centralises every styled-component used by
 * CreatePostCard and its sub-components. Uses Crystalline Swan palette
 * tokens with hardcoded fallbacks per CLAUDE.md convention.
 *
 * HOW IT FITS IN THE APP: Imported by CreatePostCard.tsx, CreatePostForm.tsx,
 * CreatePostMediaUpload.tsx, CreatePostTypeSelector.tsx.
 *
 * KEY DECISIONS: 44px minimum touch targets on all interactive elements.
 * Focus-visible rings use Wing Purple (#8B5CF6) per dual-button glow system.
 * No Material-UI components.
 */

import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframes
// ─────────────────────────────────────────────────────────────

export const spin = keyframes`
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Card Layout
// PURPOSE: Outer wrapper, body, header for the create-post card
// ─────────────────────────────────────────────────────────────

export const CreatePostCardWrapper = styled.div`
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  background: rgba(0, 32, 96, 0.85); /* Midnight Sapphire at 85% */
  color: #e0e0e0;
`;

export const CardBody = styled.div`
  padding: 16px;
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

export const Heading6 = styled.h6`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
`;

export const BodyText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Avatar + Input Layout
// ─────────────────────────────────────────────────────────────

export const AvatarCircle = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #8B5CF6, #8B5CF6); /* Wing Purple */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const PostInputWrapper = styled.div`
  display: flex;
  gap: 12px;
`;

export const FlexColumn = styled.div`
  flex: 1;
  min-width: 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Form Inputs
// PURPOSE: Textarea, text input, input groups, labels
// ─────────────────────────────────────────────────────────────

export const StyledTextarea = styled.textarea<{ $rows?: number }>`
  width: 100%;
  min-height: ${props => (props.$rows || 3) * 24}px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 20, 64, 0.6); /* Abyssal Navy tint */
  color: #e0e0e0;
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &::placeholder { color: rgba(255, 255, 255, 0.5); }
  &:focus { border-color: #8B5CF6; }
  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const StyledInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 20, 64, 0.6);
  color: #e0e0e0;
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &::placeholder { color: rgba(255, 255, 255, 0.5); }
  &:focus { border-color: #8B5CF6; }
  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
`;

export const StyledInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const InputLabel = styled.label`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Media Preview
// PURPOSE: Image/video preview with remove button overlay
// ─────────────────────────────────────────────────────────────

export const MediaPreviewWrapper = styled.div`
  position: relative;
  margin-top: 16px;
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
`;

export const MediaPreview = styled.img`
  width: 100%;
  max-height: 200px;
  object-fit: cover;
`;

export const RemoveMediaButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  min-height: 44px; /* 44px touch target */
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s ease;

  &:hover { background-color: rgba(0, 0, 0, 0.7); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Footer / Actions
// PURPOSE: Form footer bar with visibility selector and buttons
// ─────────────────────────────────────────────────────────────

export const FormFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  flex-wrap: wrap;
  gap: 8px;
`;

export const FooterLeft = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

export const FooterRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const VisibilitySelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 8px;
`;

export const NativeSelect = styled.select`
  appearance: none;
  min-width: 120px;
  padding: 6px 28px 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 20, 64, 0.6)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")
    no-repeat right 8px center;
  color: #e0e0e0;
  font-family: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  min-height: 44px;
  transition: border-color 0.2s ease;

  &:focus { border-color: #8B5CF6; }
  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  option {
    background: #001840; /* Abyssal Navy */
    color: #e0e0e0;
  }
`;

export const SelectHelperText = styled.span`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Post Type Chips
// PURPOSE: Selectable chip buttons for choosing post category
// ─────────────────────────────────────────────────────────────

export const PostTypeSelectorWrapper = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const PostTypeChip = styled.button<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  user-select: none;
  min-height: 44px;
  border: 2px solid ${props => props.$selected ? '#8B5CF6' : 'rgba(255, 255, 255, 0.2)'};
  background: ${props => props.$selected ? 'rgba(139, 92, 246, 0.12)' : 'transparent'};
  color: ${props => props.$selected ? '#8B5CF6' : '#e0e0e0'};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
`;

export const PointPreviewChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8125rem;
  font-weight: bold;
  background: linear-gradient(135deg, #C6A84B, #d4b85a); /* Gilded Fern */
  color: #000B18;
  white-space: nowrap;
`;

export const DescriptionRow = styled.div`
  margin-bottom: 16px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Transformation Images
// PURPOSE: Side-by-side before/after photo upload boxes
// ─────────────────────────────────────────────────────────────

export const TransformationImageContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 16px;
`;

export const TransformationImageBox = styled.button`
  flex: 1;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  background: transparent;
  color: inherit;
  font-family: inherit;
  transition: all 0.2s ease;

  &:hover {
    border-color: #8B5CF6;
    background-color: rgba(139, 92, 246, 0.04);
  }
  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
`;

export const PlaceholderContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.6;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Workout History
// PURPOSE: Dropdown list of recent completed workouts to
//          auto-fill workout stats from history
// ─────────────────────────────────────────────────────────────

export const WorkoutHistoryBtnRow = styled.div`
  display: flex;
  margin-top: 12px;
`;

export const WorkoutHistoryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.05);
  color: #60C0F0; /* Ice Wing */
  font-size: 0.8125rem;
  cursor: pointer;
  min-height: 40px;
  transition: all 0.2s ease;
  &:hover:not(:disabled) { background: rgba(139, 92, 246, 0.12); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const WorkoutHistoryList = styled.div`
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
`;

export const WorkoutHistoryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.15s;
  &:hover { background: rgba(139, 92, 246, 0.08); }
  &:last-child { border-bottom: none; }
`;

export const WorkoutHistoryInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const WorkoutHistoryName = styled.div`
  font-size: 0.8125rem;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const WorkoutHistoryDate = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
`;

export const WorkoutHistoryEmpty = styled.div`
  padding: 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8125rem;
`;

export const WorkoutStatsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Generic Buttons
// PURPOSE: Outlined and contained action buttons
// ─────────────────────────────────────────────────────────────

export const OutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: #e0e0e0;
  font-family: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  min-height: 44px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;

  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
    border-color: #8B5CF6;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const ContainedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background: linear-gradient(135deg, #8B5CF6, #8B5CF6); /* Wing Purple */
  color: white;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;

  &:hover { box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Floating Action Button
// PURPOSE: Fixed-position FAB that scrolls the card into view
// ─────────────────────────────────────────────────────────────

export const FloatingCreateButton = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  background: linear-gradient(135deg, #8B5CF6, #8B5CF6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #6a44a0, #00e0e0);
    transform: scale(1.1);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Category Override (AI Village mandate)
// PURPOSE: Styled wrapper for the AI-suggested category chip
// ─────────────────────────────────────────────────────────────

export const CategoryOverrideWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
`;

export const CategorySuggestionText = styled.span`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
`;

export const CategoryOverrideBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.4);
  background: rgba(96, 192, 240, 0.1);
  color: #60C0F0; /* Ice Wing */
  font-size: 0.75rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.2);
    border-color: #60C0F0;
  }
`;

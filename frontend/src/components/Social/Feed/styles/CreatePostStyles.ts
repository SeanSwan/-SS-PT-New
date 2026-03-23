/**
 * ============================================================================
 * FILE: CreatePostStyles.ts
 * PURPOSE: All styled-components for the CreatePost feature
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Centralises every styled-component used by
 * CreatePostCard and its sub-components. Uses CSS custom properties
 * injected by UniversalThemeContext so all styles adapt to any theme.
 *
 * HOW IT FITS IN THE APP: Imported by CreatePostCard.tsx, CreatePostForm.tsx,
 * CreatePostMediaUpload.tsx, CreatePostTypeSelector.tsx.
 *
 * KEY DECISIONS: 44px minimum touch targets on all interactive elements.
 * All colors use var(--css-variable, fallback) pattern for theme-awareness.
 * Focus-visible rings use var(--accent-secondary) per dual-button glow system.
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
  box-shadow: var(--shadow-glass, 0 2px 12px rgba(0, 0, 0, 0.1));
  background: var(--bg-elevated, rgba(0, 32, 96, 0.85));
  color: var(--text-primary, #e0e0e0);
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
  color: var(--text-heading, #ffffff);
`;

export const BodyText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.6));
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
  background: var(--accent-secondary, #8B5CF6);
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
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.15));
  background: var(--bg-surface, rgba(0, 20, 64, 0.6));
  color: var(--text-primary, #e0e0e0);
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &::placeholder { color: var(--text-muted, rgba(255, 255, 255, 0.5)); }
  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const StyledInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.15));
  background: var(--bg-surface, rgba(0, 20, 64, 0.6));
  color: var(--text-primary, #e0e0e0);
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &::placeholder { color: var(--text-muted, rgba(255, 255, 255, 0.5)); }
  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
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
  color: var(--text-muted, rgba(255, 255, 255, 0.6));
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
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.15));
  background: var(--bg-surface, rgba(0, 20, 64, 0.6))
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")
    no-repeat right 8px center;
  color: var(--text-primary, #e0e0e0);
  font-family: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  min-height: 44px;
  transition: border-color 0.2s ease;

  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  option {
    background: var(--bg-primary, #001840);
    color: var(--text-primary, #e0e0e0);
  }
`;

export const SelectHelperText = styled.span`
  font-size: 0.7rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.4));
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
  border: 2px solid ${props => props.$selected
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--border-soft, rgba(255, 255, 255, 0.2))'};
  background: ${props => props.$selected
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)'
    : 'transparent'};
  color: ${props => props.$selected
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--text-primary, #e0e0e0)'};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
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
  background: linear-gradient(135deg, var(--accent-gold, #C6A84B), #d4b85a);
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
  border: 2px dashed var(--border-soft, rgba(255, 255, 255, 0.2));
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  background: transparent;
  color: inherit;
  font-family: inherit;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-secondary, #8B5CF6);
    background-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 4%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
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
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;
  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const WorkoutHistoryList = styled.div`
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
`;

export const WorkoutHistoryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.05));
  transition: background 0.15s;
  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
  }
  &:last-child { border-bottom: none; }
`;

export const WorkoutHistoryInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const WorkoutHistoryName = styled.div`
  font-size: 0.8125rem;
  color: var(--text-primary, #e2e8f0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const WorkoutHistoryDate = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.4));
`;

export const WorkoutHistoryEmpty = styled.div`
  padding: 16px;
  text-align: center;
  color: var(--text-muted, rgba(255, 255, 255, 0.4));
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
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.25));
  background: transparent;
  color: var(--text-primary, #e0e0e0);
  font-family: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  min-height: 44px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;

  &:hover {
    background-color: color-mix(in srgb, var(--text-primary, #ffffff) 6%, transparent);
    border-color: var(--accent-secondary, #8B5CF6);
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
  background: var(--gradient-primary, linear-gradient(135deg, #8B5CF6, #8B5CF6));
  color: white;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;

  &:hover { box-shadow: var(--shadow-button, 0 4px 16px rgba(139, 92, 246, 0.3)); }
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
  background: var(--gradient-primary, linear-gradient(135deg, #8B5CF6, #8B5CF6));
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
  box-shadow: var(--shadow-button, 0 4px 16px rgba(139, 92, 246, 0.3));
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
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
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
`;

export const CategorySuggestionText = styled.span`
  font-size: 0.8125rem;
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
`;

export const CategoryOverrideBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.75rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
    border-color: var(--accent-primary, #60C0F0);
  }
`;

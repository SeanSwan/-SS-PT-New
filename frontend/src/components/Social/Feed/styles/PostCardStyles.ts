/**
 * ============================================================================
 * FILE: PostCardStyles.ts
 * PURPOSE: All styled-components for the PostCard component family
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Contains every styled-component used across PostCard,
 * PostHeader, PostContent, PostActions, PostComments, and PostMediaDisplay.
 * HOW IT FITS IN THE APP: Imported by each sub-component as needed.
 * KEY DECISIONS: Extracted to a single styles file to stay under 300-line rule
 * per component file. Uses Crystalline Swan theme tokens with fallbacks.
 */

import styled, { css, keyframes } from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../../../../utils/imageUrl';

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// PURPOSE: All PostCard animations (entry, toast, reactions, points)
// ─────────────────────────────────────────────────────────────

const toastSlideIn = keyframes`
  from { transform: translateX(-50%) translateY(20px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
`;

const toastSlideOut = keyframes`
  from { transform: translateX(-50%) translateY(0); opacity: 1; }
  to { transform: translateX(-50%) translateY(20px); opacity: 0; }
`;

const breathe = keyframes`
  0% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.03); }
  100% { opacity: 0.8; transform: scale(1); }
`;

const slideUpFade = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const springScale = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(0.85); }
  75% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Card Wrapper
// ─────────────────────────────────────────────────────────────

export const PostCardWrapper = styled.article`
  width: 100%;
  max-width: 100%;
  margin-bottom: 12px;
  background: var(--bg-base, #111122);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  border-radius: 0;
  border-left: none;
  border-right: none;
  opacity: 0;
  animation: ${slideUpFade} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  /* Native browser virtualization — skips rendering off-screen posts */
  content-visibility: auto;
  contain-intrinsic-size: auto 400px;

  @media (min-width: 768px) {
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 24px;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(96, 192, 240, 0.05);
      border-color: rgba(96, 192, 240, 0.15);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    &:hover { transform: none; }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Hero / Media Area
// ─────────────────────────────────────────────────────────────

export const HeroArea = styled.div<{ $bgImage?: string | null; $gradient: string; $hasImage: boolean }>`
  position: relative;
  width: 100%;
  height: clamp(240px, 40vw, 360px);
  background-color: var(--bg-base, #002060);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  ${props => {
    if (!props.$hasImage) {
      return `
        background: ${props.$gradient},
                    var(--bg-base, #002060);
      `;
    }
    const safe = props.$bgImage ? sanitizeImageUrl(props.$bgImage) : null;
    return safe
      ? `
        background-image: ${props.$gradient}, url(${cssUrlValue(safe)});
        background-size: cover;
        background-position: center;
        &::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 40%;
          background: linear-gradient(to bottom, rgba(17, 17, 34, 0) 0%, var(--bg-base, #111122) 100%);
          pointer-events: none;
        }
      `
      : `
        background: ${props.$gradient},
                    var(--bg-base, #002060);
      `;
  }}
`;

export const VideoMediaShell = styled.div`
  position: relative;
  background: var(--bg-base, #0A0A0F);
  border-radius: 8px 8px 0 0;
  overflow: hidden;
`;

export const PostVideo = styled.video`
  display: block;
  width: 100%;
  max-height: 500px;
  object-fit: contain;
`;

export const SwanWatermark = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.9;
  animation: ${breathe} 4s ease-in-out infinite;
  pointer-events: none;

  img {
    width: 85%;
    height: 85%;
    max-width: 560px;
    max-height: 560px;
    object-fit: contain;
    border-radius: 50%;
    filter: drop-shadow(0 0 30px rgba(96, 192, 240, 0.4));
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Header Styles
// ─────────────────────────────────────────────────────────────

export const PostHeaderRelative = styled.div`
  position: relative;
`;

export const PostHeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  @media (min-width: 768px) { padding: 16px 20px; }
`;

export const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const AvatarStyled = styled.div<{ $size?: number; $coach?: boolean }>`
  width: ${props => props.$size || 44}px;
  height: ${props => props.$size || 44}px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--wing-purple, #8B5CF6), var(--wing-purple, #8B5CF6));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => (props.$size || 44) * 0.35}px;
  font-weight: 600;
  color: var(--text-on-accent, #fff);
  overflow: hidden;
  flex-shrink: 0;
  /* Coach presence (trainer/admin authors): the Gilded Fern luxury ring marks
     that a real coach is in the conversation. */
  border: 2px solid ${({ $coach }) => ($coach
    ? 'var(--accent-gold, #C6A84B)'
    : 'rgba(96, 192, 240, 0.3)')};
  ${({ $coach }) => $coach && css`
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-gold, #C6A84B) 45%, transparent);
  `}
`;

/* Coach identity chip — Gilded Fern pill beside trainer/admin author names so
   members instantly see a coach is present and can ask questions. */
export const CoachChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent);
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  vertical-align: middle;
`;

export const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const AuthorLogoMark = styled.img`
  width: 22px;
  height: 22px;
  margin-left: 6px;
  border-radius: 50%;
  object-fit: contain;
  vertical-align: middle;
  filter: drop-shadow(0 0 8px rgba(96, 192, 240, 0.55));
`;

export const PostType = styled.span<{ $type: string }>`
  height: 24px;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: 12px;
  border: 1px solid ${props => {
    const map: Record<string, string> = {
      default: 'rgba(255,255,255,0.5)',
      primary: 'var(--accent-primary, #60C0F0)',
      success: 'var(--success, #4ade80)',
      warning: 'var(--warning, #fbbf24)',
      secondary: 'var(--accent-purple, #c084fc)',
    };
    return map[props.$type] || map.default;
  }};
  color: ${props => {
    const map: Record<string, string> = {
      default: 'rgba(255,255,255,0.5)',
      primary: 'var(--accent-primary, #60C0F0)',
      success: 'var(--success, #4ade80)',
      warning: 'var(--warning, #fbbf24)',
      secondary: 'var(--accent-purple, #c084fc)',
    };
    return map[props.$type] || map.default;
  }};
  white-space: nowrap;
  line-height: 1;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
`;

export const UserName = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #FFFFFF);
  display: block;
  line-height: 1.2;
  letter-spacing: -0.01em;
`;

export const TimeAgoText = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted, #A0A0B0);
  display: block;
  margin-top: 2px;
`;

export const HeaderRightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Menu / Dropdown
// ─────────────────────────────────────────────────────────────

export const MenuWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

export const DropdownMenu = styled.div`
  position: absolute;
  top: 100%; right: 0;
  z-index: 100;
  min-width: 160px;
  background: var(--bg-surface, #001840);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 0;
  margin-top: 4px;
`;

export const DropdownMenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 10px 16px;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  color: ${props => props.$danger ? 'var(--danger, #ef4444)' : 'rgba(255, 255, 255, 0.8)'};
  min-height: 44px;
  line-height: 1.5;
  transition: background 0.15s ease;
  &:hover {
    background: ${props => props.$danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.06)'};
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Content Area
// ─────────────────────────────────────────────────────────────

export const PostContentArea = styled.div`
  padding: 0 16px 16px;
  @media (min-width: 768px) { padding: 0 20px 20px; }
`;

export const PostText = styled.p`
  margin: 0 0 16px 0;
  white-space: pre-wrap;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--text-secondary, #E0E0E0);
  word-wrap: break-word;
`;

export const WorkoutStatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 16px 0;
  padding: 16px;
  background: rgba(96, 192, 240, 0.08);
  border-radius: 10px;
  border-left: 3px solid var(--accent-primary, #60C0F0);
`;

export const WorkoutStatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

export const StatValue = styled.span`
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
`;

export const StatLabel = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

/**
 * Before/after comparison, overlaid and clipped — the same mechanism the
 * dashboard's TransformationPhotoShowcase uses, driven by useBeforeAfterSlider.
 * Previously these were laid out side-by-side at a permanent 50% opacity with a
 * decorative handle that had no interaction wired to it.
 */
export const TransformationImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 260px;
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: col-resize;
  user-select: none;
  touch-action: pan-y;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const TransformationImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
`;

/** Single-photo case: nothing to compare, so it is not an interactive track. */
export const TransformationSingleImageFrame = styled(TransformationImageContainer)`
  cursor: default;
`;

/** The "after" half, revealed by clipping against the shared slider variable. */
export const TransformationAfterImage = styled(TransformationImage)`
  clip-path: inset(0 0 0 var(--swan-slider-pos, 50%));
`;

export const TransformationSlider = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--swan-slider-pos, 50%);
  width: 3px;
  background: var(--accent-primary, #60C0F0);
  z-index: 10;
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--bg-elevated, #141419);
    border: 2px solid var(--accent-primary, #60C0F0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }
`;

export const TransformationEdgeLabel = styled.span<{ $side: 'left' | 'right' }>`
  position: absolute;
  bottom: 12px;
  ${({ $side }) => $side}: 12px;
  z-index: 11;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #fff; /* swan-guard-allow-hex sits on a fixed rgba(0,0,0,0.6) scrim, not a themed surface */
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  pointer-events: none;
`;

export const TryWorkoutButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, var(--accent-warm, #ff6b35), var(--accent-warm-end, #f7931e));
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  margin-top: 12px;
  text-transform: none;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: inherit;
  min-height: 44px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  transition: all 0.2s ease;
  &:hover {
    background: linear-gradient(135deg, var(--accent-warm-hover, #e85a2b), var(--accent-warm-hover-end, #e0851a));
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
  }
`;

export const CenteredFlex = styled.div`
  display: flex;
  justify-content: center;
`;

export const AchievementBadge = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 12px 16px;
  background: linear-gradient(
    135deg,
    var(--accent-gold, #C6A84B),
    color-mix(in srgb, var(--accent-gold, #C6A84B) 72%, var(--accent-primary, #60C0F0))
  );
  border-radius: 12px;
  margin: 16px 0;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 70%, transparent);
  color: var(--bg-base, #000B18);
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const AchievementTextBlock = styled.div`
  flex: 1;
`;

export const AchievementTitle = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: var(--bg-base, #000B18);
  display: block;
`;

export const AchievementDescription = styled.span`
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--bg-base, #000B18) 78%, transparent);
  display: block;
`;

export const AchievementSummaryDetails = styled.span`
  display: block;
  margin: -8px 0 16px;
  padding: 0 4px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(224, 236, 244, 0.86);
`;

export const PointsChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 16px;
  background: var(--bg-base, #000B18);
  color: var(--accent-gold, #C6A84B);
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Actions Bar
// ─────────────────────────────────────────────────────────────

export const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0;
`;

export const CardActionsBar = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  @media (min-width: 768px) { padding: 12px 20px; }
`;

export const ActionButton = styled.button<{ $active?: boolean; $activeColor?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-transform: none;
  font-weight: 600;
  font-size: 14px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 22px;
  color: ${props => props.$active ? (props.$activeColor || 'var(--danger, #f44336)') : 'var(--text-muted, #A0A0B0)'};
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: ${props => props.$active ? (props.$activeColor || 'var(--danger, #f44336)') : 'var(--text-primary, #FFFFFF)'};
  }

  &:active svg {
    animation: ${springScale} 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  @media (prefers-reduced-motion: reduce) {
    &:active svg { animation: none; }
  }
`;

export const ReactionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const IconBtn = styled.button<{ $size?: number; $color?: string; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.$size || 40}px;
  height: ${props => props.$size || 40}px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: ${props => props.$disabled ? 'default' : 'pointer'};
  color: ${props => props.$disabled ? 'rgba(255,255,255,0.2)' : (props.$color || 'rgba(255, 255, 255, 0.5)')};
  padding: 0;
  transition: background-color 0.2s;
  flex-shrink: 0;
  &:hover {
    background: ${props => props.$disabled ? 'transparent' : 'rgba(255, 255, 255, 0.06)'};
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Comments
// ─────────────────────────────────────────────────────────────

export const CommentsSection = styled.div`
  padding: 16px;
  background: rgba(0, 0, 0, 0.15);
`;

export const CommentsList = styled.div`
  margin-top: 16px;
`;

export const CommentItem = styled.div`
  display: flex;
  margin-bottom: 12px;
  gap: 12px;
`;

export const CommentInput = styled.div`
  display: flex;
  margin-top: 16px;
  gap: 12px;
  align-items: center;
`;

export const CommentBubble = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 8px 12px;
`;

export const CommentAuthor = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  display: block;
`;

export const CommentBody = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.75);
  display: block;
`;

export const CommentTime = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  margin-left: 8px;
  display: block;
`;

export const CommentTextarea = styled.textarea`
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: none;
  outline: none;
  min-height: 36px;
  max-height: 120px;
  line-height: 1.4;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 1px rgba(96, 192, 240, 0.3);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

export const NoCommentsText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  margin: 16px 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Toast & Point Notification
// ─────────────────────────────────────────────────────────────

export const Toast = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--accent-gold-end, #d4b85a));
  color: var(--obsidian-black, #000B18);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: ${props => props.$visible ? toastSlideIn : toastSlideOut} 0.3s ease forwards;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

export const ToastCloseBtn = styled.button`
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-left: 8px;
  &:hover { background: rgba(255, 255, 255, 0.2); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Share Dialog / Modal
// ─────────────────────────────────────────────────────────────

export const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ModalContent = styled.div`
  background: var(--bg-surface, #001840);
  border-radius: 12px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

export const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
  padding: 16px 24px;
  color: rgba(255, 255, 255, 0.95);
`;

export const ModalBody = styled.div`
  padding: 0 24px 16px;
`;

export const ModalBodyText = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 16px 0;
  color: rgba(255, 255, 255, 0.75);
`;

export const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px 16px;
`;

export const ModalInputReadonly = styled.input`
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: var(--accent-primary, #60C0F0); }
`;

export const PlainButton = styled.button`
  border: none;
  background: transparent;
  padding: 6px 16px;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  border-radius: 8px;
  min-height: 44px;
  color: rgba(255, 255, 255, 0.5);
  transition: background-color 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.06); }
`;

export const ContainedButton = styled.button`
  border: none;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--arctic-cyan, #50A0F0));
  color: var(--text-on-accent, #fff);
  padding: 6px 16px;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  border-radius: 8px;
  min-height: 44px;
  font-weight: 500;
  transition: all 0.2s;
  &:hover { box-shadow: 0 0 12px rgba(96, 192, 240, 0.4); }
`;

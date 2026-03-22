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

import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// PURPOSE: All PostCard animations (entry, toast, reactions, points)
// ─────────────────────────────────────────────────────────────

export const pointEarnAnimation = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

export const toastSlideIn = keyframes`
  from { transform: translateX(-50%) translateY(20px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
`;

export const toastSlideOut = keyframes`
  from { transform: translateX(-50%) translateY(0); opacity: 1; }
  to { transform: translateX(-50%) translateY(20px); opacity: 0; }
`;

export const breathe = keyframes`
  0% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.02); }
  100% { opacity: 0.5; transform: scale(1); }
`;

export const slideUpFade = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const springScale = keyframes`
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
  max-width: 680px;
  margin-bottom: 12px;
  background: #111122;
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
  background-color: #002060;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  ${props => props.$hasImage ? `
    background-image: ${props.$gradient}, url(${props.$bgImage});
    background-size: cover;
    background-position: center;
    &::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 40%;
      background: linear-gradient(to bottom, rgba(17, 17, 34, 0) 0%, #111122 100%);
      pointer-events: none;
    }
  ` : `
    background: radial-gradient(circle at top right, rgba(139, 92, 246, 0.15), transparent 50%),
                radial-gradient(circle at bottom left, rgba(96, 192, 240, 0.1), transparent 50%);
  `}
`;

export const SwanWatermark = styled.div`
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.6;
  animation: ${breathe} 4s ease-in-out infinite;
  pointer-events: none;
`;

export const PostTypeIndicator = styled.div<{ $postType: string }>`
  position: absolute;
  top: 12px; right: 12px;
  pointer-events: none;
  background: ${props =>
    props.$postType === 'workout' ? 'linear-gradient(135deg, #003080, #60C0F0)' :
    props.$postType === 'transformation' ? 'linear-gradient(135deg, #e91e63, #f06292)' :
    props.$postType === 'achievement' ? 'linear-gradient(135deg, #ff9800, #ffb74d)' :
    props.$postType === 'challenge' ? 'linear-gradient(135deg, #9c27b0, #ba68c8)' :
    props.$postType === 'dance' ? 'linear-gradient(135deg, #ec4899, #f472b6)' :
    props.$postType === 'music' ? 'linear-gradient(135deg, #a855f7, #c084fc)' :
    props.$postType === 'singing' ? 'linear-gradient(135deg, #f472b6, #fb7185)' :
    props.$postType === 'art' ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' :
    props.$postType === 'gaming' ? 'linear-gradient(135deg, #22c55e, #4ade80)' :
    props.$postType === 'comedy' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
    'linear-gradient(135deg, #757575, #9e9e9e)'
  };
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 1;
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

export const AvatarStyled = styled.div<{ $size?: number }>`
  width: ${props => props.$size || 44}px;
  height: ${props => props.$size || 44}px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8B5CF6, #8B5CF6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => (props.$size || 44) * 0.35}px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(96, 192, 240, 0.3);
`;

export const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
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
      primary: '#60C0F0',
      success: '#4ade80',
      warning: '#fbbf24',
      secondary: '#c084fc',
    };
    return map[props.$type] || map.default;
  }};
  color: ${props => {
    const map: Record<string, string> = {
      default: 'rgba(255,255,255,0.5)',
      primary: '#60C0F0',
      success: '#4ade80',
      warning: '#fbbf24',
      secondary: '#c084fc',
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
  color: #FFFFFF;
  display: block;
  line-height: 1.2;
  letter-spacing: -0.01em;
`;

export const TimeAgoText = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: #A0A0B0;
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
  background: #001840;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 0;
  margin-top: 4px;
`;

export const DropdownMenuItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  min-height: 44px;
  line-height: 1.5;
  &:hover { background: rgba(255, 255, 255, 0.06); }
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
  color: #E0E0E0;
  word-wrap: break-word;
`;

export const PostMedia = styled.img`
  width: 100%;
  max-height: 450px;
  object-fit: cover;
  border-radius: 8px;
`;

export const WorkoutStatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 16px 0;
  padding: 16px;
  background: rgba(96, 192, 240, 0.08);
  border-radius: 10px;
  border-left: 3px solid #60C0F0;
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

export const TransformationImageContainer = styled.div`
  display: flex;
  gap: 8px;
  margin: 16px 0;
  position: relative;
`;

export const TransformationImage = styled.img`
  flex: 1;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
  &:hover { transform: scale(1.02); }
`;

export const TransformationSlider = styled.div`
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 50%;
  width: 40px; height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { transform: translate(-50%, -50%) scale(1.1); }
`;

export const TryWorkoutButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
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
    background: linear-gradient(135deg, #e85a2b, #e0851a);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
  }
`;

export const CenteredFlex = styled.div`
  display: flex;
  justify-content: center;
`;

export const AchievementBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ffd700, #ffed4a);
  border-radius: 12px;
  margin: 16px 0;
  border: 2px solid #f7b32b;
`;

export const AchievementTextBlock = styled.div`
  flex: 1;
`;

export const AchievementTitle = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: #8b4513;
  display: block;
`;

export const AchievementDescription = styled.span`
  font-size: 0.875rem;
  color: #8b4513;
  display: block;
`;

export const PointsChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 16px;
  background: #f7b32b;
  color: white;
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
  color: ${props => props.$active ? (props.$activeColor || '#f44336') : '#A0A0B0'};
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: ${props => props.$active ? (props.$activeColor || '#f44336') : '#FFFFFF'};
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
    border-color: #60C0F0;
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

export const PointNotificationChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  background: linear-gradient(135deg, #C6A84B, #d4b85a);
  color: #000B18;
  font-weight: bold;
  font-size: 0.8125rem;
  animation: ${pointEarnAnimation} 2s ease-out;
`;

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
  background: linear-gradient(135deg, #C6A84B, #d4b85a);
  color: #000B18;
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
  background: #001840;
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
  &:focus { border-color: #60C0F0; }
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
  background: linear-gradient(135deg, #60C0F0, #50A0F0);
  color: #fff;
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

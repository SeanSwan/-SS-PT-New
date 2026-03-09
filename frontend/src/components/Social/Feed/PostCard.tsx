import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Share,
  MoreVertical,
  Award,
  Dumbbell,
  Trophy,
  User,
  Send,
  Camera,
  Target,
  Zap,
  Star,
  Clock,
  Flame,
  Weight,
  Play,
  X,
  Music2,
  Mic2,
  Palette,
  Gamepad2,
  ThumbsUp,
  Heart,
  Mic,
  Laugh,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCelebrationTriggers } from '../../../hooks/useCelebrationTriggers';
import styled, { keyframes } from 'styled-components';
import SwanIcon from '../SwanIcon';

// ─── Keyframes ──────────────────────────────────────────────────
const pointEarnAnimation = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const toastSlideIn = keyframes`
  from { transform: translateX(-50%) translateY(20px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
`;

const toastSlideOut = keyframes`
  from { transform: translateX(-50%) translateY(0); opacity: 1; }
  to { transform: translateX(-50%) translateY(20px); opacity: 0; }
`;

// ─── Unsplash category backgrounds (free hotlink) ───────────────
const CATEGORY_BACKGROUNDS: Record<string, string> = {
  workout: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=60&auto=format&fit=crop',
  transformation: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=60&auto=format&fit=crop',
  achievement: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=60&auto=format&fit=crop',
  challenge: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=60&auto=format&fit=crop',
  dance: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=60&auto=format&fit=crop',
  music: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=60&auto=format&fit=crop',
  singing: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=60&auto=format&fit=crop',
  art: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=60&auto=format&fit=crop',
  gaming: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=60&auto=format&fit=crop',
  comedy: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=60&auto=format&fit=crop',
  creative: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=60&auto=format&fit=crop',
};

// Category gradient overlays (dark enough for text readability)
const CATEGORY_GRADIENTS: Record<string, string> = {
  workout: 'linear-gradient(135deg, rgba(25,118,210,0.7) 0%, rgba(10,10,26,0.85) 100%)',
  transformation: 'linear-gradient(135deg, rgba(233,30,99,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  achievement: 'linear-gradient(135deg, rgba(255,152,0,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  challenge: 'linear-gradient(135deg, rgba(156,39,176,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  dance: 'linear-gradient(135deg, rgba(236,72,153,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  music: 'linear-gradient(135deg, rgba(168,85,247,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  singing: 'linear-gradient(135deg, rgba(244,114,182,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  art: 'linear-gradient(135deg, rgba(245,158,11,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  gaming: 'linear-gradient(135deg, rgba(34,197,94,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  comedy: 'linear-gradient(135deg, rgba(251,191,36,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  creative: 'linear-gradient(135deg, rgba(139,92,246,0.6) 0%, rgba(10,10,26,0.85) 100%)',
  general: 'linear-gradient(135deg, rgba(120,81,169,0.5) 0%, rgba(10,10,26,0.9) 100%)',
};

// Swan watermark SVG path for posts without images
const SWAN_PATH = 'M8 3C7 3 6 4 6 5C6 6 7 7 8 7C9 7 10 8 10 10C10 12 9 14 8 15C7 16 6 17 5 18C4 19 4 20 5 21C6 22 8 22 10 21C12 20 14 19 16 18C18 17 20 15 20 13C20 11 19 9 17 8C15 7 13 8 12 10C12 8 11 6 10 5C9 4 8.5 3 8 3Z';

const breathe = keyframes`
  0% { opacity: 0.06; transform: scale(1); }
  50% { opacity: 0.12; transform: scale(1.02); }
  100% { opacity: 0.06; transform: scale(1); }
`;

// ─── Styled Components ──────────────────────────────────────────

const slideUpFade = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PostCardWrapper = styled.article`
  width: 100%;
  max-width: 680px;
  margin-bottom: 12px;
  background: #111122;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  overflow: hidden;

  /* Mobile first: flush edges */
  border-radius: 0;
  border-left: none;
  border-right: none;

  /* Entry animation */
  opacity: 0;
  animation: ${slideUpFade} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  @media (min-width: 768px) {
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 24px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.05);
      border-color: rgba(0, 255, 255, 0.15);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    &:hover { transform: none; }
  }
`;

const HeroArea = styled.div<{ $bgImage?: string; $gradient: string; $hasImage: boolean }>`
  position: relative;
  width: 100%;
  height: clamp(240px, 40vw, 360px);
  background-color: #0a0a1a;
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
      bottom: 0;
      left: 0;
      right: 0;
      height: 40%;
      background: linear-gradient(to bottom, rgba(17, 17, 34, 0) 0%, #111122 100%);
      pointer-events: none;
    }
  ` : `
    background: radial-gradient(circle at top right, rgba(120, 81, 169, 0.15), transparent 50%),
                radial-gradient(circle at bottom left, rgba(0, 255, 255, 0.1), transparent 50%);
  `}
`;

const SwanWatermark = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.05;
  mix-blend-mode: screen;
  animation: ${breathe} 4s ease-in-out infinite;
  pointer-events: none;
`;

const PostHeaderRelative = styled.div`
  position: relative;
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;

  @media (min-width: 768px) {
    padding: 16px 20px;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AvatarStyled = styled.div<{ $size?: number }>`
  width: ${props => props.$size || 44}px;
  height: ${props => props.$size || 44}px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7851A9, #8B5CF6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => (props.$size || 44) * 0.35}px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(0, 255, 255, 0.3);
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// Post type color map for chip borders/text
const chipColorMap: Record<string, string> = {
  default: 'rgba(255,255,255,0.5)',
  primary: '#60C0F0',
  success: '#4ade80',
  warning: '#fbbf24',
  secondary: '#c084fc',
};

const PostType = styled.span<{ $type: string }>`
  height: 24px;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: 12px;
  border: 1px solid ${props => chipColorMap[props.$type] || chipColorMap.default};
  color: ${props => chipColorMap[props.$type] || chipColorMap.default};
  white-space: nowrap;
  line-height: 1;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
`;

const PostContent = styled.div`
  padding: 0 16px 16px;

  @media (min-width: 768px) {
    padding: 0 20px 20px;
  }
`;

const PostText = styled.p`
  margin: 0 0 16px 0;
  white-space: pre-wrap;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  color: #E0E0E0;
  word-wrap: break-word;
`;

const PostMedia = styled.img`
  width: 100%;
  max-height: 450px;
  object-fit: cover;
  border-radius: 8px;
`;

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0;
`;

const CardActionsBar = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;

  @media (min-width: 768px) {
    padding: 12px 20px;
  }
`;

const springScale = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(0.85); }
  75% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const ActionButton = styled.button<{ $active?: boolean; $activeColor?: string }>`
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

const ReactionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const IconBtn = styled.button<{ $size?: number; $color?: string; $disabled?: boolean }>`
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

const CommentsList = styled.div`
  margin-top: 16px;
`;

const CommentItem = styled.div`
  display: flex;
  margin-bottom: 12px;
  gap: 12px;
`;

const CommentInput = styled.div`
  display: flex;
  margin-top: 16px;
  gap: 12px;
  align-items: center;
`;

const CommentBubble = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 8px 12px;
`;

const CommentAuthor = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  display: block;
`;

const CommentBody = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.75);
  display: block;
`;

const CommentTime = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  margin-left: 8px;
  display: block;
`;

const CommentTextarea = styled.textarea`
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

const PointNotificationChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  color: white;
  font-weight: bold;
  font-size: 0.8125rem;
  animation: ${pointEarnAnimation} 2s ease-out;
`;

const WorkoutStatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 16px 0;
  padding: 16px;
  background: rgba(96, 192, 240, 0.08);
  border-radius: 10px;
  border-left: 3px solid #60C0F0;
`;

const WorkoutStatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const StatValue = styled.span`
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

const TransformationImageContainer = styled.div`
  display: flex;
  gap: 8px;
  margin: 16px 0;
  position: relative;
`;

const TransformationImage = styled.img`
  flex: 1;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.02);
  }
`;

const TransformationSlider = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
  }
`;

const TryWorkoutButton = styled.button`
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

const CenteredFlex = styled.div`
  display: flex;
  justify-content: center;
`;

const AchievementBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ffd700, #ffed4a);
  border-radius: 12px;
  margin: 16px 0;
  border: 2px solid #f7b32b;
`;

const AchievementTextBlock = styled.div`
  flex: 1;
`;

const AchievementTitle = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: #8b4513;
  display: block;
`;

const AchievementDescription = styled.span`
  font-size: 0.875rem;
  color: #8b4513;
  display: block;
`;

const PointsChip = styled.span`
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

const PostTypeIndicator = styled.div<{ $postType: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  pointer-events: none;
  background: ${props =>
    props.$postType === 'workout' ? 'linear-gradient(135deg, #1976d2, #42a5f5)' :
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

const UserName = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  display: block;
  line-height: 1.2;
  letter-spacing: -0.01em;
`;

const TimeAgoText = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: #A0A0B0;
  display: block;
  margin-top: 2px;
`;

const HeaderRightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CommentsSection = styled.div`
  padding: 16px;
  background: rgba(0, 0, 0, 0.15);
`;

const NoCommentsText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  margin: 16px 0;
`;

// ─── Menu / Dropdown ──────────────────────────────────────────────

const MenuWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  min-width: 160px;
  background: #1a1a2e;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 0;
  margin-top: 4px;
`;

const DropdownMenuItem = styled.button`
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

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

// ─── Dialog / Modal Overlay ──────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalContent = styled.div`
  background: #1a1a2e;
  border-radius: 12px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
  padding: 16px 24px;
  color: rgba(255, 255, 255, 0.95);
`;

const ModalBody = styled.div`
  padding: 0 24px 16px;
`;

const ModalBodyText = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 16px 0;
  color: rgba(255, 255, 255, 0.75);
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px 16px;
`;

const ModalInputReadonly = styled.input`
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

  &:focus {
    border-color: #60C0F0;
  }
`;

const PlainButton = styled.button`
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

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

const ContainedButton = styled.button`
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

  &:hover {
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.4);
  }
`;

// ─── Toast Notification ──────────────────────────────────────────

const Toast = styled.div<{ $visible: boolean }>`
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
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: ${props => props.$visible ? toastSlideIn : toastSlideOut} 0.3s ease forwards;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
`;

const ToastCloseBtn = styled.button`
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

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

// ─── Post type icons mapped to their components ─────────────────

const postTypeIcons: Record<string, React.ElementType> = {
  general: User,
  workout: Dumbbell,
  achievement: Award,
  challenge: Trophy,
  transformation: Camera,
  dance: Music2,
  music: Mic2,
  singing: Mic,
  art: Palette,
  gaming: Gamepad2,
  comedy: Laugh,
  creative: Star,
};

// Post type labels
const postTypeLabels: Record<string, string> = {
  general: 'Post',
  workout: 'Workout',
  achievement: 'Achievement',
  challenge: 'Challenge',
  transformation: 'Transformation',
  dance: 'Dance',
  music: 'Music Production',
  singing: 'Singing',
  art: 'Art',
  gaming: 'Gaming',
  comedy: 'Comedy',
  creative: 'Creative',
};

// Post type colors
const postTypeColors: Record<string, string> = {
  general: 'default',
  workout: 'primary',
  achievement: 'success',
  challenge: 'warning',
  transformation: 'secondary',
  dance: 'secondary',
  music: 'secondary',
  singing: 'secondary',
  art: 'warning',
  gaming: 'success',
  comedy: 'warning',
  creative: 'primary',
};

// ─── Interfaces ─────────────────────────────────────────────────

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
  };
}

interface Post {
  id: string;
  content: string;
  type: 'general' | 'workout' | 'achievement' | 'challenge' | 'transformation';
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  reactionCounts?: { thumbs_up: number; heart: number; swan: number };
  userReactions?: string[];
  mediaUrl?: string;
  comments?: Comment[];
  workoutData?: {
    duration?: string;
    exerciseCount?: string;
    totalWeight?: string;
    caloriesBurned?: string;
  };
  transformationData?: {
    hasBeforeImage?: boolean;
    hasAfterImage?: boolean;
    beforeImageUrl?: string;
    afterImageUrl?: string;
  };
  achievementData?: {
    title?: string;
    description?: string;
    points?: number;
  };
  challengeData?: {
    title?: string;
    difficulty?: string;
    duration?: string;
  };
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onReact?: (postId: string, reactionType: string) => void;
  onRemoveReaction?: (postId: string, reactionType: string) => void;
  onComment: (postId: string, content: string) => void;
}

// ─── Avatar helper component ────────────────────────────────────

const AvatarEl: React.FC<{ src?: string; alt: string; fallback: string; size?: number }> = ({ src, alt, fallback, size }) => (
  <AvatarStyled $size={size} title={alt}>
    {src ? <AvatarImage src={src} alt={alt} /> : fallback}
  </AvatarStyled>
);

// ─── PostCard Component ─────────────────────────────────────────

/**
 * PostCard Component
 * Displays a single post in the social feed
 */
const PostCard: React.FC<PostCardProps> = ({ post, onLike, onReact, onRemoveReaction, onComment, ...rest }) => {
  // Celebration system
  const { triggerFromResult } = useCelebrationTriggers();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showPointNotification, setShowPointNotification] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [transformationSliderValue, setTransformationSliderValue] = useState(50);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Toast visibility (for animation)
  const [toastVisible, setToastVisible] = useState(false);

  // Get the appropriate icon for the post type
  const PostTypeIcon = postTypeIcons[post.type] || User;

  // Format time ago
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Sync toast visibility with notification state
  useEffect(() => {
    if (showPointNotification) {
      setToastVisible(true);
    }
  }, [showPointNotification]);

  // Reaction helpers
  const userReactions = post.userReactions || [];
  const reactionCounts = post.reactionCounts || { thumbs_up: 0, heart: 0, swan: 0 };

  const handleReaction = async (reactionType: string, event?: React.MouseEvent) => {
    const isActive = userReactions.includes(reactionType);
    let result: any;

    if (isActive && onRemoveReaction) {
      result = await onRemoveReaction(post.id, reactionType);
    } else if (!isActive && onReact) {
      result = await onReact(post.id, reactionType);
    } else {
      // Fallback to legacy onLike
      result = await (onLike as any)(post.id);
    }

    // Fire celebration effect at click position
    if (result && result.pointsAwarded) {
      triggerFromResult(result, event);
      setPointsEarned(result.pointsAwarded);
      setShowPointNotification(true);
      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
        setTimeout(() => setShowPointNotification(false), 300);
      }, 3000);
    }
  };

  // Handle try workout action
  const handleTryWorkout = () => {
    // This would integrate with the workout generator in a real implementation
    console.log('Opening workout generator with this workout as template...');
  };

  // Render workout stats
  const renderWorkoutStats = () => {
    if (!post.workoutData) return null;

    const stats = [
      { icon: Clock, label: 'Duration', value: post.workoutData.duration, unit: 'min' },
      { icon: Dumbbell, label: 'Exercises', value: post.workoutData.exerciseCount, unit: '' },
      { icon: Weight, label: 'Total Weight', value: post.workoutData.totalWeight, unit: 'lbs' },
      { icon: Flame, label: 'Calories', value: post.workoutData.caloriesBurned, unit: '' }
    ].filter(stat => stat.value && stat.value.trim());

    if (stats.length === 0) return null;

    return (
      <WorkoutStatsContainer>
        {stats.map(({ icon: Icon, label, value, unit }) => (
          <WorkoutStatItem key={label}>
            <Icon size={20} color="#60C0F0" />
            <StatValue>
              {value}{unit}
            </StatValue>
            <StatLabel>
              {label}
            </StatLabel>
          </WorkoutStatItem>
        ))}
      </WorkoutStatsContainer>
    );
  };

  // Render transformation images
  const renderTransformationImages = () => {
    if (!post.transformationData) return null;

    return (
      <TransformationImageContainer>
        {post.transformationData.beforeImageUrl && (
          <TransformationImage
            src={post.transformationData.beforeImageUrl}
            alt="Before transformation"
            style={{ opacity: transformationSliderValue / 100 }}
          />
        )}
        {post.transformationData.afterImageUrl && (
          <TransformationImage
            src={post.transformationData.afterImageUrl}
            alt="After transformation"
            style={{ opacity: 1 - (transformationSliderValue / 100) }}
          />
        )}
        <TransformationSlider>
          <Play size={16} />
        </TransformationSlider>
      </TransformationImageContainer>
    );
  };

  // Render achievement badge
  const renderAchievementBadge = () => {
    if (!post.achievementData) return null;

    return (
      <AchievementBadge>
        <Trophy size={24} color="#f7b32b" />
        <AchievementTextBlock>
          <AchievementTitle>
            {post.achievementData.title || 'Achievement Unlocked!'}
          </AchievementTitle>
          <AchievementDescription>
            {post.achievementData.description || 'Reached a new milestone'}
          </AchievementDescription>
        </AchievementTextBlock>
        {post.achievementData.points && (
          <PointsChip>
            <Star size={14} />
            +{post.achievementData.points} pts
          </PointsChip>
        )}
      </AchievementBadge>
    );
  };

  // Handle comment submission
  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
    }
  };

  // Handle key press in comment input
  const handleCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  // Handle menu toggle
  const handleMenuToggle = () => {
    setMenuOpen(prev => !prev);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setMenuOpen(false);
  };

  // Handle overlay click (close share dialog)
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShareDialogOpen(false);
    }
  }, []);

  // Dismiss toast
  const handleDismissToast = () => {
    setToastVisible(false);
    setTimeout(() => setShowPointNotification(false), 300);
  };

  // Determine hero image: user media > category background > none (swan watermark)
  const hasUserMedia = !!post.mediaUrl && post.type !== 'transformation';
  const categoryBg = CATEGORY_BACKGROUNDS[post.type];
  const heroImage = hasUserMedia ? post.mediaUrl : categoryBg;
  const gradient = CATEGORY_GRADIENTS[post.type] || CATEGORY_GRADIENTS.general;

  return (
    <>
      <PostCardWrapper>
        {/* Hero Image Area — always visible */}
        <HeroArea $bgImage={heroImage} $gradient={gradient} $hasImage={!!heroImage}>
          {/* Swan watermark when no image at all */}
          {!heroImage && (
            <SwanWatermark>
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d={SWAN_PATH} fill="#FFFFFF" stroke="none" />
                <circle cx="7.5" cy="5" r="0.8" fill="#FFFFFF" />
              </svg>
            </SwanWatermark>
          )}

          <PostTypeIndicator $postType={post.type}>
            <PostTypeIcon size={12} />
            {postTypeLabels[post.type]}
          </PostTypeIndicator>
        </HeroArea>

        <PostHeaderRelative>
          <PostHeader>
            <UserInfo>
              <AvatarEl
                src={post.user.photo || undefined}
                alt={`${post.user.firstName} ${post.user.lastName}`}
                fallback={`${post.user.firstName[0]}${post.user.lastName[0]}`}
              />
              <div>
                <UserName>
                  {post.user.firstName} {post.user.lastName}
                </UserName>
                <TimeAgoText>
                  {timeAgo}
                </TimeAgoText>
              </div>
            </UserInfo>

            <HeaderRightGroup>
              <PostType $type={postTypeColors[post.type] || 'default'}>
                <PostTypeIcon size={14} />
                {postTypeLabels[post.type]}
              </PostType>

              <MenuWrapper ref={menuRef}>
                <IconBtn onClick={handleMenuToggle} title="More options">
                  <MoreVertical size={20} />
                </IconBtn>

                {menuOpen && (
                  <DropdownMenu>
                    <DropdownMenuItem onClick={() => { handleMenuClose(); }}>
                      Report Post
                    </DropdownMenuItem>
                    {user && user.id === post.user.id && (
                      <DropdownMenuItem onClick={() => { handleMenuClose(); }}>
                        Delete Post
                      </DropdownMenuItem>
                    )}
                  </DropdownMenu>
                )}
              </MenuWrapper>
            </HeaderRightGroup>
          </PostHeader>
        </PostHeaderRelative>

        <PostContent>
          {/* Achievement Badge */}
          {post.type === 'achievement' && renderAchievementBadge()}

          <PostText>
            {post.content}
          </PostText>

          {/* Workout Stats */}
          {post.type === 'workout' && renderWorkoutStats()}

          {/* Transformation Images */}
          {post.type === 'transformation' && renderTransformationImages()}

          {/* Try Workout Button for Workout Posts */}
          {post.type === 'workout' && (
            <CenteredFlex>
              <TryWorkoutButton onClick={handleTryWorkout}>
                <Zap size={16} />
                Try This Workout
              </TryWorkoutButton>
            </CenteredFlex>
          )}
        </PostContent>

        <StyledDivider />

        <CardActionsBar>
          <ReactionGroup>
            <ActionButton
              $active={userReactions.includes('thumbs_up')}
              $activeColor="#60C0F0"
              onClick={(e) => handleReaction('thumbs_up', e)}
              title="Like"
              aria-label="Like post"
            >
              <ThumbsUp
                size={20}
                fill={userReactions.includes('thumbs_up') ? '#60C0F0' : 'none'}
                stroke={userReactions.includes('thumbs_up') ? 'none' : '#60C0F0'}
                strokeWidth={2}
              />
              {reactionCounts.thumbs_up > 0 && reactionCounts.thumbs_up}
            </ActionButton>

            <ActionButton
              $active={userReactions.includes('heart')}
              $activeColor="#EC4899"
              onClick={(e) => handleReaction('heart', e)}
              title="Love"
              aria-label="Love post"
            >
              <Heart
                size={20}
                fill={userReactions.includes('heart') ? '#EC4899' : 'none'}
                stroke={userReactions.includes('heart') ? 'none' : '#EC4899'}
                strokeWidth={2}
              />
              {reactionCounts.heart > 0 && reactionCounts.heart}
            </ActionButton>

            <ActionButton
              $active={userReactions.includes('swan')}
              $activeColor="#8B5CF6"
              onClick={(e) => handleReaction('swan', e)}
              title="Swan Elevate"
              aria-label="Swan post"
            >
              <SwanIcon size={20} elevated={userReactions.includes('swan')} />
              {reactionCounts.swan > 0 && reactionCounts.swan}
            </ActionButton>
          </ReactionGroup>

          <ActionButton
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare size={18} />
            {post.commentsCount} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
          </ActionButton>

          <ActionButton
            onClick={() => setShareDialogOpen(true)}
          >
            <Share size={18} />
            Share
          </ActionButton>
        </CardActionsBar>

        {showComments && (
          <>
            <StyledDivider />
            <CommentsSection>
              {/* Comments List */}
              {post.comments && post.comments.length > 0 ? (
                <CommentsList>
                  {post.comments.map(comment => (
                    <CommentItem key={comment.id}>
                      <AvatarEl
                        src={comment.user.photo || undefined}
                        alt={`${comment.user.firstName} ${comment.user.lastName}`}
                        fallback={`${comment.user.firstName[0]}${comment.user.lastName[0]}`}
                        size={32}
                      />
                      <div style={{ flex: 1 }}>
                        <CommentBubble>
                          <CommentAuthor>
                            {comment.user.firstName} {comment.user.lastName}
                          </CommentAuthor>
                          <CommentBody>
                            {comment.content}
                          </CommentBody>
                        </CommentBubble>
                        <CommentTime>
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </CommentTime>
                      </div>
                    </CommentItem>
                  ))}
                </CommentsList>
              ) : (
                <NoCommentsText>
                  No comments yet. Be the first to comment!
                </NoCommentsText>
              )}

              {/* Comment Input */}
              <CommentInput>
                <AvatarEl
                  src={user?.photo || undefined}
                  alt={user?.firstName || 'User'}
                  fallback={user?.firstName?.[0] || 'U'}
                  size={32}
                />
                <CommentTextarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleCommentKeyPress}
                  rows={1}
                />
                <IconBtn
                  $color="#60C0F0"
                  $disabled={!commentText.trim()}
                  onClick={handleSubmitComment}
                  title="Send comment"
                >
                  <Send size={20} />
                </IconBtn>
              </CommentInput>
            </CommentsSection>
          </>
        )}

        {/* Share Dialog */}
        {shareDialogOpen && (
          <Overlay onClick={handleOverlayClick}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>Share Post</ModalTitle>
              <ModalBody>
                <ModalBodyText>
                  Share this post with friends or on other platforms.
                </ModalBodyText>
                <ModalInputReadonly
                  readOnly
                  value={`https://swanstudios.com/social/posts/${post.id}`}
                  onFocus={(e) => e.target.select()}
                />
              </ModalBody>
              <ModalActions>
                <PlainButton onClick={() => setShareDialogOpen(false)}>
                  Cancel
                </PlainButton>
                <ContainedButton
                  onClick={() => {
                    navigator.clipboard.writeText(`https://swanstudios.com/social/posts/${post.id}`);
                    setShareDialogOpen(false);
                  }}
                >
                  Copy Link
                </ContainedButton>
              </ModalActions>
            </ModalContent>
          </Overlay>
        )}
      </PostCardWrapper>

      {/* Point Notification Toast */}
      {showPointNotification && (
        <Toast $visible={toastVisible}>
          <Star size={18} />
          You earned {pointsEarned} points!
          <ToastCloseBtn onClick={handleDismissToast} title="Dismiss">
            <X size={14} />
          </ToastCloseBtn>
        </Toast>
      )}
    </>
  );
};

export default PostCard;

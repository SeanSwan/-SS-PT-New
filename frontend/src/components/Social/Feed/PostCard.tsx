import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart,
  MessageSquare,
  Share,
  MoreVertical,
  Award,
  Dumbbell,
  Trophy,
  User,
  Send,
  HeartOff,
  Camera,
  Target,
  Zap,
  Star,
  Clock,
  Flame,
  Weight,
  Play,
  X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import styled, { keyframes } from 'styled-components';

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

// ─── Styled Components ──────────────────────────────────────────

const PostCardWrapper = styled.div`
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  background: #fff;
`;

const PostHeaderRelative = styled.div`
  position: relative;
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AvatarStyled = styled.div<{ $size?: number }>`
  width: ${props => props.$size || 40}px;
  height: ${props => props.$size || 40}px;
  border-radius: 50%;
  background: #bdbdbd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => (props.$size || 40) * 0.35}px;
  font-weight: 500;
  color: #fff;
  overflow: hidden;
  flex-shrink: 0;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// Post type color map for chip borders/text
const chipColorMap: Record<string, string> = {
  default: '#757575',
  primary: '#1976d2',
  success: '#2e7d32',
  warning: '#ed6c02',
  secondary: '#9c27b0',
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
`;

const PostContent = styled.div`
  padding: 0 16px 16px;
`;

const PostText = styled.p`
  margin: 0 0 16px 0;
  white-space: pre-wrap;
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.87);
`;

const PostMedia = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 4px;
`;

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  margin: 0;
`;

const CardActionsBar = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 8px;
  gap: 4px;
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: none;
  font-weight: normal;
  font-size: 0.875rem;
  min-height: 44px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: ${props => props.$active ? '#f44336' : 'rgba(0, 0, 0, 0.54)'};
  transition: background-color 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
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
  color: ${props => props.$disabled ? 'rgba(0,0,0,0.26)' : (props.$color || 'rgba(0, 0, 0, 0.54)')};
  padding: 0;
  transition: background-color 0.2s;
  flex-shrink: 0;

  &:hover {
    background: ${props => props.$disabled ? 'transparent' : 'rgba(0, 0, 0, 0.04)'};
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
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  padding: 8px;
`;

const CommentAuthor = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
  display: block;
`;

const CommentBody = styled.span`
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.87);
  display: block;
`;

const CommentTime = styled.span`
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.54);
  margin-left: 8px;
  display: block;
`;

const CommentTextarea = styled.textarea`
  flex: 1;
  border: 1px solid rgba(0, 0, 0, 0.23);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: none;
  outline: none;
  min-height: 36px;
  max-height: 120px;
  line-height: 1.4;

  &:focus {
    border-color: #1976d2;
    box-shadow: 0 0 0 1px #1976d2;
  }

  &::placeholder {
    color: rgba(0, 0, 0, 0.38);
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
  background: rgba(25, 118, 210, 0.04);
  border-radius: 8px;
  border-left: 4px solid #1976d2;
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
  color: rgba(0, 0, 0, 0.87);
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.54);
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
  background: ${props =>
    props.$postType === 'workout' ? 'linear-gradient(135deg, #1976d2, #42a5f5)' :
    props.$postType === 'transformation' ? 'linear-gradient(135deg, #e91e63, #f06292)' :
    props.$postType === 'achievement' ? 'linear-gradient(135deg, #ff9800, #ffb74d)' :
    props.$postType === 'challenge' ? 'linear-gradient(135deg, #9c27b0, #ba68c8)' :
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
  font-size: 1rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  display: block;
`;

const TimeAgoText = styled.span`
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.54);
  display: block;
`;

const HeaderRightGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CommentsSection = styled.div`
  padding: 16px;
`;

const NoCommentsText = styled.p`
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.54);
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
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
  color: rgba(0, 0, 0, 0.87);
  min-height: 44px;
  line-height: 1.5;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
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
  background: white;
  border-radius: 12px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  overflow: hidden;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
  padding: 16px 24px;
  color: rgba(0, 0, 0, 0.87);
`;

const ModalBody = styled.div`
  padding: 0 24px 16px;
`;

const ModalBodyText = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  margin: 0 0 16px 0;
  color: rgba(0, 0, 0, 0.87);
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px 16px;
`;

const ModalInputReadonly = styled.input`
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.23);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-family: inherit;
  background: #fafafa;
  color: rgba(0, 0, 0, 0.87);
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #1976d2;
  }
`;

const PlainButton = styled.button`
  border: none;
  background: transparent;
  padding: 6px 16px;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  border-radius: 4px;
  min-height: 44px;
  color: rgba(0, 0, 0, 0.54);
  transition: background-color 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
`;

const ContainedButton = styled.button`
  border: none;
  background: #1976d2;
  color: #fff;
  padding: 6px 16px;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  border-radius: 4px;
  min-height: 44px;
  font-weight: 500;
  transition: background-color 0.2s;

  &:hover {
    background: #1565c0;
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

const postTypeIcons = {
  general: User,
  workout: Dumbbell,
  achievement: Award,
  challenge: Trophy,
  transformation: Camera
};

// Post type labels
const postTypeLabels = {
  general: 'Post',
  workout: 'Workout',
  achievement: 'Achievement',
  challenge: 'Challenge',
  transformation: 'Transformation'
};

// Post type colors
const postTypeColors: Record<string, string> = {
  general: 'default',
  workout: 'primary',
  achievement: 'success',
  challenge: 'warning',
  transformation: 'secondary'
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
const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment }) => {
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

  // Handle enhanced like with point notification
  const handleEnhancedLike = async () => {
    const result = await (onLike as any)(post.id);

    // Show point notification if points were earned
    if (result && result.pointsAwarded) {
      setPointsEarned(result.pointsAwarded);
      setShowPointNotification(true);
      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
        // Allow animation to complete before removing from DOM
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
            <Icon size={20} color="#1976d2" />
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

  return (
    <>
      <PostCardWrapper>
        <PostHeaderRelative>
          <PostTypeIndicator $postType={post.type}>
            <PostTypeIcon size={12} />
            {postTypeLabels[post.type]}
          </PostTypeIndicator>

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

          {/* Regular Media */}
          {post.mediaUrl && post.type !== 'transformation' && (
            <PostMedia src={post.mediaUrl} alt="Post image" />
          )}

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
          <ActionButton
            $active={post.isLiked}
            onClick={handleEnhancedLike}
          >
            {post.isLiked ? <Heart size={18} fill="#f44336" stroke="#f44336" /> : <Heart size={18} />}
            {post.likesCount} {post.likesCount === 1 ? 'Like' : 'Likes'}
          </ActionButton>

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
                  $color="#1976d2"
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

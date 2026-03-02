import React, { useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Calendar,
  MessageCircle,
  MoreVertical,
  Heart,
  MessageSquare,
  Share2,
  UserPlus,
  MapPin,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  Dumbbell,
  Trophy,
  Flame,
  Swords,
  Sparkles,
} from 'lucide-react';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';

/* ═══════════════════════════════════════════════════════════════════
   CRYSTALLINE TOKEN MATRIX — Preset F-Alt "Enchanted Apex"
   Every styled-component references T.* — NO hardcoded colors.
   ═══════════════════════════════════════════════════════════════════ */
const T = {
  // ── Surface & Depths ──
  midnightSapphire: '#002060',
  royalDepth:       '#003080',
  swanLavender:     '#4070C0',

  // ── Bioluminescence & Ice ──
  iceWing:          '#60C0F0',
  arcticCyan:       '#50A0F0',

  // ── Luxury & Status ──
  gildedFern:       '#C6A84B',
  frostWhite:       '#E0ECF4',

  // ── Semantic Haptics ──
  success:          '#22C55E',
  warning:          '#F59E0B',
  danger:           '#EF4444',

  // ── Premium Composite Tokens ──
  glassSurface:     'linear-gradient(135deg, rgba(0, 48, 128, 0.45) 0%, rgba(0, 32, 96, 0.25) 100%)',
  glassBorder:      'rgba(198, 168, 75, 0.25)',
  glassHighlight:   'inset 0 1px 1px rgba(224, 236, 244, 0.15)',
  textMuted:        'rgba(224, 236, 244, 0.65)',
};

/* ── Spring Physics ─────────────────────────────────────────────── */
const physics = {
  spring:    { type: 'spring' as const, stiffness: 400, damping: 25, mass: 0.8 },
  snappy:    { type: 'spring' as const, stiffness: 600, damping: 30 },
  glissando: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
};

/* ── Post-type → rarity color map ───────────────────────────────── */
const postTypeMap: Record<string, { color: string; label: string; Icon: React.FC<{ size?: number }> }> = {
  workout:        { color: T.gildedFern,  label: 'Workout',        Icon: Dumbbell },
  achievement:    { color: T.iceWing,     label: 'Achievement',    Icon: Trophy },
  challenge:      { color: T.swanLavender, label: 'Challenge',     Icon: Swords },
  transformation: { color: T.danger,      label: 'Transformation', Icon: Flame },
  general:        { color: T.arcticCyan,  label: 'Post',           Icon: Sparkles },
};

/* ═══════════════════════════════════════════════════════════════════
   KEYFRAME ANIMATIONS
   ═══════════════════════════════════════════════════════════════════ */
const auroraShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const heartPop = keyframes`
  0%   { transform: scale(1); }
  30%  { transform: scale(1.35); }
  60%  { transform: scale(0.9); }
  100% { transform: scale(1); }
`;

/* ═══════════════════════════════════════════════════════════════════
   STYLED COMPONENTS — V2 Cinematic & Haptic
   ═══════════════════════════════════════════════════════════════════ */

const Section = styled.div`
  width: 100%;
  min-height: 100%;
`;

const HeaderRow = styled(motion.div)`
  display: flex;
  align-items: center;
  margin-bottom: 28px;
  gap: 14px;
`;

const HeaderIcon = styled.span`
  color: ${T.iceWing};
  display: inline-flex;
  align-items: center;
  filter: drop-shadow(0 0 8px ${T.iceWing}40);
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${T.frostWhite};
  margin: 0;
  background: linear-gradient(135deg, ${T.frostWhite}, ${T.iceWing});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

/* ─── Glass Panel (base for all cards) ──────────────────────────── */
const GlassPanel = styled(motion.div)`
  background: ${T.glassSurface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${T.glassBorder};
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: ${T.glassHighlight}, 0 12px 40px rgba(0, 0, 0, 0.3);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
`;

/* ─── Tab Bar ───────────────────────────────────────────────────── */
const TabBar = styled.div`
  display: flex;
  width: 100%;
  background: ${T.glassSurface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  margin-bottom: 24px;
  overflow: hidden;
  border: 1px solid ${T.glassBorder};
  box-shadow: ${T.glassHighlight}, 0 8px 32px rgba(0, 0, 0, 0.25);
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
  padding: 14px 16px;
  border: none;
  background: ${({ $active }) =>
    $active
      ? `linear-gradient(135deg, color-mix(in srgb, ${T.iceWing} 15%, transparent), color-mix(in srgb, ${T.swanLavender} 10%, transparent))`
      : 'transparent'};
  color: ${({ $active }) =>
    $active ? T.iceWing : T.textMuted};
  font-size: 0.95rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  transition: background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
  border-bottom: 2px solid
    ${({ $active }) => ($active ? T.iceWing : 'transparent')};
  position: relative;

  ${({ $active }) => $active && css`
    &::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 20%;
      right: 20%;
      height: 2px;
      background: ${T.iceWing};
      box-shadow: 0 0 12px ${T.iceWing}60;
      border-radius: 2px;
    }
  `}

  &:hover {
    background: color-mix(in srgb, ${T.iceWing} 8%, transparent);
    color: ${T.iceWing};
  }
`;

/* ─── Section Title ─────────────────────────────────────────────── */
const SectionTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${T.frostWhite};
  margin: 0;
`;

/* ─── Post Composer ─────────────────────────────────────────────── */
const TextArea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 14px 18px;
  border-radius: 16px;
  border: 1px solid ${T.glassBorder};
  background: rgba(0, 32, 96, 0.35);
  color: ${T.frostWhite};
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  margin-bottom: 16px;
  box-sizing: border-box;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  &::placeholder {
    color: ${T.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${T.iceWing};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${T.iceWing} 15%, transparent),
                ${T.glassHighlight};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

/* ─── Buttons ───────────────────────────────────────────────────── */
const PrimaryButton = styled(motion.button)<{ $fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 28px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, ${T.iceWing} 0%, ${T.swanLavender} 100%);
  color: ${T.midnightSapphire};
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  box-shadow: 0 4px 16px color-mix(in srgb, ${T.iceWing} 30%, transparent);
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 6px 24px color-mix(in srgb, ${T.iceWing} 45%, transparent);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const OutlineButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 22px;
  border: 1px solid ${T.iceWing};
  border-radius: 14px;
  background: transparent;
  color: ${T.iceWing};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    background: color-mix(in srgb, ${T.iceWing} 10%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, ${T.iceWing} 20%, transparent);
  }
`;

/* ─── Post Card Action Buttons ──────────────────────────────────── */
const ActionButton = styled.button<{ $liked?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: ${({ $liked }) => ($liked ? T.danger : T.textMuted)};
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  svg {
    transition: transform 0.2s ease;
  }

  &:hover {
    background: color-mix(in srgb, ${T.iceWing} 8%, transparent);
    color: ${({ $liked }) => ($liked ? T.danger : T.iceWing)};
  }

  ${({ $liked }) => $liked && css`
    svg {
      animation: ${heartPop} 0.4s ease;
      fill: ${T.danger};
    }
  `}
`;

const SmallIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 8px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${T.textMuted};
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: color-mix(in srgb, ${T.iceWing} 10%, transparent);
    color: ${T.iceWing};
  }
`;

/* ─── Post Card Pieces ──────────────────────────────────────────── */
const PostHeader = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 14px;
  gap: 12px;
`;

const AvatarCircle = styled.div`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.iceWing} 0%, ${T.swanLavender} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${T.midnightSapphire};
  font-weight: 700;
  font-size: 1rem;
  overflow: hidden;
  box-shadow: 0 0 0 2px ${T.midnightSapphire},
              0 0 0 3px color-mix(in srgb, ${T.iceWing} 40%, transparent);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PostMeta = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const UserName = styled.span`
  font-weight: 600;
  color: ${T.frostWhite};
  font-size: 0.95rem;
`;

const TimeStamp = styled.span`
  font-size: 0.8rem;
  color: ${T.textMuted};
`;

const PostBody = styled.p`
  color: rgba(224, 236, 244, 0.88);
  line-height: 1.65;
  margin: 0 0 16px;
  font-size: 0.95rem;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${T.glassBorder};
  margin: 14px 0;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 4px;
`;

/* ─── Post Type Badge ───────────────────────────────────────────── */
const TypeBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: ${({ $color }) => $color};
  background: color-mix(in srgb, ${({ $color }) => $color} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 30%, transparent);
`;

/* ─── Comment Section ───────────────────────────────────────────── */
const CommentSection = styled(motion.div)`
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, ${T.glassBorder} 50%, transparent);
`;

const CommentInputRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const CommentInput = styled.input`
  flex: 1;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid ${T.glassBorder};
  background: rgba(0, 32, 96, 0.3);
  color: ${T.frostWhite};
  font-size: 0.88rem;
  transition: border-color 0.3s ease;

  &::placeholder {
    color: ${T.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${T.iceWing};
  }
`;

const CommentBubble = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const CommentAvatar = styled.div`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.arcticCyan}, ${T.swanLavender});
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${T.midnightSapphire};
  font-size: 0.65rem;
  font-weight: 700;
`;

const CommentBody = styled.div`
  flex: 1;
  background: rgba(0, 32, 96, 0.3);
  border-radius: 12px;
  padding: 8px 12px;
`;

const CommentAuthor = styled.span`
  font-weight: 600;
  font-size: 0.8rem;
  color: ${T.frostWhite};
  margin-right: 8px;
`;

const CommentText = styled.span`
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.8);
`;

const CommentTime = styled.span`
  font-size: 0.72rem;
  color: ${T.textMuted};
  display: block;
  margin-top: 4px;
`;

const SendButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  min-width: 40px;
  padding: 8px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.iceWing}, ${T.swanLavender});
  color: ${T.midnightSapphire};
  cursor: pointer;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 0 16px color-mix(in srgb, ${T.iceWing} 40%, transparent);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ─── Grid Helpers ──────────────────────────────────────────────── */
const GridRow = styled.div`
  display: grid;
  gap: 20px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const GridRowThirds = styled.div`
  display: grid;
  gap: 20px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

/* ─── Card (Events / Groups) ────────────────────────────────────── */
const StyledCard = styled(motion.div)`
  background: ${T.glassSurface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid ${T.glassBorder};
  box-shadow: ${T.glassHighlight}, 0 12px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${T.glassHighlight}, 0 16px 48px rgba(0, 0, 0, 0.4),
                0 0 24px color-mix(in srgb, ${T.iceWing} 12%, transparent);
    border-color: color-mix(in srgb, ${T.gildedFern} 40%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

/* ─── Chip ──────────────────────────────────────────────────────── */
const Chip = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid ${({ $color }) => $color || T.iceWing};
  color: ${({ $color }) => $color || T.iceWing};
  background: color-mix(in srgb, ${({ $color }) => $color || T.iceWing} 8%, transparent);
`;

/* ─── Detail Row (events/groups) ────────────────────────────────── */
const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: ${T.textMuted};
  font-size: 0.9rem;

  svg {
    color: ${T.arcticCyan};
    flex-shrink: 0;
  }
`;

const SpaceBetween = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
`;

const CenterRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: auto;
  padding-top: 16px;
`;

/* ─── Loading & Error States ────────────────────────────────────── */
const ShimmerCard = styled.div`
  background: ${T.glassSurface};
  backdrop-filter: blur(24px);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid ${T.glassBorder};
  box-shadow: ${T.glassHighlight}, 0 12px 40px rgba(0, 0, 0, 0.3);
`;

const ShimmerLine = styled.div<{ $width?: string; $height?: string }>`
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '14px'};
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    rgba(96, 192, 240, 0.06) 0%,
    rgba(96, 192, 240, 0.14) 50%,
    rgba(96, 192, 240, 0.06) 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.6s ease infinite;
  margin-bottom: 10px;
`;

const ErrorPanel = styled(GlassPanel)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  gap: 16px;
`;

const EmptyState = styled(GlassPanel)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  gap: 12px;
  color: ${T.textMuted};
`;

/* ═══════════════════════════════════════════════════════════════════
   PLACEHOLDER DATA (Events / Groups — no backend yet)
   ═══════════════════════════════════════════════════════════════════ */
const placeholderEvents = [
  {
    id: 1,
    title: 'Group HIIT Session',
    date: 'Mar 15, 2026',
    time: '10:00 AM',
    location: 'Central Park',
    attendees: 12,
  },
  {
    id: 2,
    title: 'Yoga & Meditation',
    date: 'Mar 18, 2026',
    time: '9:00 AM',
    location: 'Beach Front',
    attendees: 8,
  },
];

const placeholderGroups = [
  {
    id: 1,
    name: 'Morning Runners',
    members: 56,
    category: 'Fitness',
  },
  {
    id: 2,
    name: 'Dance Enthusiasts',
    members: 34,
    category: 'Dance',
  },
  {
    id: 3,
    name: 'Wellness Warriors',
    members: 89,
    category: 'Wellness',
  },
];

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

/** Format a date string to relative time */
const formatRelativeTime = (dateStr: string): string => {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '';
  }
};

/** Get user initials from a user object */
const getInitials = (user: { firstName?: string; lastName?: string; username?: string }): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.username) return user.username[0].toUpperCase();
  return '?';
};

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
const CommunitySection: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [postText, setPostText] = useState('');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  // Wire up the social feed hook (real API)
  const {
    posts,
    isLoading,
    error,
    hasMore,
    loadMore,
    isLoadingMore,
    refreshPosts,
    createPost,
    isCreatingPost,
    likePost,
    unlikePost,
    addComment,
  } = useSocialFeed();

  /* ── Post submission ────────────────────────────────────────────── */
  const handlePostSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() || isCreatingPost) return;
    const result = await createPost({ content: postText, type: 'general', visibility: 'public' });
    if (result) setPostText('');
  }, [postText, isCreatingPost, createPost]);

  /* ── Like toggle ────────────────────────────────────────────────── */
  const handleLikeToggle = useCallback(async (postId: string, isLiked: boolean) => {
    if (isLiked) {
      await unlikePost(postId);
    } else {
      await likePost(postId);
    }
  }, [likePost, unlikePost]);

  /* ── Comment toggle ─────────────────────────────────────────────── */
  const toggleComments = useCallback((postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  /* ── Submit comment ─────────────────────────────────────────────── */
  const handleCommentSubmit = useCallback(async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;
    const result = await addComment(postId, text);
    if (result) {
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
    }
  }, [commentTexts, addComment]);

  /* ── Tab change ─────────────────────────────────────────────────── */
  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  /* ── Staggered card animation ───────────────────────────────────── */
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { ...physics.spring, delay: i * 0.06 },
    }),
  };

  return (
    <Section>
      <HeaderRow
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={physics.glissando}
      >
        <HeaderIcon>
          <Users size={32} />
        </HeaderIcon>
        <Title>Community</Title>
      </HeaderRow>

      <TabBar>
        <TabButton $active={tabValue === 0} onClick={() => handleTabChange(0)}>
          <MessageCircle size={18} />
          Feed
        </TabButton>
        <TabButton $active={tabValue === 1} onClick={() => handleTabChange(1)}>
          <Calendar size={18} />
          Events
        </TabButton>
        <TabButton $active={tabValue === 2} onClick={() => handleTabChange(2)}>
          <Users size={18} />
          Groups
        </TabButton>
      </TabBar>

      {/* ═══════ Feed Tab ═══════ */}
      {tabValue === 0 && (
        <>
          {/* Post Composer */}
          <GlassPanel
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={physics.spring}
          >
            <SectionTitle style={{ marginBottom: 16 }}>
              Share with the community
            </SectionTitle>
            <form onSubmit={handlePostSubmit}>
              <TextArea
                placeholder="What's on your mind?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                rows={3}
              />
              <ButtonRow>
                <PrimaryButton
                  type="submit"
                  disabled={!postText.trim() || isCreatingPost}
                  whileTap={{ scale: 0.97 }}
                  transition={physics.snappy}
                >
                  {isCreatingPost ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Post
                    </>
                  )}
                </PrimaryButton>
              </ButtonRow>
            </form>
          </GlassPanel>

          {/* Loading State */}
          {isLoading && (
            <>
              {[1, 2, 3].map((n) => (
                <ShimmerCard key={n}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <ShimmerLine $width="44px" $height="44px" style={{ borderRadius: '50%', marginBottom: 0, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <ShimmerLine $width="40%" $height="14px" />
                      <ShimmerLine $width="25%" $height="10px" />
                    </div>
                  </div>
                  <ShimmerLine $width="100%" $height="14px" />
                  <ShimmerLine $width="80%" $height="14px" />
                  <ShimmerLine $width="60%" $height="14px" />
                </ShimmerCard>
              ))}
            </>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <ErrorPanel>
              <AlertCircle size={40} color={T.warning} />
              <SectionTitle>Unable to load feed</SectionTitle>
              <p style={{ color: T.textMuted, margin: 0 }}>
                Something went wrong. Please try again.
              </p>
              <PrimaryButton
                onClick={() => refreshPosts()}
                whileTap={{ scale: 0.97 }}
                transition={physics.snappy}
              >
                <RefreshCw size={16} />
                Retry
              </PrimaryButton>
            </ErrorPanel>
          )}

          {/* Empty State */}
          {!isLoading && !error && posts.length === 0 && (
            <EmptyState>
              <MessageCircle size={40} color={T.iceWing} style={{ opacity: 0.6 }} />
              <SectionTitle>No posts yet</SectionTitle>
              <p style={{ color: T.textMuted, margin: 0 }}>
                Be the first to share something with the community!
              </p>
            </EmptyState>
          )}

          {/* Real Post Cards from API */}
          <AnimatePresence mode="popLayout">
            {!isLoading && !error && posts.map((post, index) => {
              const typeInfo = postTypeMap[post.type] || postTypeMap.general;
              const TypeIcon = typeInfo.Icon;
              const isCommentsOpen = expandedComments.has(post.id);

              return (
                <GlassPanel
                  key={post.id}
                  as={motion.div}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  layout
                  style={{ cursor: 'default' }}
                >
                  <PostHeader>
                    <AvatarCircle>
                      {post.user.photo ? (
                        <img src={post.user.photo} alt={post.user.firstName || post.user.username} />
                      ) : (
                        getInitials(post.user)
                      )}
                    </AvatarCircle>
                    <PostMeta>
                      <UserName>
                        {post.user.firstName && post.user.lastName
                          ? `${post.user.firstName} ${post.user.lastName}`
                          : post.user.username}
                      </UserName>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TimeStamp>{formatRelativeTime(post.createdAt)}</TimeStamp>
                        {post.type !== 'general' && (
                          <TypeBadge $color={typeInfo.color}>
                            <TypeIcon size={11} />
                            {typeInfo.label}
                          </TypeBadge>
                        )}
                      </div>
                    </PostMeta>
                    <SmallIconButton>
                      <MoreVertical size={18} />
                    </SmallIconButton>
                  </PostHeader>

                  <PostBody>{post.content}</PostBody>

                  {/* Media */}
                  {post.mediaUrl && (
                    <div style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      marginBottom: 16,
                      border: `1px solid ${T.glassBorder}`,
                    }}>
                      <img
                        src={post.mediaUrl}
                        alt="Post media"
                        style={{ width: '100%', display: 'block' }}
                      />
                    </div>
                  )}

                  <Divider />

                  <ActionRow>
                    <ActionButton
                      $liked={post.isLiked}
                      onClick={() => handleLikeToggle(post.id, post.isLiked)}
                    >
                      <Heart size={17} />
                      {post.likesCount > 0 ? post.likesCount : 'Like'}
                    </ActionButton>
                    <ActionButton onClick={() => toggleComments(post.id)}>
                      <MessageSquare size={17} />
                      {post.commentsCount > 0 ? post.commentsCount : 'Comment'}
                    </ActionButton>
                    <ActionButton>
                      <Share2 size={17} />
                      Share
                    </ActionButton>
                  </ActionRow>

                  {/* Comments Expansion */}
                  <AnimatePresence>
                    {isCommentsOpen && (
                      <CommentSection
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={physics.glissando}
                      >
                        {/* Existing comments */}
                        {post.comments && post.comments.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            {post.comments.map((comment) => (
                              <CommentBubble key={comment.id}>
                                <CommentAvatar>
                                  {getInitials(comment.user)}
                                </CommentAvatar>
                                <CommentBody>
                                  <div>
                                    <CommentAuthor>
                                      {comment.user.firstName || comment.user.username}
                                    </CommentAuthor>
                                    <CommentText>{comment.content}</CommentText>
                                  </div>
                                  <CommentTime>
                                    {formatRelativeTime(comment.createdAt)}
                                  </CommentTime>
                                </CommentBody>
                              </CommentBubble>
                            ))}
                          </div>
                        )}

                        {/* Comment input */}
                        <CommentInputRow>
                          <CommentInput
                            placeholder="Write a comment..."
                            value={commentTexts[post.id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleCommentSubmit(post.id);
                              }
                            }}
                          />
                          <SendButton
                            onClick={() => handleCommentSubmit(post.id)}
                            disabled={!commentTexts[post.id]?.trim()}
                          >
                            <Send size={16} />
                          </SendButton>
                        </CommentInputRow>
                      </CommentSection>
                    )}
                  </AnimatePresence>
                </GlassPanel>
              );
            })}
          </AnimatePresence>

          {/* Load More */}
          {!isLoading && !error && hasMore && posts.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
              <OutlineButton
                onClick={loadMore}
                whileTap={{ scale: 0.97 }}
                transition={physics.snappy}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Loading...
                  </>
                ) : (
                  'Load more posts'
                )}
              </OutlineButton>
            </div>
          )}
        </>
      )}

      {/* ═══════ Events Tab ═══════ */}
      {tabValue === 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={physics.glissando}
        >
          <SpaceBetween style={{ marginBottom: 24 }}>
            <SectionTitle>Upcoming Events</SectionTitle>
            <OutlineButton whileTap={{ scale: 0.97 }} transition={physics.snappy}>
              <Calendar size={18} />
              Create Event
            </OutlineButton>
          </SpaceBetween>

          <GridRow>
            {placeholderEvents.map((event, i) => (
              <StyledCard
                key={event.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <SectionTitle style={{ marginBottom: 14 }}>
                  {event.title}
                </SectionTitle>

                <DetailRow>
                  <Calendar size={18} />
                  <span>
                    {event.date} at {event.time}
                  </span>
                </DetailRow>

                <DetailRow>
                  <MapPin size={18} />
                  <span>{event.location}</span>
                </DetailRow>

                <DetailRow>
                  <Users size={18} />
                  <span>{event.attendees} attending</span>
                </DetailRow>

                <SpaceBetween>
                  <Chip $color={T.iceWing}>{event.location}</Chip>
                  <PrimaryButton
                    whileTap={{ scale: 0.97 }}
                    transition={physics.snappy}
                  >
                    Join
                  </PrimaryButton>
                </SpaceBetween>
              </StyledCard>
            ))}
          </GridRow>
        </motion.div>
      )}

      {/* ═══════ Groups Tab ═══════ */}
      {tabValue === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={physics.glissando}
        >
          <SpaceBetween style={{ marginBottom: 24 }}>
            <SectionTitle>Suggested Groups</SectionTitle>
            <OutlineButton whileTap={{ scale: 0.97 }} transition={physics.snappy}>
              <Users size={18} />
              Browse All
            </OutlineButton>
          </SpaceBetween>

          <GridRowThirds>
            {placeholderGroups.map((group, i) => (
              <StyledCard
                key={group.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <SectionTitle style={{ marginBottom: 14 }}>
                  {group.name}
                </SectionTitle>

                <DetailRow>
                  <Users size={18} />
                  <span>{group.members} members</span>
                </DetailRow>

                <Chip $color={T.gildedFern} style={{ marginBottom: 16 }}>
                  {group.category}
                </Chip>

                <CenterRow>
                  <PrimaryButton
                    $fullWidth
                    whileTap={{ scale: 0.97 }}
                    transition={physics.snappy}
                  >
                    <UserPlus size={18} />
                    Join Group
                  </PrimaryButton>
                </CenterRow>
              </StyledCard>
            ))}
          </GridRowThirds>
        </motion.div>
      )}
    </Section>
  );
};

export default CommunitySection;

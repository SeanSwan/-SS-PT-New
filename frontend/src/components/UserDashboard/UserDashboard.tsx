/**
 * SwanStudios Community — User Dashboard V2
 * ==========================================
 * Preset F-Alt "Enchanted Apex: Crystalline Swan"
 * Ground-up rebuild using V2 Cinematic & Haptic design system.
 *
 * Hooks: useProfile() for profile/stats/achievements, useSocialFeed() for live feed
 * Framework: styled-components + framer-motion (NO MUI)
 */

import React, { useState, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Settings,
  Heart,
  MessageCircle,
  MessageSquare,
  Share2,
  Send,
  Users,
  UserPlus,
  Calendar,
  MapPin,
  Image as ImageIcon,
  User,
  Activity,
  MoreVertical,
  Edit3,
  Loader2,
  AlertCircle,
  RefreshCw,
  Dumbbell,
  Trophy,
  Swords,
  Flame,
  Sparkles,
  Clock,
  Award,
  Star,
  Plus,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../hooks/profile/useProfile';
import { useSocialFeed } from '../../hooks/social/useSocialFeed';
import profileService from '../../services/profileService';

/* ═══════════════════════════════════════════════════════════════════
   CRYSTALLINE TOKEN MATRIX — Preset F-Alt "Enchanted Apex"
   ═══════════════════════════════════════════════════════════════════ */
const T = {
  midnightSapphire: '#002060',
  royalDepth:       '#003080',
  swanLavender:     '#4070C0',
  iceWing:          '#60C0F0',
  arcticCyan:       '#50A0F0',
  gildedFern:       '#C6A84B',
  frostWhite:       '#E0ECF4',
  success:          '#22C55E',
  warning:          '#F59E0B',
  danger:           '#EF4444',
  glassSurface:     'linear-gradient(135deg, rgba(0, 48, 128, 0.45) 0%, rgba(0, 32, 96, 0.25) 100%)',
  glassBorder:      'rgba(198, 168, 75, 0.25)',
  glassHighlight:   'inset 0 1px 1px rgba(224, 236, 244, 0.15)',
  textMuted:        'rgba(224, 236, 244, 0.65)',
};

const physics = {
  spring:    { type: 'spring' as const, stiffness: 400, damping: 25, mass: 0.8 },
  snappy:    { type: 'spring' as const, stiffness: 600, damping: 30 },
  glissando: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
};

/* ── Post-type rarity map ───────────────────────────────────────── */
const postTypeMap: Record<string, { color: string; label: string; Icon: React.FC<{ size?: number }> }> = {
  workout:        { color: T.gildedFern,   label: 'Workout',        Icon: Dumbbell },
  achievement:    { color: T.iceWing,      label: 'Achievement',    Icon: Trophy },
  challenge:      { color: T.swanLavender, label: 'Challenge',      Icon: Swords },
  transformation: { color: T.danger,       label: 'Transformation', Icon: Flame },
  general:        { color: T.arcticCyan,   label: 'Post',           Icon: Sparkles },
};

/* ── Achievement rarity colors ──────────────────────────────────── */
const rarityColors: Record<string, string> = {
  common:    T.textMuted,
  uncommon:  T.arcticCyan,
  rare:      T.iceWing,
  epic:      T.swanLavender,
  legendary: T.gildedFern,
};

/* ═══════════════════════════════════════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════════════════════════════════════ */
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
   STYLED COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

/* ─── Page Container ────────────────────────────────────────────── */
const PageContainer = styled.div`
  min-height: 100vh;
  background: ${T.midnightSapphire};
  color: ${T.frostWhite};
`;

/* ─── Cover Photo ───────────────────────────────────────────────── */
const CoverPhotoSection = styled.div<{ $src?: string | null }>`
  position: relative;
  width: 100%;
  height: 220px;
  background: ${({ $src }) =>
    $src
      ? `url(${$src}) center/cover no-repeat`
      : `linear-gradient(135deg, ${T.midnightSapphire} 0%, ${T.royalDepth} 40%, ${T.swanLavender} 100%)`};
  border-bottom: 1px solid ${T.glassBorder};

  @media (min-width: 768px) {
    height: 280px;
  }
`;

const CoverOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 40%, rgba(0, 32, 96, 0.7) 100%);
`;

const CoverUploadButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid rgba(224, 236, 244, 0.3);
  border-radius: 14px;
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(12px);
  color: ${T.frostWhite};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s ease, border-color 0.3s ease;
  z-index: 2;

  &:hover {
    background: rgba(0, 48, 128, 0.8);
    border-color: ${T.iceWing};
  }
`;

/* ─── Profile Header ────────────────────────────────────────────── */
const ProfileHeaderSection = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px 32px;
  margin-top: -60px;
  z-index: 2;
`;

const AvatarWrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const AvatarRing = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.iceWing}, ${T.swanLavender});
  padding: 4px;
  box-shadow: 0 0 0 4px ${T.midnightSapphire},
              0 0 24px color-mix(in srgb, ${T.iceWing} 30%, transparent);
`;

const AvatarInner = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: ${T.royalDepth};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${T.iceWing};
  font-weight: 700;
  font-size: 2.2rem;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AvatarUploadBtn = styled.button`
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.iceWing}, ${T.swanLavender});
  border: 3px solid ${T.midnightSapphire};
  color: ${T.midnightSapphire};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 0 12px color-mix(in srgb, ${T.iceWing} 50%, transparent);
  }
`;

const DisplayName = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 4px;
  background: linear-gradient(135deg, ${T.frostWhite}, ${T.iceWing});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Username = styled.p`
  font-size: 0.95rem;
  color: ${T.textMuted};
  margin: 0 0 8px;
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${T.glassSurface};
  backdrop-filter: blur(12px);
  border: 1px solid ${T.glassBorder};
  color: ${T.gildedFern};
  margin-bottom: 16px;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 32px;
  margin-bottom: 16px;
`;

const StatItem = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: default;
`;

const StatNumber = styled.span`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${T.iceWing};
`;

const StatLabel = styled.span`
  font-size: 0.8rem;
  color: ${T.textMuted};
  margin-top: 2px;
`;

const BioText = styled.p`
  max-width: 600px;
  text-align: center;
  color: ${T.textMuted};
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0 0 20px;
`;

const ActionButtonRow = styled.div`
  display: flex;
  gap: 12px;
`;

const ProfileAction = styled(motion.button)<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 24px;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: box-shadow 0.3s ease;

  ${({ $primary }) => $primary ? css`
    background: linear-gradient(135deg, ${T.iceWing}, ${T.swanLavender});
    border: none;
    color: ${T.midnightSapphire};
    box-shadow: 0 4px 16px color-mix(in srgb, ${T.iceWing} 30%, transparent);
    &:hover { box-shadow: 0 6px 24px color-mix(in srgb, ${T.iceWing} 45%, transparent); }
  ` : css`
    background: transparent;
    border: 1px solid ${T.glassBorder};
    color: ${T.frostWhite};
    &:hover {
      border-color: ${T.iceWing};
      box-shadow: 0 0 12px color-mix(in srgb, ${T.iceWing} 20%, transparent);
    }
  `}
`;

/* ─── Content Layout ────────────────────────────────────────────── */
const ContentWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px 48px;
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
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid ${T.glassBorder};
  box-shadow: ${T.glassHighlight}, 0 8px 32px rgba(0, 0, 0, 0.25);
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  min-width: max-content;
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
  color: ${({ $active }) => ($active ? T.iceWing : T.textMuted)};
  font-size: 0.9rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  transition: background 0.3s ease, color 0.3s ease;
  border-bottom: 2px solid ${({ $active }) => ($active ? T.iceWing : 'transparent')};
  white-space: nowrap;
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

/* ─── Glass Panel ───────────────────────────────────────────────── */
const GlassPanel = styled(motion.div)`
  background: ${T.glassSurface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${T.glassBorder};
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: ${T.glassHighlight}, 0 12px 40px rgba(0, 0, 0, 0.3);
`;

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

  &::placeholder { color: ${T.textMuted}; }

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

  &:hover { box-shadow: 0 6px 24px color-mix(in srgb, ${T.iceWing} 45%, transparent); }
  &:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

  @media (prefers-reduced-motion: reduce) { transition: none; }
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

  svg { transition: transform 0.2s ease; }

  &:hover {
    background: color-mix(in srgb, ${T.iceWing} 8%, transparent);
    color: ${({ $liked }) => ($liked ? T.danger : T.iceWing)};
  }

  ${({ $liked }) => $liked && css`
    svg { animation: ${heartPop} 0.4s ease; fill: ${T.danger}; }
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
  transition: background 0.2s ease;

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

const PostAvatar = styled.div`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.iceWing}, ${T.swanLavender});
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${T.midnightSapphire};
  font-weight: 700;
  font-size: 1rem;
  overflow: hidden;
  box-shadow: 0 0 0 2px ${T.midnightSapphire},
              0 0 0 3px color-mix(in srgb, ${T.iceWing} 40%, transparent);

  img { width: 100%; height: 100%; object-fit: cover; }
`;

const PostMeta = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PostUserName = styled.span`
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

const PostActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 4px;
`;

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

/* ─── Comment Components ────────────────────────────────────────── */
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

  &::placeholder { color: ${T.textMuted}; }
  &:focus { outline: none; border-color: ${T.iceWing}; }
`;

const CommentBubble = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  &:last-child { margin-bottom: 0; }
`;

const CommentAvatarSmall = styled.div`
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

const CommentBodyWrapper = styled.div`
  flex: 1;
  background: rgba(0, 32, 96, 0.3);
  border-radius: 12px;
  padding: 8px 12px;
`;

const SendBtn = styled.button`
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

  &:hover { box-shadow: 0 0 16px color-mix(in srgb, ${T.iceWing} 40%, transparent); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

/* ─── Grid Helpers ──────────────────────────────────────────────── */
const GridRow = styled.div`
  display: grid;
  gap: 20px;
  @media (min-width: 600px) { grid-template-columns: repeat(2, 1fr); }
`;

const GridRowThirds = styled.div`
  display: grid;
  gap: 20px;
  @media (min-width: 600px) { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 900px) { grid-template-columns: repeat(3, 1fr); }
`;

/* ─── Card ──────────────────────────────────────────────────────── */
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

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: ${T.textMuted};
  font-size: 0.9rem;
  svg { color: ${T.arcticCyan}; flex-shrink: 0; }
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

/* ─── Photo Grid ────────────────────────────────────────────────── */
const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
`;

const PhotoItem = styled(motion.div)`
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid ${T.glassBorder};
  cursor: pointer;
  transition: border-color 0.3s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:hover {
    border-color: color-mix(in srgb, ${T.iceWing} 50%, transparent);
  }
`;

const UploadCard = styled(motion.div)`
  aspect-ratio: 1;
  border-radius: 16px;
  border: 2px dashed ${T.glassBorder};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${T.textMuted};
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.3s ease, color 0.3s ease;

  &:hover {
    border-color: ${T.iceWing};
    color: ${T.iceWing};
  }
`;

/* ─── Achievement Card ──────────────────────────────────────────── */
const AchievementCard = styled.div<{ $rarity?: string }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(0, 32, 96, 0.3);
  border: 1px solid color-mix(in srgb, ${({ $rarity }) => rarityColors[$rarity || 'common'] || T.textMuted} 30%, transparent);
  margin-bottom: 12px;

  &:last-child { margin-bottom: 0; }
`;

const AchievementIcon = styled.div<{ $rarity?: string }>`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 12px;
  background: color-mix(in srgb, ${({ $rarity }) => rarityColors[$rarity || 'common'] || T.textMuted} 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $rarity }) => rarityColors[$rarity || 'common'] || T.textMuted};
`;

/* ─── Info Row (About tab) ──────────────────────────────────────── */
const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid color-mix(in srgb, ${T.glassBorder} 50%, transparent);
  color: ${T.frostWhite};
  font-size: 0.92rem;

  svg { color: ${T.arcticCyan}; flex-shrink: 0; }

  &:last-child { border-bottom: none; }
`;

const InfoLabel = styled.span`
  color: ${T.textMuted};
  min-width: 120px;
`;

/* ─── Timeline (Activity tab) ───────────────────────────────────── */
const TimelineItem = styled.div`
  display: flex;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px solid color-mix(in srgb, ${T.glassBorder} 40%, transparent);

  &:last-child { border-bottom: none; }
`;

const TimelineDot = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 12px;
  background: color-mix(in srgb, ${({ $color }) => $color || T.iceWing} 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color || T.iceWing};
`;

/* ─── Loading & Error ───────────────────────────────────────────── */
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
  background: linear-gradient(90deg, rgba(96,192,240,0.06) 0%, rgba(96,192,240,0.14) 50%, rgba(96,192,240,0.06) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.6s ease infinite;
  margin-bottom: 10px;
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

/* ─── Loading Overlay ───────────────────────────────────────────── */
const LoadingOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 32, 96, 0.8);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: ${T.frostWhite};
  font-size: 1rem;
`;

/* ─── Stat Card (About tab) ─────────────────────────────────────── */
const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  border-radius: 16px;
  background: rgba(0, 32, 96, 0.3);
  border: 1px solid ${T.glassBorder};
  text-align: center;
`;

const StatCardValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${T.iceWing};
  margin-bottom: 4px;
`;

const StatCardLabel = styled.span`
  font-size: 0.78rem;
  color: ${T.textMuted};
`;

/* ═══════════════════════════════════════════════════════════════════
   PLACEHOLDER DATA (Events / Groups / Activity — no backend yet)
   ═══════════════════════════════════════════════════════════════════ */
const placeholderEvents = [
  { id: 1, title: 'Group HIIT Session', date: 'Mar 15, 2026', time: '10:00 AM', location: 'Central Park', attendees: 12 },
  { id: 2, title: 'Yoga & Meditation', date: 'Mar 18, 2026', time: '9:00 AM', location: 'Beach Front', attendees: 8 },
];

const placeholderGroups = [
  { id: 1, name: 'Morning Runners', members: 56, category: 'Fitness' },
  { id: 2, name: 'Dance Enthusiasts', members: 34, category: 'Dance' },
  { id: 3, name: 'Wellness Warriors', members: 89, category: 'Wellness' },
];

const placeholderActivity = [
  { id: 1, icon: Dumbbell, color: T.success, text: 'Completed a strength workout', time: '2 hours ago' },
  { id: 2, icon: MessageCircle, color: T.iceWing, text: 'Shared a post with the community', time: '5 hours ago' },
  { id: 3, icon: Award, color: T.gildedFern, text: 'Earned "First Steps" badge', time: '1 day ago' },
  { id: 4, icon: Users, color: T.arcticCyan, text: 'Joined the SwanStudios community', time: '3 days ago' },
];

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */
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
  } catch { return ''; }
};

const getInitials = (user: { firstName?: string; lastName?: string; username?: string }): string => {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.username) return user.username[0].toUpperCase();
  return '?';
};

/* ═══════════════════════════════════════════════════════════════════
   TAB DEFINITIONS
   ═══════════════════════════════════════════════════════════════════ */
const tabs = [
  { id: 'feed',      label: 'Feed',      Icon: MessageCircle },
  { id: 'community', label: 'Community',  Icon: Users },
  { id: 'photos',    label: 'Photos',     Icon: ImageIcon },
  { id: 'about',     label: 'About',      Icon: User },
  { id: 'activity',  label: 'Activity',   Icon: Activity },
] as const;

type TabId = typeof tabs[number]['id'];

/* ═══════════════════════════════════════════════════════════════════
   ERROR BOUNDARY
   ═══════════════════════════════════════════════════════════════════ */
class UserDashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('UserDashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <PageContainer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <AlertCircle size={48} color={T.warning} style={{ marginBottom: 16 }} />
          <h2 style={{ color: T.frostWhite, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: T.textMuted, marginBottom: 24 }}>
            We ran into an issue loading the dashboard. Please refresh to try again.
          </p>
          <PrimaryButton onClick={() => window.location.reload()} whileTap={{ scale: 0.97 }} transition={physics.snappy}>
            <RefreshCw size={16} />
            Refresh Page
          </PrimaryButton>
        </PageContainer>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
const UserDashboard: React.FC = () => {
  const { user } = useAuth();

  // ── Profile data (real API) ──
  const {
    profile,
    stats,
    achievements,
    followStats,
    isLoading: isLoadingProfile,
    isUploading,
    uploadProfilePhoto,
    getDisplayName,
    getUsernameForDisplay,
    getUserInitials,
  } = useProfile();

  // ── Social feed (real API) ──
  const {
    posts,
    isLoading: isLoadingFeed,
    error: feedError,
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

  // ── Local state ──
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<'profile' | 'background' | 'photo' | null>(null);
  const [postText, setPostText] = useState('');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);

  // ── Refs ──
  const profileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── File upload handler (preserved business logic) ──
  const handleFileUpload = useCallback(async (file: File, type: 'profile' | 'background' | 'photo') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('File size must be less than 5MB'); return; }

    setUploadingType(type);
    try {
      switch (type) {
        case 'profile':
          await uploadProfilePhoto(file);
          break;
        case 'background': {
          const url = await profileService.uploadImage(file, 'background');
          setBackgroundImage(url);
          break;
        }
        case 'photo': {
          const url = await profileService.uploadImage(file, 'post');
          setPhotos(prev => [...prev, url]);
          break;
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Failed to upload ${type}`);
    } finally {
      setUploadingType(null);
    }
  }, [uploadProfilePhoto]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'background' | 'photo') => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, type);
    e.target.value = '';
  }, [handleFileUpload]);

  // ── Post handlers ──
  const handlePostSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() || isCreatingPost) return;
    const result = await createPost({ content: postText, type: 'general', visibility: 'public' });
    if (result) setPostText('');
  }, [postText, isCreatingPost, createPost]);

  const handleLikeToggle = useCallback(async (postId: string, isLiked: boolean) => {
    if (isLiked) await unlikePost(postId);
    else await likePost(postId);
  }, [likePost, unlikePost]);

  const toggleComments = useCallback((postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }, []);

  const handleCommentSubmit = useCallback(async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;
    const result = await addComment(postId, text);
    if (result) setCommentTexts(prev => ({ ...prev, [postId]: '' }));
  }, [commentTexts, addComment]);

  // ── Derived data ──
  const displayName = getDisplayName();
  const username = getUsernameForDisplay();
  const initials = getUserInitials();
  const postCount = stats?.posts ?? followStats?.posts ?? 0;
  const followerCount = followStats?.followers ?? stats?.followers ?? 0;
  const followingCount = followStats?.following ?? stats?.following ?? 0;

  // ── Staggered card animation ──
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { ...physics.spring, delay: i * 0.06 } }),
  };

  return (
    <PageContainer>
      {/* ═══════ Cover Photo ═══════ */}
      <CoverPhotoSection $src={backgroundImage}>
        <CoverOverlay />
        <CoverUploadButton onClick={() => backgroundInputRef.current?.click()}>
          <Camera size={16} />
          {backgroundImage ? 'Change Cover' : 'Add Cover Photo'}
        </CoverUploadButton>
      </CoverPhotoSection>

      {/* ═══════ Profile Header ═══════ */}
      <ProfileHeaderSection>
        <AvatarWrapper>
          <AvatarRing>
            <AvatarInner>
              {profile?.photo ? (
                <img src={profile.photo} alt={displayName} />
              ) : (
                initials
              )}
            </AvatarInner>
          </AvatarRing>
          <AvatarUploadBtn onClick={() => profileInputRef.current?.click()}>
            <Camera size={14} />
          </AvatarUploadBtn>
        </AvatarWrapper>

        <DisplayName>{displayName || 'SwanStudios Member'}</DisplayName>
        <Username>@{username || 'member'}</Username>
        <RoleBadge>
          <Star size={12} />
          {user?.role || 'Member'}
        </RoleBadge>

        <StatsRow>
          <StatItem whileHover={{ scale: 1.08 }} transition={physics.snappy}>
            <StatNumber>{postCount}</StatNumber>
            <StatLabel>Posts</StatLabel>
          </StatItem>
          <StatItem whileHover={{ scale: 1.08 }} transition={physics.snappy}>
            <StatNumber>{followerCount}</StatNumber>
            <StatLabel>Followers</StatLabel>
          </StatItem>
          <StatItem whileHover={{ scale: 1.08 }} transition={physics.snappy}>
            <StatNumber>{followingCount}</StatNumber>
            <StatLabel>Following</StatLabel>
          </StatItem>
        </StatsRow>

        <BioText>
          {profile?.bio || 'Welcome to SwanStudios Community — your space for fitness, wellness, and connection.'}
        </BioText>

        <ActionButtonRow>
          <ProfileAction $primary whileTap={{ scale: 0.97 }} transition={physics.snappy}>
            <Edit3 size={16} />
            Edit Profile
          </ProfileAction>
          <ProfileAction whileTap={{ scale: 0.97 }} transition={physics.snappy}>
            <Settings size={16} />
          </ProfileAction>
          <ProfileAction whileTap={{ scale: 0.97 }} transition={physics.snappy}>
            <Share2 size={16} />
          </ProfileAction>
        </ActionButtonRow>
      </ProfileHeaderSection>

      {/* ═══════ Content ═══════ */}
      <ContentWrapper>
        {/* Tab Bar */}
        <TabBar>
          {tabs.map(({ id, label, Icon }) => (
            <TabButton key={id} $active={activeTab === id} onClick={() => setActiveTab(id)}>
              <Icon size={17} />
              {label}
            </TabButton>
          ))}
        </TabBar>

        <AnimatePresence mode="wait">
          {/* ═══════ FEED TAB ═══════ */}
          {activeTab === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={physics.glissando}>
              {/* Post Composer */}
              <GlassPanel initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={physics.spring}>
                <SectionTitle style={{ marginBottom: 16 }}>Share with the community</SectionTitle>
                <form onSubmit={handlePostSubmit}>
                  <TextArea
                    placeholder="What's on your mind?"
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    rows={3}
                  />
                  <ButtonRow>
                    <PrimaryButton type="submit" disabled={!postText.trim() || isCreatingPost} whileTap={{ scale: 0.97 }} transition={physics.snappy}>
                      {isCreatingPost ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Posting...</> : <><Send size={16} /> Post</>}
                    </PrimaryButton>
                  </ButtonRow>
                </form>
              </GlassPanel>

              {/* Loading */}
              {isLoadingFeed && [1, 2, 3].map(n => (
                <ShimmerCard key={n}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <ShimmerLine $width="44px" $height="44px" style={{ borderRadius: '50%', marginBottom: 0, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}><ShimmerLine $width="40%" /><ShimmerLine $width="25%" $height="10px" /></div>
                  </div>
                  <ShimmerLine /><ShimmerLine $width="80%" /><ShimmerLine $width="60%" />
                </ShimmerCard>
              ))}

              {/* Error */}
              {!isLoadingFeed && feedError && (
                <EmptyState>
                  <AlertCircle size={40} color={T.warning} />
                  <SectionTitle>Unable to load feed</SectionTitle>
                  <p style={{ color: T.textMuted, margin: 0 }}>Something went wrong. Please try again.</p>
                  <PrimaryButton onClick={() => refreshPosts()} whileTap={{ scale: 0.97 }} transition={physics.snappy}>
                    <RefreshCw size={16} /> Retry
                  </PrimaryButton>
                </EmptyState>
              )}

              {/* Empty */}
              {!isLoadingFeed && !feedError && posts.length === 0 && (
                <EmptyState>
                  <MessageCircle size={40} color={T.iceWing} style={{ opacity: 0.6 }} />
                  <SectionTitle>No posts yet</SectionTitle>
                  <p style={{ color: T.textMuted, margin: 0 }}>Be the first to share something with the community!</p>
                </EmptyState>
              )}

              {/* Post Cards */}
              <AnimatePresence mode="popLayout">
                {!isLoadingFeed && !feedError && posts.map((post, index) => {
                  const typeInfo = postTypeMap[post.type] || postTypeMap.general;
                  const TypeIcon = typeInfo.Icon;
                  const isCommentsOpen = expandedComments.has(post.id);

                  return (
                    <GlassPanel key={post.id} as={motion.div} custom={index} variants={cardVariants} initial="hidden" animate="visible" layout>
                      <PostHeader>
                        <PostAvatar>
                          {post.user.photo ? <img src={post.user.photo} alt="" /> : getInitials(post.user)}
                        </PostAvatar>
                        <PostMeta>
                          <PostUserName>{post.user.firstName && post.user.lastName ? `${post.user.firstName} ${post.user.lastName}` : post.user.username}</PostUserName>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TimeStamp>{formatRelativeTime(post.createdAt)}</TimeStamp>
                            {post.type !== 'general' && <TypeBadge $color={typeInfo.color}><TypeIcon size={11} />{typeInfo.label}</TypeBadge>}
                          </div>
                        </PostMeta>
                        <SmallIconButton><MoreVertical size={18} /></SmallIconButton>
                      </PostHeader>

                      <PostBody>{post.content}</PostBody>

                      {post.mediaUrl && (
                        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, border: `1px solid ${T.glassBorder}` }}>
                          <img src={post.mediaUrl} alt="Post media" style={{ width: '100%', display: 'block' }} />
                        </div>
                      )}

                      <Divider />

                      <PostActionRow>
                        <ActionButton $liked={post.isLiked} onClick={() => handleLikeToggle(post.id, post.isLiked)}>
                          <Heart size={17} />{post.likesCount > 0 ? post.likesCount : 'Like'}
                        </ActionButton>
                        <ActionButton onClick={() => toggleComments(post.id)}>
                          <MessageSquare size={17} />{post.commentsCount > 0 ? post.commentsCount : 'Comment'}
                        </ActionButton>
                        <ActionButton><Share2 size={17} />Share</ActionButton>
                      </PostActionRow>

                      <AnimatePresence>
                        {isCommentsOpen && (
                          <CommentSection initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={physics.glissando}>
                            {post.comments && post.comments.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                {post.comments.map((comment) => (
                                  <CommentBubble key={comment.id}>
                                    <CommentAvatarSmall>{getInitials(comment.user)}</CommentAvatarSmall>
                                    <CommentBodyWrapper>
                                      <div>
                                        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: T.frostWhite, marginRight: 8 }}>{comment.user.firstName || comment.user.username}</span>
                                        <span style={{ fontSize: '0.85rem', color: 'rgba(224,236,244,0.8)' }}>{comment.content}</span>
                                      </div>
                                      <span style={{ fontSize: '0.72rem', color: T.textMuted, display: 'block', marginTop: 4 }}>{formatRelativeTime(comment.createdAt)}</span>
                                    </CommentBodyWrapper>
                                  </CommentBubble>
                                ))}
                              </div>
                            )}
                            <CommentInputRow>
                              <CommentInput
                                placeholder="Write a comment..."
                                value={commentTexts[post.id] || ''}
                                onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(post.id); } }}
                              />
                              <SendBtn onClick={() => handleCommentSubmit(post.id)} disabled={!commentTexts[post.id]?.trim()}><Send size={16} /></SendBtn>
                            </CommentInputRow>
                          </CommentSection>
                        )}
                      </AnimatePresence>
                    </GlassPanel>
                  );
                })}
              </AnimatePresence>

              {/* Load More */}
              {!isLoadingFeed && !feedError && hasMore && posts.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
                  <OutlineButton onClick={loadMore} whileTap={{ scale: 0.97 }} transition={physics.snappy}>
                    {isLoadingMore ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</> : 'Load more posts'}
                  </OutlineButton>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════ COMMUNITY TAB ═══════ */}
          {activeTab === 'community' && (
            <motion.div key="community" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={physics.glissando}>
              <SpaceBetween style={{ marginBottom: 24 }}>
                <SectionTitle>Upcoming Events</SectionTitle>
                <OutlineButton whileTap={{ scale: 0.97 }} transition={physics.snappy}><Calendar size={18} /> Create Event</OutlineButton>
              </SpaceBetween>
              <GridRow>
                {placeholderEvents.map((event, i) => (
                  <StyledCard key={event.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                    <SectionTitle style={{ marginBottom: 14 }}>{event.title}</SectionTitle>
                    <DetailRow><Calendar size={18} /><span>{event.date} at {event.time}</span></DetailRow>
                    <DetailRow><MapPin size={18} /><span>{event.location}</span></DetailRow>
                    <DetailRow><Users size={18} /><span>{event.attendees} attending</span></DetailRow>
                    <SpaceBetween>
                      <Chip $color={T.iceWing}>{event.location}</Chip>
                      <PrimaryButton whileTap={{ scale: 0.97 }} transition={physics.snappy}>Join</PrimaryButton>
                    </SpaceBetween>
                  </StyledCard>
                ))}
              </GridRow>

              <SpaceBetween style={{ marginBottom: 24, marginTop: 32 }}>
                <SectionTitle>Suggested Groups</SectionTitle>
                <OutlineButton whileTap={{ scale: 0.97 }} transition={physics.snappy}><Users size={18} /> Browse All</OutlineButton>
              </SpaceBetween>
              <GridRowThirds>
                {placeholderGroups.map((group, i) => (
                  <StyledCard key={group.id} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                    <SectionTitle style={{ marginBottom: 14 }}>{group.name}</SectionTitle>
                    <DetailRow><Users size={18} /><span>{group.members} members</span></DetailRow>
                    <Chip $color={T.gildedFern} style={{ marginBottom: 16 }}>{group.category}</Chip>
                    <CenterRow>
                      <PrimaryButton $fullWidth whileTap={{ scale: 0.97 }} transition={physics.snappy}><UserPlus size={18} /> Join Group</PrimaryButton>
                    </CenterRow>
                  </StyledCard>
                ))}
              </GridRowThirds>
            </motion.div>
          )}

          {/* ═══════ PHOTOS TAB ═══════ */}
          {activeTab === 'photos' && (
            <motion.div key="photos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={physics.glissando}>
              <GlassPanel>
                <SectionTitle style={{ marginBottom: 20 }}>Photo Gallery</SectionTitle>
                <PhotoGrid>
                  <UploadCard onClick={() => photoInputRef.current?.click()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={physics.snappy}>
                    <Plus size={28} />
                    Add Photo
                  </UploadCard>
                  {photos.map((url, i) => (
                    <PhotoItem key={i} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                      <img src={url} alt={`Photo ${i + 1}`} />
                    </PhotoItem>
                  ))}
                </PhotoGrid>
                {photos.length === 0 && (
                  <p style={{ color: T.textMuted, textAlign: 'center', marginTop: 24, fontSize: '0.9rem' }}>
                    No photos yet. Upload your first photo to get started!
                  </p>
                )}
              </GlassPanel>
            </motion.div>
          )}

          {/* ═══════ ABOUT TAB ═══════ */}
          {activeTab === 'about' && (
            <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={physics.glissando}>
              {/* Personal Info */}
              <GlassPanel>
                <SectionTitle style={{ marginBottom: 16 }}>Personal Info</SectionTitle>
                <InfoRow>
                  <User size={18} />
                  <InfoLabel>Name</InfoLabel>
                  <span>{displayName || 'Not set'}</span>
                </InfoRow>
                <InfoRow>
                  <Activity size={18} />
                  <InfoLabel>Role</InfoLabel>
                  <span style={{ textTransform: 'capitalize' }}>{user?.role || 'Member'}</span>
                </InfoRow>
                <InfoRow>
                  <Calendar size={18} />
                  <InfoLabel>Joined</InfoLabel>
                  <span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}</span>
                </InfoRow>
              </GlassPanel>

              {/* Fitness Stats */}
              <GlassPanel>
                <SectionTitle style={{ marginBottom: 20 }}>Fitness Stats</SectionTitle>
                <GridRow>
                  <StatCard>
                    <Dumbbell size={24} color={T.iceWing} style={{ marginBottom: 8 }} />
                    <StatCardValue>{stats?.workouts ?? 0}</StatCardValue>
                    <StatCardLabel>Workouts</StatCardLabel>
                  </StatCard>
                  <StatCard>
                    <Zap size={24} color={T.gildedFern} style={{ marginBottom: 8 }} />
                    <StatCardValue>{stats?.streak ?? 0}</StatCardValue>
                    <StatCardLabel>Day Streak</StatCardLabel>
                  </StatCard>
                  <StatCard>
                    <Star size={24} color={T.arcticCyan} style={{ marginBottom: 8 }} />
                    <StatCardValue>{stats?.points ?? 0}</StatCardValue>
                    <StatCardLabel>Points</StatCardLabel>
                  </StatCard>
                  <StatCard>
                    <TrendingUp size={24} color={T.swanLavender} style={{ marginBottom: 8 }} />
                    <StatCardValue>Lv {stats?.level ?? 1}</StatCardValue>
                    <StatCardLabel>{stats?.tier ? stats.tier.charAt(0).toUpperCase() + stats.tier.slice(1) : 'Bronze'}</StatCardLabel>
                  </StatCard>
                </GridRow>
              </GlassPanel>

              {/* Achievements */}
              <GlassPanel>
                <SectionTitle style={{ marginBottom: 16 }}>Achievements</SectionTitle>
                {achievements.length > 0 ? (
                  achievements.map((ach, i) => (
                    <AchievementCard key={ach.id || i} $rarity={ach.rarity}>
                      <AchievementIcon $rarity={ach.rarity}>
                        <Award size={22} />
                      </AchievementIcon>
                      <div>
                        <div style={{ fontWeight: 600, color: T.frostWhite, fontSize: '0.92rem', marginBottom: 2 }}>{ach.name}</div>
                        <div style={{ color: T.textMuted, fontSize: '0.82rem' }}>{ach.description}</div>
                      </div>
                    </AchievementCard>
                  ))
                ) : (
                  <p style={{ color: T.textMuted, textAlign: 'center', fontSize: '0.9rem' }}>
                    Start your journey to earn achievements!
                  </p>
                )}
              </GlassPanel>
            </motion.div>
          )}

          {/* ═══════ ACTIVITY TAB ═══════ */}
          {activeTab === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={physics.glissando}>
              <GlassPanel>
                <SectionTitle style={{ marginBottom: 16 }}>Recent Activity</SectionTitle>
                {placeholderActivity.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <TimelineItem key={item.id}>
                      <TimelineDot $color={item.color}>
                        <ItemIcon size={18} />
                      </TimelineDot>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: T.frostWhite, fontSize: '0.92rem', marginBottom: 4 }}>{item.text}</div>
                        <div style={{ color: T.textMuted, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {item.time}
                        </div>
                      </div>
                    </TimelineItem>
                  );
                })}
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </ContentWrapper>

      {/* ═══════ Hidden File Inputs ═══════ */}
      <input ref={profileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'profile')} />
      <input ref={backgroundInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'background')} />
      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'photo')} />

      {/* ═══════ Upload Loading Overlay ═══════ */}
      <AnimatePresence>
        {(isUploading || uploadingType) && (
          <LoadingOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
            {uploadingType === 'profile' && 'Uploading profile photo...'}
            {uploadingType === 'background' && 'Uploading cover photo...'}
            {uploadingType === 'photo' && 'Uploading photo...'}
            {!uploadingType && 'Uploading...'}
          </LoadingOverlay>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

export default function UserDashboardWithErrorBoundary() {
  return (
    <UserDashboardErrorBoundary>
      <UserDashboard />
    </UserDashboardErrorBoundary>
  );
}

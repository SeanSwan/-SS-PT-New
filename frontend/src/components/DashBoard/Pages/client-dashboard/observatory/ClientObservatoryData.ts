/**
 * FILE: ClientObservatoryData.ts
 * PURPOSE: Small constants and safe display helpers for the client overview.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Dumbbell,
  Flame,
  Image as ImageIcon,
  MessageCircle,
  Trophy,
  Users,
  Video,
} from 'lucide-react';

import heroSwan from '../../../../../assets/crystal-swan.png';
import profileMark from '../../../../../assets/logo.svg';
import reelArt from '../../../../../assets/swan-paint-3.png';
import { isNonDeductingClientSource } from '../../../workspaces/clients-team/clientSessionSignal';

export type LensId = 'feed' | 'reels' | 'friends' | 'challenges';

export interface LensTab {
  id: LensId;
  label: string;
  Icon: LucideIcon;
  path: string;
}

export interface QuickAction {
  label: string;
  Icon: LucideIcon;
  path: string;
}

export interface ClientOverviewCoachSnapshot {
  level: number;
  points: number;
  progress: number;
  streakDays: number;
  canBookSessions: boolean;
  tierLabel?: string;
}

export type ClientSource = 'swanstudios' | 'move_fitness' | 'external' | string | null | undefined;

export interface TierDisplay {
  label: string;
  tone: 'bronze' | 'silver' | 'gold' | 'platinum' | 'crystal';
}

export interface FeedPostPreview {
  id?: string | number;
  content?: string;
  type?: string;
  mediaUrl?: string;
  mediaType?: string;
  createdAt?: string;
  likes?: number | unknown[];
  comments?: number | unknown[];
  user?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    photo?: string;
    profileImage?: string;
  };
}

export interface ChallengePreview {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  progress?: number;
  currentProgress?: number;
  target?: number;
  participants?: number;
}

export interface LeaderboardPreview {
  userId?: string | number;
  points?: number;
  overallLevel?: number;
  level?: number;
  client?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    photo?: string;
  };
}

export const OBSERVATORY_ASSETS = {
  heroSwan,
  profileMark,
  reelArt,
  feedFallback: heroSwan,
};

export const LENS_TABS: LensTab[] = [
  { id: 'feed', label: 'Feed', Icon: MessageCircle, path: '/dashboard/client/overview' },
  { id: 'reels', label: 'Reels', Icon: Video, path: '/dashboard/client/overview/reels' },
  { id: 'friends', label: 'Friends', Icon: Users, path: '/dashboard/client/overview/friends' },
  { id: 'challenges', label: 'Challenges', Icon: Trophy, path: '/dashboard/client/overview/challenges' },
];

export const CLIENT_OVERVIEW_COACH_PROMPT =
  "Teach me my client overview. Help me decide whether to log a workout, review progress, or ask for the next safe training action today.";

export const CLIENT_OVERVIEW_COACH_PATH =
  `/dashboard/client/coach-assistant?${new URLSearchParams({ teachPrompt: CLIENT_OVERVIEW_COACH_PROMPT }).toString()}`;

export function buildClientOverviewCoachPrompt(snapshot?: ClientOverviewCoachSnapshot): string {
  if (!snapshot) return CLIENT_OVERVIEW_COACH_PROMPT;
  const level = Number.isFinite(snapshot.level) ? Math.max(1, Math.round(snapshot.level)) : 1;
  const points = Number.isFinite(snapshot.points) ? Math.max(0, snapshot.points) : 0;
  const progress = clampPercent(snapshot.progress);
  const streakDays = Number.isFinite(snapshot.streakDays) ? Math.max(0, Math.round(snapshot.streakDays)) : 0;
  const bookingCue = snapshot.canBookSessions ? 'booking is open' : 'book through your trainer';
  return [
    'Teach me this overview.',
    `Snapshot: level ${level}; ${streakDays}d streak; ${progress}% to next level; ${compactNumber(points)} XP; ${bookingCue}.`,
    'Show one safest next action: log workout, review progress, book, or ask trainer.',
  ].join(' ');
}

export function buildClientOverviewCoachPath(snapshot?: ClientOverviewCoachSnapshot): string {
  return `/dashboard/client/coach-assistant?${new URLSearchParams({
    teachPrompt: buildClientOverviewCoachPrompt(snapshot),
  }).toString()}`;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Log Workout', Icon: Dumbbell, path: '/dashboard/client/log-workout' },
  { label: 'Progress', Icon: Flame, path: '/dashboard/client/progress' },
  { label: 'Ask Coach', Icon: MessageCircle, path: CLIENT_OVERVIEW_COACH_PATH },
  { label: 'Book Session', Icon: Trophy, path: '/dashboard/client/schedule' },
];

export function canBookSwanStudiosSessions(clientSource: ClientSource): boolean {
  return !isNonDeductingClientSource(clientSource);
}

export function quickActionsForClientSource(clientSource: ClientSource): QuickAction[] {
  if (canBookSwanStudiosSessions(clientSource)) return QUICK_ACTIONS;
  return QUICK_ACTIONS.filter((action) => action.path !== '/dashboard/client/schedule');
}

export const POST_CATEGORIES = ['Training', 'Nutrition', 'Progress', 'Community'] as const;

export const TIER_LABELS: Record<string, TierDisplay> = {
  bronze: { label: 'Bronze Forge', tone: 'bronze' },
  silver: { label: 'Silver Edge', tone: 'silver' },
  gold: { label: 'Titanium Core', tone: 'gold' },
  platinum: { label: 'Obsidian Warrior', tone: 'platinum' },
  bronze_forge: { label: 'Bronze Forge', tone: 'bronze' },
  silver_edge: { label: 'Silver Edge', tone: 'silver' },
  titanium_core: { label: 'Titanium Core', tone: 'gold' },
  obsidian_warrior: { label: 'Obsidian Warrior', tone: 'platinum' },
  crystalline_swan: { label: 'Crystalline Swan', tone: 'crystal' },
};

export function clampPercent(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value || 0), 0), 100);
}

export function compactNumber(value: number | undefined): string {
  if (!Number.isFinite(value)) return '0';
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

export function countCollection(value: number | unknown[] | undefined): number {
  if (Array.isArray(value)) return value.length;
  return typeof value === 'number' ? value : 0;
}

export function displayNameFrom(user: unknown, profile: unknown): string {
  const authUser = (user || {}) as Record<string, unknown>;
  const profileUser = (profile || {}) as Record<string, unknown>;
  const firstName = authUser.firstName || profileUser.firstName;
  const username = authUser.username || profileUser.username;

  return String(firstName || username || 'Athlete');
}

export function handleFrom(user: unknown, profile: unknown): string {
  const authUser = (user || {}) as Record<string, unknown>;
  const profileUser = (profile || {}) as Record<string, unknown>;
  return `@${String(authUser.username || profileUser.username || 'swanathlete')}`;
}

export function avatarFrom(user: unknown, profile: unknown): string {
  const authUser = (user || {}) as Record<string, unknown>;
  const profileUser = (profile || {}) as Record<string, unknown>;
  const src = authUser.photo || authUser.profileImage || profileUser.photo || profileUser.profileImage;
  return typeof src === 'string' && src ? src : OBSERVATORY_ASSETS.profileMark;
}

export function hashtagsFromPosts(posts: FeedPostPreview[]): string[] {
  const tags = posts
    .flatMap((post) => post.content?.match(/#[A-Za-z0-9_]+/g) || [])
    .map((tag) => tag.toLowerCase());
  return Array.from(new Set(tags)).slice(0, 5);
}

export function timeLabel(value?: string): string {
  if (!value) return 'Recent';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Recent';
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function iconLabel(icon?: string): string {
  return icon && icon.length <= 4 ? icon : 'Badge';
}

export const FALLBACK_LENS_ICON = ImageIcon;

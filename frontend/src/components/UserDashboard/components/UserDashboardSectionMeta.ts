/**
 * ============================================================================
 * FILE: UserDashboardSectionMeta.ts
 * PURPOSE: Section hero copy/tone/icon metadata for every non-home V3
 *          dashboard tab. Extracted from UserDashboardTabsV3 (rule 4 — file
 *          size) when workstream N added the friends/challenges/notifications
 *          tabs absorbed from the retired /social page.
 * HOW IT FITS: Consumed by the SectionChrome wrapper in UserDashboardTabsV3.
 * ============================================================================
 */
import {
  Activity,
  Aperture,
  Bell,
  Camera,
  Dumbbell,
  Info,
  MessageCircle,
  Trophy,
  UserPlus,
  UserRound,
  Users,
  Utensils,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { TabId } from '../types/UserDashboardTypes';

export interface SectionMetaEntry {
  eyebrow: string;
  title: string;
  copy: string;
  tone: 'cyan' | 'violet' | 'gold';
  Icon: LucideIcon;
}

export const sectionMeta: Record<Exclude<TabId, 'home'>, SectionMetaEntry> = {
  feed: {
    eyebrow: 'Community Signal',
    title: 'Feed',
    copy: 'Creator posts, training updates, and visible momentum from the SwanStudios community.',
    tone: 'cyan',
    Icon: MessageCircle,
  },
  reels: {
    eyebrow: 'Short-Form Creative',
    title: 'Reels',
    copy: 'Training clips, transformations, and creator highlights in the same crystalline dashboard language.',
    tone: 'violet',
    Icon: Video,
  },
  friends: {
    eyebrow: 'Inner Circle',
    title: 'Friends',
    copy: 'Your training circle — requests, suggestions, and the people keeping you accountable.',
    tone: 'cyan',
    Icon: UserPlus,
  },
  challenges: {
    eyebrow: 'Proving Ground',
    title: 'Challenges',
    copy: 'Active community challenges, streak battles, and the next milestone worth chasing.',
    tone: 'gold',
    Icon: Trophy,
  },
  notifications: {
    eyebrow: 'Signal Tower',
    title: 'Notifications',
    copy: 'Cheers, comments, follows, and coach signals — everything that happened while you trained.',
    tone: 'violet',
    Icon: Bell,
  },
  creative: {
    eyebrow: 'Media Forge',
    title: 'Creative',
    copy: 'Video drops and shared media organized as a premium creator gallery.',
    tone: 'violet',
    Icon: Aperture,
  },
  photos: {
    eyebrow: 'Visual Proof',
    title: 'Photo Library',
    copy: 'Uploaded photos, albums, progress proof, and reusable profile media in one focused view.',
    tone: 'cyan',
    Icon: Camera,
  },
  about: {
    eyebrow: 'Identity Core',
    title: 'About',
    copy: 'Profile signals, milestones, skill trees, and earned achievements.',
    tone: 'gold',
    Icon: Info,
  },
  activity: {
    eyebrow: 'Live Momentum',
    title: 'Activity',
    copy: 'Recent posts, workouts, reactions, and creator movement without leaving the observatory.',
    tone: 'cyan',
    Icon: Activity,
  },
  nutrition: {
    eyebrow: 'Fuel Lab',
    title: 'Nutrition',
    copy: 'Meal logging, hydration, macros, and food intelligence inside the same user dashboard shell.',
    tone: 'gold',
    Icon: Utensils,
  },
  progress: {
    eyebrow: 'Training Signal',
    title: 'Progress',
    copy: 'Workout usage and training analytics for the user-side daily loop.',
    tone: 'cyan',
    Icon: Dumbbell,
  },
  community: {
    eyebrow: 'Discovery',
    title: 'Community',
    copy: 'Feed, challenges, friends, factions, and community actions without duplicate navigation.',
    tone: 'violet',
    Icon: Users,
  },
  profile: {
    eyebrow: 'Creator Profile',
    title: 'Profile',
    copy: 'The profile overview remains focused while deeper media sections live in their own tabs.',
    tone: 'gold',
    Icon: UserRound,
  },
};

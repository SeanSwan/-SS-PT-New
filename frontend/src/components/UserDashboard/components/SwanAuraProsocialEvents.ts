/**
 * FILE: SwanAuraProsocialEvents.ts
 * PURPOSE: Read-only catalog of future Unity Weaver / Swan Aura prosocial events.
 *
 * This file intentionally does not award points. It is a typed contract for the
 * next gamification slice so positive community behaviors can be reviewed,
 * rate-limited, and wired server-side without inventing rules in UI components.
 */

export type SwanAuraProsocialCategory =
  | 'encouragement'
  | 'welcome'
  | 'gratitude'
  | 'progress_sharing'
  | 'challenge_support'
  | 'mentorship'
  | 'safety';

export interface SwanAuraProsocialEventDefinition {
  id: string;
  label: string;
  category: SwanAuraProsocialCategory;
  description: string;
  triggerSurface: 'user_dashboard' | 'social_feed' | 'comments' | 'challenges' | 'moderation_review';
  baseXP: number;
  dailyLimit: number;
  cooldownMinutes: number;
  requiresRecipient: boolean;
  requiresHumanOrSystemValidation: boolean;
  antiAbuseNotes: string[];
  futureBackendAction: string;
}

export const SWAN_AURA_PROSOCIAL_EVENTS: SwanAuraProsocialEventDefinition[] = [
  {
    id: 'encourage_friend',
    label: 'Encourage a Friend',
    category: 'encouragement',
    description: 'Send a sincere supportive comment or reaction to another member’s progress.',
    triggerSurface: 'social_feed',
    baseXP: 8,
    dailyLimit: 5,
    cooldownMinutes: 10,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: false,
    antiAbuseNotes: [
      'Do not award for repeated identical comments.',
      'Do not award for self-comments or self-reactions.',
      'Do not award if the target user hides or reports the interaction.',
    ],
    futureBackendAction: 'award_prosocial_xp_encouragement',
  },
  {
    id: 'welcome_new_member',
    label: 'Welcome a New Swan',
    category: 'welcome',
    description: 'Help a new member feel seen by welcoming them to the community.',
    triggerSurface: 'social_feed',
    baseXP: 10,
    dailyLimit: 3,
    cooldownMinutes: 20,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: false,
    antiAbuseNotes: [
      'Recipient account must be newer than 14 days.',
      'Only first qualifying welcome per recipient counts for each actor.',
      'Do not award for generic one-word spam.',
    ],
    futureBackendAction: 'award_prosocial_xp_welcome',
  },
  {
    id: 'gratitude_given',
    label: 'Give Gratitude',
    category: 'gratitude',
    description: 'Thank another member, trainer, or creator for helpful guidance or inspiration.',
    triggerSurface: 'comments',
    baseXP: 6,
    dailyLimit: 5,
    cooldownMinutes: 10,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: false,
    antiAbuseNotes: [
      'Do not count gratitude sent to the same recipient more than once per day.',
      'Require minimum meaningful text length when comment-based.',
    ],
    futureBackendAction: 'award_prosocial_xp_gratitude',
  },
  {
    id: 'positive_progress_post',
    label: 'Share Honest Progress',
    category: 'progress_sharing',
    description: 'Share a constructive progress update that encourages accountability without shaming self or others.',
    triggerSurface: 'user_dashboard',
    baseXP: 12,
    dailyLimit: 2,
    cooldownMinutes: 180,
    requiresRecipient: false,
    requiresHumanOrSystemValidation: false,
    antiAbuseNotes: [
      'Post must be original and not duplicated from another post.',
      'Do not award if the post is later held or removed by moderation.',
      'Do not reward unhealthy body-shaming language.',
    ],
    futureBackendAction: 'award_prosocial_xp_progress_post',
  },
  {
    id: 'challenge_cheer',
    label: 'Cheer the Team',
    category: 'challenge_support',
    description: 'Encourage a challenge teammate or group to keep moving toward a shared goal.',
    triggerSurface: 'challenges',
    baseXP: 8,
    dailyLimit: 4,
    cooldownMinutes: 15,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: false,
    antiAbuseNotes: [
      'Actor and recipient must both be connected to the challenge.',
      'Do not award repeated identical cheers.',
      'Do not award for taunts or competitive insults.',
    ],
    futureBackendAction: 'award_prosocial_xp_challenge_cheer',
  },
  {
    id: 'mentor_tip',
    label: 'Share a Helpful Tip',
    category: 'mentorship',
    description: 'Offer a useful training, nutrition, creativity, or platform tip that another user marks as helpful.',
    triggerSurface: 'comments',
    baseXP: 15,
    dailyLimit: 3,
    cooldownMinutes: 30,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: true,
    antiAbuseNotes: [
      'Requires recipient helpful mark, moderator mark, or high-confidence helpfulness signal.',
      'Do not award medical claims without safe-context review.',
      'Do not award if tip contains unsafe exercise advice.',
    ],
    futureBackendAction: 'award_prosocial_xp_mentor_tip',
  },
  {
    id: 'safe_report_confirmed',
    label: 'Protect the Community',
    category: 'safety',
    description: 'Accurately report harmful content that is later confirmed by moderation review.',
    triggerSurface: 'moderation_review',
    baseXP: 10,
    dailyLimit: 3,
    cooldownMinutes: 60,
    requiresRecipient: false,
    requiresHumanOrSystemValidation: true,
    antiAbuseNotes: [
      'Never award on report submission alone.',
      'Only award after moderator or trusted system confirmation.',
      'Repeated false reports should reduce report trust, not award XP.',
    ],
    futureBackendAction: 'award_prosocial_xp_confirmed_report',
  },
  {
    id: 'deescalation_assist',
    label: 'Bridge Builder',
    category: 'safety',
    description: 'Help calm a tense public thread with a respectful, constructive comment.',
    triggerSurface: 'moderation_review',
    baseXP: 20,
    dailyLimit: 2,
    cooldownMinutes: 120,
    requiresRecipient: false,
    requiresHumanOrSystemValidation: true,
    antiAbuseNotes: [
      'Requires thread-level context review before awarding.',
      'Do not award users who contributed to the escalation.',
      'Do not encourage untrained users to intervene in unsafe situations.',
    ],
    futureBackendAction: 'award_prosocial_xp_deescalation',
  },
];

export const SWAN_AURA_PROSOCIAL_EVENT_IDS = SWAN_AURA_PROSOCIAL_EVENTS.map(event => event.id);

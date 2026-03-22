/**
 * ============================================================================
 * FILE: GoalConstants.ts
 * PURPOSE: 25+ sports and fitness goal options for client onboarding
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines categorized goal options for the onboarding
 * GoalsSection chip selector. Organized into 5 categories so the UI can
 * render section headers for easier scanning on mobile.
 *
 * HOW IT FITS IN THE APP: GoalConstants → GoalsSection → ClientOnboardingWizard
 * KEY DECISIONS: Categories keep the 30+ options scannable. Golf first in
 *   Sports because wealthy golf clients are the primary target demographic.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Goal category definitions
// PURPOSE: Grouped goals for categorized chip display
// WHY: 30+ flat chips is overwhelming — categories improve scan speed
// ─────────────────────────────────────────────────────────────

export interface GoalCategory {
  label: string;
  goals: readonly string[];
}

export const GOAL_CATEGORIES: readonly GoalCategory[] = [
  {
    label: 'Body Composition',
    goals: [
      'Fat Loss',
      'Muscle Gain',
      'Body Recomposition',
      'Weight Management',
      'Lean Muscle Definition',
    ],
  },
  {
    label: 'Strength & Power',
    goals: [
      'Strength & Power',
      'Powerlifting',
      'Olympic Weightlifting',
      'Functional Strength',
    ],
  },
  {
    label: 'Sports Performance',
    goals: [
      'Golf Performance',
      'Tennis Performance',
      'Basketball Training',
      'Football/Soccer Conditioning',
      'Baseball/Softball Training',
      'Swimming Performance',
      'Running & Marathon Prep',
      'Cycling Performance',
      'Boxing & MMA',
      'Volleyball Training',
      'Track & Field',
      'Skiing & Snowboarding Prep',
      'Surfing & Water Sports',
      'Hiking & Mountaineering',
      'Pickleball Performance',
    ],
  },
  {
    label: 'Health & Recovery',
    goals: [
      'General Health & Wellness',
      'Improve Mobility & Flexibility',
      'Injury Recovery & Prevention',
      'Posture Correction',
      'Stress Management & Energy',
      'Senior Fitness & Balance',
    ],
  },
  {
    label: 'Endurance & Conditioning',
    goals: [
      'Endurance & Conditioning',
      'Athletic Performance',
      'HIIT & Metabolic Conditioning',
      'Obstacle Course / Spartan Race',
    ],
  },
] as const;

// Flat list for backward compatibility + validation
export const ALL_GOAL_OPTIONS: readonly string[] = [
  ...GOAL_CATEGORIES.flatMap(c => c.goals),
  'Other (specify below)',
];

// Total count (excluding "Other")
export const GOAL_COUNT = ALL_GOAL_OPTIONS.length - 1;

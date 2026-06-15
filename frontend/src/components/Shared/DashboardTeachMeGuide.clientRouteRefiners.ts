/**
 * SHARED LOGIC: Client dashboard Teach Me route refiners.
 * PURPOSE: Teaches clients the lowest-click next step on training, progress,
 * booking, nutrition, community, messaging, and safety surfaces.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

const clientBookingFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client booking flow',
  summary: 'Use scheduling to lock the next coached session while your recent training context is still clear.',
  focus: 'Book the next session after reviewing your current training state so your coach sees the right context.',
  primaryAction: { label: 'Book My Session', to: '/dashboard/client/schedule' },
  fastPath: [
    'Pick the next training window.',
    'Confirm the session.',
    'Message the coach if context changed.',
  ],
  primaryPrompt: 'teach me the client booking workflow',
});

const clientOnboardingFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client onboarding flow',
  summary: 'Use onboarding to finish the basics before Coach, logging, and booking start making smart recommendations.',
  focus: 'Finish profile, consent, goals, and pain context first so the first workout is useful instead of generic.',
  primaryAction: { label: 'Finish Onboarding', to: '/dashboard/client/onboarding' },
  fastPath: [
    'Finish profile and goals.',
    'Confirm consent and pain context.',
    'Book, log, or ask Coach next.',
  ],
  actions: [
    { label: 'Finish Onboarding', to: '/dashboard/client/onboarding' },
    { label: 'Coach Consent', to: '/dashboard/client/ai-consent' },
    { label: 'Pain Chart', to: '/dashboard/client/body-map' },
    { label: 'Book Session', to: '/dashboard/client/schedule' },
  ],
  primaryPrompt: 'teach me the client onboarding workflow',
});

const clientProgressProof = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client progress proof',
  summary: 'Use progress routes to see what changed from real workout logs, then decide what to do next.',
  focus: 'Progress is proof, not decoration: if the story is stale, log the missing work before judging the trend.',
  primaryAction: { label: 'Review Progress', to: '/dashboard/client/progress' },
  fastPath: [
    'Read the current trend.',
    'Check whether logging is current.',
    'Ask Coach or book next.',
  ],
  primaryPrompt: 'teach me the client progress workflow',
});

const clientRewardsFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client rewards flow',
  summary: 'Use Rewards to see what training consistency unlocked, then turn the next milestone into action.',
  focus: 'Rewards should pull you back into the training loop: claim the proof, then log, book, or share the next win.',
  primaryAction: { label: 'Open Rewards', to: '/dashboard/client/rewards' },
  fastPath: [
    'Open your current rewards.',
    'Check the next milestone.',
    'Log, book, or share the next win.',
  ],
  actions: [
    { label: 'Rewards', to: '/dashboard/client/rewards' },
    { label: 'Progress', to: '/dashboard/client/progress' },
    { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' },
    { label: 'Community', to: '/dashboard/client/community' },
  ],
  primaryPrompt: 'teach me the client rewards workflow',
});

const clientAchievementHome = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client achievement home',
  summary: 'Use My Home as an unlocked proof space that points back to real training, rewards, and progress.',
  focus: 'Keep the unlock meaningful: check what earned it, then log, review progress, or share a real milestone.',
  primaryAction: { label: 'Open My Home', to: '/dashboard/client/my-home' },
  fastPath: [
    'Open the achievement space.',
    'Check the reward or unlock.',
    'Return to progress or logging.',
  ],
  actions: [
    { label: 'My Home', to: '/dashboard/client/my-home' },
    { label: 'Rewards', to: '/dashboard/client/rewards' },
    { label: 'Progress', to: '/dashboard/client/progress' },
    { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' },
  ],
  primaryPrompt: 'teach me the client achievement home workflow',
});

const clientWorkoutLogging = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client workout logging',
  summary: 'Use Log Workout first so Coach, charts, and progress proof all work from the real session.',
  focus: 'Load today, enter what you actually completed, save notes and pain signals, then review progress.',
  primaryAction: { label: "Log Today's Workout", to: '/dashboard/client/log-workout?loadPlan=today' },
  fastPath: [
    "Open today's workout.",
    'Enter sets, reps, load, notes, and pain signals.',
    'Save before checking progress or community.',
  ],
  actions: [
    { label: "Log Today's Workout", to: '/dashboard/client/log-workout?loadPlan=today' },
    { label: 'Ask Coach', to: '/dashboard/client/coach-assistant' },
    { label: 'My Workouts', to: '/dashboard/client/workouts' },
    { label: 'Progress', to: '/dashboard/client/progress' },
  ],
  primaryPrompt: 'teach me the client workout logging workflow',
});

const clientWorkoutHistory = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client workout history',
  summary: 'Use workout history to understand what was saved, spot missing logs, and feed the next Coach question.',
  focus: 'Review history only after today is logged; stale history means the next chart and Coach answer will be off.',
  primaryAction: { label: 'Review Workouts', to: '/dashboard/client/workouts' },
  fastPath: [
    'Check the latest saved workout.',
    'Spot missing sets or notes.',
    'Log or ask Coach before moving on.',
  ],
  primaryPrompt: 'teach me the client workout history workflow',
});

const clientCommunityFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client community proof',
  summary: 'Use community after the workout story is current so reactions, challenges, and live moments stay tied to real progress.',
  focus: 'Share proof after training is logged. Community works best when the milestone is specific and truthful.',
  primaryAction: { label: 'Open Community', to: '/dashboard/client/community' },
  fastPath: [
    'Confirm the training proof.',
    'Choose the post, live, or challenge moment.',
    'Share the milestone cleanly.',
  ],
  actions: [
    { label: 'Community', to: '/dashboard/client/community' },
    { label: 'Progress', to: '/dashboard/client/progress' },
    { label: 'Log Workout', to: '/dashboard/client/log-workout' },
    { label: 'Messages', to: '/dashboard/client/messages' },
  ],
  primaryPrompt: 'teach me the client community workflow',
});

const clientLiveFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client live training flow',
  summary: 'Use live streams when the workout moment is happening now, then log the work so progress stays truthful.',
  focus: 'Join the live workout, capture what you completed, then log or message before leaving.',
  primaryAction: { label: 'Open Live Streams', to: '/dashboard/client/live' },
  fastPath: [
    'Join the live session.',
    'Complete the workout.',
    'Log or message the result.',
  ],
  actions: [
    { label: 'Live Streams', to: '/dashboard/client/live' },
    { label: 'Log Workout', to: '/dashboard/client/log-workout' },
    { label: 'Ask Coach', to: '/dashboard/client/coach-assistant' },
    { label: 'Progress', to: '/dashboard/client/progress' },
  ],
  primaryPrompt: 'teach me the client live workout workflow',
});

const clientCreatorFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client creator flow',
  summary: 'Use creator routes after the training proof is current so content points back to the real work.',
  focus: 'Create from a real milestone, not from a stale feed. Log first, then package the story.',
  primaryAction: { label: 'Open Creators', to: '/dashboard/client/creators' },
  fastPath: [
    'Confirm the milestone.',
    'Create the post or offer.',
    'Link it back to progress.',
  ],
  actions: [
    { label: 'Creators', to: '/dashboard/client/creators' },
    { label: 'Community', to: '/dashboard/client/community' },
    { label: 'Progress', to: '/dashboard/client/progress' },
    { label: 'Log Workout', to: '/dashboard/client/log-workout' },
  ],
  primaryPrompt: 'teach me the client creator workflow',
});

const clientCompetitionFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client competition flow',
  summary: 'Use Virtual Olympics as a performance moment backed by current logged training.',
  focus: 'Compete only from a truthful baseline: log training, review progress, then enter the event.',
  primaryAction: { label: 'Open Virtual Olympics', to: '/dashboard/client/virtual-olympics' },
  fastPath: [
    'Check the event.',
    'Confirm your logged baseline.',
    'Compete and save proof.',
  ],
  actions: [
    { label: 'Virtual Olympics', to: '/dashboard/client/virtual-olympics' },
    { label: 'Progress', to: '/dashboard/client/progress' },
    { label: 'Log Workout', to: '/dashboard/client/log-workout' },
    { label: 'Community', to: '/dashboard/client/community' },
  ],
  primaryPrompt: 'teach me the client competition workflow',
});

const clientMessageFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client coach messaging',
  summary: 'Use messages to give your coach the context they need before the next session or plan change.',
  focus: 'Message with the specific training signal: pain, fatigue, missed work, schedule change, or progress question.',
  primaryAction: { label: 'Message Coach', to: '/dashboard/client/messages' },
  fastPath: [
    'Name the issue or update.',
    'Attach the training context.',
    'Book, log, or ask Coach if action is needed.',
  ],
  primaryPrompt: 'teach me the client messaging workflow',
});

const clientNutritionFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client nutrition support',
  summary: 'Use nutrition after the training goal is clear so meal logging supports the plan instead of becoming a separate chore.',
  focus: 'Connect nutrition to the current training goal, energy, recovery, and coach follow-up.',
  primaryAction: { label: 'Open Nutrition', to: '/dashboard/client/meal-planner' },
  fastPath: [
    'Log the meal or macro context.',
    'Compare it to the training goal.',
    'Ask Coach what to adjust next.',
  ],
  primaryPrompt: 'teach me the client nutrition workflow',
});

const clientSafetyProfileFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client safety profile',
  summary: 'Use safety and profile routes to keep consent, pain, injury, and preferences accurate for the coach.',
  focus: 'Pain, injury, privacy, and profile changes should be updated before the next workout or Coach plan change.',
  primaryAction: { label: 'Update Safety Profile', to: '/dashboard/client/body-map' },
  fastPath: [
    'Update pain, injury, or profile context.',
    'Confirm privacy or consent if needed.',
    'Message Coach when training should change.',
  ],
  actions: [
    { label: 'Pain Chart', to: '/dashboard/client/body-map' },
    { label: 'Profile', to: '/dashboard/client/profile' },
    { label: 'Coach Consent', to: '/dashboard/client/ai-consent' },
    { label: 'Messages', to: '/dashboard/client/messages' },
  ],
  primaryPrompt: 'teach me the client safety profile workflow',
});

export const refineClientGuide = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (includesAny(path, ['onboarding'])) return clientOnboardingFlow(base);
  if (includesAny(path, ['schedule'])) return clientBookingFlow(base);
  if (includesAny(path, ['my-home'])) return clientAchievementHome(base);
  if (includesAny(path, ['rewards'])) return clientRewardsFlow(base);
  if (includesAny(path, ['progress'])) return clientProgressProof(base);
  if (includesAny(path, ['log-workout'])) return clientWorkoutLogging(base);
  if (includesAny(path, ['workouts'])) return clientWorkoutHistory(base);
  if (includesAny(path, ['live'])) return clientLiveFlow(base);
  if (includesAny(path, ['creators'])) return clientCreatorFlow(base);
  if (includesAny(path, ['virtual-olympics'])) return clientCompetitionFlow(base);
  if (includesAny(path, ['community'])) {
    return clientCommunityFlow(base);
  }
  if (includesAny(path, ['messages'])) return clientMessageFlow(base);
  if (includesAny(path, ['meal-planner'])) return clientNutritionFlow(base);
  if (includesAny(path, ['body-map', 'profile', 'ai-consent'])) return clientSafetyProfileFlow(base);
  if (includesAny(path, ['coach-assistant'])) {
    return applyPatch(base, {
      primaryAction: { label: 'Ask Coach', to: '/dashboard/client/coach-assistant' },
      fastPath: [
        'Ask the question clearly.',
        'Review the staged answer.',
        'Log or book if action is needed.',
      ],
      primaryPrompt: 'teach me how to use Swan Coach as a client',
    });
  }
  return base;
};

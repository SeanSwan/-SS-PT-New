/**
 * Challenge template catalog for SwanStudios challenge creation.
 *
 * The catalog is intentionally model-compatible: each preset maps to fields
 * already present on the Challenge model, while rule/governance metadata gives
 * the future Admin/Trainer creator enough structure to stay workout-first.
 */

const freezePolicyControl = (control) => Object.freeze(control);

const CLIENT_CREATION_CONTROLS = Object.freeze([
  {
    key: 'private_self_challenges',
    label: 'Private self-challenges',
    value: 'Closed until entitlement',
    enabled: false,
    detail: 'Client-only drafts stay gated until an admin entitlement exists.',
  },
  {
    key: 'trainer_visible_submissions',
    label: 'Trainer-visible submissions',
    value: 'Review queue required',
    enabled: false,
    detail: 'Client ideas require entitlement storage and a moderation queue before trainers can act on them.',
  },
  {
    key: 'public_or_team_publish',
    label: 'Public or team publish',
    value: 'Closed until moderation',
    enabled: false,
    detail: 'Shared challenge publishing waits for reporting, blocking, and review safeguards.',
  },
  {
    key: 'media_uploads',
    label: 'Media uploads',
    value: 'Closed until moderation',
    enabled: false,
    detail: 'Images and video stay off until media review tooling is connected.',
  },
  {
    key: 'comments',
    label: 'Comments',
    value: 'Closed until reporting and blocking',
    enabled: false,
    detail: 'Discussion controls stay closed until reporting and blocking flows exist.',
  },
  {
    key: 'content_filtering',
    label: 'Content filtering',
    value: 'Required before public release',
    enabled: false,
    detail: 'Shared challenge names, descriptions, and media need connected filtering before public discovery.',
  },
  {
    key: 'reporting_flow',
    label: 'Reporting flow',
    value: 'Required before public release',
    enabled: false,
    detail: 'Clients need a visible way to report unsafe or objectionable shared challenge content.',
  },
  {
    key: 'blocking_flow',
    label: 'Blocking flow',
    value: 'Required before public release',
    enabled: false,
    detail: 'Community challenge rollout waits for block controls that protect clients from abusive creators.',
  },
  {
    key: 'safety_contact',
    label: 'Safety contact',
    value: 'Published contact required',
    enabled: false,
    detail: 'Public UGC launch needs a maintained support contact for challenge safety escalations.',
  },
  {
    key: 'terms_acceptance',
    label: 'Terms acceptance',
    value: 'Required at rollout',
    enabled: false,
    detail: 'Shared challenge creation waits for creator terms and conduct acknowledgement.',
  },
  {
    key: 'auto_publish',
    label: 'Auto-publish',
    value: 'Disabled',
    enabled: false,
    detail: 'Client-originated challenges require human review before any shared visibility.',
  },
  {
    key: 'moderation_default',
    label: 'Moderation default',
    value: 'Moderation required',
    enabled: true,
    detail: 'Review remains the default gate for public or team challenge proposals.',
  },
  {
    key: 'creator_roles',
    label: 'Creator roles',
    value: 'Admin + Trainer',
    enabled: true,
    detail: 'Operational challenge creation remains owned by staff roles.',
  },
].map(freezePolicyControl));

const GOVERNANCE = Object.freeze({
  creatorRoles: Object.freeze(['admin', 'trainer']),
  clientCreation: 'disabled_by_default',
  clientCreationControls: CLIENT_CREATION_CONTROLS,
  requiresModerationForClientPublish: true,
  publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
});

const CHALLENGE_TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'challenge-template:consistency-7-day-flexibility',
    archetype: 'consistency',
    title: '7-Day Flexibility Rhythm',
    description: 'Complete one stretching or flexibility session each day for seven days.',
    challengeType: 'weekly',
    category: 'fitness',
    difficulty: 2,
    xpReward: 80,
    maxProgress: 7,
    progressUnit: 'days',
    requirements: Object.freeze(['Log a completed stretching or flexibility session from the workout flow.']),
    tags: Object.freeze(['consistency', 'flexibility', 'stretching']),
    rule: Object.freeze({
      source: 'canonical_workout_event',
      metric: 'flexibility_sessions_completed',
      validation: 'Count completed stretching or flexibility workout sessions; coach-approved substitutions count.',
    }),
    governance: GOVERNANCE,
  }),
  Object.freeze({
    id: 'challenge-template:session-three-planned-sessions',
    archetype: 'session_completion',
    title: 'Three Planned Sessions',
    description: 'Finish three assigned training sessions in a week and keep the plan moving.',
    challengeType: 'weekly',
    category: 'fitness',
    difficulty: 3,
    xpReward: 120,
    maxProgress: 3,
    progressUnit: 'sessions',
    requirements: Object.freeze(['Complete assigned sessions from the trainer plan or workout logger.']),
    tags: Object.freeze(['sessions', 'program', 'training-plan', 'assigned-session']),
    rule: Object.freeze({
      source: 'canonical_workout_event',
      metric: 'assigned_sessions_completed',
      assignedSessionOnly: true,
      validation: 'Count completed assigned sessions from saved workout logs or trainer-confirmed sessions.',
    }),
    governance: GOVERNANCE,
  }),
  Object.freeze({
    id: 'challenge-template:minutes-150-minute-week',
    archetype: 'active_minutes',
    title: '150-Minute Week',
    description: 'Build a full week of active minutes across logged training, cardio, and conditioning work.',
    challengeType: 'weekly',
    category: 'fitness',
    difficulty: 3,
    xpReward: 150,
    maxProgress: 150,
    progressUnit: 'minutes',
    requirements: Object.freeze(['Log active minutes through workout sessions or trainer-approved activity entries.']),
    tags: Object.freeze(['minutes', 'conditioning', 'weekly-rhythm']),
    rule: Object.freeze({
      source: 'canonical_workout_event',
      metric: 'active_minutes_logged',
      validation: 'Sum active workout and conditioning minutes from canonical workout events inside the challenge window.',
    }),
    governance: GOVERNANCE,
  }),
  Object.freeze({
    id: 'challenge-template:exercise-family-push-pattern',
    archetype: 'exercise_family',
    title: 'Push Pattern Builder',
    description: 'Complete coach-approved push-pattern work across the week using the exercise Rolodex family.',
    challengeType: 'weekly',
    category: 'fitness',
    difficulty: 3,
    xpReward: 110,
    maxProgress: 3,
    progressUnit: 'workouts',
    requirements: Object.freeze(['Complete workouts containing push-pattern exercises or approved substitutions.']),
    tags: Object.freeze(['exercise-family', 'rolodex', 'push']),
    rule: Object.freeze({
      source: 'canonical_workout_event',
      metric: 'exercise_family_sessions_completed',
      exerciseFamily: 'push',
      validation: 'Count workout sessions with matching Rolodex exercise-family tags or coach-approved substitutions.',
    }),
    governance: GOVERNANCE,
  }),
  Object.freeze({
    id: 'challenge-template:improvement-personal-best-progression',
    archetype: 'improvement',
    title: 'Personal Best Progression',
    description: 'Improve a coach-selected lift, movement quality score, or volume marker during the challenge window.',
    challengeType: 'monthly',
    category: 'fitness',
    difficulty: 4,
    xpReward: 180,
    maxProgress: 1,
    progressUnit: 'custom',
    requirements: Object.freeze(['Coach selects the tracked metric before publishing the challenge.']),
    tags: Object.freeze(['progress', 'personal-best', 'coach-validated']),
    rule: Object.freeze({
      source: 'canonical_workout_event',
      metric: 'coach_validated_progress_marker',
      validation: 'Compare baseline and latest workout/progress marker after coach validation.',
    }),
    governance: GOVERNANCE,
  }),
  Object.freeze({
    id: 'challenge-template:team-squad-program-week',
    archetype: 'team',
    title: 'Squad Program Week',
    description: 'A small squad completes its assigned sessions together and earns progress as a team.',
    challengeType: 'community',
    category: 'community_meetup',
    difficulty: 3,
    xpReward: 140,
    maxProgress: 12,
    progressUnit: 'sessions',
    allowTeams: true,
    maxTeamSize: 4,
    requirements: Object.freeze(['Every squad member contributes completed workout sessions toward the team total.']),
    tags: Object.freeze(['team', 'squad', 'accountability', 'assigned-session']),
    rule: Object.freeze({
      source: 'canonical_workout_event',
      metric: 'team_assigned_sessions_completed',
      assignedSessionOnly: true,
      validation: 'Sum completed assigned sessions across team members inside the challenge window.',
    }),
    governance: GOVERNANCE,
  }),
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

export function listChallengeArchetypes() {
  return CHALLENGE_TEMPLATES.map((template) => template.archetype);
}

export function getChallengeTemplateCatalog() {
  return CHALLENGE_TEMPLATES.map((template) => clone(template));
}

export function getChallengeGovernancePolicy() {
  return clone(GOVERNANCE);
}

export function getChallengeTemplateById(templateId) {
  const template = CHALLENGE_TEMPLATES.find((item) => item.id === templateId);
  return template ? clone(template) : null;
}

export default getChallengeTemplateCatalog;

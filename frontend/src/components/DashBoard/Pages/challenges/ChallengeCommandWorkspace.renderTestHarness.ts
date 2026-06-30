/**
 * Challenge workspace render-test harness.
 *
 * Keeps the mocked workspace hooks and reset fixture in one place so render specs
 * stay focused on behavior instead of duplicating challenge setup data.
 */
import { vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  reload: vi.fn(() => Promise.resolve()),
  reloadManaged: vi.fn(() => Promise.resolve()),
  publishManaged: vi.fn(() => Promise.resolve()),
  updateManaged: vi.fn(() => Promise.resolve()),
  saveManaged: vi.fn(() => Promise.resolve(true)),
  reloadAudience: vi.fn(() => Promise.resolve()),
  reloadSubmissions: vi.fn(() => Promise.resolve()),
  reloadResults: vi.fn(() => Promise.resolve()),
  selectResult: vi.fn(),
  moderateSubmission: vi.fn(() => Promise.resolve(true)),
  createDraft: vi.fn(() => Promise.resolve({ id: 'challenge-1' })),
  state: {
    templates: [
      {
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
        requirements: ['Log completed training from the workout flow.'],
        tags: ['consistency'],
        rule: {
          source: 'canonical_workout_event',
          metric: 'flexibility_sessions_completed',
          validation: 'Count completed flexibility sessions.',
        },
        governance: {
          creatorRoles: ['admin', 'trainer'],
          clientCreation: 'disabled_by_default',
          requiresModerationForClientPublish: true,
          publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
        },
      },
      {
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
        requirements: ['Complete assigned sessions from the trainer plan or workout logger.'],
        tags: ['sessions', 'program', 'training-plan', 'assigned-session'],
        rule: {
          source: 'canonical_workout_event',
          metric: 'assigned_sessions_completed',
          assignedSessionOnly: true,
          validation: 'Count completed assigned sessions from saved workout logs or trainer-confirmed sessions.',
        },
        governance: {
          creatorRoles: ['admin', 'trainer'],
          clientCreation: 'disabled_by_default',
          requiresModerationForClientPublish: true,
          publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
        },
      },    ],
    archetypes: ['consistency', 'session_completion'],
    governance: {
      creatorRoles: ['admin', 'trainer'],
      clientCreation: 'disabled_by_default',
      requiresModerationForClientPublish: true,
      publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
    },
    loading: false,
    error: null,
    moderatingId: null,
    actionMessage: null,
    actionError: null,
  },
  managed: {
    challenges: [
      {
        id: 'challenge-1',
        title: 'July Squad Spark',
        description: 'A trainer-created draft built from the governed team template.',
        challengeType: 'community',
        category: 'community_meetup',
        difficulty: 3,
        xpReward: 140,
        maxProgress: 12,
        progressUnit: 'sessions',
        startDate: '2026-07-06T12:00:00.000Z',
        endDate: '2026-07-13T12:00:00.000Z',
        status: 'draft',
        currentParticipants: 4,
        maxParticipants: 16,
        allowTeams: true,
        maxTeamSize: 4,
        completionRate: 50,
        participants: [
          {
            id: 'participant-1',
            userId: '11',
            currentProgress: 12,
            progressPercentage: 100,
            status: 'completed',
            joinedAt: '2026-07-06T12:00:00.000Z',
            user: { id: '11', firstName: 'Avery', lastName: 'Stone' },
          },
          {
            id: 'participant-2',
            userId: '12',
            currentProgress: 6,
            progressPercentage: 50,
            status: 'active',
            joinedAt: '2026-07-06T12:00:00.000Z',
            user: { id: '12', firstName: 'Mika', lastName: 'Rivera' },
          },
        ],
      },
    ],
    loading: false,
    error: null,
    notice: null,
    updatingId: null,
  },
  audience: {
    options: [
      { id: '11', name: 'Avery Stone', source: 'swanstudios', membership: 'premium', workouts: 18 },
      { id: '12', name: 'Mika Rivera', source: 'move_fitness', membership: 'basic', workouts: 7 },
    ],
    sourceLabel: 'Assigned clients',
    loading: false,
    error: null,
    moderatingId: null,
    actionMessage: null,
    actionError: null,
  },
  results: {
    selectedChallengeId: 'challenge-1',
    loading: false,
    error: null,
    result: {
      challenge: { id: 'challenge-1', title: 'July Squad Spark', status: 'active', progressUnit: 'sessions' },
      summary: {
        participantCount: 4,
        activeParticipantCount: 2,
        completedParticipantCount: 2,
        droppedParticipantCount: 0,
        completionRate: 50,
        averageProgressPercentage: 75,
        totalCurrentProgress: 18,
        checkInsCount: 6,
        daysLeft: 7,
        maxProgress: 12,
        progressUnit: 'sessions',
        statusBreakdown: { active: 2, completed: 2 },
      },
      topParticipants: [
        {
          id: 'participant-1',
          userId: '11',
          displayName: 'Avery Stone',
          avatarUrl: null,
          status: 'completed',
          currentProgress: 12,
          progressPercentage: 100,
          score: 120,
          rank: null,
          xpEarned: 250,
          checkInsCount: 4,
          joinedAt: '2026-07-06T12:00:00.000Z',
          completedAt: '2026-07-09T12:00:00.000Z',
          lastProgressUpdate: '2026-07-09T12:00:00.000Z',
        },
      ],
      workoutImpact: {
        completedWorkoutEvents: 2,
        totalDelta: 2,
        latestWorkoutImpact: null,
      },
    },
  },
  submissions: {
    submissions: [],
    queueStatus: 'empty_by_policy',
    message: 'Backend queue confirms client-created submissions are closed.',
    governance: {
      creatorRoles: ['admin', 'trainer'],
      clientCreation: 'disabled_by_default',
      requiresModerationForClientPublish: true,
      publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
    },
    loading: false,
    error: null,
    moderatingId: null,
    actionMessage: null,
    actionError: null,
  },
}));
vi.mock('./useChallengeTemplates', () => ({
  isAssignedSessionChallengeTemplate: (template: { rule?: { assignedSessionOnly?: boolean; requiresAssignedSession?: boolean; metric?: string }; tags?: string[] }) => {
    const metric = String(template.rule?.metric ?? '').toLowerCase();
    const tags = Array.isArray(template.tags) ? template.tags : [];
    return template.rule?.assignedSessionOnly === true
      || template.rule?.requiresAssignedSession === true
      || metric === 'assigned_sessions_completed'
      || metric === 'team_assigned_sessions_completed'
      || tags.includes('assigned-session');
  },
  useChallengeTemplates: () => ({ ...mocks.state, reload: mocks.reload }),
}));
vi.mock('./useManagedChallenges', () => ({
  useManagedChallenges: () => ({
    ...mocks.managed,
    reload: mocks.reloadManaged,
    publishChallenge: mocks.publishManaged,
    updateChallengeStatus: mocks.updateManaged,
    saveChallengeAudience: mocks.saveManaged,
    audienceUpdatingId: null,
  }),
}));
vi.mock('./useChallengeResults', () => ({
  useChallengeResults: () => ({
    ...mocks.results,
    reload: mocks.reloadResults,
    selectChallenge: mocks.selectResult,
  }),
}));
vi.mock('./useChallengeSubmissions', () => ({
  useChallengeSubmissions: () => ({ ...mocks.submissions, reload: mocks.reloadSubmissions, moderateSubmission: mocks.moderateSubmission }),
}));
vi.mock('./useChallengeAudienceOptions', () => ({
  useChallengeAudienceOptions: () => ({ ...mocks.audience, reload: mocks.reloadAudience }),
}));
vi.mock('./useChallengeDraftCreator', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    useChallengeDraftCreator: () => {
      const [created, setCreated] = ReactActual.useState<unknown | null>(null);
      return {
        createDraft: async (payload: unknown) => {
          const result = await mocks.createDraft(payload);
          setCreated(result);
          return result;
        },
        creating: false,
        error: null,
        created,
      };
    },
  };
});
export { mocks };
export const resetChallengeWorkspaceMocks = () => {
    mocks.managed.challenges[0].status = 'draft';
    mocks.managed.challenges[0].startDate = '2026-07-06T12:00:00.000Z';
    mocks.managed.challenges[0].endDate = '2026-07-13T12:00:00.000Z';
    mocks.managed.challenges[0].currentParticipants = 4;
    mocks.managed.challenges[0].maxParticipants = 16;
    mocks.managed.challenges[0].completionRate = 50;
    mocks.managed.loading = false;
    mocks.managed.error = null;
    mocks.managed.notice = null;
    mocks.managed.updatingId = null;
    mocks.submissions.submissions = [];
    mocks.submissions.queueStatus = 'empty_by_policy';
    mocks.submissions.message = 'Backend queue confirms client-created submissions are closed.';
    mocks.submissions.loading = false;
    mocks.submissions.error = null;
    mocks.submissions.moderatingId = null;
    mocks.submissions.actionMessage = null;
    mocks.submissions.actionError = null;
    mocks.reload.mockClear();
    mocks.reloadManaged.mockClear();
    mocks.reloadAudience.mockClear();
    mocks.reloadSubmissions.mockClear();
    mocks.reloadResults.mockClear();
    mocks.selectResult.mockClear();
    mocks.moderateSubmission.mockClear();
    mocks.publishManaged.mockClear();
    mocks.updateManaged.mockClear();
    mocks.saveManaged.mockClear();
    mocks.createDraft.mockClear();
};

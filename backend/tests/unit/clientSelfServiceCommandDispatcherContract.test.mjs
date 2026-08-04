/**
 * Client self-service command dispatcher contracts
 * ================================================
 * Ensures Swan Coach can answer client-owned workout/progress/gamification
 * reads from real models without leaking private profile details.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDispatcher } from './clientSelfServiceCommandDispatcherHarness.mjs';

afterEach(() => {
  delete process.env.SWAN_DISPLAY_TZ;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});
describe('client self-service command dispatchers', () => {
  it('wires client self-service command handlers', async () => {
    const { hasDispatcher } = await loadDispatcher();

    expect(hasDispatcher('my_workout_today')).toBe(true);
    expect(hasDispatcher('log_my_nutrition')).toBe(true);
    expect(hasDispatcher('my_progress')).toBe(true);
    expect(hasDispatcher('my_xp')).toBe(true);
    expect(hasDispatcher('my_streaks_badges')).toBe(true);
    expect(hasDispatcher('track_my_pain')).toBe(true);
    expect(hasDispatcher('exercises_to_avoid')).toBe(true);
    expect(hasDispatcher('schedule_my_session')).toBe(true);
    expect(hasDispatcher('request_plan_adjustment')).toBe(true);
  });

  it('summarizes the active workout plan for the authenticated client', async () => {
    process.env.SWAN_DISPLAY_TZ = 'America/Los_Angeles';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T04:30:00.000Z'));

    const { dispatch, WorkoutPlan } = await loadDispatcher();
    const assignmentKey = 'plan-1:w2:d1:2026-07-16:o1:r1';

    const result = await dispatch('my_workout_today', {}, {
      user: { id: 17, role: 'client', email: 'client@example.com' },
    });

    expect(WorkoutPlan.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 17, status: 'active' },
      order: [['createdAt', 'DESC']],
    }));
    expect(result).toEqual({
      userId: 17,
      hasActivePlan: true,
      planId: 'plan-1',
      currentWeek: 2,
      currentDay: 1,
      sessionLabel: 'Day 1',
      exerciseCount: 1,
      firstExerciseName: 'Goblet Squat',
      todayAssignment: {
        assignmentId: assignmentKey,
        assignmentKey,
        assignmentType: 'homework',
        status: 'planned',
        sessionType: 'solo',
        isLoggable: true,
        isBillable: false,
        shouldDeductSession: false,
        title: 'Day 1',
        weekNumber: 2,
        dayNumber: 1,
        exerciseCount: 1,
        firstExerciseName: 'Goblet Squat',
        exercisePreview: [{
          exerciseName: 'Goblet Squat',
          sets: 3,
          reps: '10',
        }],
        ctaLabel: 'Log Assignment',
      },
      homeworkSummary: {
        assignmentType: 'homework',
        todayStatus: 'planned',
        todayIsCompleted: false,
        todayIsLoggable: true,
        todayShouldDeductSession: false,
        todayWeekNumber: 2,
        todayDayNumber: 1,
        todayExerciseCount: 1,
        todayFirstExerciseName: 'Goblet Squat',
        recentCompletedCount: 0,
        lastCompletedAt: null,
        recentCompletions: [],
        accountabilityStatus: {
          key: 'due_today',
          label: 'Due today',
          priority: 'log_prompt',
          coachDirective: 'Encourage the client to log the assigned homework; do not mark it complete.',
        },
      },
      trainingPlanCatalog: {
        defaultHorizonKey: 'six_month',
        primaryPlanId: 'plan-1',
        primaryHorizonKey: 'six_month',
        primaryHorizonLabel: '6 Month',
        filledHorizonKeys: ['six_month'],
        slotCount: 7,
        slots: expect.arrayContaining([
          expect.objectContaining({
            horizonKey: 'six_month',
            label: '6 Month',
            planId: 'plan-1',
            status: 'active',
            isFilled: true,
            isPrimary: true,
            hasPdf: false,
          }),
        ]),
      },
    });
    expect(result).not.toHaveProperty('planTitle');
    expect(JSON.stringify(result)).not.toContain('client@example.com');
    expect(JSON.stringify(result)).not.toContain('Private plan title');
  });

  it('summarizes workout and measurement progress for the authenticated client', async () => {
    const { dispatch, WorkoutSession, BodyMeasurement } = await loadDispatcher();

    const result = await dispatch('my_progress', { days: 30 }, {
      user: { id: 17, role: 'client' },
    });

    expect(WorkoutSession.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 17, status: 'completed' }),
      attributes: ['id', 'duration', 'totalSets', 'totalReps', 'totalWeight', 'completedAt', 'date'],
    }));
    expect(BodyMeasurement.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 17 },
      order: [['measurementDate', 'DESC']],
    }));
    expect(result).toEqual({
      userId: 17,
      days: 30,
      workoutCount: 2,
      totalSets: 20,
      totalReps: 200,
      totalVolume: 8600,
      totalMinutes: 75,
      latestMeasurementDate: '2026-05-20',
      latestWeight: 185.5,
      latestBodyFat: 14.2,
      latestWaist: 32.5,
    });
  });

  it('summarizes XP, streaks, and badges without profile PII', async () => {
    const { dispatch, Gamification, UserAchievement } = await loadDispatcher();
    const ctx = { user: { id: 17, role: 'client', firstName: 'Private' } };

    const xp = await dispatch('my_xp', {}, ctx);
    const streaks = await dispatch('my_streaks_badges', { limit: 5 }, ctx);

    expect(Gamification.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 17 },
    }));
    expect(UserAchievement.count).toHaveBeenCalledWith({ where: { userId: 17, isCompleted: true } });
    // "New" has been defined wrong twice, each time producing a plausible wrong NUMBER rather
    // than an error: `isNew` (not a column — always 0), then `notificationSent: false` (a real
    // column that NOTHING ever sets to true — always all-completed). It is now a recency window
    // over `earnedAt`, the only signal the data actually carries. See achievementRecency.mjs.
    const newCountCall = UserAchievement.count.mock.calls
      .map(([args]) => args)
      .find((args) => args?.where?.earnedAt);
    expect(newCountCall).toBeDefined();
    expect(newCountCall.where).toMatchObject({ userId: 17, isCompleted: true });
    expect(UserAchievement.count).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ notificationSent: false }) }),
    );
    expect(xp).toEqual({
      userId: 17,
      level: 7,
      experience: 400,
      totalXP: 3400,
      currentTier: 'silver',
      nextTierProgress: 62.5,
      totalWorkouts: 22,
    });
    expect(streaks).toEqual({
      userId: 17,
      streakCount: 9,
      longestStreak: 14,
      streakFreezes: 1,
      earnedBadgeCount: 2,
      completedAchievementCount: 5,
      newAchievementCount: 1,
    });
    expect(JSON.stringify({ xp, streaks })).not.toContain('Private');
  });

  it('tracks own pain and summarizes exercise safety without echoing private notes', async () => {
    const { dispatch, ClientPainEntry } = await loadDispatcher();
    const ctx = { user: { id: 17, role: 'client', email: 'client@example.com' } };

    const tracked = await dispatch('track_my_pain', {
      bodyPart: 'lower back',
      painLevel: 7,
      notes: 'Private pain wording',
    }, ctx);
    const avoid = await dispatch('exercises_to_avoid', { limit: 4 }, ctx);

    expect(ClientPainEntry.create).toHaveBeenCalledWith({
      userId: 17,
      createdById: 17,
      bodyRegion: 'lower back',
      painLevel: 7,
      description: 'Private pain wording',
      isActive: true,
    });
    expect(ClientPainEntry.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 17, isActive: true },
      attributes: ['id', 'bodyRegion', 'painLevel', 'createdAt'],
      limit: 4,
    }));
    expect(tracked).toEqual({
      entryId: 19,
      userId: 17,
      bodyRegion: 'lower back',
      painLevel: 7,
      isActive: true,
    });
    expect(avoid).toEqual({
      userId: 17,
      activePainCount: 2,
      highestPainLevel: 8,
      primaryRegion: 'lower_back',
      avoidHighImpact: true,
      movementPattern: 'core_spine',
    });
    expect(JSON.stringify({ tracked, avoid })).not.toContain('Private pain wording');
    expect(JSON.stringify({ tracked, avoid })).not.toContain('client@example.com');
  });

  it('logs own nutrition through the authenticated client without echoing meal text', async () => {
    const { dispatch, createMacroEntries } = await loadDispatcher();
    const ctx = { user: { id: 17, role: 'client', email: 'client@example.com' } };

    const result = await dispatch('log_my_nutrition', {
      date: '2026-05-31',
      meals: [{
        description: 'eggs and toast',
        mealType: 'breakfast',
        calories: 450,
        protein: 28,
      }],
    }, ctx);

    expect(createMacroEntries).toHaveBeenCalledWith([
      {
        description: 'eggs and toast',
        mealType: 'breakfast',
        calories: 450,
        protein: 28,
      },
    ], {
      clientId: 17,
      date: '2026-05-31',
    });
    expect(result).toEqual({
      userId: 17,
      mealsLogged: 1,
      date: '2026-05-31',
      totalCalories: 450,
      totalProtein: 28,
      totalCarbs: 32,
      totalFat: 18,
    });
    expect(JSON.stringify(result)).not.toContain('eggs and toast');
    expect(JSON.stringify(result)).not.toContain('client@example.com');
  });

  it('uses the studio display timezone for omitted client nutrition write dates', async () => {
    process.env.SWAN_DISPLAY_TZ = 'America/Los_Angeles';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));

    const { dispatch, createMacroEntries } = await loadDispatcher();
    const meals = [{
      description: 'evening protein shake',
      mealType: 'snack',
      calories: 220,
    }];

    await dispatch('log_my_nutrition', { meals }, {
      user: { id: 17, role: 'client', email: 'client@example.com' },
    });

    expect(createMacroEntries).toHaveBeenCalledWith(meals, {
      clientId: 17,
      date: '2026-06-21',
    });
  });

  it('summarizes available session slots without booking or leaking profile PII', async () => {
    const { dispatch, availabilityService } = await loadDispatcher();
    const ctx = { user: { id: 17, role: 'client', email: 'client@example.com' } };

    const result = await dispatch('schedule_my_session', {
      trainerId: 7,
      date: '2026-06-02',
      duration: 45,
    }, ctx);

    expect(availabilityService.getAvailableSlots).toHaveBeenCalledTimes(1);
    const [trainerId, date, duration] = availabilityService.getAvailableSlots.mock.calls[0];
    expect(trainerId).toBe(7);
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(2);
    expect(duration).toBe(45);
    expect(result).toEqual({
      userId: 17,
      trainerId: 7,
      date: '2026-06-02',
      durationMinutes: 45,
      availableSlotCount: 2,
      firstSlotStartUtc: '2026-06-02T16:00:00.000Z',
      lastSlotEndUtc: '2026-06-02T17:45:00.000Z',
    });
    expect(JSON.stringify(result)).not.toContain('client@example.com');
  });

  it('records plan adjustment requests as unresolved trainer-visible client notes without echoing reason', async () => {
    const { dispatch, ClientTrainerAssignment, ClientNote } = await loadDispatcher();
    const ctx = { user: { id: 17, role: 'client', email: 'client@example.com' } };

    const result = await dispatch('request_plan_adjustment', {
      reason: 'My right knee hurts when I squat.',
    }, ctx);

    expect(ClientTrainerAssignment.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { clientId: 17, status: 'active' },
      order: [['updatedAt', 'DESC']],
    }));
    expect(ClientNote.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 17,
      trainerId: 70,
      noteType: 'concern',
      severity: 'medium',
      visibility: 'trainer_only',
      isResolved: false,
      tagsJson: expect.arrayContaining(['client_request', 'plan_adjustment_request', 'swan_coach']),
    }));
    expect(ClientNote.create.mock.calls[0][0].content).toContain('My right knee hurts when I squat.');
    expect(result).toEqual({
      requestId: 330,
      userId: 17,
      trainerId: 70,
      routedToTrainer: true,
      status: 'open',
      queue: 'client_notes',
    });
    expect(JSON.stringify(result)).not.toContain('knee');
    expect(JSON.stringify(result)).not.toContain('client@example.com');
  });
});

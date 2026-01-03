import { WorkoutSession, WorkoutExercise, Set, User, sequelize } from '../models/index.mjs';

const workoutSessionController = {
  /**
   * @description Create a new workout session with exercises and sets.
   * @route POST /api/workout-sessions
   * @access Private (Admin/Trainer)
   */
  async createWorkoutSession(req, res) {
    const {
      userId,
      sessionDate,
      duration,
      intensity,
      status,
      exercises,
      trainerNotes,
    } = req.body;

    if (!userId || !sessionDate || !exercises || exercises.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const transaction = await sequelize.transaction();

    try {
      const workoutSession = await WorkoutSession.create({
        userId,
        sessionDate,
        duration,
        intensity,
        status,
        notes: trainerNotes,
        recordedBy: req.user.id, // Assuming user is attached to request by auth middleware
      }, { transaction });

      for (const exerciseData of exercises) {
        const workoutExercise = await WorkoutExercise.create({
          workoutSessionId: workoutSession.id,
          exerciseId: exerciseData.exerciseId,
          orderInWorkout: exerciseData.orderInWorkout,
          notes: exerciseData.notes,
        }, { transaction });

        if (exerciseData.sets && exerciseData.sets.length > 0) {
          const setsToCreate = exerciseData.sets.map(set => ({
            ...set,
            workoutExerciseId: workoutExercise.id,
          }));
          await Set.bulkCreate(setsToCreate, { transaction });
        }
      }

      // Placeholder for triggering analytics recalculation
      // await AnalyticsService.recalculateForUser(userId);

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Workout session created successfully.',
        data: { workoutSessionId: workoutSession.id },
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error creating workout session:', error);
      res.status(500).json({ success: false, message: 'Server error while creating workout session.' });
    }
  },

  /**
   * @description Get workout history for a specific client.
   * @route GET /api/workout-sessions/:userId
   * @access Private (Admin/Trainer)
   */
  async getWorkoutHistory(req, res) {
    const { userId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    try {
      const { count, rows } = await WorkoutSession.findAndCountAll({
        where: { userId },
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [['sessionDate', 'DESC']],
        include: [
          {
            model: WorkoutExercise,
            as: 'exercises',
            include: [
              {
                model: Set,
                as: 'sets'
              }
            ]
          }
        ]
      });

      res.status(200).json({
        success: true,
        data: {
          workouts: rows,
          total: count,
          hasMore: (parseInt(offset, 10) + rows.length) < count,
        },
      });
    } catch (error) {
      console.error('Error fetching workout history:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching workout history.' });
    }
  },
};

export default workoutSessionController;
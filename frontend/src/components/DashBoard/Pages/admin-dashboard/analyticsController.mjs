import { WorkoutSession, WorkoutExercise, Set, sequelize } from '../models/index.cjs';
import { Op } from 'sequelize';

const analyticsController = {
  /**
   * @description Get a client's strength profile for the radar chart.
   * @route GET /api/analytics/:userId/strength-profile
   * @access Private
   */
  async getStrengthProfile(req, res) {
    const { userId } = req.params;

    try {
      const sets = await Set.findAll({
        include: [{
          model: WorkoutExercise,
          required: true,
          include: [{
            model: WorkoutSession,
            required: true,
            where: { userId }
          }]
        }]
      });

      let strengthVolume = 0;
      let hypertrophyVolume = 0;
      let enduranceVolume = 0;

      sets.forEach(set => {
        const volume = set.weight * set.reps;
        if (set.reps <= 5) {
          strengthVolume += volume;
        } else if (set.reps <= 12) {
          hypertrophyVolume += volume;
        } else {
          enduranceVolume += volume;
        }
      });

      const totalVolume = strengthVolume + hypertrophyVolume + enduranceVolume;
      
      // Normalize to a 0-100 scale. If totalVolume is 0, all are 0.
      const profile = [
        { subject: 'Max Strength (1-5 reps)', value: totalVolume > 0 ? Math.round((strengthVolume / totalVolume) * 100) : 0, fullMark: 100 },
        { subject: 'Hypertrophy (6-12 reps)', value: totalVolume > 0 ? Math.round((hypertrophyVolume / totalVolume) * 100) : 0, fullMark: 100 },
        { subject: 'Endurance (15+ reps)', value: totalVolume > 0 ? Math.round((enduranceVolume / totalVolume) * 100) : 0, fullMark: 100 },
        // Placeholder for Power. This would require more complex logic, like exercise tagging.
        { subject: 'Power (Explosive)', value: 40, fullMark: 100 },
      ];

      res.status(200).json(profile);

    } catch (error) {
      console.error('Error fetching strength profile:', error);
      res.status(500).json({ message: 'Server error while fetching strength profile.' });
    }
  }
};

export default analyticsController;
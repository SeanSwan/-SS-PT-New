import { User, WorkoutSession, MeasurementMilestone, DailyCheckIn, sequelize } from '../models/index.cjs';
import { Op } from 'sequelize';
import moment from 'moment';

/**
 * =============================================================================
 * 🎯 Admin Reports Controller
 * =============================================================================
 *
 * Purpose:
 * Handles generating data for the admin dashboard widgets.
 *
 * =============================================================================
 */

const adminReportsController = {
  /**
   * @description Get a live feed of recent client activities.
   * @route GET /api/admin/activity-feed
   * @access Private (Admin only)
   */
  async getActivityFeed(req, res) {
    try {
      const limit = 5;

      const milestones = await MeasurementMilestone.findAll({
        limit,
        order: [['createdAt', 'DESC']],
        include: { model: User, attributes: ['firstName', 'lastName'] }
      });

      const workouts = await WorkoutSession.findAll({
        where: { status: 'completed' },
        limit,
        order: [['completedAt', 'DESC']],
        include: { model: User, attributes: ['firstName', 'lastName'] }
      });

      const signups = await User.findAll({
        where: { role: 'client' },
        limit,
        order: [['createdAt', 'DESC']]
      });

      const checkins = await DailyCheckIn.findAll({
        limit,
        order: [['createdAt', 'DESC']],
        include: { model: User, attributes: ['firstName', 'lastName'] }
      });

      const feed = [
        ...milestones.map(m => ({ type: 'milestone', user: m.User, title: m.title, timestamp: m.createdAt })),
        ...workouts.map(w => ({ type: 'workout', user: w.User, title: `completed "${w.notes || 'a workout'}"`, timestamp: w.completedAt })),
        ...signups.map(u => ({ type: 'signup', user: u, title: 'just signed up!', timestamp: u.createdAt })),
        ...checkins.map(c => ({ type: 'sms', user: c.User, title: 'sent a new SMS check-in', timestamp: c.createdAt }))
      ]
      .sort((a, b) => moment(b.timestamp).diff(moment(a.timestamp)))
      .slice(0, 10); // Take top 10 from combined list

      // Add a fallback for empty feed to avoid breaking the UI
      if (feed.length === 0) {
        feed.push({ type: 'info', user: { firstName: 'System', lastName: '' }, title: 'No recent activity to display.', timestamp: new Date() });
      }

      res.status(200).json(feed);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      res.status(500).json({ message: 'Server error while fetching activity feed.' });
    }
  },

  /**
   * @description Get a report of clients with low compliance.
   * @route GET /api/admin/reports/compliance
   * @access Private (Admin only)
   */
  async getComplianceReport(req, res) {
    try {
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

      const clients = await User.findAll({
        where: { role: 'client' },
        include: [{
          model: WorkoutSession,
          as: 'sessions', // Assuming an association is defined in your models
          where: {
            sessionDate: { [Op.gte]: thirtyDaysAgo },
            status: { [Op.in]: ['scheduled', 'confirmed', 'completed', 'cancelled'] }
          },
          required: false // Use LEFT JOIN to include clients with no sessions
        }]
      });

      const complianceData = clients.map(client => {
        const sessions = client.sessions || [];
        const totalScheduled = sessions.filter(s => ['scheduled', 'confirmed', 'completed'].includes(s.status)).length;
        const completed = sessions.filter(s => s.status === 'completed').length;
        const compliance = totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 100;

        return {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          compliance,
          details: `${totalScheduled - completed} missed, ${completed} completed in last 30d.`,
        };
      });

      const highRiskClients = complianceData
        .filter(c => c.compliance < 70)
        .sort((a, b) => a.compliance - b.compliance)
        .slice(0, 5); // Limit to top 5 high-risk clients

      res.status(200).json(highRiskClients);
    } catch (error) {
      console.error('Error fetching compliance report:', error);
      res.status(500).json({ message: 'Server error while fetching compliance report.' });
    }
  },

  /**
   * @description Get a report of top performing trainers.
   * @route GET /api/admin/reports/trainer-performance
   * @access Private (Admin only)
   */
  async getTrainerPerformance(req, res) {
    try {
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

      const trainers = await User.findAll({
        where: { role: 'trainer' },
        attributes: ['id', 'firstName', 'lastName']
      });

      const performanceData = await Promise.all(trainers.map(async (trainer) => {
        const sessions = await WorkoutSession.findAll({
          where: {
            trainerId: trainer.id,
            sessionDate: { [Op.gte]: thirtyDaysAgo },
            status: { [Op.in]: ['scheduled', 'confirmed', 'completed'] }
          },
          attributes: ['userId', 'status']
        });

        const clientsOfTrainer = [...new Set(sessions.map(s => s.userId).filter(Boolean))];
        let totalCompliance = 0;
        let clientsWithScheduledSessions = 0;

        clientsOfTrainer.forEach(clientId => {
          const clientSessions = sessions.filter(s => s.userId === clientId);
          const totalScheduled = clientSessions.length;
          if (totalScheduled > 0) {
            const completed = clientSessions.filter(s => s.status === 'completed').length;
            totalCompliance += (completed / totalScheduled) * 100;
            clientsWithScheduledSessions++;
          }
        });

        const avgCompliance = clientsWithScheduledSessions > 0 ? Math.round(totalCompliance / clientsWithScheduledSessions) : 100;

        return { name: `${trainer.firstName} ${trainer.lastName}`, compliance: avgCompliance, clientCount: clientsOfTrainer.length };
      }));

      const sortedPerformance = performanceData
        .sort((a, b) => b.compliance - a.compliance)
        .map((trainer, index) => ({ ...trainer, rank: index + 1, icon: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '' }));

      res.status(200).json(sortedPerformance);
    } catch (error) {
      console.error('Error fetching trainer performance:', error);
      res.status(500).json({ message: 'Server error while fetching trainer performance.' });
    }
  },
};

export default adminReportsController;
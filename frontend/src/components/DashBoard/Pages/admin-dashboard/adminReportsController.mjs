import { User, sequelize } from '../models/index.cjs';
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
      // This is a mock implementation. A real implementation would use an event stream.
      const mockFeed = [
        { type: 'milestone', user: { firstName: 'Sarah', lastName: 'J.' }, title: '"Lost 10 Pounds!"', timestamp: moment().subtract(5, 'minutes') },
        { type: 'workout', user: { firstName: 'Mike', lastName: 'D.' }, title: '"Upper Body Day"', timestamp: moment().subtract(30, 'minutes') },
        { type: 'missed_workout', user: { firstName: 'Emma', lastName: 'W.' }, title: 'missed her workout yesterday', timestamp: moment().subtract(1, 'day') },
        { type: 'sms', user: { firstName: 'Lisa', lastName: 'M.' }, title: 'sent a new SMS check-in', timestamp: moment().subtract(2, 'days') },
        { type: 'signup', user: { firstName: 'Chris', lastName: 'P.' }, title: 'just signed up!', timestamp: moment().subtract(3, 'days') },
      ].sort((a, b) => moment(b.timestamp).diff(moment(a.timestamp)));

      res.status(200).json(mockFeed);
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
        // Mock data as per the blueprint
        const highRiskClients = [
            {
                id: 'user1',
                name: 'James Brown',
                compliance: 45,
                details: 'Missed 5 workouts, 12 check-ins.',
                trainer: { name: 'Jessica P.' }
            },
            {
                id: 'user2',
                name: 'Patricia L.',
                compliance: 52,
                details: 'Low energy reported for 5 days.',
                trainer: { name: 'David R.' }
            },
            {
                id: 'user3',
                name: 'Robert J.',
                compliance: 61,
                details: 'Missed 2 workouts this week.',
                trainer: { name: 'Jessica P.' }
            }
        ];

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
        // Mock data as per the blueprint
        const trainerPerformance = [
            { rank: 1, name: 'Jessica P.', compliance: 98, clientCount: 25, icon: '🥇' },
            { rank: 2, name: 'David R.', compliance: 95, clientCount: 22, icon: '🥈' },
            { rank: 3, name: 'Emily S.', compliance: 92, clientCount: 28, icon: '🥉' },
            { rank: 4, name: 'Michael B.', compliance: 89, clientCount: 20, icon: '' },
        ];
      res.status(200).json(trainerPerformance);
    } catch (error) {
      console.error('Error fetching trainer performance:', error);
      res.status(500).json({ message: 'Server error while fetching trainer performance.' });
    }
  },
};

export default adminReportsController;
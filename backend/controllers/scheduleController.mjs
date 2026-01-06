/**
 * Schedule Controller
 * ===================
 *
 * Business logic for fetching and managing schedule events.
 * This controller is role-aware and provides events tailored to
 * clients, trainers, and admins.
 */

import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';

/**
 * Get schedule events for a given date range and user.
 * GET /api/schedule
 *
 * Query Params:
 * - start: ISO 8601 string for the start of the date range
 * - end: ISO 8601 string for the end of the date range
 */
export const getScheduleEvents = async (req, res) => {
  const { start, end } = req.query;
  const { id: userId, role } = req.user;

  const startDate = start ? new Date(start) : new Date();
  const endDate = end
    ? new Date(end)
    : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return res.status(400).json({ error: 'Invalid start or end date format.' });
  }

  try {
    let whereClause = 's."sessionDate" BETWEEN :start AND :end AND s.status IN (:statuses)';
    const replacements = {
      start: startDate,
      end: endDate,
      statuses: ['scheduled', 'confirmed', 'completed'],
    };

    // Role-based filtering
    if (role === 'client') {
      whereClause += ' AND s."userId" = :userId';
      replacements.userId = userId;
    } else if (role === 'trainer') {
      whereClause += ' AND s."trainerId" = :userId';
      replacements.userId = userId;
    }
    // Admins see all sessions

    const query = `
      SELECT
        s.id,
        s."sessionDate" as start,
        s."sessionDate" + (s.duration || ' minutes')::interval as "end",
        s.status,
        CASE
          WHEN s."userId" = :requestingUserId THEN 'Session with ' || t."firstName" || ' ' || t."lastName"
          WHEN s."trainerId" = :requestingUserId THEN 'Session with ' || c."firstName" || ' ' || c."lastName"
          ELSE 'Session: ' || c."firstName" || ' & ' || t."firstName"
        END as title,
        json_build_object(
          'clientId', c.id,
          'clientName', c."firstName" || ' ' || c."lastName",
          'trainerId', t.id,
          'trainerName', t."firstName" || ' ' || t."lastName"
        ) as resource
      FROM sessions s
      LEFT JOIN users c ON s."userId" = c.id
      LEFT JOIN users t ON s."trainerId" = t.id
      WHERE ${whereClause}
    `;

    replacements.requestingUserId = userId;

    const events = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    // Map status to event type for coloring
    const formattedEvents = events.map(event => ({
      ...event,
      type: event.status === 'completed' ? 'block' : 'session',
    }));

    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching schedule events:', error);
    res.status(500).json({ error: 'Failed to fetch schedule events.' });
  }
};

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
 * - adminScope: 'my' or 'global' (admin only) - MindBody parity toggle
 * - trainerId: Filter by specific trainer (admin only)
 */
export const getScheduleEvents = async (req, res) => {
  try {
    const { start, end, adminScope = 'global', trainerId } = req.query;

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    const { id: userId, role } = req.user;

    const startDate = start ? new Date(start) : new Date();
    const endDate = end
      ? new Date(end)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date format.' });
    }
    let whereClause = 's."sessionDate" BETWEEN :start AND :end AND s.status IN (:statuses)';
    const replacements = {
      start: startDate,
      end: endDate,
      statuses: ['scheduled', 'confirmed', 'completed'],
    };

    // Role-based filtering (RBAC - MindBody Parity)
    if (role === 'client') {
      // SECURITY: Clients can ONLY see their own sessions
      whereClause += ' AND s."userId" = :userId';
      replacements.userId = userId;
    } else if (role === 'trainer') {
      // SECURITY: Trainers see only sessions assigned to them
      whereClause += ' AND s."trainerId" = :userId';
      replacements.userId = userId;
    } else if (role === 'admin') {
      // Admin scope toggle (MindBody parity)
      if (adminScope === 'my') {
        // "My Schedule" mode - admin sees only sessions where they are the trainer
        whereClause += ' AND s."trainerId" = :adminUserId';
        replacements.adminUserId = userId;
      } else if (trainerId) {
        // Filter by specific trainer
        whereClause += ' AND s."trainerId" = :filterTrainerId';
        replacements.filterTrainerId = parseInt(trainerId, 10);
      }
      // Global mode with no trainerId filter shows all sessions
    }

    // Role-based SELECT fields for PII protection
    // Clients only see their trainer's name, not other client info
    // Trainers see their clients' names
    // Admins see all
    const selectFields = role === 'client'
      ? `
        s.id,
        s."sessionDate" as start,
        s."sessionDate" + (s.duration || ' minutes')::interval as "end",
        s.status,
        'Session with ' || t."firstName" || ' ' || t."lastName" as title,
        json_build_object(
          'trainerId', t.id,
          'trainerName', t."firstName" || ' ' || t."lastName"
        ) as resource
      `
      : role === 'trainer'
      ? `
        s.id,
        s."sessionDate" as start,
        s."sessionDate" + (s.duration || ' minutes')::interval as "end",
        s.status,
        'Session with ' || c."firstName" || ' ' || c."lastName" as title,
        json_build_object(
          'clientId', c.id,
          'clientName', c."firstName" || ' ' || c."lastName",
          'clientEmail', c.email,
          'clientPhone', c.phone
        ) as resource
      `
      : `
        s.id,
        s."sessionDate" as start,
        s."sessionDate" + (s.duration || ' minutes')::interval as "end",
        s.status,
        s."trainerId",
        s."userId",
        CASE
          WHEN s."userId" = :requestingUserId THEN 'Session with ' || t."firstName" || ' ' || t."lastName"
          WHEN s."trainerId" = :requestingUserId THEN 'Session with ' || c."firstName" || ' ' || c."lastName"
          ELSE c."firstName" || ' ' || c."lastName" || ' / ' || t."firstName" || ' ' || t."lastName"
        END as title,
        json_build_object(
          'clientId', c.id,
          'clientName', c."firstName" || ' ' || c."lastName",
          'clientEmail', c.email,
          'clientPhone', c.phone,
          'trainerId', t.id,
          'trainerName', t."firstName" || ' ' || t."lastName"
        ) as resource
      `;

    const query = `
      SELECT ${selectFields}
      FROM sessions s
      LEFT JOIN users c ON s."userId" = c.id
      LEFT JOIN users t ON s."trainerId" = t.id
      WHERE ${whereClause}
      ORDER BY s."sessionDate" ASC
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
    console.error('Error fetching schedule events:', error.message, error.stack);
    res.status(500).json({
      error: 'Failed to fetch schedule events.',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

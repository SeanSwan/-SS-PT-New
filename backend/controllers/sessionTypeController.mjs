/**
 * Session Type Controller - Universal Master Schedule (Phase 5)
 * ============================================================
 *
 * Purpose:
 * Manage session type definitions used for buffer-aware scheduling.
 * Provides CRUD operations and sort reordering for admin configuration.
 *
 * Blueprint Reference:
 * docs/ai-workflow/blueprints/UNIVERSAL-SCHEDULE-PHASE-5-BUFFER-TIMES.md
 *
 * Architecture Overview:
 * Admin UI -> sessionTypeRoutes -> sessionTypeController -> SessionType Model
 *
 * API Endpoints:
 * - GET    /api/session-types
 * - GET    /api/session-types/:id
 * - POST   /api/session-types
 * - PUT    /api/session-types/:id
 * - DELETE /api/session-types/:id
 * - POST   /api/session-types/reorder
 *
 * WHY sortOrder?
 * - Keeps admin-defined ordering consistent in dropdowns and tables.
 * - Avoids client-side sorting that drifts across users.
 */

import logger from '../utils/logger.mjs';
import { getModel } from '../models/index.mjs';

const getSessionTypeModel = () => getModel('SessionType');

export const listSessionTypes = async (req, res) => {
  try {
    const SessionType = getSessionTypeModel();

    const sessionTypes = await SessionType.findAll({
      where: { isActive: true },
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC']
      ]
    });

    return res.status(200).json({
      success: true,
      data: sessionTypes
    });
  } catch (error) {
    logger.error('[SessionTypeController] Failed to list session types:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch session types'
    });
  }
};

export const getSessionTypeById = async (req, res) => {
  try {
    const SessionType = getSessionTypeModel();
    const sessionType = await SessionType.findByPk(req.params.id);

    if (!sessionType) {
      return res.status(404).json({
        success: false,
        message: 'Session type not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: sessionType
    });
  } catch (error) {
    logger.error('[SessionTypeController] Failed to fetch session type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch session type'
    });
  }
};

export const createSessionType = async (req, res) => {
  try {
    const SessionType = getSessionTypeModel();
    const {
      name,
      description,
      duration,
      bufferBefore,
      bufferAfter,
      color,
      price,
      isActive,
      sortOrder
    } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const maxSortOrder = await SessionType.max('sortOrder');
    const nextSortOrder = Number.isFinite(maxSortOrder) ? maxSortOrder + 1 : 1;

    const sessionType = await SessionType.create({
      name,
      description: description ?? null,
      duration: duration ?? 60,
      bufferBefore: bufferBefore ?? 0,
      bufferAfter: bufferAfter ?? 0,
      color: color ?? '#00FFFF',
      price: price ?? null,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? nextSortOrder
    });

    return res.status(201).json({
      success: true,
      data: sessionType
    });
  } catch (error) {
    logger.error('[SessionTypeController] Failed to create session type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create session type'
    });
  }
};

export const updateSessionType = async (req, res) => {
  try {
    const SessionType = getSessionTypeModel();
    const sessionType = await SessionType.findByPk(req.params.id);

    if (!sessionType) {
      return res.status(404).json({
        success: false,
        message: 'Session type not found'
      });
    }

    const {
      name,
      description,
      duration,
      bufferBefore,
      bufferAfter,
      color,
      price,
      isActive,
      sortOrder
    } = req.body;

    await sessionType.update({
      name: name ?? sessionType.name,
      description: description ?? sessionType.description,
      duration: duration ?? sessionType.duration,
      bufferBefore: bufferBefore ?? sessionType.bufferBefore,
      bufferAfter: bufferAfter ?? sessionType.bufferAfter,
      color: color ?? sessionType.color,
      price: price ?? sessionType.price,
      isActive: isActive ?? sessionType.isActive,
      sortOrder: sortOrder ?? sessionType.sortOrder
    });

    return res.status(200).json({
      success: true,
      data: sessionType
    });
  } catch (error) {
    logger.error('[SessionTypeController] Failed to update session type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update session type'
    });
  }
};

export const deleteSessionType = async (req, res) => {
  try {
    const SessionType = getSessionTypeModel();
    const sessionType = await SessionType.findByPk(req.params.id);

    if (!sessionType) {
      return res.status(404).json({
        success: false,
        message: 'Session type not found'
      });
    }

    await sessionType.destroy();

    return res.status(200).json({
      success: true,
      message: 'Session type deleted'
    });
  } catch (error) {
    logger.error('[SessionTypeController] Failed to delete session type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete session type'
    });
  }
};

export const reorderSessionTypes = async (req, res) => {
  try {
    const SessionType = getSessionTypeModel();
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids array is required'
      });
    }

    const transaction = await SessionType.sequelize.transaction();

    try {
      await Promise.all(
        ids.map((id, index) =>
          SessionType.update(
            { sortOrder: index + 1 },
            { where: { id }, transaction }
          )
        )
      );

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Session types reordered'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('[SessionTypeController] Failed to reorder session types:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder session types'
    });
  }
};

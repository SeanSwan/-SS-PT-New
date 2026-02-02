/**
 * Admin Specials Controller - Phase 6
 * ==================================
 * Manages bonus-session promotions for storefront packages.
 *
 * Blueprint: docs/ai-workflow/blueprints/STORE-PACKAGE-PHASE-6-REDESIGN.md
 *
 * Endpoints:
 * - GET    /api/admin/specials              (admin)
 * - GET    /api/admin/specials/active       (public)
 * - GET    /api/admin/specials/:id          (admin)
 * - POST   /api/admin/specials              (admin)
 * - PUT    /api/admin/specials/:id          (admin)
 * - DELETE /api/admin/specials/:id          (admin, soft delete)
 * - PATCH  /api/admin/specials/:id/toggle   (admin)
 */

import logger from '../utils/logger.mjs';
import { getModel } from '../models/index.mjs';

const getAdminSpecialModel = () => getModel('AdminSpecial');

// List all specials (admin view)
export const listSpecials = async (req, res) => {
  try {
    const AdminSpecial = getAdminSpecialModel();
    const specials = await AdminSpecial.findAll({
      order: [['startDate', 'DESC']],
      include: [{ association: 'creator', attributes: ['id', 'firstName', 'lastName'] }]
    });
    return res.json({ success: true, data: specials });
  } catch (error) {
    logger.error('[AdminSpecialController] Error listing specials:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch specials' });
  }
};

// List active specials (public)
export const listActiveSpecials = async (req, res) => {
  try {
    const AdminSpecial = getAdminSpecialModel();
    const specials = await AdminSpecial.getActiveSpecials();
    return res.json({ success: true, data: specials });
  } catch (error) {
    logger.error('[AdminSpecialController] Error listing active specials:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch active specials' });
  }
};

// Get single special
export const getSpecialById = async (req, res) => {
  try {
    const AdminSpecial = getAdminSpecialModel();
    const { id } = req.params;
    const special = await AdminSpecial.findByPk(id, {
      include: [{ association: 'creator', attributes: ['id', 'firstName', 'lastName'] }]
    });

    if (!special) {
      return res.status(404).json({ success: false, error: 'Special not found' });
    }

    return res.json({ success: true, data: special });
  } catch (error) {
    logger.error('[AdminSpecialController] Error fetching special:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch special' });
  }
};

// Create special (admin only)
export const createSpecial = async (req, res) => {
  try {
    const AdminSpecial = getAdminSpecialModel();
    const {
      name,
      description,
      bonusSessions,
      bonusDuration,
      applicablePackageIds,
      startDate,
      endDate
    } = req.body;

    if (!name || !startDate || !endDate) {
      return res
        .status(400)
        .json({ success: false, error: 'Name, startDate, and endDate are required' });
    }

    const special = await AdminSpecial.create({
      name,
      description,
      bonusSessions: bonusSessions || 0,
      bonusDuration: bonusDuration || 60,
      applicablePackageIds: applicablePackageIds || [],
      startDate,
      endDate,
      isActive: true,
      createdBy: req.user?.id
    });

    return res.status(201).json({ success: true, data: special });
  } catch (error) {
    logger.error('[AdminSpecialController] Error creating special:', error);
    return res
      .status(500)
      .json({ success: false, error: error.message || 'Failed to create special' });
  }
};

// Update special (admin only)
export const updateSpecial = async (req, res) => {
  try {
    const AdminSpecial = getAdminSpecialModel();
    const { id } = req.params;
    const updates = req.body;

    const special = await AdminSpecial.findByPk(id);
    if (!special) {
      return res.status(404).json({ success: false, error: 'Special not found' });
    }

    await special.update(updates);
    return res.json({ success: true, data: special });
  } catch (error) {
    logger.error('[AdminSpecialController] Error updating special:', error);
    return res
      .status(500)
      .json({ success: false, error: error.message || 'Failed to update special' });
  }
};

// Delete special (soft delete, admin only)
export const deleteSpecial = async (req, res) => {
  try {
    const AdminSpecial = getAdminSpecialModel();
    const { id } = req.params;

    const special = await AdminSpecial.findByPk(id);
    if (!special) {
      return res.status(404).json({ success: false, error: 'Special not found' });
    }

    await special.destroy(); // Soft delete due to paranoid: true
    return res.json({ success: true, message: 'Special deleted successfully' });
  } catch (error) {
    logger.error('[AdminSpecialController] Error deleting special:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete special' });
  }
};

// Toggle special active status
export const toggleSpecialStatus = async (req, res) => {
  try {
    const AdminSpecial = getAdminSpecialModel();
    const { id } = req.params;

    const special = await AdminSpecial.findByPk(id);
    if (!special) {
      return res.status(404).json({ success: false, error: 'Special not found' });
    }

    await special.update({ isActive: !special.isActive });
    return res.json({ success: true, data: special });
  } catch (error) {
    logger.error('[AdminSpecialController] Error toggling special status:', error);
    return res.status(500).json({ success: false, error: 'Failed to toggle special status' });
  }
};

// backend/controllers/notificationSettingsController.mjs
import logger from '../utils/logger.mjs';
import NotificationSettings from '../models/NotificationSettings.mjs';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';

/**
 * Get all notification settings
 */
export const getAllSettings = async (req, res) => {
  try {
    const settings = await NotificationSettings.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    return successResponse(res, settings, 'Notification settings retrieved successfully');
  } catch (error) {
    logger.error('Error in getAllSettings:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving notification settings', 500);
  }
};

/**
 * Get a single notification setting by ID
 */
export const getSettingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const setting = await NotificationSettings.findByPk(id);
    
    if (!setting) {
      return errorResponse(res, 'Notification setting not found', 404);
    }
    
    return successResponse(res, setting, 'Notification setting retrieved successfully');
  } catch (error) {
    logger.error('Error in getSettingById:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving notification setting', 500);
  }
};

/**
 * Create a new notification setting
 */
export const createSetting = async (req, res) => {
  try {
    const { name, email, phone, isActive, notificationType, isPrimary } = req.body;
    
    // Basic validation
    if (!name) {
      return errorResponse(res, 'Name is required', 400);
    }
    
    if (!email && !phone) {
      return errorResponse(res, 'At least one contact method (email or phone) is required', 400);
    }
    
    // Create the setting
    const setting = await NotificationSettings.create({
      name,
      email,
      phone,
      isActive: isActive !== undefined ? isActive : true,
      notificationType: notificationType || 'ALL',
      isPrimary: isPrimary || false
    });
    
    logger.info(`Notification setting created: ${setting.id}`);
    
    return successResponse(res, setting, 'Notification setting created successfully', 201);
  } catch (error) {
    logger.error('Error in createSetting:', error.message, { stack: error.stack });
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return errorResponse(res, 'Validation error', 400, error.errors.map(e => e.message));
    }
    
    return errorResponse(res, 'Server error creating notification setting', 500);
  }
};

/**
 * Update an existing notification setting
 */
export const updateSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, isActive, notificationType, isPrimary } = req.body;
    
    // Find the setting
    const setting = await NotificationSettings.findByPk(id);
    
    if (!setting) {
      return errorResponse(res, 'Notification setting not found', 404);
    }
    
    // Update the setting
    await setting.update({
      name: name !== undefined ? name : setting.name,
      email: email !== undefined ? email : setting.email,
      phone: phone !== undefined ? phone : setting.phone,
      isActive: isActive !== undefined ? isActive : setting.isActive,
      notificationType: notificationType || setting.notificationType,
      isPrimary: isPrimary !== undefined ? isPrimary : setting.isPrimary
    });
    
    logger.info(`Notification setting updated: ${setting.id}`);
    
    return successResponse(res, setting, 'Notification setting updated successfully');
  } catch (error) {
    logger.error('Error in updateSetting:', error.message, { stack: error.stack });
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return errorResponse(res, 'Validation error', 400, error.errors.map(e => e.message));
    }
    
    return errorResponse(res, 'Server error updating notification setting', 500);
  }
};

/**
 * Delete a notification setting
 */
export const deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the setting
    const setting = await NotificationSettings.findByPk(id);
    
    if (!setting) {
      return errorResponse(res, 'Notification setting not found', 404);
    }
    
    // Delete the setting
    await setting.destroy();
    
    logger.info(`Notification setting deleted: ${id}`);
    
    return successResponse(res, { id }, 'Notification setting deleted successfully');
  } catch (error) {
    logger.error('Error in deleteSetting:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error deleting notification setting', 500);
  }
};

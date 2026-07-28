import logger from '../utils/logger.mjs';
import { getUser } from '../models/index.mjs';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';
import {
  mergeNotificationPreferences,
  normalizeNotificationPreferences,
} from '../services/notificationPreferenceService.mjs';

export const getNotificationPreferences = async (req, res) => {
  try {
    const User = getUser();
    if (!User) {
      return errorResponse(res, 'Server error: Model not initialized', 500);
    }

    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'emailNotifications', 'smsNotifications', 'notificationPreferences'],
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const preferences = normalizeNotificationPreferences(user.notificationPreferences, user);
    return successResponse(res, { preferences }, 'Notification preferences retrieved successfully');
  } catch (error) {
    logger.error('Error in getNotificationPreferences:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving notification preferences', 500);
  }
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    const User = getUser();
    if (!User) {
      return errorResponse(res, 'Server error: Model not initialized', 500);
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return errorResponse(res, 'notificationPreferences must be an object', 400);
    }

    const wrappedPreferences = body.preferences || body.notificationPreferences;
    const update = wrappedPreferences && typeof wrappedPreferences === 'object' && !Array.isArray(wrappedPreferences)
      ? wrappedPreferences
      : body;

    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'emailNotifications', 'smsNotifications', 'notificationPreferences'],
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const preferences = mergeNotificationPreferences(user.notificationPreferences, update, user);
    await user.update({
      notificationPreferences: preferences,
      emailNotifications: preferences.channels.email,
      smsNotifications: preferences.channels.sms,
    });

    return successResponse(res, { preferences }, 'Notification preferences updated successfully');
  } catch (error) {
    logger.error('Error in updateNotificationPreferences:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error updating notification preferences', 500);
  }
};

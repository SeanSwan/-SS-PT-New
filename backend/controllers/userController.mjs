import logger from '../utils/logger.mjs';
import { getUser } from '../models/index.mjs'; // 🎯 ENHANCED: Coordinated model imports
import sequelize from '../database.mjs';

export const getUsers = async (req, res) => {
  try {
    const users = await sequelize.query('SELECT * FROM users', {
      type: sequelize.QueryTypes.SELECT,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

import { successResponse, errorResponse } from '../utils/apiResponse.mjs';

export const getUserProfile = async (req, res) => {
  try {
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(req.user.id);
    return successResponse(res, user, 'User profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve user profile', 500);
  }
};

export const userController = async (req, res) => {
  try {
    logger.info('Processing request', { path: req.path, method: req.method });
    // Controller logic
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error in exampleController', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};
import logger from '../utils/logger.mjs';
import { getUser } from '../models/index.mjs'; // 🎯 ENHANCED: Coordinated model imports
import sequelize from '../database.mjs';
import { USER_CREDENTIAL_FIELDS } from '../utils/userSerialization.mjs';

export const getUsers = async (req, res) => {
  try {
    // R-02 (§18): this was `SELECT * FROM users`. Three problems:
    //   1. `SELECT *` bypasses Sequelize's `attributes` filter entirely, so no
    //      model-level guard could have stopped the credential columns.
    //   2. Unquoted lowercase `users` cannot resolve against the canonical
    //      `"Users"` table (models/User.mjs:552) — in PostgreSQL it folds to
    //      `users`, which does not exist, so the handler could only ever 500.
    //   3. No bound — the whole table, however large.
    const users = await sequelize.query(
      'SELECT "id", "firstName", "lastName", "email", "username", "role", "createdAt" '
        + 'FROM "Users" ORDER BY "id" ASC LIMIT 500',
      { type: sequelize.QueryTypes.SELECT },
    );
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { successResponse, errorResponse } from '../utils/apiResponse.mjs';

export const getUserProfile = async (req, res) => {
  try {
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    // R-01 (§18): was `User.findByPk(req.user.id)` with no attribute filter,
    // so the full row — password hash included — was serialized to the client.
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: [...USER_CREDENTIAL_FIELDS] },
    });
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
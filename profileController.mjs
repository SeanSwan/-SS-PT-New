/**
 * Profile Controller
 * ==================
 *
 * Business logic for user profile management.
 */

import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';

/**
 * Upload or update a user's profile photo.
 * POST /api/profile/upload-photo
 */
export const uploadProfilePhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const userId = req.user.id;
  const photoUrl = `/uploads/avatars/${req.file.filename}`;

  try {
    const [results] = await sequelize.query(
      `UPDATE users SET photo = :photoUrl, "updatedAt" = NOW() WHERE id = :userId RETURNING id, email, username, "firstName", "lastName", photo`,
      {
        replacements: { photoUrl, userId },
        type: QueryTypes.UPDATE,
      }
    );

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'Profile photo updated successfully.', user: results[0] });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ error: 'Failed to update profile photo.' });
  }
};
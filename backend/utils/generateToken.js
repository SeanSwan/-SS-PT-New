// backend/utils/generateToken.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generates a signed JWT token.
 * @param {number} id - The user's ID.
 * @param {string} role - The user's role (e.g., 'user' or 'admin').
 * @returns {string} A signed JWT token.
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d', // e.g., 30 days expiration
  });
};

export default generateToken;

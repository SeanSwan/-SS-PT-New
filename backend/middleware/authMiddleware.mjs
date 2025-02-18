// backend/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

/**
 * Protect middleware: verifies JWT tokens.
 * Expects the token in the Authorization header ("Bearer <token>").
 */
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(' ')[1];
      // Verify token using the secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Find the user by the id contained in the token payload
      req.user = await User.findByPk(decoded.id);
      if (!req.user) {
        return res.status(401).json({ message: 'User not found.' });
      }
      next();
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied.' });
  }
};

/**
 * Admin-only middleware: ensures the user has admin privileges.
 * Must be used after the protect middleware.
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required.' });
  }
};

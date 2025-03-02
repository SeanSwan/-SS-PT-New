/**
 * Swan Studios - Authentication Middleware
 * =======================================
 * Handles JWT authentication, user authorization, and role-based access control.
 */

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.mjs"; // Maintains case sensitivity as confirmed by you

dotenv.config();

/**
 * Protect middleware: verifies JWT tokens and attaches user to request.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const protect = async (req, res, next) => {
  let token;
  
  // Check if token exists in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];
      
      // Verify token signature using the secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find the user by ID from token payload
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        console.warn(`Authentication failed: User with ID ${decoded.id} not found`);
        return res.status(401).json({ 
          success: false,
          message: "User not found. Your account may have been deleted."
        });
      }
      
      // Attach user to request object (exclude password)
      req.user = user;
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      console.error("Token verification error:", error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: "Your session has expired. Please log in again."
        });
      }
      
      return res.status(401).json({ 
        success: false,
        message: "Not authorized. Invalid authentication token."
      });
    }
  } else {
    console.warn("Authentication failed: No token provided");
    return res.status(401).json({ 
      success: false,
      message: "Access denied. Please log in to continue."
    });
  }
};

/**
 * Admin-only middleware: ensures the user has admin privileges.
 * Must be used after the protect middleware.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    console.warn(`Admin access attempt denied for user ID: ${req.user?.id}`);
    res.status(403).json({ 
      success: false,
      message: "Access denied. Admin privileges required."
    });
  }
};

/**
 * Instructor-only middleware: ensures the user has instructor privileges.
 * Must be used after the protect middleware.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const instructorOnly = (req, res, next) => {
  if (req.user && (req.user.role === "instructor" || req.user.role === "admin")) {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      message: "Access denied. Instructor privileges required."
    });
  }
};
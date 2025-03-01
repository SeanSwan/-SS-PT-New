// backend/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.mjs";

dotenv.config();

/**
 * Protect middleware: verifies JWT tokens.
 * Expects the token in the Authorization header ("Bearer <token>"). 
 */
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];
      // For debugging:
      console.log("Token found in header:", token);

      // Verify token using the secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // For debugging:
      console.log("Decoded token payload:", decoded);

      // Find the user by the id contained in the token payload
      req.user = await User.findByPk(decoded.id);
      if (!req.user) {
        console.log("No user found with ID:", decoded.id);
        return res.status(401).json({ message: "User not found." });
      }

      // If everything is good, proceed
      next();
    } catch (error) {
      console.error("Error verifying token:", error);
      return res.status(401).json({ message: "Not authorized, token failed." });
    }
  } else {
    // If no token in the header
    return res.status(401).json({ message: "No token provided, authorization denied." });
  }
};

/**
 * Admin-only middleware: ensures the user has admin privileges.
 * Must be used after the protect middleware.
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access required." });
  }
};

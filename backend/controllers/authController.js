// backend/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Ensure the path/casing matches your project
import { Op } from 'sequelize';

/**
 * Register Controller
 * Creates a new user (client or admin) in the database.
 * Uses model hooks to hash the password.
 */
export const register = async (req, res) => {
  try {
    // Destructure fields from the request body
    const {
      firstName,
      lastName,
      email,
      username,
      password,
      phone,
      dateOfBirth,
      gender,
      weight,
      height,
      fitnessGoal,
      trainingExperience,
      healthConcerns,
      emergencyContact,
      role, // optional; defaults to 'user'
    } = req.body;

    // Ensure the JWT secret is set in environment variables
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable is not set.");
      throw new Error("JWT_SECRET environment variable is not set.");
    }

    // Check if a user with the same email or username already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'User with this email or username already exists.' });
    }

    // Create the new user record.
    // The password will be hashed by the model hooks.
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      username,
      password,
      phone,
      dateOfBirth,
      gender,
      weight,
      height,
      fitnessGoal,
      trainingExperience,
      healthConcerns,
      emergencyContact,
      role: role || 'user',
    });

    // Generate a JWT token for the new user
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    // Remove the password field from the returned user data
    const { password: pwd, ...userData } = newUser.toJSON();

    res.status(201).json({
      message: 'User registered successfully.',
      user: userData,
      token,
    });
  } catch (error) {
    // Log detailed error information for debugging
    console.error('Error in register:', error.message);
    console.error(error.stack);
    // If Sequelize validation errors exist, log each one
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err) => console.error('Sequelize error:', err.message));
    }
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

/**
 * Login Controller
 * Authenticates a user using the provided credentials.
 * Returns a JWT token and user data (excluding the password) if successful.
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the user by username
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Compare the provided password with the stored hashed password.
    // This uses the checkPassword method defined on the User model.
    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate a JWT token for the authenticated user
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // Exclude the password field from the response data.
    const { password: pwd, ...userData } = user.toJSON();

    res.status(200).json({
      message: 'Login successful.',
      user: userData,
      token,
    });
  } catch (error) {
    console.error('Error in login:', error.message);
    console.error(error.stack);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

/**
 * Validate Token Controller
 * Verifies the provided JWT token and returns the associated user data.
 */
export const validateToken = async (req, res) => {
  // Expect the token in the Authorization header: "Bearer <token>"
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error validating token:', error.message);
    console.error(error.stack);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

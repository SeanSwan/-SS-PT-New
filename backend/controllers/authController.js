// backend/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Ensure the path/casing matches your project
import { Op } from 'sequelize';

// Ensure the JWT secret is set
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set.");
}

/**
 * Register Controller
 * - Validates required fields.
 * - Checks for an existing user by email or username.
 * - Creates a new user record (password hashing is handled via model hooks).
 * - Generates a JWT token for immediate authentication.
 */
export const register = async (req, res) => {
  try {
    // Destructure the fields from the request body
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

    // Check if a user with the same email or username already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists.' });
    }

    // Create the new user record.
    // The password will be hashed automatically via model hooks.
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
    console.log("New user created with ID:", newUser.id);

    // Generate a JWT token. Use a sensible expiration (defaulting to 30 days if not specified)
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    // Exclude the password field before sending the user data back
    const { password: pwd, ...userData } = newUser.toJSON();

    res.status(201).json({
      message: 'User registered successfully.',
      user: userData,
      token,
    });
  } catch (error) {
    console.error('Error in register:', error.message);
    console.error(error.stack);
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err) => console.error('Sequelize error:', err.message));
    }
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

/**
 * Login Controller
 * - Authenticates a user based on provided credentials.
 * - Uses the model's checkPassword method to compare the input with the hashed password.
 * - If an adminAccessCode is provided and it matches the environment variable,
 *   upgrades the user role to "admin" and saves the change.
 * - Returns a JWT token along with sanitized user data.
 */
export const login = async (req, res) => {
  try {
    const { username, password, adminAccessCode } = req.body;

    // Find the user by username
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Use the instance method on the User model to check the password
    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // If an adminAccessCode is provided and it matches, upgrade the user's role
    if (adminAccessCode && adminAccessCode === process.env.ADMIN_ACCESS_CODE) {
      // Only update if the user isn't already an admin
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }
    }

    // Generate a JWT token with a default expiration of 1 hour (or as specified)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // Exclude the password field from the response
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
 * - Extracts the token from the Authorization header.
 * - Verifies the token using jwt.verify.
 * - Returns the associated user data if the token is valid.
 */
export const validateToken = async (req, res) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  try {
    // Verify the token. Decoded payload will contain the user id.
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


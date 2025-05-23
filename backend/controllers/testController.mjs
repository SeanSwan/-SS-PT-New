// backend/controllers/testController.mjs
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

/**
 * Creates a test client user for development purposes
 * This endpoint should only be accessible in development mode
 */
export const createTestClient = async (req, res) => {
  try {
    // Check if environment is development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available in development mode'
      });
    }

    // Create a unique username/email to prevent collisions
    const timestamp = new Date().getTime();
    const testEmail = `testclient_${timestamp}@example.com`;
    const password = 'Test123!';
    
    // Generate salt & hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create the test client
    const testClient = await User.create({
      id: uuidv4(), // Generate UUID
      email: testEmail,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Client',
      role: 'client',
      availableSessions: 0, // Start with zero sessions
      phone: '555-123-4567',
      isEmailVerified: true,
      isActive: true,
      fitnessGoal: 'Improve overall fitness',
      trainingExperience: 'beginner'
    });
    
    // Log the creation
    logger.info(`Created test client: ${testEmail}`);
    
    // Return the test client details (excluding sensitive fields)
    res.status(201).json({
      success: true,
      message: 'Test client created successfully',
      client: {
        id: testClient.id,
        email: testClient.email,
        firstName: testClient.firstName,
        lastName: testClient.lastName,
        role: testClient.role,
        availableSessions: testClient.availableSessions,
        // Include the password in the response for testing
        password: 'Test123!'
      }
    });
  } catch (error) {
    logger.error(`Error creating test client: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error creating test client',
      error: error.message
    });
  }
};

/**
 * Add sessions to a test client
 */
export const addSessionsToTestClient = async (req, res) => {
  try {
    // Check if environment is development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available in development mode'
      });
    }
    
    const { clientId, sessions } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }
    
    if (!sessions || isNaN(sessions) || sessions <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid number of sessions is required'
      });
    }
    
    // Find the user
    const client = await User.findByPk(clientId);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Add sessions
    const currentSessions = client.availableSessions || 0;
    client.availableSessions = currentSessions + parseInt(sessions, 10);
    await client.save();
    
    // Log the action
    logger.info(`Added ${sessions} test sessions to client ${clientId}`);
    
    res.status(200).json({
      success: true,
      message: `Added ${sessions} sessions to test client`,
      client: {
        id: client.id,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
        availableSessions: client.availableSessions
      }
    });
  } catch (error) {
    logger.error(`Error adding sessions to test client: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error adding sessions to test client',
      error: error.message
    });
  }
};

export default {
  createTestClient,
  addSessionsToTestClient
};

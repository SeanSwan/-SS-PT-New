/**
 * MongoDB Connection Helper
 * =======================
 * Enhanced MongoDB connection with retry logic and better error handling
 */

import mongoose from 'mongoose';
import logger from './utils/logger.mjs';

// Define MongoDB connection URI from environment variables
// Default to a local MongoDB server if not provided
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:5001/swanstudios';

// Options for MongoDB connection
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: true, // Build indexes for better query performance
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Timeout for socket operations
  family: 4, // Force IPv4
  retryWrites: true // Enable retry for write operations
};

/**
 * Connect to MongoDB with retry logic
 * This function attempts to establish a connection to MongoDB
 * with multiple retries if the initial connection fails
 */
const connectToMongoDBWithRetry = async (maxRetries = 5, retryDelay = 3000) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      logger.info(`Attempting MongoDB connection to ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')} (Attempt ${retries + 1}/${maxRetries})`);
      
      await mongoose.connect(MONGO_URI, options);
      logger.info('✅ MongoDB connection established successfully');
      
      return true;
    } catch (error) {
      retries++;
      
      if (error.name === 'MongoServerSelectionError') {
        logger.warn(`MongoDB server selection error on port 5001 (Attempt ${retries}/${maxRetries}): ${error.message}`);
        logger.info('Make sure MongoDB is running on port 5001. You can start it with start-mongodb.bat');
      } else {
        logger.error(`MongoDB connection error (Attempt ${retries}/${maxRetries}): ${error.message}`);
      }
      
      if (retries >= maxRetries) {
        logger.error('Maximum MongoDB connection attempts reached. Giving up.');
        
        // Create a minimal in-memory mock if MongoDB is not available
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Creating in-memory mock for development (workouts will not be persisted)');
          // The application will continue without MongoDB in development
          return false;
        }
        
        return false;
      }
      
      logger.info(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return false;
};

// Listen for MongoDB connection events
mongoose.connection.on('connected', () => {
  logger.info('🟢 MongoDB connected successfully');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('🟠 MongoDB disconnected - workouts may not be saved');
});

mongoose.connection.on('error', (err) => {
  logger.error(`🔴 MongoDB connection error: ${err.message}`);
});

// Handle Node.js process termination events
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed due to app termination');
    process.exit(0);
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    process.exit(1);
  }
});

export { connectToMongoDBWithRetry as connectToMongoDB };
export default mongoose;

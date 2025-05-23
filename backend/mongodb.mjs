/**
 * MongoDB Connection
 * ==============
 * Establishes and manages the MongoDB connection for workout data
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
  family: 4 // Force IPv4
};

/**
 * Connect to MongoDB
 * This function establishes a connection to MongoDB
 */
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, options);
    logger.info('MongoDB connection established successfully');
    return true;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    return false;
  }
};

// Listen for MongoDB connection events
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
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

export { connectToMongoDB };
export default mongoose;

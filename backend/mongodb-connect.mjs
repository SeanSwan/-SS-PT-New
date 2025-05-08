/**
 * MongoDB Connection Module
 * ========================
 * This module provides a connection to MongoDB with fallback to SQLite
 * if MongoDB is not available or if specified in the environment.
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:5001/swanstudios';

// SQLite fallback flag
const USE_SQLITE_FALLBACK = process.env.USE_SQLITE_FALLBACK === 'true';

// Default connection options
const MONGODB_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
};

// MongoDB client instance
let client = null;
let db = null;

/**
 * Connect to MongoDB
 * @returns {Promise<Object>} MongoDB client and database instance
 */
export async function connectToMongoDB() {
  // Skip MongoDB connection if using SQLite fallback
  if (USE_SQLITE_FALLBACK) {
    console.log('MongoDB connection skipped. Using SQLite fallback.');
    return { client: null, db: null };
  }

  // Try to connect to MongoDB
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI, MONGODB_OPTIONS);
      console.log(`Connecting to MongoDB at ${MONGODB_URI.split('/').slice(0, -1).join('/')}/...`);
      
      // Connect with timeout
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000);
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      db = client.db();
      console.log('MongoDB connection established successfully');
    }
    
    return { client, db };
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.log('Falling back to SQLite');
    
    // Clean up any partial connection
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error(`Error closing MongoDB client: ${closeError.message}`);
      }
      client = null;
      db = null;
    }
    
    // Enable SQLite fallback
    process.env.USE_SQLITE_FALLBACK = 'true';
    
    return { client: null, db: null };
  }
}

/**
 * Get MongoDB database instance
 * @returns {Object|null} MongoDB database instance or null if not connected
 */
export function getDb() {
  return db;
}

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
export async function closeMongoDBConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

/**
 * Check if MongoDB is connected
 * @returns {boolean} True if connected, false otherwise
 */
export function isMongoDBConnected() {
  return !!client && !!db;
}

/**
 * Get MongoDB connection status
 * @returns {Object} Connection status
 */
export function getMongoDBStatus() {
  return {
    connected: isMongoDBConnected(),
    usingSQLite: USE_SQLITE_FALLBACK,
    uri: MONGODB_URI.split('/').slice(0, -1).join('/') + '/...',
  };
}

// Default export for the module
export default {
  connectToMongoDB,
  getDb,
  closeMongoDBConnection,
  isMongoDBConnected,
  getMongoDBStatus
};

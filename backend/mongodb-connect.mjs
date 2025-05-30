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
// For production: MONGO_URI is set by Render with full connection string
// For development: Use environment variables or fallback to default
const isProduction = process.env.NODE_ENV === 'production';

// In production, if no MongoDB URI is provided, automatically use SQLite fallback
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const MONGODB_FALLBACK_URI = isProduction ? MONGODB_URI : 'mongodb://localhost:27017/swanstudios';

// SQLite fallback flag - automatically enabled in production if no MongoDB URI
let USE_SQLITE_FALLBACK = process.env.USE_SQLITE_FALLBACK === 'true';

// In production, if no MongoDB URI is configured, use SQLite fallback
if (isProduction && !MONGODB_URI) {
  console.log('🗃️ Production: No MongoDB URI configured, using SQLite fallback mode');
  USE_SQLITE_FALLBACK = true;
  process.env.USE_SQLITE_FALLBACK = 'true';
}

// Default connection options
const MONGODB_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: isProduction ? 10000 : 5000, // Longer timeout in production
  connectTimeoutMS: isProduction ? 10000 : 5000,
  socketTimeoutMS: 45000, // Longer socket timeout to prevent disconnects
  maxPoolSize: 50, // Increase connection pool size for production
  minPoolSize: isProduction ? 5 : 1, // Maintain minimum connections in production
  maxIdleTimeMS: 60000, // Keep idle connections open longer
  retryWrites: true,
  retryReads: true
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

  // In production, if no MongoDB URI, skip connection attempt
  if (isProduction && !MONGODB_URI) {
    console.log('Production: No MongoDB URI provided, skipping MongoDB connection');
    return { client: null, db: null };
  }

  // Try to connect to MongoDB
  try {
    if (!client && MONGODB_URI) {
      client = new MongoClient(MONGODB_URI, MONGODB_OPTIONS);
      console.log(`Connecting to MongoDB at ${MONGODB_URI.split('/').slice(0, -1).join('/')}/...`);
      
      // Connect with shorter timeout in production to fail fast
      const timeoutMs = isProduction ? 3000 : 5000;
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('MongoDB connection timeout')), timeoutMs);
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      db = client.db();
      console.log('MongoDB connection established successfully');
    }
    
    return { client, db };
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    
    // Clean up any partial connection
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        // Ignore close errors
      }
      client = null;
      db = null;
    }
    
    // In production, don't try fallback connections - just enable SQLite
    if (isProduction) {
      console.log('Production: MongoDB unavailable, enabling SQLite fallback');
      process.env.USE_SQLITE_FALLBACK = 'true';
      return { client: null, db: null };
    }
    
    // In development, try connecting to default MongoDB port if custom port failed
    if (!isProduction && MONGODB_FALLBACK_URI && MONGODB_FALLBACK_URI !== MONGODB_URI) {
      try {
        console.log('Attempting to connect to MongoDB on default port 27017...');
        client = new MongoClient(MONGODB_FALLBACK_URI, MONGODB_OPTIONS);
        await client.connect();
        db = client.db();
        console.log('MongoDB connection established successfully on default port');
        return { client, db };
      } catch (fallbackError) {
        console.error(`MongoDB fallback connection also failed: ${fallbackError.message}`);
      }
    }
    
    console.log('Falling back to SQLite');
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
    uri: MONGODB_URI ? MONGODB_URI.split('/').slice(0, -1).join('/') + '/...' : 'Not configured',
    database: MONGODB_URI ? MONGODB_URI.split('/').pop() : 'N/A',
    lastConnectionAttempt: new Date().toISOString()
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

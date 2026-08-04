/**
 * Database Utility Module
 * =======================
 * 
 * Production-ready database connection and utilities for SwanStudios PT
 * Handles PostgreSQL connections with proper error handling and pooling
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a database query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise} Database client
 */
export const getClient = async () => {
  try {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
      console.error('A client has been checked out for more than 5 seconds!');
      console.error(`The last executed query on this client was: ${client.lastQuery}`);
    }, 5000);
    
    // Monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };
    
    client.release = () => {
      // Clear our timeout
      clearTimeout(timeout);
      // Set the methods back to their old un-monkey-patched version
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  } catch (error) {
    console.error('Error getting database client:', error);
    throw error;
  }
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

/**
 * DEPRECATED — DO NOT CALL (drift audit 2026-08-03).
 *
 * This legacy bootstrap created three tables whose schemas contradict the real app:
 *   - lowercase `users` — the DEAD duplicate of canonical "Users" (the exact dual-table
 *     hazard CLAUDE.md's gotcha list warns about; it seeded FKs pointing at the wrong table)
 *   - a minimal `sessions` with "scheduledDate" (the real table uses "sessionDate")
 *   - a minimal `packages` (canonical catalog is storefront_items / StorefrontItem)
 * It has zero runtime callers (verified by repo-wide grep). Table creation belongs to
 * migrations + utils/tableCreationOrder.mjs, never this helper. The function is kept as a
 * fail-fast stub so any future caller surfaces immediately instead of resurrecting drift.
 * @returns {Promise<never>}
 */
export const initializeDatabase = async () => {
  throw new Error(
    'initializeDatabase() is retired: it created the dead lowercase `users` table and ' +
    'schema-drifted sessions/packages tables. Use migrations or utils/tableCreationOrder.mjs.'
  );
};

/**
 * Close database pool
 * @returns {Promise<void>}
 */
export const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
};

// Export the pool for direct access if needed
export { pool };

// Default export
export default {
  query,
  getClient,
  testConnection,
  initializeDatabase,
  closePool,
  pool
};

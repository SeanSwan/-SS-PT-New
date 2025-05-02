/**
 * Script to manually clean up the database before running migrations
 * This script connects directly to PostgreSQL and drops all tables and types
 * 
 * Usage: node scripts/reset-db.mjs
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file (one level up from scripts directory)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { Client } = pg;

// Connect to PostgreSQL using environment variables
const client = new Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DB,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432,
});

async function resetDatabase() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully');

    // Drop all tables
    console.log('Dropping all application tables...');
    await client.query('DROP TABLE IF EXISTS "SequelizeMeta" CASCADE');
    await client.query('DROP TABLE IF EXISTS "cart_items" CASCADE');
    await client.query('DROP TABLE IF EXISTS "shopping_carts" CASCADE');
    await client.query('DROP TABLE IF EXISTS "storefront_items" CASCADE');
    await client.query('DROP TABLE IF EXISTS "contacts" CASCADE');
    await client.query('DROP TABLE IF EXISTS "admin_settings" CASCADE');
    await client.query('DROP TABLE IF EXISTS "sessions" CASCADE');
    await client.query('DROP TABLE IF EXISTS "users" CASCADE');

    // Drop all custom enum types
    console.log('Dropping enum types...');
    await client.query('DROP TYPE IF EXISTS "enum_storefront_items_packageType" CASCADE');
    await client.query('DROP TYPE IF EXISTS "enum_storefront_items_theme" CASCADE');
    await client.query('DROP TYPE IF EXISTS "enum_sessions_status" CASCADE');
    await client.query('DROP TYPE IF EXISTS "enum_shopping_carts_status" CASCADE');
    await client.query('DROP TYPE IF EXISTS "enum_users_role" CASCADE');
    
    console.log('Database reset successfully!');
  } catch (err) {
    console.error('Error resetting database:', err);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

resetDatabase();

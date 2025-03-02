// backend/database.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Create a new Sequelize instance using your PostgreSQL environment variables.
// We use process.env.PG_DB, process.env.PG_USER, etc., since your .env file provides PG_* values.
const sequelize = new Sequelize(
  process.env.PG_DB,        // Database name (e.g., 'swanstudios')
  process.env.PG_USER,      // Database user (e.g., 'swanadmin')
  process.env.PG_PASSWORD,  // Database password (make sure this is set in your .env file)
  {
    host: process.env.PG_HOST, // Database host (e.g., 'localhost')
    port: process.env.PG_PORT, // Database port (e.g., 5432)
    dialect: 'postgres',       // Set the dialect to 'postgres'
    logging: false,            // Disable SQL logging (set to console.log for debugging)
  }
);

// Test the connection when the server starts
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

testConnection();

export default sequelize;

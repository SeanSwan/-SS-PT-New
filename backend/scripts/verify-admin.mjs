// backend/scripts/verify-admin.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Sequelize, DataTypes } from 'sequelize';
import winston from 'winston';

// Create a custom logger for this script
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? '✅' : ''} ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ],
});

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(rootDir, '..');

// IMPORTANT: Load the .env file from the project root directory
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  logger.info(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  logger.warn(`Warning: .env file not found at ${envPath}`);
  // Fallback to the backend directory .env if it exists
  const backendEnvPath = path.resolve(rootDir, '.env');
  if (fs.existsSync(backendEnvPath)) {
    logger.info(`Loading environment variables from: ${backendEnvPath}`);
    dotenv.config({ path: backendEnvPath });
  } else {
    logger.warn('Warning: No .env file found. Using default environment variables.');
    dotenv.config(); // Try default location as a last resort
  }
}

// Explicitly import the database config
import dbConfig from '../config/config.js';

/**
 * Script to verify if the admin user exists
 * If not, it will create one with a temporary password
 * This version uses explicit configuration rather than relying on process.env
 */
async function verifyAdmin() {
  let sequelize = null;
  let User = null;
  
  try {
    logger.info('----- Admin User Verification Script -----');
    
    // Get the development config
    const config = dbConfig.development;
    
    logger.info('Loaded database configuration:');
    logger.info(`Database: ${config.database}`);
    logger.info(`Username: ${config.username}`);
    logger.info(`Password: ${config.password ? '******** (set)' : '(not set)'}`);
    logger.info(`Host: ${config.host}`);
    logger.info(`Port: ${config.port}`);
    
    // CRITICAL FIX: Ensure password is explicitly a string
    if (config.password !== undefined && config.password !== null) {
      config.password = String(config.password);
      logger.info('Password converted to explicit string to avoid authentication issues');
    } else {
      logger.error('Password is undefined or null in config!');
      throw new Error('Database password is missing in config.');
    }
    
    // Create a new Sequelize instance with explicit config
    logger.info('Creating Sequelize instance with explicit config...');
    sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        logging: false, // Disable SQL logging for clarity
      }
    );
    
    // Check database connection
    logger.info('Testing database connection...');
    try {
      await sequelize.authenticate();
      logger.info('Database connection established successfully.');
    } catch (error) {
      logger.error(`Unable to connect to the database: ${error.message}`);
      if (error.parent) {
        logger.error(`Parent error: ${error.parent.message}`);
      }
      if (error.original) {
        logger.error(`Original error: ${error.original.message}`);
      }
      throw new Error(`Database connection failed: ${error.message}.`);
    }
    
    // Define User model directly in this script to avoid import issues
    logger.info('Defining User model...');
    User = sequelize.define('User', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'client',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      emailNotifications: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      smsNotifications: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      preferences: {
        type: DataTypes.TEXT,
        allowNull: true,
      }
    }, {
      tableName: 'users',
      timestamps: true,
    });
    
    // Check if admin user exists
    logger.info('Checking for admin user...');
    let adminUser = await User.findOne({ where: { username: 'admin' } });
    
    if (adminUser) {
      logger.info(`Admin user exists! ID: ${adminUser.id}`);
      logger.info(`Name: ${adminUser.firstName} ${adminUser.lastName}`);
      logger.info(`Role: ${adminUser.role}`);
      logger.info(`Active: ${adminUser.isActive ? 'Yes' : 'No'}`);
    } else {
      logger.warn('Admin user NOT found!');
      
      // Create admin user with temporary password
      logger.info('Creating admin user...');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('55555', salt);
      
      // Create admin user
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@swanstudios.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        emailNotifications: true,
        smsNotifications: true,
        preferences: JSON.stringify({
          theme: 'dark',
          language: 'en',
          dashboardLayout: 'default'
        })
      });
      
      logger.info(`Admin user created successfully! ID: ${adminUser.id}`);
      logger.info('Username: admin');
      logger.info('Password: 55555');
    }
    
    logger.info('----- Admin User Verification Complete -----');
    logger.info('');
    logger.info('You can now log in with:');
    logger.info('Username: admin');
    logger.info('Password: 55555');
    
  } catch (error) {
    logger.error(`Admin verification failed: ${error.message}`);
    if (error.stack) {
      logger.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  } finally {
    // Close the database connection
    if (sequelize) {
      await sequelize.close();
      logger.info('Database connection closed.');
    }
  }
}

// Execute the verification
verifyAdmin().catch(error => {
  logger.error(`Fatal error during admin verification: ${error.message}`);
  process.exit(1);
});

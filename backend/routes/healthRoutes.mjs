import express from 'express';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { getMongoDBStatus } from '../mongodb-connect.mjs';
import os from 'os';
import { version } from 'process';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Check API health status
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check PostgreSQL database connection
    let postgresConnected = false;
    try {
      await sequelize.authenticate();
      postgresConnected = true;
    } catch (dbError) {
      logger.error('PostgreSQL health check failed:', { error: dbError.message });
    }
    
    // Get MongoDB status
    const mongoStatus = getMongoDBStatus();
    
    // Get system information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMem: Math.round(os.totalmem() / (1024 * 1024)) + 'MB',
      freeMem: Math.round(os.freemem() / (1024 * 1024)) + 'MB',
      nodeVersion: version,
    };
    
    // Determine overall health status
    // In production, both databases must be connected
    // In development, at least one database must be connected
    const isProduction = process.env.NODE_ENV === 'production';
    const isHealthy = isProduction 
      ? (postgresConnected && mongoStatus.connected)
      : (postgresConnected || mongoStatus.connected);
    
    // Return comprehensive health information
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy ? 'API is healthy' : 'API health check failed',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      databases: {
        postgres: {
          connected: postgresConnected,
          type: 'primary'
        },
        mongodb: {
          connected: mongoStatus.connected,
          usingSQLite: mongoStatus.usingSQLite || false,
          type: 'workout/gamification'
        }
      },
      system: systemInfo,
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime())
      }
    });
  } catch (error) {
    logger.error('Health check failed:', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'API health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
});

/**
 * Format uptime in human-readable format
 * @param {number} uptime - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  let formatted = '';
  if (days > 0) formatted += `${days}d `;
  if (hours > 0 || days > 0) formatted += `${hours}h `;
  if (minutes > 0 || hours > 0 || days > 0) formatted += `${minutes}m `;
  formatted += `${seconds}s`;
  
  return formatted;
}

/**
 * @route   GET /api/health/database
 * @desc    Check database connectivity
 * @access  Public
 */
router.get('/database', async (req, res) => {
  try {
    // Attempt to authenticate with the database
    await sequelize.authenticate();
    
    // Get database information
    const [results] = await sequelize.query('SELECT version();');
    const dbVersion = results[0]?.version || 'Unknown';
    
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      dbVersion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health check failed:', { error: error.message, stack: error.stack });
    
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

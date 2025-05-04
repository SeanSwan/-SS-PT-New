import express from 'express';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Check API health status
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();
    
    // Return basic system info
    res.status(200).json({
      success: true,
      message: 'API is healthy',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      databaseConnected: true,
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Health check failed:', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'API health check failed',
      error: 'Database connection issue',
      timestamp: new Date().toISOString(),
      databaseConnected: false,
      uptime: process.uptime()
    });
  }
});

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

/**
 * Middleware to check database connection health
 * Used for health check endpoints and debugging
 */
export const dbHealthCheck = async (req, res, next) => {
  try {
    await sequelize.authenticate();
    req.dbStatus = { connected: true, message: 'Database connection is healthy' };
    next();
  } catch (error) {
    logger.error('Database health check failed:', { error: error.message, stack: error.stack });
    req.dbStatus = { connected: false, message: 'Database connection failed', error: error.message };
    next();
  }
};

/**
 * Debug Middleware
 * =======================================
 * Provides detailed logging for debugging API calls
 */

import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';

/**
 * Middleware to log request and response details
 * Only active in development environment
 */
export const requestLogger = (req, res, next) => {
  // Only log in development environment
  if (process.env.NODE_ENV === 'production') {
    return next();
  }
  
  // Log request details
  const requestLog = {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers['authorization'] ? '**present**' : '**not-present**'
    },
    ip: req.ip
  };
  
  logger.info(`DEBUG Request: ${req.method} ${req.path}`, requestLog);
  
  // Capture and log response
  const originalSend = res.send;
  res.send = function(data) {
    // Only log responses for API routes (to reduce noise)
    if (req.path.startsWith('/api/')) {
      try {
        // Try to parse JSON response
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        logger.info(`DEBUG Response: ${req.method} ${req.path} (${res.statusCode})`, {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          response: parsedData
        });
      } catch (err) {
        // If parsing fails, log the raw response
        logger.info(`DEBUG Response: ${req.method} ${req.path} (${res.statusCode})`, {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          response: 'Non-JSON response'
        });
      }
    }
    return originalSend.call(this, data);
  };
  
  next();
};

export default requestLogger;

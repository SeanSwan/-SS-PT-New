import express from 'express';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Debug endpoint to check if auth-related routes are accessible
router.get('/auth-check', (req, res) => {
  logger.info(`Auth check endpoint called from ${req.ip}`);
  res.status(200).json({
    success: true,
    message: 'Auth routes are accessible',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint with CORS headers
router.options('/cors-test', (req, res) => {
  logger.info(`CORS preflight check from ${req.ip}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.status(204).send();
});

router.get('/cors-test', (req, res) => {
  logger.info(`CORS test endpoint called from ${req.ip}`);
  res.status(200).json({
    success: true,
    message: 'CORS is working correctly',
    origin: req.headers.origin || 'No origin header',
    timestamp: new Date().toISOString()
  });
});

// Echo all request data for debugging
router.all('/echo', (req, res) => {
  logger.info(`Echo endpoint called with ${req.method} from ${req.ip}`);
  
  // Capture key request information
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    cookies: req.cookies,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };
  
  // Log the request data
  logger.info('Echo request data:', requestData);
  
  // Return the data to the client
  res.status(200).json({
    success: true,
    message: 'Request echo',
    request: requestData
  });
});

export default router;
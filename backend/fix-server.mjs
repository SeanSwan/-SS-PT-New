/**
 * Server Fix Script
 * ================
 * This script creates any missing utility files needed for the server to start properly.
 * Run this script when encountering startup issues due to missing modules.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to ensure a directory exists
async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Function to create a file if it doesn't exist
async function createFileIfMissing(filePath, content) {
  try {
    await fs.access(filePath);
    console.log(`File already exists: ${filePath}`);
  } catch (error) {
    await fs.writeFile(filePath, content);
    console.log(`Created file: ${filePath}`);
  }
}

// Function to check and fix the authMiddleware.mjs file
async function checkAuthMiddleware() {
  // Check authMiddleware.mjs for missing authorize function
  const authMiddlewarePath = path.join(__dirname, 'middleware', 'authMiddleware.mjs');
  
  try {
    const authMiddlewareContent = await fs.readFile(authMiddlewarePath, 'utf8');
    
    // Check if authorize function exists
    if (!authMiddlewareContent.includes('export const authorize')) {
      console.log('Adding missing authorize function to authMiddleware.mjs');
      
      // Find the position to insert the function (before adminOnly function)
      const insertPosition = authMiddlewareContent.indexOf('* Admin-only access middleware');
      
      if (insertPosition !== -1) {
        // Insert the authorize function before adminOnly function
        const newContent = authMiddlewareContent.slice(0, insertPosition) + 
          `/**
 * Role-based authorization middleware
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export const authorize = (roles = []) => {
  return (req, res, next) => {
    // Must be used after protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Check if user's role is included in the allowed roles
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    // If we get here, user is not authorized
    logger.warn('Role-based access denied', { 
      userId: req.user.id, 
      userRole: req.user.role,
      requiredRoles: roles,
      path: req.path, 
      method: req.method 
    });
    
    return res.status(403).json({
      success: false,
      message: \`Access denied: Must have one of these roles: \${roles.join(', ')}\`
    });
  };
};

/**
` + authMiddlewareContent.slice(insertPosition);
        
        await fs.writeFile(authMiddlewarePath, newContent);
        console.log('✅ Added missing authorize function to authMiddleware.mjs');
      } else {
        console.log('⚠️ Could not find insertion point for authorize function');
      }
    }
  } catch (error) {
    console.error(`Error checking/updating authMiddleware.mjs: ${error.message}`);
  }
}

async function main() {
  console.log('🔧 Running Server Fix Script...');
  
  // Ensure required directories exist
  await ensureDir(path.join(__dirname, 'utils'));
  await ensureDir(path.join(__dirname, 'middleware'));
  await ensureDir(path.join(__dirname, 'uploads'));
  
  // Create responseUtils.mjs if missing
  const responseUtilsPath = path.join(__dirname, 'utils', 'responseUtils.mjs');
  const responseUtilsContent = `/**
 * Response utility functions for consistent API responses
 * Used by controllers to format responses and error handling
 */

/**
 * Send a successful response with data
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message (default: Success)
 */
export const successResponse = (res, data = null, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message
 * @param {object} error - Error details (optional)
 */
export const errorResponse = (res, statusCode = 500, message = 'Server Error', error = null) => {
  // Log the error (consider implementing a proper logger)
  console.error(\`[ERROR] \${message}\`, error);
  
  const response = {
    success: false,
    message
  };

  // Only include error details in development mode
  if (process.env.NODE_ENV !== 'production' && error) {
    response.error = error.toString();
    if (error.stack) {
      response.stack = error.stack;
    }
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 * @param {object} res - Express response object
 * @param {string} message - Validation error message
 * @param {object} errors - Validation errors
 */
export const validationErrorResponse = (res, message = 'Validation Error', errors = {}) => {
  return res.status(400).json({
    success: false,
    message,
    errors
  });
};

/**
 * Send a not found response
 * @param {object} res - Express response object
 * @param {string} message - Not found message
 */
export const notFoundResponse = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    message
  });
};

/**
 * Send an unauthorized response
 * @param {object} res - Express response object
 * @param {string} message - Unauthorized message
 */
export const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return res.status(401).json({
    success: false,
    message
  });
};

/**
 * Send a forbidden response
 * @param {object} res - Express response object
 * @param {string} message - Forbidden message
 */
export const forbiddenResponse = (res, message = 'Access forbidden') => {
  return res.status(403).json({
    success: false,
    message
  });
};`;

  await createFileIfMissing(responseUtilsPath, responseUtilsContent);
  
  // Create apiResponse.mjs if missing
  const apiResponsePath = path.join(__dirname, 'utils', 'apiResponse.mjs');
  const apiResponseContent = `// In backend/utils/apiResponse.mjs

/**
 * Send a success response
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {object} Express response
 */
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {object} errors - Error details
 * @returns {object} Express response
 */
export const errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};`;

  await createFileIfMissing(apiResponsePath, apiResponseContent);
  
  // Create logger.mjs if missing
  const loggerPath = path.join(__dirname, 'utils', 'logger.mjs');
  const loggerContent = `/**
 * Logger Utility
 * =============
 * A centralized logger for the application.
 * Uses Winston for flexible, configurable logging.
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Define log levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to Winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => \`\${info.timestamp} \${info.level}: \${info.message}\${info.stack ? '\\n' + info.stack : ''}\`
  )
);

// Define logger transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => \`\${info.timestamp} \${info.level}: \${info.message}\${info.stack ? '\\n' + info.stack : ''}\`
      )
    ),
    level: isProduction ? 'info' : 'debug', // More verbose in development
  }),
];

// Add file transports in production
if (isProduction) {
  // Log files directory
  const logDir = path.join(__dirname, '..', 'logs');
  
  // Add file transport for all logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'all.log'),
      level: 'info',
    })
  );
  
  // Add file transport for error logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  levels,
  format,
  transports,
});

// If Winston is not available or fails, fallback to console
if (!logger) {
  // Simple console logger fallback
  const fallbackLogger = {
    error: (message, meta) => console.error(\`[ERROR] \${message}\`, meta),
    warn: (message, meta) => console.warn(\`[WARN] \${message}\`, meta),
    info: (message, meta) => console.info(\`[INFO] \${message}\`, meta),
    http: (message, meta) => console.log(\`[HTTP] \${message}\`, meta),
    debug: (message, meta) => console.debug(\`[DEBUG] \${message}\`, meta),
  };
  
  // Export the fallback logger
  export default fallbackLogger;
} else {
  // Export the Winston logger
  export default logger;
}`;

  await createFileIfMissing(loggerPath, loggerContent);
  
  // Create apiKeyChecker.mjs if missing
  const apiKeyCheckerPath = path.join(__dirname, 'utils', 'apiKeyChecker.mjs');
  const apiKeyCheckerContent = `/**
 * API Key Checker Utility
 * ======================
 * Verifies that required API keys are available in the environment.
 * Can be called at server startup to provide early warning about missing credentials.
 */

import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Check if required API keys are present
 * @returns {boolean} True if all required keys are present
 */
export function checkApiKeys() {
  // Define required API keys with descriptions
  const requiredKeys = [
    { name: 'JWT_SECRET', description: 'Secret for JWT token signing' },
    { name: 'STRIPE_SECRET_KEY', description: 'Stripe payment processing' },
  ];
  
  // Define optional but recommended API keys
  const recommendedKeys = [
    { name: 'SENDGRID_API_KEY', description: 'Email delivery through SendGrid' },
    { name: 'CLOUDINARY_URL', description: 'Image hosting and optimization' },
  ];
  
  let allRequiredKeysPresent = true;
  let missingRequiredKeys = [];
  let missingRecommendedKeys = [];
  
  // Check for required keys
  for (const key of requiredKeys) {
    if (!process.env[key.name]) {
      allRequiredKeysPresent = false;
      missingRequiredKeys.push(key);
    }
  }
  
  // Check for recommended keys
  for (const key of recommendedKeys) {
    if (!process.env[key.name]) {
      missingRecommendedKeys.push(key);
    }
  }
  
  // Log warnings for missing keys
  if (missingRequiredKeys.length > 0) {
    console.warn('\\n⚠️  MISSING REQUIRED API KEYS ⚠️');
    console.warn('The following required API keys are missing:');
    
    missingRequiredKeys.forEach(key => {
      console.warn(\`  - \${key.name}: \${key.description}\`);
    });
    
    console.warn('\\nPlease update your .env file or environment variables.\\n');
  }
  
  if (missingRecommendedKeys.length > 0) {
    console.warn('\\n⚠️  MISSING RECOMMENDED API KEYS ⚠️');
    console.warn('The following recommended API keys are missing:');
    
    missingRecommendedKeys.forEach(key => {
      console.warn(\`  - \${key.name}: \${key.description}\`);
    });
    
    console.warn('\\nSystem will function, but some features may be limited.\\n');
  }
  
  return allRequiredKeysPresent;
}

export default {
  checkApiKeys
};`;

  await createFileIfMissing(apiKeyCheckerPath, apiKeyCheckerContent);
  
  // Create nasmAuthMiddleware.mjs if missing
  const nasmAuthMiddlewarePath = path.join(__dirname, 'middleware', 'nasmAuthMiddleware.mjs');
  const nasmAuthMiddlewareContent = `/**
 * nasmAuthMiddleware.mjs
 * Authentication middleware specifically for NASM protocol routes
 * Provides compatible naming with the client progress routes
 */
import { protect, adminOnly, trainerOnly, clientOnly } from './authMiddleware.mjs';
import logger from '../utils/logger.mjs';

/**
 * Authentication middleware to protect routes
 * This is an alias for the protect middleware to maintain
 * compatibility with the client progress routes
 */
export const authenticateUser = protect;

/**
 * Authorization middleware to restrict routes to specific roles
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    // Must be used after authenticateUser middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Check if user's role is included in the allowed roles
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    // If we get here, user is not authorized
    logger.warn('Role-based access denied', { 
      userId: req.user.id, 
      userRole: req.user.role,
      requiredRoles: roles,
      path: req.path, 
      method: req.method 
    });
    
    return res.status(403).json({
      success: false,
      message: \`Access denied: Must have one of these roles: \${roles.join(', ')}\`
    });
  };
};`;

  await createFileIfMissing(nasmAuthMiddlewarePath, nasmAuthMiddlewareContent);
  
  // Check for missing authorize function in authMiddleware.mjs
  await checkAuthMiddleware();
  
  console.log('\n✅ Server fix script completed successfully.');
  console.log('All required utility files have been created or verified.');
  console.log('\nYou can now start the server using:');
  console.log('npm run start-backend');
}

// Run the main function
main().catch(error => {
  console.error('❌ Error running fix script:', error);
  process.exit(1);
});

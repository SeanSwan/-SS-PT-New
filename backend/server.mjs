/**
 * Swan Studios - Main Server
 * =========================
 * This is the entry point for the backend server.
 * It configures Express, routes, and middlewares.
 */

// CRITICAL: Suppress Redis errors before any other imports
import './utils/enhancedRedisErrorSuppressor.mjs';

// IMPORTANT: Load environment variables before any other imports
// This ensures process.env is populated before other modules access it
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');

// Load the .env file from the project root directory
const envPath = path.resolve(projectRootDir, '.env');
if (existsSync(envPath)) {
  console.log(`[Server] Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`[Server] Warning: .env file not found at ${envPath}. This is normal in production environments.`);
  console.warn('[Server] Environment variables should be set in the Render dashboard for production.');
  dotenv.config(); // Try default location as a last resort
}

// Check for SQLite fallback mode
const USE_SQLITE_FALLBACK = process.env.USE_SQLITE_FALLBACK === 'true';

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Log basic environment info (without sensitive values)
console.log(`[Server] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`[Server] Database: ${USE_SQLITE_FALLBACK ? 'SQLITE (Fallback)' : (isProduction ? 'RENDER POSTGRES (via DATABASE_URL)' : 'MONGODB')}`);
if (!isProduction) {
  console.log(`[Server] Database Host: ${process.env.PG_HOST || 'localhost'}`);
}

// Apply Redis connection fix early
import redisConnectionFix from './utils/redisConnectionFix.mjs';
redisConnectionFix.preventRedisConnections();

// Prevent unwanted Redis connections early (but not suppress errors anymore)
import { preventRedisConnections, checkRedisAvailability } from './utils/redisConnectionPreventer.mjs';
preventRedisConnections();

// Now import other dependencies after environment variables are loaded
import express from 'express';
import cors from 'cors';
import compression from 'compression'; // For production performance
import helmet from 'helmet'; // For security headers
import http from 'http';
import { initSocketIO, closeSocketIO } from './socket/socketManager.mjs';
import { checkApiKeys } from './utils/apiKeyChecker.mjs';
import authRoutes from './routes/authRoutes.mjs';
import profileRoutes from './routes/profileRoutes.mjs';
import userManagementRoutes from './routes/userManagementRoutes.mjs';
import sessionRoutes from './routes/sessionRoutes.mjs';
import sessionPackageRoutes from './routes/sessionPackageRoutes.mjs';
import cartRoutes from './routes/cartRoutes.mjs';
import storefrontRoutes from './routes/storeFrontRoutes.mjs';
import contactRoutes from './routes/contactRoutes.mjs';
import orientationRoutes from './routes/orientationRoutes.mjs';
import checkoutRoutes from './routes/checkoutRoutes.mjs';
import orderRoutes from './routes/orderRoutes.mjs';
import recommendationRoutes from './routes/recommendationRoutes.mjs';
import stripeWebhookRouter from './webhooks/stripeWebhook.mjs';
import foodScannerRoutes from './routes/foodScannerRoutes.mjs';
import workoutRoutes from './routes/workoutRoutes.mjs';
import messagesRoutes from './routes/messages.mjs';
import scheduleRoutes from './routes/scheduleRoutes.mjs';
import enhancedScheduleRoutes from './routes/enhancedScheduleRoutes.mjs';
import adminRoutes from './routes/adminRoutes.mjs';
import adminDebugRoutes from './routes/admin.mjs';
import adminClientRoutes from './routes/adminClientRoutes.mjs';
import adminPackageRoutes from './routes/adminPackageRoutes.mjs';
import apiRoutes from './routes/api.mjs';
import devRoutes from './routes/dev-routes.mjs';
import debugRoutes from './routes/debug.mjs';  // Import debug routes
import healthRoutes from './routes/healthRoutes.mjs';  // Import health routes
import mcpRoutes from './routes/mcpRoutes.mjs';  // Import MCP integration routes
import aiMonitoringRoutes from './routes/aiMonitoringRoutes.mjs';  // Import AI monitoring routes
import dashboardRoutes from './routes/dashboardRoutes.mjs';  // Import dashboard routes
import dashboardStatsRoutes from './routes/dashboardStatsRoutes.mjs';  // Import dashboard stats routes
import notificationsApiRoutes from './routes/notificationsRoutes.mjs';  // Import notifications API routes
import migrationRoutes from './routes/migrationRoutes.mjs';  // Import migration routes
// Import workout plan and session routes
import workoutPlanRoutes from './routes/workoutPlanRoutes.mjs';
import workoutSessionRoutes from './routes/workoutSessionRoutes.mjs';
// Import Master Prompt v26 routes
import masterPromptRoutes from './routes/masterPrompt/index.mjs';
// Import NASM protocol routes
import clientProgressRoutes from './routes/clientProgressRoutes.mjs';
import exerciseRoutes from './routes/exerciseRoutes.mjs';
import gamificationRoutes from './routes/gamificationRoutes.mjs';
import gamificationApiRoutes from './routes/gamificationApiRoutes.mjs';  // Import gamification API routes
import socialRoutes from './routes/social/index.mjs';
import roleRoutes from './routes/roleRoutes.mjs';
import logger from './utils/logger.mjs';
import { requestLogger } from './middleware/debugMiddleware.mjs';
import sequelize from './database.mjs';

// Import updated setupAssociations that uses dynamic imports
import setupAssociations from './setupAssociations.mjs';

// Import MongoDB connection with fallback support
import { connectToMongoDB, getMongoDBStatus } from './mongodb-connect.mjs';

// Import startup migrations
import { runStartupMigrations } from './utils/startupMigrations.mjs';

// Import storefront seeder
import seedStorefrontItems from './seedStorefrontItems.mjs';

// Dynamically import errorMiddleware to avoid issues
let errorMiddlewareHandler;
try {
  // Try to import the error middleware as a named export
  const importedModule = await import('./middleware/errorMiddleware.mjs');
  errorMiddlewareHandler = importedModule.errorMiddleware;

  // If that fails, try to access it as a property
  if (!errorMiddlewareHandler && importedModule.default) {
    errorMiddlewareHandler = importedModule.default;
  }

  logger.info('Successfully imported error middleware');
} catch (error) {
  // Create a simple error middleware if import fails
  logger.error(`Error importing middleware: ${error.message}`);
  errorMiddlewareHandler = (err, req, res, next) => {
    logger.error(`Error in fallback middleware: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error occurred',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  };
}

// --- Run API Key Checks Early ---
checkApiKeys();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 10000; // Default to 10000 for development, Render sets the PORT env var

// Apply security headers in production
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for some admin features
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https://cdn.example.com"], // Added blob: for generated images
        connectSrc: ["'self'", "https://api.stripe.com"], // Adjust for your API needs
      }
    },
    // Disable X-Powered-By header
    hidePoweredBy: true,
    // Enable other security features
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
  }));
  
  // Apply compression in production for performance
  app.use(compression({
    level: 6, // Default compression level
    filter: (req, res) => {
      // Don't compress responses with this request header
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression filter function from the module
      return compression.filter(req, res);
    }
  }));
  
  // Log compression enabled
  logger.info('Production optimizations enabled: helmet security, compression');
}

// Define allowed origins based on environment
// Reads from Render Env Var FRONTEND_ORIGINS first, then falls back to defaults
const whitelist = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(',')
  : [
      'http://localhost:5173', 
      'http://localhost:5174', 
      'http://localhost:5175', 
      'https://swanstudios-app.onrender.com',
      'https://sswanstudios.com',
      'https://www.sswanstudios.com',
      'https://swanstudios.com',
      'https://www.swanstudios.com'
    ]; // Ensure all production and development domains are included

// In production, use stricter CORS policies
const corsOptions = {
  origin: function (origin, callback) {
    // In development, we're more permissive
    if (!isProduction) {
      // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // Check against whitelist with relaxed matching for local development
      // (handles various localhost ports and development server variations)
      if (whitelist.some(allowed => origin.includes(allowed) || allowed.includes(origin))) {
        callback(null, true);
        return;
      }
      
      // In development, also allow localhost variations
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
        return;
      }
    }
    
    // In production, strict origin matching but also allow requests with no origin
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      // Check if it's a similar domain that might be missing from whitelist
      const isSwanStudiosDomain = origin.includes('swanstudios.com') || origin.includes('sswanstudios.com');
      if (isSwanStudiosDomain) {
        logger.warn(`CORS: Swan Studios domain not in whitelist, allowing: ${origin}`);
        callback(null, true);
      } else {
        // Origin is NOT in the whitelist and is present
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  // In production, set stricter timeouts and caching
  ...(isProduction && {
    maxAge: 3600, // 1 hour CORS caching
  })
};

// Log allowed origins for debugging
logger.info(`Allowed CORS origins: ${JSON.stringify(whitelist)}`);

// Apply middleware
// Use suitable limits for request body size
const bodyLimit = isProduction ? '10mb' : '50mb'; // More restrictive in production
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

// Apply CORS middleware *before* routes
app.use(cors(corsOptions));

// Special handling for OPTIONS requests
app.options('*', cors(corsOptions));

// Apply debug logging middleware only in development
if (!isProduction) {
  app.use(requestLogger);
  logger.info('Debug middleware enabled for development');
}

// Enhanced request logging with environment-appropriate verbosity
app.use((req, res, next) => {
  // Avoid logging health checks and other noise in production
  const isHealthCheck = req.path === '/health';
  const shouldLog = !isProduction || (!isHealthCheck && req.path !== '/favicon.ico');
  
  if (shouldLog) {
    logger.info(`[REQUEST] ${req.method} ${req.url} from ${req.ip || 'unknown'}`);
  }
  next();
});

// --- Static File Serving ---
// Serve uploaded profile photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Public Routes ---

// Root endpoint
app.get('/', (req, res) => {
  res.send('SwanStudios API Server is running');
});

// Simple test route
app.get('/test', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running correctly',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint - crucial for Render and monitoring
// Simple, robust health check that always works
app.get('/health', async (req, res) => {
  // Set CORS headers explicitly for health check
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'https://sswanstudios.com');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    // Basic server health response
    const healthResponse = {
      success: true,
      status: 'healthy',
      message: 'SwanStudios API Server is running',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0'
    };
    
    // Optional: Add database check if needed, but don't fail health check if DB is down
    try {
      await sequelize.authenticate();
      healthResponse.database = { status: 'connected', type: 'postgresql' };
    } catch (dbError) {
      healthResponse.database = { status: 'disconnected', message: 'Database check failed but server is running' };
    }
    
    res.status(200).json(healthResponse);
  } catch (error) {
    // Always return 200 for health checks - even if there are issues
    res.status(200).json({
      success: true,
      status: 'basic',
      message: 'Server is running (minimal health check)',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    });
  }
});

// --- Debug Routes (DEVELOPMENT ONLY) ---
if (!isProduction) {
  // Debug page for auth testing
  app.get('/debug', (req, res) => {
    logger.info('Serving debug page');
    // HTML serving code from original remains here
    const debugHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Auth Debug</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .button { background: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
            .result { background: #f1f1f1; padding: 10px; margin-top: 10px; white-space: pre-wrap; word-wrap: break-word; }
            input { padding: 8px; margin: 5px 0; display: block; width: 100%; box-sizing: border-box; }
        </style>
    </head>
    <body>
        <h1>SwanStudios Auth Debug</h1>
        <!-- Rest of your debug HTML content -->
        <div>
            <h2>1. Basic Endpoints</h2>
            <button class="button" onclick="testEndpoint('/health')">Test Health</button>
            <button class="button" onclick="testEndpoint('/api/debug/auth-check')">Test Auth Check</button>
            <div id="debugResult" class="result">Results will appear here...</div>
        </div>
        <div>
            <h2>2. User Operations</h2>
            <button class="button" onclick="testEndpoint('/api/debug/create-test-user')">Create Test User</button>
            <div id="userResult" class="result">Results will appear here...</div>
        </div>
        <div>
            <h2>3. Check User</h2>
            <input type="text" id="checkUsername" placeholder="Username">
            <button class="button" onclick="checkUser()">Check User</button>
            <div id="checkResult" class="result">Results will appear here...</div>
        </div>
        <div>
            <h2>4. Verify Password</h2>
            <input type="text" id="verifyUsername" placeholder="Username">
            <input type="password" id="verifyPassword" placeholder="Password">
            <button class="button" onclick="verifyPassword()">Verify Password</button>
            <div id="verifyResult" class="result">Results will appear here...</div>
        </div>
        <div>
            <h2>5. Debug Info</h2>
            <button class="button" onclick="showEnvironment()">Show Environment</button>
            <div id="environmentResult" class="result">Results will appear here...</div>
        </div>
        <div>
            <h2>6. Login</h2>
            <input type="text" id="username" placeholder="Username">
            <input type="password" id="password" placeholder="Password">
            <button class="button" onclick="testLogin()">Test Login</button>
            <div id="loginResult" class="result">Results will appear here...</div>
        </div>
        <div>
            <h2>7. Register</h2>
            <input type="text" id="regUsername" placeholder="Username">
            <input type="text" id="regEmail" placeholder="Email">
            <input type="password" id="regPassword" placeholder="Password">
            <input type="text" id="regFirstName" placeholder="First Name">
            <input type="text" id="regLastName" placeholder="Last Name">
            <button class="button" onclick="testRegister()">Test Register</button>
            <div id="registerResult" class="result">Results will appear here...</div>
        </div>
        <script>
            // Your debug page JavaScript remains the same...
            async function testEndpoint(endpoint) {
                const resultId = endpoint.includes('create-test-user') ? 'userResult' : 'debugResult';
                document.getElementById(resultId).textContent = 'Testing...';
                try {
                    const response = await fetch(endpoint);
                    const data = await response.json();
                    document.getElementById(resultId).textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                    document.getElementById(resultId).textContent = 'Error: ' + error.message;
                }
            }
            async function checkUser() {
                document.getElementById('checkResult').textContent = 'Checking user...';
                const username = document.getElementById('checkUsername').value;
                if (!username) {
                    document.getElementById('checkResult').textContent = 'Please enter a username';
                    return;
                }
                try {
                    const response = await fetch('/api/debug/check-user', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ username })
                    });
                    const data = await response.json();
                    document.getElementById('checkResult').textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                    document.getElementById('checkResult').textContent = 'Error: ' + error.message;
                }
            }
            async function verifyPassword() {
                document.getElementById('verifyResult').textContent = 'Verifying password...';
                const username = document.getElementById('verifyUsername').value;
                const password = document.getElementById('verifyPassword').value;
                if (!username || !password) {
                    document.getElementById('verifyResult').textContent = 'Please enter both username and password';
                    return;
                }
                try {
                    const response = await fetch('/api/debug/verify-password', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ username, password })
                    });
                    const data = await response.json();
                    document.getElementById('verifyResult').textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                    document.getElementById('verifyResult').textContent = 'Error: ' + error.message;
                }
            }
            function showEnvironment() {
                document.getElementById('environmentResult').textContent =
                    'Browser: ' + navigator.userAgent + '\\n' +
                    'URL: ' + window.location.href + '\\n' +
                    'Time: ' + new Date().toISOString();
            }
            async function testLogin() {
                document.getElementById('loginResult').textContent = 'Testing login...';
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                if (!username || !password) {
                    document.getElementById('loginResult').textContent = 'Please enter both username and password';
                    return;
                }
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ username, password })
                    });
                    const data = await response.json();
                    document.getElementById('loginResult').textContent =
                        'Status: ' + response.status + ' ' + response.statusText + '\\n' +
                        JSON.stringify(data, null, 2);
                } catch (error) {
                    document.getElementById('loginResult').textContent = 'Error: ' + error.message;
                }
            }
            async function testRegister() {
                document.getElementById('registerResult').textContent = 'Testing registration...';
                const username = document.getElementById('regUsername').value;
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPassword').value;
                const firstName = document.getElementById('regFirstName').value;
                const lastName = document.getElementById('regLastName').value;
                if (!username || !email || !password || !firstName || !lastName) {
                    document.getElementById('registerResult').textContent = 'Please fill in all fields';
                    return;
                }
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ username, email, password, firstName, lastName })
                    });
                    const data = await response.json();
                    document.getElementById('registerResult').textContent =
                        'Status: ' + response.status + ' ' + response.statusText + '\\n' +
                        JSON.stringify(data, null, 2);
                } catch (error) {
                    document.getElementById('registerResult').textContent = 'Error: ' + error.message;
                }
            }
        </script>
    </body>
    </html>
    `;
    res.status(200).send(debugHtml);
  });

  // --- API Debug Routes (DEVELOPMENT ONLY) ---
  app.get('/api/debug/auth-check', (req, res) => {
    logger.info(`Auth check endpoint called from ${req.ip}`);
    res.status(200).json({
      success: true,
      message: 'Auth routes are accessible',
      headers: req.headers, // Be cautious about logging headers in prod
      timestamp: new Date().toISOString()
    });
  });
}

// --- Apply API Routes ---
// All application API routes are prefixed with /api
// Mount health routes at /api/health for detailed health info
app.use('/api/health', healthRoutes);
app.use('/api/mcp', mcpRoutes);  // Add MCP integration routes
app.use('/api/ai-monitoring', aiMonitoringRoutes);  // Add AI monitoring routes
app.use('/api/master-prompt', masterPromptRoutes);  // Add Master Prompt v26 routes
app.use('/api/dashboard', dashboardRoutes);  // Add dashboard routes
app.use('/api/dashboard', dashboardStatsRoutes);  // Add dashboard stats routes
app.use('/api/notifications', notificationsApiRoutes);  // Add notifications API routes
app.use('/api/migrations', migrationRoutes);  // Add migration routes
app.use('/api/auth', authRoutes);
// Mount profile routes
app.use('/api/profile', profileRoutes);
app.use('/api/auth', userManagementRoutes); // User management routes (admin functions)
app.use('/api/sessions', sessionRoutes);
app.use('/api/session-packages', sessionPackageRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/orientation', orientationRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/food-scanner', foodScannerRoutes);
app.use('/webhooks/stripe', stripeWebhookRouter);
app.use('/api/messages', messagesRoutes);
app.use('/api/schedule', enhancedScheduleRoutes);
app.use('/api/sessions', enhancedScheduleRoutes);  // Add an alias route that matches frontend expectations
// Ensure schedule endpoint is available with user ID filtering
app.get('/api/schedule', (req, res) => {
  // Redirect to enhanced schedule routes with proper parameters
  const { userId, includeUpcoming } = req.query;
  if (userId) {
    res.json({
      success: true,
      sessions: [
        {
          id: '1',
          title: 'Personal Training Session',
          start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          status: 'booked',
          userId: userId,
          trainerId: 'trainer1',
          location: 'Gym A',
          duration: 60
        },
        {
          id: '2',
          title: 'Consultation',
          start: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() + 73 * 60 * 60 * 1000).toISOString(),
          status: 'confirmed',
          userId: userId,
          trainerId: 'trainer1',
          location: 'Studio B',
          duration: 60
        }
      ]
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'User ID required'
    });
  }
});
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminDebugRoutes); // Add admin debugging routes for data synchronization
app.use('/api/admin', adminClientRoutes); // Add enhanced admin client management routes
app.use('/api/admin/storefront', adminPackageRoutes); // Add admin package management routes
app.use('/api/debug', debugRoutes);  // Added debug routes
// Add NASM protocol routes
app.use('/api/client-progress', clientProgressRoutes);
app.use('/api/exercises', exerciseRoutes);
// Add gamification routes
app.use('/api/gamification', gamificationRoutes);
app.use('/api/gamification', gamificationApiRoutes);  // Add gamification API routes
// Add social features routes
app.use('/api/social', socialRoutes);
// Add role management routes
app.use('/api/roles', roleRoutes);
// Add workout routes
app.use('/api/workout', workoutRoutes);
// Add development routes (only enabled in development mode)
app.use('/api/dev', devRoutes);
app.use('/api/workout/plans', workoutPlanRoutes);
app.use('/api/workout/sessions', workoutSessionRoutes);
app.use('/api', apiRoutes); // General API routes, ensure no overlap

// --- Error Handling ---

// Apply custom error handling middleware (imported or fallback)
// This should come *after* all routes
if (errorMiddlewareHandler) {
  app.use(errorMiddlewareHandler);
}

// Function to handle uncaught errors
const handleServerError = (error, req, res, next) => {
  logger.error(`Unhandled error: ${error.message}`, { stack: error.stack });
  
  // In production, don't expose error details to clients
  const errorResponse = {
    success: false,
    message: isProduction 
      ? 'An unexpected error occurred. Our team has been notified.' 
      : error.message || 'An unexpected error occurred',
  };
  
  // Only include error details in development
  if (!isProduction) {
    errorResponse.error = error.stack;
  }
  
  res.status(error.status || 500).json(errorResponse);
};

// Global error handler (catches errors not handled by specific middleware)
app.use(handleServerError);

// Catch-all route handler for undefined routes (404)
// This should be the *last* middleware/route handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.path} (${req.method})`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// --- Server Initialization ---
(async () => {
  try {
    // Check Redis availability if enabled
    const redisCheck = await checkRedisAvailability();
    logger.info(`Redis availability check: ${redisCheck.reason}`);
    
    // Create required directories
    await createRequiredDirectories();
    
    // Set up model associations
    await setupAssociations(); // Ensure this runs before sync/authenticate if needed

    // Test database connections based on mode
    try {
      await sequelize.authenticate();
      logger.info('PostgreSQL database connection established successfully');
    } catch (sequelizeError) {
      logger.error(`PostgreSQL connection error: ${sequelizeError.message}`);
      if (USE_SQLITE_FALLBACK) {
        logger.info('Using SQLite fallback as configured');
      }
    }
    
    // Connect to MongoDB for workout tracking if not using SQLite fallback
    try {
      const mongoResult = await connectToMongoDB();
      if (mongoResult.db) {
        logger.info('MongoDB connection established successfully');
      } else if (USE_SQLITE_FALLBACK) {
        logger.info('MongoDB connection skipped. Using SQLite fallback as configured.');
      } else {
        logger.warn('MongoDB connection failed but continuing with other databases');
      }
    } catch (mongoError) {
      logger.error(`MongoDB connection error: ${mongoError.message}`);
      logger.info('Continuing with other databases');
    }

    // In development, optionally sync database schema (NEVER in production)
    if (!isProduction && process.env.AUTO_SYNC === 'true') {
      try {
        await sequelize.sync({ alter: true }); 
        logger.info('Database synchronized in development mode');
      } catch (syncError) {
        logger.error(`Error syncing database: ${syncError.message}`);
      }
    }

    // Run startup migrations to ensure database schema is up to date
    try {
      await runStartupMigrations();
    } catch (migrationError) {
      logger.warn('Startup migrations had issues (non-critical):', migrationError.message);
    }

    // Seed storefront items (training packages) if they don't exist
    try {
      logger.info('Checking storefront items seeding...');
      const seedResult = await seedStorefrontItems();
      
      if (seedResult.seeded) {
        logger.info(`✅ Storefront seeding completed: ${seedResult.count} items created (${seedResult.reason})`);
      } else {
        logger.info(`ℹ️  Storefront seeding skipped: ${seedResult.reason} (${seedResult.count} existing items)`);
      }
      
      if (seedResult.error) {
        logger.warn(`⚠️  Seeding had non-critical error: ${seedResult.error}`);
      }
    } catch (seedError) {
      logger.error(`❌ Storefront seeding failed: ${seedError.message}`);
      logger.info('🚀 Continuing server startup - packages available via hardcoded data or admin management');
      // Don't fail server startup if seeding fails
    }

    // Create HTTP server instance
    const httpServer = http.createServer(app);
    
    // Initialize Socket.io with the HTTP server
    const io = initSocketIO(httpServer);
    if (io) {
      logger.info('Socket.io initialized successfully for real-time notifications');
    } else {
      logger.warn('Failed to initialize Socket.io. Real-time notifications will not be available.');
    }
    
    // Start the server
    const server = httpServer.listen(PORT, () => {
      console.log(`Server running in ${isProduction ? 'PRODUCTION' : 'development'} mode on port ${PORT}`);
      console.log(`Server port available at: http://localhost:${PORT}/`);
      logger.info(`Server running in ${isProduction ? 'PRODUCTION' : 'development'} mode on port ${PORT}`);
      logger.info(`Server started at: ${new Date().toISOString()}`);
    });

    // Add a timeout to the server to handle stalled requests
    server.timeout = 60000; // 60 seconds
    
    // Handle graceful shutdown (important for Render)
    const gracefulShutdown = async (signal) => {
      logger.warn(`Received ${signal}. Shutting down gracefully...`);
      
      // Set a timeout for ungraceful termination (30 seconds)
      const forceExitTimeout = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
      
      try {
        // First close the HTTP server
        await new Promise((resolve, reject) => {
          server.close((err) => {
            if (err) {
              logger.error(`Error closing HTTP server: ${err.message}`);
              reject(err);
            } else {
              logger.info('HTTP server closed.');
              resolve();
            }
          });
        });
        
        // Close Socket.io connections
        closeSocketIO();
        logger.info('Socket.io connections closed.');
        
        // Close MongoDB connection if it exists
        if (typeof closeMongoDBConnection === 'function') {
          try {
            await closeMongoDBConnection();
            logger.info('MongoDB connection closed.');
          } catch (mongoErr) {
            logger.error(`Error closing MongoDB connection: ${mongoErr.message}`);
          }
        }
        
        // Close Sequelize connection
        await sequelize.close();
        logger.info('PostgreSQL connection closed.');
        
        // Clear the force exit timeout as we're exiting cleanly
        clearTimeout(forceExitTimeout);
        logger.info('Graceful shutdown completed successfully.');
        process.exit(0); // Exit successfully
      } catch (error) {
        logger.error(`Error during graceful shutdown: ${error.message}`);
        clearTimeout(forceExitTimeout);
        process.exit(1); // Exit with error
      }
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error(`Server initialization error: ${error.message}`, { stack: error.stack });
    console.error('Unable to start server:', error);
    process.exit(1); // Exit if server fails to start
  }
})();

/**
 * Create required directories for file uploads
 */
async function createRequiredDirectories() {
  const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/profiles'),
    path.join(__dirname, 'uploads/products'),
    path.join(__dirname, 'uploads/temp'),
    path.join(__dirname, 'data') // For SQLite database
  ];
  
  for (const dir of directories) {
    if (!existsSync(dir)) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      } catch (error) {
        logger.error(`Error creating directory ${dir}:`, error);
        throw error; // Rethrow to halt server startup
      }
    }
  }
}

// --- Global Error Handlers ---

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection at:', { promise, reason: reason?.stack || reason });
  console.error('Unhandled Promise Rejection:', reason);
  // In production, these should be treated as critical errors
  if (isProduction) {
    console.error('Critical: Unhandled rejection in production. Server will shut down for safety.');
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err, origin) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack, origin });
  console.error('Uncaught Exception:', err);
  // In production, uncaught exceptions should always terminate the process
  if (isProduction) {
    console.error('Critical: Uncaught exception in production. Server will shut down for safety.');
    process.exit(1);
  }
});

export default app;

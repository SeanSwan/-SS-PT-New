/**
 * Swan Studios - Main Server
 * =========================
 * This is the entry point for the backend server.
 * It configures Express, routes, and middlewares.
 */

// IMPORTANT: Load environment variables before any other imports
// This ensures process.env is populated before other modules access it
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');

// Load the .env file from the project root directory
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`[Server] Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`[Server] Warning: .env file not found at ${envPath}. This is normal in production environments.`);
  console.warn('[Server] Environment variables should be set in the Render dashboard for production.');
  dotenv.config(); // Try default location as a last resort
}

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Log basic environment info (without sensitive values)
console.log(`[Server] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`[Server] Database: ${isProduction ? 'RENDER POSTGRES (via DATABASE_URL)' : (process.env.PG_DB || 'swanstudios')}`);
if (!isProduction) {
  console.log(`[Server] Database Host: ${process.env.PG_HOST || 'localhost'}`);
}

// Now import other dependencies after environment variables are loaded
import express from 'express';
import cors from 'cors';
import compression from 'compression'; // For production performance
import helmet from 'helmet'; // For security headers
import { checkApiKeys } from './utils/apiKeyChecker.mjs';
import authRoutes from './routes/authRoutes.mjs';
import sessionRoutes from './routes/sessionRoutes.mjs';
import cartRoutes from './routes/cartRoutes.mjs';
import storefrontRoutes from './routes/storeFrontRoutes.mjs';
import contactRoutes from './routes/contactRoutes.mjs';
import orientationRoutes from './routes/orientationRoutes.mjs';
import checkoutRoutes from './routes/checkoutRoutes.mjs';
import messagesRoutes from './routes/messages.mjs';
import scheduleRoutes from './routes/scheduleRoutes.mjs';
import adminRoutes from './routes/adminRoutes.mjs';
import apiRoutes from './routes/api.mjs';
import debugRoutes from './routes/debug.mjs';  // Import debug routes
import logger from './utils/logger.mjs';
import requestLogger from './middleware/debugMiddleware.mjs';
import sequelize from './database.mjs';
import setupAssociations from './setupAssociations.mjs';

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
const PORT = process.env.PORT || 5000; // Render sets the PORT env var

// Apply security headers in production
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for some admin features
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://cdn.example.com"], // Adjust as needed
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
  : ['http://localhost:5173', 'https://sswanstudios.com']; // Ensure your prod domain is here

// In production, use stricter CORS policies
const corsOptions = {
  origin: function (origin, callback) {
    // In development, we're more permissive
    if (!isProduction) {
      // Allow requests with no origin (like mobile apps, curl, Postman)
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
    }
    
    // In production, strict origin matching
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      // Origin is NOT in the whitelist and is present
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
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
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
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

  app.post('/api/debug/verify-password', express.json(), async (req, res) => {
    try {
      const { username, password } = req.body;
      logger.info(`Password verification attempt for user: ${username}`);
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
      }
      const { default: User } = await import('./models/User.mjs');
      const bcrypt = await import('bcryptjs');
      const user = await User.findOne({ where: { username } });
      if (!user) {
        logger.info(`User not found: ${username}`);
        return res.status(400).json({ success: false, message: 'User not found' });
      }
      logger.info(`Comparing passwords for user: ${username}`);
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.info(`Password mismatch for user: ${username}`);
        return res.status(400).json({ success: false, message: 'Password incorrect' });
      }
      logger.info(`Password verified for user: ${username}`);
      res.status(200).json({success: true, message: 'Password verified successfully'});
    } catch (error) {
      logger.error(`Password verification error: ${error.message}`, { stack: error.stack });
      res.status(500).json({ success: false, message: 'Error verifying password', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
    }
  });

  app.post('/api/debug/check-user', express.json(), async (req, res) => {
    try {
      const { username } = req.body;
      logger.info(`User check for username: ${username}`);
      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }
      const { default: User } = await import('./models/User.mjs');
      const user = await User.findOne({ where: { username }, attributes: ['id', 'username', 'email', 'role', 'createdAt'] });
      if (!user) {
        logger.info(`User not found: ${username}`);
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      logger.info(`User found: ${username}`);
      res.status(200).json({ success: true, message: 'User found', user });
    } catch (error) {
      logger.error(`User check error: ${error.message}`, { stack: error.stack });
      res.status(500).json({ success: false, message: 'Error checking user', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
    }
  });

  app.get('/api/debug/create-test-user', async (req, res) => {
    try {
      logger.info('Creating test user');
      const { default: User } = await import('./models/User.mjs');
      const bcrypt = await import('bcryptjs');
      const existingUser = await User.findOne({ where: { username: 'testuser' } });
      if (existingUser) {
        logger.info('Test user already exists');
        return res.status(200).json({ success: true, message: 'Test user already exists', user: { id: existingUser.id, username: existingUser.username, email: existingUser.email, role: existingUser.role }});
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      const testUser = await User.create({ username: 'testuser', email: 'test@example.com', password: hashedPassword, firstName: 'Test', lastName: 'User', role: 'client' });
      logger.info('Test user created successfully');
      res.status(201).json({ success: true, message: 'Test user created successfully', user: { id: testUser.id, username: testUser.username, email: testUser.email, role: testUser.role }});
    } catch (error) {
      logger.error(`Create test user error: ${error.message}`, { stack: error.stack });
      res.status(500).json({ success: false, message: 'Error creating test user', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
    }
  });
}

// --- Apply API Routes ---
// All application API routes are prefixed with /api
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/orientation', orientationRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/debug', debugRoutes);  // Added debug routes
app.use('/api', apiRoutes); // General API routes, ensure no overlap

// --- Error Handling ---

// Apply custom error handling middleware (imported or fallback)
// This should come *after* all routes
if (errorMiddlewareHandler) {
  app.use(errorMiddlewareHandler);
}

// Global error handler (catches errors not handled by specific middleware)
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  
  // In production, don't expose error details to clients
  const errorResponse = {
    success: false,
    message: isProduction 
      ? 'An unexpected error occurred. Our team has been notified.' 
      : err.message || 'An unexpected error occurred',
  };
  
  // Only include error details in development
  if (!isProduction) {
    errorResponse.error = err.stack;
  }
  
  res.status(err.status || 500).json(errorResponse);
});

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
    // Set up model associations
    setupAssociations(); // Ensure this runs before sync/authenticate if needed

    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // In development, optionally sync database schema (NEVER in production)
    if (!isProduction && process.env.AUTO_SYNC === 'true') {
      await sequelize.sync({ alter: true }); 
      logger.info('Database synchronized in development mode');
    }

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${isProduction ? 'PRODUCTION' : 'development'} mode on port ${PORT}`);
      logger.info(`Server running in ${isProduction ? 'PRODUCTION' : 'development'} mode on port ${PORT}`);
      logger.info(`Server started at: ${new Date().toISOString()}`);
    });

    // Add a timeout to the server to handle stalled requests
    server.timeout = 60000; // 60 seconds
    
    // Handle graceful shutdown (important for Render)
    process.on('SIGTERM', () => {
      logger.warn('Received SIGTERM. Shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        // Close database connection
        sequelize.close().then(() => {
          logger.info('Database connection closed.');
          process.exit(0); // Exit successfully
        }).catch(err => {
          logger.error('Error closing database connection:', err);
          process.exit(1); // Exit with error
        });
      });
      
      // Force shutdown after 30 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    });

  } catch (error) {
    logger.error(`Server initialization error: ${error.message}`, { stack: error.stack });
    console.error('Unable to start server:', error);
    process.exit(1); // Exit if server fails to start
  }
})();

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
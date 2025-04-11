import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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
import logger from './utils/logger.mjs';
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

// Initialize environment variables
dotenv.config();

// Set up __dirname equivalent in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Define allowed origins based on environment
const whitelist = process.env.FRONTEND_ORIGINS 
  ? process.env.FRONTEND_ORIGINS.split(',') 
  : ['http://localhost:5173', 'https://sswanstudios.com', 'https://www.sswanstudios.com'];

// Log allowed origins for debugging
logger.info(`Allowed CORS origins: ${JSON.stringify(whitelist)}`);

// Configure CORS with proper options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin || whitelist.indexOf(origin) !== -1) {
      logger.info(`CORS accepted origin: ${origin || 'No origin'}`);
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      // Allow all origins temporarily for debugging
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply CORS middleware
app.use(cors(corsOptions));

// Special handling for OPTIONS requests
app.options('*', cors(corsOptions));

// Enhanced request logging
app.use((req, res, next) => {
  logger.info(`[REQUEST] ${req.method} ${req.url} from ${req.ip || 'unknown'}`);
  next();
});

// Add response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    logger.info(`[RESPONSE] ${req.method} ${req.url} Status: ${res.statusCode}`);
    return originalSend.call(this, body);
  };
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('SwanStudios API Server is running');
});

// Simple test route
app.get('/test', (req, res) => {
  res.send('Server is running correctly');
});

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info(`Health check from ${req.ip} (${req.headers['user-agent']})`);
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Debug page - directly serve the HTML without file access
app.get('/debug', (req, res) => {
  logger.info('Serving debug page');
  
  const debugHtml = `
  <!DOCTYPE html>
  <html>
  <head>
      <title>Auth Debug</title>
      <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .button { background: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
          .result { background: #f1f1f1; padding: 10px; margin-top: 10px; white-space: pre-wrap; }
          input { padding: 8px; margin: 5px 0; display: block; width: 100%; box-sizing: border-box; }
      </style>
  </head>
  <body>
      <h1>SwanStudios Auth Debug</h1>
      
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
                      headers: {
                          'Content-Type': 'application/json'
                      },
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
                      headers: {
                          'Content-Type': 'application/json'
                      },
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
                      headers: {
                          'Content-Type': 'application/json'
                      },
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
                      headers: {
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ 
                          username, 
                          email, 
                          password, 
                          firstName, 
                          lastName 
                      })
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

// API debug route
app.get('/api/debug/auth-check', (req, res) => {
  logger.info(`Auth check endpoint called from ${req.ip}`);
  res.status(200).json({
    success: true,
    message: 'Auth routes are accessible',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Debug route for password verification
app.post('/api/debug/verify-password', express.json(), async (req, res) => {
  try {
    const { username, password } = req.body;
    logger.info(`Password verification attempt for user: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    // Import User model and bcrypt dynamically to avoid circular dependencies
    const { default: User } = await import('./models/User.mjs');
    const bcrypt = await import('bcryptjs');
    
    // Find user
    const user = await User.findOne({ 
      where: { username } 
    });
    
    if (!user) {
      logger.info(`User not found: ${username}`);
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check password
    logger.info(`Comparing passwords for user: ${username}`);
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      logger.info(`Password mismatch for user: ${username}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Password incorrect' 
      });
    }
    
    logger.info(`Password verified for user: ${username}`);
    res.status(200).json({
      success: true,
      message: 'Password verified successfully'
    });
  } catch (error) {
    logger.error(`Password verification error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error verifying password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Debug route to check user existence
app.post('/api/debug/check-user', express.json(), async (req, res) => {
  try {
    const { username } = req.body;
    logger.info(`User check for username: ${username}`);
    
    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username is required' 
      });
    }
    
    // Import User model dynamically
    const { default: User } = await import('./models/User.mjs');
    
    // Find user
    const user = await User.findOne({ 
      where: { username },
      attributes: ['id', 'username', 'email', 'role', 'createdAt'] // Exclude sensitive data
    });
    
    if (!user) {
      logger.info(`User not found: ${username}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    logger.info(`User found: ${username}`);
    res.status(200).json({
      success: true,
      message: 'User found',
      user
    });
  } catch (error) {
    logger.error(`User check error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error checking user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create a test user for debugging
app.get('/api/debug/create-test-user', async (req, res) => {
  try {
    logger.info('Creating test user');
    
    // Import User model and bcrypt dynamically
    const { default: User } = await import('./models/User.mjs');
    const bcrypt = await import('bcryptjs');
    
    // Check if test user already exists
    const existingUser = await User.findOne({ 
      where: { username: 'testuser' } 
    });
    
    if (existingUser) {
      logger.info('Test user already exists');
      return res.status(200).json({
        success: true,
        message: 'Test user already exists',
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }
    
    // Create salt and hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Create test user
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    });
    
    logger.info('Test user created successfully');
    res.status(201).json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role
      }
    });
  } catch (error) {
    logger.error(`Create test user error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error creating test user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Apply routes
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
app.use('/api', apiRoutes);

// Use the dynamically imported error middleware if available
if (errorMiddlewareHandler) {
  app.use(errorMiddlewareHandler);
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Catch-all route handler for undefined routes
app.use((req, res) => {
  logger.warn(`Route not found: ${req.path} (${req.method})`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Set up database and start server
(async () => {
  try {
    // Set up model associations
    setupAssociations();
    
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.warn('Received SIGTERM. Shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        // Close database connection
        sequelize.close().then(() => {
          logger.info('Database connection closed.');
          process.exit(0);
        });
      });
    });
    
  } catch (error) {
    logger.error(`Server initialization error: ${error.message}`, { stack: error.stack });
    console.error('Unable to start server:', error);
  }
})();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`, { stack: err.stack });
  console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  console.error('Uncaught Exception:', err);
});

export default app;
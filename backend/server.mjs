import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan'; // Logging middleware
import helmet from 'helmet'; // Security headers
import compression from 'compression'; // Response compression
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http'; // For Socket.IO server
import { Server } from 'socket.io'; // For Socket.IO

// Correctly import named exports from errorMiddleware.mjs
import { notFound, errorHandler } from './middleware/errorMiddleware.mjs'; // *** FIXED IMPORT ***
import logger from './utils/logger.mjs';
import sequelize from './database.mjs';
import setupAssociations from './setupAssociations.mjs';

// Route imports
import apiRoutes from './routes/api.mjs'; // General API routes (if any)
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
// Note: debug route import moved below app initialization


// Initialize environment variables
dotenv.config();

// Set up __dirname equivalent in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server using the Express app
const httpServer = createServer(app);

// --- Socket.IO Setup ---
const io = new Server(httpServer, {
  cors: {
    // Consider using the same corsOptions logic as HTTP for consistency
    // For now, keeping '*' as per your code, but stricter is better
    origin: '*', // Or use the whitelist/corsOptions logic
    methods: ['GET', 'POST'], // Socket.IO primarily uses WebSocket, GET/POST relevant for polling fallback
    credentials: true
  }
});

// --- CORS Configuration ---
const whitelist = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(',')
  : ['http://localhost:5173', 'https://sswanstudios.com', 'https://www.sswanstudios.com'];

logger.info(`Allowed CORS origins: ${JSON.stringify(whitelist)}`);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin OR if origin is in whitelist
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      // Changed for stricter behavior: block if not whitelisted
      // callback(null, true); // Your previous permissive setting
      callback(new Error(`Origin ${origin} not allowed by CORS`)); // Stricter
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'], // Added common headers
  credentials: true,
  preflightContinue: false, // Let cors handle OPTIONS
  optionsSuccessStatus: 204 // Standard success for OPTIONS
};

// =================== MIDDLEWARE ===================

// 1. Security Headers (Helmet) - Apply early
// Consider reviewing Helmet defaults if specific policies cause issues
app.use(helmet({
  contentSecurityPolicy: false, // Be cautious disabling this, review if needed
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' } // Allows popups like OAuth
}));

// 2. CORS Middleware - Apply globally
app.use(cors(corsOptions));

// 3. Response Compression
app.use(compression());

// 4. Body Parsers (JSON, URL-encoded)
app.use(express.json({ limit: '50mb' })); // Increased limit, ensure it's necessary
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 5. HTTP Request Logger (Morgan)
app.use(morgan('dev')); // Use 'dev' format or customize as needed

// 6. Custom Request Logger (Optional - Morgan might be sufficient)
// app.use((req, res, next) => {
//   logger.info(`[REQUEST] ${req.method} ${req.url} from ${req.ip}`);
//   next();
// });


// =================== ROUTES ===================

// Health check endpoint
app.get('/health', (req, res) => {
  // logger.info(`Health check from ${req.ip} (${req.headers['user-agent']})`); // Optional logging
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Explicit OPTIONS handler for specific auth routes (can help sometimes)
// This path needs to be specific or use wildcards carefully
// If global cors works, this might be redundant, but keeping as per your code
app.options('/api/auth/*', cors(corsOptions));

// Apply API routes
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
app.use('/api', apiRoutes); // General API routes


// Dynamic import for debug routes (ensure this file exists and exports default)
// Note: This needs to be inside an async function or use top-level await handling
// Moving it inside the main async block below might be cleaner
// For now, assuming it works as intended in your setup
// app.use('/api/debug', (await import('./routes/debug.mjs')).default);


// Serve the test authentication page (if needed)
// app.get('/test-auth', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'test-auth.html'));
// });


// =================== ERROR HANDLING (LAST!) ===================
// Apply 404 handler after all valid routes
app.use(notFound); // *** CORRECTED USAGE ***

// Apply the final global error handler
app.use(errorHandler); // *** CORRECTED USAGE ***

// --- REMOVED Redundant inline error handler ---
// app.use((err, req, res, next) => { ... });


// =================== SERVER & DB INITIALIZATION ===================
(async () => {
  try {
    // Setup model associations
    setupAssociations();
    logger.info('Model associations set up successfully');

    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Start the HTTP server (which includes Socket.IO)
    httpServer.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Socket.io connection handler
    io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);
      // Add your specific socket event listeners here...
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    // Apply debug route if needed (safer inside async block)
    try {
         const debugRoutes = await import('./routes/debug.mjs');
         app.use('/api/debug', debugRoutes.default);
         logger.info('Debug routes applied.');
    } catch(debugImportError) {
         logger.warn('Could not load debug routes.', { error: debugImportError.message });
    }


  } catch (error) {
    logger.error(`Server initialization error: ${error.message}`, { stack: error.stack });
    process.exit(1); // Exit if initialization fails
  }
})();

// =================== PROCESS EVENT HANDLERS ===================
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  // Log the reason which might be an Error object or something else
  logger.error('Unhandled Promise Rejection:', { reason });
  // Consider exiting process depending on severity? process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err, origin) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack, origin: origin });
  // It's generally recommended to exit gracefully after an uncaught exception
  // as the application state might be corrupted.
  process.exit(1);
});

// Graceful shutdown logic (ensure httpServer.close is called)
const gracefulShutdown = (signal) => {
    logger.warn(`Received ${signal}. Shutting down gracefully...`);
    io.close(() => { // Close Socket.IO connections first
        logger.info('Socket.IO server closed.');
        httpServer.close(() => { // Then close HTTP server
            logger.info('HTTP server closed.');
            sequelize.close().then(() => { // Then close DB connection
                logger.info('Database connection closed.');
                process.exit(0); // Exit cleanly
            }).catch(dbErr => {
                logger.error('Error closing database connection:', dbErr);
                process.exit(1);
            });
        });
    });

    // Force shutdown after timeout
    setTimeout(() => {
        logger.error('Graceful shutdown timed out, forcing exit.');
        process.exit(1);
    }, 10000); // 10 second timeout
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


export default app; // Export app for potential testing
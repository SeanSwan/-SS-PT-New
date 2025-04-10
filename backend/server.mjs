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
import { notFound, errorHandler } from './middleware/errorMiddleware.mjs';
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
// debugRoutes will be imported dynamically

// Initialize environment variables
dotenv.config();

// Set up __dirname equivalent in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000; // Use Render's PORT or 5000 locally

// Create HTTP server using the Express app
const httpServer = createServer(app);

// --- CORS Configuration ---
const whitelist = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(',')
  : ['http://localhost:5173', 'https://sswanstudios.com', 'https://www.sswanstudios.com']; // Add all valid frontend origins

logger.info(`Allowed HTTP CORS origins: ${JSON.stringify(whitelist)}`);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin OR if origin is in whitelist
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`HTTP CORS blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`)); // Block non-whitelisted origins
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  preflightContinue: false, // Let cors handle OPTIONS response implicitly
  optionsSuccessStatus: 204 // Standard success for OPTIONS
};

// --- Socket.IO Setup ---
const io = new Server(httpServer, {
  cors: corsOptions // Use the same strict CORS options for Socket.IO
});


// =================== MIDDLEWARE ORDERING ===================

// 1. Security Headers (Helmet) - Apply early
app.use(helmet({
  contentSecurityPolicy: false, // Adjust if needed, disabling is less secure
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// 2. Global CORS Middleware - Apply globally
app.use(cors(corsOptions));

// 3. Response Compression
app.use(compression());

// 4. Body Parsers (JSON, URL-encoded)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 5. HTTP Request Logger (Morgan)
app.use(morgan('dev')); // Logs requests to console

// 6. Static File Serving (for debug.html)
// Serve files from the 'backend/public' directory
app.use(express.static(path.join(__dirname, 'public')));


// =================== ROUTES ===================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Debug HTML Page Route
app.get('/debug', (req, res, next) => {
  const debugHtmlPath = path.join(__dirname, 'public', 'debug.html');
  logger.info(`Attempting to serve debug page from: ${debugHtmlPath}`);
  res.sendFile(debugHtmlPath, (err) => {
       if (err) {
           logger.error(`Error sending debug.html: ${err.message}`);
           // Pass to error handler if file not found or other error
           next(err); // Use next(err) to trigger the main errorHandler
       }
  });
});

// Explicit OPTIONS handler for auth routes (kept for robustness, might be redundant with proxy)
app.options('/api/auth/*', cors(corsOptions));

// Apply Regular API routes
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


// =================== ERROR HANDLING (MUST BE LAST!) ===================
// Apply 404 handler after all valid routes
app.use(notFound);

// Apply the final global error handler
app.use(errorHandler);


// =================== SERVER & DB INITIALIZATION ===================
(async () => {
  try {
    // Setup model associations
    setupAssociations();
    logger.info('Model associations set up successfully');

    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Dynamically apply debug routes (safer inside async block)
    try {
         const debugRoutes = await import('./routes/debug.mjs');
         app.use('/api/debug', debugRoutes.default);
         logger.info('Debug API routes applied (/api/debug).');
    } catch(debugImportError) {
         logger.warn('Could not load debug routes (/api/debug).', { error: debugImportError.message });
    }

    // Start the HTTP server (which includes Socket.IO)
    httpServer.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      // Determine the correct base URL for logging the debug page link
      const serverHostname = process.env.RENDER_EXTERNAL_HOSTNAME || `localhost:${PORT}`;
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      logger.info(`Access Debug Page at: ${protocol}://${serverHostname}/debug`);
    });

    // Socket.io connection handler
    io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id} from origin ${socket.handshake.headers.origin}`);
      // Add your specific socket event listeners here...
      socket.on('disconnect', (reason) => {
        logger.info(`Socket disconnected: ${socket.id}`, { reason });
      });
    });

  } catch (error) {
    logger.error(`Server initialization error: ${error.message}`, { stack: error.stack });
    process.exit(1); // Exit if initialization fails
  }
})();

// =================== PROCESS EVENT HANDLERS ===================
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason });
});
process.on('uncaughtException', (err, origin) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack, origin: origin });
  process.exit(1); // Exit on uncaught exceptions
});

const gracefulShutdown = (signal) => {
    logger.warn(`Received ${signal}. Shutting down gracefully...`);
    io.close(() => {
        logger.info('Socket.IO server closed.');
        httpServer.close(() => {
            logger.info('HTTP server closed.');
            sequelize.close().then(() => {
                logger.info('Database connection closed.');
                process.exit(0);
            }).catch(dbErr => {
                logger.error('Error closing database connection:', dbErr);
                process.exit(1);
            });
        });
    });
    // Force shutdown after timeout
    setTimeout(() => { logger.error('Graceful shutdown timed out, forcing exit.'); process.exit(1); }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
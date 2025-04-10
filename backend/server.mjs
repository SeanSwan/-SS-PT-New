import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.mjs';
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
import errorMiddleware from './middleware/errorMiddleware.mjs';
import logger from './utils/logger.mjs';
import sequelize from './database.mjs';
import setupAssociations from './setupAssociations.mjs';
import { createServer } from 'http';
import { Server } from 'socket.io';

app.use('/api/debug', (await import('./routes/debug.mjs')).default);

// Serve the test authentication page
app.get('/test-auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-auth.html'));
});

// Initialize environment variables
dotenv.config();

// Set up __dirname equivalent in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// Determine allowed origins based on environment
const whitelist = process.env.FRONTEND_ORIGINS 
  ? process.env.FRONTEND_ORIGINS.split(',') 
  : ['http://localhost:5173', 'https://sswanstudios.com', 'https://www.sswanstudios.com'];

// Debugging - log allowed origins
logger.info(`Allowed CORS origins: ${JSON.stringify(whitelist)}`);

// Configure CORS with proper options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, true); // Allow all origins for now, but log warning
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Enhanced Request Logging
app.use(morgan(':remote-addr :method :url :status :response-time ms - :res[content-length]'));

// Add explicit middleware to log all requests
app.use((req, res, next) => {
  logger.info(`[REQUEST] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Apply security headers with careful configuration
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// Set up other middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply CORS middleware
app.use(cors(corsOptions));

// Add explicit OPTIONS handler for authentication routes
app.options('/api/auth/*', cors(corsOptions));

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

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info(`Health check from ${req.ip} (${req.headers['user-agent']})`);
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Error handling middleware
app.use(errorMiddleware);

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
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
    httpServer.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
    
    // Socket.io connection handler
    io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  } catch (error) {
    logger.error(`Server initialization error: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
})();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`, { stack: err.stack });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

export default app;
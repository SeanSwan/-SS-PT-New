/**
 * Swan Studios - API Server
 * ========================
 * Main server file for the Swan Studios backend API.
 * Handles route setup, middleware configuration, database connection,
 * and Socket.IO integration.
 */

import express from "express";
import cors from "cors"; // Standard CORS package
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import sequelize from "./database.mjs";
import setupAssociations from "./setupAssociations.mjs";
import logger from './utils/logger.mjs'; // Import logger

// Route imports
import authRoutes from "./routes/authRoutes.mjs";
import storefrontRoutes from "./routes/storeFrontRoutes.mjs";
import orientationRoutes from "./routes/orientationRoutes.mjs";
import cartRoutes from "./routes/cartRoutes.mjs";
import sessionRoutes from "./routes/sessionRoutes.mjs";
import checkoutRoutes from "./routes/checkoutRoutes.mjs";
import scheduleRoutes from "./routes/scheduleRoutes.mjs";
import contactRoutes from "./routes/contactRoutes.mjs";

// Middleware imports
import { errorHandler, notFound } from './middleware/errorMiddleware.mjs';

// Load environment variables
dotenv.config();

// Initialize Express application and HTTP server
const app = express();
const server = http.createServer(app);

// Determine port based on environment
const port = process.env.NODE_ENV === 'production'
  ? (process.env.PORT || 10000) // Render provides PORT
  : (process.env.BACKEND_PORT || 5000); // Local dev port

// --- Allowed Origins Setup ---
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://sswanstudios.com',
      'https://www.sswanstudios.com',
      // Add other relevant production frontend/service URLs if needed
    ]
  : process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:5174"]; // Default dev origins

logger.info('Allowed origins list (for CORS & Socket.IO):', { origins: allowedOrigins });

// --- CORS Configuration ---
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) { // Allow requests with no origin (health checks, curl, etc.)
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) { // Check against allowed list
      callback(null, true);
    } else {
      logger.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 204
};

// =================== MIDDLEWARE ORDERING IS CRITICAL ===================

// *** UNCONVENTIONAL ORDERING FOR DIAGNOSTICS ***

// 1. Explicit OPTIONS Handler for Login (with logging) - TRYING THIS FIRST
// Ensure preflight requests for login are handled correctly using our CORS config
app.options('/api/auth/login', (req, res, next) => {
  // Log that this specific handler was hit and the origin
  console.log(`>>> DIAGNOSTIC: Explicit OPTIONS /api/auth/login handler reached. Origin: ${req.headers.origin}`);
  logger.info(`>>> DIAGNOSTIC: Explicit OPTIONS /api/auth/login handler reached`, { origin: req.headers.origin });

  // Now, call the actual cors middleware configured with our options
  // This function will handle validating the origin and sending the response headers
  cors(corsOptions)(req, res, next);

  // Log after to see if it completed execution within this handler.
  console.log(`<<< DIAGNOSTIC: Explicit OPTIONS /api/auth/login handler finished processing.`);
  logger.info(`<<< DIAGNOSTIC: Explicit OPTIONS /api/auth/login handler finished processing`, { origin: req.headers.origin, statusAfterCors: res.statusCode });

});

// 2. Global CORS Middleware - Apply globally AFTER the specific OPTIONS handler
app.use(cors(corsOptions));

// 3. Specific Raw Body Parsing (e.g., Stripe Webhooks)
app.use('/api/cart/webhook', express.raw({ type: 'application/json' }));

// 4. Standard Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    if (!(req.path === '/' && res.statusCode < 400) && !(req.path === '/health' && res.statusCode < 400)) {
         logger.log(logLevel, `← ${res.statusCode} ${req.method} ${req.originalUrl}`, { durationMs: duration });
    }
  });
  next();
});

// 6. Basic Health Check & Root Route Handlers
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Swan Studios API is running' });
});
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS check successful from backend (standard config).',
    origin: req.headers.origin || 'unknown',
    timestamp: new Date().toISOString()
  });
});


// 7. API Routes
app.use("/api/auth", authRoutes); // Mount the router containing POST /api/auth/login etc.
app.use("/api/storefront", storefrontRoutes);
app.use("/api/orientation", orientationRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/contact", contactRoutes);

// 8. Error Handling Middleware (LAST)
app.use(notFound); // Catches 404s for any routes not matched above
app.use(errorHandler); // General error handler

// ================== SOCKET.IO SETUP ==================
export const io = new Server(server, {
  cors: corsOptions,
});

// Socket event handlers... (Keep your existing logic here)
io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`, { address: socket.handshake.address, origin: socket.handshake.headers.origin });
  socket.on("disconnect", (reason) => { logger.info(`Socket disconnected: ${socket.id}`, { reason }); });
  socket.on("join_schedule_room", (userId) => { socket.join(`schedule_${userId}`); logger.info(`Socket ${socket.id} joined schedule room`, { userId }); });
  socket.on("leave_schedule_room", (userId) => { socket.leave(`schedule_${userId}`); logger.info(`Socket ${socket.id} left schedule room`, { userId }); });
  socket.on("session_updated", (data) => { const userId = data?.userId; if (userId) { io.to(`schedule_${userId}`).emit('session_update_notification', data); logger.info(`Broadcasting session update`, { targetRoom: `schedule_${userId}` }); } else { logger.warn('Received session_updated event without userId'); } });
  socket.on("join_cart_room", (userId) => { socket.join(`cart_${userId}`); logger.info(`Socket ${socket.id} joined cart room`, { userId }); });
  socket.on("cart_updated", (data) => { const userId = data?.userId; if (userId) { io.to(`cart_${userId}`).emit('cart_update_notification', data); logger.info(`Broadcasting cart update`, { targetRoom: `cart_${userId}` }); } else { logger.warn('Received cart_updated event without userId'); } });
  socket.on('error', (error) => { logger.error(`Socket error on ${socket.id}:`, { error: error.message }); });
});


// ================== DB & SEEDING FUNCTIONS (Placeholder) ==================
const seedStorefrontItems = async () => { try { /*...*/ } catch (error) { logger.error('Error seeding storefront items:', error); throw error; }};
const seedDatabase = async () => { try { /*...*/ } catch (error) { logger.error('Error seeding database:', error); throw error; }};


// ================== DATABASE SYNC & SERVER START ==================
const startServer = async () => {
  try {
    setupAssociations();
    logger.info('Model associations set up successfully');
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Database Sync Logic
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Development mode: Syncing database schema...');
      try {
        await sequelize.sync({ alter: false });
        logger.info('Database synchronized successfully (DEV mode)');
        await seedDatabase();
      } catch (syncError) {
        logger.error('Error during DEV database sync/seed:', syncError);
        logger.warn('Attempting startup despite sync/seed error...');
      }
    } else {
      logger.info('Production mode: Skipping schema sync.');
    }

    // Start HTTP server
    server.listen(port, () => {
      console.log('\n==================================================');
      logger.info(`✅ Swan Studios API Server running on port ${port}`);
      logger.info(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('==================================================\n');
    });
  } catch (error) {
    logger.error('❌ FATAL: Error starting server:', error);
    process.exit(1);
  }
};

// ================== GRACEFUL SHUTDOWN ==================
const shutdown = async (signal) => {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);
  try {
    server.close(async (err) => {
      if (err) logger.error('Error closing HTTP server:', err);
      else logger.info('HTTP server closed.');

      io.close((socketErr) => {
        if (socketErr) logger.error('Error closing Socket.IO server:', socketErr);
        else logger.info('Socket.IO server closed.');

        sequelize.close().then(() => {
          logger.info('Database connection closed.');
          process.exit(0); // Success exit
        }).catch(dbError => {
          logger.error('Error closing database connection:', dbError);
          process.exit(1); // Error exit
        });
      });
    });

    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit.');
      process.exit(1);
    }, 15000);

  } catch (error) {
    logger.error('Error during graceful shutdown initiation:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the server
startServer();

export default app;
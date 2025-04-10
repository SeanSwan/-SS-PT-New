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
      // Add your specific production frontend URLs here
      'https://sswanstudios.com',       // Main Frontend Domain
      'https://www.sswanstudios.com',   // www Frontend Domain
      // Add other relevant Render frontend service URLs if applicable
      // e.g., 'https://swan-studios-pt-new.onrender.com',
      // e.g., 'https://ss-pt.onrender.com',
    ]
  : process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:5174"]; // Default dev origins

logger.info('Allowed origins list (for CORS & Socket.IO):', { origins: allowedOrigins });

// --- CORS Configuration ---
// Configure CORS options using the standard 'cors' package
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, mobile apps, Render health checks)
    // These requests are not subject to browser CORS policy anyway.
    if (!origin) {
      // logger.info(`CORS check passed for request with undefined origin (e.g., health check, curl)`); // Optional: reduce log noise
      return callback(null, true);
    }

    // For requests with an origin, check if it's in the allowed list.
    if (allowedOrigins.includes(origin)) {
      // logger.info(`CORS check passed for origin: ${origin}`); // Optional: reduce log noise
      callback(null, true);
    } else {
      // Block requests from origins not in the allowed list.
      logger.warn(`CORS blocked for origin: ${origin}`);
      // Provide a specific error message for clarity
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true, // Allow cookies/authorization headers from allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'], // Allowed headers
  optionsSuccessStatus: 204 // Use 204 No Content for successful preflight OPTIONS requests
};

// =================== MIDDLEWARE ORDERING IS CRITICAL ===================

// 1. Apply CORS Middleware FIRST
// This handles preflight requests and sets CORS headers for all subsequent routes
app.use(cors(corsOptions));

// 2. Handle specific raw body parsing (e.g., Stripe Webhooks) BEFORE general JSON/URL parsing
// Ensure the path matches exactly where Stripe sends webhooks
app.use('/api/cart/webhook', express.raw({ type: 'application/json' }));

// 3. Apply Standard Body Parsers (JSON, URL-encoded) AFTER specific raw parsing
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// 4. Request Logger (Optional but helpful)
app.use((req, res, next) => {
  const start = Date.now();
  // Log start of request
  // logger.info(`→ ${req.method} ${req.originalUrl}`, { ip: req.ip, origin: req.headers.origin || 'none' }); // Optional start log
  res.on('finish', () => {
    // Log end of request after response is sent
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger.log(logLevel, `← ${res.statusCode} ${req.method} ${req.originalUrl}`, { durationMs: duration });
  });
  next();
});

// 5. Health Check & Test Routes (Optional)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    serverTime: new Date().toISOString()
  });
});

app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS check successful from backend (standard config).',
    origin: req.headers.origin || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// 6. API Routes
// Define all specific API routes
app.use("/api/auth", authRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/orientation", orientationRoutes);
app.use("/api/cart", cartRoutes); // Ensure webhook path is defined within this router if needed
app.use("/api/sessions", sessionRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/contact", contactRoutes);

// 7. Error Handling Middleware (LAST)
// These catch anything not handled by the routes above
app.use(notFound); // Catch 404s
app.use(errorHandler); // General error handler (catches errors passed via next(err))

// ================== SOCKET.IO SETUP ==================
// Socket.IO uses the same corsOptions configuration logic
export const io = new Server(server, {
  cors: corsOptions, // Apply the same CORS settings to Socket.IO connections
});

// Socket event handlers...
io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`, { address: socket.handshake.address, origin: socket.handshake.headers.origin });

  socket.on("disconnect", (reason) => {
    logger.info(`Socket disconnected: ${socket.id}`, { reason });
  });

  // Example handlers (replace with your actual logic)
  socket.on("join_schedule_room", (userId) => {
    socket.join(`schedule_${userId}`);
    logger.info(`Socket ${socket.id} joined schedule room`, { userId });
   });
  socket.on("leave_schedule_room", (userId) => {
    socket.leave(`schedule_${userId}`);
    logger.info(`Socket ${socket.id} left schedule room`, { userId });
  });
  socket.on("session_updated", (data) => {
    const userId = data?.userId; // Safely access potential userId
    if (userId) {
        const targetRoom = `schedule_${userId}`;
        io.to(targetRoom).emit('session_update_notification', data);
        logger.info(`Broadcasting session update`, { targetRoom });
    } else {
        logger.warn('Received session_updated event without userId in data');
    }
  });
  socket.on("join_cart_room", (userId) => {
    socket.join(`cart_${userId}`);
    logger.info(`Socket ${socket.id} joined cart room`, { userId });
   });
  socket.on("cart_updated", (data) => {
    const userId = data?.userId; // Safely access potential userId
    if (userId) {
        const targetRoom = `cart_${userId}`;
        io.to(targetRoom).emit('cart_update_notification', data);
        logger.info(`Broadcasting cart update`, { targetRoom });
    } else {
        logger.warn('Received cart_updated event without userId in data');
    }
   });

  // Socket error handler
  socket.on('error', (error) => {
    logger.error(`Socket error on ${socket.id}:`, { error: error.message });
  });
});


// ================== DB & SEEDING FUNCTIONS (Placeholder - Keep your actual implementations) ==================
const seedStorefrontItems = async () => {
  try { logger.info('Ensuring storefront items...'); /* ... function code ... */ }
  catch (error) { logger.error('Error seeding storefront items:', error); throw error; }
};
const seedDatabase = async () => {
  try { logger.info('Seeding database (dev mode)...'); /* ... function code ... */ }
  catch (error) { logger.error('Error seeding database:', error); throw error; }
};
// const initializeSessionsTable = async () => { /* ... function code ... */ }; // Keep if used


// ================== DATABASE SYNC & SERVER START ==================
const startServer = async () => {
  try {
    // Setup model relationships
    setupAssociations();
    logger.info('Model associations set up successfully');

    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // --- Database Sync Logic ---
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Development mode: Syncing database schema...');
      try {
        // Sync models - use { alter: false } if migrations handle schema changes
        await sequelize.sync({ alter: false });
        logger.info('Database synchronized successfully (DEV mode)');
        // Seed database after sync in dev
        await seedDatabase();
      } catch (syncError) {
        logger.error('Error during DEV database sync/seed:', syncError);
        logger.warn('Attempting to continue server startup despite sync/seed error...');
      }
    } else {
      logger.info('Production mode: Skipping schema sync.');
      // Optionally run specific seeding/checks needed on production startup
      // await seedStorefrontItems(); // Example
    }
    // --- End Database Sync Logic ---

    // Start HTTP server
    server.listen(port, () => {
      console.log('\n==================================================');
      logger.info(`✅ Swan Studios API Server running on port ${port}`);
      logger.info(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('==================================================\n');
    });
  } catch (error) {
    logger.error('❌ FATAL: Error starting server:', error);
    process.exit(1); // Exit if server cannot start
  }
};

// ================== GRACEFUL SHUTDOWN ==================
const shutdown = async (signal) => {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);
  try {
    // 1. Close HTTP server to stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing HTTP server:', err);
        // Decide if immediate exit is needed or try to continue cleanup
        // process.exit(1);
      }
      logger.info('HTTP server closed.');

      // 2. Close Socket.IO server
      io.close((socketErr) => {
        if (socketErr) {
          logger.error('Error closing Socket.IO server:', socketErr);
        } else {
          logger.info('Socket.IO server closed.');
        }

        // 3. Close database connection (after server & sockets are closed)
        sequelize.close().then(() => {
          logger.info('Database connection closed.');
          process.exit(0); // Exit successfully after all cleanup
        }).catch(dbError => {
          logger.error('Error closing database connection:', dbError);
          process.exit(1); // Exit with error if DB close fails
        });
      });
    });

    // Force shutdown after a timeout if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit.');
      process.exit(1);
    }, 15000); // 15 seconds timeout

  } catch (error) {
    logger.error('Error during graceful shutdown initiation:', error);
    process.exit(1);
  }
};

// Listen for shutdown signals
process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => shutdown('SIGTERM')); // Standard termination signal


// Start the server execution
startServer();

// Export app for potential testing frameworks
export default app;
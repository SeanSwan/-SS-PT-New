/**
 * Swan Studios - API Server
 * ========================
 * Main server file for the Swan Studios backend API.
 * Handles route setup, middleware configuration, database connection,
 * and Socket.IO integration.
 */

import express from "express";
import cors from "cors"; // *** UNCOMMENTED this line ***
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import sequelize from "./database.mjs";
import setupAssociations from "./setupAssociations.mjs";
import StorefrontItem from "./models/StorefrontItem.mjs"; // Keep if needed by seed/association
import ShoppingCart from "./models/ShoppingCart.mjs";   // Keep if needed by seed/association
import CartItem from "./models/CartItem.mjs";       // Keep if needed by seed/association
import logger from './utils/logger.mjs'; // Import logger if not already imported elsewhere

// Route imports
import authRoutes from "./routes/authRoutes.mjs";
import storefrontRoutes from "./routes/storeFrontRoutes.mjs";
import orientationRoutes from "./routes/orientationRoutes.mjs";
import cartRoutes from "./routes/cartRoutes.mjs";
import sessionRoutes from "./routes/sessionRoutes.mjs";
import checkoutRoutes from "./routes/checkoutRoutes.mjs";
import scheduleRoutes from "./routes/scheduleRoutes.mjs";
import contactRoutes from "./routes/contactRoutes.mjs";

import { errorHandler, notFound } from './middleware/errorMiddleware.mjs';

// Load environment variables
dotenv.config();

// Initialize Express application and HTTP server
const app = express();
const server = http.createServer(app);

// Determine port based on environment
const port = process.env.NODE_ENV === 'production'
  ? (process.env.PORT || 10000)
  : (process.env.BACKEND_PORT || 5000);

// Define allowed origins (Used by both CORS and Socket.IO setup)
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://ss-pt.onrender.com',     // Example Render URL (Keep if relevant)
      'https://sswanstudios.com',       // Main Frontend Domain
      'https://www.sswanstudios.com',   // www Frontend Domain
      'https://swan-studios-pt-new.onrender.com', // Another Frontend Render URL (Keep if relevant)
      // Add any other specific production origins here
    ]
  : process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:5174"]; // Default dev origins

console.log('Allowed origins list (for CORS & Socket.IO):', allowedOrigins);

// Configure CORS options using the standard 'cors' package
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) in dev
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Check if the origin is in the allowed list
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked for origin: ${origin || 'undefined'}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Explicitly allow necessary methods
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'], // Explicitly allow necessary headers
};

// =================== STANDARD CORS MIDDLEWARE ===================
// Apply the configured CORS middleware BEFORE any routes
// This replaces the custom CORS middleware block
app.use(cors(corsOptions));
// The 'cors' package automatically handles OPTIONS preflight requests
// ================= END STANDARD CORS MIDDLEWARE =================

// ---- REMOVED the custom CORS middleware block ----
/*
app.use((req, res, next) => {
  console.log(`Applying HARDCODED CORS for origin: ${req.headers.origin || 'unknown'}`);
  // ... (previous custom CORS logic) ...
  next();
});
*/
// ------------------------------------------------------------

// Special raw body handling for Stripe webhooks - MUST come before JSON/URL parsing!
app.use('/api/cart/webhook', express.raw({ type: 'application/json' }));

// Standard middleware (AFTER potential raw body parsers and CORS)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Add test route specifically for checking CORS (AFTER CORS middleware)
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS check successful from backend (standard config).',
    origin: req.headers.origin || 'unknown',
    timestamp: new Date().toISOString()
  });
});


// Enhanced request logger (AFTER CORS middleware)
app.use((req, res, next) => {
  const start = Date.now();
  // Use logger for consistency
  logger.info(`→ ${req.method} ${req.url}`, { ip: req.ip, origin: req.headers.origin || 'none' });
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger.log(logLevel, `← ${res.statusCode} ${req.method} ${req.url}`, { durationMs: duration });
  });
  next();
});

// Simple health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    serverTime: new Date().toISOString()
  });
});

// ================== API ROUTES ==================
// These should come AFTER all general middleware (CORS, logging, body-parsing)
app.use("/api/auth", authRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/orientation", orientationRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/contact", contactRoutes);

// Default route to handle 404s for API routes (AFTER specific API routes)
// This uses the notFound middleware defined below, which is more standard
// app.use('/api/*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'API endpoint not found',
//     path: req.originalUrl
//   });
// });

// Error Handling Middleware (AFTER all routes)
app.use(notFound); // Catch 404s that didn't match API or other routes
app.use(errorHandler); // General error handler

// ================== SOCKET.IO SETUP ==================
// Socket.IO uses the same corsOptions configuration logic
export const io = new Server(server, {
  cors: corsOptions, // Use the same CORS options object
});

// Socket event handlers...
io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`, { address: socket.handshake.address, origin: socket.handshake.headers.origin });

  socket.on("disconnect", (reason) => {
    logger.info(`Socket disconnected: ${socket.id}`, { reason });
  });

  // Example: Implement actual handlers or log events
  socket.on("join_schedule_room", (userId) => {
    socket.join(`schedule_${userId}`);
    logger.info(`Socket ${socket.id} joined schedule room`, { userId });
   });
  socket.on("leave_schedule_room", (userId) => {
    socket.leave(`schedule_${userId}`);
    logger.info(`Socket ${socket.id} left schedule room`, { userId });
  });
  socket.on("session_updated", (data) => {
    // Example: Broadcast to relevant room
    const targetRoom = `schedule_${data.userId}`; // Assuming data contains userId
    io.to(targetRoom).emit('session_update_notification', data);
    logger.info(`Broadcasting session update`, { targetRoom, data });
  });
  socket.on("join_cart_room", (userId) => {
    socket.join(`cart_${userId}`);
    logger.info(`Socket ${socket.id} joined cart room`, { userId });
   });
  socket.on("cart_updated", (data) => {
    // Example: Broadcast to relevant room
    const targetRoom = `cart_${data.userId}`; // Assuming data contains userId
    io.to(targetRoom).emit('cart_update_notification', data);
    logger.info(`Broadcasting cart update`, { targetRoom, data });
   });

  // Add error handler for socket events
  socket.on('error', (error) => {
    logger.error(`Socket error on ${socket.id}:`, { error: error.message });
  });
});


// ================== DB & SEEDING FUNCTIONS ==================
// (Assuming these functions exist and work as intended)
// Placeholder implementations for context:
const seedStorefrontItems = async () => {
  try { logger.info('Ensuring storefront items...'); /* ... function code ... */ }
  catch (error) { logger.error('Error seeding storefront items:', error); throw error; }
};
const seedDatabase = async () => {
  try { logger.info('Seeding database (dev mode)...'); /* ... function code ... */ }
  catch (error) { logger.error('Error seeding database:', error); throw error; }
};
const initializeSessionsTable = async () => {
  try { logger.info('Initializing sessions table...'); /* ... function code ... */ return true; }
  catch (error) { logger.error('Error initializing sessions table:', error); return false; }
};


// ================== DATABASE SYNC & SERVER START ==================
const startServer = async () => {
  try {
    setupAssociations();
    logger.info('Model associations set up successfully');
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // --- Database Sync Logic ---
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Development mode: Syncing database schema...');
      try {
        // Initialize sessions table first if it requires special handling
        // const sessionsInitialized = await initializeSessionsTable();
        // if (!sessionsInitialized) {
        //   logger.warn('Sessions table initialization had issues - proceed with caution');
        // }

        // Sync models (consider alter: true carefully in dev)
        // Exclude specific models if managed separately (e.g., by migrations)
        await sequelize.sync({ alter: false }); // Using alter: false is safer if migrations handle schema changes
        logger.info('Database synchronized successfully (DEV mode)');

        // Seed database after sync in dev
        await seedDatabase();

      } catch (syncError) {
        logger.error('Error during DEV database sync/seed:', syncError);
        logger.warn('Attempting to continue server startup despite sync/seed error...');
      }
    } else {
      logger.info('Production mode: Skipping schema sync.');
      // Production: Optionally seed specific data if needed (e.g., ensuring basic items)
      try {
        // await seedStorefrontItems(); // Only if absolutely necessary in prod start
      } catch (seedError) {
        logger.error('Error during production startup seeding:', seedError);
      }
    }
    // --- End Database Sync Logic ---


    server.listen(port, () => {
      console.log('\n==================================================');
      logger.info(`Swan Studios API Server running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('==================================================\n');
    });
  } catch (error) {
    logger.error('FATAL: Error starting server:', error);
    process.exit(1);
  }
};

// ================== GRACEFUL SHUTDOWN ==================
const shutdown = async (signal) => {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);
  try {
    // Close HTTP server to stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing HTTP server:', err);
        process.exit(1); // Exit immediately if server close fails
      }
      logger.info('HTTP server closed.');

      // Close database connection
      try {
        await sequelize.close();
        logger.info('Database connection closed.');
      } catch (dbError) {
        logger.error('Error closing database connection:', dbError);
      }

      // Close Socket.IO connections
      io.close((socketErr) => {
        if (socketErr) {
          logger.error('Error closing Socket.IO server:', socketErr);
        } else {
          logger.info('Socket.IO server closed.');
        }
        // Exit process after all cleanup
        process.exit(0);
      });
    });

    // Force shutdown after a timeout if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Could not close connections in time, forcing shutdown');
      process.exit(1);
    }, 10000); // 10 seconds timeout

  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));


// Start the server
startServer();

// Export app for potential testing
export default app;
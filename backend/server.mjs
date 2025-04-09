/**
 * Swan Studios - API Server
 * ========================
 * Main server file for the Swan Studios backend API.
 * Handles route setup, middleware configuration, database connection,
 * and Socket.IO integration.
 */

import express from "express";
// 'cors' package is not used directly
// import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import sequelize from "./database.mjs";
import setupAssociations from "./setupAssociations.mjs";
import StorefrontItem from "./models/StorefrontItem.mjs";
import ShoppingCart from "./models/ShoppingCart.mjs";
import CartItem from "./models/CartItem.mjs";

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

// Define allowed origins (Still used by Socket.IO setup)
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://ss-pt.onrender.com',
      'https://sswanstudios.com',
      'https://www.sswanstudios.com',
      'https://swan-studios-pt-new.onrender.com', // Frontend Render URL
      // 'https://*.sswanstudios.com' // Keep if needed for subdomains
    ]
  : process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:5174"]; // Default dev origins

console.log('Allowed origins list (for Socket.IO):', allowedOrigins);

// Special raw body handling for Stripe webhooks - MUST come before JSON/URL parsing!
app.use('/api/cart/webhook', express.raw({ type: 'application/json' }));

// Standard middleware (AFTER potential raw body parsers)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =================== NEW CORS MIDDLEWARE (Hardcoded Origin) ===================
// At the very top of your server.mjs file, before ANY routes
// Add this middleware to handle CORS
app.use((req, res, next) => {
  console.log(`Applying HARDCODED CORS for origin: ${req.headers.origin || 'unknown'}`);
  // Always allow your specific frontend domain
  // IMPORTANT: This only allows THIS specific origin. Adjust if needed for www or other subdomains.
  const originToAllow = 'https://sswanstudios.com'; // Hardcoded as per request
  res.header('Access-Control-Allow-Origin', originToAllow);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS'); // Added PATCH
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight (OPTIONS) requests immediately
  if (req.method === 'OPTIONS') {
    console.log(`Handling OPTIONS preflight request for ${originToAllow}`);
    // No need to call next() for OPTIONS; just end the response.
    return res.status(204).end(); // Use .end() for empty body
  }

  next(); // Proceed for non-OPTIONS requests
});
// ================= END NEW CORS MIDDLEWARE =================

// ---- REMOVE or COMMENT OUT the previous CORS middleware ----
/*
app.use((req, res, next) => {
  // ... (previous dynamic CORS logic) ...
});
*/
// ------------------------------------------------------------

// Add test route specifically for checking CORS (AFTER CORS middleware)
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS check successful from backend (hardcoded config).',
    origin: req.headers.origin || 'unknown',
    timestamp: new Date().toISOString()
  });
});


// Enhanced request logger (AFTER CORS middleware)
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`→ ${req.method} ${req.url} from ${req.ip} (Origin: ${req.headers.origin || 'none'})`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : res.statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';
    console.log(`← ${statusColor}${res.statusCode}${resetColor} ${req.method} ${req.url} (${duration}ms)`);
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
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Error Handling Middleware (AFTER all routes)
app.use(notFound); // Catch 404s that didn't match API or other routes
app.use(errorHandler); // General error handler

// ================== SOCKET.IO SETUP ==================
// Socket.IO still uses the allowedOrigins array logic
export const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      let isAllowed = false;
      if (!origin && process.env.NODE_ENV !== 'production') { // Allow no origin only in dev
         isAllowed = true;
      } else if (origin) {
         isAllowed = allowedOrigins.some(allowedOrigin => {
            // Basic wildcard check - adjust if needed for more complex scenarios
            if (allowedOrigin.startsWith('*.')) {
               const baseDomain = allowedOrigin.substring(2);
               return origin.endsWith('.' + baseDomain) || origin === baseDomain;
            }
            return origin === allowedOrigin;
         });
      }

      if (isAllowed) {
         callback(null, true); // Allow
      } else {
         console.warn(`Socket.io connection REJECTED from origin: ${origin}`);
         callback(new Error('Socket Origin Not allowed by CORS')); // Explicitly reject
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket event handlers... (rest of the Socket.IO code remains the same)
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id} from ${socket.handshake.address} (Origin: ${socket.handshake.headers.origin})`);
  // ... rest of handlers ...

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });

  socket.on("join_schedule_room", (userId) => { /* ... */ });
  socket.on("leave_schedule_room", (userId) => { /* ... */ });
  socket.on("session_updated", (data) => { /* ... */ });
  socket.on("join_cart_room", (userId) => { /* ... */ });
  socket.on("cart_updated", (data) => { /* ... */ });
});


// ================== DB & SEEDING FUNCTIONS ==================
// ... (seedStorefrontItems, seedDatabase, initializeSessionsTable remain the same) ...
const seedStorefrontItems = async () => { try { /* ... function code ... */ } catch (error) { /* ... */ }};
const seedDatabase = async () => { try { /* ... function code ... */ } catch (error) { /* ... */ }};
const initializeSessionsTable = async () => { try { /* ... function code ... */ } catch (error) { /* ... */ }};


// ================== DATABASE SYNC & SERVER START ==================
const startServer = async () => {
  try {
    setupAssociations();
    console.log('✅ Model associations set up successfully');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    if (process.env.NODE_ENV !== 'production') {
      try {
        const sessionsInitialized = await initializeSessionsTable();
        if (!sessionsInitialized) {
          console.warn('⚠️ Sessions table initialization had issues - proceed with caution');
        }
        // Use 'Session' if that's your Sequelize model name for sessions
        await sequelize.sync({ alter: true, exclude: ['Session'] });
        console.log('✅ Database synchronized successfully (DEV mode, excluding sessions)');
        await seedDatabase();
      } catch (syncError) {
        console.error('❌ Error during DEV database sync:', syncError);
        console.log('Attempting to continue server startup despite sync error...');
      }
    } else {
      // Production: Only seed storefront items, don't sync/alter schema
      try {
        await seedStorefrontItems();
      } catch (seedError) {
        console.error('❌ Error ensuring storefront items in production:', seedError);
      }
    }

    server.listen(port, () => {
      console.log('\n==================================================');
      console.log(`✅ Swan Studios API Server`);
      console.log(`✅ Server is running on port ${port}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('==================================================\n');
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// ================== GRACEFUL SHUTDOWN ==================
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  try {
    await sequelize.close();
    console.log('✅ Database connection closed.');
    server.close(() => {
      console.log('✅ HTTP server closed.');
      process.exit(0);
    });
    // Force close after a timeout if server.close doesn't finish quickly
    setTimeout(() => {
       console.error('Could not close connections in time, forcing shutdown');
       process.exit(1);
    }, 10000); // 10 seconds timeout
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});


// Start the server
startServer();

// Export app for potential testing
export default app;
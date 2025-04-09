/**
 * Swan Studios - API Server
 * ========================
 * Main server file for the Swan Studios backend API.
 * Handles route setup, middleware configuration, database connection,
 * and Socket.IO integration.
 */

import express from "express";
// NOTE: 'cors' package is imported but seemingly not used in favor of custom middleware
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

// Define allowed origins
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      // Production frontend URLs
      'https://ss-pt.onrender.com',
      'https://sswanstudios.com',
      'https://www.sswanstudios.com',
      // Add frontend render URLs (assuming backend URL is different)
      // 'https://swanstudios.onrender.com', // Backend URL, unlikely needed here unless serving FE too
      'https://swan-studios-pt-new.onrender.com', // Frontend Render URL
      // For local testing during development if needed
      // 'http://localhost:5173',
      // 'http://localhost:5174',
    ]
  : process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:5174"]; // Default dev origins

// Log allowed origins on startup for verification
console.log('Allowed origins for CORS:', allowedOrigins);

// Special raw body handling for Stripe webhooks - MUST come before JSON/URL parsing!
app.use('/api/cart/webhook', express.raw({ type: 'application/json' }));

// Standard middleware (AFTER potential raw body parsers)
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Support URL-encoded bodies


// =================== REFINED CORS MIDDLEWARE ===================
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`Request from origin: ${origin || 'unknown'}`);

  // Check if the origin is allowed
  let isAllowed = false;
  if (origin) {
      // Check exact match or wildcard match for subdomains if needed
      isAllowed = allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin.startsWith('https://*.')) {
              // Handle wildcard subdomain matching if you use it
              const baseDomain = allowedOrigin.substring(8); // Remove 'https://*.'
              return origin.endsWith('.' + baseDomain) && origin.startsWith('https://');
          }
          return origin === allowedOrigin; // Exact match
      });
  } else if (process.env.NODE_ENV !== 'production') {
     // Allow requests with no origin (like Postman, curl, etc.) only in dev
     // In production, you might want to block these depending on security needs
     isAllowed = true;
     console.log("Allowing request with no origin in non-production environment.");
  }

  if (isAllowed) {
    console.log(`Origin ${origin} is allowed. Setting CORS headers.`);
    res.header("Access-Control-Allow-Origin", origin); // Reflect the specific allowed origin
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  } else if (origin) {
    // If origin is present but not allowed
    console.warn(`Origin ${origin} is NOT in allowedOrigins list.`);
    // Decide response: either don't set headers (will cause CORS error) or set restricted headers
    // For now, we won't set Allow-Origin, causing the browser's CORS check to fail as intended.
  } else {
    // Block requests with no origin in production if desired
    console.warn("Request with no origin blocked in production environment.");
    // Optionally send a specific error response
    // return res.status(403).json({ message: 'Origin not allowed' });
  }

  // Handle preflight (OPTIONS) requests immediately
  // Browsers send OPTIONS before PUT/POST/DELETE etc. with custom headers or credentials
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    // If the origin wasn't allowed, the headers won't be set correctly,
    // and the browser should block the subsequent request.
    // If origin was allowed, headers are set, return 204.
    return res.status(204).send();
  }

  next(); // Proceed to next middleware/route handlers
});
// ================= END REFINED CORS MIDDLEWARE =================

// Add test route specifically for checking CORS (AFTER CORS middleware)
app.get('/test-cors', (req, res) => {
  // This response will only be reached if CORS middleware allows the request
  res.json({
    message: 'CORS check successful from backend.',
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
    // allowedOrigins: allowedOrigins, // Removed for brevity, already logged on start
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
export const io = new Server(server, {
  cors: {
    // Use the same allowed origins list for Socket.IO
    origin: function(origin, callback) {
      let isAllowed = false;
      if (!origin) { // Allow no origin (tools, etc.)
         isAllowed = true;
      } else {
         isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin.startsWith('https://*.')) {
               const baseDomain = allowedOrigin.substring(8);
               return origin.endsWith('.' + baseDomain) && origin.startsWith('https://');
            }
            return origin === allowedOrigin;
         });
      }

      if (isAllowed) {
         callback(null, true); // Allow
      } else {
         console.warn(`Socket.io connection REJECTED from origin: ${origin}`);
         // To strictly enforce: callback(new Error('Not allowed by CORS'));
         callback(null, false); // Disallow
      }
    },
    methods: ["GET", "POST"], // Typically only GET/POST needed for Socket.IO handshake
    credentials: true,
    // allowedHeaders: ["Content-Type", "Authorization"] // Restrict if possible
  },
});

// Socket event handlers... (rest of the Socket.IO code remains the same)
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id} from ${socket.handshake.address} (Origin: ${socket.handshake.headers.origin})`);
  // ... rest of handlers
});


// ================== DB & SEEDING FUNCTIONS ==================
// ... (seedStorefrontItems, seedDatabase, initializeSessionsTable remain the same) ...
const seedStorefrontItems = async () => { /* ... function code ... */ };
const seedDatabase = async () => { /* ... function code ... */ };
const initializeSessionsTable = async () => { /* ... function code ... */ };


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
        await sequelize.sync({ alter: true, exclude: ['Session'] }); // Use 'Session' if that's your Sequelize model name
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
      // console.log(`✅ API URL: http://localhost:${port}/api`); // Less relevant in prod
      console.log(`✅ Health check available`);
      console.log('==================================================\n');
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// ... (SIGINT handler remains the same) ...
process.on('SIGINT', async () => { /* ... function code ... */ });


// Start the server
startServer();

// Export app for potential testing
export default app;
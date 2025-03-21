/**
 * Swan Studios - API Server
 * ========================
 * Main server file for the Swan Studios backend API.
 * Handles route setup, middleware configuration, database connection,
 * and Socket.IO integration.
 */

import express from "express";
import cors from "cors";
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
// In production, Render will set the PORT environment variable
const port = process.env.NODE_ENV === 'production' 
  ? (process.env.PORT || 10000)
  : (process.env.BACKEND_PORT || 5000);

// Set up CORS configuration with support for all production domains
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      // Production frontend URLs
      'https://ss-pt.onrender.com',
      'https://sswanstudios.com',
      'https://www.sswanstudios.com',
      // Add frontend render URLs
      'https://swanstudios.onrender.com',
      'https://swan-studios-pt-new.onrender.com',
      // For local testing during development with production URLs
      'http://localhost:5173',
      'http://localhost:5174',
      // More permissive for potential subdomain variations
      'https://*.sswanstudios.com'
    ]
  : process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:5174"];

// Log allowed origins on startup
console.log('Allowed origins:', allowedOrigins);

// We'll use a custom middleware approach instead of corsOptions
// The corsOptions object is no longer needed as we handle CORS manually

// Special raw body handling for Stripe webhooks - MUST come before other middleware!
app.use('/api/cart/webhook', express.raw({ type: 'application/json' }));

// =================== CORS CONFIGURATION ===================
// Add a very permissive CORS middleware first - this is the most important change
app.use(function(req, res, next) {
  // Always log the origin for debugging
  const origin = req.headers.origin;
  console.log(`Request from origin: ${origin || 'unknown'}`);
  
  // For development or when debugging, you can be more permissive
  // In production, you'd want to restrict this to your specific domains
  res.header("Access-Control-Allow-Origin", origin || '*');
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return res.status(204).send();
  }
  
  next();
});

// Add test route specifically for checking CORS
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working correctly',
    origin: req.headers.origin || 'unknown',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Apply other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Support URL-encoded bodies

// Enhanced request logger for all environments
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log the request
  console.log(`→ ${req.method} ${req.url} from ${req.ip} (Origin: ${req.headers.origin || 'none'})`);
  
  // Log response when finished
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
    allowedOrigins: allowedOrigins,
    serverTime: new Date().toISOString() 
  });
});

// ================== API ROUTES ================== 
app.use("/api/auth", authRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/orientation", orientationRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/contact", contactRoutes);

// Default route to handle 404s for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Add after all your routes
app.use(notFound);
app.use(errorHandler);

// ================== SOCKET.IO SETUP ================== 
export const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, socket testing tools)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`Socket.io connection from disallowed origin: ${origin}`);
        callback(null, true); // Still allow the connection for broader compatibility
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
  },
});

// Socket event handlers
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
  
  // Schedule update events
  socket.on("join_schedule_room", (userId) => {
    socket.join(`schedule_${userId}`);
    console.log(`User ${userId} joined schedule room`);
  });
  
  socket.on("leave_schedule_room", (userId) => {
    socket.leave(`schedule_${userId}`);
    console.log(`User ${userId} left schedule room`);
  });
  
  // Session notification events
  socket.on("session_updated", (data) => {
    // Broadcast to all relevant users
    if (data.clientId) {
      io.to(`schedule_${data.clientId}`).emit("session_change", data);
    }
    if (data.trainerId) {
      io.to(`schedule_${data.trainerId}`).emit("session_change", data);
    }
    // Also broadcast to admin room if exists
    io.to("admin_schedule").emit("session_change", data);
  });
  
  // Cart events
  socket.on("join_cart_room", (userId) => {
    socket.join(`cart_${userId}`);
    console.log(`User ${userId} joined cart room`);
  });
  
  socket.on("cart_updated", (data) => {
    if (data.userId) {
      io.to(`cart_${data.userId}`).emit("cart_change", data);
    }
  });
});

// ================== STOREFRONT ITEMS SEED FUNCTION ================== 
/**
 * Ensure storefront items exist in database
 * This function ensures that all storefront items used in the frontend exist in the database
 */
const seedStorefrontItems = async () => {
  try {
    console.log('Ensuring storefront items exist in database...');
    
    // Define fixed packages
    const fixedPackages = [
      {
        id: 1,
        packageType: 'fixed',
        name: "Gold Glimmer",
        description: "An introductory 8-session package to ignite your transformation.",
        sessions: 8,
        pricePerSession: 175,
        totalCost: 1400
      },
      {
        id: 2,
        packageType: 'fixed',
        name: "Platinum Pulse",
        description: "Elevate your performance with 20 dynamic sessions.",
        sessions: 20,
        pricePerSession: 165,
        totalCost: 3300
      },
      {
        id: 3,
        packageType: 'fixed',
        name: "Rhodium Rise",
        description: "Unleash your inner champion with 50 premium sessions.",
        sessions: 50,
        pricePerSession: 150,
        totalCost: 7500
      }
    ];

    // Define monthly packages
    const monthlyPackages = [
      { 
        id: 4,
        packageType: 'monthly',
        name: 'Silver Storm',
        description: 'High intensity 3-month program at 4 sessions per week.',
        months: 3,
        sessionsPerWeek: 4,
        pricePerSession: 155,
        totalSessions: 48,
        totalCost: 7440
      },
      { 
        id: 6,
        packageType: 'monthly',
        name: 'Gold Grandeur',
        description: 'Maximize your potential with 6 months at 4 sessions per week.',
        months: 6,
        sessionsPerWeek: 4,
        pricePerSession: 145,
        totalSessions: 96,
        totalCost: 13920
      },
      { 
        id: 9,
        packageType: 'monthly',
        name: 'Platinum Prestige',
        description: 'The best value – 9 months at 4 sessions per week.',
        months: 9,
        sessionsPerWeek: 4,
        pricePerSession: 140,
        totalSessions: 144,
        totalCost: 20160
      },
      { 
        id: 12,
        packageType: 'monthly',
        name: 'Rhodium Reign',
        description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.',
        months: 12,
        sessionsPerWeek: 4,
        pricePerSession: 135,
        totalSessions: 192,
        totalCost: 25920
      }
    ];

    // Combine all packages
    const allPackages = [...fixedPackages, ...monthlyPackages];
    
    // Create or update each package
    for (const pkg of allPackages) {
      try {
        // Check if this package ID already exists
        const existingItem = await StorefrontItem.findByPk(pkg.id);
        
        if (existingItem) {
          // Update existing item
          await existingItem.update(pkg);
          console.log(`✅ Updated storefront item: ${pkg.name} (ID: ${pkg.id})`);
        } else {
          // Create new item
          await StorefrontItem.create(pkg);
          console.log(`✅ Created storefront item: ${pkg.name} (ID: ${pkg.id})`);
        }
      } catch (itemError) {
        console.error(`❌ Error processing storefront item ${pkg.name} (ID: ${pkg.id}):`, itemError);
      }
    }
    
    console.log('✅ Storefront items verification completed');
    return true;
  } catch (error) {
    console.error('❌ Error seeding storefront items:', error);
    return false;
  }
};

// ================== DATABASE SEEDING ================== 
/**
 * Initialize database with seed data
 */
const seedDatabase = async () => {
  try {
    // Run the original seeding function
    if (typeof StorefrontItem.seedPackages === 'function') {
      await StorefrontItem.seedPackages();
    }
    
    // Also run our enhanced storefront item seeding to ensure all IDs exist
    await seedStorefrontItems();
    
    // Add any other seed functions here
    console.log('✅ Database seeding completed');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

// ================== SESSIONS TABLE INITIALIZATION ================== 
/**
 * Enhanced function to properly initialize the sessions table with compatible types
 * This fixes the type mismatch between sessions.cancelledBy and users.id columns
 */
const initializeSessionsTable = async () => {
  try {
    console.log('Initializing sessions table with compatible types...');

    // First, check the actual data type of the users.id column
    const [userIdTypeResult] = await sequelize.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    // Get the correct data type for foreign keys that reference users.id
    let userIdType = 'INTEGER';
    if (userIdTypeResult.length > 0) {
      // PostgreSQL stores UUIDs as 'uuid' in udt_name
      if (userIdTypeResult[0].udt_name === 'uuid') {
        userIdType = 'UUID';
      } else if (userIdTypeResult[0].data_type === 'integer') {
        userIdType = 'INTEGER';
      } else {
        // Use whatever type is actually in the database
        userIdType = userIdTypeResult[0].data_type.toUpperCase();
      }
    }
    console.log(`Users.id column type detected as: ${userIdType}`);
    
    // Always drop the sessions table to ensure correct schema
    console.log('Dropping existing sessions table if it exists...');
    await sequelize.query(`DROP TABLE IF EXISTS sessions CASCADE;`);
    
    // Create enum type if it doesn't exist
    console.log('Creating or verifying enum_sessions_status type...');
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_sessions_status') THEN
          CREATE TYPE enum_sessions_status AS ENUM(
            'available', 'requested', 'scheduled', 'confirmed', 'completed', 'cancelled'
          );
        END IF;
      END
      $$;
    `);
    
    // Create the sessions table with the correct column types
    console.log('Creating sessions table with correct column types...');
    await sequelize.query(`
      CREATE TABLE sessions (
        id SERIAL PRIMARY KEY,
        "sessionDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        duration INTEGER NOT NULL DEFAULT 60,
        "userId" ${userIdType} REFERENCES users(id),
        "trainerId" ${userIdType} REFERENCES users(id),
        location VARCHAR(255),
        notes TEXT,
        status enum_sessions_status NOT NULL DEFAULT 'available',
        "cancellationReason" TEXT,
        "cancelledBy" ${userIdType} REFERENCES users(id),
        "sessionDeducted" BOOLEAN NOT NULL DEFAULT false,
        "deductionDate" TIMESTAMP WITH TIME ZONE,
        confirmed BOOLEAN NOT NULL DEFAULT false,
        "reminderSent" BOOLEAN NOT NULL DEFAULT false,
        "reminderSentDate" TIMESTAMP WITH TIME ZONE,
        "feedbackProvided" BOOLEAN NOT NULL DEFAULT false,
        rating INTEGER,
        feedback TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE
      );
    `);
    
    // Add comments to sessions table columns
    console.log('Adding column comments to sessions table...');
    await sequelize.query(`
      COMMENT ON COLUMN sessions."sessionDate" IS 'Start date and time of the session';
      COMMENT ON COLUMN sessions.duration IS 'Duration in minutes';
      COMMENT ON COLUMN sessions."userId" IS 'Client who booked the session';
      COMMENT ON COLUMN sessions."trainerId" IS 'Trainer assigned to the session';
      COMMENT ON COLUMN sessions.location IS 'Physical location for the session';
      COMMENT ON COLUMN sessions.notes IS 'Additional notes for the session';
      COMMENT ON COLUMN sessions.status IS 'Current status of the session';
      COMMENT ON COLUMN sessions."cancellationReason" IS 'Reason for cancellation if applicable';
      COMMENT ON COLUMN sessions."cancelledBy" IS 'User who cancelled the session';
      COMMENT ON COLUMN sessions."sessionDeducted" IS 'Whether a session was deducted from client package';
      COMMENT ON COLUMN sessions."deductionDate" IS 'When the session was deducted';
      COMMENT ON COLUMN sessions.confirmed IS 'Whether the session is confirmed';
      COMMENT ON COLUMN sessions."reminderSent" IS 'Whether reminder notification was sent';
      COMMENT ON COLUMN sessions."reminderSentDate" IS 'When the reminder was sent';
      COMMENT ON COLUMN sessions."feedbackProvided" IS 'Whether client provided feedback';
      COMMENT ON COLUMN sessions.rating IS 'Client rating (1-5)';
      COMMENT ON COLUMN sessions.feedback IS 'Client feedback text';
    `);
    
    console.log('✅ Sessions table created successfully with compatible column types');
    return true;
  } catch (error) {
    console.error('❌ Error initializing sessions table:', error);
    // Don't throw the error - continue server startup even if this fails
    return false;
  }
};

// ================== DATABASE SYNC & SERVER START ==================
// Safe database synchronization and server startup
const startServer = async () => {
  try {
    // Set up model associations
    setupAssociations();
    console.log('✅ Model associations set up successfully');
    
    // Check database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Synchronize database models with database, excluding the Session model
    // In production, use alter: false and rely on migrations
    if (process.env.NODE_ENV !== 'production') {
      try {
        // Always initialize the sessions table first to avoid foreign key issues
        const sessionsInitialized = await initializeSessionsTable();
        if (!sessionsInitialized) {
          console.warn('⚠️ Sessions table initialization had issues - proceed with caution');
        }
      
        // Then sync all other models EXCEPT Session
        await sequelize.sync({ 
          alter: true,
          // Exclude the Session model from automatic syncing
          exclude: ['Session']
        });
        console.log('✅ Database synchronized successfully (excluding sessions table)');
      
        // Seed the database with initial data
        await seedDatabase();
      } catch (syncError) {
        console.error('❌ Error during database sync:', syncError);
        console.log('Attempting to continue server startup despite sync error...');
      }
    } else {
      // In production, we still want to ensure storefront items exist
      // without altering any existing database schema
      try {
        await seedStorefrontItems();
      } catch (seedError) {
        console.error('❌ Error ensuring storefront items in production:', seedError);
      }
    }
    
    // Start the HTTP server
    server.listen(port, () => {
      console.log('\n==================================================');
      console.log(`✅ Swan Studios API Server`);
      console.log(`✅ Server is running on port ${port}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ API URL: http://localhost:${port}/api`);
      console.log(`✅ Health check: http://localhost:${port}/health`);
      console.log('==================================================\n');
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1); // Exit with failure code
  }
};

// Handling server shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  try {
    await sequelize.close();
    console.log('✅ Database connection closed.');
    server.close(() => {
      console.log('✅ HTTP server closed.');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();

// Export for testing or importing in other modules
export default app;
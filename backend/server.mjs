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

// Set up CORS configuration with support for sswanstudios.com
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      // Production frontend URLs
      'https://ss-pt.onrender.com',
      'https://sswanstudios.com',
      'https://www.sswanstudios.com',
      // Add frontend render URL
      'https://swanstudios.onrender.com'
    ]
  : process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:5174"];

// Expanded CORS options to handle preflight requests properly
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Request from origin ${origin} blocked by CORS policy`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], // Add PATCH and OPTIONS
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"] // Extended headers
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Support URL-encoded bodies

// Enhanced request logger for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    
    // Log the request
    console.log(`→ ${req.method} ${req.url}`);
    
    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusColor = res.statusCode >= 400 ? '\x1b[31m' : res.statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
      const resetColor = '\x1b[0m';
      console.log(`← ${statusColor}${res.statusCode}${resetColor} ${req.method} ${req.url} (${duration}ms)`);
    });
    
    next();
  });
}

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
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
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

// ================== DATABASE SEEDING ================== 
/**
 * Initialize database with seed data
 */
const seedDatabase = async () => {
  try {
    // Seed storefront items
    await StorefrontItem.seedPackages();
    
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

// ================== ERROR HANDLING MIDDLEWARE ================== 
// Global error handler - must be defined after routes
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Server error occurred' 
      : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

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
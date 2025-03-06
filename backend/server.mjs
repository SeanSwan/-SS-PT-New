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
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Add OPTIONS for preflight
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"] // Specify allowed headers
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Support URL-encoded bodies

// Log all requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Simple health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV,
    allowedOrigins: allowedOrigins 
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
    message: 'API endpoint not found' 
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
  console.log("A user connected via Socket.IO");
  
  socket.on("disconnect", () => {
    console.log("A user disconnected");
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
});

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
    
    // Check database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Synchronize database models with database
    // In production, use alter: false and rely on migrations
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('✅ Database synchronized successfully');
    }
    
    // Start the HTTP server
    server.listen(port, () => {
      console.log(`✅ Server is running on port ${port}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('✅ Allowed frontend origins:', allowedOrigins);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1); // Exit with failure code
  }
};

// Start the server
startServer();

// Export for testing or importing in other modules
export default app;
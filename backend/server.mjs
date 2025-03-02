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

// Route imports
import authRoutes from "./routes/authRoutes.mjs";
import storefrontRoutes from "./routes/storeFrontRoutes.mjs";
import orientationRoutes from "./routes/orientationRoutes.mjs";
import cartRoutes from "./routes/cartRoutes.mjs";
import sessionRoutes from "./routes/sessionRoutes.mjs";
import checkoutRoutes from "./routes/checkoutRoutes.mjs";
import scheduleRoutes from "./routes/scheduleRoutes.mjs";
import contactRoutes from "./routes/contactRoutes.mjs";

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

// Set up CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      // Add your production frontend URLs here
      'https://swanstudios.onrender.com',  // Render-hosted frontend URL
      'https://www.swanstudios.com',       // Add your custom domain if you have one
    ]
  : process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://localhost:5174"];

// Configure CORS options
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
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());

// Simple health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
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
  
  // Add additional socket event handlers here as needed
});

// ================== DATABASE SYNC & SERVER START ==================
// Safe database synchronization and server startup
const startServer = async () => {
  try {
    // Synchronize database models with database
    // Use { alter: true } to make non-destructive changes
    // In production, consider using migrations instead of sync
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully');
    
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
// backend/server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import sequelize from "./database.js";

// Existing route imports
import authRoutes from "./routes/authRoutes.mjs";
import storefrontRoutes from "./routes/storeFrontRoutes.mjs";
import orientationRoutes from "./routes/orientationRoutes.mjs";
import cartRoutes from "./routes/cartRoutes.mjs";
import sessionRoutes from "./routes/sessionRoutes.mjs";
import checkoutRoutes from "./routes/checkoutRoutes.mjs";
import scheduleRoutes from "./routes/scheduleRoutes.mjs";

// NEW: Import your contactRoutes (with SendGrid + Twilio logic)
import contactRoutes from "./routes/contactRoutes.mjs";

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.BACKEND_PORT || 5000;

const allowedOrigins = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "http://localhost:5174"];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ================== ROUTES ==================
app.use("/api/auth", authRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/orientation", orientationRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/schedule", scheduleRoutes);

// NEW: Add contact route so /api/contact works (SendGrid + Twilio from previous answer)
app.use("/api/contact", contactRoutes);

// ================== SOCKET.IO ==================
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected via Socket.IO");
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// ================== DB SYNC & SERVER START ==================
sequelize
  .sync({ alter: true })
  .then(() => {
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log("Allowed frontend origins:", allowedOrigins);
    });
  })
  .catch((err) => {
    console.error("Error syncing database:", err);
  });

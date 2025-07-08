/**
 * SwanStudios - Minimal Server for Deployment Testing
 * ==================================================
 * 
 * This is a minimal server version designed to test if the complex initialization
 * in startup.mjs is causing Render health check timeouts.
 * 
 * If this deploys successfully, we know the issue is in the initialization chain.
 * If this fails, the issue is elsewhere (likely Redis-related artifacts).
 */

// ===================== ENVIRONMENT SETUP =====================
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

// Get paths for environment setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

// Load environment variables
if (existsSync(envPath)) {
  console.log(`[Minimal Server] Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`[Minimal Server] No .env file found. Using system environment.`);
  dotenv.config();
}

// ===================== MINIMAL EXPRESS APP =====================
const app = express();
const PORT = process.env.PORT || 10000;
const isProduction = process.env.NODE_ENV === 'production';

// Basic middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'https://sswanstudios.com',
    'https://www.sswanstudios.com',
    'https://swanstudios.com',
    'https://www.swanstudios.com'
  ],
  credentials: true
}));

app.use(express.json());

// ===================== ESSENTIAL ROUTES =====================
// Health check endpoint - responds immediately
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    server: 'minimal'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'SwanStudios Minimal Server Running',
    environment: isProduction ? 'production' : 'development',
    version: '1.0.0-minimal'
  });
});

// Basic API status
app.get('/api/status', (req, res) => {
  res.status(200).json({
    api: 'active',
    server: 'minimal',
    timestamp: new Date().toISOString()
  });
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'This is a minimal server for deployment testing',
    availableRoutes: ['/health', '/', '/api/status']
  });
});

// ===================== ERROR HANDLING =====================
app.use((error, req, res, next) => {
  console.error('Minimal server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    server: 'minimal',
    timestamp: new Date().toISOString()
  });
});

// ===================== START SERVER =====================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SwanStudios MINIMAL Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`⚡ Health Check: http://localhost:${PORT}/health`);
  console.log(`🎯 This is a minimal server for deployment testing`);
});

// Basic timeout settings
server.timeout = 30000; // 30 seconds
server.keepAliveTimeout = 31000;
server.headersTimeout = 32000;

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down minimal server...`);
  server.close(() => {
    console.log('✅ Minimal server closed successfully');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Force closing minimal server');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;

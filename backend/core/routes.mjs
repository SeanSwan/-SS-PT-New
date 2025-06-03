/**
 * Routes Configuration Module
 * ===========================
 * Organized route setup for SwanStudios platform
 * Master Prompt v28 aligned - Clean architecture
 */

import logger from '../utils/logger.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// ===================== CORE ROUTES =====================
import authRoutes from '../routes/authRoutes.mjs';
import profileRoutes from '../routes/profileRoutes.mjs';
import healthRoutes from '../routes/healthRoutes.mjs';

// ===================== USER MANAGEMENT =====================
import userManagementRoutes from '../routes/userManagementRoutes.mjs';
import sessionRoutes from '../routes/sessionRoutes.mjs';
import sessionPackageRoutes from '../routes/sessionPackageRoutes.mjs';

// ===================== BUSINESS LOGIC =====================
import cartRoutes from '../routes/cartRoutes.mjs';
import storefrontRoutes from '../routes/storeFrontRoutes.mjs';
import checkoutRoutes from '../routes/checkoutRoutes.mjs';
import orderRoutes from '../routes/orderRoutes.mjs';

// ===================== COMMUNICATION =====================
import contactRoutes from '../routes/contactRoutes.mjs';
import messagesRoutes from '../routes/messages.mjs';
import notificationsApiRoutes from '../routes/notificationsRoutes.mjs';

// ===================== FITNESS & WELLNESS =====================
import workoutRoutes from '../routes/workoutRoutes.mjs';
import workoutPlanRoutes from '../routes/workoutPlanRoutes.mjs';
import workoutSessionRoutes from '../routes/workoutSessionRoutes.mjs';
import scheduleRoutes from '../routes/scheduleRoutes.mjs';
import enhancedScheduleRoutes from '../routes/enhancedScheduleRoutes.mjs';

// ===================== GAMIFICATION & SOCIAL =====================
import gamificationRoutes from '../routes/gamificationRoutes.mjs';
import gamificationApiRoutes from '../routes/gamificationApiRoutes.mjs';
import socialRoutes from '../routes/social/index.mjs';

// ===================== ADMIN & MANAGEMENT =====================
import adminRoutes from '../routes/adminRoutes.mjs';
import adminDebugRoutes from '../routes/admin.mjs';
import adminClientRoutes from '../routes/adminClientRoutes.mjs';
import adminPackageRoutes from '../routes/adminPackageRoutes.mjs';

// ===================== SPECIALIZED FEATURES =====================
import orientationRoutes from '../routes/orientationRoutes.mjs';
import recommendationRoutes from '../routes/recommendationRoutes.mjs';
import foodScannerRoutes from '../routes/foodScannerRoutes.mjs';
import dashboardRoutes from '../routes/dashboardRoutes.mjs';
import dashboardStatsRoutes from '../routes/dashboardStatsRoutes.mjs';

// ===================== ADVANCED INTEGRATIONS =====================
import mcpRoutes from '../routes/mcpRoutes.mjs';
import aiMonitoringRoutes from '../routes/aiMonitoringRoutes.mjs';
import masterPromptRoutes from '../routes/masterPrompt/index.mjs';

// ===================== DEVELOPMENT & DEBUG =====================
import debugRoutes from '../routes/debug.mjs';
import devRoutes from '../routes/dev-routes.mjs';
import migrationRoutes from '../routes/migrationRoutes.mjs';
import debugAuthRoutes from '../routes/debugAuthRoutes.mjs';

// ===================== NASM PROTOCOL =====================
import clientProgressRoutes from '../routes/clientProgressRoutes.mjs';
import exerciseRoutes from '../routes/exerciseRoutes.mjs';
import roleRoutes from '../routes/roleRoutes.mjs';

// ===================== WEBHOOKS =====================
import stripeWebhookRouter from '../webhooks/stripeWebhook.mjs';

// ===================== MISCELLANEOUS =====================
import apiRoutes from '../routes/api.mjs';

/**
 * Setup all application routes in organized groups
 */
export const setupRoutes = async (app) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // ===================== BASIC ENDPOINTS =====================
  app.get('/', (req, res) => {
    res.json({
      message: 'SwanStudios API Server is running',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/test', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'Server is running correctly',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  // ===================== HEALTH CHECK =====================
  app.get('/health', async (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || 'https://sswanstudios.com');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    try {
      const healthResponse = {
        success: true,
        status: 'healthy',
        message: 'SwanStudios API Server is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '1.0.0'
      };
      
      res.status(200).json(healthResponse);
    } catch (error) {
      res.status(200).json({
        success: true,
        status: 'basic',
        message: 'Server is running (minimal health check)',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
      });
    }
  });

  // ===================== CORE API ROUTES =====================
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);

  // ===================== USER MANAGEMENT ROUTES =====================
  app.use('/api/auth', userManagementRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/session-packages', sessionPackageRoutes);
  app.use('/api/roles', roleRoutes);

  // ===================== BUSINESS LOGIC ROUTES =====================
  app.use('/api/cart', cartRoutes);
  app.use('/api/storefront', storefrontRoutes);
  app.use('/api/checkout', checkoutRoutes);
  app.use('/api/orders', orderRoutes);

  // ===================== COMMUNICATION ROUTES =====================
  app.use('/api/contact', contactRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/notifications', notificationsApiRoutes);

  // ===================== FITNESS & WELLNESS ROUTES =====================
  app.use('/api/workout', workoutRoutes);
  app.use('/api/workout/plans', workoutPlanRoutes);
  app.use('/api/workout/sessions', workoutSessionRoutes);
  app.use('/api/schedule', enhancedScheduleRoutes);
  app.use('/api/sessions', enhancedScheduleRoutes); // Alias
  app.use('/api/orientation', orientationRoutes);
  app.use('/api/recommendations', recommendationRoutes);
  app.use('/api/food-scanner', foodScannerRoutes);

  // ===================== GAMIFICATION & SOCIAL ROUTES =====================
  app.use('/api/gamification', gamificationRoutes);
  app.use('/api/gamification', gamificationApiRoutes);
  app.use('/api/social', socialRoutes);

  // ===================== ADMIN & MANAGEMENT ROUTES =====================
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin', adminDebugRoutes);
  app.use('/api/admin', adminClientRoutes);
  app.use('/api/admin/storefront', adminPackageRoutes);

  // ===================== DASHBOARD ROUTES =====================
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/dashboard', dashboardStatsRoutes);

  // ===================== ADVANCED INTEGRATION ROUTES =====================
  app.use('/api/mcp', mcpRoutes);
  app.use('/api/ai-monitoring', aiMonitoringRoutes);
  app.use('/api/master-prompt', masterPromptRoutes);

  // ===================== NASM PROTOCOL ROUTES =====================
  app.use('/api/client-progress', clientProgressRoutes);
  app.use('/api/exercises', exerciseRoutes);

  // ===================== WEBHOOKS =====================
  app.use('/webhooks/stripe', stripeWebhookRouter);

  // ===================== DEVELOPMENT ROUTES =====================
  if (!isProduction) {
    app.use('/api/debug', debugRoutes);
    app.use('/api/debug', debugAuthRoutes); // Add auth debugging routes
    app.use('/api/dev', devRoutes);
    app.use('/api/migrations', migrationRoutes);
    
    // Debug page for auth testing
    app.get('/debug', (req, res) => {
      logger.info('Serving debug page');
      const debugHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>SwanStudios Auth Debug</title>
          <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              .button { background: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
              .result { background: #f1f1f1; padding: 10px; margin-top: 10px; white-space: pre-wrap; word-wrap: break-word; }
              input { padding: 8px; margin: 5px 0; display: block; width: 100%; box-sizing: border-box; }
          </style>
      </head>
      <body>
          <h1>SwanStudios Debug Panel</h1>
          <div>
              <h2>System Status</h2>
              <button class="button" onclick="testEndpoint('/health')">Test Health</button>
              <button class="button" onclick="testEndpoint('/api/debug/auth-check')">Test Auth</button>
              <div id="debugResult" class="result">Results will appear here...</div>
          </div>
          <script>
              async function testEndpoint(endpoint) {
                  document.getElementById('debugResult').textContent = 'Testing...';
                  try {
                      const response = await fetch(endpoint);
                      const data = await response.json();
                      document.getElementById('debugResult').textContent = JSON.stringify(data, null, 2);
                  } catch (error) {
                      document.getElementById('debugResult').textContent = 'Error: ' + error.message;
                  }
              }
          </script>
      </body>
      </html>
      `;
      res.status(200).send(debugHtml);
    });
  }

  // ===================== GENERAL API ROUTES (BEFORE SPA FALLBACK) =====================
  app.use('/api', apiRoutes);

  // ===================== ENHANCED SPA FALLBACK ROUTING (PRODUCTION) =====================
  if (isProduction) {
    // Use the robust paths determined in middleware setup
    const frontendDistPath = global.FRONTEND_DIST_PATH;
    const indexPath = global.FRONTEND_INDEX_PATH;
    
    if (frontendDistPath && indexPath && existsSync(indexPath)) {
      logger.info('🌌 Setting up SPA fallback routing...');
      
      // Enhanced SPA fallback with comprehensive route handling
      app.get('*', (req, res) => {
        const requestPath = req.path;
        const userAgent = req.get('User-Agent') || '';
        
        // Exclude API and webhook routes
        if (requestPath.startsWith('/api') || requestPath.startsWith('/webhooks')) {
          return res.status(404).json({ 
            success: false,
            error: 'API endpoint not found',
            path: requestPath,
            timestamp: new Date().toISOString()
          });
        }
        
        // Exclude static asset requests (but allow HTML files)
        const staticAssetPattern = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|json|xml|txt)$/i;
        if (staticAssetPattern.test(requestPath)) {
          return res.status(404).send('Static asset not found');
        }
        
        // Exclude common non-browser requests
        if (requestPath.includes('robots.txt') || 
            requestPath.includes('sitemap.xml') || 
            requestPath.includes('favicon.ico') ||
            requestPath.includes('.well-known')) {
          return res.status(404).send('Resource not found');
        }
        
        // Log SPA fallback (but reduce noise from bots)
        const isBrowserRequest = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari');
        if (isBrowserRequest) {
          logger.info(`🌌 SPA Fallback: ${requestPath} -> index.html`);
        } else {
          logger.debug(`🤖 Bot request SPA fallback: ${requestPath}`);
        }
        
        // Set proper headers for SPA
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Serve the React app
        res.sendFile(indexPath);
      });
      
      logger.info('✅ Enhanced SPA fallback routing configured successfully');
      logger.info(`🏠 Frontend served from: ${frontendDistPath}`);
      logger.info(`📄 Index.html path: ${indexPath}`);
    } else {
      logger.error('🚨 CRITICAL: Cannot configure SPA routing - frontend files not found!');
      logger.error(`Frontend path: ${frontendDistPath}`);
      logger.error(`Index path: ${indexPath}`);
      
      // Fallback error handler for missing frontend
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        res.status(503).json({
          error: 'Frontend not available',
          message: 'The frontend application is not properly built or deployed.',
          suggestion: 'Run "npm run build" in the frontend directory',
          timestamp: new Date().toISOString()
        });
      });
    }
  }

  // ===================== CUSTOM SCHEDULE ENDPOINT =====================
  app.get('/api/schedule', (req, res) => {
    const { userId, includeUpcoming } = req.query;
    if (userId) {
      res.json({
        success: true,
        sessions: [
          {
            id: '1',
            title: 'Personal Training Session',
            start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
            status: 'booked',
            userId: userId,
            trainerId: 'trainer1',
            location: 'Gym A',
            duration: 60
          }
        ]
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'User ID required'
      });
    }
  });

  logger.info(`Routes configured successfully - ${isProduction ? 'Production' : 'Development'} mode`);
  logger.info('✅ All API endpoints registered and ready');
};

export default setupRoutes;
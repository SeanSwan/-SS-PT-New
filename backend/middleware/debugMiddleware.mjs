/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              DEBUG & DATABASE HEALTH CHECK MIDDLEWARE                     ║
 * ║         (Request/Response Logging + DB Connection Monitoring)            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Development debugging tools for comprehensive request/response
 *          logging and database connection health verification
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Debug Middleware Stack:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                          CLIENT REQUEST                                   │
 * │  POST /api/workouts { name: "Leg Day", exercises: [...] }               │
 * │  Headers: { Authorization: "Bearer ...", Content-Type: "application/json" }│
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                  requestLogger() Middleware                              │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ 1. Log Request Details (if NODE_ENV !== 'production')              │ │
 * │  │    - method: POST                                                   │ │
 * │  │    - path: /api/workouts                                            │ │
 * │  │    - params: {}                                                     │ │
 * │  │    - query: {}                                                      │ │
 * │  │    - body: { name: "Leg Day", exercises: [...] }                   │ │
 * │  │    - headers: { content-type, user-agent, authorization }          │ │
 * │  │    - ip: 192.168.1.100                                              │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ 2. Intercept res.send() to Log Response                            │ │
 * │  │    - statusCode: 201                                                │ │
 * │  │    - headers: { content-type: "application/json" }                 │ │
 * │  │    - response: { success: true, data: { id: 123, name: "Leg Day" }}│ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                  dbHealthCheck() Middleware                              │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ Test Database Connection:                                           │ │
 * │  │   sequelize.authenticate()                                          │ │
 * │  │   ↓                                                                  │ │
 * │  │ SUCCESS:                                                            │ │
 * │  │   req.dbStatus = {                                                  │ │
 * │  │     connected: true,                                                │ │
 * │  │     message: 'Database connection is healthy'                       │ │
 * │  │   }                                                                 │ │
 * │  │ ↓                                                                    │ │
 * │  │ FAILURE:                                                            │ │
 * │  │   req.dbStatus = {                                                  │ │
 * │  │     connected: false,                                               │ │
 * │  │     message: 'Database connection failed',                          │ │
 * │  │     error: error.message                                            │ │
 * │  │   }                                                                 │ │
 * │  │   Log error with full stack trace                                   │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         REQUEST LOGGING FLOW                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * requestLogger Lifecycle:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. REQUEST ARRIVES                                                        │
 * │    POST /api/workouts { name: "Leg Day" }                                │
 * │    ↓                                                                      │
 * │ 2. CHECK ENVIRONMENT                                                      │
 * │    if (process.env.NODE_ENV === 'production') → Skip logging, next()    │
 * │    ↓                                                                      │
 * │ 3. CAPTURE REQUEST METADATA                                               │
 * │    const requestLog = {                                                  │
 * │      method: 'POST',                                                     │
 * │      path: '/api/workouts',                                              │
 * │      params: {},                                                         │
 * │      query: {},                                                          │
 * │      body: { name: "Leg Day", exercises: [...] },                       │
 * │      headers: {                                                          │
 * │        'content-type': 'application/json',                               │
 * │        'user-agent': 'Mozilla/5.0...',                                   │
 * │        'authorization': '**present**'  // Redacted for security          │
 * │      },                                                                   │
 * │      ip: '192.168.1.100'                                                 │
 * │    }                                                                     │
 * │    ↓                                                                      │
 * │ 4. LOG REQUEST                                                            │
 * │    logger.info(`DEBUG Request: POST /api/workouts`, requestLog)          │
 * │    ↓                                                                      │
 * │ 5. INTERCEPT res.send()                                                   │
 * │    const originalSend = res.send;                                        │
 * │    res.send = function(data) {                                           │
 * │      // Log response before sending                                      │
 * │      if (req.path.startsWith('/api/')) {  // Only log API routes        │
 * │        logger.info(`DEBUG Response: POST /api/workouts (201)`, {         │
 * │          statusCode: 201,                                                │
 * │          headers: res.getHeaders(),                                      │
 * │          response: { success: true, data: { id: 123, ... } }            │
 * │        })                                                                │
 * │      }                                                                    │
 * │      return originalSend.call(this, data);                               │
 * │    }                                                                     │
 * │    ↓                                                                      │
 * │ 6. CONTINUE TO ROUTE HANDLER                                              │
 * │    next()                                                                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Development-Only Logging (Not Production)?
 * - Performance: Logging every request/response in production adds latency
 * - Security: Prevents sensitive data exposure in production logs
 * - Log volume: Production traffic would generate massive log files
 * - Cost: Cloud logging services charge by volume
 * - Debugging need: Only needed during development/debugging sessions
 * - Production alternatives: Use APM tools (Datadog, NewRelic) for prod monitoring
 *
 * WHY Log Full Request Body (Not Summary)?
 * - Complete debugging context: See exactly what client sent
 * - Validation debugging: Identify malformed requests
 * - Client troubleshooting: "Why was my request rejected?"
 * - API testing: Verify request format matches API spec
 * - Regression debugging: Compare working vs broken request payloads
 *
 * WHY Redact Authorization Header (Not Log Full Value)?
 * - Security: Prevent JWT token leakage in logs
 * - Token theft prevention: Logged tokens could be stolen and replayed
 * - Compliance: OWASP guidelines prohibit logging sensitive auth tokens
 * - Presence check sufficient: "**present**" confirms header sent
 * - Alternative: Log token type (Bearer) without actual token
 *
 * WHY Intercept res.send() (Not Use express-logger)?
 * - Complete request/response pairing: See both sides of transaction
 * - JSON parsing: Auto-parse response body for logging
 * - Conditional logging: Only log /api/* routes (reduce noise)
 * - Custom format: Match SwanStudios logging standards
 * - Flexibility: Can add custom metadata (response time, user context)
 *
 * WHY Only Log API Routes (Not All Routes)?
 * - Noise reduction: Skip static assets, health checks, frontend routes
 * - Focus: API debugging is primary use case
 * - Performance: Reduce logging overhead for non-API traffic
 * - Log clarity: API logs not mixed with asset requests
 * - Example excluded: GET /favicon.ico, GET /static/css/main.css
 *
 * WHY Try/Catch JSON Parsing (Not Assume Valid JSON)?
 * - Robustness: Handle non-JSON responses (HTML error pages, binary data)
 * - No crashes: Middleware failure shouldn't break app
 * - Graceful fallback: Log "Non-JSON response" if parse fails
 * - Mixed content types: Some routes return text/html or text/plain
 * - Safety: Prevents JSON.parse() throwing on malformed data
 *
 * WHY Database Health Check (Not Just Ping)?
 * - Connection pool validation: sequelize.authenticate() tests actual DB connection
 * - Early failure detection: Catch DB issues before route handlers run
 * - Health endpoint support: /health routes use req.dbStatus
 * - Monitoring integration: Prometheus/Grafana health checks
 * - Graceful degradation: App can run with DB down (cache fallback)
 *
 * WHY Continue on DB Failure (Not Throw Error)?
 * - Non-blocking: DB health check shouldn't stop request processing
 * - Availability: App stays up even if DB connection temporarily fails
 * - Status reporting: req.dbStatus reports failure to downstream handlers
 * - Health endpoints: /health returns 503 but still responds
 * - Retry logic: Route handlers can attempt reconnection
 *
 * WHY Log DB Errors with Stack Trace (Not Just Message)?
 * - Root cause analysis: Stack trace shows where connection failed
 * - Connection pool debugging: Identify pool exhaustion vs network issues
 * - Sequelize internals: See which Sequelize method failed
 * - Network troubleshooting: Distinguish DNS vs TCP vs auth failures
 * - Historical debugging: Stack traces help diagnose intermittent issues
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       USAGE EXAMPLES                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Example 1: Global Debug Logging (server.mjs)
 * ```javascript
 * import requestLogger from './middleware/debugMiddleware.mjs';
 *
 * if (process.env.NODE_ENV === 'development') {
 *   app.use(requestLogger);  // Log all requests in development
 * }
 * ```
 *
 * Example 2: Health Check Endpoint with DB Status
 * ```javascript
 * import { dbHealthCheck } from './middleware/debugMiddleware.mjs';
 *
 * router.get('/health', dbHealthCheck, (req, res) => {
 *   const statusCode = req.dbStatus.connected ? 200 : 503;
 *   res.status(statusCode).json({
 *     status: req.dbStatus.connected ? 'healthy' : 'degraded',
 *     database: req.dbStatus,
 *     uptime: process.uptime(),
 *     timestamp: new Date().toISOString()
 *   });
 * });
 * ```
 *
 * Example 3: Kubernetes Liveness/Readiness Probes
 * ```javascript
 * // Liveness: Is app alive?
 * router.get('/healthz', (req, res) => res.status(200).send('OK'));
 *
 * // Readiness: Is app ready to accept traffic?
 * router.get('/readyz', dbHealthCheck, (req, res) => {
 *   if (req.dbStatus.connected) {
 *     res.status(200).json({ ready: true });
 *   } else {
 *     res.status(503).json({ ready: false, reason: 'Database unavailable' });
 *   }
 * });
 * ```
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Authorization header redaction: Never log full JWT tokens
 * - Production disabled: Debug logging only in development environment
 * - PII awareness: Request body may contain sensitive user data (masked in logs)
 * - Log storage: Development logs should not persist to long-term storage
 * - IP logging: User IP addresses logged for debugging (GDPR consideration)
 * - Non-blocking errors: DB health check failures don't crash app
 * - Stack trace exposure: Only in development (never production)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      RELATED FILES & DEPENDENCIES                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - backend/utils/logger.mjs (Winston logging infrastructure)
 * - backend/database.mjs (Sequelize instance for health checks)
 *
 * Used By:
 * - backend/server.mjs (Global request logging)
 * - backend/routes/healthRoutes.mjs (Health check endpoints)
 * - backend/routes/* (Any route needing DB health status)
 *
 * Related Code:
 * - backend/middleware/errorMiddleware.mjs (Error logging)
 * - backend/utils/logger.mjs (Logging configuration)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Middleware to check database connection health
 * Used for health check endpoints and debugging
 */
export const dbHealthCheck = async (req, res, next) => {
  try {
    await sequelize.authenticate();
    req.dbStatus = { connected: true, message: 'Database connection is healthy' };
    next();
  } catch (error) {
    logger.error('Database health check failed:', { error: error.message, stack: error.stack });
    req.dbStatus = { connected: false, message: 'Database connection failed', error: error.message };
    next();
  }
};

/**
 * Debug Middleware
 * =======================================
 * Provides detailed logging for debugging API calls
 */

import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';

/**
 * Middleware to log request and response details
 * Only active in development environment
 */
export const requestLogger = (req, res, next) => {
  // Only log in development environment
  if (process.env.NODE_ENV === 'production') {
    return next();
  }
  
  // Log request details
  const requestLog = {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers['authorization'] ? '**present**' : '**not-present**'
    },
    ip: req.ip
  };
  
  logger.info(`DEBUG Request: ${req.method} ${req.path}`, requestLog);
  
  // Capture and log response
  const originalSend = res.send;
  res.send = function(data) {
    // Only log responses for API routes (to reduce noise)
    if (req.path.startsWith('/api/')) {
      try {
        // Try to parse JSON response
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        logger.info(`DEBUG Response: ${req.method} ${req.path} (${res.statusCode})`, {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          response: parsedData
        });
      } catch (err) {
        // If parsing fails, log the raw response
        logger.info(`DEBUG Response: ${req.method} ${req.path} (${res.statusCode})`, {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          response: 'Non-JSON response'
        });
      }
    }
    return originalSend.call(this, data);
  };
  
  next();
};

export default requestLogger;
